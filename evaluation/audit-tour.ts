// The audit tour (evaluation/audit-harness.ts): opens every screen and state it can reach, one
// screenshot each, per browser, width and language. Labels come from the app's own English and
// German text (src/text/*), so the same steps run in both languages. A failed step is recorded and
// the tour goes on: a missing screen is a finding, not a crash.
import { readdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import type { Browser, BrowserContext, BrowserType, Locator, Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { appText } from "../src/text/app";
import { installFakes, type AnswerName, type AuditConfig, type Fakes } from "./audit-fakes";

type Lang = "en" | "de";
export interface Entry {
  n: number;
  screen: string;
  browser: string;
  width: number;
  lang: Lang;
  file: string;
  url: string;
  clicked: string[];
  error?: string;
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
  nonLocal: string[];
  overflowPx: number;
  outside: string[];
  /** Elements whose content is wider than their box: cut off (hidden/clip) or scrolling sideways (auto/scroll). */
  wide: string[];
  /** How far the scrolling area (main, or an open dialog) continues below the screenshot. */
  belowFoldPx: number;
  germanOff?: boolean;
  /** axe-core violations (--axe): rule id, impact, how many elements, the first selectors. */
  axe?: { id: string; impact: string | null; nodes: number; targets: string[]; summary?: string }[];
}

/** English label -> German label, from every src/text module and the health consent text. */
export async function dictionary(): Promise<Map<string, string[]>> {
  // An English label can have several German texts in different modules: keep them all.
  const map = new Map<string, string[]>();
  const add = (en: string, de: string) => map.set(en, [...new Set([...(map.get(en) ?? []), de])]);
  const files = readdirSync("src/text").filter((f) => f.endsWith(".ts")).map((f) => `src/text/${f}`);
  for (const file of files) {
    const module = (await import(pathToFileURL(resolve(file)).href)) as Record<string, unknown>;
    for (const value of Object.values(module)) {
      const v = value as { en?: Record<string, unknown>; de?: Record<string, unknown> } | null;
      if (!v || typeof v !== "object" || typeof v.en !== "object" || typeof v.de !== "object") continue;
      for (const [key, en] of Object.entries(v.en!))
        if (typeof en === "string" && typeof v.de![key] === "string") add(en, v.de![key] as string);
    }
  }
  return map;
}

/** Runs in the page: page overflow and visible elements outside the viewport (as evaluation/ui-sweep.ts). */
const MEASURE = `(() => {
  const vw = document.documentElement.clientWidth;
  const visible = (el) => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return s.visibility !== "hidden" && s.display !== "none" && r.width > 0 && r.height > 0 && Number(s.opacity) > 0; };
  const clipped = (el) => { for (let e = el.parentElement; e; e = e.parentElement) { const o = getComputedStyle(e).overflowX; if (o !== "visible") return true; } return false; };
  const name = (el) => el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\\s+/).slice(0, 2).join(".") : "") + ' "' + (el.textContent || "").trim().slice(0, 40) + '"';
  const outside = [...document.querySelectorAll("body *")].filter((el) => visible(el) && !clipped(el)).filter((el) => { const r = el.getBoundingClientRect(); return r.right > vw + 1 || r.left < -1; }).map(name);
  const wide = [...document.querySelectorAll("body *")]
    .filter((el) => !["TEXTAREA", "INPUT", "SELECT", "DETAILS", "PRE"].includes(el.tagName) && !el.closest(".sr-only, .katex, pre, .answer-table") && getComputedStyle(el).textOverflow !== "ellipsis" && visible(el) && el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0)
    .map((el) => name(el) + " +" + (el.scrollWidth - el.clientWidth) + "px " + getComputedStyle(el).overflowX);
  // The app scrolls inside <main> (and inside an open dialog), not the document: measure all three.
  const boxes = [document.documentElement, document.querySelector("main"), ...document.querySelectorAll("dialog[open]")].filter(Boolean);
  const overflowPx = Math.max(...boxes.map((el) => el.scrollWidth - el.clientWidth));
  const scroller = [...document.querySelectorAll("dialog[open]")].at(-1) || document.querySelector("main") || document.documentElement;
  return { overflowPx, outside: [...new Set(outside)].slice(0, 10), wide: [...new Set(wide)].slice(0, 12), belowFoldPx: Math.max(0, scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight) };
})()`;

interface Ctx {
  page: Page;
  context: BrowserContext;
  browser: Browser;
  fakes: Fakes;
  origin: string;
  config: AuditConfig;
  lang: Lang;
  width: number;
  /** The label in the page's language: a string, or an exact-match pattern when German has several texts. */
  tr: (en: string) => string | RegExp;
  /** Every text the label may have in the page's language. */
  alts: (en: string) => string[];
  /** The language the page really shows ("en" when the build has no German). */
  germanOff: () => boolean;
  click: (name: string, role?: "button" | "link" | "checkbox" | "tab" | "menuitem") => Promise<void>;
  label: (name: string) => Locator;
  fresh: (path?: string) => Promise<void>;
  /** Opens the navigation drawer on narrow screens; unlocks the local vault unless `unlock` is false. */
  nav: (unlock?: boolean) => Promise<void>;
  send: (text: string, answer?: AnswerName, wait?: boolean) => Promise<void>;
  /** fullPage for pages that scroll the document (outside the app shell). */
  shot: (screen: string, fullPage?: boolean) => Promise<void>;
  /** Records a part of the step left out on purpose (listed in the report with its reason). */
  skip: (reason: string) => void;
  clicked: string[];
}
type Step = [screen: string, run: (c: Ctx) => Promise<void>, only?: AuditConfig];

const vis = (l: Locator) => l.filter({ visible: true }).first();
const pause = (page: Page, ms: number) => page.waitForTimeout(ms);

/** The "···" conversation menu: a <summary> with an aria-label, not a button role. */
async function conversationMenu(c: Ctx, item?: string) {
  await c.label("Conversation actions").click();
  c.clicked.push("Conversation actions");
  if (item) await vis(c.page.locator(".conversation-menu").getByRole("button", { name: c.tr(item), exact: true })).click(), c.clicked.push(item);
  await pause(c.page, 400);
}
/** Settings opens from the account menu only (SS-15). */
async function settings(c: Ctx, section?: string) {
  await accountMenu(c, "Settings");
  if (section) await c.click(section);
  await pause(c.page, 500);
}
async function accountMenu(c: Ctx, item?: string) {
  await c.nav();
  await vis(c.page.locator(".account-menu summary")).click();
  c.clicked.push("Account menu");
  if (item) await vis(c.page.locator(".account-menu").getByRole("button", { name: c.tr(item), exact: true })).click(), c.clicked.push(item);
  await pause(c.page, 500);
}
async function tools(c: Ctx, item?: string) {
  await c.page.getByLabel(c.tr("Attachments and tools"), { exact: true }).click();
  c.clicked.push("Attachments and tools");
  if (item) await vis(c.page.locator(".tools-menu").getByRole("button", { name: c.tr(item), exact: true })).click(), c.clicked.push(item);
  await pause(c.page, 500);
}
async function answer(c: Ctx, name: AnswerName, shotName = `answer-${name}`) {
  await c.fresh();
  await c.send(`Show me the ${name} answer. audit:${name}`, undefined, true);
  await c.shot(shotName);
}

const STEPS: Step[] = [
  ["empty-new-chat", async (c) => { await c.fresh(); await c.shot("empty-new-chat"); }],
  ["first-send", async (c) => {
    // The first message in a fresh browser goes straight out: no consent step (owner, 18 November).
    await c.fresh();
    await c.label("Message CometRow").fill("Hello, a first question.");
    await c.click("Send message");
    await pause(c.page, 800);
    await c.shot("first-send");
  }],
  ["answer-markdown", (c) => answer(c, "markdown")],
  ["answer-code", (c) => answer(c, "code")],
  ["answer-math", (c) => answer(c, "math")],
  ["answer-table", (c) => answer(c, "table")],
  ["answer-long", (c) => answer(c, "long")],
  ["answer-slow-first-token", async (c) => {
    await c.fresh();
    await c.send("A slow one. audit:slow", undefined, false);
    await pause(c.page, 2500);
    await c.shot("answer-slow-waiting");
  }],
  ["answer-error-429", (c) => answer(c, "error-429")],
  ["answer-error-500", (c) => answer(c, "error-500")],
  ["answer-error-503", (c) => answer(c, "error-503")],
  ["answer-dropped", (c) => answer(c, "dropped")],
  ["answer-stopped", async (c) => {
    await c.fresh();
    await c.send("Stream slowly. audit:stop", undefined, false);
    await pause(c.page, 2500);
    await c.shot("answer-streaming");
    await c.click("Stop response");
    await pause(c.page, 1000);
    await c.shot("answer-stopped");
  }],
  ["message-actions", async (c) => {
    await c.fresh();
    await c.send("Message actions. audit:markdown", undefined, true);
    await c.context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: c.origin }).catch(() => {});
    await c.click("Copy answer");
    await pause(c.page, 300);
    await c.shot("message-copied");
    await c.click("Retry");
    await pause(c.page, 300);
    await c.shot("message-retry-menu");
    await vis(c.page.getByRole("menuitem", { name: new RegExp(`^(${c.alts("Retry last response").join("|")})`) })).click();
    c.clicked.push("Retry last response");
    await pause(c.page, 2000);
    await c.shot("message-retried-versions");
    await vis(c.page.getByRole("button", { name: c.tr("Edit into a new branch") })).click();
    c.clicked.push("Edit");
    await pause(c.page, 500);
    await c.shot("message-edit");
  }],
  ["answer-again-thinking", async (c) => {
    await c.fresh();
    await c.send("Quick one. audit:plain", undefined, true);
    await c.click("Retry");
    await vis(c.page.getByRole("menuitem", { name: new RegExp(`^(${c.alts("Answer again with Thinking").join("|")})`) })).click();
    await pause(c.page, 2000);
    await c.shot("answer-again-thinking");
  }],
  ["report-problem", async (c) => {
    await c.fresh();
    await c.send("Report this. audit:plain", undefined, true);
    await vis(c.page.locator("article.assistant").last().getByRole("button", { name: c.tr("More actions"), exact: true })).click();
    c.clicked.push("More actions");
    await vis(c.page.getByRole("menuitem", { name: c.tr("Report a problem with this answer") })).click();
    await pause(c.page, 600);
    await c.shot("report-problem");
  }],
  ["plus-menu", async (c) => { await c.fresh(); await tools(c); await c.shot("plus-menu"); }],
  ["mode-thinking", async (c) => {
    await c.fresh();
    await c.page.getByRole("combobox", { name: c.tr("Answer mode") }).selectOption("thinking");
    c.clicked.push("Answer mode: Thinking");
    await c.shot("mode-thinking");
    await c.page.getByRole("combobox", { name: c.tr("Answer mode") }).selectOption("auto");
  }],
  ["attach-file", async (c) => {
    await c.fresh();
    await tools(c);
    const chooser = c.page.waitForEvent("filechooser", { timeout: 5000 });
    await c.click("Attach file");
    await (await chooser).setFiles([
      { name: "synthetic-notes.txt", mimeType: "text/plain", buffer: Buffer.from("Synthetic notes.\nThe rent is 900 EUR per month.\n") },
      { name: "synthetic-table.csv", mimeType: "text/csv", buffer: Buffer.from("name,amount\nrent,900\npower,60\n") },
    ]);
    await pause(c.page, 1500);
    await c.shot("attach-file");
  }],
  ["photo-to-text", async (c) => { await c.fresh(); await tools(c, "Photo to text"); await c.shot("photo-to-text"); }],
  ["image-question", async (c) => {
    await c.fresh();
    await tools(c);
    await c.click("Ask about a picture");
    await pause(c.page, 500);
    await c.shot("image-question-consent");
    // Since 17 November the dialog opens straight at the choice (no intro step); older builds had one.
    const intro = vis(c.page.getByRole("button", { name: c.tr("Choose a picture"), exact: true }));
    if (await intro.waitFor({ timeout: 1500 }).then(() => true, () => false)) await intro.click();
    const chooser = c.page.waitForEvent("filechooser", { timeout: 5000 });
    await c.click("Choose photo");
    // A real PNG drawn in the page: a coloured square and printed synthetic text.
    const png = await c.page.evaluate(() => {
      const canvas = document.createElement("canvas");
      [canvas.width, canvas.height] = [480, 300];
      const g = canvas.getContext("2d")!;
      g.fillStyle = "#fff"; g.fillRect(0, 0, 480, 300);
      g.fillStyle = "#3366cc"; g.fillRect(40, 60, 160, 160);
      g.fillStyle = "#000"; g.font = "28px sans-serif"; g.fillText("SYNTHETIC 12345", 220, 150);
      return canvas.toDataURL("image/png").split(",")[1];
    });
    await (await chooser).setFiles([{ name: "synthetic-pattern.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") }]);
    await pause(c.page, 1500);
    await c.shot("image-question-crop");
    // The steps after cropping; each only if the app shows it.
    for (const [name, screen] of [["Next: cover private parts", "image-question-cover"], ["Next: check the picture", "image-question-check"], ["Attach to my message", "image-question-attached"]]) {
      const button = vis(c.page.getByRole("button", { name: c.tr(name), exact: true }));
      if (!(await button.waitFor({ timeout: 4000 }).then(() => true, () => false))) {
        c.skip(`"${name}" not shown by this build (the picture needs no such step)`);
        continue;
      }
      await button.click();
      c.clicked.push(name);
      await pause(c.page, 1200);
      await c.shot(screen);
    }
    await c.send("What is in this picture? audit:image", undefined, true);
    await c.shot("image-question-answer");
  }, "on"],
  ["context-review", async (c) => {
    await c.fresh();
    // An empty chat shows no context count (16 November): the review opens from "+".
    await tools(c);
    await vis(c.page.locator(".tools-menu").getByRole("button", { name: new RegExp(`^${appText[c.germanOff() ? "en" : c.lang].reviewContext}`) })).click();
    c.clicked.push("Review context");
    await c.shot("context-review");
  }],
  ["conversation-files", async (c) => { await c.fresh(); await tools(c, "Conversation files"); await c.shot("conversation-files"); }],
  ["voice-dictation", async (c) => {
    await c.fresh();
    await c.click("Dictate with the microphone");
    await pause(c.page, 600);
    await c.shot("voice-note");
    // Chromium only: a fake microphone (launch flags); the transcription is faked.
    if (c.browser.browserType().name() !== "chromium") return c.skip("recording and transcription need Chromium's fake microphone");
    // Since 17 November dictation starts at once (no note with a Start button); older builds had one.
    const start = vis(c.page.getByRole("button", { name: c.tr("Start recording"), exact: true }));
    if (await start.waitFor({ timeout: 1500 }).then(() => true, () => false)) await start.click();
    await pause(c.page, 2500);
    await c.shot("voice-recording");
    await c.click("Stop recording");
    await pause(c.page, 2000);
    await c.shot("voice-transcribed");
  }, "on"],
  ["live-voice", async (c) => { await c.fresh(); await c.click("Voice conversation"); await pause(c.page, 800); await c.shot("live-voice"); }, "on"],
  ["web-search", async (c) => {
    // Search is automatic (owner, 19 November): a time-sensitive question is searched at once, the answer
    // carries one quiet "Searched the web" line, and opening it shows the searched text and the sources.
    await c.fresh();
    await c.send(
      `${c.lang === "de" && !c.germanOff() ? "Wie lang ist die aktuelle Kündigungsfrist für Mieter?" : "What is the current notice period for tenants?"} audit:citations`,
      undefined,
      true,
    );
    await vis(c.page.locator(".searched-web summary")).waitFor({ timeout: 15000 });
    await c.shot("web-search-answer");
    await c.page.locator(".searched-web summary").last().click();
    c.clicked.push("Searched the web");
    await pause(c.page, 400);
    await c.shot("web-search-opened");
  }, "on"],
  ["look-up-setting", async (c) => {
    await c.fresh();
    await settings(c, "General");
    await vis(c.page.locator(".settings-switch")).waitFor();
    await c.shot("settings-look-up-online");
  }, "on"],
  ["deep-research", async (c) => {
    // "+" > Deep research arms the next Send; the run starts in the chat at once (owner, 18 November).
    await c.fresh();
    await tools(c, "Deep research");
    await c.label("Message CometRow").fill("How long is the synthetic notice period, and what is the fee?");
    await c.click("Send message");
    await vis(c.page.locator(".research-progress")).waitFor({ timeout: 15000 });
    await c.shot("deep-research-progress");
    await pause(c.page, 6000);
    await c.shot("deep-research-answer");
  }, "on"],
  ["code-execution", async (c) => {
    await c.fresh();
    await c.send("What is the VAT on 6,420 EUR? audit:python", undefined, true);
    await c.shot("code-execution-answer");
    await vis(c.page.locator("article.assistant").last().locator("summary")).click();
    c.clicked.push("Show the code and its output");
    await pause(c.page, 500);
    await c.shot("code-execution-runs");
  }, "on"],
  ["canvas", async (c) => {
    await c.fresh();
    await c.send("Canvas source. audit:table", undefined, true);
    await c.click("Open in canvas");
    await pause(c.page, 1000);
    await c.shot("canvas");
  }, "on"],
  ["read-aloud-pdf", async (c) => {
    await c.fresh();
    await c.send("Answer to export. audit:markdown", undefined, true);
    await c.page.evaluate(() => { window.print = () => {}; });
    await c.click("Export as PDF");
    await pause(c.page, 800);
    await c.shot("export-pdf");
  }, "on"],
  ["memory-remember", async (c) => {
    await c.fresh();
    await c.send("Remember that my synthetic cat is called Pixel.", undefined, false);
    await pause(c.page, 800);
    await c.shot("memory-save-dialog");
    await c.click("Save memory");
    await pause(c.page, 800);
    await c.shot("memory-saved");
  }, "on"],
  ["projects", async (c) => {
    await c.fresh();
    await c.nav();
    await c.click("Create project");
    await c.shot("project-create");
    await c.label("Project name").fill("Synthetic project");
    await c.click("Create");
    await pause(c.page, 1000);
    await c.shot("project-screen");
  }],
  // Image editing (docs/image-editing-20261125.md): the card with Edit, the full-screen editor, a tool.
  ["image-edit", async (c) => {
    await c.fresh();
    await tools(c, "Create image");
    await c.label("Describe the image").fill("A calm lake at sunrise");
    await c.click("Create");
    await pause(c.page, 1200);
    await c.shot("image-card");
    await vis(c.page.locator("figure.created-image").getByRole("button", { name: c.tr("Edit"), exact: true })).click();
    await pause(c.page, 800);
    await c.shot("image-editor");
    await c.click("Select area");
    await pause(c.page, 300);
    await c.shot("image-editor-select-area");
    await c.click("Back");
  }, "on"],
  // Sharing (docs/sharing-20261125.md): the dialog on an answer, with a link made.
  ["share", async (c) => {
    await c.fresh();
    await c.send("Something to share. audit:plain", undefined, true);
    await vis(c.page.locator("article.assistant").last().getByRole("button", { name: c.tr("Share"), exact: true })).click();
    await pause(c.page, 500);
    await c.shot("share-dialog");
    await c.click("Create link");
    await pause(c.page, 800);
    await c.shot("share-link");
    await c.page.keyboard.press("Escape");
  }, "on"],
  ["incognito", async (c) => { await c.fresh(); await c.nav(); await c.click("New incognito chat"); await pause(c.page, 600); await c.shot("incognito-chat"); }],
  ["search-chats", async (c) => {
    await c.fresh();
    await c.nav();
    await vis(c.page.getByRole("searchbox", { name: c.tr("Search chats") })).fill("audit");
    await pause(c.page, 800);
    await c.shot("search-chats");
  }],
  ["archived", async (c) => { await c.fresh(); await c.nav(); await c.click("Archived"); await c.shot("archived-list"); }],
  ["scheduled", async (c) => {
    await c.fresh();
    await c.nav();
    await c.click("Scheduled");
    await pause(c.page, 800);
    await c.shot("scheduled");
    await vis(c.page.getByRole("button", { name: new RegExp(`(${c.alts("New task").join("|")})$`) })).click();
    c.clicked.push("New task");
    await pause(c.page, 600);
    await c.shot("scheduled-new-task");
  }, "on"],
  ["secure-max", async (c) => {
    await c.fresh();
    await c.nav();
    await vis(c.page.locator(".secure-max-entry")).click();
    c.clicked.push("Secure Max");
    await pause(c.page, 600);
    await c.shot("secure-max-intro");
    await vis(c.page.getByRole("checkbox", { name: c.tr("I understand that CometRow cannot recover this data for me.") })).check();
    await c.click("Use Secure Max");
    await pause(c.page, 1000);
    await c.shot("secure-max-locked");
    await c.click("Unlock Secure Max");
    await pause(c.page, 1000);
    await c.shot("secure-max-unlock");
    // First use with sync on now sets up Secure Max with a recovery key (FE-02, 16 November): that screen is the end of this step.
    if (!(await c.page.getByLabel(c.tr("Vault passphrase")).count())) return;
    // The synthetic passphrase of tests/secure-store-e2e-ui.test.ts (a test value, this machine only).
    await c.label("Vault passphrase").fill("synthetic secure max passphrase");
    await c.click("Create or unlock vault");
    await pause(c.page, 2500);
    await c.shot("secure-max-unlocked");
    await c.nav();
    await c.shot("secure-max-section-unlocked");
    await c.page.keyboard.press("Escape");
    await settings(c, "Secure Max");
    await c.shot("settings-devices-sync-vault-unlocked");
    // Turn on sync (the server's memory store): the explanation, then the step after confirming.
    await c.click("Turn on sync");
    await pause(c.page, 800);
    await c.shot("sync-turn-on");
    const confirm = vis(c.page.getByRole("button", { name: c.tr("Turn on sync"), exact: true }));
    if (await confirm.isVisible().catch(() => false)) {
      await confirm.click();
      c.clicked.push("Turn on sync (confirm)");
      await pause(c.page, 2500);
      await c.shot("sync-turned-on");
    }
  }, "on"],
  ["conversation-menu", async (c) => { await c.fresh(); await conversationMenu(c); await c.shot("conversation-menu"); }],
  ["manage-history", async (c) => {
    await c.fresh();
    await c.send("Something to save. audit:plain", undefined, true);
    await conversationMenu(c, "Rename, save & manage history");
    await pause(c.page, 600);
    await c.shot("manage-history");
  }],
  ["settings-appearance", async (c) => { await c.fresh(); await settings(c, "General"); await c.shot("settings-appearance"); }],
  ["settings-dark", async (c) => {
    await c.fresh();
    await settings(c, "General");
    await vis(c.page.getByRole("combobox", { name: c.tr("Appearance") })).selectOption({ index: 2 });
    c.clicked.push("Appearance: Dark");
    await c.click("Close settings");
    await pause(c.page, 500);
    await c.shot("dark-theme-chat");
    await settings(c, "General");
    await vis(c.page.getByRole("combobox", { name: c.tr("Appearance") })).selectOption({ index: 0 });
  }],
  // The guides moved from Settings to Help (SS-15).
  ["settings-getting-started", async (c) => { await c.fresh(); await accountMenu(c, "Help"); await c.click("Getting started"); await pause(c.page, 500); await c.shot("onboarding-getting-started"); }],
  ["settings-trial-scope", async (c) => { await c.fresh(); await accountMenu(c, "Help"); await c.click("Trial scope and safety"); await pause(c.page, 500); await c.shot("trial-scope"); }],
  ["settings-account-security", async (c) => { await c.fresh(); await settings(c, "Security"); await c.shot("settings-account-security"); }],
  ["settings-privacy-data", async (c) => { await c.fresh(); await settings(c, "Data controls"); await c.shot("settings-privacy-data"); }],
  ["settings-plan-usage", async (c) => { await c.fresh(); await settings(c, "Account"); await c.shot("settings-plan-usage"); }],
  ["settings-memory", async (c) => { await c.fresh(); await settings(c, "Personalization"); await c.shot("settings-memory"); }, "on"],
  ["settings-devices-sync", async (c) => { await c.fresh(); await settings(c, "Secure Max"); await c.shot("settings-devices-sync"); }, "on"],
  ["privacy-boundaries", async (c) => { await c.fresh(); await accountMenu(c, "Help"); await c.click("Your privacy boundaries"); await pause(c.page, 800); await c.shot("privacy-boundaries"); }],
  // The chip itself: below 1,000 px it shows only the status, not the words "Privacy details" (17 November).
  ["privacy-details", async (c) => { await c.fresh(); await vis(c.page.locator(".connection-banner > summary")).click(); c.clicked.push("Privacy details"); await pause(c.page, 600); await c.shot("privacy-details"); }],
  ["account-usage", async (c) => { await c.fresh(); await accountMenu(c); await c.shot("account-menu"); await c.fresh(); await accountMenu(c, "Account & usage"); await c.shot("account-usage"); }],
  ["saved-data-controls", async (c) => { await c.fresh(); await accountMenu(c, "Saved · Data controls"); await c.shot("saved-data-controls"); }],
  ["help", async (c) => {
    await c.fresh();
    await accountMenu(c, "Help");
    await c.shot("help");
  }],
  ["legal", async (c) => {
    // The legal links sit in Help (SS-15).
    for (const link of ["Privacy policy", "Imprint"]) {
      await c.fresh();
      await accountMenu(c, "Help");
      await vis(c.page.getByRole("button", { name: c.tr(link) }).or(c.page.getByRole("link", { name: c.tr(link) }))).click();
      c.clicked.push(link);
      await pause(c.page, 800);
      await c.shot(link.startsWith("Privacy") ? "privacy-policy" : "imprint");
    }
  }],
  ["development-tools", async (c) => { await c.fresh("/?developmentTools"); await c.shot("development-tools"); }],
  ["navigation-drawer", async (c) => { await c.fresh(); await c.nav(false); await c.shot("navigation"); }],
  ["offline-first-send", async (c) => {
    await c.fresh();
    await c.fakes.setOffline(true);
    c.clicked.push("context.setOffline(true)");
    try {
      await pause(c.page, 1000);
      await c.shot("offline-before-first-send");
      // Send is off while offline (16 November): the draft is typed and kept, nothing is sent.
      await c.label("Message CometRow").fill("Sent while offline. audit:plain");
      await pause(c.page, 2500);
      await c.shot("offline-first-send");
    } finally {
      await c.fakes.setOffline(false);
    }
    await pause(c.page, 2000);
    await c.shot("back-online");
  }],
  ["offline-after-answer", async (c) => {
    // As a user would: one answer first (the answer code is loaded), then the connection drops.
    await c.fresh();
    await c.send("Before going offline. audit:plain", undefined, true);
    await c.fakes.setOffline(true);
    c.clicked.push("context.setOffline(true)");
    try {
      await pause(c.page, 1000);
      await c.shot("offline-after-answer");
      await c.label("Message CometRow").fill("Sent while offline. audit:plain");
      await pause(c.page, 2500);
      await c.shot("offline-after-answer-send");
    } finally {
      await c.fakes.setOffline(false);
    }
    await pause(c.page, 2000);
    await c.shot("offline-after-answer-back-online");
  }],
  ["chat-unavailable", async (c) => {
    c.fakes.setReady(false);
    try {
      await c.fresh();
      await c.shot("chat-unavailable");
    } finally {
      c.fakes.setReady(true);
    }
  }],
  ["not-found", async (c) => { await c.page.goto(c.origin + "/no-such-page"); c.clicked.push("goto /no-such-page"); await c.shot("not-found-404", true); }],
  ["account-lab", async (c) => {
    const now = "2026-11-16T09:00:00.000Z";
    let signedIn = false;
    await c.page.route("**/api/{account,auth}/**", (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/api/account/options") return route.fulfill({ json: { synthetic: true, socialProviders: ["google"], emailEnabled: true, workspaceEnabled: true } });
      if (path === "/api/auth/get-session") return route.fulfill({ json: signedIn ? { user: { id: "u1", email: "audit@example.test" } } : null });
      if (path === "/api/account/access")
        return route.fulfill({ json: { sessions: [{ id: "11111111-1111-4111-8111-111111111111", createdAt: now, updatedAt: now, expiresAt: now, current: true }], passkeys: [], providers: [{ id: "44444444-4444-4444-8444-444444444444", providerId: "google" }] } });
      if (path === "/api/account/security-notices") return route.fulfill({ json: { notices: [] } });
      return route.fulfill({ status: 503, json: { error: "Synthetic: not available in the audit harness." } });
    });
    try {
      await c.page.goto(c.origin + "/?account-lab=1");
      c.clicked.push("goto /?account-lab=1");
      await pause(c.page, 1500);
      await c.shot("account-lab-sign-in", true);
      signedIn = true;
      await c.page.reload();
      await pause(c.page, 1500);
      await c.shot("account-lab-signed-in", true);
      await c.page.goto(c.origin + "/?account-preview=1");
      c.clicked.push("goto /?account-preview=1");
      await pause(c.page, 1500);
      await c.shot("account-preview", true);
    } finally {
      await c.page.unroute("**/api/{account,auth}/**");
    }
  }],
  ["signed-out", async (c) => {
    // A second context without the account cookie: the local app as before sign-in.
    const context = await c.browser.newContext({ viewport: c.page.viewportSize()!, locale: c.lang === "de" ? "de-DE" : "en-US" });
    const fakes = await installFakes(context, { origin: c.origin, config: c.config });
    const page = await context.newPage();
    try {
      await page.goto(c.origin);
      await page.locator(".app-shell").waitFor({ timeout: 30000 });
      await pause(page, 800);
      // This context's log goes into the shot's entry (and its non-local requests into the hard failures).
      for (const [k, v] of Object.entries(fakes.log)) (c.fakes.log as unknown as Record<string, unknown[]>)[k].push(...(v as unknown[]).splice(0));
      const own = c.page;
      c.page = page;
      await c.shot("signed-out-home", true);
      c.page = own;
    } finally {
      await context.close();
    }
  }],
];

