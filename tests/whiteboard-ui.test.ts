// Whiteboard panel (src/Whiteboard.tsx) alone in a real browser: drawing with the mouse, text and
// notes, eraser, undo, clear, colours, the board picture, light and dark, phone width. Offline:
// the fixture's board is synthetic and nothing leaves the machine.
import { mkdirSync } from "node:fs";
import { afterAll, beforeAll, expect, it } from "vitest";
import { chromium, expect as ui, type Browser, type Page } from "@playwright/test";
import { createServer, type ViteDevServer } from "vite";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { boardSchema, type Board } from "../shared/whiteboard";
import { whiteboardText } from "../src/text/whiteboard";
import { questionText } from "../src/text/questions";

let vite: ViteDevServer;
let browser: Browser;
let origin = "";
const t = whiteboardText.en;
const SHOTS = ".local/ui-redesign";

beforeAll(async () => {
  vite = await createServer({
    configFile: false,
    logLevel: "silent",
    cacheDir: "node_modules/.vite-whiteboard-ui-test",
    server: { host: "127.0.0.1", port: 0, hmr: false },
  });
  await vite.listen();
  await warmDevServer(vite);
  await vite.warmupRequest("/tests/fixtures/whiteboard-entry.tsx");
  await vite.waitForRequestsIdle();
  const address = vite.httpServer!.address();
  if (!address || typeof address === "string") throw Error("No local port");
  origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch(browserLaunchOptions());
  mkdirSync(SHOTS, { recursive: true });
}, 90_000);

afterAll(async () => {
  await browser?.close();
  await vite?.close();
});

async function open({ width = 1280, height = 800, query = "", lang = "en" as "en" | "de" } = {}) {
  const context = await browser.newContext({ locale: lang === "de" ? "de-DE" : "en-US", viewport: { width, height }, hasTouch: width < 760 });
  context.setDefaultTimeout(15_000);
  const page = await context.newPage();
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin || route.request().method() !== "GET") return route.abort();
    if (url.pathname === "/whiteboard")
      return route.fulfill({
        contentType: "text/html",
        body: await vite.transformIndexHtml(
          "/whiteboard",
          `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/tests/fixtures/whiteboard-entry.tsx"></script></body></html>`,
        ),
      });
    return route.continue();
  });
  await page.goto(origin + "/whiteboard" + query, { timeout: 30_000 });
  await ui(page.locator("html")).toHaveAttribute("lang", lang);
  await ui(page.locator(".wb-svg")).toBeVisible();
  return page;
}

const board = (page: Page) => page.evaluate(() => window.board) as Promise<Board>;
const changes = (page: Page) => page.evaluate(() => window.changes);
/** Screen position of a board point (the board is scaled and letterboxed to fit). */
const screen = (page: Page, x: number, y: number) =>
  page.evaluate(([x, y]) => {
    const p = new DOMPoint(x, y).matrixTransform(document.querySelector<SVGSVGElement>(".wb-svg")!.getScreenCTM()!);
    return { x: p.x, y: p.y };
  }, [x, y] as const);
async function drag(page: Page, from: [number, number], to: [number, number]) {
  const a = await screen(page, ...from);
  const b = await screen(page, ...to);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 12 });
  await page.mouse.up();
}
async function click(page: Page, x: number, y: number, clickCount = 1) {
  const p = await screen(page, x, y);
  await page.mouse.click(p.x, p.y, { clickCount });
}
// A click event carries whole screen pixels, a few board units apart.
const near = (n: number) => expect.toSatisfy((v: number) => Number.isInteger(v) && Math.abs(v - n) <= 4);
const tool = (page: Page, name: string) => page.getByRole("button", { name, exact: true }).click();
async function valid(page: Page) {
  const b = await board(page);
  expect(boardSchema.safeParse(b).success).toBe(true);
  return b;
}

it("draws a pen stroke with the mouse as one valid pen item, and Ctrl+Z takes it back", async () => {
  const page = await open();
  try {
    await ui(page.getByRole("button", { name: t.pen })).toHaveAttribute("aria-pressed", "true");
    await drag(page, [200, 200], [700, 500]);
    const b = await valid(page);
    expect(b.items).toHaveLength(1);
    const pen = b.items[0];
    expect(pen.kind).toBe("pen");
    if (pen.kind !== "pen") return;
    expect(pen.colour).toBe(0);
    expect(pen.points.length).toBeGreaterThan(4);
    expect(pen.points.every(Number.isInteger)).toBe(true);
    expect(pen.points.slice(0, 2)).toEqual([200, 200]);
    expect(await changes(page)).toBe(1);
    expect(b.changedAt > "2026-11-17T12:00:00.000Z").toBe(true);
    // Focus stays in the panel after drawing, so the shortcut works straight away.
    await page.keyboard.press("Control+z");
    expect((await board(page)).items).toEqual([]);
  } finally {
    await page.context().close();
  }
}, 60_000);

