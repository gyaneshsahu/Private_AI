import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import express from "express";
import type { Server } from "node:http";
import { resolve } from "node:path";
import { chromium, expect as browserExpect } from "@playwright/test";
import { usageDatabase } from "./fixtures/usage-postgres";
import { applyAccountMigrations } from "../server/account-migrations";
import { createSyntheticAccountAuth } from "../server/account-auth";
import {
  accountRequestStart,
  recordSessionAccess,
  withCredentialEnrollment,
} from "../server/account-access";
import {
  dispatchOneSecurityNotice,
  syntheticNoticeTransport,
} from "../server/security-notices";

const enabled = !!process.env.PRIVATEAI_SYNTHETIC_PG;
let db: Awaited<ReturnType<typeof usageDatabase>>,
  server: Server,
  origin: string;
const codes = new Map<string, string>();
beforeAll(async () => {
  if (!enabled) return;
  db = await usageDatabase({ empty: true });
  await applyAccountMigrations(db.pool);
  const app = express();
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((done) => server.once("listening", done));
  const address = server.address();
  if (!address || typeof address === "string") throw Error("No listener");
  origin = `http://localhost:${address.port}`;
  const lab = createSyntheticAccountAuth({
    origin,
    secret: randomBytes(48).toString("hex"),
    database: db.pool,
    deliverCode: async ({ email, otp }) => {
      codes.set(email, otp);
    },
  });
  app.use(lab.router);
  app.use(express.static(resolve("dist")));
});
beforeEach(async () => {
  if (enabled) await db.pool.query('DELETE FROM "rateLimit"');
});
afterAll(async () => {
  if (server) await new Promise<void>((done) => server.close(() => done()));
  if (db) await db.dispose();
});
async function call(
  path: string,
  cookie = "",
  body?: object,
  requestOrigin = origin,
) {
  return fetch(`${origin}/api/${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      origin: requestOrigin,
      cookie,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
async function signIn(email: string) {
  expect(
    (
      await call("auth/email-otp/send-verification-otp", "", {
        email,
        type: "sign-in",
      })
    ).status,
  ).toBe(200);
  const response = await call("auth/sign-in/email-otp", "", {
    email,
    otp: codes.get(email),
  });
  expect(response.status).toBe(200);
  const data = await response.json();
  const cookie = response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  const current = await (await call("auth/get-session", cookie)).json();
  return {
    cookie,
    userId: data.user.id as string,
    sessionId: current.session.id as string,
  };
}
async function key(userId: string) {
  const id = randomUUID();
  await db.pool.query(
    `INSERT INTO passkey (id,name,"publicKey","userId","credentialID",counter,"deviceType","backedUp","createdAt")
    VALUES($1::uuid,'Lost test key','synthetic-public',$2,$1::text,0,'singleDevice',false,clock_timestamp())`,
    [id, userId],
  );
  return { kind: "passkey", id };
}

it.skipIf(!enabled)(
  "lists only owned non-secret metadata and revokes by owned ID with origin and live-session checks",
  async () => {
    const a = await signIn("sessions-a@example.test"),
      a2 = await signIn("sessions-a@example.test"),
      b = await signIn("sessions-b@example.test");
    const response = await call("account/access", a.cookie);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const data = await response.json();
    expect(data.sessions.map((s: { id: string }) => s.id).sort()).toEqual(
      [a.sessionId, a2.sessionId].sort(),
    );
    expect(data.sessions.find((s: { current: boolean }) => s.current).id).toBe(
      a.sessionId,
    );
    expect(Object.keys(data.sessions[0]).sort()).toEqual(
      ["id", "createdAt", "updatedAt", "expiresAt", "current"].sort(),
    );
    expect((await call("auth/list-sessions", a.cookie)).status).toBe(403);
    expect(
      (await call("account/access/revoke", a.cookie, { id: b.sessionId }))
        .status,
    ).toBe(200);
    expect(
      (
        await call(
          "account/access/revoke",
          a.cookie,
          { id: a2.sessionId },
          "https://evil.test",
        )
      ).status,
    ).toBe(403);
    expect(
      (await call("account/access/revoke", a.cookie, { id: a2.sessionId }))
        .status,
    ).toBe(200);
    expect(await (await call("auth/get-session", a2.cookie)).json()).toBeNull();
    expect(
      (await (await call("auth/get-session", b.cookie)).json()).user.id,
    ).toBe(b.userId);
    expect((await call("account/access", a2.cookie)).status).toBe(401);
    expect(
      (await call("account/access/revoke", a.cookie, { id: a.sessionId }))
        .status,
    ).toBe(200);
    expect((await call("account/access", a.cookie)).status).toBe(401);
  },
);

it.skipIf(!enabled)(
  "requires current email proof, rejects raw endpoint bypasses and isolates account targets",
  async () => {
    const a = await signIn("proof-a@example.test"),
      b = await signIn("proof-b@example.test");
    const target = await key(a.userId),
      foreign = await key(b.userId);
    expect(
      (await call("auth/passkey/delete-passkey", a.cookie, { id: target.id }))
        .status,
    ).toBe(403);
    expect(
      (await call("auth/unlink-account", a.cookie, { accountId: randomUUID() }))
        .status,
    ).toBe(403);
    expect(
      (await call("account/access/remove", a.cookie, foreign)).status,
    ).toBe(404);
    await db.pool.query(
      'UPDATE account_email_proof SET "createdAt"=clock_timestamp()-interval \'6 minutes\' WHERE "sessionId"=$1',
      [a.sessionId],
    );
    expect((await call("account/access/remove", a.cookie, target)).status).toBe(
      403,
    );
    await db.pool.query(
      'UPDATE account_email_proof SET "createdAt"=clock_timestamp(),"verifiedEmail"=\'different@example.test\' WHERE "sessionId"=$1',
      [a.sessionId],
    );
    expect((await call("account/access/remove", a.cookie, target)).status).toBe(
      403,
    );
    await db.pool.query(
      'DELETE FROM account_email_proof WHERE "sessionId"=$1',
      [a.sessionId],
    );
    expect((await call("account/access/remove", a.cookie, target)).status).toBe(
      403,
    );
    expect(
      (
        await db.pool.query("SELECT id FROM passkey WHERE id=ANY($1::uuid[])", [
          [target.id, foreign.id],
        ])
      ).rowCount,
    ).toBe(2);
  },
);

it.skipIf(!enabled)(
  "commits one concurrent removal with notice and revocation, preserving independently proven email access",
  async () => {
    const old = await signIn("remove@example.test"),
      current = await signIn("remove@example.test");
    const target = await key(current.userId),
      other = await key(current.userId);
    const results = await Promise.all([
      call("account/access/remove", current.cookie, target),
      call("account/access/remove", current.cookie, other),
    ]);
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(results.filter((r) => [403, 409].includes(r.status))).toHaveLength(
      1,
    );
    expect(
      (
        await db.pool.query('SELECT id FROM passkey WHERE "userId"=$1', [
          current.userId,
        ])
      ).rowCount,
    ).toBe(1);
    expect(
      await (await call("auth/get-session", old.cookie)).json(),
    ).toBeNull();
    expect((await call("account/access", current.cookie)).status).toBe(200);
    const notices = await db.pool.query(
      'SELECT * FROM account_security_event WHERE "userId"=$1',
      [current.userId],
    );
    expect(notices.rows).toHaveLength(1);
    expect(notices.rows[0].kind).toBe("credential_removed");
    const messages: string[] = [];
    await dispatchOneSecurityNotice(
      db.pool,
      syntheticNoticeTransport(async (notice) => {
        messages.push(notice.text);
      }),
    );
    expect(messages[0]).toContain("A sign-in method was removed");
    expect((await signIn("remove@example.test")).userId).toBe(current.userId);
  },
);

it.skipIf(!enabled)(
  "rolls back credential removal on notice failure and rejects an in-flight pre-change sign-in",
  async () => {
    const a = await signIn("rollback@example.test"),
      other = await signIn("rollback@example.test");
    const target = await key(a.userId);
    await db.pool
      .query(`CREATE FUNCTION fail_notice() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic failure'; END $$;
    CREATE TRIGGER fail_notice BEFORE INSERT ON account_security_event FOR EACH ROW EXECUTE FUNCTION fail_notice()`);
    try {
      expect(
        (await call("account/access/remove", a.cookie, target)).status,
      ).toBe(503);
      expect(
        (await db.pool.query("SELECT id FROM passkey WHERE id=$1", [target.id]))
          .rowCount,
      ).toBe(1);
      expect((await call("account/access", other.cookie)).status).toBe(200);
      expect(
        (
          await db.pool.query(
            'SELECT "consumedAt" FROM account_email_proof WHERE "sessionId"=$1',
            [a.sessionId],
          )
        ).rows[0].consumedAt,
      ).toBeNull();
    } finally {
      await db.pool.query(
        "DROP TRIGGER fail_notice ON account_security_event; DROP FUNCTION fail_notice()",
      );
    }
    const started = (
      await db.pool.query("SELECT clock_timestamp()::text started")
    ).rows[0].started;
    expect((await call("account/access/remove", a.cookie, target)).status).toBe(
      200,
    );
    const lateId = randomUUID();
    await db.pool.query(
      `INSERT INTO session(id,"userId",token,"expiresAt","updatedAt") VALUES($1::uuid,$2,$1::text,clock_timestamp()+interval '1 hour',clock_timestamp())`,
      [lateId, a.userId],
    );
    await expect(
      accountRequestStart.run(started, () =>
        recordSessionAccess(db.pool, { id: lateId, userId: a.userId }, false),
      ),
    ).rejects.toThrow("credentials changed");
    expect(
      (await db.pool.query("SELECT id FROM session WHERE id=$1", [lateId]))
        .rowCount,
    ).toBe(0);
  },
);

it.skipIf(!enabled)(
  "orders enrollment and removal across database connections without consuming proof on contention",
  async () => {
    const a = await signIn("enrollment-lock@example.test");
    const target = await key(a.userId);
    const peer = db.connect();
    let release!: () => void, acquired!: () => void;
    const held = new Promise<void>((done) => {
      acquired = done;
    });
    const wait = new Promise<void>((done) => {
      release = done;
    });
    const running = withCredentialEnrollment(peer, a.userId, async () => {
      acquired();
      await wait;
    });
    await held;
    try {
      expect(
        (await call("account/access/remove", a.cookie, target)).status,
      ).toBe(409);
      expect(
        (
          await call("auth/passkey/verify-registration", a.cookie, {
            response: {},
          })
        ).status,
      ).toBe(409);
      expect(
        (
          await db.pool.query(
            'SELECT "consumedAt" FROM account_email_proof WHERE "sessionId"=$1',
            [a.sessionId],
          )
        ).rows[0].consumedAt,
      ).toBeNull();
    } finally {
      release();
      await running;
    }
    expect((await call("account/access/remove", a.cookie, target)).status).toBe(
      200,
    );
    await expect(
      withCredentialEnrollment(peer, a.userId, async () => {
        throw Error("test failure");
      }),
    ).rejects.toThrow("test failure");
    expect(
      await withCredentialEnrollment(db.pool, a.userId, async () => {}),
    ).toBe(true);
  },
);

it.skipIf(!enabled)(
  "removes a provider only after independent email proof and denies changes during quarantine",
  async () => {
    const a = await signIn("provider-remove@example.test");
    const id = randomUUID();
    await db.pool.query(
      `INSERT INTO account(id,"accountId","providerId","userId","updatedAt") VALUES($1,'synthetic-sub','google',$2,clock_timestamp())`,
      [id, a.userId],
    );
    const target = { id, kind: "provider" };
    expect(
      (
        await call(
          "account/access/remove",
          a.cookie,
          target,
          "https://evil.test",
        )
      ).status,
    ).toBe(403);
    await db.pool.query(
      "UPDATE account_recovery_control SET mode='quarantined'",
    );
    try {
      expect(
        (await call("account/access/remove", a.cookie, target)).status,
      ).toBe(503);
      expect((await call("account/access", a.cookie)).status).toBe(503);
      expect(
        (await db.pool.query("SELECT id FROM account WHERE id=$1", [id]))
          .rowCount,
      ).toBe(1);
    } finally {
      await db.pool.query("UPDATE account_recovery_control SET mode='normal'");
    }
    expect((await call("account/access/remove", a.cookie, target)).status).toBe(
      200,
    );
    expect(
      (await db.pool.query("SELECT id FROM account WHERE id=$1", [id]))
        .rowCount,
    ).toBe(0);
    expect((await signIn("provider-remove@example.test")).userId).toBe(
      a.userId,
    );
  },
);

it.skipIf(!enabled)(
  "rejects signed passkey registration and authentication without authenticator user verification",
  async () => {
    const account = await signIn("uv@example.test");
    const browser = await chromium.launch();
    try {
      const context = await browser.newContext();
      await context.addCookies(
        account.cookie.split("; ").map((pair) => {
          const index = pair.indexOf("=");
          return {
            name: pair.slice(0, index),
            value: pair.slice(index + 1),
            url: origin,
            httpOnly: true,
            sameSite: "Lax" as const,
          };
        }),
      );
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send("WebAuthn.enable");
      const { authenticatorId } = await cdp.send(
        "WebAuthn.addVirtualAuthenticator",
        {
          options: {
            protocol: "ctap2",
            transport: "internal",
            hasResidentKey: true,
            hasUserVerification: true,
            isUserVerified: true,
            automaticPresenceSimulation: true,
          },
        },
      );
      await page.goto(`${origin}/?account-lab=1`);
      await cdp.send("WebAuthn.setResponseOverrideBits", {
        authenticatorId,
        isBadUV: true,
      });
      async function register() {
        return page.evaluate(async () => {
          const options = await (
            await fetch("/api/auth/passkey/generate-register-options")
          ).json();
          options.authenticatorSelection.userVerification = "discouraged";
          const credential = (await navigator.credentials.create({
            publicKey:
              PublicKeyCredential.parseCreationOptionsFromJSON(options),
          })) as PublicKeyCredential;
          return (
            await fetch("/api/auth/passkey/verify-registration", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                response: credential.toJSON(),
                name: "UV check",
              }),
            })
          ).status;
        });
      }
      expect(await register()).toBe(403);
      expect(
        (
          await db.pool.query('SELECT id FROM passkey WHERE "userId"=$1', [
            account.userId,
          ])
        ).rowCount,
      ).toBe(0);
      await cdp.send("WebAuthn.clearCredentials", { authenticatorId });
      await cdp.send("WebAuthn.setResponseOverrideBits", {
        authenticatorId,
        isBadUV: false,
      });
      expect(await register()).toBe(200);
      await cdp.send("WebAuthn.setResponseOverrideBits", {
        authenticatorId,
        isBadUV: true,
      });
      await page.evaluate(() =>
        fetch("/api/auth/sign-out", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}",
        }),
      );
      const status = await page.evaluate(async () => {
        const options = await (
          await fetch("/api/auth/passkey/generate-authenticate-options")
        ).json();
        options.userVerification = "discouraged";
        const assertion = (await navigator.credentials.get({
          publicKey: PublicKeyCredential.parseRequestOptionsFromJSON(options),
        })) as PublicKeyCredential;
        return (
          await fetch("/api/auth/passkey/verify-authentication", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ response: assertion.toJSON() }),
          })
        ).status;
      });
      expect(status).toBe(403);
      expect(
        (
          await db.pool.query('SELECT id FROM session WHERE "userId"=$1', [
            account.userId,
          ])
        ).rowCount,
      ).toBe(0);
    } finally {
      await browser.close();
    }
  },
  20000,
);

it.skipIf(!enabled)(
  "removes a lost passkey through the built phone-width UI after email reauthentication",
  async () => {
    const browser = await chromium.launch();
    try {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
      });
      context.setDefaultTimeout(5000);
      const external: string[] = [];
      await context.route("**/*", (route) => {
        if (new URL(route.request().url()).origin === origin)
          return route.continue();
        external.push(route.request().url());
        return route.abort();
      });
      const page = await context.newPage();
      page.on("dialog", (dialog) => void dialog.accept());
      const cdp = await context.newCDPSession(page);
      await cdp.send("WebAuthn.enable");
      await cdp.send("WebAuthn.addVirtualAuthenticator", {
        options: {
          protocol: "ctap2",
          transport: "internal",
          hasResidentKey: true,
          hasUserVerification: true,
          isUserVerified: true,
          automaticPresenceSimulation: true,
        },
      });
      const email = "access-ui@example.test";
      async function emailLogin() {
        await page.getByLabel("Test email address").fill(email);
        await page
          .getByRole("button", { name: "Send test code", exact: true })
          .click();
        await browserExpect(page.getByLabel("Verification code")).toBeVisible();
        await page.getByLabel("Verification code").fill(codes.get(email)!);
        await page
          .getByRole("button", { name: "Verify test code", exact: true })
          .click();
        await browserExpect(
          page.getByRole("heading", { name: "Your test account" }),
        ).toBeVisible();
      }
      await page.goto(`${origin}/?account-lab=1`);
      await emailLogin();
      await page
        .getByRole("button", { name: "Add test passkey", exact: true })
        .click();
      await browserExpect(
        page.getByRole("button", {
          name: "Remove PrivateAI synthetic passkey",
        }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Sign out", exact: true }).click();
      await page
        .getByRole("button", { name: "Sign in with a test passkey" })
        .click();
      await page
        .getByRole("button", { name: "Remove PrivateAI synthetic passkey" })
        .click();
      await browserExpect(
        page.getByText("Verify your email again before removing a method.", {
          exact: false,
        }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Verify email for removal" })
        .click();
      await emailLogin();
      const other = await signIn(email);
      await page
        .getByRole("button", { name: "Refresh account access" })
        .click();
      await browserExpect(
        page.getByRole("button", {
          name: `Sign out session ${other.sessionId.slice(0, 8)}`,
        }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Remove PrivateAI synthetic passkey" })
        .click();
      await browserExpect(
        page.getByText(
          "Sign-in method removed and other sessions signed out.",
          { exact: false },
        ),
      ).toBeVisible();
      await browserExpect(
        page.getByRole("button", {
          name: "Remove PrivateAI synthetic passkey",
        }),
      ).toHaveCount(0);
      expect(
        await (await call("auth/get-session", other.cookie)).json(),
      ).toBeNull();
      expect(
        await page.evaluate(() => ({
          local: localStorage.length,
          session: sessionStorage.length,
          overflow: document.documentElement.scrollWidth > innerWidth,
        })),
      ).toEqual({ local: 0, session: 0, overflow: false });
      expect(external).toEqual([]);
      await page
        .getByRole("button", { name: "Sign out this session", exact: true })
        .click();
      await browserExpect(
        page.getByRole("heading", { name: "Sign in to the account lab" }),
      ).toBeVisible();
    } finally {
      await browser.close();
    }
  },
  25000,
);
