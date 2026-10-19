import type { Pool } from "pg";

export type RecoveryOutcome =
  "completed" | "already-completed" | "reauthenticate";

/** Atomic session revocation + notification intent. No credential or vault reset. */
export async function finishSignInRecovery(
  database: Pool,
  accountId: string,
  sessionId: string,
): Promise<RecoveryOutcome> {
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const gate = await client.query(
      "SELECT mode FROM account_recovery_control WHERE singleton=true FOR SHARE",
    );
    if (gate.rows[0]?.mode !== "normal") {
      await client.query("ROLLBACK");
      return "reauthenticate";
    }
    await client.query('SELECT id FROM "user" WHERE id=$1 FOR UPDATE', [
      accountId,
    ]);
    const current = await client.query(
      `SELECT s.id FROM session s JOIN "user" u ON u.id=s."userId"
       WHERE s.id=$1 AND s."userId"=$2 AND u."emailVerified"=true
       AND s."expiresAt">clock_timestamp() AND s."createdAt">clock_timestamp()-interval '5 minutes'
       AND s."createdAt"<=clock_timestamp() FOR UPDATE OF s`,
      [sessionId, accountId],
    );
    if (!current.rowCount) {
      await client.query("ROLLBACK");
      return "reauthenticate";
    }
    const event = await client.query(
      `INSERT INTO account_security_event ("userId","sessionId",kind,"recipientEmail")
       SELECT id,$2,'sign_in_recovery',email FROM "user" WHERE id=$1
       ON CONFLICT ("sessionId",kind) DO NOTHING RETURNING id`,
      [accountId, sessionId],
    );
    if (event.rowCount)
      await client.query('DELETE FROM session WHERE "userId"=$1 AND id<>$2', [
        accountId,
        sessionId,
      ]);
    await client.query("COMMIT");
    return event.rowCount ? "completed" : "already-completed";
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
