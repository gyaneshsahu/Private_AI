import { workspaceControl } from "../evaluation/workspace-navigation";
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
import { emptyConversation } from "../shared/contracts";
import { newMessage } from "../src/conversation";
import { derive } from "../src/vault-crypto";
import { encodeVaultBackup } from "../src/vault-backup";
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

for (const viewport of [
  { width: 1280, height: 900 },
  { width: 390, height: 844 },
])
  it.skipIf(!enabled)(
    `connects recovery, documents, encrypted history, durable allowance and sign-out at ${viewport.width}px without opening inference`,
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
          viewport,
          ignoreHTTPSErrors: true,
        });
        await routeLocally(context);
        const page = await context.newPage();
        const email = `journey-${viewport.width}@example.test`;
        const signIn = async (targetEmail = email) => {
          await page.goto(origin + "/account");
          await browserExpect(
            page.getByRole("button", {
              name: "Continue with email",
              exact: true,
            }),
          ).toBeEnabled();
          for (const provider of ["Google", "Apple"]) {
            await browserExpect(
              page.getByRole("button", {
                name: `Continue with ${provider} Coming later`,
                exact: true,
              }),
            ).toBeDisabled();
          }
          await page
            .getByText("Privacy and account recovery", { exact: true })
            .click();
          await browserExpect(
            page.getByText("PrivateAI stores your email address", {
              exact: false,
            }),
          ).toBeVisible();
          await page
            .getByText("Privacy and account recovery", { exact: true })
            .click();
          await mkdir(".local/ui-integrated-20261020", { recursive: true });
          for (const theme of ["light", "dark"]) {
            await page
              .getByLabel("Appearance", { exact: true })
              .selectOption(theme);
            await page.screenshot({
              path: `.local/ui-integrated-20261020/sign-in-${viewport.width}-${theme}.png`,
              animations: "disabled",
            });
          }
          await page
            .getByLabel("Email address", { exact: true })
            .fill(targetEmail);
          await page
            .getByRole("button", { name: "Continue with email", exact: true })
            .click();
          await browserExpect(
            page.getByLabel("Verification code"),
          ).toBeVisible();
          await page
            .getByLabel("Verification code")
            .fill(codes.get(targetEmail)!);
          await page
            .getByRole("button", { name: "Verify code", exact: true })
            .click();
          await browserExpect(
            page.getByRole("heading", { name: "Your account", exact: true }),
          ).toBeVisible();
        };
        const nav = (name: string) => workspaceControl(page, name);
        const unlock = async () => {
          await nav("Saved").click();
          await page
            .getByLabel("Vault passphrase")
            .fill("JOURNEY_SYNTHETIC_SECRET_ONLY");
          await page
            .getByRole("button", { name: "Create or unlock vault" })
            .click();
        };
        await signIn();
        await page
          .getByRole("button", { name: "Finish sign-in recovery" })
          .click();
        await browserExpect(page.getByRole("status")).toContainText(
          "Other sessions were signed out",
        );
        const user = await db.pool.query(
          'SELECT id FROM "user" WHERE email=$1',
          [email],
        );
        const accountId = user.rows[0].id as string;
        await active.usage.createAllowance({
          accountId,
          periodId: `journey-${viewport.width}`,
          startsAt: Date.now() - 1000,
          endsAt: Date.now() + 3600000,
          requestLimit: 2,
        });
        await page
          .getByRole("link", { name: "Open workspace", exact: true })
          .click();
        await page
          .getByLabel("Message PrivateAI")
          .fill("JOURNEY_LOCAL_DRAFT: explain the corrected note");
        await page
          .getByLabel("Attach files to this conversation")
          .setInputFiles({
            name: "journey.txt",
            mimeType: "text/plain",
            buffer: Buffer.from("JOURNEY_LOCAL_DOCUMENT before 12:15"),
          });
        await page
          .getByRole("button", { name: "Review journey.txt", exact: true })
          .click();
        await page.locator(".content-view details summary").first().click();
        await page
          .getByLabel("Text for journey.txt", { exact: true })
          .fill("JOURNEY_LOCAL_CORRECTION strictly before 12:20");
        await unlock();
        await page
          .getByLabel("Conversation title", { exact: true })
          .fill("JOURNEY_PRIVATE_TITLE");
        await page
          .getByRole("button", { name: "Save encrypted snapshot" })
          .click();
        await browserExpect(
          page.getByRole("article", { name: "JOURNEY_PRIVATE_TITLE" }),
        ).toBeVisible();
        const sidebar = async () => {
          const toggle = page.getByRole("button", {
            name: "Open navigation",
            exact: true,
          });
          if (
            (await toggle.isVisible()) &&
            !(await page
              .getByRole("dialog", { name: "Navigation", exact: true })
              .isVisible())
          )
            await toggle.click();
        };
        await sidebar();
        for (const name of ["JOURNEY_Project", "JOURNEY_Second project"]) {
          await page
            .getByRole("button", { name: "Create project", exact: true })
            .click();
          await page.getByLabel("Project name", { exact: true }).fill(name);
          await page
            .locator(".project-form")
            .getByRole("button", { name: "Create", exact: true })
            .click();
          await browserExpect(page.locator(".project-list")).toContainText(
            name,
          );
        }
        await page
          .getByLabel("Actions for project JOURNEY_Project", { exact: true })
          .click();
        await page
          .getByRole("button", { name: "Rename project", exact: true })
          .click();
        await page
          .getByLabel("Project name", { exact: true })
          .fill("JOURNEY_Renamed");
        await page
          .getByRole("button", { name: "Save project name", exact: true })
          .click();
        await page.getByRole("button", { name: "Recent", exact: true }).click();
        const actions = page.getByLabel("Actions for JOURNEY_PRIVATE_TITLE", {
          exact: true,
        });
        await actions.click();
        await page.getByRole("button", { name: "Pin", exact: true }).click();
        await actions.click();
        await page
          .getByLabel("Project for JOURNEY_PRIVATE_TITLE", { exact: true })
          .selectOption({ label: "JOURNEY_Renamed" });
        await page.keyboard.press("Escape");
        await actions.click();
        await page
          .getByRole("button", { name: "Archive", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Archived", exact: true })
          .click();
        await actions.click();
        await page
          .getByRole("button", { name: "Restore chat", exact: true })
          .click();
        await page.getByRole("button", { name: "Recent", exact: true }).click();
        await page
          .getByRole("searchbox", { name: "Search chats" })
          .fill("JOURNEY_PRIVATE_TITLE");
        await browserExpect(page.locator(".chat-list-row")).toHaveCount(1);
        await page.getByRole("searchbox", { name: "Search chats" }).fill("");
        if (
          await page
            .getByRole("dialog", { name: "Navigation", exact: true })
            .isVisible()
        )
          await page.getByRole("button", { name: "Close navigation" }).click();
        // Actual encrypted restore path, with explicitly synthetic model replies (no inference).
        const reviewSource = {
          id: "journey-source",
          title: "Synthetic release notice",
          text: "The launch is planned. No opening has been confirmed.",
        };
        const fixtureChats = Array.from({ length: 3 }, (_, i) => ({
          ...emptyConversation(),
          title: `JOURNEY_REPLIES_${i}`,
          messages: Array.from({ length: i === 0 ? 30 : 4 }, (_, turn) =>
            turn % 2 === 0
              ? newMessage("user", `Synthetic question ${turn}`)
              : {
                  ...newMessage(
                    "assistant",
                    "## Review\n\nA plan does not confirm opening. [journey-source]\n\n| State | Evidence |\n|---|---|\n| Planned | Notice |\n\n```js\nconst open = false;\n```",
                  ),
                  sourceSnapshot: [reviewSource],
                },
          ),
        }));
        fixtureChats[1].messages.push({
          ...newMessage("assistant", ""),
          status: "partial",
          failure: "timeout",
          included: false,
        } as (typeof fixtureChats)[1]["messages"][number]);
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const backup = await encodeVaultBackup(
          await derive("JOURNEY_SYNTHETIC_SECRET_ONLY", salt),
          salt,
          fixtureChats,
        );
        await page
          .getByLabel("Encrypted backup file", { exact: true })
          .setInputFiles({
            name: "synthetic.privateai-backup",
            mimeType: "application/json",
            buffer: Buffer.from(backup),
          });
        await page
          .getByLabel("Original backup passphrase", { exact: true })
          .fill("JOURNEY_SYNTHETIC_SECRET_ONLY");
        await page
          .getByRole("checkbox", {
            name: "I want to add copies from this backup to the current vault.",
          })
          .check();
        await page
          .getByRole("button", { name: "Restore as new copies" })
          .click();
        await browserExpect(page.getByRole("article")).toHaveCount(4);
        page.once("dialog", (dialog) => dialog.accept());
        await page
          .getByRole("article", { name: "JOURNEY_REPLIES_0", exact: true })
          .getByRole("button", { name: "Open", exact: true })
          .click();
        await browserExpect(page.locator(".messages article")).toHaveCount(30);
        await page
          .getByRole("button", {
            name: "Synthetic release notice",
            exact: true,
          })
          .first()
          .click();
        await browserExpect(page.getByRole("dialog")).toContainText(
          reviewSource.text,
        );
        await page.keyboard.press("Escape");
        for (const theme of ["light", "dark"]) {
          await nav("Settings").click();
          await page
            .getByLabel("Appearance", { exact: true })
            .selectOption(theme);
          await page.getByRole("button", { name: "Close settings" }).click();
          await page.screenshot({
            path: `.local/ui-integrated-20261020/workspace-${viewport.width}-${theme}.png`,
            animations: "disabled",
          });
        }
        await nav("Saved").click();
        const stored = await page.evaluate(async () => {
          const result: unknown[] = [];
          for (const info of await indexedDB.databases()) {
            const database = await new Promise<IDBDatabase>((done, reject) => {
              const req = indexedDB.open(info.name!);
              req.onsuccess = () => done(req.result);
              req.onerror = () => reject(req.error);
            });
            for (const store of Array.from(database.objectStoreNames))
              result.push(
                await new Promise((done, reject) => {
                  const req = database
                    .transaction(store)
                    .objectStore(store)
                    .getAll();
                  req.onsuccess = () => done(req.result);
                  req.onerror = () => reject(req.error);
                }),
              );
            database.close();
          }
          return JSON.stringify(result, (_key, value) =>
            value instanceof ArrayBuffer
              ? new TextDecoder().decode(value)
              : value,
          );
        });
        expect(stored).not.toContain("JOURNEY_");
        await page
          .getByRole("button", { name: "Lock and clear workspace" })
          .click();
        // These are explicit fixture attempts, not model completions or charges.
        for (const kind of ["complete", "interrupted"]) {
          const id = `fixture-${viewport.width}-${kind}`;
          expect(await active.usage.reserve(accountId, id)).toBe(true);
          await active.usage.dispatch(accountId, id);
          await active.usage.finish(
            accountId,
            id,
            kind === "complete" ? "transport_complete" : "uncertain",
          );
        }
        expect(
          await active.usage.reserve(accountId, "fixture-over-limit"),
        ).toBe(false);
        active = makeWorkspace();
        expect(await active.ready).toBe(true);
        await page.reload();
        await unlock();
        await page
          .getByRole("article", { name: "JOURNEY_PRIVATE_TITLE" })
          .getByRole("button", { name: "Open", exact: true })
          .click();
        await browserExpect(page.getByLabel("Message PrivateAI")).toHaveValue(
          "JOURNEY_LOCAL_DRAFT: explain the corrected note",
        );
        await browserExpect(
          page.getByRole("button", { name: "Send ↑", exact: true }),
        ).toBeDisabled();
        await nav("Context").click();
        await page.locator(".content-view details summary").first().click();
        await browserExpect(
          page.getByLabel("Text for journey.txt", { exact: true }),
        ).toHaveValue("JOURNEY_LOCAL_CORRECTION strictly before 12:20");
        await nav("Account").click();
        await browserExpect(
          page.getByRole("heading", { name: "0 requests remaining" }),
        ).toBeVisible();
        await browserExpect(
          page.getByText("Request allowance exhausted.", { exact: false }),
        ).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        const guarded = await page.evaluate(async () => {
          const status = await (await fetch("/api/status")).json();
          const response = await fetch("/api/inference/v1/chat/completions", {
            method: "POST",
            headers: { "x-privateai-csrf": status.csrf },
            body: "SYNTHETIC_GATE_PROBE",
          });
          return { ready: status.inference.ready, code: response.status };
        });
        expect(guarded).toEqual({ ready: false, code: 503 });
        await workspaceControl(page, "Account").click();
        await page
          .getByRole("button", { name: "Sign out", exact: true })
          .click();
        await browserExpect(
          page.getByRole("heading", { name: "Sign in to PrivateAI" }),
        ).toBeVisible();
        expect(
          await page.evaluate(async () => (await fetch("/api/status")).status),
        ).toBe(401);
        await signIn();
        await page
          .getByRole("link", { name: "Open workspace", exact: true })
          .click();
        await browserExpect(page.getByLabel("Message PrivateAI")).toBeEmpty();
        await unlock();
        await browserExpect(
          page.getByRole("article", { name: "JOURNEY_PRIVATE_TITLE" }),
        ).toBeVisible();
        await sidebar();
        await browserExpect(page.locator(".project-list")).toContainText(
          "JOURNEY_Renamed",
        );
        page.once("dialog", (d) => d.accept());
        await page
          .getByLabel("Actions for project JOURNEY_Renamed", { exact: true })
          .click();
        await page
          .getByRole("button", { name: "Remove project", exact: true })
          .click();
        await browserExpect(page.locator(".project-list")).not.toContainText(
          "JOURNEY_Renamed",
        );
        await browserExpect(page.locator(".chat-list-row")).toHaveCount(4);
        if (
          await page
            .getByRole("dialog", { name: "Navigation", exact: true })
            .isVisible()
        )
          await page.getByRole("button", { name: "Close navigation" }).click();
        await nav("Account").click();
        await page
          .getByRole("button", { name: "Sign out", exact: true })
          .click();
        await signIn(`second-${viewport.width}@example.test`);
        await page
          .getByRole("link", { name: "Open workspace", exact: true })
          .click();
        await unlock();
        await browserExpect(page.getByRole("article")).toHaveCount(0);
        await sidebar();
        await browserExpect(page.locator(".project-list")).not.toContainText(
          "JOURNEY_",
        );
        await browserExpect(page.locator(".account-label")).toContainText(
          `second-${viewport.width}@example.test`,
        );
        expect(blocked).toEqual([]);
        expect(
          transmissions.map((entry) => entry.body).join("\n"),
        ).not.toContain("JOURNEY_");
        await context.close();
      } finally {
        await browser.close();
      }
    },
    90000,
  );

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
      await workspaceControl(page, "Account").click();
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
      await browserExpect(page.getByLabel("Verification code")).toBeVisible();
      await browserExpect(page.getByLabel("Verification code")).toHaveValue("");
      await browserExpect(page.getByRole("status")).toContainText(
        "If a delayed code arrives, enter it below",
      );
      await browserExpect(
        page.getByRole("button", { name: "Verify code", exact: true }),
      ).toBeEnabled();
      await page
        .getByRole("button", { name: "Use another email", exact: true })
        .click();
      await browserExpect(page.getByLabel("Verification code")).toHaveCount(0);
      await browserExpect(
        page.getByRole("button", { name: "Continue with email", exact: true }),
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
