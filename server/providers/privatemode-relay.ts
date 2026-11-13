// Privatemode adapter for the relay (Stage 3). The browser SDK (privatemode-ai, Wasm) owns
// attestation and encryption; it sends its attestation, key-exchange and chat calls to our
// origin with a placeholder key, and this relay forwards opaque bytes to Privatemode with the
// real key. It sees ciphertext and routing headers only. The model is pinned by
// `privatemode-target-model`: Privatemode routes by that header and a worker rejects a body
// for another model (probe of 11 November), so the allowlist holds. Token usage is encrypted,
// so the relay never meters a request; the spend guard counts each one at its worst case.
//
// The SDK uses only the origin of its base URL, so it calls three paths at the site root.
// `rootPaths` makes the app map them under /api/inference before any gate: chat then runs
// through the one admission route (session, CSRF, invite gate, allowance, spend guard, one
// request per account, stop switch) and attest/secret through session, CSRF and the stop switch.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { IncomingHttpHeaders } from "node:http";
import { resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { promisify } from "node:util";
import { brotliCompress, constants as zlib } from "node:zlib";
import express from "express";
import { request as upstreamRequest } from "undici";
import { qualifiedModels, type Qualification } from "../../shared/contracts";
import { serviceDispatcher } from "../network";
import { createAttestQueue } from "./privatemode-attest-queue";
import { count } from "../counters";
import {
  registerInferenceRelay,
  type InferenceRelayAdapter,
  type UpstreamReply,
} from "./inference-relay";

const single = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;
/** Client headers forwarded upstream: content negotiation and the SDK's own routing headers. */
const REQUEST_HEADERS = /^(content-type|accept|privatemode-[a-z-]+)$/;
const REPLY_HEADERS = /^(content-type|privatemode-oae-response-header|x-request-id)$/;
const KEY_PATHS = ["/privatemode/v1/attest", "/privatemode/v1/secret"];
/** The relay's reply when an attest call cannot be sent in time; the browser shows a plain message. */
export const ATTESTATION_BUSY = {
  error: "CometRow is busy checking the secure server. Please try again in a minute.",
  reason: "attestation_busy",
};

function forwardedHeaders(headers: IncomingHttpHeaders) {
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers))
    if (typeof value === "string" && REQUEST_HEADERS.test(name)) out[name] = value;
  return out;
}

let wasm: { sha256: string; bytes: Buffer } | undefined;
/** The SDK's Wasm from the installed package, read once (about 29 MB). */
function installedWasm() {
  if (!wasm) {
    const bytes = readFileSync(resolve("node_modules/privatemode-ai/dist/privatemode.wasm"));
    wasm = { bytes, sha256: createHash("sha256").update(bytes).digest("hex") };
  }
  return wasm;
}
let wasmBrotli: Promise<Buffer> | undefined;
/** The same bytes, Brotli-compressed once (29 MB to about 5 MB, under a second); the browser decodes before the SDK checks the hash. */
function compressedWasm(bytes: Buffer) {
  wasmBrotli ??= promisify(brotliCompress)(bytes, {
    params: { [zlib.BROTLI_PARAM_QUALITY]: 5, [zlib.BROTLI_PARAM_SIZE_HINT]: bytes.length },
  });
  return wasmBrotli;
}

/** A warning when the report's dedicated key expires within `days` (the API does not expose expiry). */
export function privatemodeKeyExpiryWarning(
  q: Pick<Qualification, "privatemode"> | undefined,
  now = Date.now(),
  days = 14,
): string | undefined {
  const expiresAt = q?.privatemode?.portalKeyLimit.expiresAt;
  if (!expiresAt) return undefined;
  const left = Date.parse(expiresAt) - now;
  if (left > days * 86400000) return undefined;
  return left <= 0
    ? `The Privatemode API key expired at ${expiresAt}. Chat requests will fail until the owner creates a new key and updates the report.`
    : `The Privatemode API key expires at ${expiresAt} (in ${Math.ceil(left / 86400000)} days). The owner must create a new key and update the report before then.`;
}

