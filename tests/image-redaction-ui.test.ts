// Picture questions in a real browser (docs/images-20261114.md), with real pixels: metadata is
// gone after the re-encode, black boxes are part of the picture that is sent, and the cover-up
// tool works with a pointer and with the keyboard at phone and desktop width. Offline: its own
// Vite server on a random port, synthetic pictures only, nothing is sent anywhere.
import { afterAll, beforeAll, expect, it } from "vitest";
import { chromium, expect as ui, type Browser, type Page } from "@playwright/test";
import { createServer, type ViteDevServer } from "vite";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { listImageMetadata } from "../src/photo-capture";
import { imageText } from "../src/text/images";

let vite: ViteDevServer;
let browser: Browser;
let origin = "";
const phone = { width: 390, height: 844 };
const desktop = { width: 1280, height: 900 };
const en = imageText.en;

beforeAll(async () => {
  vite = await createServer({
    logLevel: "silent",
    cacheDir: "node_modules/.vite-image-redaction-ui-test",
    server: { host: "127.0.0.1", port: 0, hmr: false },
  });
  await vite.listen();
  await vite.warmupRequest("/tests/fixtures/image-question-entry.tsx");
  await vite.waitForRequestsIdle();
  const address = vite.httpServer!.address();
  if (!address || typeof address === "string") throw Error("No local port");
  origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch(browserLaunchOptions());
}, 90_000);

afterAll(async () => {
  await browser?.close();
  await vite?.close();
});

// Fake OCR output for the fixture's synthetic letter (1200 x 900): no OCR data is downloaded.
const FAKE_OCR = `self.onmessage = () => { self.postMessage({ percent: 50 }); self.postMessage({ words: [
  { text: "Synthetic", line: 1, x0: 60, y0: 270, x1: 210, y1: 306 },
  { text: "letter:", line: 1, x0: 222, y0: 270, x1: 320, y1: 306 },
  { text: "erika.mustermann@example.org", line: 1, x0: 332, y0: 270, x1: 830, y1: 306 },
  { text: "IBAN", line: 2, x0: 60, y0: 350, x1: 150, y1: 386 },
  { text: "DE89", line: 2, x0: 162, y0: 350, x1: 250, y1: 386 },
  { text: "3704", line: 2, x0: 262, y0: 350, x1: 340, y1: 386 },
  { text: "0044", line: 2, x0: 352, y0: 350, x1: 430, y1: 386 },
  { text: "0532", line: 2, x0: 442, y0: 350, x1: 520, y1: 386 },
  { text: "0130", line: 2, x0: 532, y0: 350, x1: 610, y1: 386 },
  { text: "00", line: 2, x0: 622, y0: 350, x1: 660, y1: 386 },
] }); };`;

async function open(query: string, viewport = desktop, locale = "en-GB") {
  const context = await browser.newContext({ locale, viewport, hasTouch: viewport === phone });
  context.setDefaultTimeout(15_000);
  const page = await context.newPage();
  const requests: string[] = [];
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    // Nothing may leave for another host, and the tool calls no API.
    if (url.origin !== origin || url.pathname.startsWith("/api/")) {
      requests.push(url.href);
      return route.abort();
    }
    if (url.pathname.includes("extraction.worker"))
      return route.fulfill({ contentType: "text/javascript", body: FAKE_OCR });
    if (url.pathname === "/picture")
      return route.fulfill({
        contentType: "text/html",
        body: await vite.transformIndexHtml(
          "/picture",
          `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/tests/fixtures/image-question-entry.tsx"></script></body></html>`,
        ),
      });
    return route.continue();
  });
  await page.goto(`${origin}/picture?${query}`, { timeout: 60_000 });
  await page.waitForFunction(() => "picture" in window);
  return Object.assign(page, { blocked: requests });
}
const done = (page: Page) => page.context().close();

