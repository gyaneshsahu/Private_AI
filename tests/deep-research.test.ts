// Deep research, the pipeline in the browser (docs/deep-research-20261114.md): every cap, a stop
// at each step, a failure at each step, the re-masking of the plan, that only approved masked
// texts leave, and the numbering of the sources. Offline: the app's POST and the model are doubles.
import { expect, it, vi } from "vitest";
import type { Source } from "../shared/contracts";
import { RESEARCH_LIMITS, RESEARCH_MIN_SOURCE_CHARACTERS, researchSourceRoom } from "../shared/deep-research";
import { composeContext, newMessage } from "../src/conversation";
import { conversationText } from "../src/conversation-text";
import {
  parsePlan,
  planPrompt,
  researchNote,
  runResearch,
  selectSources,
  type Api,
  type Limits,
  type RunStep,
} from "../src/deep-research";
import { auditResearchAnswer } from "../src/research-audit";
import { editedSearchText } from "../src/when-to-search";

const QUESTION = "How long is the notice period for a synthetic tenancy and what does the synthetic fee cost?";
const QUERIES = ["synthetic tenancy notice period", "synthetic fee cost", "synthetic tenancy law", "synthetic fee table"];
let serial = 0;
const source = (url: string, evidenceKind: "search-excerpt" | "page", text = "The synthetic notice period is three months."): Source => ({
  id: `src-${String(++serial).padStart(6, "0")}`,
  title: `Title of ${new URL(url).hostname}`,
  text,
  url,
  retrievedAt: "2026-11-14T10:00:00.000Z",
  evidenceKind,
});
/** Five results per search on five hosts, and the top page our server opened. */
const results = (query: string, topPage: "read" | "failed" | "none" = "read") => {
  const slug = query.replace(/\W+/g, "-");
  const excerpts = [1, 2, 3, 4, 5].map((n) => source(`https://site${n}.example/${slug}`, "search-excerpt"));
  const top = `https://site1.example/${slug}`;
  return {
    sources: topPage === "read" ? [...excerpts, source(top, "page", "Top page text about the synthetic notice period.")] : excerpts,
    ...(topPage === "none" ? {} : { topPage: { url: top, outcome: topPage } }),
  };
};
type Call = { path: string; data: { kind?: string; value?: string; id?: string; request?: { kind: string; value: string } } };
/** The app's POST: records every call; `execute` answers the approved request. */
function double(execute: (request: { kind: string; value: string }, signal?: AbortSignal) => unknown = (request) =>
  request.kind === "search" ? results(request.value) : { sources: [source(request.value, "page")] }) {
  const calls: Call[] = [];
  let approvals = 0;
  const api: Api = async (path, data, signal) => {
    signal?.throwIfAborted();
    calls.push({ path, data: data as Call["data"] });
    if (path === "/api/research/prepare") return { id: String(++approvals).padStart(48, "0") };
    return execute((data as { request: { kind: string; value: string } }).request, signal);
  };
  const sent = (kind: string) =>
    calls.filter((call) => call.path === "/api/research/execute" && call.data.request?.kind === kind).map((call) => call.data.request!.value);
  return { api, calls, sent };
}
const run = (
  api: Api,
  options: {
    queries?: string[];
    answer?: (sources: Source[], tally: unknown, signal: AbortSignal) => Promise<boolean>;
    signal?: AbortSignal;
    limits?: Limits;
    now?: () => number;
    progress?: (step: RunStep, done: number, total: number) => void;
  } = {},
) => {
  const answer = vi.fn(options.answer ?? (async () => true));
  return {
    answer,
    outcome: runResearch(
      QUESTION,
      options.queries ?? QUERIES,
      { api, answer, now: options.now },
      options.signal ?? new AbortController().signal,
      options.progress ?? (() => {}),
      options.limits,
    ),
  };
};

