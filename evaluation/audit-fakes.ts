// Fakes for the audit harness (evaluation/audit-harness.ts), reusable from any Playwright script:
//
//   import { installFakes } from "./audit-fakes";
//   const fakes = await installFakes(context, { origin: "http://localhost:<port>", config: "on" });
//   fakes.answer("table");            // the next reply is the table answer (a queue; then the default)
//   ... or type "audit:table" anywhere in a message ...
//   fakes.log                         // console errors, failed and non-local requests seen so far
//
// What is faked, all inside the browser's route handler (nothing reaches a provider):
// - /api/status: the server's real answer (real csrf, account, metering, sync, secure fields),
//   with chat marked ready and, for config "on", the fields the server only sends with a provider
//   key (voice, images, code, research, search).
// - /__audit/reply: the model. Only harness builds call it (evaluation/audit-inference.ts replaces
//   src/inference.ts there); the answer goes through the app's real stream parser.
// - /__audit/transcribe: voice transcription (the harness build's voice-input.ts calls it).
// - /api/research/prepare and /execute: web search and deep research results.
// Every request to a host other than localhost / 127.0.0.1 is aborted and recorded.
import type { BrowserContext, Page, Route } from "@playwright/test";

export type AuditConfig = "on" | "off";
/** The synthetic signed-in account: cookie `audit-account` (the harness server maps it to res.locals). */
export const AUDIT_ACCOUNT = "a0d17000-0000-4000-8000-000000000001";
/** The named answers. Type `audit:<name>` in a message, or queue one with `fakes.answer(name)`. */
export const ANSWERS = [
  "markdown", "code", "math", "table", "citations", "long", "slow", "error-429", "error-500",
  "error-503", "dropped", "stop", "python", "image", "plain", "chart",
] as const;
export type AnswerName = (typeof ANSWERS)[number];

export const QUALIFICATION = {
  provider: "privatemode",
  maxInputCharacters: 100000,
  model: "SYNTHETIC_FAST",
  pricing: { inputPerMillion: 0, outputPerMillion: 0, currency: "USD" },
  modes: {
    fast: { model: "SYNTHETIC_FAST", backupModel: "SYNTHETIC_BACKUP", maxOutputTokens: 1024, allowanceCost: 1 },
    thinking: { model: "SYNTHETIC_DEEP", backupModel: "SYNTHETIC_BACKUP", maxOutputTokens: 4096, allowanceCost: 5 },
  },
};
const ON_STATUS = {
  search: true,
  voice: { chunkSeconds: 30, maxTurnSeconds: 180, dailyUnits: 150, usedUnits: 12 },
  images: { maxBytes: 280_000 },
  code: true,
  research: { cost: 15, dailyRuns: 3 },
};

