// UI redesign (docs/ui-redesign-plan-20261116.md): each rebuilt feature, clicked through like a user,
// in the real app with every feature switched on and the AI's answers faked (evaluation/audit-harness.ts).
// Results per run go to docs/ui-redesign-log.md by hand. Synthetic data only; no request leaves localhost.
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { chromium, expect as ui, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { buildClient, startServer } from "../evaluation/audit-harness";
import { installFakes, type Fakes } from "../evaluation/audit-fakes";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";

// Each case clicks through a whole feature, sends included.
vi.setConfig({ testTimeout: 90_000 });

let origin = "";
let server: Server;
let browser: Browser;

beforeAll(async () => {
  const client = await buildClient("on");
  ({ origin, server } = await startServer("on", client));
  browser = await chromium.launch({
    ...browserLaunchOptions(),
    // A dead proxy for every non-local host: nothing can leave the machine.
    proxy: { server: "http://127.0.0.1:9", bypass: "localhost,127.0.0.1" },
  });
}, 300_000);

afterAll(async () => {
  await browser?.close();
  server?.close();
});

async function open(width: number, theme: "light" | "dark" = "light") {
  const context: BrowserContext = await browser.newContext({
    viewport: { width, height: width < 700 ? 812 : 900 },
    colorScheme: theme,
    ...(width < 700 ? { hasTouch: true, isMobile: true } : {}),
  });
  context.setDefaultTimeout(8000);
  await context.addCookies([{ name: "audit-account", value: randomUUID(), url: origin }]);
  const fakes: Fakes = await installFakes(context, { origin, config: "on" });
  const page: Page = await context.newPage();
  page.on("dialog", (d) => void (d.type() === "beforeunload" ? d.accept() : d.dismiss()).catch(() => {}));
  await page.goto(origin + "/", { waitUntil: "domcontentloaded" });
  await page.locator(".app-shell").waitFor({ state: "visible", timeout: 30_000 });
  return { context, page, fakes };
}

/** Sends through the Send button and waits until the answer has finished. */
async function send(page: Page, text: string) {
  const before = await page.locator("article.assistant").count();
  await page.getByLabel("Message CometRow", { exact: true }).fill(text);
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  const agree = page.getByRole("button", { name: "I agree", exact: true });
  if (await agree.waitFor({ timeout: 1500 }).then(() => true, () => false)) await agree.click();
  await page.waitForFunction((n) => document.querySelectorAll("article.assistant").length > n, before, { timeout: 30_000 });
  await page.getByRole("button", { name: "Stop response", exact: true }).waitFor({ state: "hidden", timeout: 30_000 });
}

const noSidewaysScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

describe.each([375, 1280])("chat screen and message box at %i px", (width) => {
  it("start screen: one greeting and three chips; a chip fills the box", async () => {
    const { context, page } = await open(width);
    try {
      await ui(page.getByRole("heading", { name: "What’s on your mind?" })).toBeVisible();
      for (const old of ["A LITTLE CLARITY", "Make room for", "Think through a decision"])
        await ui(page.getByText(old, { exact: false })).toHaveCount(0);
      const chips = page.locator(".starter-grid button");
      await ui(chips).toHaveCount(3);
      await ui(chips.first().locator("svg")).toHaveCount(1);
      await chips.filter({ hasText: "Write or revise" }).click();
      await ui(page.getByLabel("Message CometRow", { exact: true })).toHaveValue(/Help me write a clear, friendly message/);
      expect(await noSidewaysScroll(page)).toBeLessThanOrEqual(0);
    } finally {
      await context.close();
    }
  });

  it("message box on one line: live voice at the end while empty, the arrow in its place once there is text; sending answers and clears the start screen", async () => {
    const { context, page } = await open(width);
    try {
      const box = page.getByLabel("Message CometRow", { exact: true });
      const sendButton = page.getByRole("button", { name: "Send message", exact: true });
      const live = page.getByRole("button", { name: "Live voice conversation", exact: true });
      const plus = page.getByLabel("Attachments and tools", { exact: true });
      await ui(box).toHaveAttribute("placeholder", "Ask anything");
      await ui(sendButton).toBeHidden();
      await ui(live).toBeVisible();
      await ui(page.getByRole("button", { name: "Dictate with the microphone", exact: true })).toBeVisible();
      // One row: "+", the text, the mode and the end button share a line, in that order.
      const row = await Promise.all([plus, box, page.getByLabel("Answer mode", { exact: true }), live].map((l) => l.boundingBox()));
      const middles = row.map((b) => b!.y + b!.height / 2);
      expect(Math.max(...middles) - Math.min(...middles)).toBeLessThanOrEqual(12);
      expect(row[0]!.x).toBeLessThan(row[1]!.x);
      expect(row[1]!.x).toBeLessThan(row[2]!.x);
      expect(row[2]!.x).toBeLessThan(row[3]!.x);
      const liveBox = row[3]!;
      await box.fill("SYNTHETIC hello");
      await ui(sendButton).toBeVisible();
      await ui(live).toBeHidden();
      // The arrow takes live voice's place.
      await sendButton.evaluate((el) => Promise.all(el.getAnimations().map((x) => x.finished)));
      const arrowAt = (await sendButton.boundingBox())!;
      expect(Math.abs(arrowAt.x + arrowAt.width - (liveBox.x + liveBox.width))).toBeLessThanOrEqual(2);
      await ui(sendButton).not.toContainText("Send");
      // Measured after its short appear animation (it grows in from 85 %).
      await sendButton.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
      const round = (await sendButton.boundingBox())!;
      expect(Math.abs(round.width - round.height)).toBeLessThanOrEqual(1);
      expect(round.width).toBeGreaterThanOrEqual(width < 700 ? 44 : 32);
      await box.fill("");
      await ui(sendButton).toBeHidden();
      await ui(live).toBeVisible();
      // Long text grows the box upwards; the buttons stay on its bottom row.
      await box.fill("SYNTHETIC line one\nline two\nline three\nline four");
      const tall = (await box.boundingBox())!;
      expect(tall.height).toBeGreaterThan(60);
      const plusAfter = (await plus.boundingBox())!;
      expect(Math.abs(plusAfter.y + plusAfter.height - (tall.y + tall.height))).toBeLessThanOrEqual(12);
      await box.fill("");

      // While the answer streams, Stop is a round square in the same place.
      await box.fill("SYNTHETIC what is two plus two?");
      await sendButton.click();
      const agree = page.getByRole("button", { name: "I agree", exact: true });
      if (await agree.waitFor({ timeout: 1500 }).then(() => true, () => false)) await agree.click();
      await page.waitForFunction(() => document.querySelectorAll("article.assistant").length > 0, undefined, { timeout: 30_000 });
      await page.getByRole("button", { name: "Stop response", exact: true }).waitFor({ state: "hidden", timeout: 30_000 });
      await ui(page.locator("article.assistant").last()).not.toBeEmpty();
      await ui(page.getByRole("heading", { name: "What’s on your mind?" })).toHaveCount(0);
      await ui(page.locator(".starter-grid")).toHaveCount(0);
      await ui(box).toHaveValue("");
      await ui(sendButton).toBeHidden();
      // The Enter hint is gone; the AI line stays.
      await ui(page.getByText("Enter sends", { exact: false })).toBeHidden();
      await ui(page.locator(".composer-caption")).toContainText("Answers come from an AI");

      // With a keyboard, Enter sends too (on a touch phone Enter makes a new line, by design).
      if (width > 700) {
        const before = await page.locator("article.assistant").count();
        await box.fill("SYNTHETIC and three plus three?");
        await box.press("Enter");
        await page.waitForFunction((n) => document.querySelectorAll("article.assistant").length > n, before, { timeout: 30_000 });
      }
      expect(await noSidewaysScroll(page)).toBeLessThanOrEqual(0);
    } finally {
      await context.close();
    }
  });

  it("answer mode is a small text control and remembers the choice", async () => {
    const { context, page } = await open(width);
    try {
      const mode = page.getByLabel("Answer mode", { exact: true });
      await ui(mode).toBeVisible();
      const look = await mode.evaluate((el) => {
        const s = getComputedStyle(el);
        return { border: s.borderTopWidth, height: el.getBoundingClientRect().height };
      });
      expect(look.border).toBe("0px");
      expect(look.height).toBeLessThanOrEqual(44);
      await mode.selectOption("thinking");
      await page.reload({ waitUntil: "domcontentloaded" });
      await ui(page.getByLabel("Answer mode", { exact: true })).toHaveValue("thinking");
    } finally {
      await context.close();
    }
  });

  it("\"+\" menu: a panel of icon rows that opens, works and closes", async () => {
    const { context, page } = await open(width);
    try {
      const plus = page.getByLabel("Attachments and tools", { exact: true });
      await plus.click();
      const panel = page.locator(".tools-menu .menu-surface");
      await ui(panel).toBeVisible();
      const rows = panel.locator(":scope > button");
      await ui(page.locator(".composer .context-count")).toHaveCount(0);
      expect(await rows.count()).toBeGreaterThanOrEqual(4);
      for (const name of ["Attach file", "Photo to text", "Conversation files"])
        await ui(panel.getByRole("button", { name, exact: false })).toBeVisible();
      // Every row has its icon, and rows are dark text, not link-coloured.
      expect(await rows.evaluateAll((all) => all.every((b) => b.querySelector("svg")))).toBe(true);
      const colours = await rows.first().evaluate((b) => [getComputedStyle(b).color, getComputedStyle(document.querySelector(".chat-design")!).color]);
      expect(colours[0]).toBe(colours[1]);
      await page.keyboard.press("Escape");
      await ui(panel).toBeHidden();
      // A row does its job: Photo to text opens its dialog.
      await plus.click();
      await panel.getByRole("button", { name: "Photo to text", exact: false }).click();
      await ui(page.getByRole("dialog").filter({ hasText: "Photo to text" })).toBeVisible();
    } finally {
      await context.close();
    }
  });

  it("sidebar: New chat is a quiet row and starts a fresh chat", async () => {
    const { context, page } = await open(width);
    try {
      await send(page, "SYNTHETIC first chat");
      const toggle = page.getByRole("button", { name: "Open navigation", exact: true });
      if (await toggle.isVisible().catch(() => false)) await toggle.click();
      const newChat = page.locator(".new-chat-row .new-chat:not(.new-incognito)");
      await ui(newChat).toBeVisible();
      const bg = await newChat.evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(bg === "rgba(0, 0, 0, 0)" || bg === "transparent").toBe(true);
      await newChat.click();
      await ui(page.getByRole("heading", { name: "What’s on your mind?" })).toBeVisible();
      await ui(page.locator("article.assistant")).toHaveCount(0);
    } finally {
      await context.close();
    }
  });
});

it("dark theme: the same screen renders with the dark tokens and stays readable", async () => {
  const { context, page } = await open(1280, "dark");
  try {
    // Appearance "System" follows the browser's dark preference.
    const shell = page.locator(".chat-design.app-shell");
    await ui(shell).toHaveAttribute("data-theme", "dark");
    expect(await shell.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(27, 27, 30)");
    await ui(page.getByRole("heading", { name: "What’s on your mind?" })).toBeVisible();
    await send(page, "SYNTHETIC dark check");
    await ui(page.locator("article.assistant").last()).not.toBeEmpty();
  } finally {
    await context.close();
  }
});
