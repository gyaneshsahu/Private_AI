import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { createServer, request as httpsRequest } from "node:https";
import { request as httpRequest, type Server } from "node:http";
import express from "express";
import { createProductionAccountCandidate } from "../server/account-auth";
import { applyAccountMigrations } from "../server/account-migrations";
import { productionAccountTarget } from "../shared/account-design";
import { usageDatabase } from "./fixtures/usage-postgres";
import { localTLS } from "./fixtures/local-tls";

const enabled = !!process.env.PRIVATEAI_SYNTHETIC_PG;
const origin = productionAccountTarget.origin;
let db: Awaited<ReturnType<typeof usageDatabase>>;
let tls: Awaited<ReturnType<typeof localTLS>>;
let secure: Server, plain: Server;
let secureURL: string, plainURL: string;
let candidate: ReturnType<typeof createProductionAccountCandidate>;
const secret = randomBytes(48).toString("base64url");
const codes = new Map<string, string>();

function makeCandidate() {
  return createProductionAccountCandidate({
    database: db.pool,
    secret,
    deliverCode: async ({ email, otp }) => {
      if (!email.endsWith("@example.test")) throw Error("Synthetic sink only");
      if (email === "delivery-failure@example.test")
        throw Error("supplier-secret-key delivery-failure@example.test");
      codes.set(email, otp);
    },
  });
}
beforeAll(async () => {
  if (!enabled) return;
  db = await usageDatabase({ empty: true });
  await applyAccountMigrations(db.pool);
  tls = await localTLS();
  candidate = makeCandidate();
  const app = express();
  // Production boundary must ignore Express proxy trust and caller-supplied headers.
  app.set("trust proxy", true);
  app.use((req, res, next) => candidate.router(req, res, next));
  secure = createServer({ key: tls.key, cert: tls.cert }, app);
  plain = app.listen(0, "127.0.0.1");
  secure.listen(0, "127.0.0.1");
  for (const server of [secure, plain]) {
    if (!server.listening)
      await new Promise<void>((done) => server.once("listening", done));
  }
  const address = (server: Server) => {
    const value = server.address();
    if (!value || typeof value === "string") throw Error("No test listener");
    return value.port;
  };
  secureURL = `https://localhost:${address(secure)}`;
  plainURL = `http://localhost:${address(plain)}`;
}, 20_000);

beforeEach(async () => {
  if (enabled) await db.pool.query('DELETE FROM "rateLimit"');
});
afterAll(async () => {
  for (const server of [secure, plain]) {
    if (server) await new Promise<void>((done) => server.close(() => done()));
  }
  await tls?.dispose();
  await db?.dispose();
});

function call(
  path: string,
  body?: object,
  cookie = "",
  headers: Record<string, string> = {},
  base = secureURL,
) {
  const url = new URL(base);
  // Connect only to the ephemeral loopback listener; Host tests must never resolve the public domain.
  return new Promise<Response>((resolve, reject) => {
    const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(
      {
        hostname: "127.0.0.1",
        port: url.port,
        path: `/api/${path}`,
        servername: "localhost",
        ca: tls.cert,
        // Synthetic loopback fixture only. Windows antivirus replaces self-signed
        // certificates here; these tests do not establish public TLS trust.
        rejectUnauthorized: false,
        method: body ? "POST" : "GET",
        headers: {
          host: "app.cometrow.com",
          origin,
          cookie,
          ...(body ? { "content-type": "application/json" } : {}),
          ...headers,
        },
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        response.on("error", reject);
        response.on("end", () => {
          const headers = new Headers();
          for (let i = 0; i < response.rawHeaders.length; i += 2)
            headers.append(response.rawHeaders[i], response.rawHeaders[i + 1]);
          resolve(
            new Response(Buffer.concat(chunks), {
              status: response.statusCode,
              headers,
            }),
          );
        });
      },
    );
    request.on("error", reject);
    request.end(body ? JSON.stringify(body) : undefined);
  });
}
async function signIn(email: string) {
  expect(
    (
      await call("auth/email-otp/send-verification-otp", {
        email,
        type: "sign-in",
      })
    ).status,
  ).toBe(200);
  const response = await call("auth/sign-in/email-otp", {
    email,
    otp: codes.get(email),
  });
  expect(response.status).toBe(200);
  const cookie = response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  return { response, cookie };
}

