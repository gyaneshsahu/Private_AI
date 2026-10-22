import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import express from "express";
import type { Server } from "node:http";
import {
  attestationAuditArguments,
  attestationAuditGuard,
  createAttestationAuditState,
  createDeploymentAttestationAudit,
  installAttestationAudit,
  runAttestationAudit,
  type AttestationAuditResult,
} from "../server/attestation-audit";
import { attestationAuditDefaults } from "../server/attestation-audit-state";
import { loadDeploymentConfig } from "../server/deployment-config";

// A Node script stands in for the pinned binary; the audit passes the node
// executable as the binary and the script as a leading argument.
const fakeCli = resolve("tests/fixtures/fake-tinfoil-cli.mjs");
const digest = "a".repeat(64);
const target = (mode: string, digests: string[] = [digest]) => ({
  origin: `https://${mode}.example/`,
  repository: "tinfoilsh/test-only",
  releaseDigests: digests,
});
const audit = (mode: string, extra: Partial<Parameters<typeof runAttestationAudit>[0]> = {}) =>
  runAttestationAudit({
    binary: process.execPath,
    leadingArguments: [fakeCli],
    target: target(mode),
    timeoutMs: 10_000,
    ...extra,
  });

describe("runAttestationAudit", () => {
  it("builds the documented subcommand and pins a single qualified digest", () => {
    expect(attestationAuditArguments(target("pass"))).toEqual([
      "attestation",
      "verify",
      "-e",
      "pass.example",
      "-r",
      `tinfoilsh/test-only@sha256:${digest}`,
      "-j",
    ]);
    expect(
      attestationAuditArguments(target("pass", [digest, "b".repeat(64)]))[5],
    ).toBe("tinfoilsh/test-only");
    expect(() =>
      attestationAuditArguments({
        ...target("pass"),
        origin: "https://pass.example:8443/",
      }),
    ).toThrow();
    expect(() =>
      attestationAuditArguments({ ...target("pass"), releaseDigests: ["xyz"] }),
    ).toThrow();
  });

  it("passes on exit 0 with an ok record that matches host, digest, key and freshness", async () => {
    const result = await audit("pass");
    expect(result.ok).toBe(true);
    expect(result.releaseDigest).toBe(digest);
    expect(result.keyFingerprint).toBe("SHA256:fake");
    expect(Date.parse(result.freshnessExpiresAt!)).toBeGreaterThan(Date.now());
    expect(result.reason).toBeUndefined();
    expect(Date.parse(result.checkedAt)).toBeGreaterThan(Date.now() - 60_000);
    // The fixture exits non-zero unless the digest was pinned on its command line.
    expect((await audit("pinned")).ok).toBe(true);
  });

  it("fails on a non-zero exit with or without a record; verdicts are never transient", async () => {
    const failed = await audit("fail");
    expect(failed.ok).toBe(false);
    expect(failed.reason).toBe("supplier verification failed");
    expect(failed.releaseDigest).toBe(digest);
    expect(failed.transient).toBeUndefined();
    const crashed = await audit("crash");
    expect(crashed.ok).toBe(false);
    expect(crashed.reason).toBe("supplier verification failed");
    expect(crashed.transient).toBeUndefined();
  });

  it("classifies a pre-verdict network error as transient", async () => {
    const result = await audit("netfail");
    expect(result).toEqual({
      ok: false,
      checkedAt: expect.any(String),
      reason: "transient audit error",
      transient: true,
    });
  });

  it("fails on timeout within the bound and marks it transient", async () => {
    const started = Date.now();
    const result = await audit("hang", { timeoutMs: 1500 });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("audit timed out");
    expect(result.transient).toBe(true);
    expect(Date.now() - started).toBeLessThan(8000);
  });

  it("fails on malformed, oversized or disagreeing output even with exit 0", async () => {
    expect((await audit("garbage")).reason).toBe("malformed audit output");
    expect((await audit("huge")).reason).toBe("malformed audit output");
    expect((await audit("expired")).reason).toBe("freshness witness expired");
    expect((await audit("otherdigest")).reason).toBe(
      "release digest not qualified",
    );
    expect((await audit("wronghost")).reason).toBe("audit host mismatch");
    expect((await audit("keymismatch")).reason).toBe("key fingerprint mismatch");
    for (const mode of ["garbage", "huge", "expired", "otherdigest", "wronghost", "keymismatch"])
      expect((await audit(mode)).ok).toBe(false);
  });

  it("never throws past its boundary for a missing binary or invalid options", async () => {
    const missing = await runAttestationAudit({
      binary: resolve("tests/fixtures/does-not-exist-tinfoil"),
      target: target("pass"),
      timeoutMs: 5000,
    });
    expect(missing).toMatchObject({ ok: false, reason: "audit binary unavailable" });
    expect(
      await runAttestationAudit({
        binary: "relative/tinfoil",
        target: target("pass"),
      }),
    ).toMatchObject({ ok: false, reason: "invalid audit configuration" });
    expect(
      await runAttestationAudit({
        binary: process.execPath,
        target: target("pass"),
        timeoutMs: 10,
      }),
    ).toMatchObject({ ok: false, reason: "invalid audit configuration" });
  });
});

