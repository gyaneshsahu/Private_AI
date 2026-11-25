import express, { type RequestHandler } from "express";
import { deploymentAccess } from "./deployment";
import { inviteAccess } from "./invite-access";
import type { InviteRegistry } from "./invite-registry";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { runRequestId, type UsageLedger } from "./usage-contract";
import { chargeStart, limitMessage } from "./usage-charge";
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
  alertModelNotFound,
  inferenceRelayFor,
  modelNotFound,
  type InferenceRelayAdapter,
} from "./providers/inference-relay";
import { braveSearchProvider, type SearchProvider } from "./providers/search";
// Registers both adapters; the qualification report's `provider` picks one. Switching is
// manual (a new report is deployed), never automatic on failure.
import "./providers/tinfoil-relay";
import { privatemodeKeyExpiryWarning } from "./providers/privatemode-relay";
import { manifestPaused, PROVIDER_UPDATE_PAUSE } from "./manifest-watch";
import { takeVoiceAnswer, VOICE_PATH, voiceRoute, voiceUsage, type VoiceSettings, type VoiceTurns } from "./providers/privatemode-voice";
import { declaredImage, imageDayCount, imageModelAdmitted, type ImageSettings } from "./image-admission";
import { IMAGE_PROMPT_MAX, ImageCapacity, ImageRefused, refuseImagePrompt, type ImageProvider } from "./image-creation";
import { CONTINUATION_HEADER, ContinuationCredits } from "./continuation-credit";
import { declaredResearch, researchAllowed, ResearchTickets, type ResearchSettings } from "./research-admission";
import { RESEARCH_KINDS, RESEARCH_LIMITS } from "../shared/deep-research";
import {
  serviceDispatcher,
  proxyConfigured,
  publicFetchHosts,
} from "./network";
import { relayAttestQueue } from "./providers/privatemode-relay";
import { BACKGROUND_CONSENT_VERSION, BACKGROUND_LIMITS, createBackgroundTasks } from "./background-tasks";
import { backgroundRoutes } from "./background-routes";
import { createPrivatemodeBackgroundClient, type BackgroundModelClient } from "./background-privatemode";
import type { BackgroundStore, RunWindow } from "./background-store";
import type { BackgroundKeyRing } from "./background-crypto";
import { REQUEST_ID_HEADER } from "../shared/usage-config";
import { chatFeature, createMetering, meteringWeights, withWeights, type MeteringConfig } from "./usage-metering";
import { syncRoutes, type SyncSettings, type SyncStore } from "./vault-sync";
import { planRoutes, type PlanSettings } from "./plans";
import { secureRoutes, type SecureSettings } from "./secure-store";
import { legalPages } from "./legal-pages";

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
  /** Voice input (dictation) limits; absent means off. It also needs the report's `speech` model. */
  voice?: VoiceSettings;
  /** Image questions; absent means off. It also needs the report's `vision` model. */
  images?: ImageSettings;
  /**
   * Image creation (docs/image-creation-20261117.md); absent means off. Only the typed description
   * goes to `provider`; the server keeps neither it nor the image. `dailyImages`: per account a day.
   */
  imageCreation?: { provider: ImageProvider; dailyImages: number };
  /** Plans and checkout (docs/plans-20261125.md); absent means off. */
  plans?: PlanSettings;
  /** Code execution on the user's device: the status says so and follow-up requests get their credit; absent means off. */
  code?: boolean;
  /** Deep research (docs/deep-research-20261114.md); absent means off. It also needs search. */
  research?: ResearchSettings;
  /** Usage metering (docs/usage-metering-20261115.md): weights from shared/usage-weights.json, usage records, meter; absent means off. */
  metering?: MeteringConfig;
  /** File whose text is shown to every user as a notice; missing or empty means none. Re-read every 30 s. */
  noticeFile?: string;
  /** End-to-end encrypted vault sync (docs/vault-sync-20261115.md); absent means off. */
  vaultSync?: SyncSettings & { store: SyncStore };
  /** Secure mode: saved content stored under a server-held key (docs/secure-store-20261116.md); absent means off. */
  secureStore?: SecureSettings;
  /** Closed-account purge days, for the status only (docs/account-purge-20261116.md); absent means off. */
  accountPurge?: { graceDays: number };
  /** Background tasks, the Auto mode of Scheduled (docs/background-tasks-20261115.md); absent means off. */
  backgroundTasks?: {
    maxAutoTasks: number;
    runHourUtcWindow?: RunWindow;
    store: BackgroundStore;
    keys: BackgroundKeyRing;
    /** Tests pass a fake; otherwise the server's own Privatemode client is made from the key and report. */
    model?: BackgroundModelClient;
    log: (line: string) => void;
    /** False keeps the minute timer off (tests call tick themselves). */
    start?: boolean;
  };
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
  // With metering on, the weights file sets the allowance costs (the report's are replaced) and the
  // deep-research cost (read at start), and each forwarded request gets a usage record.
  if (config.metering && config.research)
    config = { ...config, research: { ...config.research, cost: meteringWeights(config.metering).units["research-run"] } };
  const meterAccount = (res: express.Response): string | undefined =>
    res.locals.accountId ?? (config.dev ? "local-development" : undefined);
  const metering = config.metering
    ? createMetering({
        config: config.metering,
        usage: config.usage,
        qualification: () => parseQualification(),
        dailyLimit: config.autoAllowance?.dailyLimit,
        accountOf: meterAccount,
        // The status's "Voice today" numbers (voiceBudget below), so meter and microphone agree.
        ...(config.voice
          ? {
              voice: {
                dailyUnits: config.voice.dailyUnits,
                chunkSeconds: config.voice.chunkSeconds,
                on: () => !!parseQualification()?.speech,
                used: (res: express.Response) => voiceBudget.used(String(res.locals.accountId ?? res.locals.session), res.locals.accountId),
              },
            }
          : {}),
      })
    : undefined;
  const parseQualification = (): Qualification | undefined => {
    try {
      const q = validateQualification(config.qualification);
      return metering ? withWeights(q, metering.weights()) : q;
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
      // 21 October 2026. The microphone is allowed for this origin only, for voice
      // input; the client requests it solely from the composer's microphone button,
      // which exists only while voice input is switched on. Geolocation stays blocked.
      "Permissions-Policy": "camera=(self), microphone=(self), geolocation=()",
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
  // Terms and Privacy Policy are public: the sign-in page links to them before any session.
  app.use(legalPages(() => parseQualification()?.provider ?? config.providerDisclosureDraft));
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
        // A usage report follows a counted request and sends no content: it is not counted again.
        if (req.method === "POST" && req.path !== "/usage/report" && ++session.count > 200) {
          res.status(429).json({ error: "Evaluation request limit reached." });
          return;
        }
        next();
      }),
  );
  // Voice units per account in any 24 hours, shown in the status and enforced by the voice route.
  const voiceBudget = voiceUsage(config.usage);
  const voiceTurns: VoiceTurns = new Map();
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
    // Set only by the server's own manifest check; it can only turn ready off (server/manifest-watch.ts).
    const providerUpdate = manifestPaused();
    const ready = !!q && !!config.apiKey && !stopped && !capReached && !providerUpdate;
    res.json({
      csrf: res.locals.csrf,
      ...(config.consumer ? { consumerWorkspace: true } : {}),
      ...(config.providerDisclosureDraft
        ? { providerDisclosureDraft: config.providerDisclosureDraft }
        : {}),
      ...(config.consumer?.billingRouter ? { billingRehearsal: true } : {}),
      // Plans are on: the account menu offers "Plans" (docs/plans-20261125.md).
      ...(config.plans && (res.locals.accountId || config.dev) ? { plans: true as const } : {}),
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
            ...(config.secureStore && Number.isFinite(res.locals.signedInAt) ? { signedInAt: res.locals.signedInAt as number } : {}),
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
            : providerUpdate
              ? PROVIDER_UPDATE_PAUSE
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
      ...(config.voice && ready && q?.speech
        ? {
            voice: {
              ...config.voice,
              usedUnits: await voiceBudget
                .used(String(res.locals.accountId ?? res.locals.session), res.locals.accountId)
                .catch(() => undefined),
            },
          }
        : {}),
      ...(config.images && ready && q?.vision ? { images: { maxBytes: config.images.maxBytes } } : {}),
      ...(config.code && ready ? { code: true } : {}),
      // Its own partner and allowance: not tied to the chat provider being ready.
      ...(config.imageCreation && (res.locals.accountId || config.dev)
        ? { imageCreation: { limit: config.imageCreation.dailyImages, used: createDay.used(String(res.locals.accountId ?? "local-development")) } }
        : {}),
      // Only where records are kept (a signed-in account), so the meter has something to show.
      ...(metering && meterAccount(res)
        ? { metering: { plan: metering.plan.id, weightsVersion: metering.weights().version } }
        : {}),
      // Only for an account that may use it ("premium only"), so nobody else sees the feature.
      ...(ready && search && researchAllowed(config.research, res.locals.accountEmail)
        ? { research: { cost: config.research.cost, dailyRuns: config.research.dailyRuns } }
        : {}),
      ...(config.vaultSync ? { vaultSync: { quotaBytes: config.vaultSync.quotaBytes, maxDevices: config.vaultSync.maxDevices, ...(config.vaultSync.blobs ? { files: true } : {}) } } : {}),
      ...(config.secureStore ? { secureStore: { quotaBytes: config.secureStore.quotaBytes, filesQuotaBytes: config.secureStore.filesQuotaBytes } } : {}),
      ...(config.accountPurge ? { accountPurge: { graceDays: config.accountPurge.graceDays } } : {}),
      ...(config.backgroundTasks
        ? {
            backgroundTasks: {
              maxAutoTasks: config.backgroundTasks.maxAutoTasks,
              minIntervalHours: BACKGROUND_LIMITS.minIntervalHours,
              consentVersion: BACKGROUND_CONSENT_VERSION,
            },
          }
        : {}),
      ...(await operatorNotice().then((text) => (text ? { operatorNotice: text } : {}))),
      // The operator's own notice wins; otherwise a provider update is announced to everyone.
      ...(await operatorNotice().then((text) => (text || providerUpdate ? { operatorNotice: text || PROVIDER_UPDATE_PAUSE } : {}))),
      publicPageHosts: proxyConfigured ? publicFetchHosts : null,
    });
  });
  let active = 0;
  const inFlight = new Map<string, number>();
  // A message the provider refused before any reply cost nothing but used allowance. The same
  // account's next request in the same mode within a minute (the automatic backup retry, or the
  // user sending again) runs on that reservation instead of a second one. One credit per refusal.
  // shortcut: in this process's memory, so a restart in that minute counts the retry twice;
  // move to the ledger together with the other single-server limits.
  const retryCredit = new Map<string, { mode: string | undefined; expires: number }>();
  // Code execution: up to two follow-up requests ride on one paid message (server/continuation-credit.ts).
  const continuationCredits = new ContinuationCredits(metering?.weights().freeCodeFollowUps);
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
  // Background tasks share the relay's attestation queue (one per server).
  const attestQueue =
    config.backgroundTasks && qualification?.provider === "privatemode" ? relayAttestQueue() : undefined;
  // Supplier endpoints besides chat (Privatemode: attestation, key exchange, approved manifest,
  // pinned Wasm), behind the same session, CSRF and stop switch.
  const providerRoutes =
    qualification && config.apiKey
      ? relayFor(qualification).routes?.({
          qualification: parseQualification,
          apiKey: config.apiKey,
          manifest: config.providerManifest,
          ...(attestQueue ? { attestQueue } : {}),
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
  if (config.voice)
    app.post(
      "/api/inference" + VOICE_PATH,
      ...voiceRoute({
        turns: voiceTurns,
        settings: config.voice,
        budget: voiceBudget,
        ...(metering ? { metering: { accountOf: meterAccount, record: metering.record } } : {}),
        apiKey: config.apiKey,
        qualification: parseQualification,
        stopped: config.inferenceStopped,
        usage: config.usage,
        dailyLimit: config.autoAllowance?.dailyLimit,
        ensureAllowance,
        running: () => active,
        // The same slots as chat below: three per instance, one per account.
        claim(accountId) {
          if (active >= 3) return "instance";
          if (accountId && inFlight.has(accountId)) return "account";
          active++;
          if (accountId) inFlight.set(accountId, 1);
          let released = false;
          return () => {
            if (released) return;
            released = true;
            active--;
            if (accountId) inFlight.delete(accountId);
          };
        },
      }),
    );
  const imageDay = imageDayCount(config.images?.dailyImages ?? 0);
  // Deep research: runs and searches per account in any 24 hours (the same in-memory day count).
  const researchDay = imageDayCount(config.research?.dailyRuns ?? 0);
  const createDay = imageDayCount(config.imageCreation?.dailyImages ?? 0);
  const searchDay = imageDayCount(config.research?.dailySearches ?? 0);
  const researchTickets = new ResearchTickets();
  app.post(
    "/api/inference/v1/chat/completions",
    express.raw({ type: "*/*", limit: "1mb" }),
    async (req, res) => {
      // One count per request, by mode and outcome (fixed names only: docs/alpha-plan-20261113.md).
      res.on("close", () => {
        // A hang-up while the reply is being forwarded is counted when the forwarding ends (below).
        if (res.locals.streaming && !res.writableFinished) return;
        const outcome =
          res.locals.outcome ??
          (res.statusCode === 200 ? (res.writableFinished ? "completed" : "interrupted") : `status_${res.statusCode}`);
        count(`chat.${res.locals.mode ?? "none"}.${outcome}`);
        if (res.locals.image) count(`image.${outcome}`);
        if (res.locals.research) count(`research.${res.locals.research}.${outcome}`);
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
      // A declared image request gets a larger bound, and pays for it below (image-admission.ts).
      const textLimit = Math.max(65_536, q.maxInputCharacters * 8);
      // A deep research request declares itself with the same header; it keeps the text bound.
      const research = declaredResearch(req.headers, config.research, res.locals.accountEmail);
      if ("refused" in research) {
        count("research.refused_off");
        res.status(400).json({ error: "Deep research is not switched on for this account. No request was forwarded." });
        return;
      }
      res.locals.research = research.step;
      const declared = research.step
        ? ({ image: false } as const)
        : declaredImage(req.headers, q, config.images, textLimit);
      if ("refused" in declared) {
        count(`image.refused_${declared.refused}`);
        res.status(400).json({ error: "Picture questions are not switched on. No request was forwarded." });
        return;
      }
      res.locals.image = declared.image;
      if (req.body.length > (declared.image ? declared.limit : textLimit)) {
        res.locals.outcome = "refused_size";
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
        (admission.model !== tier.model && admission.model !== tier.backupModel) ||
        (declared.image && !imageModelAdmitted(q, mode, admission.model)) ||
        // The plan runs in Fast and the answer in Thinking, each at its declared weight.
        (research.step && mode !== (q.modes ? (research.step === "plan" ? "fast" : "thinking") : undefined))
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
      // An image question costs the report's image price, never the mode's text price.
      const cost = research.step ? research.cost : declared.image ? declared.cost : tier.allowanceCost;
      const creditKind = research.step ? RESEARCH_KINDS[research.step] : declared.image ? "image" : mode;
      const who = String(accountId ?? res.locals.session);
      if (declared.image && !imageDay.take(who)) {
        res.locals.outcome = "refused_image_daily";
        res.status(429).json({
          error: "The daily picture limit is reached. It frees up within 24 hours. No request was forwarded.",
        });
        return;
      }
      // A plan request opens a run and counts toward the day; an answer needs an open run.
      if (research.step === "plan" && !researchDay.take(who)) {
        res.locals.outcome = "refused_daily_runs";
        res.status(429).json({
          error: "The daily deep research limit is reached. It frees up within 24 hours. No request was forwarded.",
        });
        return;
      }
      // A run needs at least one of the day's searches left to start (its searches are taken when it starts).
      if (research.step === "plan" && config.research && searchDay.used(who) >= config.research.dailySearches) {
        researchDay.giveBack(who);
        res.locals.outcome = "refused_search_daily";
        res.status(429).json({ error: "The daily search limit is reached. It frees up within 24 hours. No request was forwarded." });
        return;
      }
      const claimed = research.step === "answer" && researchTickets.claim(who);
      if (research.step === "answer" && !claimed) {
        res.locals.outcome = "refused_no_run";
        res.status(400).json({
          error: "This deep research run is no longer open. Start a new one. No request was forwarded.",
        });
        return;
      }
      // Searches the run did not use go back to the day.
      if (claimed) for (let i = 0; i < claimed.unusedSearches; i++) searchDay.giveBack(who);
      // A voice conversation's answer belongs to the recording it answers (counted at its first part).
      const voiceAnswer =
        !research.step && !declared.image && takeVoiceAnswer(voiceTurns, who, req.headers["x-privateai-voice-turn"]);
      // Taken back when nothing was answered: the run does not count, the answer may be sent again
      // (a voice conversation's answer too).
      const researchBack = () => {
        if (research.step === "plan") researchDay.giveBack(who);
        else if (research.step === "answer") researchTickets.grant(who);
        const turn = voiceAnswer && voiceTurns.get(who);
        if (turn) turn.answer = true;
      };
      // A continuation of a counted run (the deep research answer, a voice turn's answer): a `run-` row, never an allowance unit.
      const continuation = research.step === "answer" || voiceAnswer;
      const requestId = continuation ? runRequestId(randomUUID()) : randomUUID();
      // Claim the local slots before awaiting shared admission.
      active++;
      if (accountId)
        inFlight.set(accountId, (inFlight.get(accountId) ?? 0) + 1);
      let dispatched = false;
      let forwarded = false;
      let transportComplete = false;
      let metrics: UsageMetrics | undefined;
      // For the usage record: why nothing was charged, and what the relay itself measured.
      let free: "code-followup" | "retry" | undefined;
      // Units this request was actually charged (at most what was left; 0 for a continuation).
      let charged = 0;
      let startedAt = 0;
      let responseBytes = 0;
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
      // A browser that has read the whole reply often hangs up a moment before the provider
      // closes its side (live runs of 14 November: complete answers were counted as interrupted).
      // So a hang-up during forwarding gives the provider 2 s to end on its own. If it sends
      // nothing more, every byte was delivered and the reply counts as complete; if more arrives,
      // the browser missed it and the reply is interrupted, as before.
      let hungUp = false;
      res.on("close", () => {
        if (res.writableFinished) return;
        release();
        if (res.locals.streaming) {
          hungUp = true;
          setTimeout(() => abort.abort(), 2000).unref();
        } else abort.abort();
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
        const credit = accountId ? retryCredit.get(accountId) : undefined;
        if (accountId && credit) retryCredit.delete(accountId);
        const toolCredit =
          !research.step &&
          !!config.code &&
          !!accountId &&
          req.headers[CONTINUATION_HEADER] === "tool" &&
          continuationCredits.claim(accountId, mode);
        if (toolCredit) {
          count(`chat.${mode ?? "none"}.tool_continuation`);
          free = "code-followup";
        } else if (config.usage && credit && credit.mode === creditKind && credit.expires > Date.now()) {
          count(`chat.${mode ?? "none"}.retry_not_counted`);
          free = "retry";
        } else if (config.usage) {
          await ensureAllowance(accountId);
          try {
            // The allowance is checked only here, at the start (owner, 18 November): a start needs 1 unit
            // left in the period and in the rolling day (owner, 13 November), and is charged its cost or
            // what is left, never below 0. Deep research is charged whole at its plan request; its answer
            // belongs to that counted run (the ticket above) and is a continuation, never refused for allowance.
            if (!accountId) {
              res.locals.outcome = "refused_allowance";
              res.status(429).json({ error: limitMessage(), code: "limit" });
              return;
            }
            if (continuation) {
              if (!(await config.usage.reserveContinuation?.(accountId, requestId))) throw Error("no period");
            } else {
              const charge = await chargeStart(
                config.usage,
                accountId,
                requestId,
                research.step === "plan" ? research.total : cost,
                config.autoAllowance?.dailyLimit,
              );
              if (!charge.units) {
                if ("reason" in charge && charge.reason === "unavailable") throw Error("allowance unavailable");
                res.locals.outcome = "reason" in charge && charge.reason === "daily" ? "refused_daily" : "refused_allowance";
                const at = "resetsAt" in charge ? charge.resetsAt : undefined;
                res.status(429).json({ error: limitMessage(at), code: "limit", ...(at ? { resetsAt: at } : {}) });
                return;
              }
              charged = charge.units;
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
        forwarded = true;
        startedAt = Date.now();
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
          // Only the class of failure is exposed, so the client can decide on its one
          // retry with the mode's backup model; nothing else leaks. A retired or unknown model
          // is its own class: the client fails closed (no backup retry) and the owner is alerted.
          // 429 or 402 upstream: the organisation's rate limit or spend cap (the exact status of a
          // cap hit at Privatemode is unverified, 16 November). Its own class, so the browser says
          // "capacity" and makes no backup retry against the same limit.
          const failure = (await modelNotFound(reply.statusCode, upstream.body))
            ? "model-not-found"
            : reply.statusCode === 429 || reply.statusCode === 402
              ? "capacity"
              : relay.classifyFailure(reply);
          if (failure === "model-not-found") alertModelNotFound(admission.model, reply.statusCode);
          if (accountId && dispatched) retryCredit.set(accountId, { mode: creditKind, expires: Date.now() + 60_000 });
          // Nothing was answered: the image does not count toward the day.
          if (declared.image) imageDay.giveBack(who);
          researchBack();
          res.setHeader("X-PrivateAI-Upstream", failure);
          res.locals.outcome = `upstream_${failure}`;
          res.status(502).json({
            error:
              "Encrypted provider response unavailable. No automatic retry was made.",
          });
          return;
        }
        for (const [name, value] of Object.entries(accepted.passthrough))
          res.setHeader(name, value);
        // The browser reports the decrypted token counts under this id (POST /api/usage/report).
        if (metering && meterAccount(res)) res.setHeader(REQUEST_ID_HEADER, requestId);
        res.locals.streaming = true;
        // Granted when the provider accepts the paid request, not when it ends: the browser sends
        // its follow-up the moment it has read the reply. A follow-up on credit grants nothing.
        if (config.code && accountId && !toolCredit) continuationCredits.grant(accountId, mode);
        if (research.step === "plan") {
          // The run's searches are counted toward the day now, at its start, so none is refused mid-run.
          let searches = 0;
          while (searches < RESEARCH_LIMITS.searches && searchDay.take(who)) searches++;
          researchTickets.grant(who, Date.now(), searches);
        }
        for await (const chunk of upstream.body) {
          if (hungUp) abort.abort();
          if (abort.signal.aborted) break;
          responseBytes += chunk.length;
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
        // Refused here before anything was sent: the image does not count toward the day.
        if (declared.image && !forwarded) imageDay.giveBack(who);
        if (!forwarded) researchBack();
        // Every request Privatemode received gets a record, charged or free: the weekly reconciliation counts them all.
        const recordFor = meterAccount(res);
        if (metering && forwarded && recordFor)
          metering.record({
            requestId,
            accountId: recordFor,
            feature: free ?? chatFeature(research.step, declared.image, mode),
            units: free || continuation ? 0 : config.usage ? charged : research.step === "plan" ? research.total : cost,
            outcome: transportComplete ? "complete" : String(res.locals.outcome).startsWith("upstream_") ? "refused" : "interrupted",
            model: admission.model,
            requestBytes: req.body.length,
            responseBytes,
            durationMs: Date.now() - startedAt,
          });
        if (hungUp) {
          count(`chat.${res.locals.mode ?? "none"}.${transportComplete ? "completed" : "interrupted"}`);
          if (declared.image) count(`image.${transportComplete ? "completed" : "interrupted"}`);
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
  const bg = config.backgroundTasks;
  if (bg) {
    const background = createBackgroundTasks({
      store: bg.store,
      keys: bg.keys,
      settings: { maxAutoTasks: bg.maxAutoTasks, ...(bg.runHourUtcWindow ? { runHourUtcWindow: bg.runHourUtcWindow } : {}) },
      qualification: parseQualification,
      stopped: () => !!config.inferenceStopped?.(),
      usage: config.usage,
      ensureAllowance,
      dailyLimit: config.autoAllowance?.dailyLimit,
      spendAllows: async (outputTokens) => {
        const q = parseQualification();
        if (!q || !config.usage?.spend) return !!q;
        return spendAllows(config.usage as Required<Pick<UsageLedger, "spend">>, q, active, outputTokens);
      },
      // One of the three chat slots, and only while two stay free for users; never beside the account's own chat.
      claimSlot(accountId) {
        if (active >= 2 || inFlight.has(accountId)) return undefined;
        active++;
        let released = false;
        return () => {
          if (released) return;
          released = true;
          active--;
        };
      },
      search,
      takeSearch: (accountId) => !config.research || searchDay.take(accountId),
      giveBackSearch: (accountId) => void (config.research && searchDay.giveBack(accountId)),
      model:
        bg.model ??
        createPrivatemodeBackgroundClient({
          apiKey: config.apiKey ?? "",
          qualification: () => (config.apiKey ? parseQualification() : undefined),
          manifest: config.providerManifest,
          attestQueue,
          log: bg.log,
        }),
      cacheSalt: (accountId) => cacheSalt(accountId, ""),
      log: bg.log,
    });
    // The development server (never hosted) has no accounts: one local account stands in.
    app.use(backgroundRoutes(background, bg.maxAutoTasks, (res) => res.locals.accountId ?? (config.dev ? "local-development" : undefined)));
    if (bg.start !== false) background.start();
  }
  // Before the 8 KB body parser: an encrypted sync item can be up to 4 MB.
  if (config.vaultSync)
    app.use(syncRoutes(config.vaultSync.store, config.vaultSync, (res) => res.locals.accountId ?? (config.dev ? "local-development" : undefined)));
  if (config.secureStore)
    app.use(secureRoutes(config.secureStore, (res) => res.locals.accountId ?? (config.dev ? "local-development" : undefined)));
  app.use("/api", express.json({ limit: "8kb" }));
  if (config.consumer?.billingRouter) app.use(config.consumer.billingRouter);
  if (config.plans)
    app.use(planRoutes({ settings: config.plans, origin: config.origin, account: (res) => (res.locals.accountId ?? (config.dev ? "local-development" : undefined)) as string | undefined }));
  if (metering) app.use(metering.router);
  // Searches cost money at the search provider and page reads nothing; both are counted, never charged.
  const recordTool = (res: express.Response, feature: "search" | "page-fetch") => {
    const who = meterAccount(res);
    if (metering && who) metering.record({ requestId: randomUUID(), accountId: who, feature, units: 0, outcome: "complete" });
  };
  // Image creation: the description only, our refusals first, its own daily limit, one ledger record
  // per created image (feature "image-create", priced from the versioned price list). Nothing is kept.
  if (config.imageCreation) {
    const creation = config.imageCreation;
    app.post("/api/images/create", async (req, res) => {
      res.setHeader("Cache-Control", "no-store");
      const who = res.locals.accountId ?? (config.dev ? "local-development" : undefined);
      if (!who) return void res.status(401).json({ error: "signin" });
      const parsed = z.object({ prompt: z.string().trim().min(1).max(IMAGE_PROMPT_MAX) }).strict().safeParse(req.body);
      if (!parsed.success) return void res.status(400).json({ error: "invalid" });
      const refusal = refuseImagePrompt(parsed.data.prompt);
      if (refusal) return void res.status(422).json({ error: "refused", reason: refusal });
      if (!createDay.take(String(who))) return void res.status(429).json({ error: "limit", limit: creation.dailyImages });
      const abort = new AbortController();
      res.on("close", () => abort.abort());
      const requestId = randomUUID();
      const meter = meterAccount(res);
      try {
        const image = await creation.provider.generate(parsed.data.prompt, abort.signal);
        if (metering && meter)
          metering.record({ requestId, accountId: meter, feature: "image-create", units: 0, outcome: "complete", model: image.model });
        res.json({ type: image.type, data: Buffer.from(image.bytes).toString("base64"), model: image.model });
      } catch (error) {
        createDay.giveBack(String(who));
        if (metering && meter)
          metering.record({ requestId, accountId: meter, feature: "image-create", units: 0, outcome: "refused", model: creation.provider.model });
        if (error instanceof ImageRefused) return void res.status(422).json({ error: "refused", reason: "provider" });
        if (error instanceof ImageCapacity) return void res.status(503).json({ error: "capacity" });
        if (!res.headersSent) res.status(502).json({ error: "unavailable" });
      }
    });
  }
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
        const sources = await fetchPage(request.value, abort.signal);
        recordTool(res, "page-fetch");
        res.json({ sources });
        return;
      }
      // Each search costs money at the search provider: with deep research on, every account has
      // a number of searches per 24 hours (ordinary approved searches count too).
      const who = String(res.locals.accountId ?? res.locals.session);
      // A started research run's searches were counted at its start; others count now.
      const runSearch = researchTickets.useSearch(who);
      if (!runSearch && config.research && !searchDay.take(who)) {
        count("search.refused_daily");
        res.status(429).json({
          error: "The daily search limit is reached. It frees up within 24 hours. No query was sent.",
        });
        return;
      }
      count("search.executed");
      const sources = await search!.search(request.value, abort.signal).catch((error) => {
        // The provider gave no results: the search does not count toward the day (or the run).
        if (runSearch) researchTickets.returnSearch(who);
        else if (config.research) searchDay.giveBack(who);
        throw error;
      });
      recordTool(res, "search");
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
          "The web search could not complete: the search service or the page is unavailable, redirects, or exceeds safety limits. No automatic retry was made.",
      });
    }
  });
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Unsupported operation." });
  });
  app.use(finalErrorHandler);
  return app;
}

/**
 * Last handler: client mistakes (body-parser and other 4xx errors) stay 400, a too-large body is
 * 413, anything else is our fault and answers 503 without details (never the error text or stack).
 */
export function finalErrorHandler(
  err: unknown,
  _req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  if (res.headersSent) return next(err);
  const e = (err ?? {}) as { status?: unknown; statusCode?: unknown; type?: unknown };
  const status = Number(e.status ?? e.statusCode);
  if (e.type === "entity.too.large" || status === 413)
    res.status(413).json({ error: "The request is too large. Nothing was sent." });
  // A schema check that throws (research cancel parses its body unguarded) is the client's input too.
  else if (e.type === "entity.parse.failed" || err instanceof z.ZodError || (status >= 400 && status < 500))
    res.status(400).json({ error: "Invalid request." });
  else {
    logServerError(err, _req);
    res.status(503).json({ error: "Service temporarily unavailable. No new request was started." });
  }
}

/**
 * Error tracking without personal data (docs/owner-security-ops-20261118.md, item 3): one line per
 * server fault in the host log. Only the method, the first two path parts, the error class and a
 * short code (a PostgreSQL SQLSTATE such as 23505); never the message, stack, query, body or headers,
 * which can hold user text.
 */
export function logServerError(err: unknown, req: Pick<express.Request, "method" | "path">) {
  const e = (err ?? {}) as { name?: unknown; code?: unknown };
  const safe = (v: unknown, pattern: RegExp) => (typeof v === "string" && pattern.test(v) ? v : "-");
  const area = typeof req?.path === "string" ? req.path.split("/").slice(0, 3).map((p) => (/^[a-z-]{0,24}$/.test(p) ? p : ":")).join("/") : "-";
  process.stderr.write(`server-error ${safe(req?.method, /^[A-Z]{3,7}$/)} ${area || "/"} ${safe(e.name, /^[A-Za-z]{1,40}$/)} ${safe(e.code, /^[A-Z0-9_]{1,12}$/)}\n`);
}