it.skipIf(!enabled)(
  "rejects HTTP and spoofed TLS/host/origin before touching accounts",
  async () => {
    for (const headers of [
      {},
      { "x-forwarded-proto": "https", "x-forwarded-host": "app.cometrow.com" },
    ] as Record<string, string>[]) {
      expect(
        (await call("account/options", undefined, "", headers, plainURL))
          .status,
      ).toBe(403);
    }
    for (const headers of [
      { host: "other.example.test" },
      { origin: "https://other.example.test" },
      { "sec-fetch-site": "cross-site" },
    ] as Record<string, string>[])
      expect(
        (await call("account/options", undefined, "", headers)).status,
      ).toBe(403);
    const response = await call("account/options");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      synthetic: false,
      workspaceEnabled: false,
      emailEnabled: true,
      socialProviders: [],
    });
  },
);

it.skipIf(!enabled)(
  "uses separate secure host-only cookies and persists sign-in across reconstruction",
  async () => {
    const { response, cookie } = await signIn("production-cookie@example.test");
    const cookies = response.headers.getSetCookie();
    const sessionCookie = cookies.find((value) =>
      value.startsWith("__Secure-privateai-account.session_token="),
    );
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie).toMatch(/; Secure/i);
    expect(sessionCookie).toMatch(/; HttpOnly/i);
    expect(sessionCookie).toMatch(/; SameSite=Lax/i);
    expect(sessionCookie).not.toMatch(/; Domain=/i);
    expect(cookie).not.toContain("account-lab");
    candidate = makeCandidate();
    const current = await call("auth/get-session", undefined, cookie);
    expect(
      ((await current.json()) as { user: { email: string } }).user.email,
    ).toBe("production-cookie@example.test");
    const rows = await db.pool.query(
      'SELECT "ipAddress","userAgent" FROM session',
    );
    expect(
      rows.rows.every(
        (row) => row.ipAddress === null && row.userAgent === null,
      ),
    ).toBe(true);
    const options = await call(
      "auth/passkey/generate-register-options",
      undefined,
      cookie,
    );
    expect(options.status).toBe(200);
    const registration = (await options.json()) as {
      rp: { id: string };
      authenticatorSelection: { userVerification: string };
    };
    expect(registration.rp.id).toBe("app.cometrow.com");
    expect(registration.authenticatorSelection.userVerification).toBe(
      "required",
    );
  },
);

it.skipIf(!enabled)(
  "recovers sign-in by revoking other sessions and queues one notice without recovering a vault",
  async () => {
    const email = "production-recovery@example.test";
    const old = await signIn(email);
    const current = await signIn(email);
    expect((await call("auth/get-session", undefined, old.cookie)).status).toBe(
      200,
    );
    const recovered = await call(
      "account/recovery/complete",
      {},
      current.cookie,
    );
    expect(recovered.status).toBe(200);
    expect(await recovered.json()).toEqual({
      outcome: "completed",
      notification: "queued",
      credentialsReset: false,
      vaultRecovered: false,
    });
    expect(
      await (await call("auth/get-session", undefined, old.cookie)).json(),
    ).toBeNull();
    expect(
      await (
        await call("account/recovery/complete", {}, current.cookie)
      ).json(),
    ).toMatchObject({ outcome: "already-completed" });
    const notices = await db.pool.query(
      'SELECT "deliveryState" FROM account_security_event WHERE "recipientEmail"=$1',
      [email],
    );
    expect(notices.rows).toEqual([{ deliveryState: "pending" }]);
  },
);

