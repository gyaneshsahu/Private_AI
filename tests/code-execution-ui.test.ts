// Code execution in the conversation (docs/code-execution-20261114.md), in a real browser with the
// real worker and the real Pyodide from /vendor/pyodide on the test's own Vite server. Only the
// model is faked: a Vite plugin replaces src/inference.ts and plays the model's part (it asks
// for code through the runtime the app hands it), and the status is faked. No provider call.
import { execFileSync } from "node:child_process";
import { it, expect } from "vitest";
import { chromium, expect as ui } from "@playwright/test";
import { createServer } from "vite";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";

const qualification = {
  provider: "privatemode",
  maxInputCharacters: 8000,
  model: "SYNTHETIC_FAST",
  modes: {
    fast: { model: "SYNTHETIC_FAST", maxOutputTokens: 1024, allowanceCost: 1 },
    thinking: { model: "SYNTHETIC_DEEP", maxOutputTokens: 4096, allowanceCost: 3 },
  },
};
// The model's part. The question picks the code; "SLOW" never ends, "BRIDGE" tries every way out.
const model = `export async function streamReply(c,q,csrf,signal,chunk,status,calc,kept,choice,mode,salt,code){
  const question = c.messages.at(-1).text;
  (window.__calls ??= []).push({ mode, code: !!code });
  if (!code) { chunk("Without code: about 1,220 EUR."); return { input: 1, output: 1, total: 2, estimatedUSD: 0 }; }
  chunk("Let me calculate. ");
  const source = question.includes("SLOW") ? "while True:\\n    pass"
    : question.includes("BRIDGE") ? ${JSON.stringify(
      [
        "import sys",
        "for name in ('js', 'pyodide', 'pyodide_js', 'micropip'):",
        "    try:",
        "        __import__(name)",
        "        print(name, 'REACHED')",
        "    except ImportError:",
        "        print(name, 'blocked')",
        "import socket",
        "try:",
        "    s = socket.create_connection(('example.com', 80), timeout=2)",
        "    s.sendall(b'GET / HTTP/1.0\\r\\n\\r\\n')",
        "    print('socket', 'REACHED', s.recv(10))",
        "except Exception as error:",
        "    print('socket', 'blocked')",
        "import urllib.request",
        "try:",
        "    urllib.request.urlopen('http://example.com')",
        "    print('urllib', 'REACHED')",
        "except Exception as error:",
        "    print('urllib', 'blocked')",
      ].join("\n"),
    )}
    : 'from decimal import Decimal\\nprint("VAT:", Decimal("6420") * Decimal("0.19"))';
  const started = performance.now();
  const result = await code.run(source, signal);
  (window.__timings ??= []).push(Math.round(performance.now() - started));
  code.onRuns([{ code: source, ...result }], false);
  chunk(result.error ? "The code did not finish." : "The VAT is 1,219.80 EUR.");
  return { input: 1, output: 1, total: 2, estimatedUSD: 0 };
}`;

