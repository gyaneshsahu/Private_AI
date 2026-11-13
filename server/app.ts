import express, { type RequestHandler } from "express";
import { deploymentAccess } from "./deployment";
import { inviteAccess } from "./invite-access";
import type { InviteRegistry } from "./invite-registry";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import type { UsageLedger } from "./usage-contract";
import { spendAllows } from "./spend-guard";
import { productionAccountTarget } from "../shared/account-design";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { count } from "./counters";
import { z } from "zod";
import {
  answerModes,
  disclosureSchema,
  tierFor,
  replyLimits,
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
// Registers both adapters; the qualification report's `provider` picks one. Switching is
// manual (a new report is deployed), never automatic on failure.
import "./providers/tinfoil-relay";
import { privatemodeKeyExpiryWarning } from "./providers/privatemode-relay";
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
  /** Brave Goggle boosting official sites on German-rules searches (off unless set). */
  searchGoggles?: boolean;
  /**
   * Allows the production candidate to relay chat (owner's explicit deployment setting).
   * Requires an API key, a qualification report and a usage ledger that reports spend.
   */
  productionInference?: boolean;
  /** Operator stop switch, checked on every request; true refuses chat at once. */
  inferenceStopped?: () => boolean;
  /** Shows the draft health-consent step; never set by the production composition. */
  healthConsentDraft?: boolean;
  /** Adds the draft provider section to the privacy policy; never set by the production composition. */
  providerDisclosureDraft?: "tinfoil" | "privatemode";
  /** Web search adapter; defaults to Brave from `searchKey`. Tests may inject one. */
  search?: SearchProvider;
  /** Relay adapter override for tests; production resolves it from the qualification's provider. */
  inferenceRelay?: InferenceRelayAdapter;
  /** Approved deployment manifest bytes, for a provider whose browser SDK verifies one (Privatemode). */
  providerManifest?: Uint8Array;
  /**
   * Key for each account's prompt-cache salt. Without it a random key is used, so salts stay
   * stable for this process only (a restart just means cache misses).
   */
  cacheSaltSecret?: string;
  dev?: boolean;
  accessKey?: string;
  invites?: InviteRegistry;
  usage?: UsageLedger;
  /**
   * Owner-set allowance each signed-in account gets automatically: a new period of `days`
   * starts whenever the account has no current one. Absent means none is created (as before).
   */
  autoAllowance?: { requestLimit: number; days: number; dailyLimit?: number };
  /** File whose text is shown to every user as a notice; missing or empty means none. Re-read every 30 s. */
  noticeFile?: string;
  /** Unmounted consumer composition. Candidate mode never accepts upstream credentials. */
  consumer?: {
    session: RequestHandler;
    approvals: ResearchApprovals;
    mode?: "production-candidate";
    billingRouter?: RequestHandler;
  };
}
/** Operator warnings about dates that stop chat for everyone: the report's end (48 hours ahead) and the key's expiry. The entry files log them hourly (scheduleExpiryWarnings). */
export function expiryWarnings(qualification: unknown, now = Date.now()): string[] {
  const q = qualification as { validUntil?: string; privatemode?: Qualification["privatemode"] } | undefined;
  const until = Date.parse(q?.validUntil ?? "");
  const warnings: string[] = [];
  if (Number.isFinite(until) && until - now < 48 * 3_600_000)
    warnings.push(
      until <= now
        ? `The provider review expired at ${q!.validUntil}. Chat is refused for everyone until a renewed report is deployed.`
        : `The provider review expires at ${q!.validUntil} (in ${Math.ceil((until - now) / 3_600_000)} hours). Renew and deploy the report before then, or chat stops for everyone.`,
    );
  const key = privatemodeKeyExpiryWarning(q, now);
  if (key) warnings.push(key);
  return warnings;
}

/** Logs the expiry warnings now and every hour; returns the stop function. */
export function scheduleExpiryWarnings(qualification: unknown, log: (line: string) => void): () => void {
  const run = () => expiryWarnings(qualification).forEach(log);
  run();
  const timer = setInterval(run, 3_600_000);
  timer.unref();
  return () => clearInterval(timer);
}

