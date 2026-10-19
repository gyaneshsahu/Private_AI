import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { Pool } from "pg";
import { randomBytes, randomUUID } from "node:crypto";
import { getMigrations } from "better-auth/db/migration";
import express from "express";
import { createSyntheticAccountAuth } from "../server/account-auth";
import type { Server } from "node:http";
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { chromium, expect as browserExpect } from "@playwright/test";
import { resolve } from "node:path";

const connectionString = process.env.PRIVATEAI_SYNTHETIC_PG;
const enabled = !!connectionString;
const schema = `auth_test_${randomUUID().replaceAll("-", "")}`;
let admin: Pool, pool: Pool, server: Server, origin: string;
const secret = randomBytes(48).toString("base64url");
const messages: { email: string; otp: string }[] = [];
let lab: ReturnType<typeof createSyntheticAccountAuth>;
let migrationSQL = "";

beforeAll(async () => {
  if (!enabled) return;
  const url = new URL(connectionString!);
  if (
    !["127.0.0.1", "localhost"].includes(url.hostname) ||
    url.pathname !== "/privateai_synthetic"
  )
    throw Error("Only the named local synthetic database may be tested.");
  admin = new Pool({ connectionString });
  await admin.query(`CREATE SCHEMA "${schema}"`);
  pool = new Pool({
    connectionString,
    options: `-c search_path=${schema}`,
    max: 10,
  });
  const app = express();
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw Error("No test listener");
  origin = `http://localhost:${address.port}`;
  lab = createSyntheticAccountAuth({
    origin,
    secret,
    database: pool,
    deliverCode: async (message) => {
      messages.push(message);
    },
  });
  const migration = await getMigrations(lab.auth.options);
  migrationSQL = await migration.compileMigrations();
  if (process.env.PRIVATEAI_CAPTURE_AUTH_SCHEMA === "1") {
    await mkdir(".local", { recursive: true });
    await writeFile(".local/account-auth-schema.sql", migrationSQL);
  }
  const committedSchema = await readFile(
    "server/migrations/0001-consumer-auth.sql",
    "utf8",
  );
  expect(committedSchema.replaceAll("\r\n", "\n").trim()).toBe(
    migrationSQL.replaceAll("\r\n", "\n").trim(),
  );
  await pool.query(committedSchema);
  await pool.query(
    await readFile("server/migrations/0002-account-uniqueness.sql", "utf8"),
  );
  // Runtime starts after migrations; do not reuse pre-migration schema caches.
  await pool.end();
  pool = new Pool({
    connectionString,
    options: `-c search_path=${schema}`,
    max: 10,
  });
  lab = createSyntheticAccountAuth({
    origin,
    secret,
    database: pool,
    deliverCode: async (message) => {
      messages.push(message);
    },
  });
  app.use((req, res, next) => lab.router(req, res, next));
  app.use(express.static(resolve("dist"), { index: false }));
  app.get("/", (_req, res) => res.sendFile(resolve("dist/index.html")));
}, 20000);

beforeEach(async () => {
  if (enabled) await pool.query('DELETE FROM "rateLimit"');
});

afterAll(async () => {
  if (server)
    await new Promise<void>((resolve) => server.close(() => resolve()));
  if (pool) await pool.end();
  if (admin) {
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.end();
  }
});

