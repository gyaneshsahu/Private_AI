import { spawn } from "node:child_process";
import { isAbsolute } from "node:path";
import type { RequestHandler } from "express";
import {
  activeAttestationAudit,
  createAttestationAuditState,
  type AttestationAuditState,
} from "./attestation-audit-state";

export {
  activeAttestationAudit,
  createAttestationAuditState,
  installAttestationAudit,
  type AttestationAuditState,
} from "./attestation-audit-state";

/**
 * Relay-side, block-only attestation audit (mitigation A, narrowed).
 *
 * The relay spawns the supplier's pinned CLI (`tinfoil attestation verify`)
 * against the qualified enclave on a timer and keeps only the parsed result in
 * memory. The relay can REFUSE to forward when the supplier's evidence is
 * stale, revoked or disagrees with the qualified release pin. It never
 * supplies, replaces or validates the key the browser uses: the browser's own
 * `tinfoil` verifier remains the only source of the encryption key.
 */

export interface AttestationAuditTarget {
  /** Qualified enclave origin, `https://host/` as in the qualification report. */
  origin: string;
  /** Qualified workload repository, `tinfoilsh/<name>`. */
  repository: string;
  /** Release digests the qualification accepts; the audit must land on one. */
  releaseDigests: readonly string[];
}

export interface AttestationAuditResult {
  ok: boolean;
  /** ISO timestamp taken when the audit finished. */
  checkedAt: string;
  /** Verified deployment artifact digest (64 lowercase hex), when the CLI reported one. */
  releaseDigest?: string;
  /** Endorsed TLS key fingerprint the CLI reported (`keys.enclave`); informational only. */
  keyFingerprint?: string;
  /** Supplier freshness witness expiry (`freshness_expires_at`) as ISO time. */
  freshnessExpiresAt?: string;
  /** Fixed, content-free reason for a failed audit. */
  reason?: string;
}

export interface AttestationAuditOptions {
  /** Absolute path of the pinned supplier CLI, `/usr/local/bin/tinfoil` in the image. */
  binary: string;
  target: AttestationAuditTarget;
  /** Hard bound on the CLI run; default two minutes. */
  timeoutMs?: number;
  /**
   * Test seam only: arguments placed before the subcommand so a Node script
   * can stand in for the binary. Deployment configuration never sets this.
   */
  leadingArguments?: readonly string[];
  now?: () => number;
}

const digestPattern = /^[a-f0-9]{64}$/;
const maximumOutputBytes = 64 * 1024;
const defaultTimeoutMs = 120_000;

