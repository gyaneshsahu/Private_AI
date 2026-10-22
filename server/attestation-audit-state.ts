import type { AttestationAuditResult } from "./attestation-audit";

/**
 * Defaults: six-hour cadence, twenty-four-hour maximum age of the last
 * success, two-minute CLI bound, and retries 1, 2, 4 and 8 minutes after a
 * failed audit before the normal cadence resumes.
 */
export const attestationAuditDefaults = {
  binary: "/usr/local/bin/tinfoil",
  intervalMinutes: 360,
  maxAgeMinutes: 1440,
  timeoutSeconds: 120,
  retryDelaysMinutes: [1, 2, 4, 8] as readonly number[],
} as const;

export interface AttestationAuditStateOptions {
  /** When false, `shouldBlock()` is always false and the timer never starts. */
  enabled: boolean;
  intervalMs?: number;
  /** A success older than this no longer admits requests. */
  maxAgeMs?: number;
  /** Delays after a failed audit before each retry; empty disables retries. */
  retryDelaysMs?: readonly number[];
  run: () => Promise<AttestationAuditResult>;
  now?: () => number;
}

export interface AttestationAuditSnapshot {
  enabled: boolean;
  last?: AttestationAuditResult;
  lastSuccessAt?: string;
  /** True while a retry after a failure is scheduled or running. */
  retryPending: boolean;
}

export interface AttestationAuditState {
  /**
   * True only when auditing is enabled AND one of: the last audit was a
   * verification failure; the last audit was a transient error (network,
   * DNS, TLS, timeout) and either no retry is pending or the previous
   * success is no longer current; no success is within the maximum age; the
   * witnessed freshness has expired.
   */
  shouldBlock(): { block: boolean; reason: string };
  /** Runs one audit now; concurrent calls share the in-flight run. Never throws. */
  refresh(): Promise<AttestationAuditResult | undefined>;
  /** Starts the timer and kicks off the first audit; resolves when that first audit finished. */
  start(): Promise<void>;
  stop(): void;
  snapshot(): AttestationAuditSnapshot;
}

export function createAttestationAuditState(
  options: AttestationAuditStateOptions,
): AttestationAuditState {
  const now = options.now ?? Date.now;
  const intervalMs =
    options.intervalMs ?? attestationAuditDefaults.intervalMinutes * 60_000;
  const maxAgeMs =
    options.maxAgeMs ?? attestationAuditDefaults.maxAgeMinutes * 60_000;
  const retryDelaysMs =
    options.retryDelaysMs ??
    attestationAuditDefaults.retryDelaysMinutes.map((m) => m * 60_000);
  if (
    !Number.isFinite(intervalMs) ||
    intervalMs < 1 ||
    !Number.isFinite(maxAgeMs) ||
    maxAgeMs < intervalMs ||
    retryDelaysMs.length > 8 ||
    retryDelaysMs.some((d) => !Number.isFinite(d) || d < 1 || d > intervalMs)
  )
    throw Error("Invalid attestation audit cadence.");
  let last: AttestationAuditResult | undefined;
  let lastSuccess: { at: number; freshnessExpiresAt?: number } | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let retriesUsed = 0;
  let retryPending = false;
  let inFlight: Promise<AttestationAuditResult | undefined> | undefined;

  function clearRetry() {
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = undefined;
  }

  /** Whether the previous success still admits requests on its own. */
  function successCurrent(at: number) {
    if (!lastSuccess) return { current: false, reason: "no successful attestation audit yet" };
    if (at - lastSuccess.at > maxAgeMs)
      return {
        current: false,
        reason: "last successful attestation audit exceeds the maximum age",
      };
    if (
      lastSuccess.freshnessExpiresAt !== undefined &&
      lastSuccess.freshnessExpiresAt <= at
    )
      return { current: false, reason: "supplier freshness witness expired" };
    return { current: true, reason: "attestation audit current" };
  }

  async function refresh() {
    if (!options.enabled) return undefined;
    if (inFlight) return inFlight;
    inFlight = (async () => {
      let result: AttestationAuditResult;
      try {
        result = await options.run();
        if (!result || typeof result.ok !== "boolean") throw Error("shape");
      } catch {
        result = {
          ok: false,
          checkedAt: new Date(now()).toISOString(),
          reason: "audit runner failed",
        };
      }
      last = result;
      clearRetry();
      if (result.ok) {
        const expiry = result.freshnessExpiresAt
          ? Date.parse(result.freshnessExpiresAt)
          : NaN;
        lastSuccess = {
          at: now(),
          ...(Number.isFinite(expiry) ? { freshnessExpiresAt: expiry } : {}),
        };
        retriesUsed = 0;
        retryPending = false;
      } else if (retriesUsed < retryDelaysMs.length) {
        // Bounded backoff before the normal cadence resumes; the retry is
        // "pending" from now until its own result has been recorded.
        retryPending = true;
        retryTimer = setTimeout(() => void refresh(), retryDelaysMs[retriesUsed++]);
        retryTimer.unref();
      } else {
        retryPending = false;
      }
      return result;
    })().finally(() => {
      inFlight = undefined;
    });
    return inFlight;
  }

  return {
    shouldBlock() {
      if (!options.enabled)
        return { block: false, reason: "attestation audit disabled" };
      const at = now();
      const success = successCurrent(at);
      if (last && !last.ok) {
        const detail = last.reason ?? "unknown";
        if (!last.transient)
          return { block: true, reason: `last attestation audit failed: ${detail}` };
        if (!success.current)
          return {
            block: true,
            reason: `transient attestation audit error and ${success.reason}`,
          };
        if (!retryPending)
          return {
            block: true,
            reason: `attestation audit retries exhausted: ${detail}`,
          };
        return {
          block: false,
          reason: `transient attestation audit error, retry pending: ${detail}`,
        };
      }
      return { block: !success.current, reason: success.reason };
    },
    refresh,
    async start() {
      if (!options.enabled || timer) return;
      timer = setInterval(() => void refresh(), intervalMs);
      timer.unref();
      await refresh();
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = undefined;
      clearRetry();
      retryPending = false;
    },
    snapshot() {
      return {
        enabled: options.enabled,
        ...(last ? { last } : {}),
        ...(lastSuccess
          ? { lastSuccessAt: new Date(lastSuccess.at).toISOString() }
          : {}),
        retryPending,
      };
    },
  };
}

const disabled = createAttestationAuditState({
  enabled: false,
  run: async () => ({
    ok: false,
    checkedAt: new Date().toISOString(),
    reason: "disabled",
  }),
});
let active: AttestationAuditState = disabled;

/** Process-wide state the guard consults when none is passed explicitly. Disabled until installed. */
export function activeAttestationAudit() {
  return active;
}

/** Installs the deployment's state; returns the previous one so tests can restore it. */
export function installAttestationAudit(state: AttestationAuditState | undefined) {
  const previous = active;
  active = state ?? disabled;
  return previous;
}