export function createApp(config: Config) {
  const app = express();
  let notice = { text: "", readAt: 0 };
  const operatorNotice = async () => {
    if (!config.noticeFile) return "";
    if (Date.now() - notice.readAt > 30_000)
      notice = {
        readAt: Date.now(),
        text: await readFile(config.noticeFile, "utf8")
          .then((text) => text.replace(/[\u0000-\u001f\u007f]+/g, " ").trim().slice(0, 500))
          .catch(() => ""),
      };
    return notice.text;
  };
  const ensureAllowance = async (accountId: string | undefined) => {
    const auto = config.autoAllowance;
    const usage = config.usage;
    if (!auto || !accountId || !(usage?.startAutoAllowance || usage?.createAllowance)) return;
    try {
      if ((await usage.summary(accountId)).state !== "unavailable") return;
      if (usage.startAutoAllowance) await usage.startAutoAllowance(accountId, auto.days, auto.requestLimit);
      else {
        const startsAt = Date.now();
        await usage.createAllowance!({
          accountId,
          periodId: `auto-${accountId}-${startsAt}`,
          startsAt,
          endsAt: startsAt + auto.days * 86_400_000,
          requestLimit: auto.requestLimit,
        });
      }
    } catch (error) {
      // An overlap from a concurrent request is harmless; a refused insert means the operator
      // function is missing on the hosted database, so it is counted (and the reserve refuses).
      if ((error as { code?: string }).code === "42501") count("allowance.not_permitted");
      else if (!/Overlapping allowance/.test(String((error as Error).message))) count("allowance.failed");
    }
  };
  app.disable("x-powered-by");
  const productionCandidate = config.consumer?.mode === "production-candidate";
  if (
    config.consumer &&
    (config.invites ||
      (productionCandidate
        ? config.origin !== productionAccountTarget.origin ||
          ((!!config.apiKey || config.qualification !== undefined) &&
            !(
              config.productionInference &&
              !!config.apiKey &&
              config.qualification !== undefined &&
              typeof config.usage?.spend === "function"
            )) ||
          // Search comes only with qualified production chat, and never with Goggles.
          (!!config.searchKey && !config.productionInference) ||
          !!config.searchGoggles ||
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
      ? braveSearchProvider(config.searchKey, config.searchMode, config.searchGoggles)
      : undefined);
  const cacheSaltKey = config.cacheSaltSecret ?? randomBytes(32).toString("hex");
  /** Stable per account (per session without one), unguessable, never shared between users. */
  const cacheSalt = (accountId: string | undefined, session: string) =>
    createHmac("sha256", cacheSaltKey)
      .update(`cometrow-cache-salt|${accountId ? `account:${accountId}` : `session:${session}`}`)
      .digest("hex");
  // Fixed security headers go first, ahead of every access gate, so refused
  // responses (403 from the origin and transport checks, 401 from the invite
  // gate, 503 while paused) carry them too (launch plan 7.4).
  const hosts = qualification ? relayFor(qualification).verificationHosts(qualification) : [];
  const verificationHosts = hosts.length ? " " + hosts.join(" ") : "";
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
  // A provider SDK that calls fixed paths at the site root (Privatemode) is mapped under
  // /api/inference here, before every gate, so the same session, CSRF, invite, limit, stop,
  // allowance and spend controls apply. Nothing at the root is ever forwarded.
  const rootPaths = qualification ? (relayFor(qualification).rootPaths ?? []) : [];
  if (rootPaths.length)
    app.use((req, _res, next) => {
      if (rootPaths.includes(req.path)) req.url = "/api/inference" + req.url;
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
    const stopped = !!config.inferenceStopped?.();
    // The same spend check the relay applies, so the status never says ready while every
    // request would be refused (T4 rehearsal, 12 November). Unknown spend counts as reached.
    let capReached = false;
    if (q && config.apiKey && !stopped && config.usage?.spend)
      capReached = !(await spendAllows(
        config.usage as Required<Pick<UsageLedger, "spend">>,
        q,
        active,
      ).catch(() => false));
    const ready = !!q && !!config.apiKey && !stopped && !capReached;
    res.json({
      csrf: res.locals.csrf,
      ...(config.consumer ? { consumerWorkspace: true } : {}),
      ...(config.healthConsentDraft ? { healthConsentDraft: true } : {}),
      ...(config.providerDisclosureDraft
        ? { providerDisclosureDraft: config.providerDisclosureDraft }
        : {}),
      ...(config.consumer?.billingRouter ? { billingRehearsal: true } : {}),
      ...(res.locals.accountId
        ? {
            requestAllowance: await (async () => {
              try {
                await ensureAllowance(res.locals.accountId);
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
          ? q?.provider === "privatemode"
            ? "Provider qualification recorded; the browser still verifies when chat starts and again at least every 10 minutes."
            : "Provider qualification recorded; each request still requires browser verification."
          : stopped
            ? "Private chat is paused by the operator."
            : capReached
              ? "The approved spending limit for this provider review is reached."
              : "Live chat is unavailable until provider qualification and service access are complete.",
        ...(ready
          ? {
              qualification: q,
              cacheSalt: cacheSalt(res.locals.accountId, res.locals.session),
            }
          : {}),
      },
      search: !!config.searchKey,
      ...(await operatorNotice().then((text) => (text ? { operatorNotice: text } : {}))),
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
  // Supplier endpoints besides chat (Privatemode: attestation, key exchange, approved manifest,
  // pinned Wasm), behind the same session, CSRF and stop switch.
  const providerRoutes =
    qualification && config.apiKey
      ? relayFor(qualification).routes?.({
          qualification: parseQualification,
          apiKey: config.apiKey,
          manifest: config.providerManifest,
        })
      : undefined;
  if (providerRoutes)
    app.use("/api/inference", (req, res, next) => {
      if (req.path === "/v1/chat/completions") return next();
      // The same refusals as the chat route below.
      if (!parseQualification())
        return void res.status(503).json({
          error: "Protected inference is not qualified. No request was forwarded.",
        });
      if (config.inferenceStopped?.())
        return void res.status(503).json({
          error: "Private chat is paused by the operator. No request was forwarded.",
        });
      providerRoutes(req, res, next);
    });
  app.post(
    "/api/inference/v1/chat/completions",
    express.raw({ type: "*/*", limit: "1mb" }),
    async (req, res) => {
      // One count per request, by mode and outcome (fixed names only: docs/alpha-plan-20261113.md).
      res.on("close", () => {
        const outcome =
          res.locals.outcome ??
          (res.statusCode === 200 ? (res.writableFinished ? "completed" : "interrupted") : `status_${res.statusCode}`);
        count(`chat.${res.locals.mode ?? "none"}.${outcome}`);
      });
      const q = parseQualification();
      if (!q || !config.apiKey) {
        res.status(503).json({
          error:
            "Protected inference is not qualified. No request was forwarded.",
        });
        return;
      }
      if (config.inferenceStopped?.()) {
        res.status(503).json({
          error: "Private chat is paused by the operator. No request was forwarded.",
        });
        return;
      }
      // The body is encrypted, so its size is the only input bound the server can enforce: 8 bytes
      // per allowed character covers UTF-8, JSON escaping and the encryption overhead, and stops a
      // modified browser from sending many times the allowed input on one allowance unit.
      if (req.body.length > Math.max(65_536, q.maxInputCharacters * 8)) {
        res.status(413).json({ error: "This message is too large. No request was forwarded." });
        return;
      }
      const relay = relayFor(q);
      const admission = relay.admit(req.headers, req.body, q);
      if (!admission.ok) {
        res.status(400).json({ error: admission.error });
        return;
      }
      // The answer mode is client-declared (the body is encrypted to the enclave); it picks the
      // tier whose models are admitted, whose output limit sizes the spend check, and its allowance cost.
      const modeHeader = req.headers["x-privateai-mode"];
      const mode = answerModes.find((m) => m === modeHeader);
      const tier = tierFor(q, mode);
      res.locals.mode = mode ?? "none";
      if (
        (modeHeader !== undefined && (!mode || !q.modes)) ||
        (admission.model !== tier.model && admission.model !== tier.backupModel)
      ) {
        res.status(400).json({ error: "Only a qualified answer mode and its models are accepted." });
        return;
      }
      if (active >= 3) {
        res.locals.outcome = "refused_instance_busy";
        res.status(429).json({ error: "Three requests are already running." });
        return;
      }
      const accountId: string | undefined = res.locals.accountId;
      // One request in flight per signed-in account: the supplier's own advice
      // for a hard ceiling is to bound concurrency, since spending caps are soft.
      if (accountId && (inFlight.get(accountId) ?? 0) >= 1) {
        res.locals.outcome = "refused_account_busy";
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
      // The slots are freed once, as soon as the browser hangs up: its automatic retry after
      // a time-out must not meet "already running" while the aborted upstream call settles.
      let released = false;
      const release = () => {
        if (released) return;
        released = true;
        active--;
        if (accountId) {
          const remaining = (inFlight.get(accountId) ?? 1) - 1;
          if (remaining > 0) inFlight.set(accountId, remaining);
          else inFlight.delete(accountId);
        }
      };
      res.on("close", () => {
        if (!res.writableFinished) {
          abort.abort();
          release();
        }
      });
      try {
        // Checked after this request claimed its slot, so concurrent requests count.
        if (config.usage?.spend) {
          let allowed = false;
          try {
            allowed = await spendAllows(
              config.usage as Required<Pick<UsageLedger, "spend">>,
              q,
              active - 1,
              tier.maxOutputTokens,
            );
          } catch {
            /* Unknown spend refuses, like unknown allowance. */
          }
          if (!allowed) {
            res.locals.outcome = "refused_spend";
            res.status(429).json({
              error:
                "The approved spending limit for this provider review is reached. No request was forwarded.",
            });
            return;
          }
        }
        if (config.usage) {
          await ensureAllowance(accountId);
          try {
            // Daily cap beside the period allowance (owner, 13 November): a rolling 24 hours, so
            // no time zone is involved. An unknown count refuses, like unknown allowance.
            const daily = config.autoAllowance?.dailyLimit;
            if (
              daily &&
              accountId &&
              (!config.usage.usedInLast ||
                (await config.usage.usedInLast(accountId, 86_400_000)) + tier.allowanceCost > daily)
            ) {
              res.locals.outcome = "refused_daily";
              res.status(429).json({
                error: "The daily request limit is reached. It frees up within 24 hours. No request was forwarded.",
              });
              return;
            }
            if (
              !accountId ||
              !(await config.usage.reserve(
                accountId,
                requestId,
                tier.allowanceCost,
              ))
            ) {
              res.locals.outcome = "refused_allowance";
              res.status(429).json({
                error:
                  tier.allowanceCost > 1
                    ? `Not enough request allowance: this mode counts as ${tier.allowanceCost} requests. No request was forwarded.`
                    : "No request allowance is available. No request was forwarded.",
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
          upstreamHeaders: admission.upstreamHeaders,
        });
        const upstream = await upstreamRequest(plan.url, {
          dispatcher: serviceDispatcher,
          method: "POST",
          body: new Uint8Array(req.body),
          // The browser's limit for this mode ends the reply first and says so; this is the backstop.
          signal: AbortSignal.any([
            abort.signal,
            AbortSignal.timeout(replyLimits(mode).totalMs + 5000),
          ]),
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
          // Only the class of failure is exposed, so the client can decide on its one
          // retry with the mode's backup model; nothing else leaks.
          res.setHeader("X-PrivateAI-Upstream", relay.classifyFailure(reply));
          res.locals.outcome = `upstream_${relay.classifyFailure(reply)}`;
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
        release();
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
      if (request.kind === "page") {
        res.json({ sources: await fetchPage(request.value, abort.signal) });
        return;
      }
      count("search.executed");
      const sources = await search!.search(request.value, abort.signal);
      const top = await search!.readTopPage?.(
        request.value,
        sources,
        abort.signal,
      );
      res.json({
        sources: top?.source ? [...sources, top.source] : sources,
        ...(top ? { topPage: { url: top.url, outcome: top.outcome, ...(top.official ? { official: true } : {}), ...(top.tier ? { tier: top.tier } : {}) } } : {}),
      });
    } catch {
      count("search.failed");
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
