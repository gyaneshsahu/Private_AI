// Stage 2 spike (branch privatemode-eval): the Privatemode adapter in a real browser.
// Live network and the owner's key; runs only with PRIVATEMODE_LIVE=1 and the key loaded
// by scripts/WindowsSecrets.psm1. Synthetic prompts only.
import { createHash } from "node:crypto";
import { createServer, type Server } from "node:https";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, expect, it } from "vitest";
import { chromium, type Browser } from "@playwright/test";
import { build } from "esbuild";
import express from "express";
import { PrivatemodeAI } from "privatemode-ai";
import { privatemodeRelay } from "../server/providers/privatemode-relay";
import { localTLS } from "./fixtures/local-tls";

const key = process.env.PRIVATEMODE_API_KEY ?? "";
const enabled = process.env.PRIVATEMODE_LIVE === "1" && !!key;
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
const canary = "CANARY-PLAINTEXT-4471";

let server: Server, browser: Browser, origin: string;
let tls: Awaited<ReturnType<typeof localTLS>>;
let live: Uint8Array, served: Uint8Array;
// Production policy keeps connections same-origin; one test opens the manifest CDN to
// exercise the adapter's own refusal when the SDK swaps the manifest by itself.
let connectSrc = "'self'";
const seen: { path: string; plaintext: boolean }[] = [];

beforeAll(async () => {
  if (!enabled) return;
  const probe = new PrivatemodeAI({ apiKey: key, enableWasmLogging: false });
  await probe.verify();
  live = probe.manifestBytes!;
  probe.close();
  served = live;
  const bundle = await build({
    entryPoints: ["tests/fixtures/privatemode-page.ts"],
    bundle: true,
    format: "esm",
    platform: "browser",
    // The SDK's Node-only branch (reading the Wasm file) is never taken in a browser.
    external: ["node:*"],
    write: false,
    logLevel: "silent",
  });
  const app = express();
  // Production-like policy: same-origin connections only, Wasm compilation allowed.
  app.use((_req, res, next) => {
    res.setHeader(
      "Content-Security-Policy",
      `default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; connect-src ${connectSrc}`,
    );
    next();
  });
  app.get("/", (_req, res) =>
    res
      .type("html")
      .send('<!doctype html><script type="module" src="/page.js"></script>'),
  );
  app.get("/page.js", (_req, res) =>
    res.type("js").send(bundle.outputFiles[0].text),
  );
  const wasm = await readFile(
    "node_modules/privatemode-ai/dist/privatemode.wasm",
  );
  app.use(
    privatemodeRelay({
      apiKey: key,
      allowedModels: ["glm-5.3-flash"],
      manifest: () => served,
      wasm: () => wasm,
      observe: (path, body) =>
        seen.push({ path, plaintext: body.includes(canary) }),
    }),
  );
  tls = await localTLS();
  server = createServer({ key: tls.key, cert: tls.cert }, app);
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  origin = `https://localhost:${(server.address() as { port: number }).port}`;
  browser = await chromium.launch();
}, 60_000);

afterAll(async () => {
  await browser?.close();
  if (server) await new Promise((r) => server.close(r));
  await tls?.dispose();
});

async function run(digests: string[]) {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  const requests: { url: string; auth?: string; body?: string }[] = [];
  page.on("request", (r) =>
    requests.push({
      url: r.url(),
      auth: r.headers().authorization,
      body: r.postData() ?? undefined,
    }),
  );
  const violations: string[] = [];
  page.on("console", (m) => {
    if (/Content Security Policy|Refused to connect/i.test(m.text())) violations.push(m.text());
  });
  await page.goto(origin);
  await page.waitForFunction(() => typeof window.runPrivatemode === "function");
  const outcome = await page.evaluate(
    ([d, p]) => window.runPrivatemode(d, p),
    [digests, `Ignore ${canary}. Reply with the word: ready`] as const,
  );
  const pageText = await page.content();
  await context.close();
  return { outcome, requests, violations, pageText };
}

it.skipIf(!enabled)(
  "sends through our relay with a placeholder key; the browser never holds the key and the relay never sees plaintext",
  async () => {
    seen.length = 0;
    const { outcome, requests, violations, pageText } = await run([sha(live)]);
    expect(outcome, JSON.stringify(outcome)).toMatchObject({ ok: true });
    expect(outcome.text?.toLowerCase()).toContain("ready");
    // Every browser request stays on our origin and never carries the real key.
    for (const r of requests) {
      expect(new URL(r.url).origin, r.url).toBe(origin);
      expect(r.auth ?? "").not.toContain(key);
      expect(r.body ?? "").not.toContain(key);
    }
    expect(requests.some((r) => r.auth === "Bearer relay-injects-the-key")).toBe(
      true,
    );
    expect(pageText).not.toContain(key);
    expect(violations).toEqual([]);
    // The relay forwarded attestation, secret and chat, and only ever held ciphertext.
    expect(new Set(seen.map((s) => s.path))).toEqual(
      new Set([
        "/privatemode/v1/attest",
        "/privatemode/v1/secret",
        "/v1/chat/completions",
      ]),
    );
    expect(seen.some((s) => s.plaintext)).toBe(false);
  },
  120_000,
);

it.skipIf(!enabled)(
  "refuses before contacting Privatemode when the manifest is not the approved one",
  async () => {
    seen.length = 0;
    const { outcome } = await run(["0".repeat(64)]);
    expect(outcome).toMatchObject({ ok: false });
    expect(outcome.error).toContain(
      "does not match the reviewed provider configuration",
    );
    expect(seen).toEqual([]);
  },
  120_000,
);

it.skipIf(!enabled)(
  "refuses and sends no chat request when the provider's deployment differs from the approved manifest",
  async () => {
    // An approved manifest that no longer matches the live deployment (as after an
    // unannounced update): the SDK fetches the new one; our adapter must stop.
    const outdated = JSON.parse(new TextDecoder().decode(live));
    outdated.ReferenceValues.snp[0].TrustedMeasurement = "00".repeat(48);
    served = new TextEncoder().encode(JSON.stringify(outdated));
    seen.length = 0;
    try {
      // The page policy blocks the SDK's attempt to fetch a replacement manifest.
      const { outcome, requests, violations } = await run([sha(served)]);
      expect(outcome).toMatchObject({ ok: false });
      expect(violations.some((v) => v.includes("cdn.confidential.cloud"))).toBe(true);
      expect(requests.some((r) => r.url.includes("/v1/chat/completions"))).toBe(false);
      expect(seen.filter((s) => s.path === "/v1/chat/completions")).toEqual([]);
      // With the CDN allowed, the SDK swaps the manifest itself; the adapter must stop.
      connectSrc = "'self' https://cdn.confidential.cloud";
      seen.length = 0;
      const swapped = await run([sha(served)]);
      expect(swapped.outcome).toMatchObject({ ok: false });
      expect(swapped.outcome.error).toContain("differs from the reviewed one");
      expect(seen.filter((s) => s.path === "/v1/chat/completions")).toEqual([]);
    } finally {
      served = live;
      connectSrc = "'self'";
    }
  },
  120_000,
);
