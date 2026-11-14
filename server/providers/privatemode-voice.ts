// Voice input (dictation) through the relay: the browser's Privatemode SDK encrypts one recording
// and posts it to /v1/audio/transcriptions at our origin; this route forwards the opaque bytes to
// Privatemode with the real key. Admission is the chat route's: session and CSRF (before this
// route), stop switch, qualification, pinned model, three per instance, one per account, spend
// guard, allowance and daily cap through the same usage ledger. Nothing is stored or logged:
// the body lives in memory for this one request, and counts carry fixed names only.
import { randomUUID } from "node:crypto";
import { pipeline } from "node:stream/promises";
import express, { type ErrorRequestHandler, type RequestHandler } from "express";
import { request as upstreamRequest } from "undici";
import type { Qualification } from "../../shared/contracts";
import { voiceDailyCount, voiceUploadLimit } from "../../shared/voice";
import { count } from "../counters";
import { serviceDispatcher } from "../network";
import { spendAllows } from "../spend-guard";
import type { UsageLedger } from "../usage-contract";
import { alertModelNotFound, modelNotFound } from "./inference-relay";
import { forwardedHeaders, REPLY_HEADERS } from "./privatemode-relay";

export const VOICE_PATH = "/v1/audio/transcriptions";
const DAY = 86_400_000;

export interface VoiceSettings {
  /** Longest recording; with the bitrate it sets the upload size limit. */
  maxSeconds: number;
  /** Audio minutes per account in any 24 hours, every recording counted at full length. */
  dailyMinutes: number;
}

export interface VoiceRelayDeps {
  settings: VoiceSettings;
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
}

/** The handlers for POST /api/inference/v1/audio/transcriptions, in order. */
export function voiceRoute(deps: VoiceRelayDeps): (RequestHandler | ErrorRequestHandler)[] {
  const { settings } = deps;
  const limit = voiceUploadLimit(settings.maxSeconds);
  const perDay = voiceDailyCount(settings.dailyMinutes, settings.maxSeconds);
  // shortcut: the voice day count and the retry credit live in this process's memory, like chat's
  // retry credit, so a restart forgets them; move to the ledger with the other single-server limits.
  const starts = new Map<string, number[]>();
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
    const accountId: string | undefined = res.locals.accountId;
    const claimed = deps.claim(accountId);
    if (claimed === "instance")
      return refuse(429, "refused_instance_busy", "Three requests are already running.");
    if (claimed === "account")
      return refuse(429, "refused_account_busy", "A request is already running for this account.");
    const requestId = randomUUID();
    let dispatched = false;
    let complete = false;
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
      if (credit > now) count("voice.retry_not_counted");
      else {
        const recent = (starts.get(who) ?? []).filter((t) => now - t < DAY);
        if (recent.length >= perDay)
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
        if (starts.size > 5000)
          for (const [key, times] of starts) if (times.every((t) => now - t >= DAY)) starts.delete(key);
        starts.set(who, [...recent, now]);
      }
      if (abort.signal.aborted) return;
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
      await pipeline(upstream.body, res);
      complete = true;
    } catch {
      if (!res.headersSent)
        refuse(502, "interrupted", "Protected request interrupted. Retry explicitly if needed.");
      else res.destroy();
    } finally {
      claimed();
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
  return [express.raw({ type: () => true, limit }), handler, tooLarge];
}
