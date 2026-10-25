import { afterAll, beforeAll, expect, it } from "vitest";
import {
  REQUEST_RETENTION_MS,
  purgeExpiredRequests,
  requestPurgeFunctionSql,
} from "../server/request-retention";
import { PostgresUsageLedger } from "../server/usage-postgres";
import { usageDatabase } from "./fixtures/usage-postgres";

const enabled = !!process.env.PRIVATEAI_SYNTHETIC_PG;
let db: Awaited<ReturnType<typeof usageDatabase>>;
beforeAll(async () => {
  if (!enabled) return;
  db = await usageDatabase();
  const schema = (await db.pool.query("SELECT current_schema() AS name")).rows[0]
    .name as string;
  await db.pool.query(requestPurgeFunctionSql(`"${schema}"`));
});
afterAll(async () => {
  await db?.dispose();
});

it.skipIf(!enabled)(
  "deletes request records and metrics past 90 days only once their allowance period has ended",
  async () => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const old = now - REQUEST_RETENTION_MS - day;
    const ledger = new PostgresUsageLedger(db.pool);
    // A period that closed 90 days ago and one that opened 120 days ago and is still open.
    await ledger.createAllowance({
      accountId: "acct-a",
      periodId: "closed",
      startsAt: old - day,
      endsAt: now - 2 * day,
      requestLimit: 10,
    });
    await ledger.createAllowance({
      accountId: "acct-b",
      periodId: "open",
      startsAt: now - 120 * day,
      endsAt: now + day,
      requestLimit: 10,
    });
    const insert = (id: string, account: string, period: string, at: number) =>
      db.pool.query(
        "INSERT INTO usage_requests VALUES($1,$2,$3,'transport_complete',$4,$4)",
        [id, account, period, at],
      );
    await insert("expired", "acct-a", "closed", old);
    await insert("recent", "acct-a", "closed", now - REQUEST_RETENTION_MS + day);
    await insert("held", "acct-b", "open", old);
    for (const id of ["expired", "recent"])
      await db.pool.query(
        "INSERT INTO usage_metrics VALUES($1,10,20,'model',0.001,0,$2)",
        [id, old],
      );

    expect(await purgeExpiredRequests(db.pool)).toEqual({
      requests: 1,
      metrics: 1,
      held: 1,
    });
    const left = await db.pool.query(
      "SELECT request_id FROM usage_requests ORDER BY request_id",
    );
    expect(left.rows.map((row) => row.request_id)).toEqual(["held", "recent"]);
    expect(
      (await db.pool.query("SELECT request_id FROM usage_metrics")).rows,
    ).toEqual([{ request_id: "recent" }]);
    // Idempotent: a second run deletes nothing more.
    expect(await purgeExpiredRequests(db.pool)).toEqual({
      requests: 0,
      metrics: 0,
      held: 1,
    });
  },
);
