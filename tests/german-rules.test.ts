// German rules, fees and deadlines (docs/german-rules-20261113.md): the on-device detector on the
// real benchmark prompts, the scoped prompt rule, the after-answer check and Auto's routing.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { emptyConversation, type Conversation } from "../shared/contracts";
import { autoDecision } from "../src/answer-modes";
import { composeContext, newMessage } from "../src/conversation";
import {
  asksBeforeSending,
  checkUncheckedFigures,
  GERMAN_RULES,
  germanRulesQuestion,
  statesUncheckedFigures,
} from "../src/german-rules";
import { savedConversationSchema } from "../src/saved-conversation";
import { searchSuggestion } from "../src/when-to-search";

const prompts = Object.fromEntries(
  [
    "evaluation/benchmark-fresh-20261112",
    "evaluation/benchmark-privatemode-20261112",
    "evaluation/blind-benchmark",
  ].flatMap((dir) =>
    (JSON.parse(readFileSync(`${dir}/prompts.json`, "utf8")).prompts as { id: string; prompt: string | string[] }[]).map(
      (p) => [p.id, Array.isArray(p.prompt) ? p.prompt[0] : p.prompt],
    ),
  ),
);
const ids = (pattern: RegExp) => Object.keys(prompts).filter((id) => pattern.test(id));

describe("detector", () => {
  it.each([...ids(/^G-0\d$/), ...ids(/^P-G\d$/), "L7-04", "R-01", "R-04", "R-05", "R-07", "P-R1", "P-R5"])(
    "recognises the German-rules prompt %s",
    (id) => expect(germanRulesQuestion(prompts[id])).toBe(true),
  );

  // Time-sensitive but not rules (T-*), code (C-*, P-C*), explanation (P-T5, L7-02, T-08),
  // rewriting, translating and writing (L7-01, L7-05, L7-06), arithmetic (L7-03) and health (L8-*).
  it.each([...ids(/^T-0\d$/), ...ids(/^C-0\d$/), ...ids(/^P-C\d$/), "P-T5", ...ids(/^L7-0[12356]$/), ...ids(/^L8-0\d$/)])(
    "leaves %s alone",
    (id) => expect(germanRulesQuestion(prompts[id])).toBe(false),
  );

  it.each([
    "What is the speeding fine for 21 km/h too fast in town?",
    "How long is the notice period for a tenant?",
    "My landlord wants a rent increase. Do I have to agree?",
    "How much does a new ID card cost?",
    "When is the tax return due?",
    "Is it legal in Germany to record a phone call?",
    "Darf man in Deutschland nachts Rasen mähen?",
    "Was steht in § 573c BGB?",
    "Wie viele Punkte gibt es für eine rote Ampel?",
    "Wie hoch ist das Bußgeld fürs Handy am Steuer?",
    "Was kostet der Führerschein-Umtausch?",
    "Wann bekomme ich meine Nebenkostenabrechnung?",
    "Wie lange ist die Probezeit im Arbeitsvertrag höchstens?",
    "Wie hoch ist der Zusatzbeitrag meiner Krankenkasse?",
    "Was ist die Kündigungsfrist?",
  ])("recognises %s", (text) => expect(germanRulesQuestion(text)).toBe(true));

  it.each([
    "Translate into German: my landlord wants a rent increase.",
    "Übersetze: Die Kündigungsfrist beträgt drei Monate.",
    "Rewrite this politely: the notice period is too long.",
    "Fasse den Mietvertrag zusammen.",
    "Explain what a pension is.",
    "Was ist eine Rente?",
    "Wie funktioniert das Elterngeld?",
    "What must-see places are there in Germany?",
    "How much does a coffee cost in Germany?",
    "Ich habe eine Ankündigung für das Sommerfest geschrieben.",
    "What is the capital of France?",
  ])("leaves %s alone", (text) => expect(germanRulesQuestion(text)).toBe(false));
});

describe("before sending", () => {
  it("offers the search with the rules heading even when the question is not time-sensitive", () => {
    const now = new Date("2026-11-13T00:00:00Z");
    expect(searchSuggestion(prompts["G-04"], now)).toMatchObject({ value: prompts["G-04"], rules: true });
    expect(searchSuggestion(prompts["T-04"], now)).toMatchObject({ rules: false });
    expect(searchSuggestion("Explain recursion", now)).toBeUndefined();
    // Ends with a full stop: the box goes on with "Search the web for:".
    expect(GERMAN_RULES.heading).toBe("Rules, fees and deadlines change. Check the official source first.");
  });

  it("asks before sending only for a German-rules question without web results or automatic search", () => {
    const now = new Date("2026-11-13T00:00:00Z");
    const rules = searchSuggestion(prompts["G-04"], now);
    expect(asksBeforeSending(rules, false, false)).toBe(true);
    // Automatic search on: searched without asking. Web results selected: answered from them.
    expect(asksBeforeSending(rules, true, false)).toBe(false);
    expect(asksBeforeSending(rules, false, true)).toBe(false);
    // The after-answer box is not a Send.
    expect(asksBeforeSending(rules && { ...rules, again: true }, false, false)).toBe(false);
    // Time-sensitive but not German rules, and a timeless question: Send answers directly.
    expect(asksBeforeSending(searchSuggestion(prompts["T-04"], now), false, false)).toBe(false);
    expect(asksBeforeSending(searchSuggestion("Explain recursion", now), false, false)).toBe(false);
    // No showable search text (over 200 characters): nothing to approve, so no choice.
    expect(asksBeforeSending(searchSuggestion(`Welche Kündigungsfrist gilt? ${"x".repeat(200)}`, now), false, false)).toBe(false);
  });
});