it("draws with a finger on a phone: one pen stroke, and a tap places text", async () => {
  const page = await open({ width: 375, height: 812 });
  try {
    // Real touch input through the browser's own input pipeline, not synthetic DOM events.
    const cdp = await page.context().newCDPSession(page);
    const points = await Promise.all([300, 500, 700, 900, 1100].map((x) => screen(page, x, 500)));
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [points[0]] });
    for (const point of points.slice(1)) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [point] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await ui.poll(async () => (await board(page)).items.length).toBe(1);
    const b = await valid(page);
    expect(b.items[0].kind === "pen" && b.items[0].points.length).toBeGreaterThanOrEqual(8);
    await tool(page, t.text);
    const at = await screen(page, 400, 700);
    await page.touchscreen.tap(at.x, at.y);
    const field = page.getByRole("textbox", { name: t.textLabel });
    await ui(field).toBeFocused();
    await field.fill("Tapped");
    await field.press("Enter");
    expect((await valid(page)).items.map((i) => i.kind)).toEqual(["pen", "text"]);
  } finally {
    await page.context().close();
  }
}, 60_000);

it("draws a box and an arrow by dragging, in the chosen colours", async () => {
  const page = await open();
  try {
    await tool(page, t.box);
    await tool(page, t.colourRed);
    await ui(page.getByRole("button", { name: t.colourRed })).toHaveAttribute("aria-pressed", "true");
    await drag(page, [600, 500], [300, 200]);
    await tool(page, t.arrow);
    await tool(page, t.colourBlue);
    await drag(page, [800, 300], [1200, 700]);
    // A click without dragging adds nothing.
    await click(page, 1000, 900);
    const b = await valid(page);
    expect(b.items.map((i) => i.kind)).toEqual(["box", "arrow"]);
    expect(b.items[0]).toMatchObject({ kind: "box", colour: 2, x: 300, y: 200, w: 300, h: 300 });
    expect(b.items[1]).toMatchObject({ kind: "arrow", colour: 1, x1: 800, y1: 300, x2: 1200, y2: 700 });
    expect(await changes(page)).toBe(2);
  } finally {
    await page.context().close();
  }
}, 60_000);

it("places text and notes by click and typing; Enter commits once, Escape cancels, double-click edits", async () => {
  const page = await open();
  try {
    await tool(page, t.text);
    await click(page, 300, 600);
    const field = page.getByRole("textbox", { name: t.textLabel });
    await ui(field).toBeFocused();
    await field.fill("Hello <board> & co");
    await field.press("Enter");
    await ui(field).toHaveCount(0);
    // Focus stays in the panel after typing, so Ctrl+Z works; then put the text back.
    await page.keyboard.press("Control+z");
    expect((await board(page)).items).toEqual([]);
    await click(page, 300, 600);
    await field.fill("Hello <board> & co");
    await field.press("Enter");
    let b = await valid(page);
    expect(b.items).toEqual([expect.objectContaining({ kind: "text", colour: 0, x: near(300), y: near(600), text: "Hello <board> & co" })]);
    expect(await changes(page)).toBe(3);
    await ui(page.locator(".wb-svg text").first()).toHaveText("Hello <board> & co");

    // Escape cancels the text and leaves the panel open; an empty field adds nothing.
    await click(page, 300, 800);
    await page.getByRole("textbox", { name: t.textLabel }).fill("gone");
    await page.keyboard.press("Escape");
    await click(page, 900, 800);
    await page.keyboard.press("Enter");
    expect((await board(page)).items).toHaveLength(1);
    expect(await page.evaluate(() => window.boardClosed)).toBe(false);

    await tool(page, t.note);
    await click(page, 900, 200);
    const note = page.getByRole("textbox", { name: t.noteLabel });
    await note.fill("Budget at most 4,000 euros");
    await note.press("Enter");
    b = await valid(page);
    expect(b.items[1]).toMatchObject({ kind: "note", x: near(900), y: near(200), text: "Budget at most 4,000 euros" });
    expect(await changes(page)).toBe(4);

    // Double-click edits, with any tool: the pen's first click on the note draws no dot.
    await tool(page, t.pen);
    await click(page, 950, 260, 2);
    const again = page.getByRole("textbox", { name: t.noteLabel });
    await ui(again).toHaveValue("Budget at most 4,000 euros");
    await again.fill("Budget 5,000 euros");
    await again.press("Enter");
    b = await valid(page);
    expect(b.items.map((i) => i.kind)).toEqual(["text", "note"]);
    expect(b.items[1]).toMatchObject({ text: "Budget 5,000 euros" });
    // Clicking away commits an open field (blur), once.
    await tool(page, t.text);
    await click(page, 300, 900);
    await page.getByRole("textbox", { name: t.textLabel }).fill("by blur");
    await click(page, 1300, 900);
    await ui(page.getByRole("textbox")).toHaveCount(0);
    b = await valid(page);
    expect(b.items.map((i) => "text" in i && i.text)).toEqual(["Hello <board> & co", "Budget 5,000 euros", "by blur"]);
    expect(await changes(page)).toBe(6);
  } finally {
    await page.context().close();
  }
}, 60_000);