const TEXT: Record<Exclude<AnswerName, "long" | "stop" | "error-429" | "error-500" | "error-503">, string> = {
  plain: "Synthetic answer.",
  markdown: [
    "## Synthetic overview",
    "",
    "A short paragraph with **bold**, *italic* and `inline code`, and a [link](https://example.test/page).",
    "",
    "### Steps",
    "",
    "1. First numbered step",
    "2. Second numbered step",
    "   - a nested point",
    "   - another nested point",
    "3. Third numbered step",
    "",
    "- A bullet",
    "- Another bullet",
    "",
    "> A quoted line.",
    "",
    "---",
    "",
    "That is all.",
  ].join("\n"),
  code: [
    "Here is the same idea in several languages.",
    "",
    "```python",
    "def total(items):\n    return sum(item.price for item in items)",
    "```",
    "",
    "```typescript",
    "export const total = (items: { price: number }[]) => items.reduce((a, b) => a + b.price, 0);",
    "```",
    "",
    "```bash",
    "npx tsx evaluation/audit-harness.ts --config on --serve",
    "```",
    "",
    "```json",
    '{ "name": "synthetic", "items": [1, 2, 3] }',
    "```",
    "",
    "```sql",
    "SELECT name, SUM(price) AS total FROM items GROUP BY name ORDER BY total DESC;",
    "```",
    "",
    "A very long line to test horizontal scrolling inside the block:",
    "",
    "```",
    "x".repeat(40) + " " + "y".repeat(160),
    "```",
  ].join("\n"),
  math: [
    // The app renders inline math as $$...$$ (single dollars are off for prices, src/Answer.tsx).
    "Inline math as the app supports it: $$E = mc^2$$. Forms it does not render: $E = mc^2$ and \\(a^2 + b^2 = c^2\\).",
    "",
    "Display math with dollars:",
    "",
    "$$\n\\int_0^1 x^2 \\, dx = \\frac{1}{3}\n$$",
    "",
    "Display math with brackets:",
    "",
    "\\[\n\\sum_{k=1}^{n} k = \\frac{n(n+1)}{2}\n\\]",
    "",
    "A wide formula: $$\\left( \\sum_{i=1}^{100} \\frac{x_i^2 + y_i^2 + z_i^2}{\\sqrt{a_i^2 + b_i^2 + c_i^2 + d_i^2}} \\right) \\cdot \\prod_{j=1}^{50} (1 + r_j)$$",
  ].join("\n"),
  table: [
    "| Plan | Messages | Price per month | Notes |",
    "| --- | ---: | ---: | --- |",
    "| Fast | 150 | 0.00 EUR | Synthetic row |",
    "| Thinking | 30 | 0.00 EUR | A longer note that should wrap inside the cell on a phone |",
    "| Research | 3 | 0.00 EUR | Synthetic |",
    "",
    "A wide table:",
    "",
    "| " + Array.from({ length: 12 }, (_, i) => `Column ${i + 1}`).join(" | ") + " |",
    "| " + Array.from({ length: 12 }, () => "---").join(" | ") + " |",
    "| " + Array.from({ length: 12 }, (_, i) => `value ${i + 1}`).join(" | ") + " |",
  ].join("\n"),
  citations: "", // built from the request's sources
  slow: "This answer started late on purpose (a slow first token).",
  dropped: "This answer starts normally and then the connection drops before",
  python: "The VAT on 6,420 EUR at 19 % is **1,219.80 EUR**.",
  image: "The picture shows a synthetic test pattern: a coloured square on a white background.",
  chart: [
    "Your savings grew from **4,200** to **9,850** EUR.",
    "",
    "```chart",
    '{"type": "line", "title": "Savings at year end", "unit": "EUR", "labels": ["2022", "2023", "2024", "2025", "2026"], "values": [4200, 5480, 7150, 8600, 9850], "source": "your uploaded bank statements"}',
    "```",
    "",
    "A broken chart block stays code:",
    "",
    "```chart",
    '{"labels": ["a"], "values": [-1]}',
    "```",
  ].join("\n"),
};
const LONG = Array.from(
  { length: 60 },
  (_, i) => `Paragraph ${i + 1}. ${"This is a long synthetic answer that keeps going so the view has to follow it. ".repeat(2)}`,
).join("\n\n");

/** One reply as the relay would stream it: content frames, a finish frame with usage, [DONE]. */
export function sse(text: string, { done = true, wordsPerFrame = 3 } = {}): string {
  const words = text.split(/(?<= )/);
  const frames: string[] = [];
  for (let i = 0; i < words.length; i += wordsPerFrame)
    frames.push(JSON.stringify({ choices: [{ index: 0, delta: { content: words.slice(i, i + wordsPerFrame).join("") }, finish_reason: null }] }));
  if (done) {
    frames.push(
      JSON.stringify({
        choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
        usage: { prompt_tokens: 40, completion_tokens: Math.max(1, words.length), total_tokens: 40 + Math.max(1, words.length) },
      }),
    );
    frames.push("[DONE]");
  }
  return frames.map((f) => `data: ${f}\n\n`).join("");
}

