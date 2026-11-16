// Renders the design mock in the three candidate palettes (light and dark) into .local/ui-redesign/step-1/.
//   node evaluation/ui-redesign/render.mjs      (from the repository root)
import { chromium } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const P = JSON.parse(readFileSync(new URL("./palettes.json", import.meta.url)));
const out = resolve(".local/ui-redesign/step-1");
mkdirSync(out, { recursive: true });

// WCAG contrast, so the choice is not made by eye.
const lum = (h) =>
  [1, 3, 5]
    .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (a, b) => ((x, y) => (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05))(lum(a), lum(b));
const pairs = [
  ["ink", "bg", 4.5], ["ink2", "bg", 4.5], ["ink3", "bg", 4.5], ["ink2", "sidebar", 4.5], ["ink3", "sidebar", 4.5],
  ["ink3", "surface", 4.5], ["accent", "bg", 4.5], ["accent", "code", 4.5], ["primaryInk", "primary", 4.5],
  ["ink", "bubble", 4.5], ["primary", "surface", 3],
];
let bad = 0;
for (const [id, p] of Object.entries(P))
  for (const theme of ["light", "dark"])
    for (const [a, b, min] of pairs) {
      const r = ratio(p[theme][a], p[theme][b]);
      if (r < min) {
        bad++;
        console.log(`LOW ${id} ${theme} ${a} on ${b}: ${r.toFixed(2)} (needs ${min})`);
      }
    }
console.log(bad ? `${bad} contrast pairs too low` : "contrast: all pairs pass");

const browser = await chromium.launch();
const url = pathToFileURL(resolve("evaluation/ui-redesign/mock.html")).href;
const screens = { empty: [1280, 800], answer: [1280, 1000], phone: [375, 760] };
for (const id of Object.keys(P))
  for (const theme of ["light", "dark"])
    for (const [screen, [width, height]] of Object.entries(screens)) {
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
      await page.addInitScript((p) => {
        window.P = p;
      }, P);
      await page.goto(`${url}?p=${id}&theme=${theme}&screen=${screen}`);
      await page.screenshot({ path: `${out}/${id}-${theme}-${screen}.png` });
      await page.close();
    }
// One sheet per option: the six pictures side by side.
for (const [id, p] of Object.entries(P)) {
  const page = await browser.newPage({ viewport: { width: 1850, height: 100 } });
  const img = (theme, screen, w) => `<img src="${id}-${theme}-${screen}.png" style="width:${w}px;border:1px solid #8884;border-radius:10px">`;
  const html = `<body style="margin:0;padding:28px;background:#d9d9de;font:16px system-ui"><h1 style="font:600 28px system-ui;margin:0 0 4px">${p.name}</h1><p style="margin:0 0 18px;color:#333">${p.note} This is a mock of the direction, not the finished app.</p>${["light", "dark"].map((t) => `<div style="display:flex;gap:16px;align-items:flex-start;margin-bottom:16px">${img(t, "empty", 720)}${img(t, "answer", 720)}${img(t, "phone", 300)}</div>`).join("")}</body>`;
  const sheet = `${out}/sheet-${id}.html`;
  (await import("node:fs")).writeFileSync(sheet, html);
  await page.goto(pathToFileURL(sheet).href);
  await page.screenshot({ path: `${out}/option-${id}.png`, fullPage: true });
  await page.close();
}
await browser.close();
console.log("written", out);
