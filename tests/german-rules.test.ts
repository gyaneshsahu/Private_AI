// German rules, fees and deadlines (docs/german-rules-20261113.md): the on-device detector on the
// real benchmark prompts, the scoped prompt rule, the after-answer check and Auto's routing.
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { emptyConversation, type Conversation } from "../shared/contracts";
import { autoDecision } from "../src/answer-modes";
import { composeContext, newMessage } from "../src/conversation";
import {
  answerStatesRules,
  asksBeforeSending,
  checkNoOfficialSource,
  checkUncheckedFigures,
  GERMAN_RULES,
  GERMAN_RULES_TEXT,
  germanRulesQuestion,
  rankByTier,
  sourceTier,
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
    // Everyday German wording (13 November, evaluation/german-routing-20261113).
    "Ich habe einen Strafzettel bekommen. Kann ich Einspruch einlegen?",
    "Wann muss ich mein Gewerbe abmelden?",
    "Darf die Polizei mein Handy durchsuchen?",
    "Kann ich die neue Brille von der Steuer absetzen?",
    "Welche Rechte habe ich, wenn die Bahn ausfällt?",
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
    // A sign-up, a dose, a boss without a rule, and tax as an amount in the user's own sum.
    "Wie melde ich mich für den Newsletter an?",
    "Darf ich Ibuprofen mit Paracetamol nehmen?",
    "Mein Chef hat mich gelobt. Wie reagiere ich am besten?",
    "Ein Fahrrad kostet 500 € inklusive 19 % Mehrwertsteuer. Wie viel Steuer ist darin?",
  ])("leaves %s alone", (text) => expect(germanRulesQuestion(text)).toBe(false));

  // Question shapes (14 November, docs/german-routing-20261113.md): a permission, duty, amount or
  // entitlement frame with an official or everyday-law word, whatever the topic is called.
  it.each([
    "Darf ich im Treppenhaus mein Fahrrad abstellen?",
    "muss der haendler die kaputte waschmaschine zuruecknehmen",
    "Wie hoch ist das Krankengeld nach sechs Wochen?",
    "Habe ich Anspruch auf einen Kitaplatz?",
    "bis wann muss ich die grundsteuererklaerung abgeben",
    "Was kostet die Vignette in Österreich",
    "Kann ich die Schuhe ohne Kassenzettel umtauschen?",
    "How long can I stay in Austria without registering?",
    "Wie viel Steuern muss ich bei 3.000 € brutto ungefähr rechnen?",
  ])("recognises the shape of %s", (text) => expect(germanRulesQuestion(text)).toBe(true));

  it.each([
    // A practical "must I", a custom, a market price, a question to the assistant.
    "Wie oft muss ich mein Fahrrad ölen?",
    "Wie viel Trinkgeld gibt man beim Friseur?",
    "Was kostet ein Fahrrad für Kinder?",
    "Darf ich dich etwas zu meiner Arbeit fragen?",
    // The user's own figures, software, a code identifier, an organisation's own rule.
    "Ich habe zwei Rechnungen über 300 € und 150 €. Wie viel muss ich insgesamt zahlen?",
    "Wie rechne ich in Excel die Steuer aus?",
    "Meine Variable max_miete ist undefined. Woran liegt das?",
    "Bis wann muss ich bei uns im Verein den Mitgliedsbeitrag überweisen?",
    "Can I pay by card in Germany?",
    // Steering, not tax.
    "Wie kann ich die Heizung per App steuern?",
  ])("leaves the near-miss %s alone", (text) => expect(germanRulesQuestion(text)).toBe(false));

  // English without a country (14 November, "English coverage"): users live in Germany, Austria
  // or Switzerland, so a frame with an official word or a counterparty is enough.
  it.each([
    "Can my boss make me work Sundays?",
    "How much is the TV licence?",
    "Do I have to pay church tax if I never go to church?",
    "What is the blood alcohol limit for driving?",
    "Am I allowed to sublet a room in my rented flat?",
    "How long do I have to return something I bought online?",
    "What happens if I miss the deadline to appeal a parking fine?",
    "How many hours can I legally work per week?",
    "Do I have to do the Anmeldung within 14 days?",
    "My employer hasn't paid me for two months, what are my rights?",
    "I am from India. Do I need a work permit?",
  ])("recognises the English question %s", (text) => expect(germanRulesQuestion(text)).toBe(true));

  it.each([
    // Another country's rule, a game, an organisation's own rule, writing help.
    "When is the US tax deadline this year?",
    "How much is the UK visa fee for a skilled worker?",
    "In Monopoly, do I have to pay rent if the owner is in jail?",
    "Am I allowed to use the office printer for private stuff at our company?",
    "Help me write a complaint to my health insurance about a rejected claim.",
    // A market price, a custom, a practical duty, the user's own figures.
    "How much does a one-bedroom flat cost to rent in Leipzig?",
    "Do I have to tip the delivery driver?",
    "How long do I have to wait before swimming after eating?",
    "If the fee is 3 % and I transfer 2,500 €, how much is the fee?",
    // A cost split on the user's own figures, although it says "mieten".
    "Drei Freunde mieten eine Ferienwohnung für 4 Nächte zu 135 € pro Nacht plus 60 € Reinigung. Wie viel zahlt jede Person?",
  ])("leaves the English near-miss %s alone", (text) => expect(germanRulesQuestion(text)).toBe(false));
});

