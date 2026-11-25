// The home-screen app (docs/pwa-20261125.md): what a phone needs to install CometRow with its icon,
// open it in its own window and show a start screen. Checked on the files themselves: the web
// manifest, every icon it names (real size read from the file), the page's tags for iPhones, and
// the start screen in the page. Plus the switch for the Settings row.
import { existsSync, readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { installAppEnabled } from "../src/device-features";
import { installText } from "../src/text/install";

const manifest = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8")) as {
  id: string;
  name: string;
  short_name: string;
  start_url: string;
  scope: string;
  display: string;
  background_color: string;
  theme_color: string;
  icons: { src: string; sizes: string; type: string; purpose: string }[];
};
const page = readFileSync("index.html", "utf8");
/** Width and height from a PNG's own header. */
const pngSize = (file: string) => {
  const bytes = readFileSync(file);
  expect(bytes.subarray(1, 4).toString(), file).toBe("PNG");
  return `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`;
};

it("the manifest has what Android needs to install: a name, a start address, its own window, and icons of 192 and 512", () => {
  expect(manifest).toMatchObject({ id: "/", name: "CometRow", short_name: "CometRow", start_url: "/", scope: "/", display: "standalone" });
  // The start screen Android builds: this colour, the icon and the name.
  expect(manifest.background_color).toMatch(/^#[0-9a-f]{6}$/);
  expect(manifest.theme_color).toMatch(/^#[0-9a-f]{6}$/);
  const sizes = manifest.icons.filter((icon) => icon.purpose === "any").map((icon) => icon.sizes);
  expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
  // One icon that survives being cut to a circle or a rounded square.
  expect(manifest.icons.some((icon) => icon.purpose === "maskable" && icon.sizes === "512x512")).toBe(true);
  for (const icon of manifest.icons) {
    expect(icon.src.startsWith("/"), icon.src).toBe(true); // our own file, never another host
    expect(icon.type).toBe("image/png");
    expect(pngSize(`public${icon.src}`), icon.src).toBe(icon.sizes);
  }
});

it("the page has what an iPhone needs: the manifest, its own window, a name and a 180 pixel icon", () => {
  expect(page).toContain('<link rel="manifest" href="/manifest.webmanifest" />');
  expect(page).toContain('<meta name="apple-mobile-web-app-capable" content="yes" />');
  expect(page).toContain('<meta name="mobile-web-app-capable" content="yes" />');
  expect(page).toContain('<meta name="apple-mobile-web-app-title" content="CometRow" />');
  const touch = /<link rel="apple-touch-icon" href="([^"]+)" \/>/.exec(page)?.[1];
  expect(touch).toBeDefined();
  expect(pngSize(`public${touch}`)).toBe("180x180");
  // The bar colour follows the theme.
  expect(page.match(/<meta name="theme-color"/g)).toHaveLength(2);
});

it("the start screen is in the page itself: the mark on the page colour, from our own files, for light and dark", () => {
  const boot = /<div id="root">([\s\S]*?)<\/div>\s*<\/div>/.exec(page)?.[1] ?? "";
  expect(boot).toContain('class="boot"');
  const pictures = [...boot.matchAll(/src="([^"]+)"/g)].map((m) => m[1]);
  expect(pictures).toHaveLength(2);
  for (const src of pictures) {
    expect(src.startsWith("/logo/"), src).toBe(true);
    expect(existsSync(`public${src}`), src).toBe(true);
  }
  // Its colours are the manifest's and the dark theme's, so nothing flashes between start screen and app.
  expect(page).toContain(`.boot{position:fixed;inset:0;display:grid;place-items:center;background:${manifest.background_color}}`);
  expect(page).toMatch(/prefers-color-scheme:dark\)\{\.boot\{background:#1b1b1e\}/);
  // No script in the start screen: the content policy allows none inline.
  expect(boot).not.toMatch(/<script/);
});

it("the Settings row is off unless the build switches it on, and its texts exist in both languages", () => {
  expect(installAppEnabled()).toBe(false);
  for (const [key, english] of Object.entries(installText.en)) expect(installText.de[key as keyof typeof installText.de], key).not.toBe(english);
});
