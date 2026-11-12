// UI sweep (overnight task 3, 12 November): the built app in Chromium, Firefox and WebKit at
// phone, tablet and desktop widths. Checks page overflow, elements outside the viewport,
// text contrast (WCAG AA, computed in the page), keyboard focus visibility and small touch
// targets on phones. Chat is off (no report, no key), as in production today. No network
// beyond localhost. Run after `npm run build`:
//   npx tsx evaluation/ui-sweep.ts [--browsers chromium,firefox,webkit]
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, firefox, webkit, type Page } from "@playwright/test";
import { workspaceControl } from "./workspace-navigation";

// Not 4190: it is on the Fetch "bad ports" list (ManageSieve), so Firefox and WebKit refuse it.
const PORT = 4192;
const ORIGIN = `http://localhost:${PORT}`;
const VIEWPORTS = { phone: { width: 375, height: 812 }, tablet: { width: 768, height: 1024 }, desktop: { width: 1280, height: 800 } };
// /account is served only by the hosted composition; the local server shows the same screens in the account lab.
const VIEWS = ["Conversation", "Context", "Research", "Saved", "Settings", "Account lab"] as const;
const engines = { chromium, firefox, webkit };
const chosen = (process.argv.includes("--browsers") ? process.argv[process.argv.indexOf("--browsers") + 1].split(",") : Object.keys(engines)) as (keyof typeof engines)[];

const server = spawn(process.execPath, ["--import", "tsx", "server/index.ts"], {
  env: { ...process.env, PORT: String(PORT), PRIVATEAI_ORIGIN: ORIGIN, PRIVATEAI_QUALIFICATION_FILE: "", TINFOIL_API_KEY: "", BRAVE_SEARCH_API_KEY: "", PRIVATEAI_INVITES_FILE: "", PRIVATEAI_ACCESS_KEY: "" },
  // stderr is inherited so a full, unread pipe can never block the server.
  stdio: ["ignore", "pipe", "inherit"],
});
await new Promise<void>((ok, fail) => {
  const timer = setTimeout(() => fail(Error("server did not start")), 60_000);
  server.stdout.on("data", (d) => String(d).includes("listening") && (clearTimeout(timer), ok()));
});

// Runs in the page: the four measurements for the current view.
function measure(isPhone: boolean) {
  const vw = document.documentElement.clientWidth;
  const visible = (el: Element) => {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return s.visibility !== "hidden" && s.display !== "none" && r.width > 0 && r.height > 0 && Number(s.opacity) > 0;
  };
  const scrollsX = (el: Element | null): boolean => {
    for (let e = el?.parentElement; e; e = e.parentElement) {
      const o = getComputedStyle(e).overflowX;
      if (o === "auto" || o === "scroll" || o === "hidden" || o === "clip") return true;
    }
    return false;
  };
  const name = (el: Element) =>
    `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : ""} "${(el.textContent ?? "").trim().slice(0, 40)}"`;
  const outside = [...document.querySelectorAll("body *")]
    .filter((el) => visible(el) && !scrollsX(el))
    .filter((el) => {
      const r = el.getBoundingClientRect();
      return r.right > vw + 1 || r.left < -1;
    })
    .map(name);
  // Contrast.
  const rgb = (c: string) => (c.match(/[\d.]+/g) ?? []).map(Number);
  const lum = ([r, g, b]: number[]) => {
    const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const background = (el: Element): number[] | null => {
    for (let e: Element | null = el; e; e = e.parentElement) {
      const s = getComputedStyle(e);
      if (s.backgroundImage !== "none") return null;
      const c = rgb(s.backgroundColor);
      if (c.length >= 3 && (c[3] ?? 1) > 0.9) return c;
    }
    return rgb(getComputedStyle(document.body).backgroundColor);
  };
  const lowContrast: string[] = [];
  for (const el of document.querySelectorAll("body *")) {
    if (!visible(el) || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim())) continue;
    const s = getComputedStyle(el);
    const fg = rgb(s.color);
    if ((fg[3] ?? 1) < 0.9) continue; // translucent text: skip rather than guess
    const bg = background(el);
    if (!bg) continue;
    const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
    const ratio = (a + 0.05) / (b + 0.05);
    const size = parseFloat(s.fontSize);
    const large = size >= 24 || (size >= 18.66 && Number(s.fontWeight) >= 700);
    if (ratio < (large ? 3 : 4.5)) lowContrast.push(`${name(el)} ${ratio.toFixed(2)}`);
  }
  const smallTargets = isPhone
    ? [...document.querySelectorAll("button, a[href], input, select, summary, [role=button]")]
        .filter((el) => visible(el) && !(el as HTMLInputElement).disabled)
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width < 24 || r.height < 24;
        })
        .filter((el) => !(el.tagName === "A" && getComputedStyle(el).display === "inline")) // inline text links are exempt
        .map(name)
    : [];
  return {
    pageOverflowPx: document.documentElement.scrollWidth - vw,
    outside: [...new Set(outside)].slice(0, 8),
    lowContrast: [...new Set(lowContrast)].slice(0, 12),
    smallTargets: [...new Set(smallTargets)].slice(0, 12),
  };
}