it("the plan: one text per line, numbering and quotes removed, repeats dropped, cut to four, each masked again", () => {
  expect(planPrompt(QUESTION)).toContain("at most 4 short web search queries");
  expect(
    parsePlan(
      '1. synthetic tenancy notice period\n- "synthetic fee cost"\n2) synthetic tenancy notice period\n\n* synthetic tenancy law\nsynthetic fee table\nsynthetic fifth text',
      QUESTION,
    ),
  ).toEqual(QUERIES);
  // The model repeated a detail of the question: it is removed on this device before it is shown.
  const [masked] = parsePlan("synthetic fee for person@example.test in Berlin", QUESTION);
  expect(masked).not.toContain("person@example.test");
  expect(masked).toContain("synthetic fee");
  // An explanation instead of search texts: the masked question itself is the one search text.
  const long = "This synthetic explanation is far too long to be a search text. ".repeat(5);
  expect(parsePlan(long, "synthetic short question")).toEqual(["synthetic short question"]);
  expect(parsePlan("", "synthetic short question")).toEqual(["synthetic short question"]);
  expect(() => parsePlan("", "?")).toThrow();
});

it("a full run stays inside every cap: 4 searches, 6 pages, 10 sources, 16,000 characters, one answer request", async () => {
  const { api, calls, sent } = double();
  const steps: string[] = [];
  const { outcome, answer } = run(api, { progress: (step, done, total) => steps.push(`${step} ${done}/${total}`) });
  const result = await outcome;
  expect(result).toMatchObject({ status: "done", step: "write", answerSent: true });
  // Exactly the approved texts, each once, in order; nothing else was searched.
  expect(sent("search")).toEqual(QUERIES);
  // Our server opened one page with each search; two more fill the cap of six.
  expect(sent("page")).toHaveLength(2);
  expect(result.tally).toMatchObject({ searches: 4, searchesFailed: 0, pages: 6, pagesFailed: 0, outOfTime: false });
  expect(steps).toEqual(["search 1/4", "search 2/4", "search 3/4", "search 4/4", "read 1/2", "read 2/2", "write 1/1"]);
  expect(answer).toHaveBeenCalledTimes(1);
  const sources = answer.mock.calls[0][0];
  expect(sources.length).toBeLessThanOrEqual(RESEARCH_LIMITS.sources);
  expect(sources.reduce((sum, s) => sum + s.text.length + s.title.length + (s.url?.length ?? 0), 0)).toBeLessThanOrEqual(
    RESEARCH_LIMITS.sourceCharacters,
  );
  // Every approval was used once: a prepare and an execute per search and per page, no retry.
  expect(calls).toHaveLength(2 * (4 + 2));
});

it("request bodies carry only the approved, masked texts and addresses that came from the results", async () => {
  const { api, calls } = double();
  await run(api, { queries: QUERIES.slice(0, 2) }).outcome;
  const offered = new Set<string>();
  for (const call of calls) {
    expect(Object.keys(call.data).sort()).toEqual(call.path.endsWith("prepare") ? ["kind", "value"] : ["id", "request"]);
    const request = call.path.endsWith("prepare") ? call.data : call.data.request!;
    if (request.kind === "search") expect(QUERIES.slice(0, 2)).toContain(request.value);
    else offered.add(request.value!);
    expect(JSON.stringify(call.data)).not.toContain(QUESTION);
  }
  for (const url of offered) expect(url).toMatch(/^https:\/\/site[2-5]\.example\/synthetic-/);
});

it("a text that is not the masked text, no text, or more texts than the cap stops the run before anything is sent", async () => {
  for (const queries of [
    ["synthetic fee for person@example.test"],
    [],
    [...QUERIES, "synthetic fifth text"],
    ["  padded synthetic text  "],
  ]) {
    const { api, calls } = double();
    await expect(run(api, { queries }).outcome).rejects.toThrow();
    expect(calls).toHaveLength(0);
  }
  // The masking is stable: a masked text is accepted as it is.
  const masked = editedSearchText("synthetic fee for person@example.test").value;
  const { api, sent } = double();
  await run(api, { queries: [masked] }).outcome;
  expect(sent("search")).toEqual([masked]);
});

