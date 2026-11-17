// Makes the two brand images the logo kit (public/logo, the owner's official kit) does not contain,
// by placing the kit's own SVGs; the mark is never redrawn or recoloured:
//   public/brand/icon-maskable-512.png  PWA maskable icon: full-bleed #0B0B0C, the light icon inside the 80 % safe zone
//   public/brand/og-image.png           1200x630 social preview: the gradient lockup on a dark background (hero use)
// Run: node scripts/brand-assets.mjs   (headless Chromium from @playwright/test)
import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const kit = (file) => readFileSync(resolve("public/logo/svg", file), "utf8");
const svgData = (file) => `data:image/svg+xml;base64,${Buffer.from(kit(file)).toString("base64")}`;
mkdirSync("public/brand", { recursive: true });

const browser = await chromium.launch();
async function shoot(path, width, height, body) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.setContent(`<!doctype html><html><body style="margin:0;width:${width}px;height:${height}px;overflow:hidden">${body}</body></html>`);
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path, omitBackground: false });
  await page.close();
}
// Maskable: the safe zone is the centre circle of 80 % diameter; the mark takes 52 % of the width.
await shoot(
  "public/brand/icon-maskable-512.png",
  512,
  512,
  `<div style="width:512px;height:512px;background:#0B0B0C;display:grid;place-items:center"><img src="${svgData("cometrow-A-icon-light.svg")}" style="width:266px;height:266px"></div>`,
);
// Social preview: the gradient lockup (hero use, on dark only), centred.
await shoot(
  "public/brand/og-image.png",
  1200,
  630,
  `<div style="width:1200px;height:630px;background:radial-gradient(60% 70% at 50% 55%, #16203a 0%, #0B0B0C 70%);display:grid;place-items:center"><img src="${svgData("cometrow-A-lockup-horizontal-gradient.svg")}" style="width:760px;height:auto"></div>`,
);
await browser.close();
console.log("written public/brand/icon-maskable-512.png and public/brand/og-image.png");
