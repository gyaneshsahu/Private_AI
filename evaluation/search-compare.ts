// Live comparison, 12 November 2026: Brave (our adapter, server/research.ts searchWeb) against
// Tinfoil's enclave web search (Exa behind Tinfoil, `web_search_options` on Chat Completions).
// Synthetic, non-personal queries only, masked on this machine before anything is sent.
// NOTHING returned by either supplier is written anywhere: no answer text, no snippets, no titles,
// no links, no model-composed queries. Only derived measurements are printed (counts, booleans,
// latency, tokens, cost, content-category counts).
// Budget (owner, 12 November): at most 20 Tinfoil requests and at most USD 1 worst case.
// Plain TLS from Node, no EHBP: our relay would carry the same body encrypted to the verified enclave.
// Keys from Windows Credential Manager only, never printed:
//   Import-Module .\scripts\WindowsSecrets.psm1; Invoke-WithPrivateAiSecret -Name TINFOIL_API_KEY -Action {
//     Invoke-WithPrivateAiSecret -Name BRAVE_SEARCH_API_KEY -Action { npx tsx evaluation/search-compare.ts } }
// `npx tsx evaluation/search-compare.ts --dry` runs the masking self-checks and prints the plan, no network.
import assert from "node:assert/strict";
import {
  MASKING_INSTRUCTION,
  createMaskingSession,
  prepareSearchQuery,
} from "../src/identifier-masking";
import { searchWeb } from "../server/research";

