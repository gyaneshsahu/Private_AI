// "Copy conversation as text" (docs/chat-feature-gaps-20261114.md, package E): the text holds what
// the screen and the PDF export show, in both languages. Also the sidebar's date groups and the
// time on a message.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { Message } from "../shared/contracts";
import { dateGroup } from "../src/conversation-library";
import { conversationText, messageNotices } from "../src/conversation-text";
import { GERMAN_RULES } from "../src/german-rules";
import { LangProvider, type Lang } from "../src/i18n";
import { messageTime } from "../src/MessageMeta";
import { ExportView } from "../src/pdf-export";

const messages: Message[] = [
  { id: "q1", role: "user", text: "Was kostet das? Konto {{IBAN-1}}", status: "complete", included: true },
  {
    id: "a1",
    role: "assistant",
    status: "complete",
    included: true,
    answeredBy: "Auto · Thinking",
    uncheckedFigures: true,
    passagesUsed: "Passages 2 and 5 of report.pdf were sent.",
    keptOnDevice: "Kept on this device: 1 bank account.",
    text: "## Result\n\n| Item | Price |\n| --- | --- |\n| A | 3 |\n\n```js\nconst a = 1;\n```\n\nPaid from {{IBAN-1}} [src-000001].",
    sourceSnapshot: [
      { id: "src-000001", title: "Example page", text: "SOURCE BODY", url: "https://www.example.org/rules?id=7" },
      { id: "doc-000002", title: "report.pdf", text: "DOCUMENT BODY", page: 4 },
    ],
  },
  { id: "q2", role: "user", text: "And next year?", status: "complete", included: true },
  { id: "a2", role: "assistant", text: "Next year the", status: "partial", included: false, failure: "stopped", answeredBy: "Fast" },
];
const content = { title: "Fees 2026", createdAt: "2026-11-03T10:00:00.000Z", messages };
const now = new Date("2026-11-14T12:00:00.000Z");
const text = (lang: Lang) => conversationText(content, lang, now);

it("gives the whole conversation in order as Markdown, in English", () => {
  expect(text("en")).toBe(
    [
      "# Fees 2026",
      "Conversation from November 3, 2026",
      "## Question",
      "Was kostet das? Konto {{IBAN-1}}",
      "## Answer · Auto · Thinking",
      ...messageNotices(messages[1], "en").map((note) => `> ${note}`),
      "## Result\n\n| Item | Price |\n| --- | --- |\n| A | 3 |\n\n```js\nconst a = 1;\n```\n\nPaid from {{IBAN-1}} [src-000001].",
      "### Sources\n\n1. Example page: https://www.example.org/rules?id=7\n2. report.pdf, p. 4",
      "## Question",
      "And next year?",
      "## Answer · Fast",
      ...messageNotices(messages[3], "en").map((note) => `> ${note}`),
      "Next year the",
      "---",
      "Exported from CometRow on November 14, 2026. Answers can contain errors.",
    ].join("\n\n"),
  );
});

it("carries the app's notices and marks the incomplete attempt", () => {
  const english = text("en");
  expect(english).toContain(`> ${GERMAN_RULES.warning}`);
  expect(english).toContain("> Passages 2 and 5 of report.pdf were sent.");
  expect(english).toContain("> Kept on this device: 1 bank account.");
  expect(english).toContain("> This answer is incomplete.");
  expect(messageNotices(messages[3], "en").length).toBeGreaterThan(1);
});

it("keeps masked identifiers masked and leaves source bodies out", () => {
  expect(text("en").match(/\{\{IBAN-1\}\}/g)).toHaveLength(2);
  expect(text("en")).not.toMatch(/SOURCE BODY|DOCUMENT BODY/);
});

it("uses German headings and German dates", () => {
  const german = text("de");
  expect(german).toContain("Unterhaltung vom 3. November 2026");
  expect(german).toContain("## Frage\n\n");
  expect(german).toContain("## Antwort · Auto · Thinking");
  expect(german).toContain("### Quellen");
  expect(german).toContain("> Diese Antwort ist unvollständig.");
  expect(german).toContain("Am 14. November 2026 aus CometRow exportiert. Antworten können Fehler enthalten.");
});

it("says the same as the PDF view: every heading, notice and source line", () => {
  for (const lang of ["en", "de"] as const) {
    const html = renderToStaticMarkup(
      createElement(LangProvider, { initial: lang, children: createElement(ExportView, { ...content, now }) }),
    )
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&amp;/g, "&");
    const lines = text(lang)
      .split("\n")
      .filter((line) => /^(#{1,3} |> |\d+\. )/.test(line) && !line.startsWith("## Result"));
    expect(lines.length).toBeGreaterThan(12);
    for (const line of lines) expect(html).toContain(line.replace(/^(#{1,3} |> |\d+\. )/, ""));
  }
});

it("groups saved chats by day, with the week starting on Monday", () => {
  const saturday = new Date(2026, 10, 14, 15, 0); // Saturday 14 November 2026, local time
  const at = (day: number, hour = 12) => new Date(2026, 10, day, hour).toISOString();
  expect(dateGroup(at(14, 0), saturday)).toBe("today");
  expect(dateGroup(at(13, 23), saturday)).toBe("yesterday");
  expect(dateGroup(at(12), saturday)).toBe("week");
  expect(dateGroup(at(9, 0), saturday)).toBe("week"); // Monday
  expect(dateGroup(at(8, 23), saturday)).toBe("older"); // Sunday before
  expect(dateGroup("not a date", saturday)).toBe("older");
  // On a Monday nothing is "earlier this week".
  expect(dateGroup(at(7), new Date(2026, 10, 9, 10))).toBe("older");
});

it("shows the time for today and date with time otherwise, per language", () => {
  const today = new Date(2026, 10, 14, 18, 0);
  expect(messageTime(new Date(2026, 10, 14, 9, 5).toISOString(), "de", today)).toBe("09:05");
  expect(messageTime(new Date(2026, 10, 14, 9, 5).toISOString(), "en", today)).toMatch(/^9:05\sAM$/);
  expect(messageTime(new Date(2026, 10, 3, 14, 30).toISOString(), "de", today)).toBe("03.11.2026, 14:30");
  expect(messageTime(new Date(2026, 10, 3, 14, 30).toISOString(), "en", today)).toMatch(/^Nov 3, 2026, 2:30\sPM$/);
  expect(messageTime("not a date", "en", today)).toBe("");
});
