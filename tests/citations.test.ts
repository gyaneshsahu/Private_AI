import { it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Answer } from "../src/Answer";

it("links both observed citation formats only to supplied sources; preserves unknown references as text", () => {
  const html = renderToStaticMarkup(
    createElement(Answer, {
      text: "Total 114 [7283fc55]. Corrected 108 【7283fc55】. Unknown 【deadbeef】. <img src=https://example.com/leak>",
      sources: [
        { id: "7283fc55", title: "invoice.txt", text: "Synthetic only" },
      ],
      open: () => {},
    }),
  );
  expect(html.match(/<button/g)).toHaveLength(2);
  expect(html).toContain("【deadbeef】");
  expect(html).not.toContain("<img");
  expect(html).not.toContain("<a");
  expect(html).toContain("&lt;img");
});
import { displayMath } from "../src/answer-format";

it("renders readable tables, lists, code and local display math", () => {
  const text =
    "# Result\n\n**Total**\n\n| Item | EUR |\n| --- | --- |\n| Net | 95 |\n\n- VAT is 19\n\n```js\nconst total = 114;\n```\n\n\\[\n95 + 19 = 114\n\\]";
  const html = renderToStaticMarkup(
    createElement(Answer, { text, sources: [], open: () => {} }),
  );
  expect(html).toContain("<table>");
  expect(html).toContain("<strong>Total</strong>");
  expect(html).toContain("<li>VAT is 19</li>");
  expect(html).toContain('aria-label="js code block"');
  expect(html).toContain('<code class="language-js">const total = 114;');
  expect(html).toContain("katex");
  expect(html).not.toContain("katex-error");
});

it("does not activate model links, images, raw HTML or trusted math commands", () => {
  const text =
    "[tracking](https://example.com/private) ![pixel](https://example.com/pixel)\n\n<script>alert(1)</script>\n\n$$\\href{https://example.com/leak}{click}$$\n\n$$\\includegraphics{https://example.com/pixel}$$";
  const html = renderToStaticMarkup(
    createElement(Answer, { text, sources: [], open: () => {} }),
  );
  expect(html).not.toMatch(/<(?:img|script|iframe|a|link)\b/);
  expect(html).not.toContain("src=");
  expect(html).toContain("Image omitted");
});

it("preserves currency, unknown sources and fenced math/code literally", () => {
  const text =
    "Budget $5 then $10. Unknown [deadbeef].\n\n```text\n\\[\n[7283fc55]\n\\]\n```";
  expect(displayMath(text)).toBe(text);
  const html = renderToStaticMarkup(
    createElement(Answer, {
      text,
      sources: [{ id: "7283fc55", title: "fixture", text: "test" }],
      open: () => {},
    }),
  );
  expect(html).toContain("Budget $5 then $10");
  expect(html).toContain("[deadbeef]");
  expect(html).not.toContain('class="citation"');
  expect(html).toContain("[7283fc55]");
});

it("opens page-qualified citations without treating a model's page claim as verified source metadata", () => {
  const html = renderToStaticMarkup(
    createElement(Answer, {
      text: "Invoice 72 EUR [documents-04, page 1]. Also 【documents-04, p. 2】. Unknown [missing-01, page 1]. `Code [documents-04, page 1]`.",
      sources: [
        {
          id: "documents-04",
          title: "invoice.txt",
          page: 2,
          text: "Synthetic source",
        },
      ],
      open: () => {},
    }),
  );
  expect(html.match(/<button/g)).toHaveLength(2);
  expect(html).toContain("invoice.txt · p2 · cited p1");
  // A code that names no source is dropped (the evidence notice still counts it).
  expect(html).not.toContain("missing-01");
  expect(html).toContain("<code>Code [documents-04, page 1]</code>");
  expect(html).not.toContain("href=");
});

it("resolves known source IDs but labels unsupported model line locators", () => {
  const html = renderToStaticMarkup(
    createElement(Answer, {
      text: "Claim 【report-01†L2-L4】. Another 【report-01†source】. Unknown 【missing-01†L1-L2】.",
      sources: [
        {
          id: "report-01",
          title: "Synthetic report",
          text: "No numbered lines were supplied.",
        },
      ],
      open: () => {},
    }),
  );
  expect(html.match(/<button/g)).toHaveLength(2);
  expect(html).toContain("line reference unverified");
  expect(html).not.toContain("missing-01");
  expect(html).not.toContain("href=");
});