export function createPrivatemodeRelayAdapter(): InferenceRelayAdapter {
  return {
    id: "privatemode",
    // connect-src stays 'self': the SDK reaches Privatemode only through this relay, and the
    // policy blocks the SDK's own manifest refetch from its CDN (spike, 11 November).
    verificationHosts() {
      return [];
    },
    admit(headers, body, qualification) {
      const model = headers["privatemode-target-model"];
      if (typeof model !== "string" || !qualifiedModels(qualification).has(model))
        return { ok: false, error: "Only the qualified model is accepted." };
      if (!Buffer.isBuffer(body) || body.length < 16)
        return {
          ok: false,
          error: "Only encrypted requests to the qualified destination are accepted.",
        };
      return { ok: true, model, upstreamHeaders: forwardedHeaders(headers) };
    },
    upstream({ qualification, apiKey, model, upstreamHeaders }) {
      return {
        url: new URL("/v1/chat/completions", qualification.origin),
        headers: {
          ...upstreamHeaders,
          // The relay's admitted model, never a client-chosen one.
          "privatemode-target-model": model,
          authorization: `Bearer ${apiKey}`,
        },
      };
    },
    accept(reply: UpstreamReply) {
      const passthrough: Record<string, string> = {};
      if (reply.statusCode !== 200) return { ok: false, passthrough };
      for (const [name, value] of Object.entries(reply.headers)) {
        const v = single(value);
        if (v !== undefined && REPLY_HEADERS.test(name)) passthrough[name] = v;
      }
      return { ok: true, passthrough };
    },
    classifyFailure(reply) {
      return reply.statusCode >= 400 && reply.statusCode < 500 ? "rejected" : "unavailable";
    },
    // Encrypted usage: nothing to meter here.
    usage() {
      return undefined;
    },
    guard() {
      return (_req, _res, next) => next();
    },
    rootPaths: ["/v1/chat/completions", ...KEY_PATHS],
    routes({ qualification, apiKey, manifest }) {
      const router = express.Router();
      // Counts only: no bodies, paths or account data.
      const attestQueue = createAttestQueue(undefined, (stats) =>
        console.warn(`Privatemode attestation queue: ${JSON.stringify(stats)}`),
      );
      // The queue is shared by everyone, so one account (or session) may hold only a small share:
      // at most 2 attestation calls at once and 10 per 10 minutes. A normal browser session needs
      // one per 10 minutes, plus one after a failure or a release change.
      const attestStarts = new Map<string, number[]>();
      const attestRunning = new Map<string, number>();
      const attestAllowed = (who: string, now: number) => {
        if (attestStarts.size > 5000)
          for (const [key, times] of attestStarts)
            if (times.every((t) => now - t >= 600_000) && !attestRunning.get(key)) attestStarts.delete(key);
        const recent = (attestStarts.get(who) ?? []).filter((t) => now - t < 600_000);
        attestStarts.set(who, recent);
        if (recent.length >= 10 || (attestRunning.get(who) ?? 0) >= 2) return false;
        recent.push(now);
        return true;
      };
      router.get("/privatemode/manifest", (_req, res) => {
        const q = qualification();
        const digest = manifest && createHash("sha256").update(manifest).digest("hex");
        // Serve only the manifest the report approved; the browser checks the digest again.
        if (!q || !manifest || !digest || !q.releaseDigests.includes(digest)) {
          res.status(503).json({ error: "The approved deployment manifest is unavailable." });
          return;
        }
        res.type("application/json").send(Buffer.from(manifest));
      });
      router.get("/privatemode/privatemode-:hash.wasm", async (req, res) => {
        const q = qualification();
        let file: ReturnType<typeof installedWasm> | undefined;
        try {
          file = installedWasm();
        } catch {
          /* missing package: refused below */
        }
        if (!file || req.params.hash !== file.sha256 || q?.privatemode?.wasmSha256 !== file.sha256) {
          res.status(404).json({ error: "Unsupported operation." });
          return;
        }
        // Hash-named, so the content at this path never changes (plan point 6).
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        res.setHeader("Vary", "Accept-Encoding");
        res.type("application/wasm");
        if (req.acceptsEncodings("br") === "br") {
          const brotli = await compressedWasm(file.bytes).catch(() => undefined);
          if (brotli) return void res.setHeader("Content-Encoding", "br").send(brotli);
        }
        res.send(file.bytes);
      });
      router.post(
        KEY_PATHS,
        express.raw({ type: () => true, limit: "1mb" }),
        async (req, res) => {
          const q = qualification();
          if (!q) {
            res.status(503).json({ error: "Protected inference is not qualified." });
            return;
          }
          const abort = new AbortController();
          // Abort upstream only when the client left early.
          res.on("close", () => {
            if (!res.writableFinished) abort.abort();
          });
          try {
            const send = () =>
              upstreamRequest(new URL(req.path, q.origin), {
                dispatcher: serviceDispatcher,
                method: "POST",
                headers: { ...forwardedHeaders(req.headers), authorization: `Bearer ${apiKey}` },
                body: Buffer.isBuffer(req.body) ? new Uint8Array(req.body) : new Uint8Array(),
                signal: AbortSignal.any([abort.signal, AbortSignal.timeout(30000)]),
              });
            // Only attestation is rate-limited upstream; key exchange goes straight through.
            const attest = req.path === KEY_PATHS[0];
            const who = String(res.locals.accountId ?? res.locals.session);
            if (attest && !attestAllowed(who, Date.now())) {
              count("attest.busy_account_share");
              res.status(503).json(ATTESTATION_BUSY);
              return;
            }
            if (attest) attestRunning.set(who, (attestRunning.get(who) ?? 0) + 1);
            const reply = attest
              ? await attestQueue.run(send, abort.signal).finally(() => {
                  const left = (attestRunning.get(who) ?? 1) - 1;
                  if (left > 0) attestRunning.set(who, left);
                  else attestRunning.delete(who);
                })
              : await send();
            if (reply === "busy") {
              count("attest.busy_queue");
              res.status(503).json(ATTESTATION_BUSY);
              return;
            }
            if (attest) count(reply.statusCode === 200 ? "attest.verified" : `attest.status_${reply.statusCode}`);
            res.status(reply.statusCode);
            for (const [name, value] of Object.entries(reply.headers)) {
              const v = single(value);
              if (v !== undefined && REPLY_HEADERS.test(name)) res.setHeader(name, v);
            }
            // pipeline handles the abort error; a bare pipe() crashed the process when a client
            // disconnected mid-reply (parity run, 12 November).
            await pipeline(reply.body, res).catch(() => res.destroy());
          } catch {
            if (!res.headersSent) res.status(502).json({ error: "Upstream unavailable." });
            else res.destroy();
          }
        },
      );
      return router;
    },
  };
}

registerInferenceRelay("privatemode", createPrivatemodeRelayAdapter);
