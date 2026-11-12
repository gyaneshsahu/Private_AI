// Under one search approval the server also opens the top official result (12 November).
import { expect, it, vi } from "vitest";
import {
  officialHost,
  officialResult,
  pageAddressForReading,
  readTopPage,
  TOP_PAGE_CHARACTERS,
} from "../server/research";
import type { Source } from "../shared/contracts";
import { parseResearchResult, topPageNote } from "../src/research-result";

let next = 0;
const result = (url: string): Source => ({
  id: `synthetic-${++next}`,
  title: "Synthetic result",
  text: "Search excerpt only (full page not fetched): synthetic",
  url,
  evidenceKind: "search-excerpt",
  retrievedAt: new Date().toISOString(),
});

it("treats government, EU, central-bank and entity-named domains as official, and nothing else", () => {
  for (const [host, query] of [
    ["www.bundesregierung.de", "Bundeskanzler"],
    ["www.ecb.europa.eu", "ECB deposit rate"],
    ["www.irs.gov", "tax deadline"],
    ["www.bundesbank.de", "Leitzins"],
    ["www.service.bund.de", "Elterngeld"],
    ["www.bahn.de", "BahnCard 25 Preis"],
    ["www.deutsches-museum.de", "Deutsches Museum Öffnungszeiten"],
    ["www.muenchen.de", "Müllabfuhr München"],
    ["www.bbc.co.uk", "BBC licence fee"],
  ])
    expect(officialHost(host, query), host).toBe(true);
  for (const [host, query] of [
    ["www.easydealz.de", "BahnCard 25 Preis"],
    ["www.monsterdealz.de", "BahnCard 25 Preis"],
    ["www.ard.de", "standard deduction"],
    ["en.wikipedia.org", "photosynthesis"],
    ["gov.example.com", "tax deadline"],
  ])
    expect(officialHost(host, query), host).toBe(false);
});

it("picks the first official result in rank order and falls back to the top result", () => {
  const third = result("https://www.easydealz.de/bahncard");
  const official = result("https://www.bahn.de/angebot/bahncard");
  expect(officialResult("BahnCard 25 Preis", [third, official])).toBe(official);
  expect(officialResult("cheap rail card", [third, official])).toBe(third);
  expect(officialResult("anything", [])).toBeUndefined();
});

it("never sends a recognised identifier in a page address: strips the query or skips the page", () => {
  expect(
    pageAddressForReading("https://www.bahn.de/angebot/bahncard25-2-klasse"),
  ).toEqual({
    url: "https://www.bahn.de/angebot/bahncard25-2-klasse",
    outcome: "read",
  });
  expect(
    pageAddressForReading(
      "https://example.de/form?email=max.mustermann%40example.com&ref=1",
    ),
  ).toEqual({ url: "https://example.de/form", outcome: "read-without-query" });
  expect(
    pageAddressForReading("https://example.de/pay?iban=DE89+3704+0044+0532+0130+00"),
  ).toEqual({ url: "https://example.de/pay", outcome: "read-without-query" });
  expect(
    pageAddressForReading("https://example.de/kontakt/max.mustermann@example.com"),
  ).toEqual({ outcome: "skipped" });
  expect(
    pageAddressForReading("https://example.de/konto/DE89370400440532013000"),
  ).toEqual({ outcome: "skipped" });
});

it("reads the chosen page once with a deadline and a text cut, and reports every outcome", async () => {
  const page: Source = {
    ...result("https://www.bahn.de/angebot/bahncard"),
    evidenceKind: "page",
    text: "Synthetic page text",
  };
  const fetcher = vi.fn().mockResolvedValue([page]);
  const sources = [
    result("https://www.easydealz.de/x"),
    result("https://www.bahn.de/angebot/bahncard"),
  ];
  const read = await readTopPage("BahnCard 25 Preis", sources, undefined, fetcher);
  expect(fetcher).toHaveBeenCalledTimes(1);
  const [url, signal, limit] = fetcher.mock.calls[0];
  expect(url).toBe("https://www.bahn.de/angebot/bahncard");
  expect(signal).toBeInstanceOf(AbortSignal);
  expect(limit).toBe(TOP_PAGE_CHARACTERS);
  expect(read).toMatchObject({
    url: "https://www.bahn.de/angebot/bahncard",
    outcome: "read",
  });
  expect(read!.source!.text).toMatch(/^Top result page opened by CometRow's server/);
  // The client accepts the results plus the page, and says which address was read.
  const wire = {
    sources: [...sources, read!.source!],
    topPage: { url: read!.url, outcome: read!.outcome },
  };
  expect(parseResearchResult(wire, [])).toHaveLength(3);
  expect(topPageNote(wire)).toBe(
    "Our server also opened the top official result and read its text: https://www.bahn.de/angebot/bahncard",
  );

  const skipFetcher = vi.fn();
  const skipped = await readTopPage(
    "x",
    [result("https://example.de/u/max.mustermann@example.com")],
    undefined,
    skipFetcher,
  );
  expect(skipFetcher).not.toHaveBeenCalled();
  expect(skipped).toEqual({ url: "https://example.de", outcome: "skipped" });
  expect(topPageNote({ sources: [], topPage: skipped })).toBe(
    "The top result (example.de) was not opened, because its address contained a personal detail. The answer uses the search excerpts only.",
  );

  const failed = await readTopPage(
    "x",
    [result("https://example.de/a")],
    undefined,
    vi.fn().mockRejectedValue(new Error("blocked")),
  );
  expect(failed).toEqual({ url: "https://example.de/a", outcome: "failed" });
  expect(await readTopPage("x", [], undefined, vi.fn())).toBeUndefined();
});
