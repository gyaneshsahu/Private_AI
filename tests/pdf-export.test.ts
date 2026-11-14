// PDF export (docs/read-aloud-and-pdf-export-20261114.md): the export view's markup in both
// languages, the switch, and the print stylesheet's rules. The printed layout itself is checked
// in a real browser in tests/device-features-ui.test.ts.
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import type { Conversation, Message } from "../shared/contracts";
import { LangProvider, type Lang } from "../src/i18n";
import { ExportView } from "../src/pdf-export";
import { PdfExportButton } from "../src/PdfExportButton";

afterEach(() => vi.unstubAllEnvs());

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
    text: "## Result\n\n| Item | Price |\n| --- | --- |\n| A | 3 |\n\n```js\nconst a = 1;\n```\n\n$$x^2$$\n\nSee [the page](https://example.org/page) [src-000001].",
    sourceSnapshot: [
      { id: "src-000001", title: "Example page", text: "SOURCE BODY", url: "https://www.example.org/rules?id=7" },
      { id: "doc-000002", title: "report.pdf", text: "DOCUMENT BODY", page: 4 },
    ],
  },
];
const view = (lang: Lang) =>
  renderToStaticMarkup(
    createElement(LangProvider, {
      initial: lang,
      children: createElement(ExportView, {
        title: "Fees 2026",
        createdAt: "2026-11-03T10:00:00.000Z",
        messages,
        now: new Date("2026-11-14T12:00:00.000Z"),
      }),
    }),
  );

it("renders the header, each message with its mode and notices, sources and the footer", () => {
  const html = view("en");
  expect(html).toContain('<p class="print-brand">CometRow</p><h1>Fees 2026</h1><p>Conversation from November 3, 2026</p>');
  expect(html).toContain("<h2>Question</h2>");
  expect(html).toContain("<h2>Answer · Auto · Thinking</h2>");
  expect(html).toContain('class="print-notice">Passages 2 and 5 of report.pdf were sent.');
  expect(html.match(/class="print-notice"/g)).toHaveLength(2);
  expect(html).toContain("<table>");
  expect(html).toContain("const a = 1;");
  expect(html).toContain('class="katex"');
  // Links are spelled out, in the text and in the source list.
  expect(html).toContain("the page (https://example.org/page)");
  expect(html).toContain("<li>Example page: https://www.example.org/rules?id=7</li>");
  expect(html).toContain("<li>report.pdf, p. 4</li>");
  expect(html).toContain("<footer>Exported from CometRow on November 14, 2026. Answers can contain errors.</footer>");
});

it("uses German headings and German dates", () => {
  const html = view("de");
  expect(html).toContain('lang="de"');
  expect(html).toContain("Unterhaltung vom 3. November 2026");
  expect(html).toContain("<h2>Frage</h2>");
  expect(html).toContain("<h2>Antwort · Auto · Thinking</h2>");
  expect(html).toContain("<h3>Quellen</h3>");
  expect(html).toContain("<footer>Am 14. November 2026 aus CometRow exportiert. Antworten können Fehler enthalten.</footer>");
});

it("adds nothing the screen does not show: masked text stays masked, source bodies stay out", () => {
  const html = view("en");
  expect(html).toContain("{{IBAN-1}}");
  expect(html).not.toMatch(/SOURCE BODY|DOCUMENT BODY/);
});

it("shows no button while the switch is off, and one when it is on", () => {
  const conversation = { title: "Fees 2026", createdAt: "2026-11-03T10:00:00.000Z", messages } as Conversation;
  const button = () =>
    renderToStaticMarkup(createElement(PdfExportButton, { conversation, answer: 1, disabled: false }));
  expect(button()).toBe("");
  vi.stubEnv("VITE_PDF_EXPORT", "1");
  expect(button()).toBe("<button>Export as PDF</button>");
});

it("has print rules that hide the app, keep blocks whole and ignore dark mode", () => {
  const css = readFileSync("src/print.css", "utf8").replace(/\s+/g, " ");
  // On screen the view is hidden; on paper everything else is.
  expect(css).toMatch(/^.*?\.print-root \{ display: none; \} @page \{ margin: 18mm 16mm; \} @media print \{/);
  expect(css).toContain("html.exporting-pdf body > :not(.print-root) { display: none !important; }");
  expect(css).toContain(".print-root button { display: none !important; }");
  expect(css).toContain("color: #000 !important; background: transparent !important;");
  expect(css).toContain(".print-root :is(pre, table, .katex-display, li) { break-inside: avoid; }");
  expect(css).toMatch(/:is\(h1, h2, h3, h4, h5, h6\) \{ break-after: avoid;/);
  expect(css).toMatch(/\.print-root pre \{[^}]*white-space: pre-wrap; overflow-wrap: anywhere;/);
  expect(css).toMatch(/\.print-root :is\(th, td\) \{[^}]*overflow-wrap: anywhere;/);
});
