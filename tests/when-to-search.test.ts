// When to search (docs/when-to-search-20261112.md): detection on the device and the masked search
// text. Search is automatic (owner, 19 November): "Look things up online" is on unless switched off.
import { afterEach, expect, it, vi } from "vitest";
import { prepareSearchQuery } from "../src/identifier-masking";
import { disclosureSchema } from "../shared/contracts";
import {
  editedSearchText,
  needsCurrentInformation,
  readLookUp,
  saveLookUp,
  searchSuggestion,
  WHEN_TO_SEARCH,
} from "../src/when-to-search";

const now = new Date("2026-11-12T12:00:00Z");

it("detects time-sensitive questions in English and German", () => {
  for (const text of [
    "What is the current ECB deposit rate?",
    "Who is the CEO of Siemens?",
    "who is the president of France",
    "How many moons does Saturn have?",
    "Deutsches Museum opening hours",
    "How much does the BahnCard 25 cost?",
    "What happened in the 2026 election?",
    "What is the population of Munich?",
    "Is this law still in force?",
    "Train timetable Munich to Berlin",
    "latest iPhone model",
    "Wer ist Bundeskanzler?",
    "Was kostet das Deutschlandticket?",
    "Wie hoch ist der Mindestlohn?",
    "Öffnungszeiten Rathaus München",
    "Wie viele Einwohner hat Berlin?",
    "Welche Regeln gelten heute?",
    "Wie hoch ist der aktuelle Leitzins?",
    "Wer ist die Bürgermeisterin von Köln?",
    "Wie viele Monde hat Jupiter?",
    "Wie wird das Wetter am Wochenende in Köln?",
    "Is the pharmacy on Main Street still open?",
    "Ist das Freibad noch geöffnet?",
  ])
    expect(needsCurrentInformation(text, now), text).toBe(true);
});

it("leaves timeless questions alone", () => {
  for (const text of [
    "What is photosynthesis?",
    "Explain recursion",
    "explain recursion with an example in Python",
    "How does the exchange rate mechanism work?",
    "How much is 15% of 80?",
    "Calculate 2025 * 3",
    "What does a prime minister do?",
    "Was ist Photosynthese?",
    "Erkläre Rekursion",
    "Wie funktioniert der Leitzins?",
    "Write a poem about the sea",
    "Shorten this paragraph for me",
    "Why is the sky blue?",
    "Who wrote Faust?",
    "What happened in 1989 in Berlin?",
    "Warum bekomme ich bei Wetterwechsel Kopfschmerzen?",
  ])
    expect(needsCurrentInformation(text, now), text).toBe(false);
});

it("suggests the question itself as search text, with identifiers removed on the device", () => {
  expect(searchSuggestion("Explain recursion", now)).toBeUndefined();
  expect(searchSuggestion("Wer ist Bundeskanzler?", now)?.value).toBe(
    "Wer ist Bundeskanzler?",
  );
  const masked = searchSuggestion(
    "What is the current fee for IBAN DE89 3704 0044 0532 0130 00 transfers, mail max.mustermann@example.com",
    now,
  )!;
  expect(masked.value).not.toContain("DE89");
  expect(masked.value).not.toContain("example.com");
  expect(masked.value).toContain("[bank account removed]");
  expect(masked.value).toContain("[email address removed]");
  expect(masked.note).toBe(
    "Removed from the search text before the search: 1 bank account, 1 email address.",
  );
  // Long messages are not simple lookups: no suggestion, so nothing can be searched automatically.
  expect(
    searchSuggestion(`What is the current price? ${"Context. ".repeat(40)}`, now),
  ).toBeUndefined();
});

