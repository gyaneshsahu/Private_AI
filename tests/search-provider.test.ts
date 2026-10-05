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
