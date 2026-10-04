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
