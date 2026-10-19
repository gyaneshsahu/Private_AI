import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { createServer, request as httpsRequest } from "node:https";
import { request as httpRequest, type Server } from "node:http";
import express from "express";
import { resolve } from "node:path";
import { mkdir } from "node:fs/promises";
import {
  chromium,
  expect as browserExpect,
  type BrowserContext,
} from "@playwright/test";
import { createProductionConsumerCandidate } from "../server/consumer-workspace";
import { createApp } from "../server/app";
import { productionAccountTarget } from "../shared/account-design";
import { applyAccountMigrations } from "../server/account-migrations";
import { usageDatabase } from "./fixtures/usage-postgres";
import { localTLS } from "./fixtures/local-tls";

const enabled = !!process.env.PRIVATEAI_SYNTHETIC_PG;
const origin = productionAccountTarget.origin;
let db: Awaited<ReturnType<typeof usageDatabase>>;
let tls: Awaited<ReturnType<typeof localTLS>>;
let secure: Server, plain: Server;
let securePort: number, plainPort: number;
let active: ReturnType<typeof createProductionConsumerCandidate>;
const secret = randomBytes(48).toString("base64url");
const codes = new Map<string, string>();
const transmissions: { path: string; body: string }[] = [];
const blocked: string[] = [];

function makeWorkspace() {
  const candidate = createProductionConsumerCandidate({
    database: db.pool,
    secret,
    deliverCode: async ({ email, otp }) => {
      if (!email.endsWith("@example.test")) throw Error("Synthetic sink only");
      if (email === "failure@example.test")
        throw Error("Synthetic delivery failure");
      codes.set(email, otp);
    },
  });
  candidate.app.use(express.static(resolve("dist"), { index: false }));
  candidate.app.get(["/", "/account"], (_req, res) =>
    res.sendFile(resolve("dist/index.html")),
  );
  return candidate;
}

beforeAll(async () => {
  if (!enabled) return;
  db = await usageDatabase({ empty: true });
  await applyAccountMigrations(db.pool);
  tls = await localTLS();
  active = makeWorkspace();
  expect(await active.ready).toBe(true);
  const handler = express().use((req, res) => active.app(req, res));
  secure = createServer({ key: tls.key, cert: tls.cert }, handler);
  plain = express().use(handler).listen(0, "127.0.0.1");
  secure.listen(0, "127.0.0.1");
  for (const server of [secure, plain])
    if (!server.listening)
      await new Promise<void>((done) => server.once("listening", done));
  const port = (server: Server) => {
    const address = server.address();
    if (!address || typeof address === "string")
      throw Error("No test listener");
    return address.port;
  };
  securePort = port(secure);
  plainPort = port(plain);
}, 20_000);
beforeEach(async () => {
  if (enabled) await db.pool.query('DELETE FROM "rateLimit"');
  transmissions.length = 0;
  blocked.length = 0;
});
afterAll(async () => {
  for (const server of [secure, plain])
    if (server) await new Promise<void>((done) => server.close(() => done()));
  await tls?.dispose();
  await db?.dispose();
});

function request(
  path: string,
  headers: Record<string, string> = {},
  body?: Buffer,
  insecure = false,
  method = body ? "POST" : "GET",
) {
  return new Promise<{
    status: number;
    headers: Record<string, string>;
    body: Buffer;
  }>((resolve, reject) => {
    const req = (insecure ? httpRequest : httpsRequest)(
      {
        hostname: "127.0.0.1",
        port: insecure ? plainPort : securePort,
        path,
        method,
        servername: "localhost",
        // Scoped synthetic loopback fixture: Avast replaces this self-signed certificate.
        rejectUnauthorized: false,
        headers: { host: "app.cometrow.com", ...headers },
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (value) => chunks.push(Buffer.from(value)));
        response.on("error", reject);
        response.on("end", () => {
          const result: Record<string, string> = {};
          for (const [key, value] of Object.entries(response.headers)) {
            if (
              value !== undefined &&
              !["transfer-encoding", "connection", "content-length"].includes(
                key,
              )
            )
              result[key] = Array.isArray(value) ? value.join("\n") : value;
          }
          resolve({
            status: response.statusCode!,
            headers: result,
            body: Buffer.concat(chunks),
          });
        });
      },
    );
    req.on("error", reject);
    req.end(body);
  });
}
async function routeLocally(context: BrowserContext) {
  // Chromium's process-local resolver maps this host to the local HTTPS server,
  // including redirects. All other names fail resolution; no DNS settings change.
  await context.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin !== origin) {
      blocked.push(url.origin);
      await route.abort();
      return;
    }
    const body = req.postDataBuffer();
    if (body) transmissions.push({ path: url.pathname, body: body.toString() });
    await route.continue();
  });
}

