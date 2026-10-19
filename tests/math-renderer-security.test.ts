import { it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Answer } from "../src/Answer";

it("keeps fenced code literal and copy unavailable until completion", () => {
  const text =
    "```js\nwindow.CANARY = '<script>run()</script>';\n```\n\nInline `code`";
  const render = (complete: boolean) =>
    renderToStaticMarkup(
      createElement(Answer, { text, complete, sources: [], open: () => {} }),
    );
  const partial = render(false);
  expect(partial).toContain('disabled=""');
  expect(partial).toContain('tabindex="0"');
  expect(partial).toContain('aria-label="js code block"');
  expect(partial).toContain("&lt;script&gt;");
  expect(partial).not.toContain("<script>");
  expect(render(true)).not.toContain('disabled=""');
  expect(render(true).match(/Copy code/g)).toHaveLength(1);
});

it("ignores inherited trust settings even when another component has polluted Object.prototype", () => {
  // Isolate the intentionally polluted global prototype from the test runner.
  const result = execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      String.raw`
    import katex from 'katex';
    Object.prototype.trust = true;
    try {
      const inputs = ['\\href{javascript:alert(1)}{click}', '\\includegraphics{https://invalid.example/pixel}'];
      const html = inputs.map(value => katex.renderToString(value, {throwOnError:false})).join('');
      process.stdout.write(JSON.stringify({active: /<(?:a|img)\b/.test(html), rendered: html.includes('katex')}));
    } finally { delete Object.prototype.trust; }
  `,
    ],
    { encoding: "utf8", timeout: 5000 },
  );
  expect(JSON.parse(result)).toEqual({ active: false, rendered: true });
});

it("renders representative reasoning notation through the actual Markdown adapter and bounds recursive macros", () => {
  const render = (text: string) =>
    renderToStaticMarkup(
      createElement(Answer, { text, sources: [], open: () => {} }),
    );
  const html = render(String.raw`$$\frac{3}{4} + \sqrt{16} = 4.75$$

$$\begin{pmatrix}1&2\\3&4\end{pmatrix}$$

$$2.5\,\mathrm{kW}\times4\,\mathrm{h}=10\,\mathrm{kWh}$$`);
  expect(html).toContain("katex");
  expect(html).not.toContain("katex-error");
  expect(render(String.raw`$$\def\loop{\loop}\loop$$`)).toContain(
    "katex-error",
  );
  expect(
    render(String.raw`$$\href{https://invalid.example}{link}$$

$$\includegraphics{https://invalid.example/pixel}$$`),
  ).not.toMatch(/<(?:a|img|iframe)\b/);
});