/** An APP1 segment with EXIF: an image description and a GPS block (52.52 N, 13.405 E). */
function exifWithGps(): Buffer {
  const ascii = (text: string) => Buffer.from(text + "\0", "latin1");
  const description = ascii("PRIVATE-DESCRIPTION Wohnung Berlin");
  const tiff = Buffer.alloc(8 + 2 + 2 * 12 + 4);
  tiff.write("II*\0", 0, "latin1");
  tiff.writeUInt32LE(8, 4);
  tiff.writeUInt16LE(2, 8);
  const entry = (at: number, tag: number, type: number, count: number, value: number) => {
    tiff.writeUInt16LE(tag, at);
    tiff.writeUInt16LE(type, at + 2);
    tiff.writeUInt32LE(count, at + 4);
    tiff.writeUInt32LE(value, at + 8);
  };
  const descriptionAt = tiff.length;
  const gpsAt = descriptionAt + description.length;
  entry(10, 0x010e, 2, description.length, descriptionAt); // ImageDescription
  entry(22, 0x8825, 4, 1, gpsAt); // GPSInfo pointer
  const gps = Buffer.alloc(2 + 4 * 12 + 4);
  gps.writeUInt16LE(4, 0);
  const rationalsAt = gpsAt + gps.length;
  const gpsEntry = (index: number, tag: number, type: number, count: number, value: number | string) => {
    const at = 2 + index * 12;
    gps.writeUInt16LE(tag, at);
    gps.writeUInt16LE(type, at + 2);
    gps.writeUInt32LE(count, at + 4);
    if (typeof value === "string") gps.write(value + "\0", at + 8, "latin1");
    else gps.writeUInt32LE(value, at + 8);
  };
  gpsEntry(0, 1, 2, 2, "N"); // GPSLatitudeRef
  gpsEntry(1, 2, 5, 3, rationalsAt); // GPSLatitude
  gpsEntry(2, 3, 2, 2, "E"); // GPSLongitudeRef
  gpsEntry(3, 4, 5, 3, rationalsAt + 24); // GPSLongitude
  const rationals = Buffer.alloc(48);
  [52, 1, 31, 1, 12, 1, 13, 1, 24, 1, 18, 1].forEach((n, i) => rationals.writeUInt32LE(n, i * 4));
  const body = Buffer.concat([Buffer.from("Exif\0\0", "latin1"), tiff, description, gps, rationals]);
  const head = Buffer.alloc(4);
  head.writeUInt16BE(0xffe1, 0);
  head.writeUInt16BE(body.length + 2, 2);
  return Buffer.concat([head, body]);
}
function comment(text: string): Buffer {
  const body = Buffer.from(text, "latin1");
  const head = Buffer.alloc(4);
  head.writeUInt16BE(0xfffe, 0);
  head.writeUInt16BE(body.length + 2, 2);
  return Buffer.concat([head, body]);
}

it("a JPEG with EXIF, GPS and a comment comes out with no metadata at all: only pixels are encoded", async () => {
  const page = await open("view=redactor");
  const clean = Buffer.from(await page.evaluate(() => (window as never as { picture: { jpeg(w: number, h: number): Promise<number[]> } }).picture.jpeg(640, 480)));
  // Insert the metadata right after the start-of-image marker, where a camera writes it.
  const tagged = Buffer.concat([clean.subarray(0, 2), exifWithGps(), comment("SECRET-COMMENT phone owner"), clean.subarray(2)]);
  expect(listImageMetadata(tagged)).toEqual(expect.arrayContaining(["APP1", "COM"]));
  expect(tagged.includes("Exif")).toBe(true);
  expect(tagged.includes("PRIVATE-DESCRIPTION")).toBe(true);
  const out = await page.evaluate(
    ([bytes]) => (window as never as { picture: { send(b: number[], t: string, boxes: never[], max: number): Promise<{ intermediate: number[]; bytes: number[]; width: number; height: number }> } }).picture.send(bytes, "image/jpeg", [], 280_000),
    [[...tagged]],
  );
  // The browser really decoded the tagged file, and the output is a picture of the same size.
  expect([out.width, out.height]).toEqual([640, 480]);
  for (const bytes of [Buffer.from(out.intermediate), Buffer.from(out.bytes)]) {
    expect(listImageMetadata(bytes)).toEqual([]);
    for (const marker of ["Exif", "PRIVATE-DESCRIPTION", "Berlin", "SECRET-COMMENT", "GPS"])
      expect(bytes.includes(marker), marker).toBe(false);
    // No APP1 (EXIF, XMP) segment marker and no comment segment anywhere before the image data.
    expect(bytes.includes(Buffer.from([0xff, 0xe1]))).toBe(false);
  }
  expect(Buffer.from(out.bytes).subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff]));
  expect(out.bytes.length).toBeLessThanOrEqual(280_000);
  expect(page.blocked).toEqual([]);
  await done(page);
});

it("the pixels under a box are black in the picture that is sent, and the pixels beside it are not", async () => {
  const page = await open("view=redactor");
  const red = await page.evaluate(() => (window as never as { picture: { jpeg(w: number, h: number): Promise<number[]> } }).picture.jpeg(800, 600));
  const box = { x: 200, y: 150, width: 240, height: 90 };
  const result = await page.evaluate(
    async ([bytes, covered]) => {
      const tools = (window as never as { picture: { send(b: number[], t: string, boxes: unknown[], max: number): Promise<{ dataUrl: string }>; pixels(url: string, region: unknown): Promise<number[][]> } }).picture;
      const sent = await tools.send(bytes as number[], "image/jpeg", [covered], 280_000);
      const region = covered as { x: number; y: number; width: number; height: number };
      return {
        // Inside the box, a few pixels in from its edge (JPEG blurs edges slightly).
        inside: await tools.pixels(sent.dataUrl, { x: region.x + 4, y: region.y + 4, width: region.width - 8, height: region.height - 8 }),
        outside: await tools.pixels(sent.dataUrl, { x: 20, y: 20, width: 100, height: 100 }),
      };
    },
    [red, box] as const,
  );
  expect(result.inside.length).toBe(232 * 82);
  expect(Math.max(...result.inside.flat())).toBeLessThanOrEqual(12);
  // The picture itself was red there before; beside the box it still is.
  expect(Math.min(...result.outside.map(([r]) => r))).toBeGreaterThan(180);
  await done(page);
});