it.skipIf(!enabled)(
  "rejects unimplemented library operations and cross-origin redirects",
  async () => {
    const { cookie } = await signIn("production-operations@example.test");
    for (const path of [
      "update-user",
      "change-email",
      "delete-user",
      "unlink-account",
      "list-sessions",
      "revoke-session",
      "sign-in/social",
      "link-social",
      "email-otp/verify-email",
      "email-otp/request-password-reset",
      "passkey/delete-passkey",
    ]) {
      const response = await call(`auth/${path}`, {}, cookie);
      expect(response.status, path).toBe(403);
    }
    const count = codes.size;
    expect(
      (
        await call("auth/email-otp/send-verification-otp", {
          email: "production-operations@example.test",
          type: "email-verification",
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await call("auth/email-otp/send-verification-otp", {
          email: "production-operations@example.test",
          type: "sign-in",
          callbackURL: "https://evil.example.test/",
        })
      ).status,
    ).toBe(403);
    expect(codes.size).toBe(count);
  },
);

it.skipIf(!enabled)(
  "returns a sanitized delivery failure without creating an authenticated account",
  async () => {
    const response = await call("auth/email-otp/send-verification-otp", {
      email: "delivery-failure@example.test",
      type: "sign-in",
    });
    expect(response.status).toBe(503);
    const text = await response.text();
    expect(text).toContain("delivery could not be confirmed");
    expect(text).not.toContain("supplier-secret-key");
    expect(text).not.toContain("delivery-failure@example.test");
    expect(response.headers.getSetCookie()).toHaveLength(0);
    expect(
      (
        await db.pool.query('SELECT 1 FROM "user" WHERE email=$1', [
          "delivery-failure@example.test",
        ])
      ).rowCount,
    ).toBe(0);
  },
);

it.skipIf(!enabled)(
  "isolates concurrent delivery results and forbids direct API bypass of the HTTP boundary",
  async () => {
    const [failed, accepted] = await Promise.all([
      call("auth/email-otp/send-verification-otp", {
        email: "delivery-failure@example.test",
        type: "sign-in",
      }),
      call("auth/email-otp/send-verification-otp", {
        email: "parallel@example.test",
        type: "sign-in",
      }),
    ]);
    expect(failed.status).toBe(503);
    expect(accepted.status).toBe(200);
    await expect(
      candidate.auth.api.sendVerificationOTP({
        body: { email: "bypass@example.test", type: "sign-in" },
      }),
    ).rejects.toThrow("HTTP boundary");
    expect(codes.has("bypass@example.test")).toBe(false);
  },
);

it.skipIf(!enabled)(
  "requires production closure confirmation and keeps closed accounts and restore quarantine blocked",
  async () => {
    const email = "production-closure@example.test";
    const { cookie } = await signIn(email);
    expect(
      (
        await call(
          "account/close",
          { confirmation: "DELETE TEST ACCOUNT" },
          cookie,
        )
      ).status,
    ).toBe(400);
    expect(
      await (
        await call("account/close", { confirmation: "DELETE ACCOUNT" }, cookie)
      ).json(),
    ).toEqual({ outcome: "closed" });
    expect(
      await (await call("auth/get-session", undefined, cookie)).json(),
    ).toBeNull();
    expect(
      (
        await call("auth/email-otp/send-verification-otp", {
          email,
          type: "sign-in",
        })
      ).status,
    ).toBe(403);
    await db.pool.query(
      "UPDATE account_recovery_control SET mode='quarantined'",
    );
    try {
      expect((await call("account/options")).status).toBe(503);
      expect(
        (
          await call("auth/email-otp/send-verification-otp", {
            email: "quarantine@example.test",
            type: "sign-in",
          })
        ).status,
      ).toBe(503);
      expect(codes.has("quarantine@example.test")).toBe(false);
    } finally {
      // This is only the disposable test schema, never an application activation route.
      await db.pool.query("UPDATE account_recovery_control SET mode='normal'");
    }
  },
);
