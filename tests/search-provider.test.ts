import { afterEach, expect, it, vi } from "vitest";
const upstream = vi.hoisted(() => vi.fn());
vi.mock("undici", async (importOriginal) => ({
  ...(await importOriginal<typeof import("undici")>()), fetch: upstream,
}));
import { searchWeb } from "../server/research";
import { parseResearchResult } from "../src/research-result";
afterEach(() => upstream.mockReset());
const result = { title: "<b>Library</b>", url: "https://example.com/library", description: "Saturday: <b>10–14</b>." };

it("sends only the exact search query and returns labelled excerpts compatible with client validation", async () => {
  upstream.mockResolvedValue(new Response(JSON.stringify({ web: { results: [result] }, extra: "ignored metadata" })));
  const sources = await searchWeb("synthetic library hours", "TEST_ONLY");
  expect(upstream).toHaveBeenCalledTimes(1);
  const [url, options] = upstream.mock.calls[0];
  expect(url.origin).toBe("https://api.search.brave.com");
  expect([...url.searchParams]).toEqual([["q", "synthetic library hours"], ["count", "5"]]);
  expect(options.body).toBeUndefined();
  expect(options.redirect).toBe("error");
  expect(sources[0].text).toBe("Search excerpt only (full page not fetched): Saturday: 10–14.");
  expect(sources[0].title).toBe("Library");
  expect(parseResearchResult({ sources }, [])).toEqual(sources);
});

it("fails the whole response on malformed evidence without exposing payloads or retrying", async () => {
  for (const payload of [null, {}, { error: { message: "SYNTHETIC_SECRET" } },
    { web: {} }, { web: { results: [result, { ...result, description: null }] } },
    ...[{ title: {} }, { description: "<b></b>" }, { url: "https://user:password@example.com/" },
      { title: "x".repeat(10001) }].map((change) => ({ web: { results: [{ ...result, ...change }] } })),
  ]) {
    upstream.mockReset();
    upstream.mockResolvedValue(new Response(JSON.stringify(payload)));
    await expect(searchWeb("synthetic", "TEST_ONLY")).rejects.toThrow("Search returned invalid source information. No automatic retry was made.");
    expect(upstream).toHaveBeenCalledTimes(1);
  }
});

it("preserves an explicit empty search result and bounds usable results to five", async () => {
  upstream.mockResolvedValueOnce(new Response(JSON.stringify({ web: { results: [] } })));
  expect(await searchWeb("synthetic", "TEST_ONLY")).toEqual([]);
  upstream.mockResolvedValueOnce(new Response(JSON.stringify({ web: { results: Array(6).fill(result) } })));
  expect(await searchWeb("synthetic", "TEST_ONLY")).toHaveLength(5);
});

it("uses bounded LLM context parameters with no location disclosure or fallback", async () => {
  upstream.mockResolvedValue(new Response(JSON.stringify({ grounding: { generic: [{ title: "Synthetic", url: "https://example.com/report", snippets: ["Event on October 5; published October 6."] }] } })));
  const sources = await searchWeb("synthetic event", "TEST_ONLY", undefined, "llm-context");
  const [url, options] = upstream.mock.calls[0];
  expect(url.pathname).toBe("/res/v1/llm/context");
  expect(url.searchParams.get("maximum_number_of_tokens")).toBe("4096");
  expect(url.searchParams.get("enable_local")).toBe("false");
  expect(sources[0].evidenceKind).toBe("llm-context");
  expect(parseResearchResult({ sources }, [])).toEqual(sources);
  expect(options.headers).not.toHaveProperty("X-Loc-Lat");
  upstream.mockReset();
  upstream.mockResolvedValue(new Response("", {status: 403}));
  await expect(searchWeb("synthetic event", "TEST_ONLY", undefined, "llm-context")).rejects.toThrow("No automatic retry");
  expect(upstream).toHaveBeenCalledTimes(1);
});

it("keeps provider page dates separate from retrieval timestamps", async () => {
  upstream.mockResolvedValue(new Response(JSON.stringify({ web: { results: [{...result, page_age: "2026-10-05T09:00:00"}] } })));
  const sources = await searchWeb("synthetic date", "TEST_ONLY");
  expect(sources[0].providerDate).toBe("2026-10-05T09:00:00");
  expect(sources[0].retrievedAt).not.toBe(sources[0].providerDate);
});
