import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { request } from "node:http";
import { request as secureRequest } from "node:https";
import {
  X509Certificate,
  generateKeyPairSync,
  sign,
  randomUUID,
} from "node:crypto";
import { resolve } from "node:path";
import { ingressTLS } from "./fixtures/ingress-tls";
import { usageDatabase } from "./fixtures/usage-postgres";
import { applyAccountMigrations } from "../server/account-migrations";
import { prepareProductionRuntime } from "../server/production-runtime";
import { createRenderBridge } from "../server/render-bridge";

describe.runIf(!!process.env.PRIVATEAI_SYNTHETIC_PG)(
  "restricted Render bridge with real PostgreSQL",
  () => {
    let tls: Awaited<ReturnType<typeof ingressTLS>>;
    let db: Awaited<ReturnType<typeof usageDatabase>>;
    let runtime: Awaited<ReturnType<typeof prepareProductionRuntime>>;
    let bridge: ReturnType<typeof createRenderBridge>;
    let port: number, upstreamPort: number;
    const origin = "https://app.cometrow.com";
    const keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const codes = new Map<string, Record<string, unknown>>();
    const cookie = (headers: import("node:http").IncomingHttpHeaders) =>
      (headers["set-cookie"] ?? []).map((v) => v.split(";")[0]).join("; ");
    function call(
      path: string,
      body?: unknown,
      headers: Record<string, string> = {},
    ) {
      return new Promise<{
        status: number;
        body: string;
        headers: import("node:http").IncomingHttpHeaders;
      }>((done, reject) => {
        const req = request(
          {
            hostname: "127.0.0.1",
            port,
            path,
            method: body === undefined ? "GET" : "POST",
            headers: {
              host: "app.cometrow.com",
              ...(body === undefined
                ? {}
                : { origin, "content-type": "application/json" }),
              ...headers,
            },
          },
          (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("error", reject);
            res.on("end", () =>
              done({
                status: res.statusCode!,
                body: data,
                headers: res.headers,
              }),
            );
          },
        );
        req.on("error", reject);
        req.setTimeout(10000, () => req.destroy(Error("Test timeout")));
        req.end(body === undefined ? undefined : JSON.stringify(body));
      });
    }
    beforeAll(async () => {
      tls = await ingressTLS();
      db = await usageDatabase({ empty: true });
      await applyAccountMigrations(db.pool);
      vi.stubGlobal(
        "fetch",
        async (input: string | URL | Request, init?: RequestInit) => {
          const url = String(input);
          if (
            url ===
            "https://accounts.google.com/.well-known/openid-configuration"
          )
            return Response.json({
              issuer: "https://accounts.google.com",
              authorization_endpoint:
                "https://accounts.google.com/o/oauth2/v2/auth",
              token_endpoint: "https://oauth2.googleapis.com/token",
              jwks_uri: "https://www.googleapis.com/oauth2/v3/certs",
              id_token_signing_alg_values_supported: ["RS256"],
            });
          if (url === "https://www.googleapis.com/oauth2/v3/certs")
            return Response.json({
              keys: [
                {
                  ...keys.publicKey.export({ format: "jwk" }),
                  kid: "fixture",
                  alg: "RS256",
                  use: "sig",
                },
              ],
            });
          if (url === "https://oauth2.googleapis.com/token") {
            const code = new URLSearchParams(String(init?.body)).get("code")!;
            const claims = codes.get(code);
            codes.delete(code);
            if (!claims) throw Error("Unknown synthetic code");
            const payload = [{ alg: "RS256", kid: "fixture" }, claims]
              .map((v) => Buffer.from(JSON.stringify(v)).toString("base64url"))
              .join(".");
            return Response.json({
              access_token: "synthetic",
              token_type: "Bearer",
              expires_in: 3600,
              id_token:
                payload +
                "." +
                sign(
                  "RSA-SHA256",
                  Buffer.from(payload),
                  keys.privateKey,
                ).toString("base64url"),
            });
          }
          throw Error("No external network allowed");
        },
      );
      runtime = await prepareProductionRuntime({
        database: db.pool,
        assets: resolve("dist"),
        secret: "synthetic-render-secret-".repeat(3),
        allowedEmails: ["owner@example.test"],
        social: {
          google: {
            clientId: "synthetic.apps.googleusercontent.com",
            clientSecret: "synthetic-google-secret",
          },
        },
        deliverCode: async () => {
          throw Error("Email disabled");
        },
        tls: { ...tls.server, ca: tls.ca },
        ingress: {
          admission: "shared",
          peerCertificateSha256: [
            new X509Certificate(tls.proxy.cert).fingerprint256
              .replaceAll(":", "")
              .toLowerCase(),
          ],
        },
      });
      runtime.app.get("/synthetic-headers", (req, res) =>
        res.json({
          headers: req.headers,
          address: req.headers["x-privateai-edge-client-ip"] ?? null,
        }),
      );
      upstreamPort = await runtime.listen(0);
      bridge = createRenderBridge({
        port: upstreamPort,
        ...tls.proxy,
        ca: tls.ca,
        servername: "localhost",
      });
      bridge.listen(0, "127.0.0.1");
      await new Promise<void>((done) => bridge.once("listening", done));
      port = (bridge.address() as { port: number }).port;
    }, 30000);
    afterAll(async () => {
      vi.unstubAllGlobals();
      bridge?.closeAllConnections();
      if (bridge) await new Promise<void>((done) => bridge.close(() => done()));
      await runtime?.stop();
      await db?.dispose();
      await tls?.dispose();
    });
    it("strips spoofed identities without inventing a visitor IP", async () => {
      const result = await call("/synthetic-headers", undefined, {
        "x-forwarded-for": "198.51.100.5",
        "x-privateai-client-ip": "198.51.100.5",
        "x-privateai-edge-client-ip": "198.51.100.5",
        forwarded: "for=evil",
        "x-privateai-edge-admission": "client-ip",
      });
      expect(result.status).toBe(200);
      const data = JSON.parse(result.body);
      expect(data.address).toBeNull();
      for (const key of [
        "x-forwarded-for",
        "x-privateai-client-ip",
        "x-privateai-edge-client-ip",
        "forwarded",
      ])
        expect(data.headers[key]).toBeUndefined();
      expect(result.headers["cache-control"]).toBe("no-store");
    });
    it("rejects wrong hosts/origins and direct upstream TLS without a client certificate", async () => {
      expect(
        (await call("/account", undefined, { host: "evil.example" })).status,
      ).toBe(403);
      expect(
        (
          await call("/api/auth/get-session", undefined, {
            origin: "https://evil.example",
          })
        ).status,
      ).toBe(403);
      await expect(
        new Promise((done, reject) => {
          const req = secureRequest(
            {
              hostname: "127.0.0.1",
              port: upstreamPort,
              ca: tls.ca,
              servername: "localhost",
            },
            done,
          );
          req.on("error", reject);
          req.end();
        }),
      ).rejects.toThrow();
      const health = await call("/healthz", undefined, {
        host: "render-health",
      });
      expect(health.status).toBe(200);
      // The bridge answers the probe itself and must carry the fixed headers.
      for (const [name, value] of [
        ["x-content-type-options", "nosniff"],
        ["x-frame-options", "DENY"],
        ["permissions-policy", "camera=(self), microphone=(), geolocation=()"],
        ["content-security-policy", "default-src 'none'"],
      ])
        expect(health.headers[name], name).toBe(value);
    });
    it("bounds uploads and fails closed when the upstream certificate name does not match", async () => {
      expect(
        (
          await call("/api/auth/sign-in/social", {
            data: "x".repeat(1024 * 1024 + 1),
          })
        ).status,
      ).toBe(413);
      const bad = createRenderBridge({
        port: upstreamPort,
        ...tls.proxy,
        ca: tls.ca,
        servername: "wrong.example",
      });
      const goodPort = port;
      try {
        bad.listen(0, "127.0.0.1");
        await new Promise<void>((done) => bad.once("listening", done));
        port = (bad.address() as { port: number }).port;
        expect((await call("/account")).status).toBe(502);
      } finally {
        port = goodPort;
        bad.closeAllConnections();
        await new Promise<void>((done) => bad.close(() => done()));
      }
    });
    async function begin() {
      const result = await call("/api/auth/sign-in/social", {
        provider: "google",
        callbackURL: origin + "/",
        disableRedirect: true,
      });
      expect(result.status).toBe(200);
      return {
        url: new URL(JSON.parse(result.body).url),
        cookie: cookie(result.headers),
      };
    }
    async function finish(
      flow: Awaited<ReturnType<typeof begin>>,
      email: string,
    ) {
      const code = randomUUID();
      const now = Math.floor(Date.now() / 1000);
      codes.set(code, {
        iss: "https://accounts.google.com",
        aud: "synthetic.apps.googleusercontent.com",
        sub: email,
        email,
        email_verified: true,
        iat: now,
        exp: now + 3600,
        nonce: flow.url.searchParams.get("nonce"),
      });
      return call(
        "/api/auth/callback/google?" +
          new URLSearchParams({
            code,
            state: flow.url.searchParams.get("state")!,
          }),
        undefined,
        { cookie: flow.cookie, "sec-fetch-site": "cross-site" },
      );
    }
    it("admits only the owner, handles cancellation and invalidates logout through the bridge", async () => {
      await db.pool.query('DELETE FROM "rateLimit"');
      const denied = await finish(await begin(), "stranger@example.test");
      expect(denied.headers.location).toContain("error=");
      expect(
        (
          await db.pool.query(
            'SELECT count(*)::int n FROM "user" WHERE email=$1',
            ["stranger@example.test"],
          )
        ).rows[0].n,
      ).toBe(0);
      const cancelled = await begin();
      const result = await call(
        "/api/auth/callback/google?" +
          new URLSearchParams({
            error: "access_denied",
            state: cancelled.url.searchParams.get("state")!,
          }),
        undefined,
        { cookie: cancelled.cookie },
      );
      expect(result.headers.location).toContain("error=");
      const allowed = await finish(await begin(), "owner@example.test");
      expect(allowed.headers.location).toBe(origin + "/");
      const session = cookie(allowed.headers);
      expect(
        JSON.parse(
          (await call("/api/auth/get-session", undefined, { cookie: session }))
            .body,
        ).user.email,
      ).toBe("owner@example.test");
      expect(
        (await call("/api/auth/sign-out", {}, { cookie: session })).status,
      ).toBe(200);
      expect(
        JSON.parse(
          (await call("/api/auth/get-session", undefined, { cookie: session }))
            .body,
        ),
      ).toBeNull();
      expect(JSON.parse((await call("/api/auth/get-session")).body)).toBeNull();
    });
    it("does not let spoofed IPs bypass the shared database rate bucket", async () => {
      await db.pool.query('DELETE FROM "rateLimit"');
      let blocked = false;
      for (let i = 0; i < 65; i++) {
        const response = await call("/api/auth/get-session", undefined, {
          "x-forwarded-for": `198.51.100.${i + 1}`,
        });
        if (response.status === 429) {
          blocked = true;
          break;
        }
      }
      expect(blocked).toBe(true);
      await db.pool.query('DELETE FROM "rateLimit"');
    });
  },
);
