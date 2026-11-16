// Renders the design mock in the candidate palettes (light and dark) into .local/ui-redesign/step-1e/.
//   node evaluation/ui-redesign/render.mjs      (from the repository root)
import { chromium } from "@playwright/test";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const P = JSON.parse(readFileSync(new URL("./palettes.json", import.meta.url)));
const out = resolve(".local/ui-redesign/step-1e");
mkdirSync(out, { recursive: true });

// WCAG contrast, so the choice is not made by eye.
const lum = (h) =>
  [1, 3, 5]
    .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (a, b) => ((x, y) => (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05))(lum(a), lum(b));
const pairs = [
  ["ink", "bg", 4.5], ["ink2", "bg", 4.5], ["ink3", "bg", 4.5], ["ink", "sidebar", 4.5], ["ink2", "sidebar", 4.5], ["ink3", "sidebar", 4.5],
  ["ink3", "surface", 4.5], ["ink2", "hover", 4.5], ["ink", "hover", 4.5], ["accent", "bg", 4.5], ["accent", "code", 4.5],
  ["primaryInk", "primary", 4.5], ["ink", "bubble", 4.5], ["ink3", "code", 4.5], ["primary", "surface", 3], ["danger", "bg", 4.5],
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
const desk = ["empty", "answer", "menu", "settings", "login", "voice"];
const phone = ["empty", "answer", "sheet", "drawer", "login", "voice"];
const shots = [...desk.map((s) => [s, "desk", 1280, 800]), ...phone.map((s) => [s, "phone", 375, 760])];
for (const id of Object.keys(P))
  for (const theme of ["light", "dark"]) {
    for (const [screen, device, width, height] of shots) {
      const page = await browser.newPage({ viewport: { width, height: screen === "answer" && device === "desk" ? 980 : height }, deviceScaleFactor: 2 });
      await page.addInitScript((p) => {
        window.P = p;
      }, P);
      await page.goto(`${url}?p=${id}&theme=${theme}&screen=${screen}&still=1`);
      await page.screenshot({ path: `${out}/${id}-${theme}-${device}-${screen}.png` });
      await page.close();
    }
    // One sheet per option and theme.
    const p = P[id];
    const img = (device, screen, w) => `<figure style="margin:0"><img src="${id}-${theme}-${device}-${screen}.png" style="width:${w}px;display:block;border:1px solid #8885;border-radius:10px"><figcaption style="font:13px system-ui;color:#333;margin-top:4px">${device === "desk" ? "desktop" : "phone"}: ${screen}</figcaption></figure>`;
    const html = `<body style="margin:0;padding:28px;background:#d6d6da;font:16px system-ui"><h1 style="font:600 28px system-ui;margin:0 0 4px">${p.name} (${theme})</h1><p style="margin:0 0 18px;color:#333;max-width:1200px">${p.note} A mock of the direction, not the finished app.</p><div style="display:grid;grid-template-columns:repeat(3,620px);gap:18px;margin-bottom:22px">${desk.map((s) => img("desk", s, 620)).join("")}</div><div style="display:flex;gap:18px">${phone.map((s) => img("phone", s, 300)).join("")}</div></body>`;
    const sheet = `${out}/sheet-${id}-${theme}.html`;
    writeFileSync(sheet, html);
    const page = await browser.newPage({ viewport: { width: 1960, height: 100 } });
    await page.goto(pathToFileURL(sheet).href);
    await page.screenshot({ path: `${out}/option-${id}-${theme}.png`, fullPage: true });
    await page.close();
  }
await browser.close();
console.log("written", out);
