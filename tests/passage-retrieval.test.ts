/**
 * Large documents: passage search on the device (src/passage-retrieval.ts) and what reaches the
 * request (src/conversation.ts). No model and no network: a synthetic 120-page German and English
 * document with five planted facts, and questions about them.
 */
import { expect, it } from "vitest";
import type { Attachment, Conversation, Source } from "../shared/contracts";
import {
  composeContext,
  measureContext,
  newMessage,
  passageNotes,
  selectedSources,
  withChosenPassages,
} from "../src/conversation";
import { createMaskingSession, maskAttachmentSources } from "../src/identifier-masking";
import {
  choosePassages,
  PASSAGE_BUDGET,
  PASSAGE_CHARACTERS,
  splitPassages,
  terms,
} from "../src/passage-retrieval";
import { savedConversationSchema } from "../src/saved-conversation";

// A fixed pseudo-random sequence, so the document is the same on every run.
let seed = 20261114;
const random = (n: number) => (seed = (seed * 1103515245 + 12345) % 2147483648) % n;
// The filler uses the words of the questions too (Frist, Vertrag, Konto, delivery, warranty,
// penalty ...), so a planted fact is not found by a single rare word.
const german =
  "Der Vermieter Die Mieterin Vertrag Frist Wohnung Nebenkosten Abrechnung Zahlung Konto Betrag Monat Jahr Verwaltung Schreiben Unterlagen Prüfung Anlage Heizung Wartung Schaden Versicherung Termin Zustimmung Änderung Regelung Absatz Vereinbarung Nachweis Übergabe Protokoll Zähler Verbrauch Kosten Rechnung gilt bleibt erhält prüft sendet bestätigt vereinbart regelt beschreibt nennt jeweils schriftlich rechtzeitig vollständig gemeinsam zusätzlich".split(
    " ",
  );
const english =
  "The supplier The customer contract delivery order warranty penalty payment invoice account amount month year service report inspection appendix heating maintenance damage insurance schedule approval change clause section agreement evidence handover record meter usage cost notice applies remains receives checks sends confirms agrees governs describes states each written timely complete jointly additional".split(
    " ",
  );
const sentence = (words: string[]) =>
  Array.from({ length: 8 + random(10) }, () => words[random(words.length)]).join(" ") + ".";
const planted: Record<number, string> = {
  17: "Die Kündigungsfrist für den Mietvertrag beträgt neun Monate zum Quartalsende.",
  42: "The penalty for late delivery is 2.5 percent of the order value per week, capped at 15 percent.",
  63: "Haustiere, insbesondere Hunde und Katzen, dürfen nur mit schriftlicher Erlaubnis gehalten werden.",
  88: "Die Kaution wird auf das Konto mit der IBAN DE89 3704 0044 0532 0130 00 überwiesen.",
  103: "The warranty period for the heat pump is seven years from commissioning.",
};
const pages = Array.from({ length: 120 }, (_, index) => {
  const words = index % 2 ? english : german;
  const lines = Array.from({ length: 26 }, () => sentence(words));
  if (planted[index + 1]) lines.splice(5 + random(15), 0, planted[index + 1]);
  // Paragraphs of four sentences, as a PDF page or a Word chapter would give them.
  return {
    page: index + 1,
    text: lines.map((line, i) => line + (i % 4 === 3 ? "\n\n" : " ")).join("").trim(),
  };
});
// The same steps as src/documents.ts for a large file: each page cut into passages.
const sources: Source[] = pages.flatMap((page) =>
  splitPassages(page.text).map((text, part) => ({
    id: `p${page.page}-${part}`,
    title: "Mietvertrag und Liefervertrag.pdf",
    page: page.page,
    text,
  })),
);
const book: Attachment = {
  id: "book",
  name: "Mietvertrag und Liefervertrag.pdf",
  selected: true,
  large: true,
  kind: "document",
  sources,
};
const ask = (...questions: string[]): Conversation => ({
  id: "c",
  title: "t",
  createdAt: new Date(0).toISOString(),
  messages: questions.map((question) => newMessage("user", question)),
  attachments: [book],
  usage: [],
});
const characters = (list: { text: string }[]) => list.reduce((n, s) => n + s.text.length, 0);
const questions: [string, number][] = [
  ["Wie lang ist die Kündigungsfrist beim Mietvertrag?", 17],
  // Typed without umlauts, and "Frist" has to find the compound "Kündigungsfrist".
  ["Welche Frist gilt fuer die Kuendigung?", 17],
  ["What is the penalty if the delivery is late?", 42],
  ["Darf ich einen Hund in der Wohnung halten?", 63],
  ["Auf welches Konto wird die Kaution überwiesen?", 88],
  ["How long is the warranty for the heat pump?", 103],
];

