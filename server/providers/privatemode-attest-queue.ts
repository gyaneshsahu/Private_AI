// One adaptive queue for Privatemode attestation calls from all users of this server
// (owner, 13 November). Privatemode rate-limits attestation per organisation; without a queue,
// a few sessions starting together exceed it, and the SDK's own three attempts per verification
// turn each refusal into more calls (live test of 13 November: 3 sessions at once, 22 HTTP 429).
// Chat and key exchange never pass through here: only the attest call was ever refused.
// shortcut: queue state is in memory per server instance; with several instances behind one
// key, each paces on its own and together they can exceed the limit. Move the state to a shared
// store (or one relay instance) before running more than one.

/**
 * Every number in one place, in attest calls (one per browser verification since the client sets
 * the secret during verification; two before). Measured:
 * - 12 November (docs/privatemode-attestation-limit-20261112.md, Node probes): 10 fresh
 *   verifications a minute passed, 20 a minute drew 429s, 15 back to back passed in 30 s.
 * - 13 November, live through this queue: 10 attest calls within about 8 s passed, the 11th got
 *   HTTP 429 with Retry-After: 60; in another run the 10th within two minutes got it. So today's
 *   limit is about 9 to 10 calls a minute per organisation, with a 60 s penalty.
 */
export const ATTEST_LIMITS = {
  /** Start well below the 9 to 10 calls a minute that passed: one call every 10 s. */
  startPerMinute: 6,
  /** Never slower than this, however many 429s arrive. */
  floorPerMinute: 2,
  /** Growth stops here, far above today's limit, so a raised limit is used with no code change. */
  ceilingPerMinute: 120,
  /** Sent at once before pacing starts: 6 verifications, leaving room below the 9 that passed. */
  burst: 6,
  /** The rate grows by one call a minute after this many successful attest calls in a row. */
  growAfterSuccesses: 10,
  /** Pause after a 429 without Retry-After: what Privatemode sent with its 429 (60 s). */
  pauseAfter429Ms: 60_000,
  /**
   * Longest a call may wait to be sent (owner: about 20 s). Fast mode allows 30 s for the whole
   * verification plus the first word, so a verification whose both calls wait long can still time out.
   */
  maxWaitMs: 20_000,
};

export interface UpstreamAttestReply {
  statusCode: number;
  headers: Record<string, string | string[] | undefined>;
  body: { dump(): Promise<void> };
}

export interface AttestQueueStats {
  sent: number;
  /** Calls that could not be sent at once. */
  waited: number;
  waitedMs: number;
  limited429: number;
  busy: number;
  perMinute: number;
  /** The last pause after a 429 (Retry-After, or the default when absent). */
  lastPauseMs: number;
}

/** Retry-After in milliseconds (seconds or an HTTP date), or undefined. */
function retryAfterMs(reply: UpstreamAttestReply, now: number) {
  const raw = reply.headers["retry-after"];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return undefined;
  const ms = /^\d+$/.test(value.trim()) ? Number(value) * 1000 : Date.parse(value) - now;
  return Number.isFinite(ms) && ms > 0 ? ms : undefined;
}