it("pages per search are capped: one search opens its top page and two more, never a fourth", async () => {
  const { api, sent } = double();
  const result = await run(api, { queries: QUERIES.slice(0, 1) }).outcome;
  expect(sent("page")).toHaveLength(RESEARCH_LIMITS.pagesPerSearch - 1);
  expect(result.tally.pages).toBe(RESEARCH_LIMITS.pagesPerSearch);
});

it("official pages are opened first, the same page is opened once, and an address with a personal detail is not opened", async () => {
  const { api, sent } = double((request) =>
    request.kind === "page"
      ? { sources: [source(request.value, "page")] }
      : {
          sources: [
            source("https://blog.example/a", "search-excerpt"),
            source("https://shop.example/form?mail=person@example.test", "search-excerpt"),
            source("https://www.gesetze-im-internet.de/synthetic", "search-excerpt"),
            source("https://blog.example/a?utm=1", "search-excerpt"),
          ],
        },
  );
  const result = await run(api, { queries: QUERIES.slice(0, 2), limits: { ...RESEARCH_LIMITS, pagesPerSearch: 6 } }).outcome;
  expect(sent("page")).toEqual(["https://www.gesetze-im-internet.de/synthetic", "https://blog.example/a"]);
  // The page with the personal detail counts as one that could not be opened.
  expect(result.tally).toMatchObject({ pages: 3, pagesFailed: 1 });
  // The official source is number 1.
  expect(result.sources[0].url).toBe("https://www.gesetze-im-internet.de/synthetic");
});

it("long pages send only the passages chosen on the device, within the per-page and total caps", () => {
  const filler = "Nothing about the topic stands in this synthetic paragraph of filler words.\n\n".repeat(60);
  const pages = [1, 2, 3, 4, 5, 6, 7, 8].map((n) =>
    source(`https://page${n}.example/long`, "page", `${filler}The synthetic tenancy notice period is three months (page ${n}).\n\n${filler}`),
  );
  const excerpts = [1, 2, 3, 4, 5, 6].map((n) => source(`https://excerpt${n}.example/x`, "search-excerpt"));
  const chosen = selectSources(QUESTION, QUERIES, pages, excerpts);
  expect(chosen.length).toBeLessThanOrEqual(RESEARCH_LIMITS.sources);
  for (const page of chosen.filter((s) => s.evidenceKind === "page")) {
    expect(page.text.length).toBeLessThanOrEqual(RESEARCH_LIMITS.pageCharacters);
    expect(page.text).toContain("notice period is three months");
    expect(page.text).toContain("not the whole page");
  }
  const size = (list: Source[]) => list.reduce((sum, s) => sum + s.text.length + s.title.length + (s.url?.length ?? 0), 0);
  expect(size(chosen)).toBeLessThanOrEqual(RESEARCH_LIMITS.sourceCharacters);
  // A smaller total cap is kept too, whatever was gathered.
  expect(size(selectSources(QUESTION, QUERIES, pages, excerpts, { ...RESEARCH_LIMITS, sourceCharacters: 3000 }))).toBeLessThanOrEqual(3000);
  // A page that was read is not also sent as its search excerpt.
  const both = selectSources(QUESTION, QUERIES, [source("https://same.example/a", "page")], [source("https://same.example/a", "search-excerpt")]);
  expect(both.map((s) => s.evidenceKind)).toEqual(["page"]);
});

it("the source text follows the report's input limit: the cap at 32,000 characters, less at 20,000, no run at 8,000", () => {
  // 4,100 characters: the instructions and a short question with nothing else in the conversation.
  expect(researchSourceRoom(32_000, 4_100)).toBe(RESEARCH_LIMITS.sourceCharacters);
  expect(researchSourceRoom(20_000, 4_100)).toBe(9_900);
  expect(researchSourceRoom(8_000, 4_100)).toBeLessThan(RESEARCH_MIN_SOURCE_CHARACTERS);
  // A long conversation leaves less, down to none.
  expect(researchSourceRoom(32_000, 23_000)).toBeLessThan(RESEARCH_MIN_SOURCE_CHARACTERS);
});