export async function runTour(o: {
  origin: string;
  config: AuditConfig;
  out: string;
  browsers: (readonly [string, BrowserType | undefined])[];
  widths: number[];
  langs: Lang[];
  /** Run only these steps (names as in STEPS); all when absent. */
  only?: string[];
  /** axe-core's file: each screenshot also gets an accessibility check (WCAG 2.2 A and AA rules). */
  axe?: string;
}) {
  const de = await dictionary();
  const entries: Entry[] = [];
  /** Tour labels with no German text found (the German step then looks for the English label). */
  const missing = new Set<string>();
  /** Steps or parts left out on purpose: "step: reason" -> the combinations it applies to. */
  const skips = new Map<string, Set<string>>();
  const skipped = (step: string, reason: string, combo: string) => {
    const key = `${step}: ${reason}`;
    if (!skips.has(key)) skips.set(key, new Set());
    skips.get(key)!.add(combo);
  };
  let hardFailures = 0;
  for (const [engineName, engine] of o.browsers) {
    if (!engine) throw Error(`Unknown browser ${engineName}`);
    // A dead proxy for every non-local host: even a request the routes missed cannot leave the machine.
    const browser = await engine.launch({
      proxy: { server: "http://127.0.0.1:9", bypass: "localhost,127.0.0.1" },
      ...(engineName === "chromium" ? { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] } : {}),
    });
    try {
      for (const lang of o.langs)
        for (const width of o.widths) {
          const context = await browser.newContext({
            viewport: { width, height: width < 700 ? 812 : width < 1000 ? 1024 : 900 },
            locale: lang === "de" ? "de-DE" : "en-US",
            // axe is injected as a script, which the branded pages' strict CSP would block.
            ...(o.axe ? { bypassCSP: true } : {}),
            ...(width < 700 && engineName !== "firefox" ? { hasTouch: true, isMobile: engineName === "chromium" } : {}),
          });
          context.setDefaultTimeout(8000);
          if (engineName === "chromium") await context.grantPermissions(["microphone"], { origin: o.origin }).catch(() => {});
          // Each context its own synthetic account, so saved chats and projects do not carry over.
          await context.addCookies([{ name: "audit-account", value: randomUUID(), url: o.origin }]);
          const fakes = await installFakes(context, { origin: o.origin, config: o.config });
          const page = await context.newPage();
          // "Leave site?" (unsaved work) is accepted so the next step can navigate; other dialogs are dismissed.
          page.on("dialog", (d) => void (d.type() === "beforeunload" ? d.accept() : d.dismiss()).catch(() => {}));
          let n = 0;
          let germanOff = false;
          let step = "";
          // A build without German shows English: then the English labels are the right ones.
          const alts = (en: string) => (lang !== "de" || germanOff ? [en] : (de.has(en) || missing.add(en), de.get(en) ?? [en]));
          const escape = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const tr = (en: string) => {
            const all = alts(en);
            return all.length === 1 ? all[0] : new RegExp(`^(${all.map(escape).join("|")})$`);
          };
          const c: Ctx = {
            page, context, browser, fakes, origin: o.origin, config: o.config, lang, width, tr, alts, clicked: [],
            germanOff: () => germanOff,
            skip: (reason) => skipped(step, reason, `${engineName} ${lang} ${width}`),
            async click(name, role = "button") {
              await vis(c.page.getByRole(role, { name: tr(name), exact: true })).click();
              c.clicked.push(name);
            },
            label: (name) => vis(c.page.getByLabel(tr(name), { exact: true })),
            async fresh(path = "/") {
              await c.page.goto(o.origin + path, { waitUntil: "domcontentloaded" });
              await c.page.locator(".app-shell").waitFor({ state: "visible", timeout: 30000 });
              await pause(c.page, 600);
              if (lang === "de" && (await c.page.locator("html").getAttribute("lang")) !== "de") germanOff = true;
            },
            async nav(unlockVault = true) {
              const toggle = vis(c.page.getByRole("button", { name: tr("Open navigation"), exact: true }));
              if (await toggle.isVisible().catch(() => false)) await toggle.click(), c.clicked.push("Open navigation"), await pause(c.page, 400);
              // Without Secure (config off) history sits in the local vault: unlock it with the synthetic passphrase.
              const unlock = vis(c.page.getByRole("button", { name: tr("Unlock history"), exact: true }));
              if (!unlockVault || !(await unlock.isVisible().catch(() => false))) return;
              await unlock.click();
              await c.label("Vault passphrase").fill("synthetic secure max passphrase");
              await c.click("Create or unlock vault");
              c.clicked.push("Unlock history (synthetic passphrase)");
              await pause(c.page, 1500);
              if (await toggle.isVisible().catch(() => false)) await toggle.click(), await pause(c.page, 400);
            },
            async send(text, name, wait = true) {
              if (name) fakes.answer(name);
              const before = await c.page.locator("article.assistant").count();
              await c.label("Message CometRow").fill(text);
              await c.click("Send message");
              if (!wait) return;
              await c.page.waitForFunction((n) => document.querySelectorAll("article.assistant").length > n, before, { timeout: 30000 });
              // Finished when the Stop button is gone (or after 30 s).
              await vis(c.page.getByRole("button", { name: tr("Stop response"), exact: true })).waitFor({ state: "hidden", timeout: 30000 }).catch(() => {});
              await pause(c.page, 500);
            },
            async shot(screen, fullPage = false) {
              const file = `${String(++n).padStart(2, "0")}-${screen}-${lang}-${width}-${engineName}.png`;
              let error: string | undefined;
              await c.page.screenshot({ path: `${o.out}/${file}`, fullPage, timeout: 15000 }).catch((e) => (error = `screenshot: ${String(e.message).slice(0, 200)}`));
              const m = (await c.page.evaluate(MEASURE).catch(() => ({ overflowPx: -1, outside: [], wide: [], belowFoldPx: -1 }))) as { overflowPx: number; outside: string[]; wide: string[]; belowFoldPx: number };
              const axe = o.axe
                ? await c.page.addScriptTag({ path: o.axe }).then(() => c.page.evaluate(async () => {
                    const r = await (window as unknown as { axe: { run: (c: unknown, o: unknown) => Promise<{ violations: { id: string; impact: string | null; nodes: { target: string[]; failureSummary?: string }[] }[] }> } })
                      .axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] });
                    return r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, targets: v.nodes.slice(0, 3).map((n) => n.target.join(" ")), summary: v.nodes[0]?.failureSummary?.slice(0, 300) }));
                  })).catch((e) => [{ id: "axe-failed", impact: null, nodes: 0, targets: [String(e.message).slice(0, 120)] }])
                : undefined;
              const log = fakes.log;
              entries.push({
                n, screen, browser: engineName, width, lang, file, url: c.page.url(), clicked: [...c.clicked],
                ...(error ? { error } : {}),
                consoleErrors: log.console.splice(0), pageErrors: log.pageErrors.splice(0), failedRequests: log.failed.splice(0), nonLocal: log.nonLocal.splice(0),
                ...m,
                ...(germanOff ? { germanOff } : {}),
                ...(axe ? { axe } : {}),
              });
              c.clicked = [];
            },
          };
          for (const [name, run, only] of STEPS) {
            if (o.only && !o.only.includes(name)) continue; // not asked for with --steps
            step = name;
            if (only && only !== o.config) {
              skipped(name, `needs the "${only}" build (features switched ${only})`, `${engineName} ${lang} ${width}`);
              continue;
            }
            const started = entries.length;
            try {
              await run(c);
            } catch (error) {
              await c.shot(`${name}-FAILED`);
              entries.at(-1)!.error = String((error as Error).message).split("\n")[0].slice(0, 300);
            }
            c.page = page;
            const fresh = entries.slice(started);
            hardFailures += fresh.filter((e) => e.nonLocal.length).length;
            console.log(`${engineName} ${lang} ${width} ${name}: ${fresh.map((e) => e.error ? `FAILED (${e.error.slice(0, 80)})` : "ok").join(", ")}${fresh.some((e) => e.consoleErrors.length || e.pageErrors.length || e.failedRequests.length) ? " [errors logged]" : ""}`);
          }
          // Anything logged after the last shot goes into the last entry, so nothing escapes the index.
          const last = entries.at(-1);
          if (last)
            for (const [k, from] of [["consoleErrors", "console"], ["pageErrors", "pageErrors"], ["failedRequests", "failed"], ["nonLocal", "nonLocal"]] as const)
              last[k].push(...fakes.log[from].splice(0));
          await context.close();
        }
    } finally {
      await browser.close();
    }
  }
  // Self-check: screens the first combination reached that another one did not (a silent skip or a failure).
  const combos = [...new Set(entries.map((e) => `${e.browser} ${e.lang} ${e.width}`))];
  const reached = (combo: string) => new Set(entries.filter((e) => `${e.browser} ${e.lang} ${e.width}` === combo && !e.error).map((e) => e.screen));
  const first = reached(combos[0] ?? "");
  const missingScreens = Object.fromEntries(combos.slice(1).map((combo) => [combo, [...first].filter((s) => !reached(combo).has(s))]).filter(([, list]) => list.length));
  hardFailures = entries.filter((e) => e.nonLocal.length).length;
  const failedSteps = entries.filter((e) => e.error).length;
  const everyCombo = o.browsers.length * o.langs.length * o.widths.length;
  const skippedSteps = [...skips].map(([what, where]) => ({ what, where: where.size === everyCombo ? "every combination" : [...where].join("; ") }));
  return { config: o.config, origin: o.origin, generated: new Date().toISOString(), hardFailures, failedSteps, skippedSteps, untranslatedLabels: [...missing], missingScreens, entries };
}