export function createAttestQueue(
  limits = ATTEST_LIMITS,
  log: (stats: AttestQueueStats) => void = () => {},
) {
  const capacity = limits.burst;
  let perMinute = limits.startPerMinute;
  let tokens = capacity;
  let refilledAt = Date.now();
  let pausedUntil = 0;
  let successes = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const waiting: { arrived: number; start(): void; expire(): void }[] = [];
  const stats: AttestQueueStats = { sent: 0, waited: 0, waitedMs: 0, limited429: 0, busy: 0, perMinute, lastPauseMs: 0 };
  /** Attest calls per millisecond. */
  const rate = () => perMinute / 60_000;

  function refill(now: number) {
    tokens = Math.min(capacity, tokens + Math.max(0, now - refilledAt) * rate());
    refilledAt = Math.max(refilledAt, now);
  }
  /** How long a call joining the queue now would wait. */
  function expectedWait(now: number) {
    refill(now);
    const short = waiting.length + 1 - tokens;
    return Math.max(0, pausedUntil - now) + Math.max(0, short) / rate();
  }
  function pump() {
    clearTimeout(timer);
    timer = undefined;
    const now = Date.now();
    refill(now);
    while (waiting.length && now >= pausedUntil && tokens >= 1) {
      tokens -= 1;
      waiting.shift()!.start();
    }
    if (waiting.length)
      timer = setTimeout(pump, Math.max(pausedUntil - now, (1 - tokens) / rate(), 1));
  }
  function limited(reply: UpstreamAttestReply) {
    const now = Date.now();
    stats.limited429++;
    successes = 0;
    const pause = retryAfterMs(reply, now) ?? limits.pauseAfter429Ms;
    stats.lastPauseMs = pause;
    // 429s from calls already in flight belong to the same burst: halve once per pause.
    if (now >= pausedUntil) perMinute = Math.max(limits.floorPerMinute, perMinute / 2);
    pausedUntil = Math.max(pausedUntil, now + pause);
    // After the pause one call goes, then the halved pace.
    tokens = 1;
    refilledAt = pausedUntil;
    stats.perMinute = perMinute;
    log({ ...stats });
  }
  function succeeded() {
    if (++successes < limits.growAfterSuccesses) return;
    successes = 0;
    perMinute = Math.min(limits.ceilingPerMinute, perMinute + 1);
    stats.perMinute = perMinute;
  }

  return {
    stats: () => ({ ...stats }),
    /**
     * Sends one attest call when the rate allows. Resolves with the upstream reply, or "busy"
     * when it could not be sent within `maxWaitMs`. A 429 is never passed on: the call goes back
     * to the front of the queue while its time lasts.
     */
    run<R extends UpstreamAttestReply>(send: () => Promise<R>, signal: AbortSignal): Promise<R | "busy"> {
      return new Promise((resolve, reject) => {
        const arrived = Date.now();
        const deadline = arrived + limits.maxWaitMs;
        let queued = false;
        let counted = false;
        const markQueued = () => {
          if (queued) return;
          queued = true;
          stats.waited++;
        };
        const remove = () => {
          const at = waiting.indexOf(item);
          if (at >= 0) waiting.splice(at, 1);
          return at >= 0;
        };
        const finish = () => {
          clearTimeout(expiry);
          signal.removeEventListener("abort", left);
        };
        const busy = () => {
          finish();
          stats.busy++;
          log({ ...stats });
          resolve("busy");
        };
        const left = () => {
          if (!remove()) return; // in flight: the caller's own abort ends it
          finish();
          reject(signal.reason);
        };
        const item = {
          arrived,
          expire() {
            if (remove()) busy();
          },
          async start() {
            const now = Date.now();
            if (queued && !counted) {
              counted = true;
              stats.waitedMs += now - arrived;
            }
            stats.sent++;
            try {
              const reply = await send();
              if (reply.statusCode !== 429) {
                if (reply.statusCode < 300) succeeded();
                finish();
                resolve(reply);
                return;
              }
              await reply.body.dump().catch(() => {});
              limited(reply);
              if (Date.now() < deadline && !signal.aborted) {
                // Back in line by arrival, ahead of everyone who came later.
                const at = waiting.findIndex((other) => other.arrived > arrived);
                waiting.splice(at < 0 ? waiting.length : at, 0, item);
                markQueued();
                pump();
              } else busy();
            } catch (error) {
              finish();
              reject(error);
            }
          },
        };
        const expiry = setTimeout(() => item.expire(), limits.maxWaitMs);
        signal.addEventListener("abort", left, { once: true });
        // Refuse at once when the wait would run out anyway: the SDK tries three times per
        // verification, and its later attempts should not each wait the full time.
        if (expectedWait(arrived) >= limits.maxWaitMs) return busy();
        waiting.push(item);
        pump();
        if (waiting.includes(item)) markQueued();
      });
    },
  };
}
