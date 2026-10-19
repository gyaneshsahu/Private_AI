import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { Pool } from "pg";
import {
  createHash,
  generateKeyPairSync,
  randomBytes,
  randomUUID,
  sign,
} from "node:crypto";
import { readFile } from "node:fs/promises";
import type { Server } from "node:http";
import express from "express";
import { createSyntheticAccountAuth } from "../server/account-auth";

const connectionString = process.env.PRIVATEAI_SYNTHETIC_PG;
const schema = `social_test_${randomUUID().replaceAll("-", "")}`;
const nativeFetch = globalThis.fetch;
const keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = {
  ...keys.publicKey.export({ format: "jwk" }),
  kid: "synthetic",
  alg: "RS256",
  use: "sig",
};
type Provider = "google" | "apple";
type Flow = { provider: Provider; url: URL; cookie: string };
type TokenFixture = {
  flow: Flow;
  claims: Record<string, unknown>;
  badSignature?: boolean;
  omitToken?: boolean;
};
const codes = new Map<string, TokenFixture>();
let admin: Pool, pool: Pool, server: Server, origin: string;
let exchanges = 0;
let discoveryHasKeys = true;
const blocked: string[] = [];

const cookieFrom = (response: Response) =>
  response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
const mergeCookies = (...values: string[]) =>
  [
    ...new Map(
      values
        .flatMap((value) => value.split("; ").filter(Boolean))
        .map((value) => [value.slice(0, value.indexOf("=")), value]),
    ).values(),
  ].join("; ");
