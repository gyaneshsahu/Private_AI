import type { Pool } from "pg";

export async function accountRecoveryOpen(
  database: Pick<Pool, "query">,
): Promise<boolean> {
  const result = await database.query(
    "SELECT mode FROM account_recovery_control WHERE singleton=true",
  );
  return result.rows[0]?.mode === "normal";
}

/** Rehearsal only: rejects all original/live database names. Restore while offline first. */
export async function quarantineSyntheticRestore(
  database: Pool,
  expectedDatabase: string,
) {
  if (!/^privateai_restore_[a-f0-9]{32}$/.test(expectedDatabase))
    throw Error("Dedicated synthetic restore database required.");
  const client = await database.connect();
  try {
    if (
      (await client.query("SELECT current_database() AS name")).rows[0].name !==
      expectedDatabase
    )
      throw Error("Restore database identity does not match.");
    await client.query("BEGIN");
    const control = await client.query(
      "SELECT mode FROM account_recovery_control WHERE singleton=true FOR UPDATE",
    );
    if (!control.rowCount) throw Error("Recovery control is missing.");
    await client.query(`UPDATE account_recovery_control SET mode='quarantined',
      generation=CASE WHEN mode='normal' THEN pg_catalog.gen_random_uuid() ELSE generation END,
      "updatedAt"=clock_timestamp() WHERE singleton=true`);
    const sessions = await client.query('DELETE FROM "session"');
    const challenges = await client.query('DELETE FROM "verification"');
    const notices = await client.query(`UPDATE account_security_event SET
      "deliveryState"=CASE WHEN "deliveryState"='pending' THEN 'blocked' ELSE 'uncertain' END,
      "settledAt"=clock_timestamp() WHERE "deliveryState" IN ('pending','dispatching')`);
    await client.query("COMMIT");
    return {
      mode: "quarantined" as const,
      sessionsInvalidated: sessions.rowCount ?? 0,
      challengesInvalidated: challenges.rowCount ?? 0,
      noticesHeld: notices.rowCount ?? 0,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