for (const [name, viewport] of [["phone", phone], ["desktop", desktop]] as const)
  it(`the cover-up tool at ${name} width: draw a box by dragging, add and move one with the keyboard, undo, suggestions, and the exact picture`, async () => {
    const page = await open("view=redactor&thinking", viewport);
    const canvas = page.locator("canvas.image-redact-canvas");
    await ui(canvas).toBeVisible();
    const frame = (await canvas.boundingBox())!;
    // The picture fits the screen: no sideways scrolling.
    expect(frame.width).toBeLessThanOrEqual(viewport.width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    // Drag over the first line of text.
    await page.mouse.move(frame.x + frame.width * 0.25, frame.y + frame.height * 0.29);
    await page.mouse.down();
    await page.mouse.move(frame.x + frame.width * 0.72, frame.y + frame.height * 0.35, { steps: 4 });
    await page.mouse.up();
    await ui(page.getByRole("status")).toHaveText(en.boxAdded(1));
    await ui(page.getByRole("button", { name: en.box(1), exact: true })).toBeVisible();
    // Keyboard only: add a box, move it, make it larger, then remove it with Delete.
    await page.getByRole("button", { name: en.addBox }).focus();
    await page.keyboard.press("Enter");
    await ui(page.getByRole("status")).toHaveText(en.boxAdded(2));
    await ui(page.locator(".image-redact-frame")).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await ui(page.getByRole("status")).toHaveText(en.boxMoved(36, 46, 30, 8));
    await page.keyboard.press("Shift+ArrowDown");
    await ui(page.getByRole("status")).toHaveText(en.boxMoved(36, 46, 30, 9));
    await ui(page.locator(".image-redact-chosen")).toBeVisible();
    await page.keyboard.press("Delete");
    await ui(page.getByRole("status")).toHaveText(en.boxRemoved(1));
    // Undo brings the removed box back; clear and undo again.
    await page.getByRole("button", { name: en.undo }).click();
    await ui(page.getByRole("list", { name: en.boxList }).getByRole("listitem")).toHaveCount(2);
    await page.getByRole("button", { name: en.removeBox(2) }).click();
    // Suggestions, from fake OCR words and the real masking rules.
    await page.getByRole("button", { name: en.suggest }).click();
    await ui(page.getByRole("status")).toHaveText(en.suggested(2));
    await ui(page.getByRole("button", { name: en.box(2, "email address") })).toBeVisible();
    await ui(page.getByRole("button", { name: en.box(3, "bank account") })).toBeVisible();
    // A suggestion the user does not want can be removed.
    await page.getByRole("button", { name: en.removeBox(2) }).click();
    await ui(page.getByRole("list", { name: en.boxList }).getByRole("listitem")).toHaveCount(2);
    // Faces: this browser has no on-device face finder, so no button, and the text says to draw boxes.
    await ui(page.getByRole("button", { name: en.faces })).toHaveCount(0);
    await ui(page.getByText(en.facesUnsupported)).toBeVisible();
    // The exact picture.
    await page.getByRole("button", { name: en.preview }).click();
    const exact = page.getByRole("img", { name: en.checkLabel });
    await ui(exact).toBeVisible();
    await ui(page.getByText(en.thinkingNote)).toBeVisible();
    const checked = await exact.evaluate(async (img: HTMLImageElement) => {
      const tools = (window as never as { picture: { pixels(url: string, region: unknown): Promise<number[][]> } }).picture;
      return {
        url: img.src,
        size: [img.naturalWidth, img.naturalHeight],
        // The suggested IBAN box (words from x 162 to 660, y 350 to 386) and the box drawn by hand.
        iban: await tools.pixels(img.src, { x: 170, y: 354, width: 480, height: 28 }),
        drawn: await tools.pixels(img.src, { x: 330, y: 275, width: 500, height: 26 }),
        band: await tools.pixels(img.src, { x: 100, y: 20, width: 50, height: 50 }),
      };
    });
    expect(checked.size).toEqual([1200, 900]);
    expect(Math.max(...checked.iban.flat())).toBeLessThanOrEqual(12);
    expect(Math.max(...checked.drawn.flat())).toBeLessThanOrEqual(12);
    expect(Math.min(...checked.band.map(([r]) => r))).toBeGreaterThan(150);
    const sentBytes = Buffer.from(checked.url.split(",")[1], "base64");
    expect(listImageMetadata(sentBytes)).toEqual([]);
    expect(sentBytes.length).toBeLessThanOrEqual(280_000);
    // Back keeps the boxes; attach hands over exactly the checked picture.
    await page.getByRole("button", { name: en.back }).click();
    await ui(page.getByRole("list", { name: en.boxList }).getByRole("listitem")).toHaveCount(2);
    await page.getByRole("button", { name: en.preview }).click();
    await page.getByRole("button", { name: en.attach }).click();
    const attached = page.getByRole("group", { name: en.attachedLabel });
    await ui(attached.getByText(en.attachedNote)).toBeVisible();
    expect(await attached.getByRole("img").getAttribute("src")).toBe(checked.url);
    await attached.getByRole("button", { name: en.remove }).click();
    await ui(attached).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    // Nothing was requested from another host or from an API, and nothing was stored.
    expect(page.blocked).toEqual([]);
    expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
    await done(page);
  });

it("the whole flow in German at phone width: notice first, then the picture, the health question, and the consent card; saying no attaches nothing", async () => {
  const de = imageText.de;
  const page = await open("view=flow&consent", phone, "de-DE");
  // The first-upload notice, with its limits, before any picture is chosen.
  const dialog = page.getByRole("dialog");
  await ui(dialog.getByRole("heading", { name: de.noteTitle })).toBeVisible();
  for (const text of [de.note1, de.note2, de.note3, de.note4]) await ui(dialog.getByText(text)).toBeVisible();
  await dialog.getByRole("button", { name: de.noteContinue }).click();
  // The existing photo dialog with picture wording.
  await ui(page.getByRole("heading", { name: de.pickTitle })).toBeVisible();
  await ui(page.getByText(de.pickIntro)).toBeVisible();
  const png = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 400;
    canvas.getContext("2d")!.fillRect(0, 0, 600, 400);
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
    return [...new Uint8Array(await blob.arrayBuffer())];
  });
  await page.locator('input[type="file"]').setInputFiles({ name: "synthetic.png", mimeType: "image/png", buffer: Buffer.from(png) });
  await page.getByRole("button", { name: de.pickUse }).click();
  // Consent was never given: the picture is asked about.
  await ui(page.getByRole("heading", { name: de.healthTitle })).toBeVisible();
  await page.getByRole("button", { name: de.healthYes, exact: true }).click();
  // The existing consent card, unchanged.
  await ui(page.getByRole("region", { name: "Gesundheit und andere sensible Angaben" })).toBeVisible();
  await page.getByRole("button", { name: "Jetzt nicht" }).click();
  await ui(page.getByTestId("notice")).toHaveText(de.healthDeclined);
  await ui(page.getByTestId("consent")).toHaveText("declined");
  await ui(page.getByRole("dialog")).toHaveCount(0);
  await ui(page.getByRole("group", { name: de.attachedLabel })).toHaveCount(0);
  // The notice is remembered, and nothing else is.
  expect(await page.evaluate(() => Object.entries(localStorage).filter(([key]) => key !== "cometrow.language"))).toEqual([["cometrow.images.note-seen", "1"]]);
  expect(page.blocked).toEqual([]);
  await done(page);
});

it("the flow when the picture is not a health picture, or consent was already given: straight to covering; Escape discards the picture", async () => {
  for (const query of ["view=flow&consent", "view=flow&consent&choice=accepted", "view=flow"]) {
    const page = await open(query);
    await page.getByRole("button", { name: en.noteContinue }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: "synthetic.png",
      mimeType: "image/png",
      buffer: Buffer.from(await page.evaluate(async () => {
        const canvas = document.createElement("canvas");
        canvas.width = 300;
        canvas.height = 200;
        canvas.getContext("2d")!.fillRect(0, 0, 300, 200);
        const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
        return [...new Uint8Array(await blob.arrayBuffer())];
      })),
    });
    await page.getByRole("button", { name: en.pickUse }).click();
    if (query === "view=flow&consent") {
      await ui(page.getByRole("heading", { name: en.healthTitle })).toBeVisible();
      await page.getByRole("button", { name: en.healthNo }).click();
    }
    await ui(page.locator("canvas.image-redact-canvas")).toBeVisible();
    await ui(page.getByRole("heading", { name: en.healthTitle })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await ui(page.getByRole("dialog")).toHaveCount(0);
    await ui(page.getByRole("group", { name: en.attachedLabel })).toHaveCount(0);
    await done(page);
  }
});
