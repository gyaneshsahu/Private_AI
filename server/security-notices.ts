import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { z } from "zod";

export interface SecurityNotice {
  to: string;
  subject: string;
  text: string;
  idempotencyKey: string;
}
export interface SecurityNoticeTransport {
  /** Accepted means the provider accepted submission, not inbox delivery. */
  submit(notice: SecurityNotice, signal: AbortSignal): Promise<"accepted">;
}
export type DispatchResult =
  "idle" | "blocked" | "accepted" | "uncertain" | "paused";
const email = z.string().email().max(254);

/** Explicitly invoked only; no scheduler, provider credentials or network implementation. */
export async function dispatchOneSecurityNotice(
  database: Pool,
  transport: SecurityNoticeTransport,
  timeoutMs = 30_000,
): Promise<DispatchResult> {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30_000)
    throw Error("Invalid dispatch deadline.");
  const client = await database.connect();
  const token = randomUUID();
  let event: {
    id: string;
    recipientEmail: string | null;
    createdAt: Date;
    kind: string;
    closed: boolean;
  };
  try {
    await client.query("BEGIN");
    const gate = await client.query(
      "SELECT mode FROM account_recovery_control WHERE singleton=true FOR SHARE",
    );
    if (gate.rows[0]?.mode !== "normal") {
      await client.query("COMMIT");
      return "paused";
    }
    const claimed =
      await client.query(`SELECT id,kind,"recipientEmail","createdAt",
      EXISTS(SELECT 1 FROM account_closure c WHERE c."userId"=account_security_event."userId") AS closed
      FROM account_security_event WHERE "deliveryState"='pending'
      ORDER BY "createdAt",id FOR UPDATE SKIP LOCKED LIMIT 1`);
    if (!claimed.rowCount) {
      await client.query("COMMIT");
      return "idle";
    }
    event = claimed.rows[0];
    if (event.closed || !email.safeParse(event.recipientEmail).success) {
      await client.query(
        `UPDATE account_security_event SET "deliveryState"='blocked',"settledAt"=clock_timestamp() WHERE id=$1`,
        [event.id],
      );
      await client.query("COMMIT");
      return "blocked";
    }
    await client.query(
      `UPDATE account_security_event SET "deliveryState"='dispatching',
      "dispatchToken"=$2,"dispatchedAt"=clock_timestamp() WHERE id=$1`,
      [event.id, token],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  const notice: SecurityNotice = {
    to: event.recipientEmail!,
    subject:
      event.kind === "credential_removed"
        ? "PrivateAI sign-in method removed"
        : "PrivateAI sign-in recovery completed",
    text: `${event.kind === "credential_removed" ? "A sign-in method was removed from" : "Sign-in recovery was completed for"} your PrivateAI account at ${event.createdAt.toISOString()}. Other sessions were signed out. ${event.kind === "credential_removed" ? "Email sign-in remains available. Your encrypted vault was not reset." : "Linked sign-in methods and your encrypted vault were not reset."} If you did not request this, use your usual PrivateAI address to review your account access.`,
    idempotencyKey: `privateai-security-${event.id}`,
  };
  const abort = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let outcome: "accepted" | "uncertain" = "uncertain";
  try {
    const submitted = await Promise.race([
      Promise.resolve().then(() => transport.submit(notice, abort.signal)),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          abort.abort();
          reject(Error("Dispatch deadline exceeded."));
        }, timeoutMs);
      }),
    ]);
    if (submitted === "accepted") outcome = "accepted";
  } catch {
    // An exception cannot prove the provider did not accept the message.
  } finally {
    clearTimeout(timer);
  }
  try {
    const saved = await database.query(
      `UPDATE account_security_event SET "deliveryState"=$3,
      "settledAt"=clock_timestamp() WHERE id=$1 AND "dispatchToken"=$2 AND "deliveryState"='dispatching' RETURNING id`,
      [event.id, token, outcome],
    );
    return saved.rowCount ? outcome : "uncertain";
  } catch {
    // A possibly sent message must never re-enter the pending queue.
    return "uncertain";
  }
}

/** Classify abandoned claims, never retry them. Minimum exceeds the dispatch deadline. */
export async function classifyAbandonedNotices(
  database: Pool,
): Promise<number> {
  const result =
    await database.query(`UPDATE account_security_event SET "deliveryState"='uncertain',
    "settledAt"=clock_timestamp() WHERE "deliveryState"='dispatching'
    AND "dispatchedAt"<clock_timestamp()-interval '5 minutes'`);
  return result.rowCount ?? 0;
}

/** No network: records only synthetic recipients through a caller-owned test sink. */
export function syntheticNoticeTransport(
  record: (notice: SecurityNotice) => Promise<void>,
): SecurityNoticeTransport {
  return {
    async submit(notice, signal) {
      signal.throwIfAborted();
      if (!/^[^\s@]+@[^\s@]+\.test$/i.test(notice.to))
        throw Error("Synthetic recipients only.");
      await record(notice);
      return "accepted";
    },
  };
}
