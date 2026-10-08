import express from "express";
import { deploymentAccess } from "./deployment";
import { inviteAccess } from "./invite-access";
import type { InviteRegistry } from "./invite-registry";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { z } from "zod";
import { validateQualification, type Qualification } from "../shared/contracts";
import { Approvals, fetchPage, searchWeb } from "./research";
import { fetch } from "undici";
import {
  serviceDispatcher,
  proxyConfigured,
  publicFetchHosts,
} from "./network";

export interface Config {
  origin: string;
  qualification?: unknown;
  apiKey?: string;
  searchKey?: string;
  dev?: boolean;
  accessKey?: string;
  invites?: InviteRegistry;
}
export function createApp(config: Config) {
  const app = express();
  app.disable("x-powered-by");
  app.use(deploymentAccess(config.origin, config.accessKey, !!config.invites));
  if (config.invites) app.use(inviteAccess(config.origin, config.invites));
  const approvals = new Approvals();
  const sessions = new Map<
    string,
    {
      csrf: string;
      expires: number;
      count: number;
      accountId?: string;
      accessSession?: string;
    }
  >();
  const parseQualification = (): Qualification | undefined => {
    try {
      return validateQualification(config.qualification);
    } catch {
      return undefined;
    }
  };
  const qualification = parseQualification();
  const approvedOrigin = qualification?.origin;
  app.use((req, res, next) => {
    res.set({
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    });
    // Hosted access is restricted before session, API and static-file handling.
    if (
      req.headers.host !== new URL(config.origin).host ||
      (req.headers.origin && req.headers.origin !== config.origin) ||
      req.headers["sec-fetch-site"] === "cross-site"
    ) {
      res.status(403).json({ error: "Cross-origin access denied." });
      return;
    }
    const verificationHosts = qualification
      ? ` https://atc.tinfoil.sh https://github-proxy.tinfoil.sh https://kds-proxy.tinfoil.sh https://tuf-repo-cdn.sigstore.dev ${new URL(qualification.origin).origin}`
      : "";
    res.setHeader(
      "Content-Security-Policy",
      `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'${config.dev ? " 'unsafe-inline'" : ""}; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; worker-src 'self' blob:; connect-src 'self'${verificationHosts}${config.dev ? " ws://127.0.0.1:*" : ""}; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
    );
    next();
  });
  app.use("/api", (req, res, next) => {
    const now = Date.now();
    for (const [id, session] of sessions)
      if (session.expires < now) sessions.delete(id);
    let id = req.headers.cookie
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("privateai-session="))
      ?.slice(18);
    if (
      id &&
      (sessions.get(id)?.accountId !== res.locals.accountId ||
        sessions.get(id)?.accessSession !== res.locals.accessSession)
    ) {
      id = undefined;
    }
    if (!id || !sessions.has(id)) {
      if (req.path !== "/status" || req.method !== "GET") {
        res
          .status(401)
          .json({ error: "Session expired. Reload the application." });
        return;
      }
      if (sessions.size > 100) {
        res.status(429).json({ error: "Session limit reached." });
        return;
      }
      id = randomBytes(32).toString("hex");
      sessions.set(id, {
        csrf: randomBytes(32).toString("hex"),
        expires: now + 3600000,
        count: 0,
        accountId: res.locals.accountId,
        accessSession: res.locals.accessSession,
      });
      res.setHeader(
        "Set-Cookie",
        `privateai-session=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600${config.origin.startsWith("https:") ? "; Secure" : ""}`,
      );
    }
    const session = sessions.get(id)!;
    res.locals.session = id;
    res.locals.csrf = session.csrf;
    if (
      req.method !== "GET" &&
      req.headers["x-privateai-csrf"] !== session.csrf
    ) {
      res.status(403).json({ error: "Request authorization failed." });
      return;
    }
    if (req.method === "POST" && ++session.count > 200) {
      res.status(429).json({ error: "Evaluation request limit reached." });
      return;
    }
    next();
  });
  app.get("/api/status", (_req, res) => {
    const q = parseQualification();
    const ready = !!q && !!config.apiKey;
    res.json({
      csrf: res.locals.csrf,
      ...(res.locals.accountId
        ? {
            accountId: res.locals.accountId,
            accessEpoch: res.locals.accessEpoch,
          }
        : {}),
      inference: {
        ready,
        reason: ready
          ? "Provider qualification recorded; each request still requires browser verification."
          : "Live chat is unavailable until provider qualification and service access are complete.",
        ...(ready ? { qualification: q } : {}),
      },
      search: !!config.searchKey,
      publicPageHosts: proxyConfigured ? publicFetchHosts : null,
    });
  });
  let active = 0;
  app.post(
    "/api/inference/v1/chat/completions",
    express.raw({ type: "*/*", limit: "1mb" }),
    async (req, res) => {
      const q = parseQualification();
      if (!q || !config.apiKey) {
        res.status(503).json({
          error:
            "Protected inference is not qualified. No request was forwarded.",
        });
        return;
      }
      if (
        req.headers["x-tinfoil-enclave-url"] !== approvedOrigin ||
        !/^[a-f0-9]{64}$/i.test(
          String(req.headers["ehbp-encapsulated-key"] ?? ""),
        ) ||
        !Buffer.isBuffer(req.body) ||
        req.body.length < 16
      ) {
        res.status(400).json({
          error:
            "Only encrypted requests to the qualified destination are accepted.",
        });
        return;
      }
      if (active >= 3) {
        res.status(429).json({ error: "Three requests are already running." });
        return;
      }
      active++;
      const abort = new AbortController();
      res.on("close", () => {
        if (!res.writableFinished) abort.abort();
      });
      try {
        const upstream = await fetch(
          new URL("/v1/chat/completions", approvedOrigin),
          {
            dispatcher: serviceDispatcher,
            method: "POST",
            redirect: "error",
            body: new Uint8Array(req.body),
            signal: AbortSignal.any([abort.signal, AbortSignal.timeout(90000)]),
            headers: {
              Authorization: `Bearer ${config.apiKey}`,
              "Content-Type": "application/json",
              Accept: "text/event-stream",
              "Ehbp-Encapsulated-Key": String(
                req.headers["ehbp-encapsulated-key"],
              ),
            },
          },
        );
        // Never reflect upstream errors: they may contain sensitive content or diagnostics.
        if (!upstream.ok || !upstream.headers.get("ehbp-response-nonce")) {
          await upstream.body?.cancel();
          res.status(502).json({
            error:
              "Encrypted provider response unavailable. No automatic retry was made.",
          });
          return;
        }
        res.setHeader(
          "Ehbp-Response-Nonce",
          upstream.headers.get("ehbp-response-nonce")!,
        );
        res.setHeader(
          "Content-Type",
          upstream.headers.get("content-type") ?? "application/octet-stream",
        );
        if (!upstream.body) throw new Error("Missing encrypted body");
        for await (const chunk of upstream.body) {
          if (abort.signal.aborted) break;
          if (!res.write(chunk))
            await once(res, "drain", { signal: abort.signal });
        }
        res.end();
      } catch {
        if (!res.headersSent)
          res.status(502).json({
            error: "Protected request interrupted. Retry explicitly if needed.",
          });
        else res.destroy();
      } finally {
        active--;
      }
    },
  );
  app.use("/api", express.json({ limit: "8kb" }));
  app.post("/api/research/prepare", (req, res) => {
    try {
      res.json(approvals.issue(res.locals.session, req.body));
    } catch {
      res.status(400).json({
        error: "Invalid disclosure. Use a short query or public HTTPS URL.",
      });
    }
  });
  app.post("/api/research/cancel", (req, res) => {
    const { id } = z
      .object({ id: z.string().length(48) })
      .strict()
      .parse(req.body);
    approvals.revoke(res.locals.session, id);
    res.json({ cancelled: true });
  });
  app.post("/api/research/execute", async (req, res) => {
    const abort = new AbortController();
    res.on("close", () => abort.abort());
    try {
      const { id } = z
        .object({ id: z.string().length(48) })
        .strict()
        .parse(req.body);
      const request = approvals.consume(res.locals.session, id);
      if (request.kind === "search" && !config.searchKey) {
        res.status(503).json({
          error: "Search service is not configured. No query was sent.",
        });
        return;
      }
      const sources =
        request.kind === "search"
          ? await searchWeb(request.value, config.searchKey!, abort.signal)
          : await fetchPage(request.value, abort.signal);
      res.json({ sources });
    } catch {
      res.status(400).json({
        error:
          "Research could not complete. Approval may have expired, or the destination is unavailable, redirects, or exceeds safety limits. No automatic retry was made.",
      });
    }
  });
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Unsupported operation." });
  });
  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      if (err) res.status(400).json({ error: "Invalid request." });
    },
  );
  return app;
}
