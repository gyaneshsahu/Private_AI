import express from "express";
import { once } from "node:events";
import {
  validateExperiment,
  experimentRequestLimit,
  type Experiment,
} from "./experiment";

export type Forward = (
  body: Uint8Array,
  encapsulatedKey: string,
  signal: AbortSignal,
) => Promise<Response>;
export function experimentGateway(options: {
  origin: string;
  csrf: string;
  permit: Experiment;
  forward: Forward;
}) {
  const app = express();
  app.disable("x-powered-by");
  const attempts: Array<{
    outcome: string;
    bytes: number;
    protocolHeaderValid: boolean;
    syntheticPlaintextMarkerAbsent: boolean;
    upstreamStatus: number | null;
    failureCode: string | null;
    responseFinished: boolean;
    upstreamHeadersMs: number | null;
    firstEncryptedByteMs: number | null;
    elapsedMs: number | null;
  }> = [];
  let active = false;
  let stopped = false;
  app.use((req, res, next) => {
    res.set({
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; connect-src 'self' https://atc.tinfoil.sh; object-src 'none'; frame-ancestors 'none'",
    });
    if (
      req.headers.host !== new URL(options.origin).host ||
      (req.headers.origin && req.headers.origin !== options.origin) ||
      req.headers["sec-fetch-site"] === "cross-site"
    ) {
      res.status(403).end();
      return;
    }
    next();
  });
  app.post(
    "/api/inference/v1/chat/completions",
    express.raw({ type: "*/*", limit: "1mb" }),
    async (req, res) => {
      try {
        validateExperiment(options.permit);
      } catch {
        res.status(403).end();
        return;
      }
      if (
        req.headers["x-privateai-csrf"] !== options.csrf ||
        req.headers["x-tinfoil-enclave-url"] !== options.permit.policy.origin
      ) {
        res.status(403).end();
        return;
      }
      const key = String(req.headers["ehbp-encapsulated-key"] ?? "");
      if (
        !/^[a-f0-9]{64}$/i.test(key) ||
        !Buffer.isBuffer(req.body) ||
        req.body.length < 16 ||
        req.body.includes(Buffer.from("SYNTHETIC-INVOICE-A")) ||
        req.body.includes(Buffer.from("Using synthetic invoice A"))
      ) {
        res.status(400).end();
        return;
      }
      if (
        active ||
        stopped ||
        attempts.length >= experimentRequestLimit(options.permit)
      ) {
        res.status(429).end();
        return;
      }
      const attempt = {
        outcome: "STARTED_COST_UNKNOWN",
        bytes: req.body.length,
        protocolHeaderValid: true,
        syntheticPlaintextMarkerAbsent: true,
        upstreamStatus: null as number | null,
        failureCode: null as string | null,
        responseFinished: false,
        upstreamHeadersMs: null as number | null,
        firstEncryptedByteMs: null as number | null,
        elapsedMs: null as number | null,
      };
      const started = performance.now();
      attempts.push(attempt); // Count before network I/O, even when it fails.
      active = true;
      const abort = new AbortController();
      const deadline = AbortSignal.timeout(90000);
      res.once("finish", () => {
        attempt.responseFinished = true;
      });
      res.on("close", () => {
        if (!res.writableFinished) abort.abort();
      });
      try {
        const response = await options.forward(
          new Uint8Array(req.body),
          key,
          AbortSignal.any([abort.signal, deadline]),
        );
        attempt.upstreamHeadersMs = Math.round(performance.now() - started);
        const nonce = response.headers.get("ehbp-response-nonce");
        attempt.upstreamStatus = response.status;
        if (!response.ok || !nonce || !response.body) {
          await response.body?.cancel();
          throw new Error("Encrypted upstream response required");
        }
        res.setHeader("Ehbp-Response-Nonce", nonce);
        res.setHeader(
          "Content-Type",
          response.headers.get("content-type") ?? "application/octet-stream",
        );
        const reader = response.body.getReader();
        try {
          while (true) {
            abort.signal.throwIfAborted();
            const { done, value } = await reader.read();
            if (done) break;
            if (value.length && attempt.firstEncryptedByteMs === null)
              attempt.firstEncryptedByteMs = Math.round(
                performance.now() - started,
              );
            if (!res.write(value))
              await once(res, "drain", { signal: abort.signal });
          }
        } finally {
          await reader.cancel();
        }
        attempt.outcome = "ENCRYPTED_RESPONSE_RELAYED_NOT_YET_GRADED";
        res.end();
      } catch (error) {
        const cause = error instanceof Error ? error.cause : undefined;
        const code =
          cause && typeof cause === "object" && "code" in cause
            ? cause.code
            : undefined;
        attempt.failureCode =
          typeof code === "string" &&
          [
            "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
            "CERT_HAS_EXPIRED",
            "SELF_SIGNED_CERT_IN_CHAIN",
            "ECONNRESET",
            "ETIMEDOUT",
            "ENOTFOUND",
          ].includes(code)
            ? code
            : deadline.aborted
              ? "UPSTREAM_DEADLINE"
              : abort.signal.aborted
                ? "CLIENT_DISCONNECTED"
                : "UPSTREAM_OR_STREAM_FAILURE";
        attempt.outcome = "FAILED_COST_UNKNOWN";
        stopped = true;
        if (!res.headersSent)
          res.status(502).json({ error: "Experiment stopped. No retry." });
        else res.destroy();
      } finally {
        attempt.elapsedMs = Math.round(performance.now() - started);
        active = false;
      }
    },
  );
  app.use("/api", (_req, res) => {
    res.status(404).end();
  });
  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      if (error) res.status(400).json({ error: "Invalid experiment request." });
      else next();
    },
  );
  return { app, attempts };
}