const FAKE_IBAN = "DE89 3704 0044 0532 0130 00"; // the textbook example IBAN, not a real account
const IBAN_DIGITS = FAKE_IBAN.replace(/\s/g, "");
const ibanPresent = (text: string) => text.replace(/[\s-]/g, "").includes(IBAN_DIGITS);
const placeholderPresent = (text: string) => /\{\{?\s*IBAN\s*-\s*\d|IBAN-1|bank account removed/i.test(text);

// keywords: lower-case stems; a source counts as relevant when its title or URL contains one.
// shortcut: keyword overlap on title+URL only (Tinfoil returns no snippets), a crude proxy, not graded relevance.
const QUERIES: { id: string; lang: "en" | "de"; text: string; keywords: string[]; piiCheck?: true }[] = [
  { id: "eggs", lang: "en", text: "how long do eggs keep in the fridge", keywords: ["egg", "fridge", "refrigerat"] },
  { id: "buergeramt", lang: "de", text: "Öffnungszeiten Bürgeramt Berlin allgemein", keywords: ["bürgeramt", "buergeramt", "burgeramt", "berlin"] },
  { id: "ebook-vat", lang: "en", text: "current EU VAT rules for e-books", keywords: ["vat", "e-book", "ebook", "tax"] },
  { id: "grundfreibetrag", lang: "de", text: "Wie hoch ist der Grundfreibetrag bei der Einkommensteuer 2026?", keywords: ["grundfreibetrag", "einkommensteuer", "steuer"] },
  { id: "boiling", lang: "en", text: "what is the boiling point of water at 2000 metres altitude", keywords: ["boil", "altitude", "water"] },
  { id: "winterreifen", lang: "de", text: "Wann muss man in Deutschland Winterreifen aufziehen?", keywords: ["winterreifen", "reifen", "tyre", "tire"] },
  { id: "kettle", lang: "en", text: "how to descale a kettle with citric acid", keywords: ["descal", "kettle", "citric", "limescale"] },
  { id: "kuendigung", lang: "de", text: "Kündigungsfrist Mietvertrag Mieter gesetzlich", keywords: ["kündigung", "kuendigung", "mietvertrag", "miet"] },
  { id: "iban", lang: "en", text: `I pay my rent from account ${FAKE_IBAN}. How long does a normal SEPA transfer take in Germany?`, keywords: ["sepa", "transfer", "überweisung", "ueberweisung", "payment"] },
  { id: "iban-pii", lang: "de", text: `Ich überweise die Miete von ${FAKE_IBAN}. Wie lange dauert eine normale SEPA-Überweisung in Deutschland?`, keywords: ["sepa", "überweisung", "ueberweisung", "transfer", "payment"], piiCheck: true },
];

const MODEL = "gpt-oss-120b";
const PRICE = { input: 0.15, output: 0.6 }; // USD per million tokens, catalog of 26 October
const SEARCH_FEE = 0.05; // supplier email of 22 October; checked against the metered cost_usd below
const UNKNOWN_FILTER_FEE_BOUND = 0.05; // privacy filter fee is unpublished; assume at most the search fee
const MAX_COMPLETION = 2000;
const MAX_REQUESTS = 20;
const MAX_USD = 1;
// Worst case for one request before it is sent: fee, unknown filter fee, 100k prompt tokens across the tool loop, full output.
const worstBefore = (pii: boolean) =>
  SEARCH_FEE + (pii ? UNKNOWN_FILTER_FEE_BOUND : 0) + (100_000 * PRICE.input + MAX_COMPLETION * PRICE.output) / 1e6;

// Content categories we would have to avoid storing: counts only.
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const PHONE = /(?:\+\d{1,3}[ ./-]?|\b0)\d{2,5}[ ./-]?\d{3,}(?:[ ./-]?\d{2,})*/g;
// shortcut: "two capitalised words" over-counts (place and product names), an upper bound for personal names.
const NAME_LIKE = /\b[A-ZÄÖÜ][a-zäöüß]{2,} [A-ZÄÖÜ][a-zäöüß]{2,}\b/gu;
const categories = (texts: string[]) => {
  const all = texts.join("\n");
  return {
    emailLike: all.match(EMAIL)?.length ?? 0,
    phoneLike: all.match(PHONE)?.length ?? 0,
    nameLike: all.match(NAME_LIKE)?.length ?? 0,
    longestTextChars: Math.max(0, ...texts.map((t) => t.length)),
  };
};
const relevantCount = (items: { title: string; url: string }[], keywords: string[]) =>
  items.filter((s) => {
    let url = s.url;
    try { url = decodeURIComponent(url); } catch { /* keep the encoded form */ }
    return keywords.some((k) => `${s.title} ${url}`.toLowerCase().includes(k));
  }).length;

// Self-checks: masking runs before anything is sent, in both designs.
const masked = (text: string) => {
  const session = createMaskingSession();
  return session.mask(text);
};
for (const q of QUERIES) {
  const brave = prepareSearchQuery(q.text).value;
  const tinfoil = masked(q.text);
  assert(!ibanPresent(brave) && !ibanPresent(tinfoil), `raw IBAN survived masking in ${q.id}`);
  if (ibanPresent(q.text)) assert(placeholderPresent(brave) && placeholderPresent(tinfoil), `no placeholder in ${q.id}`);
}
assert(relevantCount([{ title: "Eggs storage", url: "https://x.test/" }], ["egg"]) === 1);
assert(categories(["mail a@b.de or +49 30 1234567"]).emailLike === 1);

if (process.argv.includes("--dry")) {
  console.log(JSON.stringify(QUERIES.map((q) => ({
    id: q.id, braveSentChars: prepareSearchQuery(q.text).value.length, tinfoilSentChars: masked(q.text).length,
    rawIbanInEither: false, piiCheck: !!q.piiCheck, worstCaseUSD: Number(worstBefore(!!q.piiCheck).toFixed(4)),
  })), null, 2));
  process.exit(0);
}

const tinfoilKey = process.env.TINFOIL_API_KEY;
const braveKey = process.env.BRAVE_SEARCH_API_KEY;
if (!tinfoilKey) throw Error("TINFOIL_API_KEY missing from the process env");

const parseMetrics = (line: string | null) =>
  Object.fromEntries((line ?? "").split(",").filter(Boolean).map((kv) => kv.split("=") as [string, string]));
const MARKER = /\n?<tinfoil-event>([\s\S]*?)<\/tinfoil-event>\n?/g;
type Marker = {
  status?: string;
  action?: { type?: string; query?: string; url?: string };
  sources?: { url: string; title: string }[];
  pii?: { masked?: boolean; redactions?: { type: string }[] };
};

let sent = 0;
let tallyUSD = 0;
let meteredUSD = 0;
const rows: Record<string, unknown>[] = [];

for (const q of QUERIES) {
  const row: Record<string, unknown> = { id: q.id, lang: q.lang };
  rows.push(row);

  // Brave: the approved query exactly as our approval flow would send it (identifiers removed).
  if (braveKey) {
    const query = prepareSearchQuery(q.text).value;
    const t0 = performance.now();
    try {
      const results = await searchWeb(query, braveKey);
      row.brave = {
        ok: true,
        latencyMs: Math.round(performance.now() - t0),
        results: results.length,
        relevant: relevantCount(results.map((r) => ({ title: r.title, url: r.url ?? "" })), q.keywords),
        ...categories(results.flatMap((r) => [r.title, r.text])),
        rawIbanInSentQuery: ibanPresent(query),
        removalLabelInSentQuery: placeholderPresent(query),
      };
    } catch (error) {
      row.brave = { ok: false, latencyMs: Math.round(performance.now() - t0), error: (error as Error).message };
    }
  }

  // Tinfoil enclave search.
  const pii = !!q.piiCheck;
  if (sent >= MAX_REQUESTS || tallyUSD + worstBefore(pii) > MAX_USD) {
    row.tinfoil = { skipped: "budget" };
    continue;
  }
  const body = JSON.stringify({
    model: MODEL,
    messages: [
      { role: "system", content: `You are a helpful assistant.${MASKING_INSTRUCTION}` },
      { role: "user", content: masked(q.text) },
    ],
    reasoning_effort: "low",
    max_completion_tokens: MAX_COMPLETION,
    web_search_options: { search_context_size: "low" },
    ...(pii ? { pii_check_options: {} } : {}),
  });
  assert(!ibanPresent(body), "raw IBAN in the Tinfoil request body"); // last line of defence before the network
  sent++;
  const t0 = performance.now();
  let response: Response;
  try {
    response = await fetch("https://inference.tinfoil.sh/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tinfoilKey}`,
        "Content-Type": "application/json",
        "X-Tinfoil-Request-Usage-Metrics": "true",
        "X-Tinfoil-Events": "web_search", // markers carry the model's query; parsed in memory, never kept
      },
      body,
      signal: AbortSignal.timeout(180_000),
    });
  } catch (error) {
    tallyUSD += worstBefore(pii);
    row.tinfoil = { ok: false, latencyMs: Math.round(performance.now() - t0), error: (error as Error).name };
    continue;
  }
  const latencyMs = Math.round(performance.now() - t0);
  const metrics = parseMetrics(response.headers.get("x-tinfoil-usage-metrics"));
  const rateHeaders = Object.fromEntries([...response.headers].filter(([k]) => /ratelimit|retry-after/i.test(k)));
  if (!response.ok) {
    await response.body?.cancel();
    tallyUSD += metrics.cost_usd ? Number(metrics.cost_usd) : worstBefore(pii);
    row.tinfoil = { ok: false, status: response.status, latencyMs, metrics, rateHeaders };
    continue;
  }
  const data = (await response.json()) as {
    choices?: { message?: { content?: string; annotations?: { type: string; url_citation?: { url: string; title: string } }[] }; finish_reason?: string }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const raw = data.choices?.[0]?.message?.content ?? "";
  const markers: Marker[] = [...raw.matchAll(MARKER)].flatMap((m) => {
    try { return [JSON.parse(m[1]) as Marker]; } catch { return []; }
  });
  const answer = raw.replace(MARKER, "");
  const citations = (data.choices?.[0]?.message?.annotations ?? [])
    .filter((a) => a.type === "url_citation" && a.url_citation)
    .map((a) => a.url_citation!);
  const uniqueCitations = [...new Map(citations.map((c) => [c.url, c])).values()];
  const terminal = markers.filter((m) => m.status === "completed" || m.status === "failed");
  const searches = terminal.filter((m) => m.action?.type === "search");
  const queriesSent = searches.map((m) => m.action?.query ?? "");
  const prompt = data.usage?.prompt_tokens ?? Number(metrics.prompt ?? 0);
  const completion = data.usage?.completion_tokens ?? Number(metrics.completion ?? 0);
  const tokenUSD = (prompt * PRICE.input + completion * PRICE.output) / 1e6;
  const searched = metrics.web_search_calls !== undefined;
  const computedUSD = tokenUSD + (searched ? SEARCH_FEE : 0) + (pii && !metrics.other_cost_usd ? UNKNOWN_FILTER_FEE_BOUND : 0);
  const reported = metrics.cost_usd !== undefined ? Number(metrics.cost_usd) : undefined;
  tallyUSD += Math.max(computedUSD, reported ?? 0);
  if (reported !== undefined) meteredUSD += reported;
  row.tinfoil = {
    ok: true,
    latencyMs,
    finishReason: data.choices?.[0]?.finish_reason,
    answerProduced: answer.trim().length > 0,
    answerChars: answer.length,
    searchCalls: searches.length,
    openPageCalls: terminal.filter((m) => m.action?.type === "open_page").length,
    failedCalls: terminal.filter((m) => m.status === "failed").length,
    markerSources: searches.reduce((n, m) => n + (m.sources?.length ?? 0), 0),
    citations: uniqueCitations.length,
    relevantCitations: relevantCount(uniqueCitations, q.keywords),
    ...categories([answer, ...uniqueCitations.map((c) => c.title)]),
    rawIbanInModelQuery: queriesSent.some(ibanPresent),
    placeholderInModelQuery: queriesSent.some(placeholderPresent),
    rawIbanInAnswerOrCitations: ibanPresent(answer) || uniqueCitations.some((c) => ibanPresent(c.url + c.title)),
    placeholderInAnswer: placeholderPresent(answer),
    placeholderInCitations: uniqueCitations.some((c) => placeholderPresent(c.url + c.title)),
    piiCheckRequested: pii,
    piiReported: searches.some((m) => m.pii !== undefined),
    piiMasked: searches.some((m) => m.pii?.masked === true),
    piiRedactionTypes: [...new Set(searches.flatMap((m) => m.pii?.redactions?.map((r) => r.type) ?? []))],
    promptTokens: prompt,
    completionTokens: completion,
    tokenUSD: Number(tokenUSD.toFixed(6)),
    metrics, // token counts, model, web_search_calls, cost_usd, other_cost_usd: no content
    rateHeaders,
  };
  console.error(`tinfoil ${q.id}: request ${sent}, running worst-case USD ${tallyUSD.toFixed(4)}`);
}

console.log(JSON.stringify({
  observedAt: new Date().toISOString(),
  model: MODEL,
  tinfoilRequestsSent: sent,
  tinfoilWorstCaseUSD: Number(tallyUSD.toFixed(4)),
  tinfoilMeteredCostUSD: Number(meteredUSD.toFixed(6)),
  braveRequestsSent: braveKey ? QUERIES.length : 0,
  rows,
}, null, 2));
