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
      const live = page.getByRole("button", { name: "Voice conversation", exact: true });
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

describe.each([375, 1280])("left menu at %i px", (width) => {
  const menu = async (page: Page) => {
    const toggle = page.getByRole("button", { name: "Open navigation", exact: true });
    if (await toggle.isVisible().catch(() => false)) await toggle.click();
    const side = page.locator(".sidebar").first();
    await ui(side).toBeVisible();
    return side;
  };

  it("comet logo, quiet rows, slim search; search finds a chat and Recent/Archived switch", async () => {
    const { context, page } = await open(width);
    try {
      await send(page, "SYNTHETIC zebracanary lighthouse question");
      const side = await menu(page);
      // The logo is the comet drawing, not the old "C" square.
      await ui(side.locator(".brand svg.brand-mark circle")).toHaveCount(1);
      await ui(side.locator(".brand")).toHaveText("CometRow");
      // Secure Max sits right under Incognito chat, above Scheduled (owner, 18 November).
      const ys = await Promise.all([".new-incognito", ".secure-max-entry", ".scheduled-entry"].map((sel) => side.locator(sel).first().boundingBox()));
      expect(ys[0]!.y).toBeLessThan(ys[1]!.y);
      expect(ys[1]!.y).toBeLessThan(ys[2]!.y);
      expect(ys[1]!.y - (ys[0]!.y + ys[0]!.height)).toBeLessThanOrEqual(8);
      // The old explanatory line is gone; the Recent heading is only for screen readers.
      await ui(side.getByText("Group saved chats by project", { exact: false })).toHaveCount(0);
      // Rows are quiet: no fill until hover.
      const bg = await side.locator(".scheduled-entry").evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(bg === "rgba(0, 0, 0, 0)" || bg === "transparent").toBe(true);
      // The current chat is marked.
      const current = side.locator('.chat-list-row > button[aria-current="page"]');
      await ui(current).toHaveCount(1);
      expect(await current.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe("rgba(0, 0, 0, 0)");
      // Search: a slim field that filters the list.
      const search = side.getByLabel("Search chats", { exact: true });
      const h = (await search.boundingBox())!.height;
      expect(h).toBeLessThanOrEqual(40);
      await search.fill("zebracanary");
      await ui(side.locator(".chat-list-row")).toHaveCount(1);
      await search.fill("nothing-like-this-exists");
      await ui(side.getByText("No matching conversations.", { exact: true })).toBeVisible();
      await search.fill("");
      // Recent and Archived are two small tabs.
      await side.getByRole("button", { name: "Archived", exact: true }).click();
      await ui(side.getByRole("button", { name: "Archived", exact: true })).toHaveAttribute("aria-pressed", "true");
      await ui(side.locator(".chat-list-row")).toHaveCount(0);
      await side.getByRole("button", { name: "Recent", exact: true }).click();
      await ui(side.locator(".chat-list-row")).toHaveCount(1);
      expect(await noSidewaysScroll(page)).toBeLessThanOrEqual(0);
    } finally {
      await context.close();
    }
  });

  it("projects: + creates a project, which appears as a row and opens its screen", async () => {
    const { context, page } = await open(width);
    try {
      const side = await menu(page);
      await side.getByRole("button", { name: "Create project", exact: true }).click();
      await side.getByLabel("Project name", { exact: true }).fill("SYNTHETIC tax 2026");
      await side.getByRole("button", { name: "Create", exact: true }).click();
      await ui(page.locator(".project-row").filter({ hasText: "SYNTHETIC tax 2026" })).toHaveCount(1);
      // The new project opens its own screen, titled with its name.
      await ui(page.getByRole("heading", { name: "SYNTHETIC tax 2026" }).first()).toBeVisible();
    } finally {
      await context.close();
    }
  });

  it("account line opens its menu with Settings; on a phone the menu is a drawer that closes", async () => {
    const { context, page } = await open(width);
    try {
      const side = await menu(page);
      await side.getByRole("button", { name: "Account menu", exact: true }).or(side.getByLabel("Account menu", { exact: true })).first().click();
      await ui(side.getByRole("button", { name: "Settings", exact: true })).toBeVisible();
      await page.keyboard.press("Escape");
      if (width < 700) {
        const close = page.getByRole("button", { name: "Close navigation", exact: true });
        if (await close.isVisible().catch(() => false)) await close.click();
        await ui(page.locator("dialog.navigation-drawer[open]")).toHaveCount(0);
      }
    } finally {
      await context.close();
    }
  });
});

describe.each([375, 1280])("answers at %i px", (width) => {
  it("your message is a bubble without a name; answers have clean headings, lists and quotes", async () => {
    const { context, page } = await open(width);
    try {
      await send(page, "SYNTHETIC show me the markdown answer. audit:markdown");
      const mine = page.locator("article.user").last();
      await ui(mine).toContainText("SYNTHETIC show me the markdown answer");
      // "You" is for screen readers only; the bubble is the right-hand soft shape.
      const you = await mine.locator(".message-heading").evaluate((el) => el.getBoundingClientRect().width);
      expect(you).toBeLessThanOrEqual(1);
      const answer = page.locator("article.assistant").last();
      const h = answer.locator(".message-text h2").first();
      await ui(h).toBeVisible();
      expect(Number.parseFloat(await h.evaluate((el) => getComputedStyle(el).fontSize))).toBeLessThanOrEqual(19);
      await ui(answer.locator("blockquote")).toBeVisible();
      expect(await answer.locator("blockquote").evaluate((el) => getComputedStyle(el).borderLeftWidth)).toBe("3px");
      expect(await noSidewaysScroll(page)).toBeLessThanOrEqual(0);
    } finally {
      await context.close();
    }
  });

  it("code: a thin header with the language and a small Copy; tables are lines only", async () => {
    const { context, page } = await open(width);
    try {
      await send(page, "SYNTHETIC code please. audit:code");
      const block = page.locator("article.assistant").last().locator(".code-block").first();
      const copy = block.locator(".code-block-toolbar button");
      await ui(copy).toBeVisible();
      // The block re-renders once the answer is complete: read its size when it is there.
      await expect.poll(async () => (await copy.boundingBox())?.height ?? 999).toBeLessThanOrEqual(30);
      await ui(block.locator(".code-block-toolbar span").first()).not.toBeEmpty();
      await send(page, "SYNTHETIC a table please. audit:table");
      const cell = page.locator("article.assistant").last().locator(".answer-table td").first();
      const borders = await cell.evaluate((el) => {
        const s = getComputedStyle(el);
        return [s.borderLeftWidth, s.borderRightWidth, s.borderBottomWidth];
      });
      expect(borders).toEqual(["0px", "0px", "1px"]);
      expect(await noSidewaysScroll(page)).toBeLessThanOrEqual(0);
    } finally {
      await context.close();
    }
  });

  it("a chart block becomes a bar chart with the numbers for screen readers; a broken one stays code", async () => {
    const { context, page } = await open(width);
    try {
      await send(page, "SYNTHETIC how did my savings grow? audit:chart");
      const answer = page.locator("article.assistant").last();
      const chart = answer.locator("figure.answer-chart");
      await ui(chart).toHaveCount(1);
      await ui(chart.locator("figcaption")).toContainText("Savings at year end");
      // A line over time, its highest point marked, the source under it.
      await ui(chart).toHaveAttribute("data-type", "line");
      await ui(chart.locator("polyline.line")).toHaveCount(1);
      await ui(chart.locator("circle.dot")).toHaveCount(5);
      await ui(chart.locator("circle.dot.top")).toHaveCount(1);
      await ui(chart.locator(".answer-chart-source")).toHaveText("Source: your uploaded bank statements");
      await ui(chart.locator("table.sr-only tr")).toHaveCount(5);
      await ui(chart.locator("table.sr-only")).toContainText("9,850");
      // The invalid block (a negative number) is shown as code, not drawn.
      await ui(answer.locator(".code-block")).toHaveCount(1);
      const box = (await chart.boundingBox())!;
      expect(box.x + box.width).toBeLessThanOrEqual(width);
    } finally {
      await context.close();
    }
  });
});

describe("phone", () => {
  it("the \"+\" menu is a small panel above \"+\" (not a full-width sheet); rows are 44 px; it works and closes", async () => {
    const { context, page } = await open(375);
    try {
      const plus = page.getByLabel("Attachments and tools", { exact: true });
      await plus.click();
      const panel = page.locator(".tools-menu .menu-surface");
      await ui(panel).toBeVisible();
      await panel.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
      const box = (await panel.boundingBox())!;
      const plusBox = (await plus.boundingBox())!;
      expect(box.width).toBeLessThanOrEqual(300);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(375);
      expect(box.y + box.height).toBeLessThanOrEqual(plusBox.y);
      for (const row of await panel.locator(":scope > button").all()) expect((await row.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await panel.getByRole("button", { name: "Photo to text", exact: false }).click();
      await ui(page.getByRole("dialog").filter({ hasText: "Photo to text" })).toBeVisible();
      await page.keyboard.press("Escape");
      await plus.click();
      await ui(panel).toBeVisible();
      await page.mouse.click(180, 150);
      await ui(panel).toBeHidden();
      expect(await noSidewaysScroll(page)).toBeLessThanOrEqual(0);
    } finally {
      await context.close();
    }
  });
});

describe.each([375, 1280])("settings at %i px", (width) => {
  it("opens from the account line, switches sections, changes the theme at once and closes", async () => {
    const { context, page } = await open(width);
    try {
      const toggle = page.getByRole("button", { name: "Open navigation", exact: true });
      if (await toggle.isVisible().catch(() => false)) await toggle.click();
      await page.getByLabel("Account menu", { exact: true }).first().click();
      await page.getByRole("button", { name: "Settings", exact: true }).click();
      const dialog = page.locator("dialog.settings-dialog[open]");
      await ui(dialog).toBeVisible();
      const nav = dialog.locator(".settings-layout > nav");
      for (const name of ["Data controls", "Security", "General"]) {
        await nav.getByRole("button", { name, exact: true }).click();
        await ui(nav.getByRole("button", { name, exact: true })).toHaveAttribute("aria-current", "page");
        await ui(dialog.locator(".settings-content > h3")).toHaveText(name);
      }
      // Actions look like buttons, not bare text.
      await nav.getByRole("button", { name: "Data controls", exact: true }).click();
      const download = dialog.getByRole("button", { name: "Download as Markdown", exact: true });
      await ui(download).toBeVisible();
      expect(await download.evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe("1px");
      // The theme changes at once.
      await nav.getByRole("button", { name: "General", exact: true }).click();
      await dialog.getByLabel("Appearance", { exact: true }).selectOption("dark");
      await ui(page.locator(".chat-design.app-shell")).toHaveAttribute("data-theme", "dark");
      await dialog.getByLabel("Appearance", { exact: true }).selectOption("light");
      await ui(page.locator(".chat-design.app-shell")).toHaveAttribute("data-theme", "light");
      await page.keyboard.press("Escape");
      await ui(dialog).toHaveCount(0);
      expect(await noSidewaysScroll(page)).toBeLessThanOrEqual(0);
    } finally {
      await context.close();
    }
  });
});

describe.each([375, 1280])("upload screens at %i px", (width) => {
  it("Photo to text: camera and photo as two tiles side by side; Escape closes", async () => {
    const { context, page } = await open(width);
    try {
      await page.getByLabel("Attachments and tools", { exact: true }).click();
      await page.locator(".tools-menu .menu-surface").getByRole("button", { name: "Photo to text", exact: false }).click();
      const dialog = page.getByRole("dialog").filter({ hasText: "Photo to text" });
      await ui(dialog).toBeVisible();
      const camera = dialog.getByRole("button", { name: "Use camera", exact: true });
      const photo = dialog.getByRole("button", { name: "Choose photo", exact: true });
      const [a, b] = [(await camera.boundingBox())!, (await photo.boundingBox())!];
      expect(Math.abs(a.y - b.y)).toBeLessThanOrEqual(1);
      expect(a.x + a.width).toBeLessThanOrEqual(b.x);
      expect(a.height).toBeGreaterThanOrEqual(80);
      const d = (await dialog.boundingBox())!;
      expect(d.x).toBeGreaterThanOrEqual(0);
      expect(d.x + d.width).toBeLessThanOrEqual(width);
      await page.keyboard.press("Escape");
      await ui(dialog).toBeHidden();
    } finally {
      await context.close();
    }
  });
});

describe.each([375, 1280])("live voice at %i px", (width) => {
  it("the panel shows the round colour ball, resting until a turn starts; it closes again", async () => {
    const { context, page } = await open(width);
    try {
      await page.getByRole("button", { name: "Voice conversation", exact: true }).click();
      const panel = page.locator("section.live-voice");
      await ui(panel).toBeVisible();
      const orb = panel.locator(".live-voice-orb");
      await ui(orb).toBeVisible();
      const box = (await orb.boundingBox())!;
      expect(Math.abs(box.width - box.height)).toBeLessThanOrEqual(1);
      expect(box.width).toBeGreaterThanOrEqual(100);
      expect(await orb.evaluate((el) => getComputedStyle(el).borderRadius)).toBe("50%");
      // At rest before a turn: no moving parts.
      expect(await orb.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
      const p = (await panel.boundingBox())!;
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x + p.width).toBeLessThanOrEqual(width);
      await page.keyboard.press("Escape");
      await ui(panel).toHaveCount(0);
    } finally {
      await context.close();
    }
  });
});

it("live voice ball: it moves while listening and stands still under reduced motion", async () => {
  const { context, page } = await open(1280);
  try {
    await page.getByRole("button", { name: "Voice conversation", exact: true }).click();
    const orb = page.locator("section.live-voice .live-voice-orb");
    await ui(orb).toBeVisible();
    await orb.evaluate((el) => el.setAttribute("data-phase", "listening"));
    expect(await orb.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBeGreaterThan(0);
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(await orb.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
  } finally {
    await context.close();
  }
});

describe.each([375, 1280])("states and dialogs at %i px", (width) => {
  it("a failed answer is a calm rounded note; What this means opens", async () => {
    const { context, page } = await open(width);
    try {
      await send(page, "SYNTHETIC busy please. audit:error-429");
      const note = page.locator("article.assistant").last().locator(".failure-note");
      await ui(note).toContainText("The service is busy right now");
      expect(await note.evaluate((el) => getComputedStyle(el).borderTopLeftRadius)).toBe("12px");
      await note.getByText("What this means", { exact: true }).click();
      await ui(note.locator("details")).toHaveAttribute("open", "");
      expect(await noSidewaysScroll(page)).toBeLessThanOrEqual(0);
    } finally {
      await context.close();
    }
  });

  it("Secure Max opens as a rounded dialog; its button waits for the tick; Cancel closes", async () => {
    const { context, page } = await open(width);
    try {
      const toggle = page.getByRole("button", { name: "Open navigation", exact: true });
      if (await toggle.isVisible().catch(() => false)) await toggle.click();
      await page.locator(".secure-max-entry").first().click();
      // On a phone the menu drawer is a dialog too and holds this one: take the innermost.
      const dialog = page.getByRole("dialog").filter({ has: page.getByRole("heading", { name: "Open Secure Max?" }) }).last();
      await ui(dialog).toBeVisible();
      expect(await dialog.evaluate((el) => getComputedStyle(el).borderTopLeftRadius)).toBe("18px");
      const use = dialog.getByRole("button", { name: "Use Secure Max", exact: true });
      await ui(use).toBeDisabled();
      await dialog.getByRole("checkbox", { name: "I understand that CometRow cannot recover this data for me." }).check();
      await ui(use).toBeEnabled();
      const d = (await dialog.boundingBox())!;
      expect(d.x).toBeGreaterThanOrEqual(0);
      expect(d.x + d.width).toBeLessThanOrEqual(width);
      await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
      await ui(dialog).toBeHidden();
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