// Blind benchmark, 12 November (Thinking L4-01): a ten-character code that matched none
// of the twelve-character source ids stayed as raw text, and page titles cluttered lines.
it("links every code that names a source, drops codes that name none, and labels web sources by site", async () => {
  const { auditResearchAnswer } = await import("../src/research-audit");
  const sources = [
    {
      id: "2c0b433bea01",
      title: "BahnCard 25 1. und 2. Klasse – hier kaufen!",
      text: "Synthetic",
      url: "https://www.bahn.de/angebot/bahncard",
    },
    {
      id: "9f8e7d6c5b4a",
      title: "Synthetic third-party guide",
      text: "Synthetic",
      url: "https://guide.example.com/a",
    },
  ];
  const text =
    "Price 62.90 EUR [2C0B433BEA01]. Digital use [2c0b433bea]. Both [2c0b433bea01, 9f8e7d6c5b4a]. Also [2c0b433bea01; 9f8e7d6c5b4a]. Dear [recipient]. See [Guide – title](https://guide.example.com/a).";
  const html = renderToStaticMarkup(
    createElement(Answer, { text, sources, open: () => {} }),
  );
  expect(html.toLowerCase()).not.toContain("2c0b433bea");
  expect(html.match(/<button class="citation"/g)).toHaveLength(5);
  expect(html).toContain('title="BahnCard 25 1. und 2. Klasse – hier kaufen!"');
  expect(html).toContain(">bahn.de</button>");
  expect(html).toContain(">guide.example.com</button>");
  expect(html).not.toContain(">BahnCard 25 1. und 2. Klasse");
  expect(html).toContain("[recipient]");
  // The evidence notice counts the dropped code (and the placeholder), not the Markdown link label.
  expect(auditResearchAnswer(text, sources).unknownSourceReferences).toBe(2);
});

it("live deep research shape (14 November): a note after the code keeps the button and stays visible; copied text numbers the codes", async () => {
  const { answerCopyText } = await import("../src/conversation-text");
  const { auditResearchAnswer } = await import("../src/research-audit");
  const { newMessage } = await import("../src/conversation");
  const sources = [
    { id: "2aee4cd21a78", title: "§ 573c BGB", text: "Synthetic", url: "https://www.gesetze-im-internet.de/bgb/__573c.html" },
    { id: "b2dfe082cee1", title: "Synthetic guide", text: "Synthetic", url: "https://guide.example/kuendigung" },
  ];
  const text =
    "## Mieter\n\nDrei Monate [2aee4cd21a78 (§ 573c Abs. 1 BGB)]. Kein Grund nötig [b2dfe082cee1]. Seite [b2dfe082cee1, p. 3]. Zwei [2aee4cd21a78 (Abs. 2), b2dfe082cee1]. Erfunden [0dffd17f5269 (§ 573a BGB)].";
  const html = renderToStaticMarkup(createElement(Answer, { text, sources, open: () => {} }));
  // Five buttons: the invented code is not one, and no code is shown raw.
  expect(html.match(/<button class="citation"/g)).toHaveLength(5);
  expect(html).not.toMatch(/\[(?:2aee4cd21a78|b2dfe082cee1|0dffd17f5269)/);
  expect(html).toContain("gesetze-im-internet.de</button> (§ 573c Abs. 1 BGB)");
  expect(html).toContain("</button> (Abs. 2)");
  // The unknown code is dropped and flagged by the evidence notice; its note stays as text.
  expect(html).toContain(" (§ 573a BGB)");
  expect(auditResearchAnswer(text, sources).unknownSourceReferences).toBe(1);
  // Copy answer: numbers of the source list, notes kept, the unknown code left as written, then the list.
  const copied = answerCopyText({ ...newMessage("assistant", text), sourceSnapshot: sources }, "en");
  expect(copied).toContain("Drei Monate [1 (§ 573c Abs. 1 BGB)]. Kein Grund nötig [2]. Seite [2, p. 3]. Zwei [1 (Abs. 2), 2].");
  expect(copied).toContain("[0dffd17f5269 (§ 573a BGB)]");
  expect(copied).toContain("1. § 573c BGB: https://www.gesetze-im-internet.de/bgb/__573c.html\n2. Synthetic guide: https://guide.example/kuendigung");
});
