import type { Pool } from "pg";

/** Test-only purge. Never imported by the application, auth router, CLI or scheduler. */
export async function purgeSyntheticClosedAccounts(database: Pool) {
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const identity = (
      await client.query(
        "SELECT current_database() AS db,current_schema() AS schema",
      )
    ).rows[0];
    if (
      identity.db !== "privateai_synthetic" ||
      !/^(usage|auth)_test_[a-f0-9]{32}$/.test(identity.schema)
    )
      throw Error("Disposable synthetic account schema required.");
    const gate = await client.query(
      "SELECT mode FROM account_recovery_control WHERE singleton=true FOR UPDATE",
    );
    if (gate.rows[0]?.mode !== "quarantined")
      throw Error("Account access must be quarantined before purge.");
    const eligible = await client.query(`SELECT "userId" FROM account_closure
      WHERE "purgedAt" IS NULL AND "purgeAfter"<=clock_timestamp()
      AND ("holdUntil" IS NULL OR "holdUntil"<=clock_timestamp()) FOR UPDATE`);
    const ids = eligible.rows.map((row: { userId: string }) => row.userId);
    // Auth FKs cascade; usage has no contact data and remains for explicit reconciliation.
    const removed = await client.query(
      'DELETE FROM "user" WHERE id=ANY($1::uuid[]) RETURNING id',
      [ids],
    );
    await client.query(
      'UPDATE account_closure SET "purgedAt"=clock_timestamp() WHERE "userId"=ANY($1::uuid[])',
      [ids],
    );
    await client.query("COMMIT");
    return {
      removed: removed.rowCount ?? 0,
      usageRetained: true,
      backupErasureVerified: false,
      physicalErasureVerified: false,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