function fakeState(
  enabled: boolean,
  results: AttestationAuditResult[],
  clock: { now: number },
  cadence: { intervalMs?: number; maxAgeMs?: number; retryDelaysMs?: number[] } = {},
) {
  const queue = [...results];
  return createAttestationAuditState({
    enabled,
    intervalMs: cadence.intervalMs ?? 1000,
    maxAgeMs: cadence.maxAgeMs ?? 4000,
    retryDelaysMs: cadence.retryDelaysMs ?? [],
    now: () => clock.now,
    run: async () => {
      const next = queue.shift();
      if (!next) throw Error("queue empty");
      return next;
    },
  });
}
const pass = (at: number, freshnessMs = 7 * 86_400_000): AttestationAuditResult => ({
  ok: true,
  checkedAt: new Date(at).toISOString(),
  releaseDigest: digest,
  freshnessExpiresAt: new Date(at + freshnessMs).toISOString(),
});
const fail = (at: number): AttestationAuditResult => ({
  ok: false,
  checkedAt: new Date(at).toISOString(),
  reason: "supplier verification failed",
});
const transient = (at: number): AttestationAuditResult => ({
  ok: false,
  checkedAt: new Date(at).toISOString(),
  reason: "transient audit error",
  transient: true,
});

describe("attestation audit state", () => {
  it("never blocks while disabled, even without any audit", async () => {
    const clock = { now: 1_000_000 };
    const state = fakeState(false, [], clock);
    expect(state.shouldBlock()).toEqual({
      block: false,
      reason: "attestation audit disabled",
    });
    expect(await state.refresh()).toBeUndefined();
    await state.start();
    expect(state.shouldBlock().block).toBe(false);
    state.stop();
  });

  it("blocks before the first success, after a failure, past the maximum age and after witness expiry", async () => {
    const clock = { now: 1_000_000 };
    const state = fakeState(
      true,
      [pass(clock.now, 3000), fail(clock.now), pass(clock.now)],
      clock,
    );
    expect(state.shouldBlock()).toMatchObject({ block: true });
    expect(state.shouldBlock().reason).toContain("no successful");
    await state.refresh();
    expect(state.shouldBlock()).toEqual({
      block: false,
      reason: "attestation audit current",
    });
    clock.now += 3000; // witness (3s) expired before the maximum age (4s)
    expect(state.shouldBlock().reason).toBe("supplier freshness witness expired");
    await state.refresh(); // failure
    expect(state.shouldBlock()).toMatchObject({ block: true });
    expect(state.shouldBlock().reason).toContain("supplier verification failed");
    await state.refresh(); // success again
    expect(state.shouldBlock().block).toBe(false);
    clock.now += 4001;
    expect(state.shouldBlock().reason).toBe(
      "last successful attestation audit exceeds the maximum age",
    );
    expect(state.snapshot()).toMatchObject({ enabled: true, last: { ok: true } });
  });

  it("treats a throwing runner as a failed audit and shares an in-flight run", async () => {
    const clock = { now: 5000 };
    const state = fakeState(true, [pass(clock.now)], clock);
    const [a, b] = await Promise.all([state.refresh(), state.refresh()]);
    expect(a).toBe(b);
    expect(state.shouldBlock().block).toBe(false);
    await state.refresh(); // queue empty -> runner throws
    expect(state.shouldBlock()).toEqual({
      block: true,
      reason: "last attestation audit failed: audit runner failed",
    });
  });

  it("keeps serving on a transient error while a retry is pending and the previous success is current", async () => {
    const clock = { now: 50_000 };
    const state = fakeState(
      true,
      [pass(clock.now), transient(clock.now), transient(clock.now), transient(clock.now)],
      clock,
      { intervalMs: 3000, retryDelaysMs: [2000, 2500] },
    );
    // Transient error with no prior success blocks.
    const cold = fakeState(true, [transient(clock.now)], clock, {
      intervalMs: 3000,
      retryDelaysMs: [2000],
    });
    await cold.refresh();
    expect(cold.shouldBlock()).toMatchObject({ block: true });
    expect(cold.shouldBlock().reason).toContain("no successful");
    cold.stop();

    await state.refresh(); // success
    await state.refresh(); // transient, retry 1 scheduled
    expect(state.snapshot().retryPending).toBe(true);
    expect(state.shouldBlock()).toEqual({
      block: false,
      reason: "transient attestation audit error, retry pending: transient audit error",
    });
    await state.refresh(); // transient again, retry 2 scheduled
    expect(state.shouldBlock().block).toBe(false);
    await state.refresh(); // transient, retries exhausted
    expect(state.snapshot().retryPending).toBe(false);
    expect(state.shouldBlock()).toEqual({
      block: true,
      reason: "attestation audit retries exhausted: transient audit error",
    });
    state.stop();
  });

  it("blocks a transient error once the previous success is stale or its witness expired", async () => {
    const clock = { now: 50_000 };
    const stale = fakeState(true, [pass(clock.now), transient(clock.now)], clock, {
      intervalMs: 3000,
      retryDelaysMs: [2000],
    });
    await stale.refresh();
    await stale.refresh();
    expect(stale.shouldBlock().block).toBe(false);
    clock.now += 4001; // beyond maxAge (4s)
    expect(stale.shouldBlock()).toEqual({
      block: true,
      reason:
        "transient attestation audit error and last successful attestation audit exceeds the maximum age",
    });
    stale.stop();
    const clock2 = { now: 50_000 };
    const expired = fakeState(true, [pass(clock2.now, 2000), transient(clock2.now)], clock2, {
      intervalMs: 3000,
      retryDelaysMs: [2000],
    });
    await expired.refresh();
    await expired.refresh();
    expect(expired.shouldBlock().block).toBe(false);
    clock2.now += 2000;
    expect(expired.shouldBlock().reason).toBe(
      "transient attestation audit error and supplier freshness witness expired",
    );
    expired.stop();
  });

  it("fails closed immediately on a verification failure even with a current success and retries left", async () => {
    const clock = { now: 50_000 };
    const state = fakeState(true, [pass(clock.now), fail(clock.now)], clock, {
      intervalMs: 3000,
      retryDelaysMs: [2000, 2500],
    });
    await state.refresh();
    await state.refresh();
    expect(state.snapshot().retryPending).toBe(true);
    expect(state.shouldBlock()).toEqual({
      block: true,
      reason: "last attestation audit failed: supplier verification failed",
    });
    state.stop();
  });

  it("retries with the configured backoff after a failure and resumes the cadence after a success", async () => {
    const clock = { now: 0 };
    const state = fakeState(
      true,
      [pass(0), transient(0), transient(0), ...Array.from({ length: 20 }, () => pass(0))],
      clock,
      { intervalMs: 5000, maxAgeMs: 60_000, retryDelaysMs: [30, 60] },
    );
    await state.start(); // success at once
    await state.refresh(); // transient -> retry in 30ms
    expect(state.shouldBlock().block).toBe(false);
    await new Promise((done) => setTimeout(done, 45)); // retry 1 ran: transient -> retry in 60ms
    expect(state.snapshot().last?.transient).toBe(true);
    expect(state.snapshot().retryPending).toBe(true);
    expect(state.shouldBlock().block).toBe(false);
    await new Promise((done) => setTimeout(done, 90)); // retry 2 ran: success
    expect(state.snapshot().last?.ok).toBe(true);
    expect(state.snapshot().retryPending).toBe(false);
    expect(state.shouldBlock()).toEqual({ block: false, reason: "attestation audit current" });
    state.stop();
    // Retries longer than the interval are rejected.
    expect(() =>
      fakeState(true, [], clock, { intervalMs: 100, maxAgeMs: 1000, retryDelaysMs: [200] }),
    ).toThrow();
  });

  it("refreshes on the timer and rejects an impossible cadence", async () => {
    const clock = { now: 0 };
    const state = fakeState(true, [fail(0), ...Array.from({ length: 20 }, () => pass(0))], clock, {
      intervalMs: 50,
      maxAgeMs: 10_000,
    });
    await state.start();
    expect(state.shouldBlock().block).toBe(true);
    await new Promise((done) => setTimeout(done, 200));
    state.stop();
    expect(state.shouldBlock().block).toBe(false);
    expect(() => fakeState(true, [], clock, { intervalMs: 100, maxAgeMs: 50 })).toThrow();
  });
});