interface ReplyRequest {
  question: string;
  research?: "plan" | "answer";
  image: boolean;
  code: boolean;
  sources: string[];
}

export interface AuditLog {
  console: string[];
  pageErrors: string[];
  failed: string[];
  nonLocal: string[];
  replies: { answer: string; request: ReplyRequest }[];
}

export interface FakeOptions {
  origin: string;
  config: AuditConfig;
  /** false: the real "chat unavailable" status (no fake ready). */
  ready?: boolean;
}

const isLocal = (url: URL) => ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || ["data:", "blob:", "about:"].includes(url.protocol);

export async function installFakes(context: BrowserContext, options: FakeOptions) {
  const queue: AnswerName[] = [];
  const log: AuditLog = { console: [], pageErrors: [], failed: [], nonLocal: [], replies: [] };
  let ready = options.ready ?? true;
  // Playwright still runs route handlers while the context is offline: the fakes must fail too.
  let offline = false;
  let serial = 0;
  const source = (url: string, evidenceKind: string) => ({
    id: `synthetic-${String(++serial).padStart(4, "0")}`,
    title: `Synthetic page ${serial}`,
    text: "The synthetic notice period is three months. Synthetic text only.",
    url,
    retrievedAt: new Date().toISOString(),
    evidenceKind,
  });

  async function reply(route: Route) {
    const request = route.request().postDataJSON() as ReplyRequest;
    const token = /audit:([a-z0-9-]+)/.exec(request.question)?.[1] as AnswerName | undefined;
    const name: AnswerName | "research-plan" | "research-answer" =
      request.research === "plan" ? "research-plan"
      : request.research === "answer" ? "research-answer"
      : queue.shift() ?? (token && ANSWERS.includes(token) ? token : request.image ? "image" : "markdown");
    log.replies.push({ answer: name, request });
    const stream = (body: string, headers: Record<string, string> = {}) =>
      route.fulfill({ status: 200, contentType: "text/event-stream", headers, body }).catch(() => {});
    const cite = request.sources.slice(0, 3);
    switch (name) {
      case "research-plan":
        return stream(sse("1. synthetic notice period for tenants\n2. synthetic deposit rules\n3. synthetic court decisions"));
      case "research-answer":
      case "citations":
        return stream(
          sse(
            cite.length
              ? `## Synthetic findings\n\nThe notice period is three months [${cite[0]}].${cite[1] ? ` A second source agrees [${cite[1]}].` : ""}\n\n- Point one [${cite[0]}]\n- Point two`
              : "No sources were attached to this conversation, so there is nothing to cite. Approve a web search first.",
          ),
        );
      case "long":
        return stream(sse(LONG, { wordsPerFrame: 12 }), { "x-audit-frame-ms": "25" });
      case "stop":
        // Streams slowly for about a minute: long enough to press Stop.
        return stream(sse(LONG, { wordsPerFrame: 2 }), { "x-audit-frame-ms": "150" });
      case "slow":
        await new Promise((r) => setTimeout(r, 6000));
        return stream(sse(TEXT.slow));
      case "error-429":
        return route.fulfill({ status: 429, json: { error: "Synthetic rate limit." } }).catch(() => {});
      case "error-500":
        return route.fulfill({ status: 500, json: { error: "Synthetic server error." } }).catch(() => {});
      case "error-503":
        return route.fulfill({ status: 503, json: { error: "Synthetic unavailable." } }).catch(() => {});
      case "dropped":
        // Content, then the stream ends without a finish frame or [DONE].
        return stream(sse(TEXT.dropped, { done: false }));
      case "python":
        return stream(sse(TEXT.python), request.code ? { "x-audit-code": encodeURIComponent('from decimal import Decimal\nprint("VAT:", Decimal("6420") * Decimal("0.19"))') } : {});
      default:
        return stream(sse(TEXT[name]));
    }
  }

  async function research(route: Route, url: URL) {
    if (url.pathname.endsWith("/prepare")) return route.fulfill({ json: { id: "s".repeat(48) } });
    if (url.pathname.endsWith("/cancel")) return route.fulfill({ json: {} });
    const body = route.request().postDataJSON() as { request: { kind: string; value: string } };
    const n = ++serial;
    return route
      .fulfill({
        json:
          body.request.kind === "page"
            ? { sources: [source(body.request.value, "page")] }
            : {
                sources: [
                  source(`https://one.example/result-${n}`, "search-excerpt"),
                  source(`https://two.example/result-${n}`, "search-excerpt"),
                  source(`https://one.example/result-${n}`, "page"),
                ],
                topPage: { url: `https://one.example/result-${n}`, outcome: "read" },
              },
      })
      .catch(() => {});
  }

  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (offline) return route.abort("internetdisconnected");
    if (!isLocal(url)) {
      log.nonLocal.push(`${route.request().method()} ${url.href.slice(0, 200)}`);
      return route.abort("blockedbyclient");
    }
    if (url.origin !== options.origin) return route.continue();
    if (url.pathname === "/__audit/reply") return reply(route);
    if (url.pathname === "/__audit/transcribe")
      return route.fulfill({ json: { text: "Synthetic dictated text for the audit" } });
    if (url.pathname.startsWith("/api/research/")) return research(route, url);
    if (url.pathname === "/api/status" && ready) {
      const real = await route.fetch();
      if (!real.ok()) return route.fulfill({ response: real });
      const status = await real.json();
      return route.fulfill({
        response: real,
        json: {
          ...status,
          inference: { ready: true, reason: "AUDIT HARNESS: synthetic answers only", qualification: options.config === "on" ? { ...QUALIFICATION, speech: { model: "SYNTHETIC_SPEECH", allowanceCost: 1 }, vision: { model: "SYNTHETIC_FAST", allowanceCost: 2 } } : QUALIFICATION, cacheSalt: "a".repeat(43) },
          ...(options.config === "on" ? ON_STATUS : { search: false }),
        },
      });
    }
    return route.continue();
  });

  const watch = (page: Page) => {
    page.on("console", (m) => m.type() === "error" && log.console.push(`${page.url()} :: ${m.text().replace(/data:[^'"\s]{40,}/g, "data:…").slice(0, 300)}`));
    page.on("pageerror", (e) => log.pageErrors.push(`${page.url()} :: ${String(e.message).slice(0, 300)}`));
  };
  context.pages().forEach(watch);
  context.on("page", watch);
  context.on("requestfailed", (r) => {
    const reason = r.failure()?.errorText ?? "";
    // Aborts the app made itself (Stop, navigation) are not findings; blocked non-local ones are logged above.
    if (!/ERR_ABORTED|NS_BINDING_ABORTED|cancelled|blockedbyclient|ERR_BLOCKED_BY_CLIENT/i.test(reason))
      log.failed.push(`${r.method()} ${r.url().slice(0, 200)} ${reason}`);
  });
  context.on("response", (r) => {
    if (r.status() >= 400 && !new URL(r.url()).pathname.startsWith("/__audit/"))
      log.failed.push(`${r.request().method()} ${r.url().slice(0, 200)} ${r.status()}`);
  });

  // One server session for the whole context, opened before the page loads: the browser does not keep
  // a Set-Cookie from a response the fake status passes on, so the page's first requests would each
  // open a session of their own and its CSRF token could belong to another (seen as a 403 on POSTs).
  await context.request.get(`${options.origin}/api/status`);

  return {
    log,
    /** Queue the next replies by name (first in, first out); then the default or the message's audit:<name>. */
    answer: (...names: AnswerName[]) => void queue.push(...names),
    /** Go offline or back online: the context and the fakes together. */
    setOffline: async (value: boolean) => {
      offline = value;
      await context.setOffline(value);
    },
    /** Turn the fake ready status on or off (reload the page afterwards). */
    setReady: (value: boolean) => void (ready = value),
  };
}
export type Fakes = Awaited<ReturnType<typeof installFakes>>;