// Owner decision of 14 November 2026: a rules question that names no country gets one, in the
// shown text, so the results are not another country's rules.
it("adds Germany to the suggested text of a rules question that names no country", () => {
  const value = (text: string, lang?: "en" | "de") => searchSuggestion(text, now, false, lang)?.value;
  expect(value("How much is the TV licence?")).toBe("How much is the TV licence? Germany");
  expect(value("Wie hoch ist der Rundfunkbeitrag?")).toBe("Wie hoch ist der Rundfunkbeitrag? Deutschland");
  // German interface: the German word, also for an English question.
  expect(value("How much is the TV licence?", "de")).toBe("How much is the TV licence? Deutschland");
  // "here" names no country.
  expect(value("Can my landlord raise the rent here?")).toBe("Can my landlord raise the rent here? Germany");
  for (const named of [
    "How much is the TV licence in Germany?",
    "Wie hoch ist der Rundfunkbeitrag in Deutschland?",
    "How much is the TV licence in Austria?",
    "Wie hoch ist die Hundesteuer in der Schweiz?",
    "Wie hoch ist die Hundesteuer in Köln?",
    "Wie viele Punkte in Flensburg gibt es für 21 km/h zu schnell?",
    "Welche Kündigungsfrist gilt nach § 573c BGB?",
    "How much is a UK TV licence?",
    "How much is a British passport?",
  ])
    expect(value(named), named).toBe(named);
  // Another country's rule in the detector's own wording is no rules question at all.
  expect(searchSuggestion("What is the minimum wage in France?", now)).toMatchObject({
    value: "What is the minimum wage in France?",
    rules: false,
  });
  // Never for an ordinary time-sensitive search.
  expect(value("Who is the current CEO of Siemens?")).toBe("Who is the current CEO of Siemens?");
  expect(value("Wer ist Bundeskanzler?")).toBe("Wer ist Bundeskanzler?");
  // Identifiers are removed exactly as before; the country goes on the masked text.
  const question = "Wie hoch ist der Mindestlohn? Mail max.mustermann@example.com";
  const masked = searchSuggestion(question, now)!;
  const before = prepareSearchQuery(question);
  expect(masked).toEqual({ ...before, value: `${before.value} Deutschland`, rules: true });
  expect(masked.value).toBe("Wie hoch ist der Mindestlohn? Mail [email address removed] Deutschland");
  // At the length limit the country is left off; the suggestion is kept.
  const long = `Wie hoch ist der Mindestlohn? ${"x".repeat(165)}`;
  expect(value(long)).toBe(long);
});

// A search text from a deep research plan or a scheduled task is masked again and held to the
// server's own limits (2 to 400 characters) before it is sent.
it("masks an edited search text again and applies the server's limits on the device", () => {
  // Unchanged or harmless edits pass through as typed.
  expect(editedSearchText("How much is the TV licence? Germany")).toMatchObject({
    value: "How much is the TV licence? Germany",
    note: "",
    problem: undefined,
  });
  // The user may delete the country or name another one.
  expect(editedSearchText("How much is the TV licence?").value).toBe("How much is the TV licence?");
  expect(editedSearchText("Wie hoch ist der Rundfunkbeitrag? Österreich")).toMatchObject({
    value: "Wie hoch ist der Rundfunkbeitrag? Österreich",
    problem: undefined,
  });
  // A typed email address is removed and reported.
  const typed = editedSearchText("TV licence fee max.mustermann@example.com", {}, "en");
  expect(typed.value).toBe("TV licence fee [email address removed]");
  expect(typed.note).toBe("Removed from the search text before the search: 1 email address.");
  expect(typed.problem).toBeUndefined();
  // What the suggestion already removed from the question stays in the count.
  const question = searchSuggestion("Wie hoch ist der Mindestlohn? Mail max.mustermann@example.com", now)!;
  const again = editedSearchText(`${question.value} IBAN DE89 3704 0044 0532 0130 00`, question.removed, "en");
  expect(again.value).toBe("Wie hoch ist der Mindestlohn? Mail [email address removed] Deutschland IBAN [bank account removed]");
  expect(again.note).toBe("Removed from the search text before the search: 1 bank account, 1 email address.");
  expect(editedSearchText("max.mustermann@example.com", {}, "de").note).toBe(
    "Vor der Suche aus dem Suchtext entfernt: 1 E-Mail-Adresse.",
  );
  // The masked text is the same when masked once more: what is shown is what is sent.
  expect(editedSearchText(again.value).value).toBe(again.value);
  // Line breaks and extra spaces become one space.
  expect(editedSearchText("  TV licence\nfee   Germany ").value).toBe("TV licence fee Germany");
  // Empty, too short, and too long (also when masking makes the text longer).
  for (const short of ["", "   ", "a", "​"]) expect(editedSearchText(short).problem, short).toBe("short");
  expect(editedSearchText("ab").problem).toBeUndefined();
  expect(editedSearchText("x".repeat(400)).problem).toBeUndefined();
  expect(editedSearchText("x".repeat(401)).problem).toBe("long");
  expect(editedSearchText(`${"x".repeat(390)} a@b.de`).problem).toBe("long");
  // Every edited text without a problem is one the server's schema accepts.
  expect(disclosureSchema.safeParse({ kind: "search", value: again.value }).success).toBe(true);
  expect(disclosureSchema.safeParse({ kind: "search", value: "x".repeat(401) }).success).toBe(false);
});

