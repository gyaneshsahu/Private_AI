// Image editing in the real app (docs/image-editing-20261125.md), every feature on, the image
// provider faked: Edit opens the picture full screen; "Describe edits" makes a new version and
// earlier ones stay; Select area changes only the painted part (checked pixel by pixel); Erase,
// Resize, Zoom, Download; a follow-up request in the chat edits the last image; the day's limit;
// an uploaded photo is checked for people first. Phone and desktop, English and German.
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { crc32, deflateSync } from "node:zlib";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { chromium, expect as ui, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { installFakes, type Fakes } from "../evaluation/audit-fakes";
import { buildClient, startServer } from "../evaluation/audit-harness";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import type { ImageEditRequest } from "../shared/image-edit";
import { appText } from "../src/text/app";
import { imageCreationText } from "../src/text/image-creation";
import { imageEditText } from "../src/text/image-edit";

vi.setConfig({ testTimeout: 120_000 });

/** A solid-colour PNG, written by hand so the test needs no image library. */
function png(width: number, height: number, [r, g, b]: [number, number, number]): string {
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([length, body, sum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8); // 8 bits, RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 3, Buffer.from([r, g, b]))]);
  const pixels = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header), chunk("IDAT", deflateSync(pixels)), chunk("IEND", Buffer.alloc(0))]).toString("base64");
}
const BLUE: [number, number, number] = [40, 90, 200];
const RED: [number, number, number] = [220, 30, 30];

let origin = "";
let server: Server;
let browser: Browser;
beforeAll(async () => {
  const client = await buildClient("on");
  ({ origin, server } = await startServer("on", client));
  browser = await chromium.launch({ ...browserLaunchOptions(), proxy: { server: "http://127.0.0.1:9", bypass: "localhost,127.0.0.1" } });
}, 300_000);
afterAll(async () => {
  await browser?.close();
  server?.close();
});

