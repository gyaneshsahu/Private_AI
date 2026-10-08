import { expect, it } from "vitest";
import { completionEvents } from "../src/completion-events";
import { consumeReply, IncompleteReplyError } from "../src/reply-stream";
import { createServer } from "vite";
import { chromium } from "@playwright/test";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { mkdir, writeFile } from "node:fs/promises";

const initial = {
  choices: [],
  usage: { prompt_tokens: 169, completion_tokens: 0, total_tokens: 169 },
};
const frame = (value: unknown) => `data: ${JSON.stringify(value)}\n\n`;
const pricing = {
  inputPerMillion: 0.15,
  outputPerMillion: 0.6,
  currency: "USD" as const,
};

it.each([
  [
    "regressing usage",
    frame({
      ...initial,
      usage: { prompt_tokens: 168, completion_tokens: 0, total_tokens: 168 },
    }),
  ],
  ["malformed SSE JSON", "data: INVALID_SYNTHETIC_JSON\n\n"],
  ["provider error frame", frame({ error: { message: "SYNTHETIC_ONLY" } })],
  ["truncated stream", ""],
  ["empty completed stream", "data: [DONE]\n\n"],
])(
  "synthetic %s can retain 169/0 usage with no answer; this is not a captured provider replay",
  async (_name, suffix) => {
    let text = "";
    const signal = new AbortController().signal;
    try {
      await consumeReply(
        completionEvents(new Response(frame(initial) + suffix), signal),
        pricing,
        signal,
        (chunk) => {
          text += chunk;
        },
      );
      throw new Error("Expected rejection");
    } catch (error) {
      expect(error).toBeInstanceOf(IncompleteReplyError);
      expect((error as IncompleteReplyError).usage).toMatchObject({
        input: 169,
        output: 0,
        total: 169,
      });
      expect(text).toBe("");
    }
  },
);

it("reproduces browser ERR_ABORTED after local parser rejection with no provider access", async () => {
  const vite = await createServer({
    configFile: false,
    appType: "custom",
    logLevel: "silent",
    cacheDir: "node_modules/.vite-failure-diagnostic",
    server: { host: "127.0.0.1", port: 0, hmr: false },
  });
  let localRequests = 0;
  vite.middlewares.use((req, res, next) => {
    if (req.url === "/") {
      res.setHeader("Content-Type", "text/html");
      res.end("<title>Offline synthetic parser diagnostic</title>");
    } else if (req.url === "/synthetic-stream") {
      localRequests++;
      res.setHeader("Content-Type", "text/event-stream");
      res.write(
        frame(initial) +
          frame({
            ...initial,
            usage: {
              prompt_tokens: 168,
              completion_tokens: 0,
              total_tokens: 168,
            },
          }),
      );
      // Leave transport open so cancellation has an observable terminal event.
      const timer = setTimeout(() => res.end(), 10000);
      res.on("close", () => clearTimeout(timer));
    } else next();
  });
  let browser;
  try {
    await vite.listen();
    const address = vite.httpServer!.address();
    if (!address || typeof address === "string")
      throw new Error("No loopback server");
    const origin = `http://127.0.0.1:${address.port}`;
    browser = await chromium.launch(browserLaunchOptions());
    const context = await browser.newContext({ serviceWorkers: "block" });
    const external: string[] = [];
    await context.route("**/*", (route) => {
      if (new URL(route.request().url()).origin !== origin) {
        external.push("BLOCKED_EXTERNAL");
        return route.abort();
      }
      return route.continue();
    });
    const page = await context.newPage();
    await page.goto(origin);
    const terminal = page.waitForEvent("requestfailed", {
      predicate: (r) => new URL(r.url()).pathname === "/synthetic-stream",
      timeout: 10000,
    });
    const observed = await page.evaluate(`(async () => {
      const {completionEvents} = await import('/src/completion-events.ts');
      const {consumeReply} = await import('/src/reply-stream.ts');
      const response = await fetch('/synthetic-stream');
      let text = ''; const signal = new AbortController().signal;
      try { await consumeReply(completionEvents(response, signal), {inputPerMillion:0.15,outputPerMillion:0.6,currency:'USD'}, signal, part => text += part); return {rejected:false}; }
      catch (e) { return {rejected:true, status:response.status, textLength:text.length, usage:e.usage}; }
    })()`);
    const errorCode = (await terminal).failure()?.errorText;
    expect(observed).toMatchObject({
      rejected: true,
      status: 200,
      textLength: 0,
      usage: { input: 169, output: 0, total: 169 },
    });
    expect(errorCode).toBe("net::ERR_ABORTED");
    expect(localRequests).toBe(1);
    expect(external).toEqual([]);
    await mkdir(".local/diagnostics", { recursive: true });
    await writeFile(
      `.local/diagnostics/windows-compatibility-offline-${Date.now()}.json`,
      JSON.stringify(
        {
          kind: "SYNTHETIC_PARSER_CANCELLATION_DIAGNOSTIC",
          providerRequests: 0,
          localFixtureRequests: localRequests,
          observed,
          errorCode,
          conclusion:
            "Local regressing-usage rejection reproduces the cancellation signature. This is a synthetic fixture, not a provider replay.",
        },
        null,
        2,
      ),
      { flag: "wx", mode: 0o600 },
    );
  } finally {
    await browser?.close();
    await vite.close();
  }
}, 30000);