it("cuts text into passages of bounded size and drops nothing but white space", () => {
  const whole = pages.map((page) => page.text).join("\n\n");
  expect(whole.length).toBeGreaterThan(300000);
  const passages = splitPassages(whole);
  expect(Math.max(...passages.map((passage) => passage.length))).toBeLessThanOrEqual(
    PASSAGE_CHARACTERS,
  );
  expect(passages.join("").replace(/\s/g, "")).toBe(whole.replace(/\s/g, ""));
  // No white space to cut at, and an emoji across the limit: still nothing lost.
  const dense = "a".repeat(1199) + "😀" + "b".repeat(2000);
  expect(splitPassages(dense).join("")).toBe(dense);
  expect(splitPassages("  short \n")).toEqual(["short"]);
  expect(splitPassages("   ")).toEqual([]);
});

it("reads German and English words alike: umlauts, ß, endings and stop words", () => {
  expect(terms("Die Verträge der Mieterinnen")).toEqual(["vertrag", "mieterinn"]);
  expect(terms("Kündigung")).toEqual(terms("Kuendigung"));
  expect(terms("Straße")).toEqual(terms("STRASSE"));
  expect(terms("What is the penalty for the deliveries?")).toEqual(["penalty", "deliveri"]);
  expect(terms("§ 573 Abs. 2 BGB")).toEqual(["573", "abs", "2", "bgb"]);
});

it("finds the passage with each planted fact among 120 pages, in the top three and within the budget", () => {
  expect(sources.length).toBeGreaterThan(250);
  for (const [question, page] of questions) {
    const fact = sources.findIndex((source) => source.text.includes(planted[page]));
    expect(fact, question).toBeGreaterThanOrEqual(0);
    // Room for three passages only: the fact has to be one of the three best.
    expect(
      choosePassages(sources, question, "", 3 * PASSAGE_CHARACTERS).chosen,
      question,
    ).toContain(fact);

    const conversation = ask(question);
    const sent = selectedSources(conversation);
    expect(sent, question).toContain(sources[fact]);
    expect(characters(sent), question).toBeLessThanOrEqual(PASSAGE_BUDGET);
    expect(sent.length, question).toBeLessThan(sources.length / 10);
    // The request with the product instructions fits today's 32,000-character input limit.
    const request = composeContext(conversation, 32000);
    expect(request[1].content, question).toContain(planted[page].slice(0, 30));
    expect(JSON.parse(request[1].content.slice(request[1].content.indexOf("\n") + 1))).toHaveLength(
      sent.length,
    );
  }
});

it("masks identifiers in the chosen passages and sends nothing of the other passages", () => {
  const conversation = ask("Auf welches Konto wird die Kaution überwiesen?");
  const masking = createMaskingSession();
  const reduced = withChosenPassages(conversation);
  expect(reduced.attachments[0].sources).toEqual(selectedSources(conversation));
  const request = JSON.stringify(
    composeContext(maskAttachmentSources(reduced, masking), 32000),
  );
  expect(request).toContain("Die Kaution wird auf das Konto mit der IBAN {{IBAN-1}}");
  expect(request).not.toContain("DE89");
  expect(request).not.toContain("0532 0130");
  // The other planted facts are in passages that were not chosen: not in the request.
  for (const page of [17, 42, 63, 103])
    expect(request).not.toContain(planted[page].slice(0, 30));
  // The stored document is untouched: masking and reduction work on copies.
  expect(book.sources).toHaveLength(sources.length);
  expect(book.sources.some((source) => source.text.includes("DE89 3704"))).toBe(true);
});

it("says under the answer and in the review which passages are sent and that the rest is not", () => {
  const conversation = ask("How long is the warranty for the heat pump?");
  const used = selectedSources(conversation).length;
  const [note] = passageNotes(conversation, true, "en");
  expect(note).toMatch(
    new RegExp(
      `^This answer used ${used} of ${sources.length} passages from "Mietvertrag und Liefervertrag.pdf" \\(pages? [\\d, –]+\\), chosen on this device to match the question\\. The other ${sources.length - used} passages were not sent\\.$`,
    ),
  );
  expect(note).toMatch(/\bpages? [\d, –]*\b103\b/);
  expect(passageNotes(conversation, true, "de")[0]).toContain(
    `Diese Antwort nutzte ${used} von ${sources.length} Abschnitten aus „Mietvertrag und Liefervertrag.pdf“ (Seite`,
  );
  // The review before sending uses the draft as the question.
  const review = measureContext(ask(), "How long is the warranty for the heat pump?");
  expect(review.sourceCount).toBe(used);
  expect(review.passageNotes[0]).toContain(`For this question, ${used} of ${sources.length} passages`);
  expect(review.breakdown.references).toBeLessThan(PASSAGE_BUDGET * 1.2);
});

