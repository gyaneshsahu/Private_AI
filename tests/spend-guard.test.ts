import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { checks, validateQualification } from "../shared/contracts";
import { spendAllows, worstCaseUSD } from "../server/spend-guard";
import { SqliteUsageLedger } from "../server/usage-ledger";

const folders: string[] = [];
const open: SqliteUsageLedger[] = [];
afterEach(() => {
  for (const l of open.splice(0)) l.close();
  for (const f of folders.splice(0)) rmSync(f, { recursive: true, force: true });
});
const now = Date.now();
const report = (approvedSpendUSD: number) =>
  validateQualification({
    provider: "tinfoil",
    model: "TEST_ONLY",
    origin: "https://test.tinfoil.sh/",
    repository: "tinfoilsh/test-only",
    releaseDigests: ["a".repeat(64)],
    reviewedAt: new Date(now - 60_000).toISOString(),
    validUntil: new Date(now + 60_000).toISOString(),
    review: Object.fromEntries(
      checks.map((k) => [k, { status: "pass", evidence: ["TEST ONLY not provider evidence"] }]),
    ),
    // Worst case per request: (1000 * 1 + 1000 * 2) / 1e6 = USD 0.003.
    maxInputCharacters: 1000,
    maxOutputTokens: 1000,
    pricing: { inputPerMillion: 1, outputPerMillion: 2, currency: "USD" },
    approvedSpendUSD,
  });
function ledger() {
  const folder = mkdtempSync(join(tmpdir(), "spend-guard-"));
  folders.push(folder);
  const l = new SqliteUsageLedger(join(folder, "usage.sqlite"), () => now);
  open.push(l);
  l.createAllowance({ accountId: "acct", periodId: "p1", startsAt: now - 60_000, endsAt: now + 60_000, requestLimit: 100 });
  return l;
}
const metered = (cost: string) => ({ promptTokens: 1, completionTokens: 1, model: "TEST_ONLY", costUsd: cost });

it("counts metered cost, unmetered requests at their worst case and requests running here", async () => {
  expect(worstCaseUSD(report(1))).toBeCloseTo(0.003);
  const l = ledger();
  expect(l.spend(now - 60_000, now + 60_000)).toEqual({ meteredUSD: "0", unmetered: 0 });
  for (const [id, outcome, cost] of [
    ["r1", "transport_complete", "0.002"],
    ["r2", "transport_complete", "0.001"],
    ["r3", "uncertain", undefined],
  ] as const) {
    l.reserve("acct", id);
    l.dispatch("acct", id);
    l.finish("acct", id, outcome, cost ? metered(cost) : undefined);
  }
  expect(l.spend(now - 60_000, now + 60_000)).toEqual({ meteredUSD: "0.003", unmetered: 1 });
  // Committed: 0.003 metered + 1 unmetered x 0.003 = 0.006; the next request needs 0.003 more.
  expect(await spendAllows(l, report(0.009), 0)).toBe(true);
  expect(await spendAllows(l, report(0.0089), 0)).toBe(false);
  // One request already running in this process counts at its worst case too.
  expect(await spendAllows(l, report(0.009), 1)).toBe(false);
  expect(await spendAllows(l, report(0.012), 1)).toBe(true);
});

it("ignores requests outside the report's review window", async () => {
  const l = ledger();
  l.reserve("acct", "old");
  expect(l.spend(now + 1, now + 60_000)).toEqual({ meteredUSD: "0", unmetered: 0 });
});
