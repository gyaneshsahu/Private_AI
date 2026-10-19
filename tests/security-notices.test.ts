import { afterEach, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { usageDatabase } from "./fixtures/usage-postgres";
import { applyAccountMigrations } from "../server/account-migrations";
import { finishSignInRecovery } from "../server/account-recovery";
import {
  classifyAbandonedNotices,
  dispatchOneSecurityNotice,
  syntheticNoticeTransport,
  type SecurityNotice,
} from "../server/security-notices";

const enabled = !!process.env.PRIVATEAI_SYNTHETIC_PG;
const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});
async function setup() {
  const db = await usageDatabase({ empty: true });
  cleanups.push(db.dispose);
  await applyAccountMigrations(db.pool);
  const user = randomUUID(),
    session = randomUUID();
  await db.pool.query(
    "INSERT INTO \"user\" (id,name,email,\"emailVerified\") VALUES($1,'','original@example.test',true)",
    [user],
  );
  await db.pool.query(
    `INSERT INTO "session"(id,"userId",token,"expiresAt","updatedAt")
    VALUES($1,$2,$3,NOW()+interval '1 hour',NOW())`,
    [session, user, randomUUID()],
  );
  expect(await finishSignInRecovery(db.pool, user, session)).toBe("completed");
  const state = async () =>
    (await db.pool.query("SELECT * FROM account_security_event")).rows[0];
  return { ...db, user, session, state };
}

it.skipIf(!enabled)(
  "submits each event once across workers using the original verified recipient and a content-minimal notice",
  async () => {
    const db = await setup();
    await db.pool.query(
      "UPDATE \"user\" SET email='changed@example.test' WHERE id=$1",
      [db.user],
    );
    const notices: SecurityNotice[] = [];
    const transport = syntheticNoticeTransport(async (notice) => {
      expect((await db.state()).deliveryState).toBe("dispatching");
      notices.push(notice);
    });
    const second = db.connect();
    const results = await Promise.all(
      Array.from({ length: 12 }, (_, n) =>
        dispatchOneSecurityNotice(n % 2 ? second : db.pool, transport),
      ),
    );
    expect(results.filter((r) => r === "accepted")).toHaveLength(1);
    expect(results.filter((r) => r === "idle")).toHaveLength(11);
    expect(notices).toHaveLength(1);
    expect(notices[0].to).toBe("original@example.test");
    expect(notices[0].idempotencyKey).toBe(
      `privateai-security-${(await db.state()).id}`,
    );
    expect(notices[0].text).toContain(
      "Linked sign-in methods and your encrypted vault were not reset",
    );
    expect(notices[0].text).not.toContain(db.session);
    expect(notices[0].text).not.toContain(db.user);
    expect(notices[0].text).not.toContain("http");
    expect((await db.state()).deliveryState).toBe("accepted");
    expect(await finishSignInRecovery(db.pool, db.user, db.session)).toBe(
      "already-completed",
    );
    expect(await dispatchOneSecurityNotice(db.connect(), transport)).toBe(
      "idle",
    );
    expect(notices).toHaveLength(1);
  },
);

it.skipIf(!enabled)(
  "preserves rejection and timeout as uncertain without leaking errors or automatically retrying",
  async () => {
    const db = await setup();
    let calls = 0;
    expect(
      await dispatchOneSecurityNotice(db.pool, {
        submit: async () => {
          calls++;
          throw Error("SECRET_PROVIDER_BODY original@example.test");
        },
      }),
    ).toBe("uncertain");
    expect((await db.state()).deliveryState).toBe("uncertain");
    expect(JSON.stringify(await db.state())).not.toContain(
      "SECRET_PROVIDER_BODY",
    );
    expect(
      await dispatchOneSecurityNotice(db.pool, {
        submit: async () => {
          calls++;
          return "accepted";
        },
      }),
    ).toBe("idle");
    expect(calls).toBe(1);
    // A distinct event exercises an unresponsive transport; it is never returned to pending.
    await db.pool.query(
      'INSERT INTO account_security_event ("userId","sessionId",kind,"recipientEmail") VALUES($1,$2,\'sign_in_recovery\',\'original@example.test\')',
      [db.user, randomUUID()],
    );
    let signal: AbortSignal | undefined;
    let resolveLate: (result: "accepted") => void = () => {};
    expect(
      await dispatchOneSecurityNotice(
        db.pool,
        {
          submit: async (_notice, abort) => {
            signal = abort;
            return new Promise<"accepted">((resolve) => {
              resolveLate = resolve;
            });
          },
        },
        20,
      ),
    ).toBe("uncertain");
    expect(signal?.aborted).toBe(true);
    resolveLate("accepted");
    expect(
      (
        await db.pool.query(
          'SELECT "deliveryState" FROM account_security_event',
        )
      ).rows.every((r) => r.deliveryState === "uncertain"),
    ).toBe(true);
  },
);

it.skipIf(!enabled)(
  "keeps a possibly accepted notice non-retryable when settlement storage fails",
  async () => {
    const db = await setup();
    await db.pool
      .query(`CREATE FUNCTION reject_settlement() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
    IF NEW."deliveryState"='accepted' THEN RAISE EXCEPTION 'synthetic settlement outage'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER fail_settlement BEFORE UPDATE ON account_security_event FOR EACH ROW EXECUTE FUNCTION reject_settlement()`);
    const notices: SecurityNotice[] = [];
    const transport = syntheticNoticeTransport(async (notice) => {
      notices.push(notice);
    });
    expect(await dispatchOneSecurityNotice(db.pool, transport)).toBe(
      "uncertain",
    );
    expect((await db.state()).deliveryState).toBe("dispatching");
    expect(await classifyAbandonedNotices(db.pool)).toBe(0);
    await db.pool.query(
      "UPDATE account_security_event SET \"dispatchedAt\"=NOW()-interval '6 minutes'",
    );
    expect(await classifyAbandonedNotices(db.pool)).toBe(1);
    expect((await db.state()).deliveryState).toBe("uncertain");
    expect(await dispatchOneSecurityNotice(db.connect(), transport)).toBe(
      "idle",
    );
    expect(notices).toHaveLength(1);
  },
);

it.skipIf(!enabled)(
  "blocks events without an evidenced recipient and never infers a replacement address",
  async () => {
    const db = await setup();
    await db.pool.query(
      'UPDATE account_security_event SET "recipientEmail"=NULL',
    );
    const notices: SecurityNotice[] = [];
    expect(
      await dispatchOneSecurityNotice(
        db.pool,
        syntheticNoticeTransport(async (n) => {
          notices.push(n);
        }),
      ),
    ).toBe("blocked");
    expect(notices).toHaveLength(0);
    expect((await db.state()).deliveryState).toBe("blocked");
    await expect(
      syntheticNoticeTransport(async () => {}).submit(
        {
          to: "person@example.com",
          subject: "synthetic",
          text: "synthetic",
          idempotencyKey: "synthetic",
        },
        new AbortController().signal,
      ),
    ).rejects.toThrow("Synthetic recipients only");
  },
);

it.skipIf(!enabled)(
  "cancels an undispatched notice when its account is deleted",
  async () => {
    const db = await setup();
    await db.pool.query('DELETE FROM "user" WHERE id=$1', [db.user]);
    expect(
      await dispatchOneSecurityNotice(db.pool, {
        submit: async () => {
          throw Error("Must not dispatch");
        },
      }),
    ).toBe("idle");
    expect(await db.state()).toBeUndefined();
  },
);
