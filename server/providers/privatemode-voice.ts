// Voice input (dictation) through the relay: the browser's Privatemode SDK encrypts one chunk of a
// recording (up to chunkSeconds) and posts it to /v1/audio/transcriptions at our origin; this route
// forwards the opaque bytes to Privatemode with the real key. Admission is the chat route's:
// session and CSRF (before this route), stop switch, qualification, pinned model, three per
// instance, one per account, spend guard, allowance and daily cap through the same usage ledger.
// On top: the chunk's reported voice units are checked against its encrypted size, and the daily
// voice budget is kept in the ledger. With usage metering on, each forwarded chunk also gets a usage
// record (feature voice, the units charged, sizes, duration; its ID carries the 2-second units).
// Nothing is stored or logged beyond that: the body lives in memory for this one request, and
// counts carry fixed names only.
import { randomUUID } from "node:crypto";
import { pipeline } from "node:stream/promises";
import express, { type ErrorRequestHandler, type RequestHandler } from "express";
import { request as upstreamRequest } from "undici";
import type { Qualification } from "../../shared/contracts";
import type { NewUsageRecord } from "../usage-records";
import { voiceChunkLimit, voiceChunkUnits, type VoiceLimits } from "../../shared/voice";
import { count } from "../counters";
import { serviceDispatcher } from "../network";
import { spendAllows } from "../spend-guard";
import { voiceRequestId, type UsageLedger } from "../usage-contract";
import { alertModelNotFound, modelNotFound } from "./inference-relay";
import { forwardedHeaders, REPLY_HEADERS } from "./privatemode-relay";

export const VOICE_PATH = "/v1/audio/transcriptions";
/** The browser reports each chunk's voice units (2-second steps, rounded up) in this header. */
export const VOICE_UNITS_HEADER = "x-privateai-voice-units";
const DAY = 86_400_000;

export type VoiceSettings = VoiceLimits;

/**
 * Voice units used in any 24 hours: from the usage ledger, where each chunk's request ID carries its
 * units (durable), or without a ledger (the development server) from this process's memory.
 */
export function voiceUsage(usage?: UsageLedger) {
  // shortcut: without a ledger the units live in memory and a restart forgets them; every
  // deployment with accounts has the ledger.
  const memory = new Map<string, { at: number; units: number }[]>();
  const recent = (who: string, now: number) => (memory.get(who) ?? []).filter((e) => now - e.at < DAY);
  return {
    async used(who: string, accountId: string | undefined): Promise<number> {
      if (!usage) return recent(who, Date.now()).reduce((sum, e) => sum + e.units, 0);
      if (!accountId || !usage.voiceUnitsInLast) throw Error("Voice usage unavailable.");
      return usage.voiceUnitsInLast(accountId, DAY);
    },
    /** Without a ledger only: with one, the units are part of the reserved request's ID. */
    record(who: string, units: number) {
      if (usage) return;
      const now = Date.now();
      if (memory.size > 5000)
        for (const key of memory.keys()) if (!recent(key, now).length) memory.delete(key);
      memory.set(who, [...recent(who, now), { at: now, units }]);
    },
  };
}
export type VoiceUsage = ReturnType<typeof voiceUsage>;

export interface VoiceRelayDeps {
  settings: VoiceSettings;
  budget: VoiceUsage;
  apiKey?: string;
  qualification: () => Qualification | undefined;
  stopped?: () => boolean;
  usage?: UsageLedger;
  /** The chat allowance's rolling 24-hour cap in units, when the owner set one. */
  dailyLimit?: number;
  ensureAllowance: (accountId: string | undefined) => Promise<void>;
  /** Claims the instance and account slots chat uses; returns the release function or why not. */
  claim: (accountId: string | undefined) => "instance" | "account" | (() => void);
  /** Requests running in this process, this one included (for the spend guard). */
  running: () => number;
  /** Usage metering (docs/usage-metering-20261115.md); absent while it is off: then nothing is recorded. */
  metering?: {
    accountOf: (res: express.Response) => string | undefined;
    record: (input: Omit<NewUsageRecord, "weightVersion">) => void;
  };
}

