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
  expect(html).toContain("<pre>");
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
  expect(html).not.toContain("<button");
});