afterEach(() => vi.unstubAllGlobals());

it("looks things up online by default; off only after the user switches it off, on this device", () => {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
  });
  expect(readLookUp()).toBe(true);
  saveLookUp(false);
  expect([...store]).toEqual([["privateai.lookUpOnline", "off"]]);
  expect(readLookUp()).toBe(false);
  saveLookUp(true);
  expect(store.size).toBe(0);
  expect(readLookUp()).toBe(true);
  // The old opt-in keys mean nothing any more.
  store.set("privateai.autoSearch", "on");
  store.set("privateai.autoSearchRules", "on");
  expect(readLookUp()).toBe(true);
  // Blocked storage: searching stays on.
  vi.stubGlobal("localStorage", {
    getItem: () => {
      throw new Error("blocked");
    },
  });
  expect(readLookUp()).toBe(true);
});

it("shows the search texts in the interface language", () => {
  vi.stubGlobal("navigator", { languages: ["de-DE"], language: "de-DE" });
  expect(WHEN_TO_SEARCH.lookUpLabel).toBe("Online nachschlagen");
  expect(WHEN_TO_SEARCH.searchedWeb).toBe("Im Web gesucht");
  expect(WHEN_TO_SEARCH.searchedFor("Kindergeld 2026")).toBe("Gesucht nach: „Kindergeld 2026“");
  vi.stubGlobal("navigator", { languages: ["en-US"], language: "en-US" });
  expect(WHEN_TO_SEARCH.lookUpLabel).toBe("Look things up online");
  expect(WHEN_TO_SEARCH.searchedWeb).toBe("Searched the web");
});

// Search is automatic (owner, 19 November), so asking in words is enough: no button to press.
it("searches when the user asks for a look-up in words, in English and German, but not for search as a topic", () => {
  for (const text of [
    "Search the web for heat pump subsidies",
    "Can you look this up: Rundfunkbeitrag",
    "look it up please: Elbphilharmonie tickets",
    "Such im Internet nach dem Mindestlohn",
    "Recherchiere bitte die Öffnungszeiten der Bürgerämter",
    "Schlag das online nach",
  ])
    expect(needsCurrentInformation(text, now), text).toBe(true);
  for (const text of [
    "How do I search a list in Python?",
    "Write a binary search in JavaScript",
    "Look up table in Excel: how does VLOOKUP work?",
    "Was ist eine Suchmaschine?",
  ])
    expect(needsCurrentInformation(text, now), text).toBe(false);
});

it("searches what the user asked for, without the request words", () => {
  expect(searchSuggestion("Search the web for heat pump subsidies 2026", now, false, "en")?.value).toBe("heat pump subsidies 2026");
  expect(searchSuggestion("Recherchiere bitte die Öffnungszeiten des Bürgeramts", now, false, "en")?.value).toBe("die Öffnungszeiten des Bürgeramts");
  expect(searchSuggestion("Can you look this up: Rundfunkbeitrag", now, false, "en")?.value).toBe("Rundfunkbeitrag Germany");
  // Nothing left after the request words: the message itself is searched.
  expect(searchSuggestion("search the web for", now, false, "en")?.value).toBe("search the web for");
  // An ordinary question is searched as it is.
  expect(searchSuggestion("What is the current ECB rate?", now, false, "en")?.value).toBe("What is the current ECB rate?");
});
