// Usage records in PostgreSQL (migration 0022), durable suite only (PRIVATEAI_SYNTHETIC_PG).
// Same behaviour as the offline store in tests/usage-metering.test.ts, plus the 90-day purge.
import { expect, it } from "vitest";
import { REQUEST_RETENTION_MS, purgeExpiredRequests, requestPurgeFunctionSql } from "../server/request-retention";
import { PostgresUsageRecords } from "../server/usage-records-postgres";
import { usageDatabase } from "./fixtures/usage-postgres";

const enabled = !!process.env.PRIVATEAI_SYNTHETIC_PG;
const input = {
  requestId: "r1",
  accountId: "alice",
  feature: "chat-fast" as const,
  units: 1,
  weightVersion: 1,
  outcome: "complete" as const,
  model: "glm-5.3-flash",
  requestBytes: 8000,
  responseBytes: 60000,
  durationMs: 4000,
};

it.skipIf(!enabled)("records once per request, reads own account only, accepts one report, lists by time", async () => {
  const db = await usageDatabase();
  try {
    let now = 1000;
    const store = new PostgresUsageRecords(db.pool, () => now);
    await store.record(input);
    await store.record({ ...input, units: 9 });
    await store.record({ ...input, requestId: "b1", accountId: "bob", feature: "code-followup", units: 0, model: undefined });
    expect(await store.get("alice", "r1")).toEqual({ ...input, createdAt: 1000, report: "none" });
    expect(await store.get("bob", "r1")).toBeUndefined();
    now = 2000;
    expect(await store.report("alice", "r1", { requestId: "r1", promptTokens: 10, completionTokens: 5, reasoningTokens: 2 }, "flagged", "too_fast")).toBe(true);
    expect(await store.report("alice", "r1", { requestId: "r1", promptTokens: 1, completionTokens: 1 }, "accepted")).toBe(false);
    expect(await store.get("alice", "r1")).toMatchObject({ promptTokens: 10, reasoningTokens: 2, report: "flagged", reportNote: "too_fast" });
    expect((await store.since("bob", 0)).map((r) => [r.feature, r.units])).toEqual([["code-followup", 0]]);
    expect((await store.between(0, 1001)).map((r) => r.requestId)).toEqual(["b1", "r1"]);
    // The database refuses what the schema does not allow, even past the code's own checks.
    await expect(db.pool.query("INSERT INTO usage_records(request_id,account_id,created_at,feature,units,weight_version,outcome) VALUES('x','a',1,'chat-fast',21,1,'complete')")).rejects.toThrow();
    await expect(db.pool.query("UPDATE usage_records SET report_note='Free text with spaces' WHERE request_id='r1'")).rejects.toThrow();
  } finally {
    await db.dispose();
  }
});

it.skipIf(!enabled)("the 90-day purge deletes usage records past 90 days and keeps newer ones", async () => {
  const db = await usageDatabase();
  try {
    const schema = (await db.pool.query("SELECT current_schema() AS name")).rows[0].name as string;
    await db.pool.query(requestPurgeFunctionSql(`"${schema}"`));
    const now = Date.now();
    const old = new PostgresUsageRecords(db.pool, () => now - REQUEST_RETENTION_MS - 86_400_000);
    const recent = new PostgresUsageRecords(db.pool, () => now - REQUEST_RETENTION_MS + 86_400_000);
    await old.record({ ...input, requestId: "expired" });
    await recent.record({ ...input, requestId: "kept" });
    await purgeExpiredRequests(db.pool);
    expect((await db.pool.query("SELECT request_id FROM usage_records")).rows).toEqual([{ request_id: "kept" }]);
  } finally {
    await db.dispose();
  }
});
