import { expect, it } from "vitest";
import {
  appendEntry,
  assertReadOnly,
  collectChecks,
  STEPS,
} from "../scripts/recovery-rehearsal";

it("refuses anything but a single SELECT", () => {
  expect(assertReadOnly("SELECT 1")).toBe("SELECT 1");
  for (const sql of [
    "UPDATE account_recovery_control SET mode='normal'",
    "DELETE FROM \"session\"",
    "DROP TABLE usage_requests",
    "SELECT 1; DROP TABLE usage_requests",
  ])
    expect(() => assertReadOnly(sql)).toThrow("Refused");
});

it("collects only read checks and builds a secret-free timed receipt", async () => {
  const sent: string[] = [];
  // One row answers every probe: no migration history, recovery closed, empty tables.
  const empty = {
    query: async (sql: string) => (
      sent.push(sql), { rows: [{ present: false, mode: "quarantined", n: 0 }] }
    ),
  };
  const checks = await collectChecks(empty);
  expect(sent.every((sql) => /^SELECT\b/.test(sql))).toBe(true);
  expect(checks.migrations.applied).toEqual([]);
  expect(checks.migrations.pending.length).toBeGreaterThan(0);
  expect(checks).toMatchObject({ recoveryOpen: false, readyz: null, healthz: null });
  expect(checks.counts.user).toBe(0);
  const t0 = new Date("2026-10-24T10:00:00Z");
  const first = appendEntry(undefined, "baseline", checks, t0);
  const second = appendEntry(first, "paused", checks, new Date(t0.getTime() + 90_000));
  expect(second.entries.map((e) => [e.step, e.sinceFirstMs])).toEqual([
    ["baseline", 0],
    ["paused", 90_000],
  ]);
  expect(JSON.stringify(second)).not.toMatch(/postgres|password|@/);
  expect(STEPS.map(([name]) => name)).toContain("restored");
});

it("records a service that is down as status 0 instead of failing the entry", async () => {
  const empty = { query: async () => ({ rows: [{ present: false, mode: "normal", n: 0 }] }) };
  // Port 9 on loopback: nothing listens there (T4/O3 rehearsal, 12 November).
  const checks = await collectChecks(empty, "http://127.0.0.1:9");
  expect(checks.readyz?.status).toBe(0);
  expect(checks.healthz?.status).toBe(0);
});