const focusProbe = () => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const s = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const own = (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== "none";
      // A field may show focus on its wrapper instead (the composer border and ring).
      const wrapper = el.parentElement?.closest(":focus-within");
      const indicator = own || (!!wrapper && wrapper !== document.body && getComputedStyle(wrapper).boxShadow !== "none");
      const onScreen = rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth;
      return { label: `${el.tagName.toLowerCase()} "${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 30)}"`, indicator, onScreen };
    };

async function focusCheck(page: Page) {
  const problems: string[] = [];
  await page.locator("body").click({ position: { x: 1, y: 1 } }).catch(() => {});
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press("Tab");
    // WebKit scrolls keyboard focus into view a frame later; measuring at once reports it off screen.
    await page.evaluate("new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))");
    const r = (await page.evaluate(`(() => { const __name = (f) => f; return (${focusProbe.toString()})(); })()`)) as ReturnType<typeof focusProbe>;
    if (r && !r.indicator) problems.push(`no focus indicator: ${r.label}`);
    if (r && !r.onScreen) problems.push(`focus off screen: ${r.label}`);
  }
  return [...new Set(problems)];
}

async function open(page: Page, view: (typeof VIEWS)[number]) {
  // "load" never fires reliably in Firefox and WebKit here; the DOM is enough to measure.
  if (view === "Account lab") return page.goto(`${ORIGIN}/?account-lab=1`, { waitUntil: "domcontentloaded" });
  await page.goto(ORIGIN, { waitUntil: "domcontentloaded" });
  await page.locator(".app-shell").waitFor({ state: "visible", timeout: 30_000 });
  if (view !== "Conversation") await workspaceControl(page, view).click();
}

const report: Record<string, unknown>[] = [];
try {
  for (const engine of chosen) {
    const browser = await engines[engine].launch();
    try {
      for (const [vpName, viewport] of Object.entries(VIEWPORTS)) {
        for (const view of VIEWS) {
          const context = await browser.newContext({ viewport, hasTouch: vpName === "phone" && engine !== "firefox" });
          const page = await context.newPage();
          const errors: string[] = [];
          page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 120)));
          try {
            await open(page, view);
            await page.waitForTimeout(600);
            // tsx adds a __name helper the page lacks; define it inside the evaluated script.
            const m = (await page.evaluate(`(() => { const __name = (f) => f; return (${measure.toString()})(${vpName === "phone"}); })()`)) as ReturnType<typeof measure>;
            const focus = view === "Conversation" || view === "Account lab" ? await focusCheck(page) : [];
            const row = { engine, viewport: vpName, view, ...m, focus, errors };
            report.push(row);
            const issues = [m.pageOverflowPx > 0 && `overflow ${m.pageOverflowPx}px`, m.outside.length && `${m.outside.length} outside`, m.lowContrast.length && `${m.lowContrast.length} low contrast`, m.smallTargets.length && `${m.smallTargets.length} small targets`, focus.length && `${focus.length} focus`, errors.length && `${errors.length} errors`].filter(Boolean);
            console.log(`${engine.padEnd(8)} ${vpName.padEnd(7)} ${view.padEnd(13)} ${issues.join(", ") || "ok"}`);
          } catch (error) {
            report.push({ engine, viewport: vpName, view, failed: String((error as Error).message).slice(0, 200) });
            console.log(`${engine.padEnd(8)} ${vpName.padEnd(7)} ${view.padEnd(13)} FAILED ${String((error as Error).message).slice(0, 120)}`);
          } finally {
            await context.close();
          }
        }
      }
    } finally {
      await browser.close();
    }
  }
} finally {
  server.kill();
}
await mkdir(".local/ui-sweep", { recursive: true });
const file = `.local/ui-sweep/sweep-${Date.now()}.json`;
await writeFile(file, JSON.stringify(report, null, 2));
console.log(`written ${file}`);