describe("attestationAuditGuard", () => {
  const servers: Server[] = [];
  afterEach(async () => {
    installAttestationAudit(undefined);
    for (const server of servers.splice(0)) {
      server.closeAllConnections();
      await new Promise<void>((done) => server.close(() => done()));
    }
  });
  async function serve(guard: ReturnType<typeof attestationAuditGuard>) {
    const app = express();
    app.use("/api/inference", guard);
    app.post("/api/inference/v1/chat/completions", (_req, res) =>
      res.json({ forwarded: true }),
    );
    app.get("/api/status", (_req, res) => res.json({ status: true }));
    const server = await new Promise<Server>((done) => {
      const s = app.listen(0, "127.0.0.1", () => done(s));
    });
    servers.push(server);
    const address = server.address();
    return `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
  }

  it("returns a content-free 503 while blocking and passes through otherwise", async () => {
    const clock = { now: 10_000 };
    const state = fakeState(true, [pass(clock.now)], clock);
    const base = await serve(attestationAuditGuard(state));
    const blocked = await fetch(`${base}/api/inference/v1/chat/completions`, {
      method: "POST",
    });
    expect(blocked.status).toBe(503);
    const body = await blocked.json();
    expect(body).toEqual({
      error:
        "Protected inference is temporarily unavailable. No request was forwarded.",
    });
    expect(JSON.stringify(body)).not.toContain("attestation");
    expect(blocked.headers.get("cache-control")).toBe("no-store");
    // Other routes are untouched.
    expect((await fetch(`${base}/api/status`)).status).toBe(200);
    await state.refresh();
    const allowed = await fetch(`${base}/api/inference/v1/chat/completions`, {
      method: "POST",
    });
    expect(allowed.status).toBe(200);
    expect(await allowed.json()).toEqual({ forwarded: true });
  });

  it("uses the installed process-wide state and is disabled by default", async () => {
    const base = await serve(attestationAuditGuard());
    expect(
      (await fetch(`${base}/api/inference/v1/chat/completions`, { method: "POST" })).status,
    ).toBe(200);
    const clock = { now: 10_000 };
    installAttestationAudit(fakeState(true, [], clock));
    expect(
      (await fetch(`${base}/api/inference/v1/chat/completions`, { method: "POST" })).status,
    ).toBe(503);
    installAttestationAudit(undefined);
    expect(
      (await fetch(`${base}/api/inference/v1/chat/completions`, { method: "POST" })).status,
    ).toBe(200);
  });

  it("fails closed when the state itself throws", async () => {
    const base = await serve(
      attestationAuditGuard({
        shouldBlock: () => {
          throw Error("broken");
        },
      }),
    );
    expect(
      (await fetch(`${base}/api/inference/v1/chat/completions`, { method: "POST" })).status,
    ).toBe(503);
  });
});

describe("deployment configuration", () => {
  const roots: string[] = [];
  afterEach(async () => {
    for (const root of roots.splice(0))
      await rm(root, { recursive: true, force: true });
  });

  it("accepts an attestationAudit block with defaults and rejects invalid cadence or targets", async () => {
    const root = await mkdtemp(join(tmpdir(), "privateai-attestation-config-"));
    roots.push(root);
    const file = async (name: string, content: string) => {
      const path = join(root, name);
      await writeFile(path, content);
      return path;
    };
    const base = {
      mode: "restricted-deployment",
      email: "disabled",
      host: "127.0.0.1",
      port: 8443,
      assets: root,
      secretFile: await file("secret", "synthetic-auth-secret-".repeat(3)),
      databaseUrlFile: await file(
        "db",
        "postgresql://synthetic:synthetic@localhost/test",
      ),
      tlsKeyFile: await file("tls-key", "synthetic"),
      tlsCertFile: await file("cert", "synthetic"),
      clientCaFile: await file("ca", "synthetic"),
      peerCertificateSha256: ["a".repeat(64)],
    };
    const configFile = await file("config", JSON.stringify(base));
    expect((await loadDeploymentConfig(configFile)).attestationAudit).toBeUndefined();
    const attestationAudit = {
      enabled: true,
      origin: "https://test.tinfoil.sh/",
      repository: "tinfoilsh/test-only",
      releaseDigests: [digest],
    };
    await writeFile(configFile, JSON.stringify({ ...base, attestationAudit }));
    const loaded = (await loadDeploymentConfig(configFile)).attestationAudit;
    expect(loaded).toEqual({ ...attestationAuditDefaults, ...attestationAudit });
    expect(loaded?.intervalMinutes).toBe(360);
    expect(loaded?.binary).toBe("/usr/local/bin/tinfoil");
    expect(loaded?.retryDelaysMinutes).toEqual([1, 2, 4, 8]);
    await writeFile(
      configFile,
      JSON.stringify({ ...base, attestationAudit: { ...attestationAudit, retryDelaysMinutes: [] } }),
    );
    expect((await loadDeploymentConfig(configFile)).attestationAudit?.retryDelaysMinutes).toEqual([]);
    const state = createDeploymentAttestationAudit(loaded!);
    expect(state.shouldBlock().block).toBe(true);
    for (const bad of [
      { ...attestationAudit, intervalMinutes: 600, maxAgeMinutes: 300 },
      { ...attestationAudit, origin: "http://test.tinfoil.sh/" },
      { ...attestationAudit, repository: "someone/else" },
      { ...attestationAudit, releaseDigests: [] },
      { ...attestationAudit, binary: "tinfoil" },
      { ...attestationAudit, unknown: true },
      { ...attestationAudit, intervalMinutes: 15, retryDelaysMinutes: [1, 2, 4, 8, 16] },
      { ...attestationAudit, retryDelaysMinutes: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
      { ...attestationAudit, retryDelaysMinutes: [0] },
    ]) {
      await writeFile(configFile, JSON.stringify({ ...base, attestationAudit: bad }));
      await expect(loadDeploymentConfig(configFile)).rejects.toThrow(
        "Deployment configuration unavailable or invalid.",
      );
    }
  });
});

describe("Dockerfile.render verifier stage", () => {
  it("pins the supplier CLI release and a 64-hex checksum, copies only the read-only binary and disables update checks", () => {
    const render = readFileSync("Dockerfile.render", "utf8").replaceAll("\r\n", "\n");
    const version = render.match(/^ARG TINFOIL_CLI_VERSION=(\d+\.\d+\.\d+)$/m)?.[1];
    const checksum = render.match(/^ARG TINFOIL_CLI_SHA256=([a-f0-9]{64})$/m)?.[1];
    expect(version).toBe("0.19.10");
    expect(checksum).toBe(
      "331c9598792289909757335044751344e1933a1c67f4640d40831dfb00746704",
    );
    expect(render).toContain("AS tinfoil-verifier");
    expect(render).toContain(
      "ADD --checksum=sha256:${TINFOIL_CLI_SHA256} https://github.com/tinfoilsh/tinfoil-cli/releases/download/v${TINFOIL_CLI_VERSION}/tinfoil-cli_${TINFOIL_CLI_VERSION}_linux_amd64.tar.gz",
    );
    expect(render).toContain("| sha256sum -c -");
    expect(render).toContain(
      "COPY --from=tinfoil-verifier --chmod=0555 /out/tinfoil /usr/local/bin/tinfoil",
    );
    expect(render).toContain("ENV TINFOIL_NO_UPDATE_CHECK=1");
    // The verifier stage is a pinned-digest base, not a floating tag, and the
    // stage never runs an installer script or `tinfoil update`.
    expect(render).toMatch(/^FROM node:24-bookworm-slim@sha256:[a-f0-9]{64} AS tinfoil-verifier$/m);
    const instructions = render
      .split("\n")
      .filter((line) => !line.startsWith("#"))
      .join("\n");
    expect(instructions).not.toMatch(/install\.sh|tinfoil update|curl .*\| *sh/);
    // Only the binary and the exported CA store reach the runtime stages; the
    // CA store comes from Node's bundled roots, not from a build secret.
    expect(render.match(/--from=tinfoil-verifier/g)).toHaveLength(2);
    expect(render).toContain(
      "COPY --from=tinfoil-verifier /out/etc/ssl/certs/ /etc/ssl/certs/",
    );
    expect(render).toContain(
      "install -m 0444 -o root -g root /tmp/ca-certificates.crt /out/etc/ssl/certs/ca-certificates.crt",
    );
    expect(render).toContain("require('node:tls').rootCertificates");
    expect(instructions).not.toMatch(/proxy_ca.*ca-certificates|apt-get install.*ca-certificates/);
  });
});
