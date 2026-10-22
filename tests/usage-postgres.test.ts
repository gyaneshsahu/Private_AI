import { expect, it } from "vitest";
import { PostgresUsageLedger } from "../server/usage-postgres";
import { usageDatabase } from "./fixtures/usage-postgres";

const enabled = !!process.env.PRIVATEAI_SYNTHETIC_PG;
it.skipIf(!enabled)(
  "serializes concurrent grants and reservations across independent PostgreSQL pools",
  async () => {
    const db = await usageDatabase();
    try {
      const a = new PostgresUsageLedger(db.pool, () => 5),
        b = new PostgresUsageLedger(db.connect(), () => 5);
      const grants = await Promise.allSettled(
        [a, b].map((ledger, i) =>
          ledger.createAllowance({
            accountId: "alice",
            periodId: `p${i}`,
            startsAt: 0,
            endsAt: 10,
            requestLimit: 7,
          }),
        ),
      );
      expect(
        grants.filter((result) => result.status === "fulfilled"),
      ).toHaveLength(1);
      const results = await Promise.all(
        Array.from({ length: 40 }, (_, i) =>
          (i % 2 ? a : b).reserve("alice", `request${i}`),
        ),
      );
      expect(results.filter(Boolean)).toHaveLength(7);
      expect(await b.summary("alice")).toMatchObject({
        state: "exhausted",
        used: 7,
        remaining: 0,
        pending: 7,
      });
      expect(await a.reserve("alice", "request0")).toBe(false);
      expect(await a.summary("bob")).toEqual({ state: "unavailable" });
      await b.createAllowance({
        accountId: "bob",
        periodId: "bob-period",
        startsAt: 0,
        endsAt: 10,
        requestLimit: 2,
      });
      const duplicate = await db.pool.query(
        "SELECT request_id FROM usage_requests LIMIT 1",
      );
      expect(await b.reserve("bob", duplicate.rows[0].request_id)).toBe(false);
      expect(await b.summary("bob")).toMatchObject({ used: 0 });
    } finally {
      await db.dispose();
    }
  },
);

it.skipIf(!enabled)(
  "keeps uncertain and unfinished requests after restart and settles idempotently",
  async () => {
    const db = await usageDatabase();
    try {
      let ledger = new PostgresUsageLedger(db.pool, () => 5);
      await ledger.createAllowance({
        accountId: "alice",
        periodId: "p1",
        startsAt: 0,
        endsAt: 10,
        requestLimit: 3,
      });
      for (const id of ["a", "b", "c"])
        expect(await ledger.reserve("alice", id)).toBe(true);
      await ledger.dispatch("alice", "a");
      await ledger.finish("alice", "a", "uncertain");
      await ledger.dispatch("alice", "c");
      await db.close(db.pool);
      ledger = new PostgresUsageLedger(db.connect(), () => 6);
      expect(await ledger.summary("alice")).toMatchObject({
        state: "exhausted",
        used: 3,
        pending: 2,
        uncertain: 1,
      });
      await ledger.finish("alice", "a", "uncertain");
      await expect(
        ledger.finish("alice", "a", "transport_complete"),
      ).rejects.toThrow();
      await expect(ledger.dispatch("bob", "b")).rejects.toThrow();
      await expect(
        ledger.finish("bob", "c", "transport_complete"),
      ).rejects.toThrow();
      const metrics = {
        promptTokens: 12,
        completionTokens: 34,
        model: "m",
        costUsd: "0.000046",
        webSearchCalls: 1,
      };
      await Promise.all([
        ledger.finish("alice", "c", "transport_complete", metrics),
        ledger.finish("alice", "c", "transport_complete", {
          ...metrics,
          promptTokens: 99,
        }),
      ]);
      expect(await ledger.metrics("c")).toEqual(metrics);
      expect(await ledger.metrics("a")).toBeUndefined();
      expect(await ledger.summary("alice")).toMatchObject({
        used: 3,
        pending: 1,
        uncertain: 1,
      });
    } finally {
      await db.dispose();
    }
  },
);

it.skipIf(!enabled)(
  "rotates only to explicit periods and rolls back a failed reservation",
  async () => {
    const db = await usageDatabase();
    let now = 5;
    try {
      const ledger = new PostgresUsageLedger(db.pool, () => now);
      await ledger.createAllowance({
        accountId: "alice",
        periodId: "first",
        startsAt: 0,
        endsAt: 10,
        requestLimit: 1,
      });
      await db.pool
        .query(`CREATE FUNCTION fail_usage() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic insert failure'; END $$;
      CREATE TRIGGER fail_usage BEFORE INSERT ON usage_requests FOR EACH ROW EXECUTE FUNCTION fail_usage();`);
      await expect(ledger.reserve("alice", "failed")).rejects.toThrow(
        "synthetic insert failure",
      );
      expect(await ledger.summary("alice")).toMatchObject({
        used: 0,
        remaining: 1,
      });
      await db.pool.query(
        "DROP TRIGGER fail_usage ON usage_requests; DROP FUNCTION fail_usage()",
      );
      expect(await ledger.reserve("alice", "first")).toBe(true);
      now = 10;
      expect(await ledger.summary("alice")).toEqual({ state: "unavailable" });
      expect(await ledger.reserve("alice", "next")).toBe(false);
      await ledger.createAllowance({
        accountId: "alice",
        periodId: "second",
        startsAt: 10,
        endsAt: 20,
        requestLimit: 1,
      });
      expect(await ledger.reserve("alice", "first")).toBe(false);
      expect(await ledger.reserve("alice", "next")).toBe(true);
      expect(await ledger.summary("alice")).toMatchObject({
        used: 1,
        remaining: 0,
      });
    } finally {
      await db.dispose();
    }
  },
);

