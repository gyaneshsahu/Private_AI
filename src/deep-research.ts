// Deep research (docs/deep-research-20261114.md): a bounded pipeline that runs in this browser.
// Plan (one model request) -> the user approves the masked search texts -> search and read
// (the existing approved search and page routes) -> answer (one model request). Nothing here
// talks to the network itself: the caller passes the three ways out, so every cap, a stop and a
// failure at each step can be tested offline.
import type { Source } from "../shared/contracts";
import { RESEARCH_LIMITS } from "../shared/deep-research";
import { rankByTier } from "./german-rules";
import { findIdentifiers } from "./identifier-masking";
import { choosePassages, splitPassages } from "./passage-retrieval";
import { parseResearchResult } from "./research-result";
import { textFor, type Lang } from "./text/core";
import { deepResearchText } from "./text/deep-research";
import { editedSearchText } from "./when-to-search";

export type Limits = { [K in keyof typeof RESEARCH_LIMITS]: number };
/** The app's POST to its own server (src/App.tsx `api`): path, JSON body, abort signal. */
export type Api = (path: string, data: unknown, signal?: AbortSignal) => Promise<unknown>;

/** The plan request's message. The question is masked like every chat message before it leaves. */
export const planPrompt = (question: string, limits: Limits = RESEARCH_LIMITS) =>
  `Plan a web research for the question below. Write at most ${limits.searches} short web search queries that together would find what is needed to answer it. One query per line. No numbering, no quotation marks, no explanation, nothing else. Write the queries in the language of the question. Never put a private person's name, an address, an account or phone number or any other personal detail into a query.\n\nQuestion: ${question}`;

/**
 * The model's plan as search texts: one per line, each masked again on this device (the reply may
 * repeat a detail of the question), invalid and repeated ones dropped, cut to the cap. A plan
 * that gives nothing usable falls back to the masked question itself.
 */
export function parsePlan(raw: string, question: string, limits: Limits = RESEARCH_LIMITS): string[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "")
        .replace(/^["'„“”«»]+|["'„“”«»]+$/g, "")
        .trim(),
    )
    // A long line is an explanation, not a search text.
    .filter((line) => line && line.length <= 200);
  const texts: string[] = [];
  const take = (candidates: string[]) => {
    for (const line of candidates) {
      if (texts.length >= limits.searches) break;
      const masked = editedSearchText(line);
      if (!masked.problem && !texts.includes(masked.value)) texts.push(masked.value);
    }
  };
  take(lines);
  if (!texts.length) take([question.replace(/\s+/g, " ").trim().slice(0, 200)]);
  if (!texts.length) throw Error("No usable search text.");
  return texts;
}

export type RunStep = "search" | "read" | "write";
export interface Tally {
  queries: string[];
  /** Searches sent, and how many of them gave no results. */
  searches: number;
  searchesFailed: number;
  /** Pages tried (our server's top page of each search included), and how many did not open. */
  pages: number;
  pagesFailed: number;
  outOfTime: boolean;
}
export interface Outcome {
  status: "done" | "cancelled" | "timeout" | "failed";
  /** The step that was running when the run ended. */
  step: RunStep;
  tally: Tally;
  /** What was gathered, cut to the caps: given to the model, or kept for the user after a failure. */
  sources: Source[];
  /** The answer request was handed over (its allowance units count from then on). */
  answerSent: boolean;
}

/** One approved disclosure: prepared and executed once (approvals are single-use). */
async function approved(api: Api, request: { kind: "search" | "page"; value: string }, signal: AbortSignal) {
  const prepared = (await api("/api/research/prepare", request, signal)) as { id: string };
  signal.throwIfAborted();
  return api("/api/research/execute", { id: prepared.id, request }, signal);
}

// The same page under two addresses (with and without the part after "?") is read once.
const pageKey = (url: string | undefined) => {
  try {
    const parsed = new URL(url ?? "");
    return parsed.hostname.replace(/^www\./, "") + parsed.pathname;
  } catch {
    return "";
  }
};
// A result's address can carry a personal detail; such a page is not opened (as server/research.ts does for the top page).
const carriesIdentifier = (url: string) => {
  let decoded = url;
  try {
    decoded = decodeURIComponent(url.replace(/\+/g, " "));
  } catch {
    /* keep the raw text */
  }
  return findIdentifiers(decoded).length + findIdentifiers(url).length > 0;
};

const PAGE_NOTE = "Passages of this page chosen on the user's device to match the question (not the whole page): ";
const SERVER_NOTE = /^Top result page opened by CometRow's server \([^)]*\): /;

/**
 * What goes to the model: of each page only the passages that match the question (the existing
 * on-device ranker), then the search excerpts of pages that were not read. Official sources
 * first (the existing tier ranking). Never more than the caps, whatever was gathered.
 */
export function selectSources(
  question: string,
  queries: string[],
  pages: Source[],
  excerpts: Source[],
  limits: Limits = RESEARCH_LIMITS,
): Source[] {
  const sources: Source[] = [];
  const seen = new Set<string>();
  let left = limits.sourceCharacters;
  const add = (source: Source, text: string) => {
    const key = pageKey(source.url);
    const title = source.title.slice(0, 200);
    // The title and the address go to the model too, so they count.
    const size = text.length + title.length + (source.url?.length ?? 0);
    if (seen.has(key) || sources.length >= limits.sources || !text || size > left) return;
    seen.add(key);
    left -= size;
    sources.push({ ...source, title, text });
  };
  for (const page of rankByTier(pages)) {
    const passages = splitPassages(page.text.replace(SERVER_NOTE, ""), 800).map((text) => ({ text }));
    const { chosen } = choosePassages(passages, question, queries.join(" "), limits.pageCharacters - 200);
    add(page, (PAGE_NOTE + chosen.map((index) => passages[index].text).join("\n[...]\n")).slice(0, limits.pageCharacters));
  }
  for (const excerpt of rankByTier(excerpts)) add(excerpt, excerpt.text.slice(0, 600));
  return sources;
}