it.skipIf(!enabled)(
  "allows only top-level account return navigation while preserving cross-site API and method rejection",
  async () => {
    const navigation = {
      "sec-fetch-site": "cross-site",
      "sec-fetch-mode": "navigate",
      "sec-fetch-dest": "document",
    };
    expect((await request("/account", navigation)).status).toBe(200);
    expect(
      (await request("/account?error=access_denied", navigation)).status,
    ).toBe(200);
    for (const path of ["/api/status", "/", "/api/auth/get-session"])
      expect((await request(path, navigation)).status).toBe(403);
    expect(
      (await request("/account", { ...navigation, "sec-fetch-dest": "iframe" }))
        .status,
    ).toBe(403);
    expect(
      (
        await request("/account", {
          ...navigation,
          origin: "https://evil.test",
        })
      ).status,
    ).toBe(403);
    expect(
      (await request("/account", navigation, Buffer.from("{}"))).status,
    ).toBe(403);
  },
);

it.skipIf(!enabled)(
  "rejects upstream credentials, wrong hosts and HTTP while requiring a signed-in account for workspace APIs",
  async () => {
    for (const extra of [
      { apiKey: "SYNTHETIC" },
      { searchKey: "SYNTHETIC" },
      { qualification: {} },
      { dev: true },
    ])
      expect(() =>
        createApp({
          origin,
          consumer: { ...active.control, mode: "production-candidate" },
          ...extra,
        }),
      ).toThrow("without upstream credentials");
    expect((await request("/api/status")).status).toBe(401);
    expect(
      (await request("/", { "x-forwarded-proto": "https" }, undefined, true))
        .status,
    ).toBe(403);
    expect(
      (await request("/api/status", { host: "other.example.test" })).status,
    ).toBe(403);
    expect((await request("/auth")).headers.location).toBe("/account");
  },
);

it.skipIf(!enabled)(
  "runs account, workspace, recovery and closure through the built browser application without upstream disclosure",
  async () => {
    const browser = await chromium.launch({
      headless: true,
      args: [
        "--no-proxy-server",
        `--host-resolver-rules=MAP app.cometrow.com 127.0.0.1:${securePort}, MAP * ~NOTFOUND`,
      ],
    });
    try {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        ignoreHTTPSErrors: true,
      });
      await routeLocally(context);
      const page = await context.newPage();
      await page.goto(origin + "/");
      await browserExpect(
        page.getByRole("heading", { name: "Sign in to PrivateAI" }),
      ).toBeVisible();
      await page
        .getByLabel("Email address", { exact: true })
        .fill("workspace@example.test");
      await page
        .getByRole("button", { name: "Continue with email", exact: true })
        .click();
      await browserExpect(page.getByLabel("Verification code")).toBeFocused();
      await page
        .getByLabel("Verification code")
        .fill(codes.get("workspace@example.test")!);
      await page
        .getByRole("button", { name: "Verify code", exact: true })
        .click();
      await browserExpect(
        page.getByRole("heading", { name: "Your account", exact: true }),
      ).toBeVisible();
      expect(await context.cookies()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: "__Secure-privateai-account.session_token",
            secure: true,
            httpOnly: true,
          }),
        ]),
      );
      active = makeWorkspace();
      expect(await active.ready).toBe(true);
      await page
        .getByRole("link", { name: "Open workspace", exact: true })
        .click();
      await page
        .getByLabel("Message PrivateAI")
        .fill("SYNTHETIC DRAFT MUST STAY LOCAL");
      const status = await page.evaluate(async () =>
        (await fetch("/api/status")).json(),
      );
      expect(status.consumerWorkspace).toBe(true);
      expect(status.inference.ready).toBe(false);
      expect(status.search).toBe(false);
      const guarded = await page.evaluate(async (csrf: string) => {
        const denied = await fetch("/api/inference/v1/chat/completions", {
          method: "POST",
          body: "SYNTHETIC",
        });
        const unavailable = await fetch("/api/inference/v1/chat/completions", {
          method: "POST",
          headers: { "x-privateai-csrf": csrf },
          body: "SYNTHETIC",
        });
        return [denied.status, unavailable.status];
      }, status.csrf);
      expect(guarded).toEqual([403, 503]);
      expect(
        transmissions.some((value) =>
          value.body.includes("SYNTHETIC DRAFT MUST STAY LOCAL"),
        ),
      ).toBe(false);
      await page
        .getByRole("navigation", { name: "Workspace" })
        .getByRole("button", { name: "Account", exact: false })
        .click();
      page.on("dialog", (dialog) => dialog.accept());
      await page.getByRole("button", { name: /Manage sign-in/ }).click();
      await browserExpect(
        page.getByRole("heading", { name: "Your account", exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Finish sign-in recovery" })
        .click();
      await browserExpect(page.getByRole("status")).toContainText(
        "Other sessions were signed out",
      );
      await page
        .getByLabel("Type DELETE ACCOUNT to confirm")
        .fill("DELETE ACCOUNT");
      await page
        .getByRole("button", { name: "Close account", exact: true })
        .click();
      await browserExpect(
        page.getByRole("heading", { name: "Sign in to PrivateAI" }),
      ).toBeVisible();
      expect((await request("/api/status")).status).toBe(401);
      expect(blocked).toEqual([]);
      expect(
        transmissions.filter((value) =>
          value.path.startsWith("/api/inference"),
        ),
      ).toHaveLength(2);
      await context.close();
    } finally {
      await browser.close();
    }
  },
  40_000,
);