it.skipIf(!enabled)(
  "uses database time and retains relational account binding",
  async () => {
    const db = await usageDatabase();
    try {
      const ledger = new PostgresUsageLedger(db.pool);
      const { rows } = await db.pool.query(
        "SELECT floor(extract(epoch FROM clock_timestamp())*1000)::bigint now",
      );
      const now = Number(rows[0].now);
      await ledger.createAllowance({
        accountId: "alice",
        periodId: "real-clock",
        startsAt: now - 1000,
        endsAt: now + 60000,
        requestLimit: 1,
      });
      expect(await ledger.reserve("alice", "clock")).toBe(true);
      await expect(
        db.pool.query(
          "INSERT INTO usage_requests VALUES('bad','bob','real-clock','reserved',0,0)",
        ),
      ).rejects.toThrow();
      await expect(
        ledger.createAllowance({
          accountId: "bob",
          periodId: "invalid",
          startsAt: 0,
          endsAt: 0,
          requestLimit: 1,
        }),
      ).rejects.toThrow();
    } finally {
      await db.dispose();
    }
  },
);

it.skipIf(!enabled)(
  "summarises metered totals, exact published cost and unmetered settlements for the current period",
  async () => {
    const db = await usageDatabase();
    try {
      const ledger = new PostgresUsageLedger(db.pool, () => 10);
      await ledger.createAllowance({
        accountId: "alice",
        periodId: "current",
        startsAt: 0,
        endsAt: 100,
        requestLimit: 6,
      });
      const before = await ledger.summary("alice");
      expect(before).toMatchObject({
        meteredRequests: 0,
        promptTokens: 0,
        completionTokens: 0,
        unmeteredRequests: 0,
      });
      expect(before).not.toHaveProperty("costUsd");
      const settle = async (
        id: string,
        outcome: "transport_complete" | "uncertain",
        metrics?: Parameters<typeof ledger.finish>[3],
      ) => {
        expect(await ledger.reserve("alice", id)).toBe(true);
        await ledger.dispatch("alice", id);
        await ledger.finish("alice", id, outcome, metrics);
      };
      await settle("a", "transport_complete", {
        promptTokens: 100,
        completionTokens: 20,
        model: "m",
        costUsd: "0.000046",
      });
      await settle("b", "transport_complete", {
        promptTokens: 1000,
        completionTokens: 500,
        model: "m",
        costUsd: "0.1",
      });
      await settle("c", "transport_complete", {
        promptTokens: 7,
        completionTokens: 3,
        model: "m",
      });
      await settle("d", "transport_complete");
      await settle("e", "uncertain");
      expect(await ledger.reserve("alice", "f")).toBe(true);
      await ledger.dispatch("alice", "f");
      expect(await ledger.summary("alice")).toEqual({
        state: "exhausted",
        limit: 6,
        used: 6,
        remaining: 0,
        pending: 1,
        uncertain: 1,
        resetsAt: new Date(100).toISOString(),
        meteredRequests: 3,
        promptTokens: 1107,
        completionTokens: 523,
        costUsd: "0.100046",
        unmeteredRequests: 2,
      });
      expect(await ledger.hasAllowance("current")).toBe(true);
      expect(await ledger.hasAllowance("missing")).toBe(false);
    } finally {
      await db.dispose();
    }
  },
);

it.skipIf(!enabled)(
  "keeps a zero published cost as a cost rather than dropping it",
  async () => {
    const db = await usageDatabase();
    try {
      const ledger = new PostgresUsageLedger(db.pool, () => 10);
      await ledger.createAllowance({
        accountId: "alice",
        periodId: "zero",
        startsAt: 0,
        endsAt: 100,
        requestLimit: 1,
      });
      expect(await ledger.reserve("alice", "z")).toBe(true);
      await ledger.dispatch("alice", "z");
      await ledger.finish("alice", "z", "transport_complete", {
        promptTokens: 1,
        completionTokens: 1,
        model: "m",
        costUsd: "0",
      });
      expect(await ledger.metrics("z")).toMatchObject({ costUsd: "0" });
      expect(await ledger.summary("alice")).toMatchObject({ costUsd: "0" });
    } finally {
      await db.dispose();
    }
  },
);
