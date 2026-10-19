import type { Pool } from "pg";
import { enrollmentKey, lockAccount } from "./account-access";

/** Local account lab only. No live route, worker or retention activation. */
export async function requestAccountClosure(
  database: Pool,
  userId: string,
  sessionId: string,
) {
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const lock = await client.query(
      "SELECT pg_try_advisory_xact_lock(hashtextextended($1,0)) AS locked",
      [enrollmentKey(userId)],
    );
    if (!lock.rows[0].locked) {
      await client.query("ROLLBACK");
      return "busy" as const;
    }
    await lockAccount(client, userId);
    const proof = await client.query(
      `SELECT s.id FROM session s
      JOIN "user" u ON u.id=s."userId" JOIN account_email_proof p ON p."sessionId"=s.id
      WHERE s.id=$1 AND u.id=$2 AND u."emailVerified"=true AND p."verifiedEmail"=u.email
      AND p."consumedAt" IS NULL AND s."expiresAt">clock_timestamp()
      AND p."createdAt">clock_timestamp()-interval '5 minutes' AND p."createdAt"<=clock_timestamp()
      FOR UPDATE OF s,p`,
      [sessionId, userId],
    );
    if (!proof.rowCount) {
      await client.query("ROLLBACK");
      return "reauthenticate" as const;
    }
    await client.query(
      `INSERT INTO account_closure ("userId","requestedAt","purgeAfter")
      SELECT $1,stamp,stamp+interval '7 days' FROM (SELECT clock_timestamp() AS stamp) t
      ON CONFLICT ("userId") DO NOTHING`,
      [userId],
    );
    await client.query('DELETE FROM session WHERE "userId"=$1', [userId]);
    // Only sign-in OTP delivery is enabled; identifier matches pinned email-otp1.7.11.
    await client.query(
      `DELETE FROM verification WHERE identifier IN
      (SELECT 'sign-in-otp-'||email FROM "user" WHERE id=$1)`,
      [userId],
    );
    await client.query("COMMIT");
    return "closed" as const;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