function enclaveHost(origin: string) {
  const url = new URL(origin);
  if (
    url.protocol !== "https:" ||
    url.port !== "" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw Error("Invalid enclave origin.");
  return url.hostname;
}

/** Arguments for the documented subcommand; exported for the tests. */
export function attestationAuditArguments(target: AttestationAuditTarget) {
  const digests = [...new Set(target.releaseDigests)];
  if (
    digests.length < 1 ||
    digests.some((digest) => !digestPattern.test(digest)) ||
    !/^tinfoilsh\/[a-zA-Z0-9_-]+$/.test(target.repository)
  )
    throw Error("Invalid audit target.");
  // A single qualified digest is pinned on the CLI side as well; several
  // qualified digests are checked by containment below.
  const reference =
    digests.length === 1
      ? `${target.repository}@sha256:${digests[0]}`
      : target.repository;
  return [
    "attestation",
    "verify",
    "-e",
    enclaveHost(target.origin),
    "-r",
    reference,
    "-j",
  ];
}

function childEnvironment() {
  // Minimal environment: no API key, no secrets. Proxy and CA variables are
  // mirrored so the Go binary follows the same managed egress as the relay
  // (server/network.ts). The update check is disabled explicitly even though
  // it would already be skipped without a terminal on stderr.
  const env: Record<string, string> = { TINFOIL_NO_UPDATE_CHECK: "1" };
  for (const name of [
    "PATH",
    "HOME",
    "HTTPS_PROXY",
    "https_proxy",
    "HTTP_PROXY",
    "http_proxy",
    "NO_PROXY",
    "no_proxy",
    "SSL_CERT_FILE",
    "SSL_CERT_DIR",
    // Windows needs these for the test double; harmless elsewhere.
    "SystemRoot",
    "TEMP",
  ]) {
    const value = process.env[name];
    if (value !== undefined) env[name] = value;
  }
  return env;
}

function parseRecord(
  stdout: string,
  expected: { host: string; digests: Set<string> },
  now: number,
): AttestationAuditResult {
  const checkedAt = new Date(now).toISOString();
  let record: unknown;
  try {
    record = JSON.parse(stdout);
  } catch {
    return { ok: false, checkedAt, reason: "malformed audit output" };
  }
  if (!record || typeof record !== "object" || Array.isArray(record))
    return { ok: false, checkedAt, reason: "malformed audit output" };
  const r = record as Record<string, unknown>;
  const keys =
    r.keys && typeof r.keys === "object" && !Array.isArray(r.keys)
      ? (r.keys as Record<string, unknown>)
      : {};
  const digest = typeof r.digest === "string" ? r.digest : undefined;
  const fingerprint =
    typeof keys.enclave === "string" && keys.enclave.length > 0
      ? keys.enclave
      : undefined;
  const expiry =
    typeof r.freshness_expires_at === "string"
      ? Date.parse(r.freshness_expires_at)
      : NaN;
  const partial = {
    checkedAt,
    ...(digest && digestPattern.test(digest) ? { releaseDigest: digest } : {}),
    ...(fingerprint ? { keyFingerprint: fingerprint } : {}),
    ...(Number.isFinite(expiry)
      ? { freshnessExpiresAt: new Date(expiry).toISOString() }
      : {}),
  };
  if (r.status !== "ok")
    return { ok: false, ...partial, reason: "supplier verification failed" };
  if (r.enclave !== expected.host)
    return { ok: false, ...partial, reason: "audit host mismatch" };
  if (!digest || !digestPattern.test(digest) || !expected.digests.has(digest))
    return { ok: false, ...partial, reason: "release digest not qualified" };
  if (!Number.isFinite(expiry))
    return { ok: false, ...partial, reason: "freshness expiry missing" };
  if (expiry <= now)
    return { ok: false, ...partial, reason: "freshness witness expired" };
  if (!fingerprint || keys.connection !== fingerprint)
    return { ok: false, ...partial, reason: "key fingerprint mismatch" };
  return { ok: true, ...partial };
}

/**
 * Runs one audit. Never throws: every failure (bad options, spawn error,
 * timeout, non-zero exit, malformed or disagreeing output) is a result with
 * `ok: false` and a fixed reason. Only stdout is parsed; stderr is discarded.
 */
export async function runAttestationAudit(
  options: AttestationAuditOptions,
): Promise<AttestationAuditResult> {
  const now = options.now ?? Date.now;
  const timeoutMs = options.timeoutMs ?? defaultTimeoutMs;
  let args: string[];
  let host: string;
  try {
    if (!isAbsolute(options.binary)) throw Error("Absolute binary required.");
    if (
      !Number.isInteger(timeoutMs) ||
      timeoutMs < 1000 ||
      timeoutMs > 600_000
    )
      throw Error("Invalid timeout.");
    args = [
      ...(options.leadingArguments ?? []),
      ...attestationAuditArguments(options.target),
    ];
    host = enclaveHost(options.target.origin);
  } catch {
    return {
      ok: false,
      checkedAt: new Date(now()).toISOString(),
      reason: "invalid audit configuration",
    };
  }
  const digests = new Set(options.target.releaseDigests);
  return new Promise<AttestationAuditResult>((resolve) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (result: AttestationAuditResult) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(result);
    };
    const fail = (reason: string) =>
      finish({ ok: false, checkedAt: new Date(now()).toISOString(), reason });
    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(options.binary, args, {
        shell: false,
        windowsHide: true,
        stdio: ["ignore", "pipe", "ignore"],
        env: childEnvironment(),
      });
    } catch {
      fail("audit binary unavailable");
      return;
    }
    const chunks: Buffer[] = [];
    let size = 0;
    let overflow = false;
    let timedOut = false;
    timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
      // Resolve even if the process ignores the signal or `close` is delayed.
      setTimeout(() => fail("audit timed out"), 1000).unref();
    }, timeoutMs);
    child.on("error", () => fail("audit binary unavailable"));
    child.stdout?.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > maximumOutputBytes) {
        overflow = true;
        child.kill("SIGKILL");
      } else chunks.push(chunk);
    });
    child.on("close", (code) => {
      if (timedOut) {
        fail("audit timed out");
        return;
      }
      if (overflow) {
        fail("malformed audit output");
        return;
      }
      const stdout = Buffer.concat(chunks).toString("utf8");
      const parsed = parseRecord(stdout, { host, digests }, now());
      if (code !== 0) {
        finish({
          ...parsed,
          ok: false,
          reason:
            parsed.reason === "malformed audit output"
              ? "supplier verification failed"
              : (parsed.reason ?? "supplier verification failed"),
        });
        return;
      }
      finish(parsed);
    });
  });
}

/** Deployment-config shape consumed by the process entrypoint. */
export interface DeploymentAttestationAudit extends AttestationAuditTarget {
  enabled: boolean;
  binary: string;
  intervalMinutes: number;
  maxAgeMinutes: number;
  timeoutSeconds: number;
}

/** Builds the timer-refreshed state for a deployment; the caller starts and stops it. */
export function createDeploymentAttestationAudit(
  config: DeploymentAttestationAudit,
): AttestationAuditState {
  const { origin, repository, releaseDigests } = config;
  return createAttestationAuditState({
    enabled: config.enabled,
    intervalMs: config.intervalMinutes * 60_000,
    maxAgeMs: config.maxAgeMinutes * 60_000,
    run: () =>
      runAttestationAudit({
        binary: config.binary,
        target: { origin, repository, releaseDigests },
        timeoutMs: config.timeoutSeconds * 1000,
      }),
  });
}

/**
 * Express guard for the relay route. Returns 503 with a content-free message
 * while `shouldBlock()` is true; otherwise passes through untouched. Mount it
 * BEFORE the relay route, e.g. `app.use("/api/inference", attestationAuditGuard());`.
 * Without an explicit state it consults the process-wide state installed by
 * the deployment entrypoint, which is disabled (never blocks) by default.
 */
export function attestationAuditGuard(
  state?: Pick<AttestationAuditState, "shouldBlock">,
): RequestHandler {
  return (_req, res, next) => {
    let block = false;
    try {
      block = (state ?? activeAttestationAudit()).shouldBlock().block;
    } catch {
      block = true;
    }
    if (!block) {
      next();
      return;
    }
    res.setHeader("Cache-Control", "no-store");
    res.status(503).json({
      error:
        "Protected inference is temporarily unavailable. No request was forwarded.",
    });
  };
}
