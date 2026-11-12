// Allowance cost per answer mode, on both ledgers, without a schema migration: a request costing
// N units is one request row plus N-1 settled unit rows that spend and metering skip.
import { expect, it } from "vitest";
import { checks, validateQualification } from "../shared/contracts";
import { spendAllows, worstCaseUSD } from "../server/spend-guard";
import { SqliteUsageLedger } from "../server/usage-ledger";
import { PostgresUsageLedger } from "../server/usage-postgres";
import { usageDatabase } from "./fixtures/usage-postgres";

const metered = { promptTokens: 1, completionTokens: 1, model: "SYNTHETIC", costUsd: "0.25" };

for (const backend of ["sqlite", "postgres"] as const)
  it.skipIf(backend === "postgres" && !process.env.PRIVATEAI_SYNTHETIC_PG)(
    `${backend}: reserves a mode's allowance cost all or none, and spend counts each request once`,
    async () => {
      const database = backend === "postgres" ? await usageDatabase() : undefined;
      const ledger = database
        ? new PostgresUsageLedger(database.pool, () => 5)
        : new SqliteUsageLedger(":memory:", () => 5);
      try {
        await ledger.createAllowance({ accountId: "alice", periodId: "p1", startsAt: 0, endsAt: 10, requestLimit: 5 });
        expect(await ledger.reserve("alice", "thinking1", 3)).toBe(true);
        expect(await ledger.summary("alice")).toMatchObject({ used: 3, remaining: 2, pending: 1, unmeteredRequests: 0 });
        // 3 more would pass the limit of 5: refused whole, nothing partly reserved.
        expect(await ledger.reserve("alice", "thinking2", 3)).toBe(false);
        expect(await ledger.summary("alice")).toMatchObject({ used: 3 });
        // A replayed ID never reserves again, whatever its cost.
        expect(await ledger.reserve("alice", "thinking1", 1)).toBe(false);
        expect(await ledger.reserve("alice", "fast1")).toBe(true);
        expect(await ledger.reserve("alice", "fast2", 1)).toBe(true);
        expect(await ledger.reserve("alice", "fast3")).toBe(false);
        for (const units of [0, 11, 1.5])
          await expect(async () => ledger.reserve("alice", "bad", units)).rejects.toThrow();
        await ledger.dispatch("alice", "thinking1");
        await ledger.finish("alice", "thinking1", "transport_complete");
        await ledger.dispatch("alice", "fast1");
        await ledger.finish("alice", "fast1", "transport_complete", metered);
        expect(await ledger.summary("alice")).toMatchObject({
          state: "exhausted",
          used: 5,
          remaining: 0,
          pending: 1,
          meteredRequests: 1,
          unmeteredRequests: 1,
          costUsd: "0.25",
        });
        // Three requests: one metered, two without metering (thinking1 settled, fast2 still reserved).
        expect(await ledger.spend(0, 10)).toEqual({ meteredUSD: "0.25", unmetered: 2 });
      } finally {
        if (ledger instanceof SqliteUsageLedger) ledger.close();
        await database?.dispose();
      }
    },
  );

it.skipIf(!process.env.PRIVATEAI_SYNTHETIC_PG)(
  "postgres: concurrent weighted reservations never pass the limit",
  async () => {
    const database = await usageDatabase();
    try {
      const a = new PostgresUsageLedger(database.pool, () => 5),
        b = new PostgresUsageLedger(database.connect(), () => 5);
      await a.createAllowance({ accountId: "alice", periodId: "p1", startsAt: 0, endsAt: 10, requestLimit: 10 });
      const results = await Promise.all(
        Array.from({ length: 12 }, (_, i) => (i % 2 ? a : b).reserve("alice", `r${i}`, 3)),
      );
      expect(results.filter(Boolean)).toHaveLength(3);
      expect(await a.summary("alice")).toMatchObject({ used: 9, pending: 3 });
    } finally {
      await database.dispose();
    }
  },
);

it("the spend check uses the new request's tier limit and the largest limit for unmetered ones", async () => {
  const now = Date.now();
  const q = validateQualification({
    provider: "tinfoil",
    model: "TEST_A",
    origin: "https://test.tinfoil.sh/",
    repository: "tinfoilsh/test-only",
    releaseDigests: ["a".repeat(64)],
    reviewedAt: new Date(now - 1000).toISOString(),
    validUntil: new Date(now + 60000).toISOString(),
    review: Object.fromEntries(
      checks.map((k) => [k, { status: "pass", evidence: ["TEST ONLY not provider evidence"] }]),
    ),
    maxInputCharacters: 1000,
    maxOutputTokens: 500,
    pricing: { inputPerMillion: 1, outputPerMillion: 1, currency: "USD" },
    approvedSpendUSD: 0.01,
    modes: {
      fast: { model: "TEST_A", maxOutputTokens: 1000, allowanceCost: 1 },
      thinking: { model: "TEST_A", maxOutputTokens: 4000, allowanceCost: 3 },
    },
  });
  // Worst cases: fast 0.002, thinking 0.005, the largest (thinking) for anything unmetered.
  expect(worstCaseUSD(q, 1000)).toBeCloseTo(0.002);
  expect(worstCaseUSD(q)).toBeCloseTo(0.005);
  const ledger = { spend: async () => ({ meteredUSD: "0.001", unmetered: 1 }) };
  // Committed 0.001 + 1 x 0.005 = 0.006: fast fits (0.008), thinking does not (0.011).
  expect(await spendAllows(ledger, q, 0, 1000)).toBe(true);
  expect(await spendAllows(ledger, q, 0, 4000)).toBe(false);
  // One more running here at the largest limit: 0.011 + fast 0.002 > 0.01.
  expect(await spendAllows(ledger, q, 1, 1000)).toBe(false);
});
