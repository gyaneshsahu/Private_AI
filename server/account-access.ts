import { AsyncLocalStorage } from "node:async_hooks";
import type { Pool, PoolClient } from "pg";
import { z } from "zod";

// Database time captured before authentication, never accepted from the client.
export const accountRequestStart = new AsyncLocalStorage<string>();
export const enrollmentKey = (userId: string) =>
  `privateai-credential-enrollment:${userId}`;

/** Keep enrollment and removal ordered without holding a user-row lock across provider work. */
export async function withCredentialEnrollment(
  database: Pool,
  userId: string,
  run: () => Promise<void>,
): Promise<boolean> {
  const client = await database.connect();
  let locked = false,
    destroy = false;
  try {
    locked = (
      await client.query(
        "SELECT pg_try_advisory_lock(hashtextextended($1,0)) AS locked",
        [enrollmentKey(userId)],
      )
    ).rows[0].locked;
    if (!locked) return false;
    await run();
    return true;
  } finally {
    if (locked) {
      try {
        await client.query(
          "SELECT pg_advisory_unlock(hashtextextended($1,0))",
          [enrollmentKey(userId)],
        );
      } catch {
        destroy = true;
      }
    }
    client.release(destroy);
  }
}
export const removalSchema = z
  .object({
    kind: z.enum(["passkey", "provider"]),
    id: z.string().uuid(),
  })
  .strict();

export async function lockAccount(client: PoolClient, userId: string) {
  const gate = await client.query(
    "SELECT mode FROM account_recovery_control WHERE singleton=true FOR SHARE",
  );
  if (gate.rows[0]?.mode !== "normal") throw Error("Account access paused.");
  await client.query('SELECT id FROM "user" WHERE id=$1 FOR UPDATE', [userId]);
}

/** Serializes session completion with credential changes, including in-flight sign-ins. */
export async function recordSessionAccess(
  database: Pool,
  session: { id: string; userId: string },
  emailSignIn: boolean,
) {
  const startedAt = accountRequestStart.getStore();
  const client = await database.connect();
  let rejected = false;
  try {
    await client.query("BEGIN");
    await lockAccount(client, session.userId);
    const changes = await client.query(
      `SELECT 1 FROM account_credential_change WHERE "userId"=$1 AND "changedAt">=$2::timestamptz`,
      [session.userId, startedAt ?? null],
    );
    const closure = await client.query(
      'SELECT 1 FROM account_closure WHERE "userId"=$1',
      [session.userId],
    );
    rejected = !startedAt || !!changes.rowCount || !!closure.rowCount;
    if (rejected) {
      await client.query('DELETE FROM session WHERE id=$1 AND "userId"=$2', [
        session.id,
        session.userId,
      ]);
    } else if (emailSignIn) {
      await client.query(
        `INSERT INTO account_email_proof ("sessionId","verifiedEmail")
         SELECT s.id,u.email FROM session s JOIN "user" u ON u.id=s."userId"
         WHERE s.id=$1 AND u.id=$2 AND u."emailVerified"=true`,
        [session.id, session.userId],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    // No cookie has been issued. An unavailable proof never authorizes removal.
    throw error;
  } finally {
    client.release();
  }
  if (rejected) throw Error("Account credentials changed; sign in again.");
}

export async function removeCredential(
  database: Pool,
  userId: string,
  sessionId: string,
  target: z.infer<typeof removalSchema>,
): Promise<"removed" | "reauthenticate" | "not-found" | "busy"> {
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const available = await client.query(
      "SELECT pg_try_advisory_xact_lock(hashtextextended($1,0)) AS locked",
      [enrollmentKey(userId)],
    );
    if (!available.rows[0].locked) {
      await client.query("ROLLBACK");
      return "busy";
    }
    await lockAccount(client, userId);
    const proof = await client.query(
      `SELECT s.id FROM session s JOIN "user" u ON u.id=s."userId"
       JOIN account_email_proof p ON p."sessionId"=s.id
       WHERE s.id=$1 AND u.id=$2 AND u."emailVerified"=true
       AND p."verifiedEmail"=u.email AND p."consumedAt" IS NULL
       AND s."expiresAt">clock_timestamp()
       AND p."createdAt">clock_timestamp()-interval '5 minutes'
       AND p."createdAt"<=clock_timestamp()
       FOR UPDATE OF s,p`,
      [sessionId, userId],
    );
    if (!proof.rowCount) {
      await client.query("ROLLBACK");
      return "reauthenticate";
    }
    // Email remains enabled and has just been demonstrated independently of the removed method.
    const removed = await client.query(
      target.kind === "passkey"
        ? 'DELETE FROM passkey WHERE id=$1 AND "userId"=$2 RETURNING id'
        : `DELETE FROM account WHERE id=$1 AND "userId"=$2 AND "providerId" IN ('google','apple') RETURNING id`,
      [target.id, userId],
    );
    if (!removed.rowCount) {
      await client.query("ROLLBACK");
      return "not-found";
    }
    await client.query(
      'UPDATE account_email_proof SET "consumedAt"=clock_timestamp() WHERE "sessionId"=$1',
      [sessionId],
    );
    await client.query(
      `INSERT INTO account_credential_change ("userId") VALUES ($1)
      ON CONFLICT ("userId") DO UPDATE SET "changedAt"=clock_timestamp()`,
      [userId],
    );
    await client.query('DELETE FROM session WHERE "userId"=$1 AND id<>$2', [
      userId,
      sessionId,
    ]);
    await client.query(
      `INSERT INTO account_security_event ("userId","sessionId",kind,"recipientEmail")
      SELECT id,$2,'credential_removed',email FROM "user" WHERE id=$1`,
      [userId, sessionId],
    );
    await client.query("COMMIT");
    return "removed";
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function revokeAccountSession(
  database: Pool,
  userId: string,
  sessionId: string,
  targetId: string,
) {
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    await lockAccount(client, userId);
    const current = await client.query(
      'SELECT id FROM session WHERE id=$1 AND "userId"=$2 AND "expiresAt">clock_timestamp() FOR UPDATE',
      [sessionId, userId],
    );
    if (!current.rowCount) throw Error("Sign in again.");
    await client.query('DELETE FROM session WHERE id=$1 AND "userId"=$2', [
      targetId,
      userId,
    ]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
