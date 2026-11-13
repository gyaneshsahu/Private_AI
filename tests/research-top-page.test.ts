// Under one search approval the server also opens the top official result (12 November).
import { expect, it, vi } from "vitest";
import {
  officialHost,
  officialResult,
  pageAddressForReading,
  readTopPage,
  sameSite,
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
    topPage: { url: read!.url, outcome: read!.outcome, official: read!.official },
  };
  expect(parseResearchResult(wire, [])).toHaveLength(3);
  expect(topPageNote(wire)).toBe(
    "Our server also opened the top result and read its text: https://www.bahn.de/angebot/bahncard",
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

it("tries the next result when the first cannot be opened, and says 'official' only for an official page", async () => {
  const page = (url: string) => ({ id: "p1", title: "T", text: "Synthetic", url, retrievedAt: new Date().toISOString(), evidenceKind: "page" as const });
  const fetcher = vi.fn()
    .mockRejectedValueOnce(new Error("This page redirects."))
    .mockImplementation(async (url: string) => [page(url)]);
  const sources = [result("https://www.bmi.bund.de/a"), result("https://blog.example.de/b"), result("https://www.other.de/c")];
  const read = await readTopPage("Reisepass Gebühr", sources, undefined, fetcher);
  expect(fetcher.mock.calls.map((c) => c[0])).toEqual(["https://www.bmi.bund.de/a", "https://blog.example.de/b"]);
  // Same-site redirects are followed (three at most), with every target checked again.
  expect(fetcher.mock.calls[0].slice(3, 4)).toEqual([3]);
  expect(read).toMatchObject({ url: "https://blog.example.de/b", outcome: "read", official: false });
  expect(topPageNote({ sources: [], topPage: { url: read!.url, outcome: read!.outcome, official: read!.official } })).toBe(
    "Our server also opened the top result and read its text: https://blog.example.de/b",
  );
  // At most three attempts; the first failure is what the user is told.
  const none = await readTopPage("x", [result("https://a.de/1"), result("https://b.de/2"), result("https://c.de/3"), result("https://d.de/4")], undefined, vi.fn().mockRejectedValue(new Error("no")));
  expect(none).toEqual({ url: "https://a.de/1", outcome: "failed" });
});

it("calls a page official only for public-authority domains", async () => {
  const page = (url: string) => ({ id: "p1", title: "T", text: "Synthetic", url, retrievedAt: new Date().toISOString(), evidenceKind: "page" as const });
  const fetcher = vi.fn().mockImplementation(async (url: string) => [page(url)]);
  // Preferred because the domain is named in the question, but a private site.
  const named = await readTopPage("Deutsches Museum Eintritt", [result("https://blog.example.de/x"), result("https://www.deutsches-museum.org/")], undefined, fetcher);
  expect(named).toMatchObject({ url: "https://www.deutsches-museum.org/", official: false });
  // A German-rules search ranks by tier instead: a private site named after the topic is not preferred.
  const rules = await readTopPage("Kindergeld 2026", [result("https://blog.example.de/x"), result("https://www.kindergeld.org/")], undefined, fetcher);
  expect(rules).toMatchObject({ url: "https://blog.example.de/x", official: false, tier: "other" });
  const gov = await readTopPage("Mindestlohn", [result("https://www.bundesregierung.de/m")], undefined, fetcher);
  expect(gov).toMatchObject({ official: true });
});

it("follows a redirect only within the same site", () => {
  expect(sameSite(new URL("https://www.bmi.bund.de/x"), new URL("https://bmi.bund.de/y"))).toBe(true);
  expect(sameSite(new URL("https://www.bmi.bund.de/x"), new URL("https://evil.example/y"))).toBe(false);
});

it("on a German-rules search reads the first official result, else the first public-interest one, else the top one", async () => {
  const page = (url: string) => ({ id: "p1", title: "T", text: "Synthetic", url, retrievedAt: new Date().toISOString(), evidenceKind: "page" as const });
  const fetcher = vi.fn().mockImplementation(async (url: string) => [page(url)]);
  const q = "Wie lange habe ich Zeit, gegen einen Bußgeldbescheid Einspruch einzulegen?";
  const other = result("https://www.adac.de/einspruch");
  const austrian = result("https://www.bmi.gv.at/reisepass");
  const consumer = result("https://www.verbraucherzentrale.de/frist");
  const official = result("https://www.gesetze-im-internet.de/owig_1968/__67.html");
  const read = await readTopPage(q, [other, austrian, consumer, official], undefined, fetcher);
  expect(read).toMatchObject({ url: official.url, official: true, tier: "official" });
  expect(topPageNote({ sources: [other, official], topPage: { url: read!.url, outcome: "read", official: true, tier: "official" } })).toBe(
    `Our server also opened an official source and read its text: ${official.url}`,
  );
  const second = await readTopPage(q, [other, austrian, consumer], undefined, fetcher);
  expect(second).toMatchObject({ url: consumer.url, official: false, tier: "public-interest" });
  // A foreign authority is not official for a German rule.
  const third = await readTopPage(q, [austrian, other], undefined, fetcher);
  expect(third).toMatchObject({ url: austrian.url, official: false, tier: "other" });
  // The note names the tier and, without an official result, says so.
  expect(topPageNote({ sources: [other, consumer], topPage: { url: consumer.url, outcome: "read", tier: "public-interest" } })).toBe(
    `Our server also opened a public-interest page (not an official source) and read its text: ${consumer.url} No official source was found in the search results. Check the responsible authority before relying on these figures.`,
  );
  const failed = await readTopPage(q, [other], undefined, vi.fn().mockRejectedValue(new Error("no")));
  expect(failed).toEqual({ url: other.url, outcome: "failed", tier: "other" });
  expect(topPageNote({ sources: [other], topPage: failed })).toBe(
    "The top result (www.adac.de) could not be opened. The answer uses the search excerpts only. No official source was found in the search results. Check the responsible authority before relying on these figures.",
  );
  // An official result that could not be opened still counts as found.
  expect(topPageNote({ sources: [official, other], topPage: { url: other.url, outcome: "read", tier: "other" } })).toBe(
    `Our server also opened a non-official page and read its text: ${other.url}`,
  );
  // Other searches keep the earlier wording and carry no tier.
  const plain = await readTopPage("BahnCard 25 Preis", [result("https://www.bahn.de/x")], undefined, fetcher);
  expect(plain).not.toHaveProperty("tier");
});
