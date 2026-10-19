import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { createServer, request } from "node:https";
import { X509Certificate, randomBytes, createHash } from "node:crypto";
import { chromium, expect as browserExpect } from "@playwright/test";
import { spawn, execFileSync } from "node:child_process";
import { writeFile, unlink } from "node:fs/promises";
import express from "express";
import { resolve } from "node:path";
import { ingressTLS } from "./fixtures/ingress-tls";
import { usageDatabase } from "./fixtures/usage-postgres";
import { applyAccountMigrations } from "../server/account-migrations";
import { createProductionConsumerCandidate } from "../server/consumer-workspace";

describe.runIf(
  !!process.env.PRIVATEAI_SYNTHETIC_INGRESS_TLS_DIR &&
    !!process.env.PRIVATEAI_SYNTHETIC_PG,
)("production candidate through authenticated Caddy", () => {
  let tls: Awaited<ReturnType<typeof ingressTLS>>;
  let db: Awaited<ReturnType<typeof usageDatabase>>;
  let active: ReturnType<typeof createProductionConsumerCandidate>;
  let server: ReturnType<typeof createServer>;
  let proxy: ReturnType<typeof spawn>;
  let exited: Promise<void>;
  let port: number;
  let logs = "";
  const codes = new Map<string, string>();
  const origin = "https://app.cometrow.com";
  const secret = randomBytes(48).toString("base64url");
  const config = ".local/workspace-caddy.conf";
  let cookie = "";
  let streamClosed = false;
  function make() {
    const candidate = createProductionConsumerCandidate({
      database: db.pool,
      secret,
      ingress: {
        peerCertificateSha256: [
          new X509Certificate(tls.proxy.cert).fingerprint256
            .replaceAll(":", "")
            .toLowerCase(),
        ],
      },
      deliverCode: async ({ email, otp }) => {
        if (!email.endsWith("@example.test"))
          throw Error("Synthetic email only");
        codes.set(email, otp);
      },
    });
    candidate.app.use(express.static(resolve("dist"), { index: false }));
    candidate.app.get(["/", "/account"], (_req, res) =>
      res.sendFile(resolve("dist/index.html")),
    );
    // Transport probe only, never a model response or a production route.
    candidate.app.get("/synthetic-stream", (_req, res) => {
      res.setHeader("Content-Type", "text/event-stream");
      res.flushHeaders();
      res.write("data: synthetic-first\n\n");
      const timer = setTimeout(() => res.end("data: synthetic-last\n\n"), 150);
      res.on("close", () => {
        streamClosed = true;
        clearTimeout(timer);
      });
    });
    return candidate;
  }
  function call(
    path: string,
    options: {
      body?: unknown;
      headers?: Record<string, string>;
      direct?: boolean;
      approvedPeer?: boolean;
      cancelStream?: boolean;
    } = {},
  ) {
    return new Promise<{
      status: number;
      body: string;
      cookies: string[];
      cache?: string;
    }>((done, reject) => {
      const body =
        options.body === undefined ? undefined : JSON.stringify(options.body);
      const req = request(
        {
          hostname: "127.0.0.1",
          servername: "localhost",
          port: options.direct ? port : 9444,
          path,
          method: body === undefined ? "GET" : "POST",
          ca: tls.ca,
          ...(options.direct
            ? options.approvedPeer
              ? tls.proxy
              : tls.other
            : {}),
          headers: {
            host: options.direct ? "app.cometrow.com" : "localhost:9444",
            origin,
            "content-type": "application/json",
            cookie,
            ...options.headers,
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk.toString();
            if (options.cancelStream) {
              done({ status: res.statusCode!, body: data, cookies: [] });
              res.destroy();
            }
          });
          res.on("error", (error) => {
            if (!options.cancelStream) reject(error);
          });
          res.on("end", () =>
            done({
              status: res.statusCode!,
              body: data,
              cookies: res.headers["set-cookie"] ?? [],
              cache: res.headers["cache-control"],
            }),
          );
        },
      );
      req.setTimeout(5000, () =>
        req.destroy(Error("Synthetic request timed out")),
      );
      req.on("error", reject);
      req.end(body);
    });
  }
  beforeAll(async () => {
    tls = await ingressTLS();
    db = await usageDatabase({ empty: true });
    await applyAccountMigrations(db.pool);
    active = make();
    expect(await active.ready).toBe(true);
    server = createServer(
      {
        ...tls.server,
        ca: tls.ca,
        requestCert: true,
        rejectUnauthorized: true,
      },
      (req, res) => active.app(req, res),
    );
    server.listen(0, "127.0.0.1");
    await new Promise<void>((done) => server.once("listening", done));
    port = (server.address() as { port: number }).port;
    const executable = process.env.PRIVATEAI_SYNTHETIC_CADDY!;
    await writeFile(
      config,
      `{
      admin off
      auto_https off
      persist_config off
      log default {
        output discard
      }
    }
    https://localhost:9444, https://app.cometrow.com:9444 {
      bind 127.0.0.1
      tls /fixtures/localhost.pem /fixtures/localhost.key
      reverse_proxy https://127.0.0.1:${port} {
        header_up Host app.cometrow.com
        header_up X-PrivateAI-Edge-Client-IP {remote_host}
        header_up X-PrivateAI-Edge-Proto {scheme}
        header_up -Forwarded
        header_up -X-Forwarded-For
        header_up -X-Forwarded-Host
        header_up -X-Forwarded-Proto
        header_up -X-Real-IP
        header_up -X-PrivateAI-Client-IP
        transport http {
          tls_server_name localhost
          tls_trust_pool file {
            pem_file /fixtures/ca.pem
          }
          tls_client_auth /fixtures/proxy.pem /fixtures/proxy.key
          versions 1.1
          keepalive off
          network_proxy none
          dial_timeout 2s
          tls_timeout 2s
          response_header_timeout 3s
        }
      }
    }`,
    );
    execFileSync(
      executable,
      ["validate", "--config", config, "--adapter", "caddyfile"],
      { stdio: "pipe", timeout: 5000 },
    );
    proxy = spawn(
      executable,
      ["run", "--config", config, "--adapter", "caddyfile"],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    for (const output of [proxy.stdout, proxy.stderr])
      output!.on("data", (value) => {
        logs = (logs + value).slice(-65536);
      });
    exited = new Promise((done) => proxy.once("exit", () => done()));
    let ready = false;
    for (let index = 0; index < 40; index++) {
      try {
        ready = (await call("/readyz")).status === 200;
      } catch {}
      if (ready) break;
      await new Promise((done) => setTimeout(done, 50));
    }
    expect(ready).toBe(true);
  }, 20000);
  afterAll(async () => {
    if (proxy) {
      proxy.kill("SIGTERM");
      const timer = setTimeout(() => proxy.kill("SIGKILL"), 2000);
      await exited;
      clearTimeout(timer);
    }
    if (server) {
      server.closeAllConnections();
      await new Promise<void>((done) => server.close(() => done()));
    }
    await unlink(config).catch(() => {});
    await db?.dispose();
    await tls?.dispose();
  });
  it("rejects unapproved direct peers on static, health and account routes", async () => {
    for (const path of [
      "/account",
      "/healthz",
      "/readyz",
      "/api/auth/get-session",
    ])
      expect(
        (
          await call(path, {
            direct: true,
            headers: {
              "x-privateai-edge-proto": "https",
              "x-privateai-edge-client-ip": "198.51.100.2",
            },
          })
        ).status,
      ).toBe(403);
  });
  it("uses the authenticated peer address rather than the proxy socket for account rate limits", async () => {
    const result = await call("/api/auth/email-otp/send-verification-otp", {
      direct: true,
      approvedPeer: true,
      body: { email: "address@example.test", type: "sign-in" },
      headers: {
        "x-privateai-edge-proto": "https",
        "x-privateai-edge-client-ip": "203.0.113.29",
        "x-privateai-client-ip": "198.51.100.99",
      },
    });
    expect(result.status).toBe(200);
    const keys = JSON.stringify(
      (await db.pool.query('SELECT key FROM "rateLimit"')).rows,
    );
    expect(keys).toContain("203.0.113.29");
    expect(keys).not.toContain("198.51.100.99");
  });
  it("serves the built account screen and signs in with secure cookies while ignoring spoofed address claims", async () => {
    const screen = await call("/account");
    expect(screen.status).toBe(200);
    expect(screen.body).toContain("/assets/");
    expect((await call("/api/status")).status).toBe(401);
    const email = "ingress@example.test";
    expect(
      (
        await call("/api/auth/email-otp/send-verification-otp", {
          body: { email, type: "sign-in" },
        })
      ).status,
    ).toBe(200);
    const login = await call("/api/auth/sign-in/email-otp", {
      body: { email, otp: codes.get(email) },
      headers: {
        "x-privateai-edge-client-ip": "198.51.100.2",
        "x-privateai-client-ip": "198.51.100.3",
        "x-forwarded-for": "198.51.100.4",
      },
    });
    expect(login.status).toBe(200);
    expect(
      login.cookies.some(
        (value) => /HttpOnly/i.test(value) && /Secure/i.test(value),
      ),
    ).toBe(true);
    cookie = login.cookies.map((value) => value.split(";")[0]).join("; ");
    const limits = await db.pool.query('SELECT key FROM "rateLimit"');
    expect(limits.rows.length).toBeGreaterThan(0);
    expect(JSON.stringify(limits.rows)).toContain("127.0.0.1");
    expect(JSON.stringify(limits.rows)).not.toContain("198.51.100.");
  });
  it("preserves durable sign-in across composition restart without admitting inference or cross-site writes", async () => {
    active = make();
    expect(await active.ready).toBe(true);
    const status = await call("/api/status");
    expect(status.status).toBe(200);
    expect(status.cache).toBe("no-store");
    const data = JSON.parse(status.body);
    expect(data.consumerWorkspace).toBe(true);
    expect(data.inference.ready).toBe(false);
    expect(data.search).toBe(false);
    expect((await call("/")).status).toBe(200);
    expect(
      (
        await call("/api/inference/v1/chat/completions", {
          body: { synthetic: true },
          headers: { "x-privateai-csrf": data.csrf },
        })
      ).status,
    ).toBe(503);
    expect(
      (
        await call("/api/auth/sign-out", {
          body: {},
          headers: { origin: "https://evil.test" },
        })
      ).status,
    ).toBe(403);
  });
  it("delivers streamed chunks and propagates cancellation without synthesizing an inference pass", async () => {
    streamClosed = false;
    const streamed = await call("/synthetic-stream");
    expect(streamed.status).toBe(200);
    expect(streamed.body).toContain("synthetic-first");
    expect(streamed.body).toContain("synthetic-last");
    streamClosed = false;
    const cancelled = await call("/synthetic-stream", { cancelStream: true });
    expect(cancelled.body).toContain("synthetic-first");
    expect(cancelled.body).not.toContain("synthetic-last");
    for (let i = 0; !streamClosed && i < 20; i++)
      await new Promise((done) => setTimeout(done, 10));
    expect(streamClosed).toBe(true);
  });
  it.runIf(process.env.PRIVATEAI_SYNTHETIC_INGRESS_BROWSER === "1")(
    "runs the built mobile account, passkey and encrypted document workspace through Caddy",
    async () => {
      const spki = createHash("sha256")
        .update(
          new X509Certificate(tls.server.cert).publicKey.export({
            type: "spki",
            format: "der",
          }),
        )
        .digest("base64");
      const browser = await chromium.launch({
        headless: true,
        args: [
          "--no-proxy-server",
          "--host-resolver-rules=MAP app.cometrow.com 127.0.0.1:9444, MAP * ~NOTFOUND",
          // Trust only this disposable leaf public key, not every certificate or an OS root.
          `--ignore-certificate-errors-spki-list=${spki}`,
        ],
      });
      try {
        const context = await browser.newContext({
          viewport: { width: 390, height: 844 },
        });
        const page = await context.newPage();
        const outbound: string[] = [],
          bodies: string[] = [];
        await context.route("**/*", async (route) => {
          const req = route.request();
          if (new URL(req.url()).origin !== origin) {
            outbound.push(req.url());
            await route.abort();
            return;
          }
          if (req.postData()) bodies.push(req.postData()!);
          await route.continue();
        });
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
        await page.goto(origin + "/");
        await browserExpect(
          page.getByRole("heading", { name: "Sign in to PrivateAI" }),
        ).toBeVisible();
        await page
          .getByText("Help with sign-in or reporting a problem", {
            exact: true,
          })
          .click();
        await browserExpect(
          page.getByLabel("Problem area", { exact: true }),
        ).toHaveValue("account");
        await page
          .getByText("Help with sign-in or reporting a problem", {
            exact: true,
          })
          .click();
        await page
          .getByLabel("Email address", { exact: true })
          .fill("browser@example.test");
        await page
          .getByRole("button", { name: "Continue with email", exact: true })
          .click();
        await browserExpect(page.getByLabel("Verification code")).toBeFocused();
        await page
          .getByLabel("Verification code")
          .fill(codes.get("browser@example.test")!);
        await page
          .getByRole("button", { name: "Verify code", exact: true })
          .click();
        await browserExpect(
          page.getByRole("heading", { name: "Your account", exact: true }),
        ).toBeVisible();
        await page
          .getByRole("button", { name: "Add passkey", exact: true })
          .click();
        await browserExpect(
          page.getByRole("status").filter({ hasText: "Passkey added." }),
        ).toBeVisible();
        await page
          .getByRole("button", { name: "Sign out", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Sign in with a passkey", exact: true })
          .click();
        await browserExpect(
          page.getByRole("heading", { name: "Your account", exact: true }),
        ).toBeVisible();
        await page
          .getByRole("link", { name: "Open workspace", exact: true })
          .click();
        const tab = (name: string) =>
          page
            .getByRole("navigation", { name: "Workspace" })
            .getByRole("button", { name, exact: false });
        await page
          .getByLabel("Message PrivateAI")
          .fill("INGRESS_LOCAL_DRAFT_CANARY");
        await browserExpect(
          page.getByRole("button", { name: "Send ↑", exact: true }),
        ).toBeDisabled();
        await tab("Context").click();
        await page.getByLabel("Add documents or screenshots").setInputFiles({
          name: "synthetic-note.txt",
          mimeType: "text/plain",
          buffer: Buffer.from("INGRESS_LOCAL_DOCUMENT_CANARY"),
        });
        await page.locator("details summary").first().click();
        await page
          .getByLabel("Text for synthetic-note.txt", { exact: true })
          .fill("INGRESS_CORRECTED_DOCUMENT_CANARY");
        await tab("Saved").click();
        await page
          .getByLabel("Vault passphrase")
          .fill("INGRESS_LOCAL_PASSPHRASE_CANARY");
        await page
          .getByRole("button", { name: "Create or unlock vault", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Save encrypted snapshot", exact: true })
          .click();
        await browserExpect(
          page.getByText("No unsaved workspace changes.", { exact: false }),
        ).toBeVisible();
        await page
          .getByRole("button", {
            name: "Lock and clear workspace",
            exact: true,
          })
          .click();
        active = make();
        expect(await active.ready).toBe(true);
        await page.reload();
        await tab("Saved").click();
        await page
          .getByLabel("Vault passphrase")
          .fill("INGRESS_LOCAL_PASSPHRASE_CANARY");
        await page
          .getByRole("button", { name: "Create or unlock vault", exact: true })
          .click();
        await page.getByRole("button", { name: "Open", exact: true }).click();
        await browserExpect(page.getByLabel("Message PrivateAI")).toHaveValue(
          "INGRESS_LOCAL_DRAFT_CANARY",
        );
        await tab("Context").click();
        await page.locator("details summary").first().click();
        await browserExpect(
          page.getByLabel("Text for synthetic-note.txt", { exact: true }),
        ).toHaveValue("INGRESS_CORRECTED_DOCUMENT_CANARY");
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await tab("Account").click();
        await page.getByRole("button", { name: /Manage sign-in/ }).click();
        await browserExpect(
          page.getByRole("heading", { name: "Your account", exact: true }),
        ).toBeVisible();
        await page
          .getByRole("button", { name: "Sign out", exact: true })
          .click();
        await page.goto(origin + "/");
        await browserExpect(
          page.getByRole("heading", { name: "Sign in to PrivateAI" }),
        ).toBeVisible();
        expect(outbound).toEqual([]);
        for (const marker of [
          "INGRESS_LOCAL_DRAFT_CANARY",
          "INGRESS_LOCAL_DOCUMENT_CANARY",
          "INGRESS_CORRECTED_DOCUMENT_CANARY",
          "INGRESS_LOCAL_PASSPHRASE_CANARY",
        ])
          expect(bodies.join("\n") + logs).not.toContain(marker);
        expect(await context.cookies()).not.toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              name: "__Secure-privateai-account.session_token",
            }),
          ]),
        );
        active.operations.beginDrain();
        await page
          .getByLabel("Email address", { exact: true })
          .fill("outage@example.test");
        await page
          .getByRole("button", { name: "Continue with email", exact: true })
          .click();
        await browserExpect(
          page
            .getByRole("status")
            .filter({ hasText: "This action was not started" }),
        ).toBeVisible();
        expect(codes.has("outage@example.test")).toBe(false);
        await browserExpect(
          page.getByLabel("Email address", { exact: true }),
        ).toHaveValue("outage@example.test");
        active = make();
        expect(await active.ready).toBe(true);
        await page
          .getByRole("button", { name: "Continue with email", exact: true })
          .click();
        await browserExpect(page.getByLabel("Verification code")).toBeFocused();
        expect(codes.has("outage@example.test")).toBe(true);
        await context.close();
      } finally {
        await browser.close();
      }
    },
    45000,
  );
  it("blocks quarantined accounts, then drains admission and keeps credentials out of captured proxy logs", async () => {
    await db.pool.query(
      "UPDATE account_recovery_control SET mode='quarantined'",
    );
    expect((await call("/readyz")).status).toBe(503);
    expect((await call("/api/status")).status).toBe(503);
    expect((await call("/healthz")).status).toBe(200);
    // Only this disposable synthetic schema is restored for the remaining drain check.
    await db.pool.query("UPDATE account_recovery_control SET mode='normal'");
    active.operations.beginDrain();
    expect((await call("/api/status")).status).toBe(503);
    expect(await active.operations.waitForDrain(1000)).toBe(true);
    expect(logs).not.toContain(cookie);
    expect(logs).not.toContain("ingress@example.test");
    for (const otp of codes.values()) expect(logs).not.toContain(otp);
  });
});