describe("before sending", () => {
  it("offers the search with the rules heading even when the question is not time-sensitive", () => {
    const now = new Date("2026-11-13T00:00:00Z");
    expect(searchSuggestion(prompts["G-04"], now)).toMatchObject({ value: `${prompts["G-04"]} Deutschland`, rules: true });
    expect(searchSuggestion(prompts["T-04"], now)).toMatchObject({ rules: false });
    expect(searchSuggestion("Explain recursion", now)).toBeUndefined();
    // Ends with a full stop: the box goes on with "Search the web for:".
    expect(GERMAN_RULES_TEXT.en.heading).toBe("Rules, fees and deadlines change. Check the official source first.");
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
    const moons = newMessage("assistant", "Jupiter has 95 known moons, and the count rose over the last years.");
    other.messages.push(moons);
    expect(checkUncheckedFigures(other.messages, moons.id, moons.text, false)).toBeUndefined();
    // Stored on the device with the conversation, never model context.
    c.messages[1] = { ...answer, uncheckedFigures: true };
    expect(savedConversationSchema.parse(c).messages[1].uncheckedFigures).toBe(true);
    expect(JSON.stringify(composeContext(c, 10000))).not.toContain("uncheckedFigures");
  });
});

describe("answer-side check", () => {
  // Calibrated on the older stored answers (not the frozen 40-question set): it fired on all 32
  // unsearched graded confident errors, and on 3 of 441 unsearched non-rules answers.
  it.each([
    ["Die Kündigungsfrist für Mieter beträgt drei Monate (§ 573c BGB).", "Wie lange vorher muss ich kündigen?"],
    ["Wer innerorts 21 km/h zu schnell fährt, zahlt 115 € Bußgeld und bekommt einen Punkt.", "Was passiert, wenn ich 21 km/h zu schnell bin?"],
    ["Ein Führungszeugnis kostet 13 Euro Gebühr beim Bürgeramt.", "Was kostet ein Führungszeugnis?"],
    ["Sachgeschenke bis 50 € im Monat sind steuerfrei.", "Was darf mein Chef mir schenken?"],
    ["Der Arbeitgeber darf die Bescheinigung ab dem ersten Tag verlangen, spätestens aber nach 3 Tagen ist sie Pflicht.", "Ab wann brauche ich einen gelben Schein?"],
    ["You have 14 days to withdraw from an online purchase under the statutory right.", "Can I send back shoes I bought online?"],
    ["Cash of 10,000 EUR or more must be declared to customs (Zoll) when you enter.", "How much cash can I bring?"],
    ["Das kostet in der Regel ein Verwarnungsgeld.", "Ich habe falsch geparkt."],
  ])("warns on %s", (answer, question) => {
    expect(answerStatesRules(answer, question)).toBe(true);
    // Independent of the question detector.
    const c = ask(question);
    const reply = newMessage("assistant", answer);
    c.messages.push(reply);
    expect(checkUncheckedFigures(c.messages, reply.id, reply.text, false)).toBe(true);
    expect(checkUncheckedFigures(c.messages, reply.id, reply.text, true)).toBeUndefined();
  });

  it.each([
    // Arithmetic on the user's own amounts (VAT on their invoice).
    ["Netto 1.000 € plus 19 % Umsatzsteuer = 190 € Steuer, brutto 1.190 €.", "Rechne 19 % MwSt auf 1.000 €."],
    ["The total with tax is EUR 238.", "What is 200 EUR plus 19 % VAT?"],
    // Figures the user gave.
    ["Bei Ihren 3 Monaten Kündigungsfrist ist das Ihr Vertrag.", "Mein Vertrag hat 3 Monate Kündigungsfrist. Ist das normal?"],
    // Code blocks.
    ["Use this:\n```js\nconst fee = 115; // EUR fine, § 3 StVO\n```", "Write a function that returns a fee."],
    // Plain everyday, health, study and writing answers.
    ["Take ibuprofen for up to 3 days; see a doctor if the fever lasts longer.", "Can I take ibuprofen for a cold?"],
    ["The study plan has 7 days with 1.5 hours each.", "Make me a 7-day study plan."],
    ["hiermit kündige ich meinen Vertrag fristgerecht zum nächstmöglichen Termin.", "Schreib mir eine kurze Kündigung."],
    ["(c) Root cause [d5ef4c4c, §4]", "Summarise the document."],
    ["Jupiter has 95 known moons.", "How many moons does Jupiter have?"],
    // A law the user quoted, translated back.
    ["Notice must be given in writing (§ 568 BGB).", "Translate: Die Kündigung bedarf der Schriftform (§ 568 BGB)."],
  ])("stays quiet on %s", (answer, question) => expect(answerStatesRules(answer, question)).toBe(false));

  it("offers the search-again box for an unrecognised question when the answer stated rules", () => {
    const now = new Date("2026-11-13T00:00:00Z");
    // "Was darf mein Chef mir schenken?" is recognised since the German cues of 13 November.
    const question = "Was ist bei Geschenken vom Chef zu beachten?";
    expect(germanRulesQuestion(question)).toBe(false);
    expect(searchSuggestion(question, now)).toBeUndefined();
    expect(searchSuggestion(question, now, true)).toMatchObject({ value: `${question} Deutschland`, rules: true });
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

describe("official-source preference", () => {
  const now = new Date("2026-11-13T00:00:00Z");
  const web = (c: Conversation, urls: string[]) => {
    c.attachments.push({
      id: "w", name: "Public search results", selected: true, kind: "research",
      sources: urls.map((url, i) => ({ id: `w${i}`, title: "Synthetic", text: "Synthetic excerpt", url })),
    });
    return c;
  };
  const urls = ["https://www.berlin.de/a", "https://www.verbraucherzentrale.de/b", "https://www.blog.example/c"];

  it("ranks by tier, keeps order within each tier and drops nothing", () => {
    const s = ["https://x.example/1", "https://www.zoll.de/2", "https://test.de/3", "https://y.example/4", "https://www.bmj.de/5"].map((url) => ({ url }));
    expect(rankByTier(s).map((x) => x.url)).toEqual(["https://www.zoll.de/2", "https://www.bmj.de/5", "https://test.de/3", "https://x.example/1", "https://y.example/4"]);
    expect(rankByTier(s.slice(0, 1))).toEqual(s.slice(0, 1));
    expect(["https://service.berlin.de/x", "https://eur-lex.europa.eu/y", "https://www.bundesjustizamt.de/z"].map(sourceTier)).toEqual(["official", "official", "official"]);
    expect(["https://www.bundesgerichtshof.de/x", "https://www.vdk.de/y"].map(sourceTier)).toEqual(["public-interest", "public-interest"]);
    expect(["https://www.bmi.gv.at/x", "https://notberlin.de/y", "not a url"].map(sourceTier)).toEqual(["other", "other", "other"]);
  });

  it("labels each web source by type and adds the preference rule, for German-rules questions with web results only", () => {
    const rule = "Prefer official sources; if they disagree with other sources, follow the official one. If no source is official, say that no official source was found, that the figures may be wrong, and name the authority to check.";
    const [system, refs] = composeContext(web(ask(prompts["P-G4"]), urls), 10000, now);
    expect(system.content).toContain(rule);
    expect(JSON.parse(refs.content.slice(refs.content.indexOf("\n") + 1)).map((s: { text: string }) => s.text)).toEqual([
      "[official source] Synthetic excerpt", "[public-interest source] Synthetic excerpt", "[other source] Synthetic excerpt",
    ]);
    expect(system.content.length + prompts["P-G4"].length).toBeLessThan(8000);
    // Not for other questions, not without web results, not for the frozen variants.
    const otherQ = composeContext(web(ask("Wer ist Bundeskanzler?"), urls), 10000, now);
    expect(otherQ[0].content).not.toContain(rule);
    expect(otherQ[1].content).not.toContain("[official source]");
    expect(composeContext(ask(prompts["P-G4"]), 10000, now)[0].content).not.toContain(rule);
    const v1 = composeContext(web(ask(prompts["P-G4"]), urls), 10000, now, "constraints-v1");
    expect(v1[0].content).not.toContain(rule);
    expect(v1[1].content).not.toContain("[official source]");
  });

  it("flags the no-official note on the device only, for a German-rules question whose web results hold no official source", () => {
    const c = ask(prompts["G-04"]);
    const answer = newMessage("assistant", "Synthetic.");
    c.messages.push(answer);
    expect(checkNoOfficialSource(c.messages, answer.id, urls.slice(1))).toBe(true);
    expect(checkNoOfficialSource(c.messages, answer.id, urls)).toBeUndefined();
    expect(checkNoOfficialSource(c.messages, answer.id, [])).toBeUndefined();
    const other = ask("How many moons does Jupiter have?");
    other.messages.push(answer);
    expect(checkNoOfficialSource(other.messages, answer.id, urls.slice(1))).toBeUndefined();
    c.messages[1] = { ...answer, noOfficialSource: true };
    expect(savedConversationSchema.parse(c).messages[1].noOfficialSource).toBe(true);
    expect(JSON.stringify(composeContext(c, 10000))).not.toContain("noOfficialSource");
    expect(GERMAN_RULES_TEXT.en.noOfficial).toBe("No official source was found in the search results. Check the responsible authority before relying on these figures.");
  });
});

it("shows the user-facing texts in the interface language; the model instructions stay English", () => {
  try {
    vi.stubGlobal("navigator", { languages: ["de-DE"], language: "de-DE" });
    expect(GERMAN_RULES.warning).toBe(
      "Diese Antwort nennt Zahlen oder Fristen, die nicht anhand einer offiziellen Quelle geprüft wurden.",
    );
    expect(GERMAN_RULES.without).toBe("Ohne Prüfung antworten");
    expect(GERMAN_RULES.policy).toBe(GERMAN_RULES_TEXT.en.policy);
    expect(GERMAN_RULES.sourcedPolicy).toBe(GERMAN_RULES_TEXT.en.sourcedPolicy);
    vi.stubGlobal("navigator", { languages: ["en-US"], language: "en-US" });
    expect(GERMAN_RULES.without).toBe("Answer without checking");
    // The user's saved pick wins over the browser, as in src/i18n.tsx.
    vi.stubGlobal("localStorage", { getItem: (k: string) => (k === "cometrow.language" ? "de" : null) });
    expect(GERMAN_RULES.without).toBe("Ohne Prüfung antworten");
  } finally {
    vi.unstubAllGlobals();
  }
});

it("stays fast on a very long unbroken run of letters (it runs on every change of the draft)", () => {
  const started = performance.now();
  expect(germanRulesQuestion("a".repeat(19500))).toBe(false);
  expect(germanRulesQuestion("Wie hoch ist die Gebühr für einen neuen Personalausweis? " + "x".repeat(19000))).toBe(true);
  expect(performance.now() - started).toBeLessThan(500);
});
