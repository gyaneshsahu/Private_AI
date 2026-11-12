// When to search (docs/when-to-search-20261112.md): detection on the device, masked
// search text, and automatic search off by default.
import { afterEach, expect, it, vi } from "vitest";
import {
  needsCurrentInformation,
  readAutoSearch,
  saveAutoSearch,
  searchSuggestion,
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
    "Removed from the search text before approval: 1 bank account, 1 email address.",
  );
  // Long messages are not simple lookups: no suggestion, so nothing can be searched automatically.
  expect(
    searchSuggestion(`What is the current price? ${"Context. ".repeat(40)}`, now),
  ).toBeUndefined();
});

afterEach(() => vi.unstubAllGlobals());

it("keeps automatic search off by default, on only after the user switches it on, on this device", () => {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
  });
  expect(readAutoSearch()).toBe(false);
  saveAutoSearch(true);
  expect([...store]).toEqual([["privateai.autoSearch", "on"]]);
  expect(readAutoSearch()).toBe(true);
  saveAutoSearch(false);
  expect(store.size).toBe(0);
  expect(readAutoSearch()).toBe(false);
  vi.stubGlobal("localStorage", {
    getItem: () => {
      throw new Error("blocked");
    },
  });
  expect(readAutoSearch()).toBe(false);
});
