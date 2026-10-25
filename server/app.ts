import express, { type RequestHandler } from "express";
import { deploymentAccess } from "./deployment";
import { inviteAccess } from "./invite-access";
import type { InviteRegistry } from "./invite-registry";
import { randomBytes, randomUUID } from "node:crypto";
import type { UsageLedger } from "./usage-contract";
import { productionAccountTarget } from "../shared/account-design";
import { once } from "node:events";
import { z } from "zod";
import {
  disclosureSchema,
  validateQualification,
  type Qualification,
} from "../shared/contracts";
import { Approvals, fetchPage, type ResearchApprovals } from "./research";
import { request as upstreamRequest } from "undici";
import type { UsageMetrics } from "./usage-metrics";
import {
  inferenceRelayFor,
  type InferenceRelayAdapter,
} from "./providers/inference-relay";
import { braveSearchProvider, type SearchProvider } from "./providers/search";
// Registers the only adapter built today; a second supplier registers its own.
import "./providers/tinfoil-relay";
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
  searchMode?: "web" | "llm-context";
  /** Web search adapter; defaults to Brave from `searchKey`. Tests may inject one. */
  search?: SearchProvider;
  /** Relay adapter override for tests; production resolves it from the qualification's provider. */
  inferenceRelay?: InferenceRelayAdapter;
  dev?: boolean;
  accessKey?: string;
  invites?: InviteRegistry;
  usage?: UsageLedger;
  /** Unmounted consumer composition. Candidate mode never accepts upstream credentials. */
  consumer?: {
    session: RequestHandler;
    approvals: ResearchApprovals;
    mode?: "production-candidate";
    billingRouter?: RequestHandler;
  };
}
export function createApp(config: Config) {
  const app = express();
  app.disable("x-powered-by");
  const productionCandidate = config.consumer?.mode === "production-candidate";
  if (
    config.consumer &&
    (config.invites ||
      (productionCandidate
        ? config.origin !== productionAccountTarget.origin ||
          !!config.apiKey ||
          !!config.searchKey ||
          config.qualification !== undefined ||
          !!config.dev ||
          !!config.consumer.billingRouter
        : new URL(config.origin).hostname !== "localhost"))
  )
    throw Error(
      "Consumer integration requires the isolated lab or the unqualified production candidate without upstream credentials.",
    );
  const parseQualification = (): Qualification | undefined => {
    try {
      return validateQualification(config.qualification);
    } catch {
      return undefined;
    }
  };
  const qualification = parseQualification();
  const relayFor = (q: Qualification) =>
    config.inferenceRelay ?? inferenceRelayFor(q.provider);
  const search =
    config.search ??
    (config.searchKey
      ? braveSearchProvider(config.searchKey, config.searchMode)
      : undefined);
  // Fixed security headers go first, ahead of every access gate, so refused
  // responses (403 from the origin and transport checks, 401 from the invite
  // gate, 503 while paused) carry them too (launch plan 7.4).
  const verificationHosts = qualification
    ? " " + relayFor(qualification).verificationHosts(qualification).join(" ")
    : "";
  const contentSecurityPolicy = `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'${config.dev ? " 'unsafe-inline'" : ""}; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; worker-src 'self' blob:; connect-src 'self'${verificationHosts}${config.dev ? " ws://127.0.0.1:*" : ""}; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`;
  app.use((_req, res, next) => {
    res.set({
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      // Camera is allowed for this origin only; the client requests it solely
      // from the Photo to text dialog's Use camera button. Owner approved
      // 21 October 2026. Microphone and geolocation stay blocked.
      "Permissions-Policy": "camera=(self), microphone=(), geolocation=()",
      "Content-Security-Policy": contentSecurityPolicy,
    });
    next();
  });
  app.use(
    deploymentAccess(
      config.origin,
      config.accessKey,
      !!config.invites || !!config.consumer,
      productionCandidate ? "direct-tls" : "forwarded",
    ),
  );
  if (config.invites) app.use(inviteAccess(config.origin, config.invites));
  const approvals =
    config.consumer?.approvals ??
    new Approvals(undefined, search?.recipientLabel);
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
  app.use((req, res, next) => {
    // Hosted access is restricted before session, API and static-file handling.
    // Visitors arrive from links in mail, chat and search; page GETs only render, so
    // top-level document navigations pass while every cross-site API call stays refused.
    const pageNavigation =
      req.method === "GET" &&
      req.path !== "/api" &&
      !req.path.startsWith("/api/") &&
      req.headers["sec-fetch-mode"] === "navigate" &&
      req.headers["sec-fetch-dest"] === "document";
    if (
      req.headers.host !== new URL(config.origin).host ||
      (req.headers.origin && req.headers.origin !== config.origin) ||
      (req.headers["sec-fetch-site"] === "cross-site" && !pageNavigation)
    ) {
      res.status(403).json({ error: "Cross-origin access denied." });
      return;
    }
    next();
  });
  app.use(
    "/api",
    config.consumer?.session ??
      ((req, res, next) => {
        const now = Date.now();
        for (const [id, session] of sessions)
          if (session.expires <= now) sessions.delete(id);
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
          if (sessions.size >= 100) {
            const nextExpiry = Math.min(
              ...Array.from(sessions.values(), (s) => s.expires),
            );
            res.setHeader(
              "Retry-After",
              String(Math.max(1, Math.ceil((nextExpiry - now) / 1000))),
            );
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
      }),
  );
  app.get("/api/status", async (_req, res) => {
    const q = parseQualification();
    const ready = !!q && !!config.apiKey;
    res.json({
      csrf: res.locals.csrf,
      ...(config.consumer ? { consumerWorkspace: true } : {}),
      ...(config.consumer?.billingRouter ? { billingRehearsal: true } : {}),
      ...(res.locals.accountId
        ? {
            requestAllowance: await (async () => {
              try {
                return (
                  (await config.usage?.summary(res.locals.accountId)) ?? {
                    state: "unavailable",
                  }
                );
              } catch {
                return { state: "unavailable" };
              }
            })(),
          }
        : {}),
      ...(res.locals.accountId
        ? {
            accountId: res.locals.accountId,
            accessEpoch: res.locals.accessEpoch,
            ...(res.locals.accountEmail
              ? { accountEmail: res.locals.accountEmail }
              : {}),
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
  const inFlight = new Map<string, number>();
  // Block-only attestation audit: can refuse forwarding, never supplies a key.
  // Pass-through until a deployment installs an audit configuration.
  // Block-only guard of the configured adapter (for Tinfoil, the release audit;
  // a pass-through until its deployment configuration exists).
  app.use("/api/inference", (req, res, next) => {
    const q = parseQualification();
    if (!q) {
      next();
      return;
    }
    relayFor(q).guard()(req, res, next);
  });
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
      const relay = relayFor(q);
      const admission = relay.admit(req.headers, req.body, q);
      if (!admission.ok) {
        res.status(400).json({ error: admission.error });
        return;
      }
      if (active >= 3) {
        res.status(429).json({ error: "Three requests are already running." });
        return;
      }
      const accountId: string | undefined = res.locals.accountId;
      // One request in flight per signed-in account: the supplier's own advice
      // for a hard ceiling is to bound concurrency, since spending caps are soft.
      if (accountId && (inFlight.get(accountId) ?? 0) >= 1) {
        res.status(429).json({
          error: "A request is already running for this account.",
        });
        return;
      }
      const requestId = randomUUID();
      // Claim the local slots before awaiting shared admission.
      active++;
      if (accountId)
        inFlight.set(accountId, (inFlight.get(accountId) ?? 0) + 1);
      let dispatched = false;
      let transportComplete = false;
      let metrics: UsageMetrics | undefined;
      const abort = new AbortController();
      res.on("close", () => {
        if (!res.writableFinished) abort.abort();
      });
      try {
        if (config.usage) {
          try {
            if (
              !accountId ||
              !(await config.usage.reserve(accountId, requestId))
            ) {
              res.status(429).json({
                error:
                  "No request allowance is available. No request was forwarded.",
              });
              return;
            }
            if (abort.signal.aborted) return;
            await config.usage.dispatch(accountId, requestId);
            dispatched = true;
          } catch {
            res.status(503).json({
              error: "Usage controls unavailable. No request was forwarded.",
            });
            return;
          }
        }
        if (abort.signal.aborted) return;
        // undici.request rather than fetch: the provider's usage metrics for a
        // streamed reply arrive as an HTTP trailer, which fetch cannot expose.
        const plan = relay.upstream({
          qualification: q,
          apiKey: config.apiKey,
          model: admission.model,
          encapsulatedKey: admission.encapsulatedKey,
        });
        const upstream = await upstreamRequest(plan.url, {
          dispatcher: serviceDispatcher,
          method: "POST",
          body: new Uint8Array(req.body),
          signal: AbortSignal.any([abort.signal, AbortSignal.timeout(90000)]),
          headers: plan.headers,
        });
        const reply = {
          statusCode: upstream.statusCode,
          headers: upstream.headers,
          trailers: upstream.trailers,
        };
        // Never reflect upstream errors: they may contain sensitive content or diagnostics.
        const accepted = relay.accept(reply);
        if (!accepted.ok) {
          await upstream.body.dump().catch(() => {});
          // Only the class of failure is exposed: a rejection (nothing was run or
          // billed) lets the client offer the fallback model; nothing else leaks.
          res.setHeader("X-PrivateAI-Upstream", relay.classifyFailure(reply));
          res.status(502).json({
            error:
              "Encrypted provider response unavailable. No automatic retry was made.",
          });
          return;
        }
        for (const [name, value] of Object.entries(accepted.passthrough))
          res.setHeader(name, value);
        for await (const chunk of upstream.body) {
          if (abort.signal.aborted) break;
          if (!res.write(chunk))
            await once(res, "drain", { signal: abort.signal });
        }
        transportComplete = !abort.signal.aborted;
        if (transportComplete)
          metrics = relay.usage({
            statusCode: upstream.statusCode,
            headers: upstream.headers,
            trailers: upstream.trailers,
          });
        res.end();
      } catch {
        if (!res.headersSent)
          res.status(502).json({
            error: "Protected request interrupted. Retry explicitly if needed.",
          });
        else res.destroy();
      } finally {
        active--;
        if (accountId) {
          const remaining = (inFlight.get(accountId) ?? 1) - 1;
          if (remaining > 0) inFlight.set(accountId, remaining);
          else inFlight.delete(accountId);
        }
        if (config.usage && accountId && dispatched) {
          try {
            await config.usage.finish(
              accountId,
              requestId,
              transportComplete ? "transport_complete" : "uncertain",
              transportComplete ? metrics : undefined,
            );
          } catch {
            /* Reservation remains counted if durable settlement is unavailable. */
          }
        }
      }
    },
  );
  app.use("/api", express.json({ limit: "8kb" }));
  if (config.consumer?.billingRouter) app.use(config.consumer.billingRouter);
  app.post("/api/research/prepare", async (req, res) => {
    try {
      res.json(await approvals.issue(res.locals.session, req.body));
    } catch {
      res.status(400).json({
        error: "Invalid disclosure. Use a short query or public HTTPS URL.",
      });
    }
  });
  app.post("/api/research/cancel", async (req, res) => {
    const { id } = z
      .object({ id: z.string().length(48) })
      .strict()
      .parse(req.body);
    await approvals.revoke(res.locals.session, id);
    res.json({ cancelled: true });
  });
  app.post("/api/research/execute", async (req, res) => {
    const abort = new AbortController();
    res.on("close", () => abort.abort());
    try {
      const { id, request: disclosure } = z
        .object({
          id: z.string().length(48),
          request: disclosureSchema.optional(),
        })
        .strict()
        .parse(req.body);
      const request = await approvals.consume(
        res.locals.session,
        id,
        disclosure,
      );
      if (request.kind === "search" && !search) {
        res.status(503).json({
          error: "Search service is not configured. No query was sent.",
        });
        return;
      }
      const sources =
        request.kind === "search"
          ? await search!.search(request.value, abort.signal)
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
