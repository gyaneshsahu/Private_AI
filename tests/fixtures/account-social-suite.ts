import { workspaceControl } from "../../evaluation/workspace-navigation";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { Pool } from "pg";
import {
  createHash,
  generateKeyPairSync,
  randomBytes,
  randomUUID,
  sign,
} from "node:crypto";
import { mkdir } from "node:fs/promises";
import type { Server } from "node:http";
import express from "express";
import { resolve } from "node:path";
import { chromium, expect as browserExpect } from "@playwright/test";
import {
  createSyntheticAccountAuth,
  createProductionAccountCandidate,
} from "../../server/account-auth";
import { applyAccountMigrations } from "../../server/account-migrations";
import { createProductionConsumerCandidate } from "../../server/consumer-workspace";
import { createServer, request as httpsRequest } from "node:https";
import { Agent, fetch as localFetch } from "undici";
import { localTLS } from "./local-tls";

export function accountSocialSuite(production = false) {
  const signingKey = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const credentials = {
    google: {
      clientId: "synthetic.apps.googleusercontent.com",
      clientSecret: "synthetic-google-secret-only",
    },
    apple: {
      clientId: "com.privateai.synthetic",
      teamId: "SYNTHETIC1",
      keyId: "SYNTHETIC2",
      privateKey: signingKey.privateKey
        .export({ format: "pem", type: "pkcs8" })
        .toString(),
    },
  };
  const clientId = (provider: "google" | "apple") =>
    production
      ? credentials[provider].clientId
      : `privateai-synthetic-${provider}`;
  let listenerOrigin: string;
  let activeRouter: express.Router;
  const connectionString = process.env.PRIVATEAI_SYNTHETIC_PG;
  const schema = `social_test_${randomUUID().replaceAll("-", "")}`;
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
  let tls: Awaited<ReturnType<typeof localTLS>>, localAgent: Agent;
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
    await applyAccountMigrations(pool);
    const app = express();
    tls = await localTLS();
    // Exact ephemeral localhost origin only; all external fetches are intercepted below.
    // This fixture tests OAuth/cookies, not TLS or the machine interception policy.
    localAgent = new Agent({ connect: { rejectUnauthorized: false } });
    server = createServer({ key: tls.key, cert: tls.cert }, app).listen(
      0,
      "127.0.0.1",
    );
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string")
      throw Error("No test listener");
    listenerOrigin = `https://localhost:${address.port}`;
    origin = production ? "https://app.cometrow.com" : listenerOrigin;
    vi.stubGlobal(
      "fetch",
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(
          input instanceof Request ? input.url : String(input),
        );
        if (url.origin === origin) {
          if (production)
            return new Promise<Response>((resolve, reject) => {
              const request = httpsRequest(
                {
                  hostname: "127.0.0.1",
                  port: new URL(listenerOrigin).port,
                  path: url.pathname + url.search,
                  method: init?.method ?? "GET",
                  servername: "localhost",
                  rejectUnauthorized: false,
                  headers: {
                    ...(init?.headers as Record<string, string>),
                    host: new URL(origin).host,
                  },
                },
                (response) => {
                  const chunks: Buffer[] = [];
                  response.on("data", (chunk) =>
                    chunks.push(Buffer.from(chunk)),
                  );
                  response.on("error", reject);
                  response.on("end", () => {
                    const headers = new Headers();
                    for (let i = 0; i < response.rawHeaders.length; i += 2)
                      headers.append(
                        response.rawHeaders[i],
                        response.rawHeaders[i + 1],
                      );
                    resolve(
                      new Response(
                        [204, 205, 304].includes(response.statusCode!)
                          ? null
                          : Buffer.concat(chunks),
                        { status: response.statusCode, headers },
                      ),
                    );
                  });
                },
              );
              request.on("error", reject);
              request.end(init?.body as string | undefined);
            });
          const response = await localFetch(
            new URL(url.pathname + url.search, listenerOrigin),
            {
              method: init?.method,
              body: init?.body as string | undefined,
              headers: {
                ...(init?.headers as Record<string, string>),
                host: new URL(origin).host,
              },
              redirect: init?.redirect,
              dispatcher: localAgent,
            },
          );
          const headers = new Headers();
          for (const [name, value] of response.headers)
            if (name !== "set-cookie") headers.append(name, value);
          for (const cookie of response.headers.getSetCookie())
            headers.append("set-cookie", cookie);
          return new Response(
            [204, 205, 304].includes(response.status)
              ? null
              : await response.arrayBuffer(),
            {
              status: response.status,
              headers,
            },
          );
        }
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
          expect(body.get("client_id")).toBe(clientId(flow.provider));
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
    const candidate = production
      ? createProductionConsumerCandidate({
          secret: randomBytes(48).toString("base64url"),
          database: pool,
          social: credentials,
          deliverCode: async () => {
            throw Error("No email delivery in OAuth fixtures");
          },
        })
      : createSyntheticAccountAuth({
          origin,
          secret: randomBytes(48).toString("base64url"),
          database: pool,
          socialFixtures: true,
          deliverCode: async () => {
            throw Error("No email delivery in OAuth fixtures");
          },
        });
    if ("ready" in candidate) {
      expect(await candidate.ready).toBe(true);
      activeRouter = candidate.app;
    } else activeRouter = candidate.router;
    app.use((req, res, next) => activeRouter(req, res, next));
    app.use(express.static(resolve("dist"), { index: false }));
    app.get(["/", "/account"], (_req, res) =>
      res.sendFile(resolve("dist/index.html")),
    );
  }, 20000);

  it.skipIf(!connectionString)(
    "completes Google sign-in, Apple linking and Apple sign-in through the built React UI",
    async () => {
      const browser = await chromium.launch(
        production
          ? {
              args: [
                "--no-proxy-server",
                `--host-resolver-rules=MAP app.cometrow.com 127.0.0.1:${new URL(listenerOrigin).port}, MAP * ~NOTFOUND`,
              ],
            }
          : {},
      );
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        // Isolated context only; routes below block every real external request.
        ignoreHTTPSErrors: true,
      });
      const unexpected: string[] = [];
      const errors: string[] = [];
      let cancelProvider = false;
      await context.route("**/*", async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.origin === origin) return route.continue();
        const provider =
          url.origin === "https://accounts.google.com"
            ? "google"
            : url.origin === "https://appleid.apple.com"
              ? "apple"
              : null;
        if (!provider || !request.isNavigationRequest()) {
          unexpected.push(url.origin);
          return route.abort();
        }
        const flow: Flow = { provider, url, cookie: "" };
        const destination = prepare(flow, "browser-social@example.test");
        if (cancelProvider) {
          destination.searchParams.delete("code");
          destination.searchParams.set("error", "access_denied");
        }
        const fields = [...destination.searchParams]
          .map(
            ([name, value]) =>
              `<input type="hidden" name="${name}" value="${value}">`,
          )
          .join("");
        await route.fulfill({
          contentType: "text/html",
          body: `<form method="${provider === "apple" ? "post" : "get"}" action="${destination.origin}${destination.pathname}">${fields}</form><script>document.forms[0].submit()</script>`,
        });
      });
      const page = await context.newPage();
      const callbackResults: unknown[] = [];
      page.on("response", (response) => {
        if (
          new URL(response.url()).pathname.startsWith("/api/auth/callback/")
        ) {
          const location = response.headers()["location"];
          callbackResults.push({
            method: response.request().method(),
            origin: response.request().headers()["origin"],
            site: response.request().headers()["sec-fetch-site"],
            status: response.status(),
            error: location
              ? new URL(location, origin).searchParams.get("error")
              : null,
          });
        }
      });
      page.on("pageerror", (error) => errors.push(error.message));
      try {
        await page.goto(
          production ? `${origin}/account` : `${origin}/?account-lab=1`,
        );
        await browserExpect(
          page.getByRole("button", { name: "Continue with Google" }),
        ).toBeVisible();
        await mkdir(".local/account-review", { recursive: true });
        await page.screenshot({
          path: ".local/account-review/sign-in.png",
          fullPage: true,
        });
        await page
          .getByRole("button", { name: "Continue with Google" })
          .click();
        await browserExpect(
          page.getByRole("heading", {
            name: production ? "Your account" : "Your test account",
            exact: true,
          }),
        ).toBeVisible();
        await browserExpect(
          page.getByRole("button", { name: "Connected to Google" }),
        ).toBeDisabled();
        await page
          .getByRole("button", { name: "Connect Apple", exact: true })
          .click();
        await browserExpect(
          page.getByRole("button", { name: "Connected to Apple" }),
        ).toBeDisabled();
        await page.screenshot({
          path: ".local/account-review/connected-account.png",
          fullPage: true,
        });
        await page
          .getByRole("button", { name: "Sign out", exact: true })
          .click();
        await page
          .getByRole("button", {
            name: production ? "Continue with Google" : "Continue with Apple",
          })
          .click();
        await browserExpect(
          page.getByRole("heading", {
            name: production ? "Your account" : "Your test account",
            exact: true,
          }),
        ).toBeVisible();
        await browserExpect(
          page.getByText("browser-social@example.test", { exact: true }),
        ).toBeVisible();
        await page.reload();
        await browserExpect(
          page.getByRole("button", { name: "Connected to Apple" }),
        ).toBeDisabled();
        if (production) {
          await page
            .getByRole("link", { name: "Open workspace", exact: true })
            .click();
          await page
            .getByLabel("Message PrivateAI")
            .fill("SYNTHETIC SOCIAL WORKSPACE DRAFT");
          await browserExpect(
            page.getByRole("button", { name: "Send ↑", exact: true }),
          ).toBeDisabled();
          await workspaceControl(page, "Account").click();
          page.once("dialog", (dialog) => dialog.accept());
          await page.getByRole("button", { name: /Manage sign-in/ }).click();
          await browserExpect(
            page.getByRole("heading", { name: "Your account", exact: true }),
          ).toBeVisible();
        }
        expect(
          await page.evaluate(() => ({
            local: Object.fromEntries(
              Object.keys(localStorage).map((key) => [
                key,
                localStorage.getItem(key),
              ]),
            ),
            session: sessionStorage.length,
            overflow: document.documentElement.scrollWidth > window.innerWidth,
          })),
        ).toEqual({
          // Only the production journey above opens the workspace, which persists
          // its appearance preference. Account-only visits make no storage write.
          local: production ? { "privateai.appearance": "system" } : {},
          session: 0,
          overflow: false,
        });
        await page
          .getByRole("button", { name: "Sign out", exact: true })
          .click();
        cancelProvider = true;
        await page
          .getByRole("button", { name: "Continue with Google" })
          .click();
        await browserExpect(page.getByRole("status")).toContainText(
          "did not complete",
        );
        expect(new URL(page.url()).searchParams.has("error")).toBe(false);
        expect(unexpected).toEqual([]);
        expect(errors).toEqual([]);
      } catch (error) {
        console.error({
          callbackResults,
          pageText: await page.locator("body").innerText(),
          errors,
        });
        throw error;
      } finally {
        await browser.close();
      }
    },
    30000,
  );

  beforeEach(async () => {
    if (pool) await pool.query('DELETE FROM "rateLimit"');
  });

  it.skipIf(!connectionString)(
    "does not register OIDC providers without verification metadata",
    async () => {
      discoveryHasKeys = false;
      const previous = activeRouter;
      let emailCode = "";
      try {
        const isolated = production
          ? createProductionAccountCandidate({
              secret: randomBytes(48).toString("base64url"),
              database: pool,
              social: credentials,
              deliverCode: async ({ otp }) => {
                emailCode = otp;
              },
            })
          : createSyntheticAccountAuth({
              origin,
              secret: randomBytes(48).toString("base64url"),
              database: pool,
              socialFixtures: true,
              deliverCode: async () => {},
            });
        activeRouter = isolated.router;
        const count = exchanges;
        for (const provider of ["google", "apple"]) {
          const response = await call("sign-in/social", {
            provider,
            callbackURL: `${origin}/`,
            disableRedirect: true,
          });
          expect(response.status).toBe(404);
        }
        expect(exchanges).toBe(count);
        if (production) {
          expect(
            (
              await call("email-otp/send-verification-otp", {
                email: "provider-outage@example.test",
                type: "sign-in",
              })
            ).status,
          ).toBe(200);
          expect(
            (
              await call("sign-in/email-otp", {
                email: "provider-outage@example.test",
                otp: emailCode,
              })
            ).status,
          ).toBe(200);
        }
      } finally {
        activeRouter = previous;
        discoveryHasKeys = true;
      }
    },
  );
  if (production)
    it.skipIf(!connectionString)(
      "blocks extra scopes and browser-supplied provider metadata before exchanging tokens",
      async () => {
        const count = exchanges;
        for (const extra of [
          { scopes: ["https://www.googleapis.com/auth/drive"] },
          { additionalParams: { prompt: "none" } },
          { additionalData: { privateTranscript: "SYNTHETIC-CANARY" } },
          { loginHint: "synthetic@example.test" },
          { provider: "github" },
        ]) {
          await pool.query('DELETE FROM "rateLimit"');
          expect(
            (await call("sign-in/social", { provider: "google", ...extra }))
              .status,
          ).toBe(400);
        }
        expect(exchanges).toBe(count);
      },
    );

  it.skipIf(!connectionString)(
    "cannot create a usable social session after account closure",
    async () => {
      const flow = await begin("google");
      const response = await callback(
        prepare(flow, "closed-social@example.test"),
        flow.cookie,
      );
      successful(response);
      const user = (
        await (
          await call("get-session", undefined, cookieFrom(response))
        ).json()
      ).user;
      await pool.query('INSERT INTO account_closure ("userId") VALUES ($1)', [
        user.id,
      ]);
      await pool.query('DELETE FROM session WHERE "userId"=$1', [user.id]);
      const attempt = await begin("google");
      const result = await callback(
        prepare(attempt, "closed-social@example.test"),
        attempt.cookie,
      );
      expect(
        await (await call("get-session", undefined, cookieFrom(result))).json(),
      ).toBeNull();
      expect(
        (
          await pool.query(
            'SELECT count(*)::int n FROM session WHERE "userId"=$1',
            [user.id],
          )
        ).rows[0].n,
      ).toBe(0);
    },
  );
  afterAll(async () => {
    vi.unstubAllGlobals();
    // Header-only negative checks can leave bodies unread. Tests have completed;
    // discard their isolated sockets instead of waiting for those bodies forever.
    if (localAgent) await localAgent.destroy();
    if (server)
      await new Promise<void>((resolve) => server.close(() => resolve()));
    if (tls) await tls.dispose();
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
    if (response.status !== 200)
      throw Error(
        `Sign-in fixture rejected: ${response.status} ${await response.text()}`,
      );
    const url = new URL((await response.json()).url);
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("nonce")).toBeTruthy();
    expect(url.searchParams.get("scope")?.split(" ").sort()).toEqual([
      "email",
      "openid",
    ]);
    return {
      provider,
      url,
      cookie: mergeCookies(cookie, cookieFrom(response)),
    };
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
        aud: clientId(flow.provider),
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

  if (production)
    it.skipIf(!connectionString)(
      "restricts Google enrollment to listed verified identities before creating an account",
      async () => {
        const previous = activeRouter;
        try {
          const isolated = createProductionConsumerCandidate({
            secret: randomBytes(48).toString("base64url"),
            database: pool,
            social: credentials,
            allowedEmails: ["allowed-owner@example.test"],
            deliverCode: async () => {
              throw Error("Disabled");
            },
          });
          expect(await isolated.ready).toBe(true);
          activeRouter = isolated.app;
          const denied = await begin("google");
          rejected(
            await callback(
              prepare(denied, "not-listed@example.test"),
              denied.cookie,
            ),
          );
          expect(
            (
              await pool.query(
                'SELECT count(*)::int n FROM "user" WHERE email=$1',
                ["not-listed@example.test"],
              )
            ).rows[0].n,
          ).toBe(0);
          const allowed = await begin("google");
          successful(
            await callback(
              prepare(allowed, "allowed-owner@example.test"),
              allowed.cookie,
            ),
          );
        } finally {
          activeRouter = previous;
        }
      },
    );

  it.skipIf(!connectionString)(
    "verifies Google code, PKCE and nonce, persists session and rejects callback replay",
    async () => {
      const flow = await begin("google");
      const url = prepare(flow, "google@example.test");
      const response = await callback(url, flow.cookie);
      successful(response);
      const cookie = cookieFrom(response);
      expect(
        (await (await call("get-session", undefined, cookie)).json()).user
          .email,
      ).toBe("google@example.test");
      const account = (
        await pool.query(
          'SELECT a.* FROM account a JOIN "user" u ON u.id=a."userId" WHERE a."providerId"=\'google\' AND u.email=\'google@example.test\'',
        )
      ).rows[0];
      expect(account.accessToken).not.toBe("synthetic-access");
      expect(account.refreshToken).not.toBe("synthetic-refresh");
      expect(account).toMatchObject({
        accessToken: null,
        refreshToken: null,
        idToken: null,
        scope: null,
      });
      expect(
        (
          await pool.query('SELECT name,image FROM "user" WHERE email=$1', [
            "google@example.test",
          ])
        ).rows[0],
      ).toEqual({ name: "", image: null });
      expect(
        (
          await pool.query(
            'SELECT "ipAddress","userAgent" FROM session WHERE "userId"=$1',
            [account.userId],
          )
        ).rows,
      ).toEqual([{ ipAddress: null, userAgent: null }]);
      const count = exchanges;
      rejected(await callback(url, flow.cookie));
      expect(exchanges).toBe(count);
    },
  );

  it.skipIf(!connectionString)(
    "accepts Apple's form POST then verified GET and string email verification",
    async () => {
      const flow = await begin("apple");
      const url = prepare(flow, "relay@example.test", {
        email_verified: "true",
      });
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
        (
          await (
            await call("get-session", undefined, cookieFrom(result))
          ).json()
        ).user.email,
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
          {
            claims: {
              email: production ? "invalid-email" : "not-synthetic@example.com",
            },
          },
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
      expect(
        (
          await pool.query(
            'SELECT "accessToken","refreshToken","idToken" FROM account WHERE "userId"=$1',
            [session.user.id],
          )
        ).rows,
      ).toEqual([
        { accessToken: null, refreshToken: null, idToken: null },
        { accessToken: null, refreshToken: null, idToken: null },
      ]);
      const pending = await begin("apple", sessionCookie, true);
      const pendingURL = prepare(pending, email);
      await call("sign-out", {}, sessionCookie);
      rejected(await callback(pendingURL, pending.cookie));
      expect(
        (await call("link-social", { provider: "apple" }, sessionCookie))
          .status,
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
}