/** The handlers for POST /api/inference/v1/audio/transcriptions, in order. */
export function voiceRoute(deps: VoiceRelayDeps): (RequestHandler | ErrorRequestHandler)[] {
  const { settings } = deps;
  const maxUnits = voiceChunkUnits(settings.chunkSeconds);
  // shortcut: the retry credit lives in this process's memory, like chat's retry credit, so a
  // restart forgets it; move to the ledger with the other single-server limits.
  const retryCredit = new Map<string, number>();

  const handler: RequestHandler = async (req, res) => {
    // The reason travels in a header: the SDK hands the browser a refused reply's status and
    // headers, not its text.
    const refuse = (status: number, outcome: string, error: string) => {
      res.locals.outcome = outcome;
      res.setHeader("X-PrivateAI-Voice", outcome);
      res.status(status).json({ error });
    };
    res.on("close", () => {
      const outcome =
        res.locals.outcome ??
        (res.statusCode === 200 && res.writableFinished ? "completed" : "interrupted");
      count(`voice.${outcome}`);
    });
    const q = deps.qualification();
    if (!q || !deps.apiKey)
      return refuse(503, "unavailable", "Protected inference is not qualified. No request was forwarded.");
    if (deps.stopped?.())
      return refuse(503, "stopped", "Private chat is paused by the operator. No request was forwarded.");
    if (q.provider !== "privatemode" || !q.speech)
      return refuse(404, "off", "Voice input is not switched on.");
    const speech = q.speech;
    if (
      req.headers["privatemode-target-model"] !== speech.model ||
      !Buffer.isBuffer(req.body) ||
      req.body.length < 16
    )
      return refuse(400, "refused_model", "Only the qualified speech model is accepted.");
    // The browser measures the chunk's length; its encrypted size must fit that length (shared/voice.ts).
    const reported = String(req.headers[VOICE_UNITS_HEADER] ?? "");
    const units = /^\d{1,3}$/.test(reported) ? Number(reported) : 0;
    if (units < 1 || units > maxUnits)
      return refuse(400, "refused_units", "Each voice part must state its length. No request was forwarded.");
    if (req.body.length > voiceChunkLimit(units))
      return refuse(413, "refused_size", "This recording is too large. No request was forwarded.");
    const accountId: string | undefined = res.locals.accountId;
    const claimed = deps.claim(accountId);
    if (claimed === "instance")
      return refuse(429, "refused_instance_busy", "Three requests are already running.");
    if (claimed === "account")
      return refuse(429, "refused_account_busy", "A request is already running for this account.");
    // The units ride in the ledger row's ID: the durable daily voice budget (usage-contract.ts).
    const requestId = voiceRequestId(units, randomUUID());
    let dispatched = false;
    let complete = false;
    // For the usage record: the allowance units this chunk was charged (0 on the retry credit).
    let charged = speech.allowanceCost;
    let forwarded = false;
    let refusedUpstream = false;
    let startedAt = 0;
    let responseBytes = 0;
    const abort = new AbortController();
    res.on("close", () => {
      if (res.writableFinished) return;
      claimed();
      abort.abort();
    });
    try {
      // Each recording is one ledger request, so the spend guard counts it at a chat request's
      // worst case: far above its real price (at most a few cents), never below.
      if (deps.usage?.spend) {
        const allowed = await spendAllows(
          deps.usage as Required<Pick<UsageLedger, "spend">>,
          q,
          deps.running() - 1,
        ).catch(() => false);
        if (!allowed)
          return refuse(
            429,
            "refused_spend",
            "The approved spending limit for this provider review is reached. No request was forwarded.",
          );
      }
      const who = String(accountId ?? res.locals.session);
      const now = Date.now();
      const credit = retryCredit.get(who) ?? 0;
      retryCredit.delete(who);
      if (credit > now) {
        count("voice.retry_not_counted");
        charged = 0;
      } else {
        let used: number;
        try {
          used = await deps.budget.used(who, accountId);
        } catch {
          return refuse(503, "usage_unavailable", "Usage controls unavailable. No request was forwarded.");
        }
        if (used + units > settings.dailyUnits)
          return refuse(
            429,
            "refused_voice_daily",
            "The daily voice input limit is reached. It frees up within 24 hours. No request was forwarded.",
          );
        if (deps.usage) {
          await deps.ensureAllowance(accountId);
          try {
            if (
              deps.dailyLimit &&
              accountId &&
              (!deps.usage.usedInLast ||
                (await deps.usage.usedInLast(accountId, DAY)) + speech.allowanceCost > deps.dailyLimit)
            )
              return refuse(
                429,
                "refused_daily",
                "The daily request limit is reached. It frees up within 24 hours. No request was forwarded.",
              );
            if (!accountId || !(await deps.usage.reserve(accountId, requestId, speech.allowanceCost)))
              return refuse(
                429,
                "refused_allowance",
                speech.allowanceCost > 1
                  ? `Not enough request allowance: voice input counts as ${speech.allowanceCost} requests. No request was forwarded.`
                  : "No request allowance is available. No request was forwarded.",
              );
            if (abort.signal.aborted) return;
            await deps.usage.dispatch(accountId, requestId);
            dispatched = true;
          } catch {
            return refuse(503, "usage_unavailable", "Usage controls unavailable. No request was forwarded.");
          }
        }
        deps.budget.record(who, units);
      }
      if (abort.signal.aborted) return;
      forwarded = true;
      startedAt = Date.now();
      const upstream = await upstreamRequest(new URL(VOICE_PATH, q.origin), {
        dispatcher: serviceDispatcher,
        method: "POST",
        body: new Uint8Array(req.body),
        signal: AbortSignal.any([abort.signal, AbortSignal.timeout(90_000)]),
        headers: {
          ...forwardedHeaders(req.headers),
          // The report's speech model, never a client-chosen one.
          "privatemode-target-model": speech.model,
          authorization: `Bearer ${deps.apiKey}`,
        },
      });
      if (upstream.statusCode !== 200) {
        // Never reflect upstream errors. Only the class is exposed, as for chat.
        const failure = (await modelNotFound(upstream.statusCode, upstream.body))
          ? "model-not-found"
          : upstream.statusCode >= 400 && upstream.statusCode < 500
            ? "rejected"
            : "unavailable";
        if (failure === "model-not-found") alertModelNotFound(speech.model, upstream.statusCode);
        // Nothing was transcribed: the same account's next recording within a minute is not counted again.
        retryCredit.set(who, Date.now() + 60_000);
        refusedUpstream = true;
        res.setHeader("X-PrivateAI-Upstream", failure);
        return refuse(
          502,
          `upstream_${failure}`,
          "The recording could not be transcribed. No automatic retry was made.",
        );
      }
      for (const [name, value] of Object.entries(upstream.headers)) {
        const v = Array.isArray(value) ? value[0] : value;
        if (v !== undefined && REPLY_HEADERS.test(name)) res.setHeader(name, v);
      }
      await pipeline(
        upstream.body,
        async function* (source: AsyncIterable<Buffer>) {
          for await (const chunk of source) {
            responseBytes += chunk.length;
            yield chunk;
          }
        },
        res,
      );
      complete = true;
    } catch {
      if (!res.headersSent)
        refuse(502, "interrupted", "Protected request interrupted. Retry explicitly if needed.");
      else res.destroy();
    } finally {
      claimed();
      // Every chunk Privatemode received gets a record, charged or not, as for chat.
      const recordFor = deps.metering?.accountOf(res);
      if (deps.metering && forwarded && recordFor)
        deps.metering.record({
          requestId,
          accountId: recordFor,
          feature: "voice",
          units: charged,
          outcome: complete ? "complete" : refusedUpstream ? "refused" : "interrupted",
          model: speech.model,
          requestBytes: req.body.length,
          responseBytes,
          durationMs: Date.now() - startedAt,
        });
      if (deps.usage && accountId && dispatched)
        await Promise.resolve(
          deps.usage.finish(accountId, requestId, complete ? "transport_complete" : "uncertain"),
        ).catch(() => {
          /* The reservation stays counted if settlement is unavailable. */
        });
    }
  };

  // The body parser refuses an upload over the limit before the handler runs.
  const tooLarge: ErrorRequestHandler = (err, _req, res, next) => {
    if ((err as { type?: string })?.type !== "entity.too.large") return next(err);
    count("voice.refused_size");
    res.setHeader("X-PrivateAI-Voice", "refused_size");
    res.status(413).json({ error: "This recording is too large. No request was forwarded." });
  };
  return [express.raw({ type: () => true, limit: voiceChunkLimit(maxUnits) }), handler, tooLarge];
}