const withWeb = (c: Conversation) => {
  c.attachments.push({
    id: "w",
    name: "Public search results",
    selected: true,
    kind: "research",
    sources: [{ id: "w1", title: "Synthetic", text: "Synthetic excerpt", url: "https://example.gov/" }],
  });
  return c;
};
const ask = (text: string) => {
  const c = emptyConversation();
  c.messages.push(newMessage("user", text));
  return c;
};

describe("scoped prompt rule", () => {
  const now = new Date("2026-11-13T00:00:00Z");
  const rule = "no official source is in this conversation. Do not state specific amounts";
  it("is added to the product prompt for a German-rules question without web results only", () => {
    const product = composeContext(ask(prompts["P-G4"]), 8000, now)[0].content;
    expect(product).toContain(GERMAN_RULES.policy);
    expect(product).toContain("gesetze-im-internet.de");
    // The product prompt with the rule and the question still fits the 8,000 limit.
    expect(product.length + prompts["P-G4"].length).toBeLessThan(8000);
    expect(composeContext(ask("What is the capital of France?"), 8000, now)[0].content).not.toContain(rule);
    expect(composeContext(withWeb(ask(prompts["P-G4"])), 10000, now)[0].content).not.toContain(rule);
    // Only the latest question counts: a follow-up on another topic drops the rule.
    const later = ask(prompts["P-G4"]);
    later.messages.push(newMessage("assistant", "Synthetic answer."), newMessage("user", "What is the capital of France?"));
    expect(composeContext(later, 8000, now)[0].content).not.toContain(rule);
    for (const variant of ["constraints-v1", "constraints-v2", "constraints-v3", "constraints-v4"] as const)
      expect(composeContext(ask(prompts["P-G4"]), 10000, now, variant)[0].content).not.toContain(rule);
  });

  it("with web results, states figures only from them (product prompt, German-rules question only)", () => {
    const sourced = "state figures, deadlines and legal consequences only if they appear in the web results";
    const product = composeContext(withWeb(ask(prompts["P-G4"])), 8000, now)[0].content;
    expect(product).toContain(GERMAN_RULES.sourcedPolicy);
    expect(product).not.toContain(rule);
    // The web product prompt with the rule and the question fits the 8,000 limit.
    expect(product.length + prompts["P-G4"].length).toBeLessThan(8000);
    expect(composeContext(ask(prompts["P-G4"]), 8000, now)[0].content).not.toContain(sourced);
    expect(composeContext(withWeb(ask("Wer ist Bundeskanzler?")), 8000, now)[0].content).not.toContain(sourced);
    for (const variant of ["constraints-v1", "constraints-v2", "constraints-v3", "constraints-v4"] as const)
      expect(composeContext(withWeb(ask(prompts["P-G4"])), 10000, now, variant)[0].content).not.toContain(sourced);
  });
});

describe("after the answer", () => {
  it.each([
    "Das kostet 115 € und 1 Punkt.",
    "Die Frist beträgt 3 Monate.",
    "Sie haben drei Monate Zeit.",
    "Abgabe bis zum 31. Juli.",
    "The deadline is 31 July 2026.",
    "You get 20 working days.",
    "Siehe § 558b BGB.",
    "Dafür gibt es einen Punkt und oft ein einmonatiges Fahrverbot.",
    "Das bringt zwei Punkte in Flensburg.",
    "It costs EUR 46.",
  ])("finds the unchecked figure in %s", (answer) => expect(statesUncheckedFigures(answer)).toBe(true));

  it.each([
    "Das hängt vom Einzelfall ab; prüfen Sie es beim Bürgeramt.",
    "The rule depends on your contract. Check gesetze-im-internet.de or ask the authority.",
    "Für das Jahr 2025 gilt eine Abgabefrist, die das Finanzamt nennt.",
  ])("stays quiet on %s", (answer) => expect(statesUncheckedFigures(answer)).toBe(false));

  it("flags only a German-rules question answered without web results, and never sends the flag", () => {
    const c = ask(prompts["G-04"]);
    const answer = newMessage("assistant", "Drei Monate (§ 573c BGB).");
    c.messages.push(answer);
    expect(checkUncheckedFigures(c.messages, answer.id, answer.text, false)).toBe(true);
    expect(checkUncheckedFigures(c.messages, answer.id, answer.text, true)).toBeUndefined();
    expect(checkUncheckedFigures(c.messages, answer.id, "Das hängt vom Vertrag ab.", false)).toBeUndefined();
    const other = ask("How many moons does Jupiter have?");
    other.messages.push(answer);
    expect(checkUncheckedFigures(other.messages, answer.id, answer.text, false)).toBeUndefined();
    // Stored on the device with the conversation, never model context.
    c.messages[1] = { ...answer, uncheckedFigures: true };
    expect(savedConversationSchema.parse(c).messages[1].uncheckedFigures).toBe(true);
    expect(JSON.stringify(composeContext(c, 10000))).not.toContain("uncheckedFigures");
  });
});

describe("Auto routing", () => {
  it("sends German-rules questions to Thinking without web results and to Fast with them", () => {
    for (const id of [...ids(/^G-0\d$/), ...ids(/^P-G\d$/), "L7-04"])
      expect(autoDecision(ask(prompts[id])), id).toEqual({ mode: "thinking", reason: "rules" });
    expect(autoDecision(withWeb(ask(prompts["G-03"])))).toEqual({ mode: "fast", reason: "rules" });
    // Rewriting a letter to the landlord stays a rewrite on Fast.
    expect(autoDecision(ask(prompts["L7-01"]))).toEqual({ mode: "fast", reason: "rewrite" });
  });
});