it("runs the model's code in the worker with the real Pyodide, marks the answer, shows code and output on request, and keeps Auto in Fast; off, nothing changes", async () => {
  execFileSync(process.execPath, ["scripts/assets.mjs"]);
  const vite = await createServer({
    configFile: false,
    logLevel: "silent",
    cacheDir: "node_modules/.vite-code-execution-ui-test",
    plugins: [
      {
        name: "synthetic-model-with-code",
        enforce: "pre",
        load(id) {
          if (id.replaceAll("\\", "/").endsWith("/src/inference.ts")) return model;
        },
      },
    ],
    server: { host: "127.0.0.1", port: 0, hmr: false },
    worker: { format: "es" },
  });
  await vite.listen();
  await warmDevServer(vite);
  const address = vite.httpServer!.address();
  if (!address || typeof address === "string") throw Error("No local port");
  const origin = `http://127.0.0.1:${address.port}`;
  const browser = await chromium.launch(browserLaunchOptions());
  try {
    let code = true;
    const elsewhere: string[] = [];
    const pyodide: string[] = [];
    const page = await browser.newPage();
    await page.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) {
        elsewhere.push(url.href);
        return route.abort();
      }
      if (url.pathname.includes("pyodide")) pyodide.push(url.pathname);
      if (url.pathname === "/api/status")
        return route.fulfill({
          json: { csrf: "SYNTHETIC", inference: { ready: true, reason: "OFFLINE ONLY", qualification }, search: false, ...(code ? { code: true } : {}) },
        });
      return route.continue();
    });
    await page.goto(origin, { timeout: 30000 });
    const ask = async (text: string) => {
      await page.getByLabel("Message CometRow").fill(text);
      await page.getByRole("button", { name: "Send ↑", exact: true }).click();
    };
    // Pyodide is not loaded with the page.
    await ui(page.getByLabel("Message CometRow")).toBeVisible();
    expect(pyodide).toEqual([]);

    await ask("What is 19 % of 6420 EUR?");
    const first = page.locator("article.assistant").nth(0);
    await ui(first.locator(".code-used")).toHaveText("Calculated with code on this device", { timeout: 60_000 });
    // The preamble streamed before the code ran is gone; the answer stands alone.
    await ui(first.locator(".message-text, .answer").first()).toContainText("The VAT is 1,219.80 EUR.");
    await ui(first).not.toContainText("Let me calculate.");
    await ui(first.locator(".answered-by")).toHaveText("Auto · Fast");
    await ui(first.locator(".arithmetic-check")).toHaveCount(0);
    // Collapsed until opened; then the code and the exact output of the real interpreter, copyable.
    const details = first.locator("details.code-runs");
    await ui(details).not.toHaveAttribute("open", "");
    await details.locator("summary").click();
    await ui(details).toContainText('print("VAT:", Decimal("6420") * Decimal("0.19"))');
    await ui(details).toContainText("VAT: 1219.80");
    await ui(details.getByRole("button", { name: "Copy" })).toHaveCount(2);
    expect(pyodide.every((path) => path.startsWith("/vendor/pyodide/314.0.8/"))).toBe(true);
    expect(new Set(pyodide.map((path) => path.split("/").pop()))).toEqual(
      new Set(["pyodide.mjs", "pyodide.asm.mjs", "pyodide.asm.wasm", "python_stdlib.zip", "pyodide-lock.json"]),
    );

    // Nothing leads out of the worker: not Python's bridge to the browser, not a socket, not urllib.
    await ask("BRIDGE: what is 2 + 2 and 3 + 3?");
    const second = page.locator("article.assistant").nth(1);
    await ui(second.locator(".code-used")).toBeVisible({ timeout: 60_000 });
    await second.locator("details.code-runs summary").click();
    await ui(second.locator("details.code-runs pre").last()).toHaveText(
      ["js", "pyodide", "pyodide_js", "micropip", "socket", "urllib"].map((name) => `${name} blocked`).join("\n"),
    );

    // Code that never ends is stopped after 10 seconds; the answer says code failed, plainly.
    await ask("SLOW: what is 2 + 2 and 3 + 3?");
    const third = page.locator("article.assistant").nth(2);
    await ui(third.locator(".code-used")).toHaveText(
      "Code was tried on this device but ended with an error. The figures in this answer were not calculated with code. Please check them.",
      { timeout: 60_000 },
    );
    await third.locator("details.code-runs summary").click();
    await ui(third.locator("details.code-runs")).toContainText("ERROR: the code ran longer than 10 seconds and was stopped");
    const timings = await page.evaluate(() => (window as unknown as { __timings: number[] }).__timings);
    expect(timings[2]).toBeGreaterThan(10_000);
    expect(timings[2]).toBeLessThan(40_000);
    console.log(`Pyodide in the dev-server test: first call ${timings[0]} ms (download and start), second call ${timings[1]} ms (fresh worker).`);
    expect(elsewhere).toEqual([]);
    expect(await page.evaluate(() => (window as unknown as { __calls: unknown[] }).__calls)).toEqual([
      { mode: "fast", code: true },
      { mode: "fast", code: true },
      { mode: "fast", code: true },
    ]);

    // Switch off: the same question goes to Thinking without the tool, as before.
    code = false;
    await page.reload();
    await ask("What is 19 % of 6420 EUR?");
    const plain = page.locator("article.assistant").last();
    await ui(plain).toContainText("Without code: about 1,220 EUR.");
    await ui(plain.locator(".answered-by")).toHaveText("Auto · Thinking");
    await ui(plain.locator(".code-used")).toHaveCount(0);
    await ui(plain.locator("details.code-runs")).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { __calls: unknown[] }).__calls)).toEqual([{ mode: "thinking", code: false }]);
  } finally {
    await browser.close();
    await vite.close();
  }
}, 240_000);