const call = (
  path: string,
  body?: object,
  cookie?: string,
  headers: Record<string, string> = {},
) =>
  fetch(`${origin}/api/auth/${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      origin,
      ...(body ? { "content-type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
const cookieFrom = (response: Response) =>
  response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");

it.skipIf(!enabled)(
  "completes the React email and passkey workflow without private chat or external calls",
  async () => {
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage({
        viewport: { width: 390, height: 844 },
      });
      const external: string[] = [];
      page.on("request", (request) => {
        if (new URL(request.url()).origin !== origin)
          external.push(request.url());
      });
      const cdp = await page.context().newCDPSession(page);
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
      await page.goto(`${origin}/?account-lab=1`);
      await page.getByLabel("Test email address").fill("ui@example.test");
      await page
        .getByRole("button", { name: "Send test code", exact: true })
        .click();
      await browserExpect(page.getByLabel("Verification code")).toBeFocused();
    const otp = messages.filter(
        (message) => message.email === "ui@example.test",
    ).at(-1)!.otp;
      await page.getByLabel("Verification code").fill(otp);
      await page
        .getByRole("button", { name: "Verify test code", exact: true })
        .click();
      await browserExpect(
        page.getByRole("heading", { name: "Your test account" }),
      ).toBeVisible();
      await page.reload();
      await browserExpect(
        page.getByText("Signed in as", { exact: false }),
      ).toContainText("ui@example.test");
      await page
        .getByRole("button", { name: "Add test passkey", exact: true })
        .click();
      await browserExpect(page.getByRole("status")).toHaveText(
        "Test passkey added.",
      );
      await page
        .getByRole("button", { name: "Sign out other test sessions" })
        .click();
      await browserExpect(page.getByRole("status")).toHaveText(
        "Other test sessions revoked.",
      );
      await page.getByRole("button", { name: "Sign out", exact: true }).click();
      await browserExpect(
        page.getByRole("heading", { name: "Sign in to the account lab" }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Sign in with a test passkey" })
        .click();
      await browserExpect(
        page.getByRole("heading", { name: "Your test account" }),
      ).toBeVisible();
      expect(
        await page.evaluate(() => ({
          local: localStorage.length,
          session: sessionStorage.length,
          overflow: document.documentElement.scrollWidth > innerWidth,
        })),
      ).toEqual({ local: 0, session: 0, overflow: false });
      expect(external).toEqual([]);
    } finally {
      await browser.close();
    }
  },
  20000,
);

it.skipIf(!enabled)(
  "registers and signs in with a browser virtual passkey, rejecting replay",
  async () => {
    const email = "passkey@example.test";
    expect(
      (
        await call("email-otp/send-verification-otp", {
          email,
          type: "sign-in",
        })
      ).status,
    ).toBe(200);
    const login = await call("sign-in/email-otp", {
      email,
      otp: messages.at(-1)!.otp,
    });
    expect(login.status).toBe(200);
    const browser = await chromium.launch();
    try {
      const context = await browser.newContext();
      await context.addCookies(
        login.headers.getSetCookie().map((value) => {
          const pair = value.split(";")[0],
            separator = pair.indexOf("=");
          return {
            name: pair.slice(0, separator),
            value: pair.slice(separator + 1),
            url: origin,
            httpOnly: true,
            sameSite: "Lax" as const,
          };
        }),
      );
      const page = await context.newPage();
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
      await page.goto(`${origin}/?account-lab=1`);
      const results = await page.evaluate(async () => {
        const post = (path: string, body: object) =>
          fetch(`/api/auth/${path}`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          });
        const options = await (
          await fetch("/api/auth/passkey/generate-register-options")
        ).json();
        const credential = (await navigator.credentials.create({
          publicKey: PublicKeyCredential.parseCreationOptionsFromJSON(options),
        })) as PublicKeyCredential;
        const registration = await post("passkey/verify-registration", {
          response: credential.toJSON(),
          name: "Synthetic virtual passkey",
        });
        const registrationStatus = registration.status;
        const registrationReplay = await post("passkey/verify-registration", {
          response: credential.toJSON(),
          name: "Replay",
        });
        await post("sign-out", {});
        const request = await (
          await fetch("/api/auth/passkey/generate-authenticate-options")
        ).json();
        const assertion = (await navigator.credentials.get({
          publicKey: PublicKeyCredential.parseRequestOptionsFromJSON(request),
        })) as PublicKeyCredential;
        const signedIn = await post("passkey/verify-authentication", {
          response: assertion.toJSON(),
        });
        const authenticationReplay = await post(
          "passkey/verify-authentication",
          { response: assertion.toJSON() },
        );
        const session = await (await fetch("/api/auth/get-session")).json();
        return {
          registrationStatus,
          registrationReplay: registrationReplay.status,
          signIn: signedIn.status,
          authenticationReplay: authenticationReplay.status,
          email: session?.user.email,
        };
      });
      expect(results.registrationStatus).toBe(200);
      expect(results.registrationReplay).not.toBe(200);
      expect(results.signIn).toBe(200);
      expect(results.authenticationReplay).not.toBe(200);
      expect(results.email).toBe(email);
      expect(
        (
          await pool.query(
            'SELECT p."credentialID" FROM passkey p JOIN "user" u ON u.id=p."userId" WHERE u.email=$1',
            [email],
          )
        ).rowCount,
      ).toBe(1);
    } finally {
      await browser.close();
    }
  },
  20000,
);

it.skipIf(!enabled)(
  "consumes one code once under simultaneous requests",
  async () => {
    const email = "concurrent@example.test";
    expect(
      (
        await call("email-otp/send-verification-otp", {
          email,
          type: "sign-in",
        })
      ).status,
    ).toBe(200);
    const otp = messages.at(-1)!.otp;
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        call("sign-in/email-otp", { email, otp }),
      ),
    );
    expect(results.filter((result) => result.status === 200)).toHaveLength(1);
    expect(
      (await pool.query('SELECT id FROM "user" WHERE email=$1', [email]))
        .rowCount,
    ).toBe(1);
  },
);

it.skipIf(!enabled)(
  "expires codes, bounds wrong guesses, and rotates resends",
  async () => {
    const email = "expiry@example.test";
    expect(
      (
        await call("email-otp/send-verification-otp", {
          email,
          type: "sign-in",
        })
      ).status,
    ).toBe(200);
    const expired = messages.at(-1)!.otp;
    await pool.query(
      "UPDATE verification SET \"expiresAt\"=NOW() - interval '1 second'",
    );
    expect(
      (await call("sign-in/email-otp", { email, otp: expired })).status,
    ).not.toBe(200);
    expect(
      (
        await call("email-otp/send-verification-otp", {
          email,
          type: "sign-in",
        })
      ).status,
    ).toBe(200);
    const replaced = messages.at(-1)!.otp;
    expect(
      (
        await call("email-otp/send-verification-otp", {
          email,
          type: "sign-in",
        })
      ).status,
    ).toBe(200);
    const current = messages.at(-1)!.otp;
    expect(current).not.toBe(replaced);
    expect(
      (await call("sign-in/email-otp", { email, otp: replaced })).status,
    ).not.toBe(200);
    const wrong = current === "00000000" ? "11111111" : "00000000";
    for (let i = 0; i < 3; i++)
      expect(
        (await call("sign-in/email-otp", { email, otp: wrong })).status,
      ).not.toBe(200);
    expect(
      (await call("sign-in/email-otp", { email, otp: current })).status,
    ).not.toBe(200);
  },
);

it.skipIf(!enabled)(
  "shares send limits across instances and ignores spoofed forwarding addresses",
  async () => {
    const peerPool = new Pool({
      connectionString,
      options: `-c search_path=${schema}`,
    });
    const original = lab;
    try {
      const email = "limited@example.test";
      for (let i = 0; i < 3; i++)
        expect(
          (
            await call("email-otp/send-verification-otp", {
              email,
              type: "sign-in",
            })
          ).status,
        ).toBe(200);
      lab = createSyntheticAccountAuth({
        origin,
        secret,
        database: peerPool,
        deliverCode: async (message) => {
          messages.push(message);
        },
      });
      const response = await call(
        "email-otp/send-verification-otp",
        { email, type: "sign-in" },
        undefined,
        {
          "x-forwarded-for": "203.0.113.90",
          "x-privateai-client-ip": "203.0.113.91",
        },
      );
      expect(response.status).toBe(429);
    } finally {
      lab = original;
      await peerPool.end();
    }
  },
);

it.skipIf(!enabled)(
  "revokes another session across instances without revoking the current session",
  async () => {
    const email = "sessions@example.test";
    async function signIn() {
      expect(
        (
          await call("email-otp/send-verification-otp", {
            email,
            type: "sign-in",
          })
        ).status,
      ).toBe(200);
      const response = await call("sign-in/email-otp", {
        email,
        otp: messages.at(-1)!.otp,
      });
      expect(response.status).toBe(200);
      return cookieFrom(response);
    }
    const first = await signIn(),
      second = await signIn();
    expect((await call("revoke-other-sessions", {}, second)).status).toBe(200);
    const peerPool = new Pool({
      connectionString,
      options: `-c search_path=${schema}`,
    });
    try {
      const peer = createSyntheticAccountAuth({
        origin,
        secret,
        database: peerPool,
        deliverCode: async () => {},
      });
      expect(
        await peer.auth.api.getSession({
          headers: new Headers({ cookie: first }),
        }),
      ).toBeNull();
      expect(
        (
          await peer.auth.api.getSession({
            headers: new Headers({ cookie: second }),
          })
        )?.user.email,
      ).toBe(email);
    } finally {
      await peerPool.end();
    }
  },
);

it.skipIf(!enabled)(
  "persists verified sign-in across adapter restart, rejects replay and revokes sessions",
  async () => {
    const email = "alice@example.test";
    expect(
      (
        await call("email-otp/send-verification-otp", {
          email,
          type: "sign-in",
        })
      ).status,
    ).toBe(200);
    const otp = messages.at(-1)!.otp;
    const stored = await pool.query("SELECT value FROM verification");
    expect(stored.rows.some((row) => String(row.value).includes(otp))).toBe(
      false,
    );
    expect(
      (await call("sign-in/email-otp", { email, otp: "00000000" })).status,
    ).toBe(400);
    const response = await call("sign-in/email-otp", { email, otp });
    expect(response.status).toBe(200);
    const cookie = cookieFrom(response);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect((await response.json()).user.emailVerified).toBe(true);
    expect((await call("sign-in/email-otp", { email, otp })).status).not.toBe(
      200,
    );
    const previous = await (
      await call("get-session", undefined, cookie)
    ).json();
    expect(previous.user.email).toBe(email);
    // Rebuild the integration with a separate connection pool, preserving its signing key.
    await pool.end();
    pool = new Pool({ connectionString, options: `-c search_path=${schema}` });
    lab = createSyntheticAccountAuth({
      origin,
      secret,
      database: pool,
      deliverCode: async (message) => {
        messages.push(message);
      },
    });
    const restored = await (
      await call("get-session", undefined, cookie)
    ).json();
    expect(restored.user.id).toBe(previous.user.id);
    expect((await call("sign-out", {}, cookie)).status).toBe(200);
    expect(
      await (await call("get-session", undefined, cookie)).json(),
    ).toBeNull();
    expect(migrationSQL).toContain("session");
    expect(migrationSQL).toContain("passkey");
  },
);

it.skipIf(!enabled)(
  "rejects non-synthetic email, hostile origin, unconfigured social login and unauthenticated passkey setup",
  async () => {
    const before = messages.length;
    expect(
      (
        await call("email-otp/send-verification-otp", {
          email: "person@example.com",
          type: "sign-in",
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await call(
          "email-otp/send-verification-otp",
          { email: "bob@example.test", type: "sign-in" },
          undefined,
          { origin: "https://attacker.test" },
        )
      ).status,
    ).toBe(403);
    expect(messages.length).toBe(before);
    expect(
      (
        await call("sign-in/social", {
          provider: "google",
          callbackURL: origin,
        })
      ).status,
    ).not.toBe(200);
    expect((await call("passkey/generate-register-options")).status).not.toBe(
      200,
    );
    expect(
      (
        await call("sign-up/email", {
          email: "bob@example.test",
          password: "synthetic-password-123",
          name: "Bob",
        })
      ).status,
    ).not.toBe(200);
  },
);

it.skipIf(!enabled)(
  "enforces unique social ownership in PostgreSQL and refuses insecure lab origins",
  async () => {
    const users = (
      await pool.query(
        'INSERT INTO "user" (name,email,"emailVerified") VALUES ($1,$2,true),($3,$4,true) RETURNING id',
        [
          "Synthetic A",
          "ownership-a@example.test",
          "Synthetic B",
          "ownership-b@example.test",
        ],
      )
    ).rows;
    expect(users).toHaveLength(2);
    const insert =
      'INSERT INTO account ("accountId", "providerId", "userId", "updatedAt") VALUES($1,$2,$3,NOW())';
    await pool.query(insert, ["synthetic-subject", "google", users[0].id]);
    await expect(
      pool.query(insert, ["synthetic-subject", "google", users[1].id]),
    ).rejects.toMatchObject({ code: "23505" });
    const config = { secret, database: pool, deliverCode: async () => {} };
    for (const unsafe of [
      "https://production.example",
      "http://localhost.attacker.test",
      "http://127.0.0.1:4182",
      "http://localhost/path",
    ])
      expect(() =>
        createSyntheticAccountAuth({ ...config, origin: unsafe }),
      ).toThrow();
  },
);
