import type { AttestationAuditResult } from "./attestation-audit";

/** Default cadence: six hours; maximum age of the last success: twenty-four hours. */
export const attestationAuditDefaults = {
  binary: "/usr/local/bin/tinfoil",
  intervalMinutes: 360,
  maxAgeMinutes: 1440,
  timeoutSeconds: 120,
} as const;

export interface AttestationAuditStateOptions {
  /** When false, `shouldBlock()` is always false and the timer never starts. */
  enabled: boolean;
  intervalMs?: number;
  /** A success older than this no longer admits requests. */
  maxAgeMs?: number;
  run: () => Promise<AttestationAuditResult>;
  now?: () => number;
}

export interface AttestationAuditSnapshot {
  enabled: boolean;
  last?: AttestationAuditResult;
  lastSuccessAt?: string;
}

export interface AttestationAuditState {
  /** True only when auditing is enabled AND (the last audit failed, or no success is within the maximum age, or the witnessed freshness has expired). */
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
  if (
    !Number.isFinite(intervalMs) ||
    intervalMs < 1 ||
    !Number.isFinite(maxAgeMs) ||
    maxAgeMs < intervalMs
  )
    throw Error("Invalid attestation audit cadence.");
  let last: AttestationAuditResult | undefined;
  let lastSuccess: { at: number; freshnessExpiresAt?: number } | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  let inFlight: Promise<AttestationAuditResult | undefined> | undefined;

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
      if (result.ok) {
        const expiry = result.freshnessExpiresAt
          ? Date.parse(result.freshnessExpiresAt)
          : NaN;
        lastSuccess = {
          at: now(),
          ...(Number.isFinite(expiry) ? { freshnessExpiresAt: expiry } : {}),
        };
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
      if (last && !last.ok)
        return {
          block: true,
          reason: `last attestation audit failed: ${last.reason ?? "unknown"}`,
        };
      if (!lastSuccess)
        return { block: true, reason: "no successful attestation audit yet" };
      const current = now();
      if (current - lastSuccess.at > maxAgeMs)
        return {
          block: true,
          reason: "last successful attestation audit exceeds the maximum age",
        };
      if (
        lastSuccess.freshnessExpiresAt !== undefined &&
        lastSuccess.freshnessExpiresAt <= current
      )
        return { block: true, reason: "supplier freshness witness expired" };
      return { block: false, reason: "attestation audit current" };
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
    },
    snapshot() {
      return {
        enabled: options.enabled,
        ...(last ? { last } : {}),
        ...(lastSuccess
          ? { lastSuccessAt: new Date(lastSuccess.at).toISOString() }
          : {}),
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