const call = (path: string, body?: object, cookie = "") =>
  fetch(`${origin}/api/auth/${path}`, {
    method: body ? "POST" : "GET",
    redirect: "manual",
    headers: {
      origin,
      cookie,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

beforeAll(async () => {
  if (!connectionString) return;
  const databaseURL = new URL(connectionString);
  if (
    !["localhost", "127.0.0.1"].includes(databaseURL.hostname) ||
    databaseURL.pathname !== "/privateai_synthetic"
  )
    throw Error("Only the named local synthetic database may be tested.");
  admin = new Pool({ connectionString });
  await admin.query(`CREATE SCHEMA "${schema}"`);
  pool = new Pool({ connectionString, options: `-c search_path=${schema}` });
  for (const file of [
    "0001-consumer-auth.sql",
    "0002-account-uniqueness.sql",
    "0003-account-security-events.sql",
  ])
    await pool.query(await readFile(`server/migrations/${file}`, "utf8"));
  const app = express();
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw Error("No test listener");
  origin = `http://localhost:${address.port}`;
  vi.stubGlobal(
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      if (url.origin === origin) return nativeFetch(input, init);
      if (
        [
          "https://accounts.google.com/.well-known/openid-configuration",
          "https://appleid.apple.com/.well-known/openid-configuration",
        ].includes(url.href)
      ) {
        const google = url.hostname === "accounts.google.com";
        return Response.json({
          issuer: google
            ? "https://accounts.google.com"
            : "https://appleid.apple.com",
          authorization_endpoint: google
            ? "https://accounts.google.com/o/oauth2/v2/auth"
            : "https://appleid.apple.com/auth/authorize",
          token_endpoint: google
            ? "https://oauth2.googleapis.com/token"
            : "https://appleid.apple.com/auth/token",
          jwks_uri: !discoveryHasKeys
            ? undefined
            : google
              ? "https://www.googleapis.com/oauth2/v3/certs"
              : "https://appleid.apple.com/auth/keys",
          id_token_signing_alg_values_supported: ["RS256"],
        });
      }
      if (
        [
          "https://www.googleapis.com/oauth2/v3/certs",
          "https://appleid.apple.com/auth/keys",
        ].includes(url.href)
      )
        return Response.json({ keys: [jwk] });
      if (
        [
          "https://oauth2.googleapis.com/token",
          "https://appleid.apple.com/auth/token",
        ].includes(url.href)
      ) {
        exchanges++;
        const body = new URLSearchParams(String(init?.body));
        const code = body.get("code") ?? "";
        const fixture = codes.get(code);
        codes.delete(code);
        if (!fixture)
          return Response.json({ error: "invalid_grant" }, { status: 400 });
        const { flow } = fixture;
        expect(url.href).toBe(
          flow.provider === "google"
            ? "https://oauth2.googleapis.com/token"
            : "https://appleid.apple.com/auth/token",
        );
        expect(body.get("redirect_uri")).toBe(
          `${origin}/api/auth/callback/${flow.provider}`,
        );
        expect(body.get("client_id")).toBe(
          `privateai-synthetic-${flow.provider}`,
        );
        expect(
          createHash("sha256")
            .update(body.get("code_verifier") ?? "")
            .digest("base64url"),
        ).toBe(flow.url.searchParams.get("code_challenge"));
        const encoded = [{ alg: "RS256", kid: "synthetic" }, fixture.claims]
          .map((value) =>
            Buffer.from(JSON.stringify(value)).toString("base64url"),
          )
          .join(".");
        const signature = sign(
          "RSA-SHA256",
          Buffer.from(encoded),
          keys.privateKey,
        );
        if (fixture.badSignature) signature[0] ^= 1;
        return Response.json({
          access_token: "synthetic-access",
          refresh_token: "synthetic-refresh",
          token_type: "Bearer",
          expires_in: 3600,
          ...(fixture.omitToken
            ? {}
            : { id_token: `${encoded}.${signature.toString("base64url")}` }),
        });
      }
      blocked.push(url.origin);
      throw Error("External network is disabled in synthetic OAuth tests.");
    },
  );
  app.use(
    createSyntheticAccountAuth({
      origin,
      secret: randomBytes(48).toString("base64url"),
      database: pool,
      socialFixtures: true,
      deliverCode: async () => {
        throw Error("No email delivery in OAuth fixtures");
      },
    }).router,
  );
}, 20000);

beforeEach(async () => {
  if (pool) await pool.query('DELETE FROM "rateLimit"');
});

it.skipIf(!connectionString)(
  "does not register OIDC providers without verification metadata",
  async () => {
    discoveryHasKeys = false;
    try {
      const isolated = createSyntheticAccountAuth({
        origin,
        secret: randomBytes(48).toString("base64url"),
        database: pool,
        socialFixtures: true,
        deliverCode: async () => {},
      });
      const count = exchanges;
      for (const provider of ["google", "apple"]) {
        const response = await isolated.auth.handler(
          new Request(`${origin}/api/auth/sign-in/social`, {
            method: "POST",
            headers: { origin, "content-type": "application/json" },
            body: JSON.stringify({
              provider,
              callbackURL: `${origin}/`,
              disableRedirect: true,
            }),
          }),
        );
        expect(response.status).toBe(404);
      }
      expect(exchanges).toBe(count);
    } finally {
      discoveryHasKeys = true;
    }
  },
);
afterAll(async () => {
  vi.unstubAllGlobals();
  if (server)
    await new Promise<void>((resolve) => server.close(() => resolve()));
  if (pool) await pool.end();
  if (admin) {
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.end();
  }
  expect(blocked).toEqual([]);
});

async function begin(
  provider: Provider,
  cookie = "",
  link = false,
): Promise<Flow> {
  const response = await call(
    link ? "link-social" : "sign-in/social",
    {
      provider,
      callbackURL: `${origin}/`,
      disableRedirect: true,
    },
    cookie,
  );
  expect(response.status).toBe(200);
  const url = new URL((await response.json()).url);
  expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  expect(url.searchParams.get("nonce")).toBeTruthy();
  expect(url.searchParams.get("scope")?.split(" ").sort()).toEqual([
    "email",
    "openid",
  ]);
  return { provider, url, cookie: mergeCookies(cookie, cookieFrom(response)) };
}

function prepare(
  flow: Flow,
  email: string,
  overrides: Record<string, unknown> = {},
  badSignature = false,
  omitToken = false,
) {
  const code = randomUUID();
  const now = Math.floor(Date.now() / 1000);
  codes.set(code, {
    flow,
    badSignature,
    omitToken,
    claims: {
      iss:
        flow.provider === "google"
          ? "https://accounts.google.com"
          : "https://appleid.apple.com",
      aud: `privateai-synthetic-${flow.provider}`,
      sub: `${flow.provider}-${email}`,
      email,
      email_verified: true,
      name: "Synthetic account",
      iat: now,
      exp: now + 3600,
      nonce: flow.url.searchParams.get("nonce"),
      ...overrides,
    },
  });
  return new URL(
    `${origin}/api/auth/callback/${flow.provider}?${new URLSearchParams({ code, state: flow.url.searchParams.get("state")! })}`,
  );
}

const callback = (url: URL, cookie: string) =>
  fetch(url, {
    redirect: "manual",
    headers: { cookie, "sec-fetch-site": "cross-site" },
  });
function successful(response: Response) {
  expect(response.status).toBe(302);
  expect(response.headers.get("location")).toBe(`${origin}/`);
}
function rejected(response: Response) {
  expect(response.headers.get("location")).toContain("error=");
  expect(cookieFrom(response)).not.toMatch(/session_token=[^;\s]+/);
}

it.skipIf(!connectionString)(
  "verifies Google code, PKCE and nonce, persists session and rejects callback replay",
  async () => {
    const flow = await begin("google");
    const url = prepare(flow, "google@example.test");
    const response = await callback(url, flow.cookie);
    successful(response);
    const cookie = cookieFrom(response);
    expect(
      (await (await call("get-session", undefined, cookie)).json()).user.email,
    ).toBe("google@example.test");
    const account = (
      await pool.query("SELECT * FROM account WHERE \"providerId\"='google'")
    ).rows[0];
    expect(account.accessToken).not.toBe("synthetic-access");
    expect(account.refreshToken).not.toBe("synthetic-refresh");
    const count = exchanges;
    rejected(await callback(url, flow.cookie));
    expect(exchanges).toBe(count);
  },
);

it.skipIf(!connectionString)(
  "accepts Apple's form POST then verified GET and string email verification",
  async () => {
    const flow = await begin("apple");
    const url = prepare(flow, "relay@example.test", { email_verified: "true" });
    const response = await fetch(`${origin}/api/auth/callback/apple`, {
      method: "POST",
      redirect: "manual",
      headers: {
        origin: "https://appleid.apple.com",
        "sec-fetch-site": "cross-site",
        "content-type": "application/x-www-form-urlencoded",
      },
      body: url.searchParams.toString(),
    });
    expect(response.status).toBe(302);
    const result = await callback(
      new URL(response.headers.get("location")!),
      flow.cookie,
    );
    successful(result);
    expect(
      (await (await call("get-session", undefined, cookieFrom(result))).json())
        .user.email,
    ).toBe("relay@example.test");
  },
);

it.skipIf(!connectionString)(
  "rejects missing cookies, wrong state, unsafe redirects and direct token sign-in",
  async () => {
    const flow = await begin("google");
    const url = prepare(flow, "state@example.test");
    const count = exchanges;
    rejected(await callback(url, ""));
    url.searchParams.set("state", "invented-state");
    rejected(await callback(url, flow.cookie));
    expect(exchanges).toBe(count);
    expect(
      (
        await call("sign-in/social", {
          provider: "google",
          callbackURL: "https://untrusted.test/",
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await call("sign-in/social", {
          provider: "google",
          idToken: { token: "invented" },
        })
      ).status,
    ).toBe(400);
  },
);

for (const provider of ["google", "apple"] as const) {
  it.skipIf(!connectionString)(
    `${provider} rejects signature, issuer, audience, expiry, nonce and unverified/real identities`,
    async () => {
      const cases: {
        claims: Record<string, unknown>;
        badSignature?: boolean;
        omitToken?: boolean;
      }[] = [
        { claims: {}, badSignature: true },
        { claims: {}, omitToken: true },
        { claims: { iss: "https://untrusted.test" } },
        { claims: { aud: "wrong-client" } },
        { claims: { exp: 1 } },
        { claims: { nonce: "wrong-nonce" } },
        { claims: { email_verified: false } },
        { claims: { email: "not-synthetic@example.com" } },
      ];
      for (const [i, item] of cases.entries()) {
        await pool.query('DELETE FROM "rateLimit"');
        const flow = await begin(provider);
        const response = await callback(
          prepare(
            flow,
            `${provider}-bad-${i}@example.test`,
            item.claims,
            item.badSignature,
            item.omitToken,
          ),
          flow.cookie,
        );
        rejected(response);
      }
      expect(
        (
          await pool.query(
            'SELECT count(*)::int n FROM "user" WHERE email LIKE $1',
            [`${provider}-bad-%`],
          )
        ).rows[0].n,
      ).toBe(0);
    },
  );
}

it.skipIf(!connectionString)(
  "requires explicit fresh linking and rechecks its original session at callback",
  async () => {
    const email = "link@example.test";
    const google = await begin("google");
    const loggedIn = await callback(prepare(google, email), google.cookie);
    successful(loggedIn);
    const sessionCookie = cookieFrom(loggedIn);
    const session = await (
      await call("get-session", undefined, sessionCookie)
    ).json();
    const implicit = await begin("apple");
    rejected(await callback(prepare(implicit, email), implicit.cookie));
    const explicit = await begin("apple", sessionCookie, true);
    successful(await callback(prepare(explicit, email), explicit.cookie));
    expect(
      (
        await pool.query(
          'SELECT count(*)::int n FROM account WHERE "userId"=$1',
          [session.user.id],
        )
      ).rows[0].n,
    ).toBe(2);
    const pending = await begin("apple", sessionCookie, true);
    const pendingURL = prepare(pending, email);
    await call("sign-out", {}, sessionCookie);
    rejected(await callback(pendingURL, pending.cookie));
    expect(
      (await call("link-social", { provider: "apple" }, sessionCookie)).status,
    ).toBe(403);
    const again = await begin("google");
    const newCookie = cookieFrom(
      await callback(prepare(again, email), again.cookie),
    );
    await pool.query(
      'UPDATE session SET "createdAt"=NOW()-interval \'6 minutes\' WHERE "userId"=$1',
      [session.user.id],
    );
    expect(
      (await call("link-social", { provider: "apple" }, newCookie)).status,
    ).toBe(403);
  },
);