for (const [at, kind, call] of [
  ["searching", "search", 2],
  ["reading", "page", 1],
] as const)
  it(`stop while ${at}: the run ends at once and nothing more is sent`, async () => {
    const stop = new AbortController();
    let seen = 0;
    const { api, calls } = double((request, signal) => {
      if (request.kind === kind && ++seen === call) {
        stop.abort();
        signal!.throwIfAborted();
      }
      return request.kind === "search" ? results(request.value) : { sources: [source(request.value, "page")] };
    });
    const { outcome, answer } = run(api, { signal: stop.signal });
    const result = await outcome;
    expect(result).toMatchObject({ status: "cancelled", step: kind === "search" ? "search" : "read", answerSent: false });
    const sentAtStop = calls.length;
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(calls).toHaveLength(sentAtStop);
    expect(answer).not.toHaveBeenCalled();
    // What was found until then is kept for the user.
    expect(result.sources.length).toBeGreaterThan(0);
  });

it("stop between an approval and its use: the prepared request is not executed", async () => {
  const stop = new AbortController();
  const calls: string[] = [];
  const api: Api = async (path) => {
    calls.push(path);
    if (path.endsWith("prepare")) stop.abort();
    return { id: "0".repeat(48) };
  };
  expect(await run(api, { signal: stop.signal }).outcome).toMatchObject({ status: "cancelled", step: "search" });
  expect(calls).toEqual(["/api/research/prepare"]);
});

it("stop while the answer is written: the answer request gets the stop, and the run says so", async () => {
  const stop = new AbortController();
  const { api, calls } = double();
  const { outcome } = run(api, {
    signal: stop.signal,
    answer: (_sources, _tally, signal) =>
      new Promise((resolve) => {
        signal.addEventListener("abort", () => resolve(false));
        stop.abort();
      }),
  });
  expect(await outcome).toMatchObject({ status: "cancelled", step: "write", answerSent: true });
  expect(calls).toHaveLength(12);
});

it("a stop before the start sends nothing at all", async () => {
  const { api, calls } = double();
  const { outcome, answer } = run(api, { signal: AbortSignal.abort() });
  expect(await outcome).toMatchObject({ status: "cancelled", answerSent: false, sources: [] });
  expect(calls).toHaveLength(0);
  expect(answer).not.toHaveBeenCalled();
});

it("a search that fails is counted and not repeated; when every search fails no answer is requested", async () => {
  const one = double((request) => {
    if (request.value === QUERIES[1]) throw Error("synthetic search failure");
    return request.kind === "search" ? results(request.value) : { sources: [source(request.value, "page")] };
  });
  const partial = await run(one.api).outcome;
  expect(partial).toMatchObject({ status: "done", tally: { searches: 4, searchesFailed: 1 } });
  expect(one.sent("search")).toEqual(QUERIES);

  const all = double(() => {
    throw Error("synthetic search failure");
  });
  const { outcome, answer } = run(all.api);
  expect(await outcome).toMatchObject({ status: "failed", step: "search", answerSent: false, sources: [], tally: { searches: 4, searchesFailed: 4 } });
  expect(all.sent("search")).toEqual(QUERIES);
  expect(answer).not.toHaveBeenCalled();
});

it("pages that do not open are counted, not repeated, and the answer is written from the rest", async () => {
  const { api, sent } = double((request) => {
    if (request.kind === "page") throw Error("synthetic page failure");
    return results(request.value, request.value === QUERIES[0] ? "failed" : "read");
  });
  const { outcome, answer } = run(api);
  const result = await outcome;
  // Top pages: three read, one failed. Three more tried (the cap of six), all failed.
  expect(result).toMatchObject({ status: "done", tally: { pages: 6, pagesFailed: 3 } });
  expect(new Set(sent("page")).size).toBe(sent("page").length);
  expect(answer).toHaveBeenCalledTimes(1);
  expect(researchNote(result.tally, "en")).toContain("4 searches, 6 pages; 3 could not be opened.");
  expect(researchNote(result.tally, "de")).toContain("4 Suchen, 6 Seiten; 3 ließen sich nicht öffnen.");
});

