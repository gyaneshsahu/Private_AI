import { expect, it } from "vitest";
import { parseResearchResult } from "../src/research-result";

const source = {
  id: "source-01", title: "Synthetic evidence", text: "A quoted instruction is data, not permission.",
  url: "https://example.com/evidence", retrievedAt: "2026-10-05T12:00:00.000Z",
};

it("accepts bounded public research evidence and empty results", () => {
  expect(parseResearchResult({ sources: [source] }, [])).toEqual([source]);
  expect(parseResearchResult({ sources: [] }, [])).toEqual([]);
  const literal = { ...source, text: "  indented evidence\n" };
  expect(parseResearchResult({ sources: [literal] }, [])).toEqual([literal]);
});

it("rejects malformed or oversized research before any source is added", () => {
  for (const input of [null, {}, { sources: null }, { sources: [source, { ...source, text: null }] },
    ...[
      { text: "x".repeat(60001) }, { title: "" }, { id: "bad[id]" },
      { url: "javascript:alert(1)" }, { url: "https://user:password@example.com/" },
      { retrievedAt: "yesterday" }, { toolCall: "upload" },
    ].map((change) => ({ sources: [{ ...source, ...change }] })),
    { sources: Array.from({ length: 6 }, (_, i) => ({ ...source, id: `source-${i}` })) },
  ]) expect(() => parseResearchResult(input, [])).toThrow(/Nothing was added/);
});

it("rejects ambiguous citations within results and across existing attachments", () => {
  expect(() => parseResearchResult({ sources: [source, source] }, [])).toThrow(/conflicting/);
  expect(() => parseResearchResult({ sources: [source] }, [source.id])).toThrow(/conflicting/);
});