it("erases a whole item, undoes it, and clears only after asking", async () => {
  const page = await open();
  try {
    await drag(page, [200, 300], [900, 300]);
    await drag(page, [200, 600], [900, 600]);
    expect((await board(page)).items).toHaveLength(2);
    await tool(page, t.eraser);
    await click(page, 550, 300);
    let b = await valid(page);
    expect(b.items).toHaveLength(1);
    expect(b.items[0].kind === "pen" && b.items[0].points[1]).toBe(600);

    await page.getByRole("button", { name: t.undo }).click();
    expect((await valid(page)).items).toHaveLength(2);

    // Dragging the eraser across both lines removes both in one step.
    await drag(page, [400, 200], [420, 700]);
    expect((await valid(page)).items).toHaveLength(0);
    await page.getByRole("button", { name: t.undo }).click();
    expect((await board(page)).items).toHaveLength(2);

    await page.getByRole("button", { name: t.clear }).click();
    const dialog = page.getByRole("dialog", { name: t.clearTitle });
    await ui(dialog).toBeVisible();
    await dialog.getByRole("button", { name: questionText.en.cancel }).click();
    expect((await board(page)).items).toHaveLength(2);
    await page.getByRole("button", { name: t.clear }).click();
    await page.getByRole("dialog", { name: t.clearTitle }).getByRole("button", { name: t.clearConfirm }).click();
    b = await valid(page);
    expect(b.items).toEqual([]);
    await ui(page.getByRole("button", { name: t.clear })).toBeDisabled();
    await page.getByRole("button", { name: t.undo }).click();
    expect((await board(page)).items).toHaveLength(2);
  } finally {
    await page.context().close();
  }
}, 60_000);

it("makes the board picture as a JPEG data URL under the byte cap", async () => {
  const page = await open({ query: "?sample" });
  try {
    for (const maxBytes of [280_000, 25_000]) {
      const picture = await page.evaluate((max) => window.picture(max), maxBytes);
      expect(picture.dataUrl.startsWith("data:image/jpeg;base64,")).toBe(true);
      expect(picture.bytes).toBeLessThanOrEqual(maxBytes);
      expect(Buffer.from(picture.dataUrl.slice(23), "base64").length).toBe(picture.bytes);
      expect(picture.width / picture.height).toBeCloseTo(1.6, 1);
      if (maxBytes === 280_000) expect([picture.width, picture.height]).toEqual([1568, 980]);
    }
  } finally {
    await page.context().close();
  }
}, 60_000);

for (const theme of ["light", "dark"] as const)
  for (const [width, height] of [
    [1280, 800],
    [375, 812],
  ])
    it(`${theme} at ${width} px: renders the board in the theme's colours, nothing scrolls sideways`, async () => {
      const page = await open({ width, height, query: `?sample${theme === "dark" ? "&dark" : ""}` });
      try {
        // Colour 0 is the theme's ink; the note's paper follows the theme.
        const colours = await page.evaluate(() => ({
          ink: getComputedStyle(document.querySelector('[data-id="room"] rect')!).stroke,
          note: getComputedStyle(document.querySelector('[data-id="n1"] rect')!).fill,
        }));
        expect(colours).toEqual(
          theme === "dark" ? { ink: "rgb(237, 237, 240)", note: "rgb(74, 67, 32)" } : { ink: "rgb(16, 24, 40)", note: "rgb(255, 246, 199)" },
        );
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
        const tools = (await page.getByRole("group", { name: t.tools }).boundingBox())!;
        expect(tools.x).toBeGreaterThanOrEqual(0);
        expect(tools.x + tools.width).toBeLessThanOrEqual(width);
        const minimum = width < 760 ? 44 : 36;
        for (const button of await page.locator(".whiteboard-panel button").all()) {
          const box = (await button.boundingBox())!;
          expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(minimum);
        }
        if (width < 760) expect(tools.width).toBeGreaterThan(tools.height);
        else expect(tools.height).toBeGreaterThan(tools.width);
        await page.screenshot({ path: `${SHOTS}/whiteboard-panel-${theme}-${width}.png` });
      } finally {
        await page.context().close();
      }
    }, 60_000);

it("speaks German with a German interface", async () => {
  const page = await open({ lang: "de" });
  try {
    const de = whiteboardText.de;
    await ui(page.getByRole("complementary", { name: de.title })).toBeVisible();
    for (const name of [de.undo, de.clear, de.close, de.pen, de.eraser, de.colourGreen])
      await ui(page.getByRole("button", { name, exact: true })).toBeAttached();
  } finally {
    await page.context().close();
  }
}, 60_000);
