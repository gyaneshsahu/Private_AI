// Privatemode relay (qualification spike, branch privatemode-eval). The browser SDK sends
// its attestation, secret and chat calls here with a placeholder key; the relay forwards
// opaque bytes to Privatemode with the real key. It sees ciphertext and routing headers
// only. The model is pinned by `privatemode-target-model`: Privatemode routes by that
// header and a worker rejects a body for another model (probe of 11 November), so the
// relay's allowlist holds. Token usage is encrypted, so per-request metering is not
// possible here; spend is bounded by request counts and the key's limits in the portal.
// The browser SDK uses only the origin of its base URL, so the relay answers Privatemode's
// three exact paths at the site root (our own routes all live under /api); the approved
// manifest and the pinned Wasm are served under /api/privatemode.
// Not yet wired into server/app.ts admission and allowances (stage 3).
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import express, { type Router } from "express";

const FORWARDED_PATHS = new Set([
  "/privatemode/v1/attest",
  "/privatemode/v1/secret",
  "/v1/chat/completions",
]);
const REQUEST_HEADERS = /^(content-type|accept|privatemode-[a-z-]+)$/;
const ASSETS = "/api/privatemode";
const REPLY_HEADERS = /^(content-type|privatemode-oae-response-header|x-request-id)$/;

export function privatemodeRelay(options: {
  apiKey: string;
  allowedModels: readonly string[];
  manifest: () => Uint8Array;
  wasm: () => Uint8Array;
  upstream?: string;
  /** Test hook: observes each forwarded body without changing it. */
  observe?: (path: string, body: Buffer) => void;
}): Router {
  const upstream = options.upstream ?? "https://api.privatemode.ai";
  const router = express.Router();
  router.get(`${ASSETS}/manifest`, (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.type("application/json").send(Buffer.from(options.manifest()));
  });
  router.get(`${ASSETS}/privatemode.wasm`, (_req, res) => {
    res.type("application/wasm").send(Buffer.from(options.wasm()));
  });
  router.post(
    [...FORWARDED_PATHS],
    express.raw({ type: () => true, limit: "2mb" }),
    async (req, res) => {
      if (!FORWARDED_PATHS.has(req.path)) return res.status(404).end();
      const headers: Record<string, string> = {};
      for (const [name, value] of Object.entries(req.headers))
        if (typeof value === "string" && REQUEST_HEADERS.test(name)) headers[name] = value;
      if (
        req.path === "/v1/chat/completions" &&
        !options.allowedModels.includes(headers["privatemode-target-model"] ?? "")
      )
        return res.status(403).json({ error: "Only the qualified model is accepted." });
      headers.authorization = `Bearer ${options.apiKey}`;
      const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      options.observe?.(req.path, body);
      const abort = new AbortController();
      // Abort upstream only when the client left early, as the Tinfoil relay does.
      res.on("close", () => {
        if (!res.writableFinished) abort.abort();
      });
      try {
        const reply = await fetch(`${upstream}${req.path}`, {
          method: "POST",
          headers,
          body: new Uint8Array(body),
          signal: abort.signal,
        });
        res.status(reply.status);
        reply.headers.forEach((value, name) => {
          if (REPLY_HEADERS.test(name)) res.setHeader(name, value);
        });
        if (!reply.body) return res.end();
        // pipeline handles the abort error; a bare pipe() crashed the process when a client
        // disconnected mid-reply (parity run, 12 November).
        await pipeline(Readable.fromWeb(reply.body as never), res).catch(() => res.destroy());
      } catch {
        if (!res.headersSent) res.status(502).json({ error: "Upstream unavailable." });
        else res.end();
      }
    },
  );
  return router;
}