it("says so when no passage matches, and sends only the start of the document", () => {
  const conversation = ask("Qwrtz xyzzy?");
  const sent = selectedSources(conversation);
  expect(sent[0]).toBe(sources[0]);
  expect(sent).toEqual(sources.slice(0, sent.length));
  expect(characters(sent)).toBeLessThanOrEqual(PASSAGE_BUDGET);
  expect(passageNotes(conversation, true, "en")[0]).toMatch(
    /^No passage of ".*" contains the words of the question, so only the first \d+ of \d+ passages are sent \(pages 1–\d+\)\./,
  );
  expect(passageNotes(conversation, true, "de")[0]).toContain("enthält die Wörter der Frage");
});

it("keeps the topic of the question before in a short follow-up", () => {
  const fact = sources.find((source) => source.text.includes(planted[103]))!;
  expect(
    selectedSources(ask("How long is the warranty for the heat pump?", "And who pays for it?")),
  ).toContain(fact);
});

it("leaves an ordinary attachment exactly as before: every source is sent, no note", () => {
  const small: Attachment = { ...book, id: "small", large: undefined, sources: sources.slice(0, 5) };
  const conversation = { ...ask("How long is the warranty for the heat pump?"), attachments: [small] };
  expect(selectedSources(conversation)).toEqual(small.sources);
  expect(passageNotes(conversation, true)).toEqual([]);
  expect(withChosenPassages(conversation)).toBe(conversation);
  // A deselected large document sends nothing and needs no note.
  const off = { ...conversation, attachments: [{ ...book, selected: false }] };
  expect(selectedSources(off)).toEqual([]);
  expect(passageNotes(off, true)).toEqual([]);
});

it("shares the budget between two large documents and names each", () => {
  const second: Attachment = {
    ...book,
    id: "second",
    name: "Handbuch.docx",
    sources: splitPassages(pages.slice(0, 40).map((page) => page.text).join("\n\n")).map(
      (text, index) => ({ id: `d${index}`, title: "Handbuch.docx", text }),
    ),
  };
  const conversation = {
    ...ask("Wie lang ist die Kündigungsfrist beim Mietvertrag?"),
    attachments: [book, second],
  };
  expect(characters(selectedSources(conversation))).toBeLessThanOrEqual(PASSAGE_BUDGET);
  const notes = passageNotes(conversation, true, "en");
  expect(notes).toHaveLength(2);
  expect(notes[0]).toContain("pages");
  // A Word file has no page numbers: its passages are named by position.
  expect(notes[1]).toMatch(/from "Handbuch\.docx" \(passages? [\d, –]+\)/);
});

it("keeps the large-document mark and the note in a saved conversation", () => {
  const conversation = ask("How long is the warranty for the heat pump?");
  const answer = { ...newMessage("assistant", "Seven years."), passagesUsed: passageNotes(conversation, true, "en").join(" ") };
  const saved = savedConversationSchema.parse(
    JSON.parse(JSON.stringify({ ...conversation, messages: [...conversation.messages, answer] })),
  );
  expect(saved.attachments[0].large).toBe(true);
  expect(saved.messages[1].passagesUsed).toBe(answer.passagesUsed);
});

it("ranks a 500,000-character document quickly enough to do it while typing", () => {
  // Time in Node on the development machine; a phone is slower. Printed for docs/large-documents-20261114.md.
  const large = Array.from({ length: 4 }, () => sources)
    .flat()
    .slice(0, 420)
    .map((source) => ({ text: source.text }));
  let start = performance.now();
  choosePassages(large, "Wie lang ist die Kündigungsfrist beim Mietvertrag?");
  const first = performance.now() - start;
  start = performance.now();
  choosePassages(large, "What is the penalty if the delivery is late?");
  const next = performance.now() - start;
  console.log(
    `passage search over ${characters(large)} characters in ${large.length} passages: first question ${first.toFixed(0)} ms (counts the words), next question ${next.toFixed(1)} ms`,
  );
  expect(first).toBeLessThan(3000);
  expect(next).toBeLessThan(500);
});