it("an answer that does not complete, or a send that throws, ends the run as failed with the sources kept; no second request", async () => {
  for (const answer of [async () => false, async () => Promise.reject(Error("synthetic failure"))]) {
    const { api } = double();
    const attempt = run(api, { answer });
    const result = await attempt.outcome;
    expect(result).toMatchObject({ status: "failed", step: "write", answerSent: true });
    expect(result.sources.length).toBeGreaterThan(0);
    expect(attempt.answer).toHaveBeenCalledTimes(1);
  }
});

it("the time for searching and reading runs out: reading stops and the answer uses what was read", async () => {
  let clock = 0;
  const { api, sent } = double((request) => {
    if (request.kind === "page") clock += RESEARCH_LIMITS.gatherMs + 1;
    return request.kind === "search" ? results(request.value) : { sources: [source(request.value, "page")] };
  });
  const { outcome, answer } = run(api, { now: () => clock });
  const result = await outcome;
  expect(result).toMatchObject({ status: "done", tally: { outOfTime: true, pages: 5 } });
  expect(sent("page")).toHaveLength(1);
  expect(answer).toHaveBeenCalledTimes(1);
});

it("the hard time limit stops the whole run like a stop does, and it is reported as a time-out", async () => {
  const { api, calls } = double(
    (request, signal) =>
      new Promise((resolve, reject) => {
        signal!.addEventListener("abort", () => reject(signal!.reason));
        if (request.value === QUERIES[0]) resolve(results(request.value));
      }),
  );
  const { outcome, answer } = run(api, { limits: { ...RESEARCH_LIMITS, wallClockMs: 50 } });
  const result = await outcome;
  expect(result).toMatchObject({ status: "timeout", step: "search", answerSent: false });
  const sentAtLimit = calls.length;
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(calls).toHaveLength(sentAtLimit);
  expect(answer).not.toHaveBeenCalled();
});

it("sources are numbered in the order given to the model, their ids resolve as citations, and the note is exported", async () => {
  const { api } = double();
  const result = await run(api).outcome;
  const { sources } = result;
  const conversation = {
    id: "c",
    title: "Synthetic research",
    createdAt: "2026-11-14T10:00:00.000Z",
    usage: [],
    messages: [newMessage("user", QUESTION)],
    attachments: [{ id: "a", name: "Deep research results", selected: true, kind: "research" as const, sources }],
  };
  // The model sees every source with its id, in this order.
  const reference = composeContext(conversation, 100_000)[1].content;
  const positions = sources.map((s) => reference.indexOf(`"id":"${s.id}"`));
  expect(positions.every((position) => position > 0)).toBe(true);
  expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  // Citations of those ids are known sources; an invented id is counted by the existing check.
  const text = `The notice period is three months [${sources[0].id}]. The fee is listed [${sources[1].id}].`;
  expect(auditResearchAnswer(text, sources).unknownSourceReferences).toBe(0);
  expect(auditResearchAnswer("Invented [src-999999].", sources).unknownSourceReferences).toBe(1);
  // The export numbers the same list and carries the note of what was searched and read.
  const note = researchNote(result.tally, "en");
  const exported = conversationText(
    {
      title: conversation.title,
      createdAt: conversation.createdAt,
      messages: [...conversation.messages, { ...newMessage("assistant", text), sourceSnapshot: sources, passagesUsed: note }],
    },
    "en",
  );
  sources.forEach((s, index) => expect(exported).toContain(`${index + 1}. ${s.title}: ${s.url}`));
  expect(exported).toContain("> Deep research: 4 searches, 6 pages.");
  expect(exported).toContain('Searched for: "synthetic tenancy notice period"; "synthetic fee cost"');
});