it.skipIf(!enabled)(
  "disables production sign-in when backend options describe a different account mode",
  async () => {
    const browser = await chromium.launch({
      headless: true,
      args: [
        "--no-proxy-server",
        `--host-resolver-rules=MAP app.cometrow.com 127.0.0.1:${securePort}, MAP * ~NOTFOUND`,
      ],
    });
    try {
      const context = await browser.newContext({ ignoreHTTPSErrors: true });
      await routeLocally(context);
      await context.route("**/api/account/options", (route) =>
        route.fulfill({
          json: {
            synthetic: true,
            workspaceEnabled: true,
            socialProviders: [],
          },
        }),
      );
      const page = await context.newPage();
      await page.goto(origin + "/account");
      await browserExpect(page.getByRole("status")).toContainText(
        "not available here yet",
      );
      await browserExpect(
        page.getByLabel("Email address", { exact: true }),
      ).toBeDisabled();
      await browserExpect(
        page.getByRole("button", { name: "Continue with email" }),
      ).toBeDisabled();
      await browserExpect(
        page.getByRole("button", { name: "Sign in with a passkey" }),
      ).toBeDisabled();
      expect(transmissions).toEqual([]);
      await context.close();
    } finally {
      await browser.close();
    }
  },
  20_000,
);

it.skipIf(!enabled)(
  "keeps email failure recoverable and fits enlarged mobile text",
  async () => {
    const browser = await chromium.launch({
      headless: true,
      args: [
        "--no-proxy-server",
        `--host-resolver-rules=MAP app.cometrow.com 127.0.0.1:${securePort}, MAP * ~NOTFOUND`,
      ],
    });
    try {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        ignoreHTTPSErrors: true,
      });
      await routeLocally(context);
      const page = await context.newPage();
      await page.goto(origin + "/account");
      await page
        .getByLabel("Email address", { exact: true })
        .fill("failure@example.test");
      await page
        .getByRole("button", { name: "Continue with email", exact: true })
        .click();
      await browserExpect(page.getByRole("status")).toContainText(
        "Code delivery could not be confirmed",
      );
      await browserExpect(page.getByLabel("Verification code")).toHaveCount(0);
      await browserExpect(
        page.getByRole("button", { name: "Continue with email" }),
      ).toBeEnabled();
      await page.addStyleTag({
        content: "html { font-size: 200% !important; }",
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(
        transmissions.filter((value) =>
          value.path.endsWith("send-verification-otp"),
        ),
      ).toHaveLength(1);
      await mkdir(".local/account-production-evidence", { recursive: true });
      await page.screenshot({
        path: ".local/account-production-evidence/mobile-delivery-failure.png",
        fullPage: true,
      });
      await context.close();
    } finally {
      await browser.close();
    }
  },
  20_000,
);

it.skipIf(!enabled)(
  "shows a pre-admission outage honestly and permits explicit sign-in after service reconstruction",
  async () => {
    const browser = await chromium.launch({
      headless: true,
      args: [
        "--no-proxy-server",
        `--host-resolver-rules=MAP app.cometrow.com 127.0.0.1:${securePort}, MAP * ~NOTFOUND`,
      ],
    });
    try {
      const context = await browser.newContext({ ignoreHTTPSErrors: true });
      await routeLocally(context);
      const page = await context.newPage();
      await page.goto(origin + "/account");
      await page
        .getByLabel("Email address", { exact: true })
        .fill("outage@example.test");
      await browserExpect(
        page.getByRole("button", { name: "Continue with email", exact: true }),
      ).toBeEnabled();
      active.operations.beginDrain();
      expect((await request("/readyz")).status).toBe(503);
      expect((await request("/healthz")).status).toBe(200);
      await page
        .getByRole("button", { name: "Continue with email", exact: true })
        .click();
      await browserExpect(page.getByRole("status")).toContainText(
        "This action was not started",
      );
      expect(codes.has("outage@example.test")).toBe(false);
      await browserExpect(page.getByLabel("Verification code")).toHaveCount(0);
      expect(
        transmissions.filter((value) =>
          value.path.endsWith("send-verification-otp"),
        ),
      ).toHaveLength(1);
      active = makeWorkspace();
      expect(await active.ready).toBe(true);
      expect((await request("/readyz")).status).toBe(200);
      await page
        .getByRole("button", { name: "Continue with email", exact: true })
        .click();
      await browserExpect(page.getByLabel("Verification code")).toBeFocused();
      await page
        .getByLabel("Verification code")
        .fill(codes.get("outage@example.test")!);
      await page
        .getByRole("button", { name: "Verify code", exact: true })
        .click();
      await browserExpect(
        page.getByRole("heading", { name: "Your account", exact: true }),
      ).toBeVisible();
      expect(
        transmissions.filter((value) =>
          value.path.endsWith("send-verification-otp"),
        ),
      ).toHaveLength(2);
      expect(blocked).toEqual([]);
      await context.close();
    } finally {
      await browser.close();
      active = makeWorkspace();
      expect(await active.ready).toBe(true);
    }
  },
  20_000,
);
