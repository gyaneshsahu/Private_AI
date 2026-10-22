import { describe, expect, it } from "vitest";
import {
  evaluateSmoke,
  extractRecord,
} from "../scripts/attestation-cli-smoke-evaluate.mjs";

const digest = "0".repeat(32) + "a".repeat(32);
const now = Date.parse("2026-10-22T18:00:00Z");
const record = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify(
    {
      timestamp: "2026-10-22T17:59:00Z",
      enclave: "inference.tinfoil.sh",
      repo: "tinfoilsh/confidential-model-router",
      digest,
      measurements: {},
      keys: { enclave: "fp", connection: "fp" },
      crypto_material: [],
      freshness_expires_at: "2026-10-22T18:30:00Z",
      status: "ok",
      ...overrides,
    },
    null,
    2,
  );

describe("in-image attestation CLI smoke evaluation", () => {
  it("accepts the CLI's indented multi-line record with a digest and future freshness", () => {
    const result = evaluateSmoke({
      stdout: `${record()}\n`,
      stderr: "",
      exitCode: 0,
      now,
    });
    expect(result.ok).toBe(true);
    expect(result.reasons).toEqual([]);
    expect(result.digest).toBe(digest);
    expect(result.freshnessExpiresAt).toBe("2026-10-22T18:30:00.000Z");
    expect(result.verdict).toBe("ok");
    expect(result.reachedEnclave).toBe(true);
  });

  it("finds the record after preceding log lines", () => {
    const stdout = `2026/10/22 17:59:00 Verified ... at ${digest}\n${record()}\n`;
    expect(extractRecord(stdout)?.digest).toBe(digest);
    expect(evaluateSmoke({ stdout, stderr: "", exitCode: 0, now }).ok).toBe(
      true,
    );
  });

  it("fails when the TLS handshake failed, as on an intercepting network", () => {
    const result = evaluateSmoke({
      stdout: "",
      stderr:
        'Error: verifying attestation: fetch error: Get "https://inference.tinfoil.sh/.well-known/tinfoil-attestation?nonce=abc": tls: failed to verify certificate: x509: certificate signed by unknown authority\n',
      exitCode: 1,
      now,
    });
    expect(result.ok).toBe(false);
    expect(result.handshakeFailed).toBe(true);
    expect(result.reachedEnclave).toBe(false);
    expect(result.reasons).toContain("handshake failed");
    expect(result.error).toContain("x509");
    expect(result.error).not.toContain("\n");
  });

  it("fails on a record without a digest, with stale or missing freshness, or a non-ok status", () => {
    const cases: [Record<string, unknown>, string][] = [
      [{ digest: undefined }, "digest missing or not 64 hex characters"],
      [{ digest: "abc" }, "digest missing or not 64 hex characters"],
      [
        { freshness_expires_at: undefined },
        "freshness_expires_at missing or not a date",
      ],
      [
        { freshness_expires_at: "2026-10-22T17:00:00Z" },
        "freshness_expires_at already passed",
      ],
      [
        {
          status: "fail",
          error: "remote public key does not match the endorsed TLS key",
        },
        "status fail",
      ],
    ];
    for (const [overrides, reason] of cases) {
      const result = evaluateSmoke({
        stdout: record(overrides),
        stderr: "",
        exitCode: 0,
        now,
      });
      expect(result.ok, reason).toBe(false);
      expect(result.reasons, reason).toContain(reason);
    }
  });

  it("fails on a non-zero exit even with a clean-looking record, and on no record at all", () => {
    expect(
      evaluateSmoke({ stdout: record(), stderr: "", exitCode: 2, now }).reasons,
    ).toContain("exit code 2");
    const empty = evaluateSmoke({
      stdout: "}\n",
      stderr: "",
      exitCode: 0,
      now,
    });
    expect(empty.ok).toBe(false);
    expect(empty.reasons).toContain("no JSON record on stdout");
  });
});
