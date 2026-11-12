// Privatemode in a real browser through the real app (Stage 3): admission, CSRF on the SDK's own
// attestation and key-exchange calls, placeholder key in the browser, ciphertext only at the relay.
// Live network and the owner's key; runs only with PRIVATEMODE_LIVE=1 and the key loaded by
// scripts/WindowsSecrets.psm1. Synthetic prompts; about 3 small requests.
import { createHash } from "node:crypto";
import { createServer, type Server } from "node:https";
import { afterEach, expect, it } from "vitest";
import { chromium } from "@playwright/test";
import { build } from "esbuild";
import { PrivatemodeAI } from "privatemode-ai";
import { createApp } from "../server/app";
import { privatemodeReport } from "./fixtures/privatemode-report";
import { localTLS } from "./fixtures/local-tls";

const key = process.env.PRIVATEMODE_API_KEY ?? "";
const enabled = process.env.PRIVATEMODE_LIVE === "1" && !!key;
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
const canary = "CANARY-PLAINTEXT-4471";
const servers: Server[] = [];
afterEach(async () => {
  for (const s of servers.splice(0)) {
    s.closeAllConnections();
    await new Promise((r) => s.close(r));
  }
});

let live: Uint8Array | undefined;
async function liveManifest() {
  if (!live) {
    const probe = new PrivatemodeAI({ apiKey: key, enableWasmLogging: false });
    await probe.verify();
    live = probe.manifestBytes!;
    probe.close();
  }
  return live;
}

async function run(manifest: Uint8Array, approved: string[]) {
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
  const port = 20000 + Math.floor(Math.random() * 20000);
  // The SDK always calls its base URL over HTTPS, so the app must be served over TLS.
  const origin = `https://localhost:${port}`;
  const app = createApp({
    origin,
    qualification: privatemodeReport({ releaseDigests: approved }),
    apiKey: key,
    providerManifest: manifest,
  });
  app.get("/", (_req, res) => res.type("html").send('<!doctype html><script type="module" src="/page.js"></script>'));
  app.get("/page.js", (_req, res) => res.type("js").send(bundle.outputFiles[0].text));
  const tls = await localTLS();
  const server = createServer({ key: tls.key, cert: tls.cert }, app);
  servers.push(server);
  await new Promise<void>((r) => server.listen(port, "127.0.0.1", r));
  const browser = await chromium.launch();
  try {
    const page = await (await browser.newContext({ ignoreHTTPSErrors: true })).newPage();
    const requests: { url: string; auth?: string; csrf?: string; body: string }[] = [];
    page.on("request", (r) =>
      requests.push({
        url: r.url(),
        auth: r.headers().authorization,
        csrf: r.headers()["x-privateai-csrf"],
        body: r.postDataBuffer()?.toString("latin1") ?? "",
      }),
    );
    const responses: string[] = [];
    page.on("response", (r) => responses.push(`${r.request().method()} ${new URL(r.url()).pathname} ${r.status()}`));
    const violations: string[] = [];
    page.on("console", (m) => {
      if (/Content Security Policy|Refused to connect/i.test(m.text())) violations.push(m.text());
    });
    await page.goto(origin);
    await page.waitForFunction(() => typeof window.runPrivatemode === "function");
    const outcome = await page.evaluate(
      (p) => window.runPrivatemode(p),
      `Ignore ${canary}. Reply with the word: ready`,
    );
    return { outcome, requests, responses, violations, pageText: await page.content(), origin };
  } finally {
    await browser.close();
    await tls.dispose();
  }
}

it.skipIf(!enabled)(
  "chat through the app: CSRF on attest, secret and chat, placeholder key in the browser, ciphertext only at the relay",
  async () => {
    const manifest = await liveManifest();
    const { outcome, requests, responses, violations, pageText, origin } = await run(manifest, [sha(manifest)]);
    expect(outcome, JSON.stringify({ outcome, responses, violations })).toMatchObject({ ok: true });
    expect(outcome.text?.toLowerCase()).toContain("ready");
    for (const r of requests) {
      expect(new URL(r.url).origin, r.url).toBe(origin);
      expect(r.auth ?? "").not.toContain(key);
      expect(r.body).not.toContain(key);
    }
    const posts = requests.filter((r) => r.body);
    expect(new Set(posts.map((r) => new URL(r.url).pathname))).toEqual(
      new Set(["/privatemode/v1/attest", "/privatemode/v1/secret", "/v1/chat/completions"]),
    );
    // Every SDK call carried the session's CSRF token (the gate would have refused it otherwise).
    for (const r of posts) expect(r.csrf, r.url).toMatch(/^[a-f0-9]{64}$/);
    // Only ciphertext left the browser.
    expect(posts.some((r) => r.body.includes(canary))).toBe(false);
    expect(pageText).not.toContain(key);
    expect(violations).toEqual([]);
  },
  180_000,
);

it.skipIf(!enabled)(
  "refuses before contacting Privatemode when the served manifest is not the approved one",
  async () => {
    const manifest = await liveManifest();
    const { outcome, requests } = await run(manifest, ["0".repeat(64)]);
    expect(outcome).toMatchObject({ ok: false });
    expect(requests.some((r) => r.url.includes("/v1/"))).toBe(false);
  },
  180_000,
);

it.skipIf(!enabled)(
  "sends no chat request when the approved manifest no longer matches the live deployment",
  async () => {
    const outdated = JSON.parse(new TextDecoder().decode(await liveManifest()));
    outdated.ReferenceValues.snp[0].TrustedMeasurement = "00".repeat(48);
    const served = new TextEncoder().encode(JSON.stringify(outdated));
    const { outcome, requests } = await run(served, [sha(served)]);
    expect(outcome).toMatchObject({ ok: false });
    expect(requests.some((r) => r.url.includes("/v1/chat/completions"))).toBe(false);
  },
  180_000,
);
