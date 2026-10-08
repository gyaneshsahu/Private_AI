import { mkdir, writeFile } from "node:fs/promises";
import { it, expect } from "vitest";
import { createServer } from "vite";
import { chromium } from "@playwright/test";
import { existsSync } from "node:fs";
import {
  CipherSuite,
  KEM_DHKEM_X25519_HKDF_SHA256,
  KDF_HKDF_SHA256,
  AEAD_AES_256_GCM,
} from "hpke";
import {
  deriveResponseKeys,
  encryptChunk,
  bytesToHex,
  hexToBytes,
  HPKE_REQUEST_INFO,
  EXPORT_LABEL,
  EXPORT_LENGTH,
} from "../node_modules/ehbp/dist/esm/derive.js";

it("real browser transport with a synthetic encrypted peer rejects faults without retries or plaintext logs", async () => {
  // Only attestation is mocked. Real browser EHBP crypto, request construction,
  // SSE parsing and completion validation run. This cannot qualify a provider.
  const suite = new CipherSuite(
    KEM_DHKEM_X25519_HKDF_SHA256,
    KDF_HKDF_SHA256,
    AEAD_AES_256_GCM,
  );
  const keys = await suite.GenerateKeyPair(true);
  const publicKey = bytesToHex(
    new Uint8Array(await suite.SerializePublicKey(keys.publicKey)),
  );
  let mode = "valid";
  const requests: Array<{
    encrypted: boolean;
    plaintext: string;
    authorization?: string;
  }> = [];
  const failures: string[] = [];
  const external: string[] = [];
  const logs: string[] = [];
  const vite = await createServer({
    configFile: false,
    cacheDir: ".local/vite-tests/browser-transport",
    appType: "custom",
    logLevel: "silent",
    optimizeDeps: { exclude: ["tinfoil"] },
    plugins: [
      {
        name: "TEST-attestation-only",
        enforce: "pre",
        resolveId(id) {
          if (id === "tinfoil") return "\0test-attestation";
        },
        load(id) {
          if (id !== "\0test-attestation") return;
          return `export async function fetchAttestationBundle() { return { domain: window.verificationFaultMode === 'wrong_host' ? 'invalid.example' : 'inference.tinfoil.sh' }; }
      export class Verifier {
        async verifyBundle() { if (window.verificationFaultMode === "stalled_verification") await new Promise(() => {}); if (window.verificationFaultMode === 'verification_error') throw new Error('TEST verification failed'); }
        getVerificationDocument() { return { securityVerified: window.verificationFaultMode !== 'unverified', enclaveHost: 'inference.tinfoil.sh', configRepo: 'tinfoilsh/confidential-model-router', hpkePublicKey: '${publicKey}', releaseDigest: (window.verificationFaultMode === 'wrong_release' ? 'b' : 'a').repeat(64) }; }
      }`;
        },
      },
    ],
    server: { host: "127.0.0.1", port: 0, hmr: false },
  });
  vite.middlewares.use(async (req, res, next) => {
    if (req.url === "/") {
      res.setHeader("Content-Type", "text/html");
      res.end("<title>TEST encrypted peer</title>");
      return;
    }
    if (req.url !== "/api/inference/v1/chat/completions") {
      next();
      return;
    }
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const body = Buffer.concat(chunks);
      const enc = hexToBytes(String(req.headers["ehbp-encapsulated-key"]));
      const recipient = await suite.SetupRecipient(keys.privateKey, enc, {
        info: new TextEncoder().encode(HPKE_REQUEST_INFO),
      });
      const plaintext = new TextDecoder().decode(
        await recipient.Open(body.subarray(4, 4 + body.readUInt32BE(0))),
      );
      requests.push({
        encrypted: !body.includes(Buffer.from("SYNTHETIC_REQUEST_CANARY")),
        plaintext,
        authorization: req.headers.authorization,
      });
      if (mode === "http_error") {
        res.statusCode = 503;
        res.end("SYNTHETIC_ERROR_CANARY");
        return;
      }
      const frame = (content: string, finish: string | null) =>
        `data: ${JSON.stringify({ choices: [{ index: 0, delta: { content }, finish_reason: finish }] })}\n\n`;
      let text = frame("TEST answer: 4", mode === "truncated" ? null : "stop");
      if (mode === "thinking_on") {
        text =
          `data: ${JSON.stringify({ choices: [{ index: 0, delta: { reasoning_content: "SYNTHETIC_REASONING_CANARY" }, finish_reason: null }] })}\n\n` +
          text;
      }
      if (mode === "valid") {
        const initial = `data: ${JSON.stringify({ choices: [], usage: { prompt_tokens: 2, completion_tokens: 0, total_tokens: 2 } })}\n\n`;
        text = initial + initial + text;
      }
      text += `data: ${JSON.stringify({ choices: [], usage: { prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 } })}\n\n`;
      if (mode !== "truncated") text += "data: [DONE]\n\n";
      if (mode === "malformed")
        text = "data: SYNTHETIC_RESPONSE_CANARY_INVALID_JSON\n\n";
      if (mode === "named_error")
        text =
          "event: thread.error\ndata: SYNTHETIC_RESPONSE_CANARY_INVALID_JSON\n\n";
      const nonce = crypto.getRandomValues(new Uint8Array(32));
      const secret = await recipient.Export(
        new TextEncoder().encode(EXPORT_LABEL),
        EXPORT_LENGTH,
      );
      const material = await deriveResponseKeys(secret, enc, nonce);
      const cipher = await encryptChunk(
        material,
        0,
        new TextEncoder().encode(text),
      );
      let framed = Buffer.alloc(4 + cipher.length);
      framed.writeUInt32BE(cipher.length);
      framed.set(cipher, 4);
      if (mode === "valid") {
        const frames: Buffer[] = [];
        let sequence = 0;
        for (const event of text.split(/(?<=\n\n)/).filter(Boolean)) {
          const encrypted = await encryptChunk(
            material,
            sequence++,
            new TextEncoder().encode(event),
          );
          const record = Buffer.alloc(4 + encrypted.length);
          record.writeUInt32BE(encrypted.length);
          record.set(encrypted, 4);
          frames.push(record);
        }
        framed = Buffer.concat(frames);
      }
      if (mode === "tampered") framed[framed.length - 1] ^= 1;
      res.setHeader("Content-Type", "text/event-stream");
      if (mode !== "missing_nonce")
        res.setHeader("Ehbp-Response-Nonce", bytesToHex(nonce));
      for (let offset = 0; offset < framed.length; offset += 37) {
        res.write(framed.subarray(offset, offset + 37));
        if (mode === "valid")
          await new Promise((resolve) => setTimeout(resolve, 2));
      }
      res.end();
    } catch (error) {
      res.statusCode = 500;
      res.end("TEST peer error");
    }
  });
  await vite.listen();
  const address = vite.httpServer!.address();
  if (!address || typeof address === "string") throw new Error();
  const origin = `http://127.0.0.1:${address.port}`;
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROMIUM_PATH ??
      (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
  });
  try {
    const page = await browser.newPage();
    page.on("console", (msg) => logs.push(msg.text()));
    page.on("requestfailed", (req) =>
      failures.push(
        `${new URL(req.url()).pathname}: ${req.failure()?.errorText}`,
      ),
    );
    await page.route("**/*", (route) => {
      if (new URL(route.request().url()).origin !== origin) {
        external.push(route.request().url());
        return route.abort();
      }
      return route.continue();
    });
    await page.goto(origin);
    await page.addScriptTag({
      type: "module",
      url: `${origin}/tests/fixtures/browser-fault-entry.ts`,
    });
    await page.waitForFunction(() => "runFaultCase" in window);
    for (const scenario of [
      "valid",
      "thinking_on",
      "thinking_off",
      "glm_low",
      "pre_cancel",
      "stalled_verification",
      "wrong_host",
      "verification_error",
      "unverified",
      "wrong_release",
      "permission_expired",
      "tampered",
      "missing_nonce",
      "http_error",
      "malformed",
      "named_error",
      "truncated",
      "cancel",
    ]) {
      mode = scenario;
      const before = requests.length;
      const succeeds = [
        "valid",
        "thinking_on",
        "thinking_off",
        "glm_low",
      ].includes(mode);
      const finished = succeeds
        ? page.waitForEvent("requestfinished", {
            predicate: (request) =>
              new URL(request.url()).pathname ===
              "/api/inference/v1/chat/completions",
          })
        : undefined;
      const result = await page.evaluate(
        async (mode) =>
          (
            window as unknown as {
              runFaultCase: (mode: string) => Promise<any>;
            }
          ).runFaultCase(mode),
        mode,
      );
      if (finished) await finished;
      expect(JSON.stringify(result)).not.toContain(
        "SYNTHETIC_REASONING_CANARY",
      );
      const preSend = [
        "pre_cancel",
        "stalled_verification",
        "wrong_host",
        "verification_error",
        "unverified",
        "wrong_release",
        "permission_expired",
      ].includes(mode);
      expect(
        requests.length - before,
        `${mode}: ${result.testError}; ${logs.join(";")}; blocked=${external.join(";")}`,
      ).toBe(preSend ? 0 : 1);
      expect(result.failure, mode).toBe(!succeeds);
      if (succeeds) {
        expect(result.answer.status).toBe("complete");
        expect(result.usage.total).toBe(5);
        // Inspect events now, before fault cases or closing the page.
        expect(failures.filter((x) => x.includes("/api/inference/"))).toEqual(
          [],
        );
      } else {
        expect(result.answer.status).toBe("partial");
        expect(
          result.context.some((m: { role: string }) => m.role === "assistant"),
        ).toBe(false);
      }
      if (mode === "truncated") expect(result.usage.total).toBe(5);
      if (!preSend) {
        const payload = JSON.parse(requests[before].plaintext);
        expect(payload.chat_template_kwargs).toEqual(
          mode.startsWith("thinking_")
            ? { enable_thinking: mode === "thinking_on" }
            : mode === "glm_low"
              ? { reasoning_effort: "low" }
              : undefined,
        );
        const secret = payload.user_cache_secret;
        expect(JSON.stringify(result).includes(secret)).toBe(false);
      }
    }
    const currentAdapterRequestCount = requests.length;
    // Replay the historical SDK composition offline, with request identity.
    // Either terminal event is evidence; do not silently suppress aborts.
    mode = "legacy_valid";
    const legacyTerminal = Promise.race([
      page
        .waitForEvent("requestfinished", {
          predicate: (r) =>
            new URL(r.url()).pathname === "/api/inference/v1/chat/completions",
        })
        .then(() => "FINISHED"),
      page
        .waitForEvent("requestfailed", {
          predicate: (r) =>
            new URL(r.url()).pathname === "/api/inference/v1/chat/completions",
        })
        .then((r) => r.failure()?.errorText ?? "FAILED"),
    ]);
    const legacyResult = await page.evaluate(async () =>
      (
        window as unknown as { runFaultCase: (mode: string) => Promise<any> }
      ).runFaultCase("legacy_valid"),
    );
    expect(legacyResult.failure).toBe(false);
    expect(legacyResult.usage.total).toBe(5);
    const legacyEvidence = {
      kind: "OFFLINE_LEGACY_TRANSPORT_REPLAY",
      replyComplete: true,
      terminalEvent: await legacyTerminal,
      providerEvidence: false,
      limits:
        "Local synthetic peer, mocked attestation. Historical WSL request identity was not recorded.",
    };
    await mkdir(".local/reliability", { recursive: true });
    await writeFile(
      ".local/reliability/legacy-replay.json",
      JSON.stringify(legacyEvidence, null, 2),
    );
    expect(external).toEqual([]);
    expect(requests.every((r) => r.encrypted && !r.authorization)).toBe(true);
    expect(
      requests.every((r) => {
        const p = JSON.parse(r.plaintext);
        return (
          p.model ===
          (p.chat_template_kwargs?.reasoning_effort
            ? "glm-5-3"
            : p.chat_template_kwargs
              ? "gemma4-31b"
              : "TEST_ONLY")
        );
      }),
    ).toBe(true);
    expect(logs.join("\n")).not.toMatch(
      /SYNTHETIC_(REQUEST|RESPONSE|ERROR|REASONING)_CANARY/,
    );
    const cacheSecrets = requests
      .slice(0, currentAdapterRequestCount)
      .map((r) => JSON.parse(r.plaintext).user_cache_secret);
    expect(
      cacheSecrets.every(
        (secret) => typeof secret === "string" && secret.length >= 32,
      ),
    ).toBe(true);
    expect(new Set(cacheSecrets).size === cacheSecrets.length).toBe(true);
    expect(
      cacheSecrets.some((secret) => logs.some((line) => line.includes(secret))),
    ).toBe(false);
    const storage = await page.evaluate(() =>
      JSON.stringify({
        local: { ...localStorage },
        session: { ...sessionStorage },
      }),
    );
    expect(cacheSecrets.some((secret) => storage.includes(secret))).toBe(false);
  } finally {
    await browser.close();
    await vite.close();
  }
}, 60000);