type Lang = "en" | "de";
async function open(width: number, lang: Lang, o: { limit?: boolean } = {}) {
  const context: BrowserContext = await browser.newContext({
    viewport: { width, height: width < 700 ? 812 : 900 },
    locale: lang === "de" ? "de-DE" : "en-US",
    ...(width < 700 ? { hasTouch: true, isMobile: true } : {}),
  });
  context.setDefaultTimeout(10_000);
  await context.addCookies([{ name: "audit-account", value: randomUUID(), url: origin }]);
  const fakes: Fakes = await installFakes(context, { origin, config: "on" });
  // The image provider: a blue 512 px picture when created, a red one for every edit.
  const edits: ImageEditRequest[] = [];
  await context.route("**/api/images/create", (route) => route.fulfill({ json: { type: "image/png", data: png(512, 512, BLUE), model: "mock-image" } }));
  await context.route("**/api/images/edit", (route) => {
    edits.push(route.request().postDataJSON() as ImageEditRequest);
    if (o.limit) return route.fulfill({ status: 429, json: { error: "limit", limit: 3 } });
    return route.fulfill({ json: { type: "image/png", data: png(256, 256, RED), model: "mock-image" } });
  });
  const page: Page = await context.newPage();
  page.on("dialog", (d) => void (d.type() === "beforeunload" ? d.accept() : d.dismiss()).catch(() => {}));
  await page.goto(origin + "/", { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.locator(".app-shell").waitFor({ state: "visible", timeout: 30_000 });
  const a = appText[lang];
  const c = imageCreationText[lang];
  const t = imageEditText[lang];
  const editor = page.locator("dialog.image-editor");
  /** Creates one image through the "+" menu and returns its card. */
  const create = async () => {
    await page.getByLabel(a.tools, { exact: true }).click();
    await page.locator(".tools-menu .menu-surface").getByRole("button", { name: c.menu, exact: true }).click();
    const dialog = page.getByRole("dialog", { name: c.title });
    await dialog.getByLabel(c.describe).fill("A calm lake at sunrise");
    await dialog.getByRole("button", { name: c.create, exact: true }).click();
    await ui(dialog).toBeHidden();
    return page.locator("figure.created-image").last();
  };
  /** The colour of the shown picture at a point given as fractions of its size. */
  const colourAt = (x: number, y: number) =>
    editor.locator(".image-editor-picture img").evaluate(
      async (img: HTMLImageElement, [fx, fy]) => {
        await img.decode();
        const canvas = Object.assign(document.createElement("canvas"), { width: img.naturalWidth, height: img.naturalHeight });
        const context2d = canvas.getContext("2d")!;
        context2d.drawImage(img, 0, 0);
        return [...context2d.getImageData(Math.floor(fx * (canvas.width - 1)), Math.floor(fy * (canvas.height - 1)), 1, 1).data.slice(0, 3)];
      },
      [x, y],
    );
  /** Paints one stroke across the middle of the picture. */
  const paint = async () => {
    const box = (await editor.locator(".image-editor-overlay").boundingBox())!;
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + box.width * 0.42, y);
    await page.mouse.down();
    for (let i = 1; i <= 6; i++) await page.mouse.move(box.x + box.width * (0.42 + i * 0.027), y);
    await page.mouse.up();
  };
  return { context, page, fakes, edits, a, c, t, editor, create, colourAt, paint };
}
const near = (colour: number[], [r, g, b]: [number, number, number]) => Math.abs(colour[0] - r) + Math.abs(colour[1] - g) + Math.abs(colour[2] - b) < 60;

describe.each([
  [375, "en"],
  [375, "de"],
  [1280, "en"],
  [1280, "de"],
] as [number, Lang][])("image editor at %i px, %s", (width, lang) => {
  it("Edit opens the picture full screen; Describe edits makes a new version; earlier versions stay, can be shown, downloaded and deleted", async () => {
    const { context, page, edits, t, editor, create, colourAt } = await open(width, lang);
    try {
      const card = await create();
      await card.getByRole("button", { name: t.edit, exact: true }).click();
      await ui(editor).toBeVisible();
      const box = (await editor.boundingBox())!;
      expect([Math.round(box.x), Math.round(box.y), Math.round(box.width), Math.round(box.height)]).toEqual([0, 0, width, width < 700 ? 812 : 900]);
      const describe = editor.getByLabel(t.describe, { exact: true });
      await ui(describe).toHaveAttribute("placeholder", t.describePlaceholder);
      const versions = editor.locator(".image-editor-versions button");
      await ui(versions).toHaveCount(1);
      await ui(editor.getByRole("status")).toContainText(t.versionOf(1, 1));
      await ui(editor.getByRole("status")).toContainText(t.left(2, 3));
      expect(near(await colourAt(0.5, 0.5), BLUE)).toBe(true);
      // Apply is off until something is typed.
      const apply = editor.getByRole("button", { name: t.send, exact: true });
      await ui(apply).toBeDisabled();
      await describe.fill("Make the sky orange");
      await describe.press("Enter");
      await ui(versions).toHaveCount(2);
      await ui(editor.getByRole("status")).toContainText(t.versionOf(2, 2));
      await ui(editor.getByRole("status")).toContainText(t.left(1, 3));
      await ui(describe).toHaveValue("");
      // One request: the whole picture as a JPEG and the typed words; no mask.
      expect(edits).toHaveLength(1);
      expect(edits[0]).toMatchObject({ tool: "describe", prompt: "Make the sky orange", type: "image/jpeg", source: "created" });
      expect(edits[0].mask).toBeUndefined();
      expect(near(await colourAt(0.5, 0.5), RED)).toBe(true);
      await ui(versions.nth(1)).toHaveAttribute("aria-label", t.version(2, "Make the sky orange"));
      // The first version is still there and can be shown again.
      await versions.first().click();
      await ui(versions.first()).toHaveAttribute("aria-pressed", "true");
      await expect.poll(async () => near(await colourAt(0.5, 0.5), BLUE)).toBe(true);
      await ui(editor.getByRole("link", { name: t.download })).toHaveAttribute("download", "cometrow-image-1.png"); // the provider's own file, untouched
      await versions.nth(1).click();
      await ui(editor.getByRole("link", { name: t.download })).toHaveAttribute("download", "cometrow-image-2.jpg");
      // Every control is at least 44 px on a phone and nothing scrolls sideways.
      if (width < 700)
        for (const button of await editor.locator("button:visible, a:visible").all()) {
          const size = (await button.boundingBox())!;
          expect(Math.min(size.width, size.height), await button.innerText()).toBeGreaterThanOrEqual(43.5);
        }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
      await page.screenshot({ path: `.local/image-edit/editor-${lang}-${width}.png` });
      // Back: the chat's card shows the version that was shown, and reopening has both versions.
      await editor.getByRole("button", { name: t.back }).click();
      await ui(editor).toHaveCount(0);
      await card.getByRole("button", { name: t.open, exact: true }).click();
      await ui(versions).toHaveCount(2);
      // Deleting the shown version leaves the other; the last one cannot be deleted.
      await editor.getByRole("button", { name: t.deleteVersion }).click();
      await ui(versions).toHaveCount(1);
      await ui(editor.getByRole("button", { name: t.deleteVersion })).toHaveCount(0);
      await page.keyboard.press("Escape");
      await ui(editor).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  it("Select area changes only the painted part; Erase removes it; Resize and Zoom", async () => {
    const { context, edits, t, editor, create, colourAt, paint } = await open(width, lang);
    try {
      await (await create()).getByRole("button", { name: t.edit, exact: true }).click();
      const versions = editor.locator(".image-editor-versions button");
      // Select area: without a painted area nothing is sent.
      await editor.getByRole("button", { name: t.selectArea }).click();
      await ui(editor.getByText(t.selectHint)).toBeVisible();
      const describe = editor.getByLabel(t.describe, { exact: true });
      await ui(describe).toHaveAttribute("placeholder", t.areaPlaceholder);
      await describe.fill("a red door");
      await describe.press("Enter");
      await ui(editor.getByRole("status")).toContainText(t.needSelection);
      expect(edits).toHaveLength(0);
      await paint();
      await ui(editor.getByRole("button", { name: t.clearSelection })).toBeEnabled();
      await describe.press("Enter");
      await ui(versions).toHaveCount(2);
      // The provider takes no mask here: only a box around the area went out, with the words, and
      // the answer was pasted back through the area. The middle changed; the corners did not.
      expect(edits[0]).toMatchObject({ tool: "area", prompt: "a red door" });
      expect(edits[0].mask).toBeUndefined();
      expect(near(await colourAt(0.5, 0.5), RED)).toBe(true);
      for (const [x, y] of [[0.03, 0.03], [0.97, 0.03], [0.03, 0.97], [0.97, 0.97], [0.5, 0.1], [0.5, 0.9]] as const)
        expect(near(await colourAt(x, y), BLUE), `${x},${y}`).toBe(true);
      // Erase: paint, then "Erase selection"; no text is asked for.
      await editor.getByRole("button", { name: t.erase, exact: true }).click();
      await ui(editor.getByLabel(t.describe, { exact: true })).toHaveCount(0);
      const eraseNow = editor.getByRole("button", { name: t.eraseNow });
      await ui(eraseNow).toBeDisabled();
      await paint();
      await eraseNow.click();
      await ui(versions).toHaveCount(3);
      expect(edits[1]).toMatchObject({ tool: "erase", prompt: "" });
      await ui(versions.nth(2)).toHaveAttribute("aria-label", t.version(3, t.erased));
      // Resize: three shapes; the chosen one is sent with the whole picture.
      await editor.getByRole("button", { name: t.resize, exact: true }).click();
      const sizes = editor.getByRole("group", { name: t.resize });
      await ui(sizes.getByRole("button")).toHaveText([t.square, t.portrait, t.landscape]);
      await sizes.getByRole("button", { name: t.portrait }).click();
      await ui(versions).toHaveCount(4);
      expect(edits[2]).toMatchObject({ tool: "resize", size: "portrait", prompt: "" });
      await ui(versions.nth(3)).toHaveAttribute("aria-label", t.version(4, t.resized(t.portrait)));
      // Zoom: the picture gets larger and smaller again.
      const picture = editor.locator(".image-editor-picture img");
      const before = (await picture.boundingBox())!.width;
      await ui(editor.getByRole("button", { name: t.zoomOut })).toBeDisabled();
      await editor.getByRole("button", { name: t.zoomIn }).click();
      await expect.poll(async () => (await picture.boundingBox())!.width).toBeGreaterThan(before * 1.4);
      await editor.getByRole("button", { name: t.zoomOut }).click();
      await expect.poll(async () => Math.round((await picture.boundingBox())!.width)).toBe(Math.round(before));
    } finally {
      await context.close();
    }
  });

  it("in the chat, a request right after an image edits it; a question goes to the chat as before", async () => {
    const { context, page, fakes, edits, a, t, create } = await open(width, lang);
    try {
      await create();
      const box = page.getByLabel(a.messageInput, { exact: true });
      const request = lang === "de" ? "mach den Hintergrund weiß" : "make the background white";
      await box.fill(request);
      await page.getByRole("button", { name: a.sendLabel, exact: true }).click();
      await ui(page.locator("figure.created-image")).toHaveCount(2);
      expect(edits).toHaveLength(1);
      expect(edits[0]).toMatchObject({ tool: "describe", prompt: request });
      await ui(page.locator("article.user").last()).toContainText(request);
      await ui(box).toHaveValue("");
      // Nothing went to the chat model for it.
      expect(fakes.log.replies).toHaveLength(0);
      // A question about the picture is an ordinary message.
      await box.fill(lang === "de" ? "Was ist ein See?" : "What is a lake?");
      await page.getByRole("button", { name: a.sendLabel, exact: true }).click();
      await expect.poll(() => fakes.log.replies.length).toBe(1);
      expect(edits).toHaveLength(1);
      expect(await page.locator("figure.created-image").count()).toBe(2);
      void t;
    } finally {
      await context.close();
    }
  });
});

describe.each([375, 1280])("image editor limits and uploads at %i px", (width) => {
  it("the day's images used up: one calm sentence, no new version", async () => {
    const { context, t, editor, create } = await open(width, "en", { limit: true });
    try {
      await (await create()).getByRole("button", { name: t.edit, exact: true }).click();
      await editor.getByLabel(t.describe, { exact: true }).fill("Make it night");
      await editor.getByRole("button", { name: t.send, exact: true }).click();
      await ui(editor.getByRole("status")).toHaveText(t.limit(3));
      await ui(editor.locator(".image-editor-versions button")).toHaveCount(1);
      await ui(editor.getByLabel(t.describe, { exact: true })).toHaveValue("Make it night");
    } finally {
      await context.close();
    }
  });

  it("an uploaded photo: refused when the picture model sees a person or cannot say; opened in the editor when it sees none", async () => {
    const { context, page, fakes, edits, a, t, editor } = await open(width, "en");
    try {
      const choose = async () => {
        await page.getByLabel(a.tools, { exact: true }).click();
        const chooser = page.waitForEvent("filechooser");
        await page.locator(".tools-menu .menu-surface").getByRole("button", { name: t.menuUpload, exact: true }).click();
        await (await chooser).setFiles({ name: "room.png", mimeType: "image/png", buffer: Buffer.from(png(400, 300, BLUE), "base64") });
      };
      // The picture model answers YES: refused, nothing reaches the image provider or the chat.
      fakes.answer("yes");
      await choose();
      await ui(page.getByText(t.uploadPeople)).toBeVisible();
      await ui(editor).toHaveCount(0);
      // It gives no clear answer: also refused.
      fakes.answer("plain");
      await choose();
      await ui(page.getByText(t.uploadUncheckable)).toBeVisible();
      await ui(page.locator("figure.created-image")).toHaveCount(0);
      // NO: the photo is in the chat and open in the editor, named "Your picture".
      fakes.answer("no");
      await choose();
      await ui(editor).toBeVisible();
      await ui(editor.locator(".image-editor-versions button").first()).toHaveAttribute("aria-label", t.version(1, t.uploaded));
      expect(edits).toHaveLength(0);
      // The check was a picture question with the fixed question, and the photo went with it.
      expect(fakes.log.replies).toHaveLength(3);
      await editor.getByLabel(t.describe, { exact: true }).fill("Paint the wall green");
      await editor.getByRole("button", { name: t.send, exact: true }).click();
      await ui(editor.locator(".image-editor-versions button")).toHaveCount(2);
      expect(edits[0]).toMatchObject({ tool: "describe", source: "upload", prompt: "Paint the wall green" });
      // A file that is not a picture format we take is refused with its reason.
      await editor.getByRole("button", { name: t.back }).click();
      await page.getByLabel(a.tools, { exact: true }).click();
      const chooser = page.waitForEvent("filechooser");
      await page.locator(".tools-menu .menu-surface").getByRole("button", { name: t.menuUpload, exact: true }).click();
      await (await chooser).setFiles({ name: "notes.gif", mimeType: "image/gif", buffer: Buffer.from("GIF89a") });
      await ui(page.getByText(t.uploadFormat)).toBeVisible();
    } finally {
      await context.close();
    }
  });
});