/**
 * Runs the approved part of a research: the searches, the page reads and the answer.
 * `queries` are sent exactly as given and must be what the user approved: each is checked against
 * the masking again, and a text the masking would change stops the run before anything is sent.
 * `answer` makes the one model request and resolves true when the answer is complete.
 * `signal` is the user's stop: every call gets it, and nothing is called after it fired.
 * No step is retried.
 */
export async function runResearch(
  question: string,
  queries: string[],
  deps: {
    api: Api;
    answer: (sources: Source[], tally: Tally, signal: AbortSignal) => Promise<boolean>;
    now?: () => number;
  },
  signal: AbortSignal,
  onProgress: (step: RunStep, done: number, total: number, tally: Tally) => void,
  limits: Limits = RESEARCH_LIMITS,
): Promise<Outcome> {
  if (!queries.length || queries.length > limits.searches) throw Error("Between one search text and the cap is allowed.");
  for (const query of queries) {
    const masked = editedSearchText(query);
    if (masked.problem || masked.value !== query) throw Error("A search text is not the masked text that was shown.");
  }
  const now = deps.now ?? Date.now;
  const started = now();
  // The hard time limit for the whole run; it stops every call like the user's stop does.
  const run = AbortSignal.any([signal, AbortSignal.timeout(limits.wallClockMs)]);
  const tally: Tally = { queries, searches: 0, searchesFailed: 0, pages: 0, pagesFailed: 0, outOfTime: false };
  const found: { excerpts: Source[]; topPages: number }[] = [];
  const pages: Source[] = [];
  const ids = new Set<string>();
  let step: RunStep = "search";
  let answerSent = false;
  const outOfTime = () => now() - started > limits.gatherMs && (tally.outOfTime = true);
  const gathered = () => selectSources(question, queries, pages, found.flatMap((entry) => entry.excerpts), limits);
  const end = (status: Outcome["status"], sources = gathered()): Outcome => ({ status, step, tally, sources, answerSent });
  try {
    for (const [index, query] of queries.entries()) {
      run.throwIfAborted();
      if (index && outOfTime()) break;
      onProgress("search", index + 1, queries.length, tally);
      tally.searches++;
      try {
        const result = await approved(deps.api, { kind: "search", value: query }, run);
        const sources = parseResearchResult(result, ids);
        for (const source of sources) ids.add(source.id);
        // Our server opens one result page with every search; it counts toward the page cap.
        const top = sources.filter((source) => source.evidenceKind === "page");
        const tried = (result as { topPage?: unknown }).topPage ? 1 : 0;
        tally.pages += tried;
        tally.pagesFailed += tried - Math.min(tried, top.length);
        pages.push(...top);
        found.push({ excerpts: sources.filter((source) => source.evidenceKind !== "page"), topPages: tried });
      } catch {
        run.throwIfAborted();
        tally.searchesFailed++;
      }
    }
    if (!found.length) return end("failed", []);

    step = "read";
    // Round-robin over the searches, official results first, until the page cap is filled.
    const taken = new Set(pages.map((page) => pageKey(page.url)));
    const perSearch = found.map((entry) => ({
      left: limits.pagesPerSearch - entry.topPages,
      results: rankByTier(entry.excerpts),
    }));
    const queue: string[] = [];
    const room = limits.pages - tally.pages;
    while (queue.length < room && perSearch.some((entry) => entry.left > 0 && entry.results.length))
      for (const entry of perSearch) {
        while (queue.length < room && entry.left > 0 && entry.results.length) {
          const url = entry.results.shift()!.url;
          if (!url || taken.has(pageKey(url))) continue;
          taken.add(pageKey(url));
          queue.push(url);
          entry.left--;
          break;
        }
      }
    for (const [index, url] of queue.entries()) {
      run.throwIfAborted();
      if (outOfTime()) break;
      onProgress("read", index + 1, queue.length, tally);
      tally.pages++;
      try {
        if (carriesIdentifier(url)) throw Error("not opened");
        const [page] = parseResearchResult(await approved(deps.api, { kind: "page", value: url }, run), ids);
        ids.add(page.id);
        pages.push(page);
      } catch {
        run.throwIfAborted();
        tally.pagesFailed++;
      }
    }

    const sources = gathered();
    if (!sources.length) return end("failed", []);
    run.throwIfAborted();
    step = "write";
    onProgress("write", 1, 1, tally);
    answerSent = true;
    const complete = await deps.answer(sources, tally, run);
    run.throwIfAborted();
    return end(complete ? "done" : "failed", sources);
  } catch {
    if (signal.aborted) return end("cancelled");
    return end(run.aborted ? "timeout" : "failed");
  }
}

/** The note kept on the answer (and so in the PDF and the copied text): what was searched and read. */
export function researchNote(tally: Tally, lang?: Lang): string {
  return textFor(deepResearchText, lang).note(
    tally.searches,
    tally.searchesFailed,
    tally.pages,
    tally.pagesFailed,
    tally.queries.map((query) => `"${query}"`).join("; "),
  );
}
