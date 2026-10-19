import { afterEach, expect, it, vi } from "vitest";
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import express from "express";
import { resolve } from "node:path";
import { chromium, expect as browserExpect, type Page } from "@playwright/test";
import { usageDatabase } from "./fixtures/usage-postgres";
import { applyAccountMigrations } from "../server/account-migrations";
const search = vi.hoisted(() => vi.fn());
vi.mock("../server/research", async (original) => ({
  ...(await original<typeof import("../server/research")>()),
  searchWeb: search,
}));
import { createSyntheticConsumerWorkspace } from "../server/consumer-workspace";

const enabled = !!process.env.PRIVATEAI_SYNTHETIC_PG;
const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
  search.mockReset();
});

async function setup() {
  const db = await usageDatabase({ empty: true });
  cleanups.push(db.dispose);
  await applyAccountMigrations(db.pool);
  const firstPool = db.connect(),
    secondPool = db.connect();
  const secret = randomBytes(48).toString("base64url");
  const messages: { email: string; otp: string }[] = [];
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  cleanups.push(
    () => new Promise<void>((resolve) => server.close(() => resolve())),
  );
  const address = server.address();
  if (!address || typeof address === "string") throw Error("port");
  const origin = `http://localhost:${address.port}`;
  const replica = (database: typeof firstPool) => {
    const workspace = createSyntheticConsumerWorkspace({
      origin,
      secret,
      database,
      deliverCode: async (m) => {
        messages.push(m);
      },
      searchKey: "SYNTHETIC_ONLY",
    });
    const { app, control, usage } = workspace;
    app.use(express.static(resolve("dist")));
    return { app, control, usage };
  };
  const first = replica(firstPool),
    second = replica(secondPool);
  let active = first;
  server.on("request", (req, res) => active.app(req, res));
  const call = (
    path: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ) =>
    fetch(origin + path, {
      method: body === undefined ? "GET" : "POST",
      headers: { origin, "content-type": "application/json", ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  const signIn = async (email: string) => {
    expect(
      (
        await call("/api/auth/email-otp/send-verification-otp", {
          email,
          type: "sign-in",
        })
      ).status,
    ).toBe(200);
    const response = await call("/api/auth/sign-in/email-otp", {
      email,
      otp: messages.at(-1)!.otp,
    });
    expect(response.status).toBe(200);
    const cookie = response.headers
      .getSetCookie()
      .map((v) => v.split(";")[0])
      .join("; ");
    const statusResponse = await call("/api/status", undefined, { cookie });
    expect(statusResponse.headers.get("set-cookie")).toBeNull(); // No legacy process-local session.
    const status = await statusResponse.json();
    const current = await (
      await call("/api/auth/get-session", undefined, { cookie })
    ).json();
    return {
      headers: { cookie, "x-privateai-csrf": status.csrf as string },
      status,
      session: current.session.id as string,
    };
  };
  return {
    db,
    origin,
    first,
    second,
    call,
    signIn,
    messages,
    switchReplica: () => {
      active = second;
    },
    restart: () => {
      active = replica(db.connect());
    },
  };
}
const query = {
  kind: "search",
  value: "PUBLIC_SYNTHETIC_QUERY_DO_NOT_STORE",
} as const;

it.skipIf(!enabled)(
  "binds consent to a live signed-in session across replicas and restart, without durable research text",
  async () => {
    const h = await setup();
    expect((await h.call("/api/status")).status).toBe(401);
    const alice = await h.signIn("alice@example.test"),
      bob = await h.signIn("bob@example.test");
    expect(
      (
        await h.call("/api/research/prepare", query, {
          cookie: alice.headers.cookie,
        })
      ).status,
    ).toBe(403);
    const prepared = await (
      await h.call("/api/research/prepare", query, alice.headers)
    ).json();
    const saved = await h.db.pool.query("SELECT * FROM research_consent");
    expect(saved.rows).toHaveLength(1);
    expect(Object.keys(saved.rows[0]).sort()).toEqual([
      "commitment",
      "expires_at",
      "id",
      "session_id",
    ]);
    expect(JSON.stringify(saved.rows)).not.toContain(query.value);
    h.switchReplica();
    const status = await (
      await h.call("/api/status", undefined, alice.headers)
    ).json();
    expect(status.csrf).toBe(alice.status.csrf);
    expect(status.accessEpoch).toBe(alice.status.accessEpoch);
    expect(status.accountId).toBe(alice.status.accountId);
    expect(
      (
        await h.call(
          "/api/research/execute",
          { id: prepared.id, request: query },
          bob.headers,
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await h.call(
          "/api/research/execute",
          { id: prepared.id, request: { ...query, value: "changed" } },
          alice.headers,
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await h.call(
          "/api/research/execute",
          { id: prepared.id },
          alice.headers,
        )
      ).status,
    ).toBe(400);
    expect(search).not.toHaveBeenCalled();
    h.restart();
    search.mockResolvedValue([]);
    const responses = await Promise.all(
      Array.from({ length: 8 }, () =>
        h.call(
          "/api/research/execute",
          { id: prepared.id, request: query },
          alice.headers,
        ),
      ),
    );
    expect(responses.filter((r) => r.status === 200)).toHaveLength(1);
    expect(responses.filter((r) => r.status === 400)).toHaveLength(7);
    expect(search).toHaveBeenCalledTimes(1);
    expect(search.mock.calls[0][0]).toBe(query.value);
    expect(
      (await h.db.pool.query("SELECT * FROM research_consent")).rows,
    ).toHaveLength(0);
    await h.first.usage.createAllowance({
      accountId: alice.status.accountId,
      periodId: "synthetic",
      startsAt: Date.now() - 1000,
      endsAt: Date.now() + 60000,
      requestLimit: 3,
    });
    const restored = await (
      await h.call("/api/status", undefined, alice.headers)
    ).json();
    expect(restored.requestAllowance.state).toBe("active");
    expect(
      (await h.call("/api/inference/v1/chat/completions", {}, alice.headers))
        .status,
    ).toBe(503);
  },
);

it.skipIf(!enabled)(
  "rejects cancelled, expired and revoked consent and burns grants even when retrieval fails",
  async () => {
    const h = await setup();
    const alice = await h.signIn("alice@example.test");
    const issue = async () =>
      (await h.call("/api/research/prepare", query, alice.headers)).json();
    const execute = (id: string) =>
      h.call("/api/research/execute", { id, request: query }, alice.headers);
    const cancelled = await issue();
    expect(
      (
        await h.call(
          "/api/research/cancel",
          { id: cancelled.id },
          alice.headers,
        )
      ).status,
    ).toBe(200);
    expect((await execute(cancelled.id)).status).toBe(400);
    const expired = await issue();
    await h.db.pool.query(
      "UPDATE research_consent SET expires_at=NOW()-interval '1 second'",
    );
    expect((await execute(expired.id)).status).toBe(400);
    const failed = await issue();
    search.mockRejectedValueOnce(Error("DO_NOT_LEAK_QUERY_OR_DIAGNOSTICS"));
    const response = await execute(failed.id);
    expect(response.status).toBe(400);
    expect(await response.text()).not.toContain("DO_NOT_LEAK");
    expect((await execute(failed.id)).status).toBe(400);
    expect(search).toHaveBeenCalledTimes(1);
    const revoked = await issue();
    expect((await h.call("/api/auth/sign-out", {}, alice.headers)).status).toBe(
      200,
    );
    h.switchReplica();
    expect((await execute(revoked.id)).status).toBe(401);
    await expect(
      h.second.control.approvals.consume(alice.session, revoked.id, query),
    ).rejects.toThrow();
    expect(
      (await h.db.pool.query("SELECT * FROM research_consent")).rows,
    ).toHaveLength(0);
  },
);

it.skipIf(!enabled)(
  "enforces shared pending and request limits atomically and fails closed on storage outage",
  async () => {
    const h = await setup();
    const alice = await h.signIn("alice@example.test");
    const issues = await Promise.allSettled(
      Array.from({ length: 24 }, (_, i) =>
        (i % 2 ? h.first : h.second).control.approvals.issue(
          alice.session,
          query,
        ),
      ),
    );
    expect(issues.filter((r) => r.status === "fulfilled")).toHaveLength(20);
    expect(
      (await h.db.pool.query("SELECT count(*)::int n FROM research_consent"))
        .rows[0].n,
    ).toBe(20);
    await h.db.pool.query("INSERT INTO consumer_request_count VALUES($1,199)", [
      alice.session,
    ]);
    const responses = await Promise.all(
      Array.from({ length: 10 }, () =>
        h.call("/api/research/cancel", { id: "0".repeat(48) }, alice.headers),
      ),
    );
    expect(responses.filter((r) => r.status === 200)).toHaveLength(1);
    expect(responses.filter((r) => r.status === 429)).toHaveLength(9);
    h.restart();
    expect(
      (await h.call("/api/research/prepare", query, alice.headers)).status,
    ).toBe(429);
    await h.db.pool.query(
      "ALTER TABLE consumer_request_count RENAME TO offline_count",
    );
    const outage = await h.call("/api/research/prepare", query, alice.headers);
    expect(outage.status).toBe(503);
    expect(await outage.text()).not.toContain("offline_count");
    expect(search).not.toHaveBeenCalled();
  },
);

it.skipIf(!enabled)(
  "invalidates consent after session expiry or email unverification",
  async () => {
    const h = await setup();
    const alice = await h.signIn("alice@example.test");
    const grant = await h.first.control.approvals.issue(alice.session, query);
    await h.db.pool.query(
      'UPDATE "user" SET "emailVerified"=false WHERE id=$1',
      [alice.status.accountId],
    );
    expect((await h.call("/api/status", undefined, alice.headers)).status).toBe(
      401,
    );
    await expect(
      h.second.control.approvals.consume(alice.session, grant.id, query),
    ).rejects.toThrow();
    await h.db.pool.query(
      'UPDATE "user" SET "emailVerified"=true WHERE id=$1',
      [alice.status.accountId],
    );
    await h.db.pool.query(
      'UPDATE "session" SET "expiresAt"=NOW()-interval \'1 second\' WHERE id=$1',
      [alice.session],
    );
    await expect(
      h.second.control.approvals.consume(alice.session, grant.id, query),
    ).rejects.toThrow();
    expect((await h.call("/api/status", undefined, alice.headers)).status).toBe(
      401,
    );
    expect(search).not.toHaveBeenCalled();
  },
);

it.skipIf(!enabled)(
  "uses the actual account and research UI with durable consent, temporary sources and no extra disclosure",
  async () => {
    const h = await setup();
    search.mockResolvedValue([
      {
        id: "web-001",
        title: "Synthetic public source",
        text: "Synthetic evidence only",
        url: "https://example.org/public",
        retrievedAt: new Date().toISOString(),
        evidenceKind: "search-excerpt",
      },
    ]);
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
      });
      await context.route("**/*", (route) =>
        new URL(route.request().url()).origin === h.origin
          ? route.continue()
          : route.abort(),
      );
      const page = await context.newPage();
      await page.goto(h.origin + "/?account-lab=1");
      await page.getByLabel("Test email address").fill("browser@example.test");
      await page
        .getByRole("button", { name: "Send test code", exact: true })
        .click();
      await browserExpect(page.getByLabel("Verification code")).toBeVisible();
      await page.getByLabel("Verification code").fill(h.messages.at(-1)!.otp);
      await page
        .getByRole("button", { name: "Verify test code", exact: true })
        .click();
      await browserExpect(
        page.getByRole("button", { name: "Sign out", exact: true }),
      ).toBeVisible();
      h.switchReplica();
      await page.getByRole("link", { name: "Open test workspace" }).click();
      await page
        .getByLabel("Message PrivateAI")
        .fill("SYNTHETIC PRIVATE DRAFT MUST NOT LEAVE BROWSER");
      await page
        .getByRole("navigation", { name: "Workspace" })
        .getByRole("button", { name: "Research" })
        .click();
      await page.getByLabel("Exact search query").fill(query.value);
      await page.getByRole("button", { name: "Review disclosure" }).click();
      const delivered = page.waitForResponse((r) =>
        r.url().endsWith("/api/research/execute"),
      );
      await page.getByRole("button", { name: "Approve and retrieve" }).click();
      const researchResponse = await delivered;
      expect(await researchResponse.text()).toContain(
        "Synthetic public source",
      );
      expect(researchResponse.status()).toBe(200);
      await browserExpect(
        page.getByRole("status").filter({ hasText: "Search results added" }),
      ).toBeVisible();
      expect(search).toHaveBeenCalledTimes(1);
      expect(search.mock.calls[0][0]).toBe(query.value);
      expect(
        (await h.db.pool.query("SELECT * FROM research_consent")).rows,
      ).toHaveLength(0);
      await page
        .getByRole("navigation", { name: "Workspace" })
        .getByRole("button", { name: "Conversation", exact: false })
        .click();
      await browserExpect(page.getByLabel("Message PrivateAI")).toHaveValue(
        "SYNTHETIC PRIVATE DRAFT MUST NOT LEAVE BROWSER",
      );
      page.on("dialog", (dialog) => dialog.accept());
      await page.reload();
      await browserExpect(
        page.getByText("Synthetic public source", { exact: true }),
      ).toHaveCount(0);
      await context.close();
    } finally {
      await browser.close();
    }
  },
  40000,
);

it.skipIf(!enabled)(
  "keeps account vaults separate and clears other tabs on sign-out without silently discarding a draft",
  async () => {
    const h = await setup();
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
      });
      context.setDefaultTimeout(5000);
      const external: string[] = [];
      await context.route("**/*", (route) => {
        if (new URL(route.request().url()).origin === h.origin)
          return route.continue();
        external.push(route.request().url());
        return route.abort();
      });
      const page = await context.newPage();
      const tab = (p: Page, name: string) =>
        p
          .getByRole("navigation", { name: "Workspace" })
          .getByRole("button", { name, exact: false });
      const login = async (email: string) => {
        await browserExpect(
          page.getByLabel("Test email address"),
        ).toBeVisible();
        await page.getByLabel("Test email address").fill(email);
        await browserExpect(page.getByLabel("Test email address")).toHaveValue(
          email,
        );
        expect(
          await page
            .locator("form")
            .evaluate((form) => (form as HTMLFormElement).checkValidity()),
        ).toBe(true);
        const sentCode = page.waitForResponse(
          (r) => r.url().endsWith("/api/auth/email-otp/send-verification-otp"),
          { timeout: 5000 },
        );
        await page
          .getByRole("button", { name: "Send test code", exact: true })
          .click();
        const codeResponse = await sentCode.catch(async () => {
          throw Error(
            `Synthetic sign-in did not submit for ${email}: ${await page.locator("body").innerText()}`,
          );
        });
        expect(codeResponse.status()).toBe(200);
        await browserExpect(page.getByLabel("Verification code")).toBeVisible();
        await page.getByLabel("Verification code").fill(h.messages.at(-1)!.otp);
        await page
          .getByRole("button", { name: "Verify test code", exact: true })
          .click();
        await page.getByRole("link", { name: "Open test workspace" }).click();
        await browserExpect(page.getByLabel("Message PrivateAI")).toBeVisible();
      };
      const unlock = async () => {
        await tab(page, "Saved").click();
        await page
          .getByLabel("Vault passphrase")
          .fill("SYNTHETIC common test vault passphrase");
        await page
          .getByRole("button", { name: "Create or unlock vault" })
          .click();
        await browserExpect(
          page.getByText("Local vault unlocked", { exact: true }),
        ).toBeVisible();
      };
      await page.goto(h.origin);
      await login("owner-a@example.test");
      await page
        .getByLabel("Message PrivateAI")
        .fill("SYNTHETIC ACCOUNT A DRAFT");
      await unlock();
      await page
        .getByLabel("Conversation title")
        .fill("ACCOUNT A PRIVATE TITLE");
      await page
        .getByRole("button", { name: "Save encrypted snapshot" })
        .click();
      await browserExpect(
        page.getByText("No unsaved workspace changes.", { exact: false }),
      ).toBeVisible();
      const other = await context.newPage();
      await other.goto(h.origin);
      await other.getByLabel("Message PrivateAI").fill("UNSAVED OTHER TAB");
      await tab(page, "Conversation").click();
      await page
        .getByLabel("Message PrivateAI")
        .fill("UNSAVED ACCOUNT A CHANGE");
      await tab(page, "Account").click();
      page.once("dialog", (dialog) => dialog.dismiss());
      await page.getByRole("button", { name: "Sign out", exact: true }).click();
      await browserExpect(
        page.getByRole("button", { name: "Sign out", exact: true }),
      ).toBeVisible();
      await tab(page, "Conversation").click();
      await browserExpect(page.getByLabel("Message PrivateAI")).toHaveValue(
        "UNSAVED ACCOUNT A CHANGE",
      );
      await tab(page, "Account").click();
      page.once("dialog", (dialog) => dialog.accept());
      await page.getByRole("button", { name: "Sign out", exact: true }).click();
      await browserExpect(page.getByLabel("Test email address")).toBeVisible();
      await browserExpect(other.getByLabel("Message PrivateAI")).toHaveValue(
        "",
      );
      await other.evaluate(() => window.dispatchEvent(new Event("focus")));
      await browserExpect(other.getByLabel("Test email address")).toBeVisible();
      await login("owner-b@example.test");
      await unlock();
      await browserExpect(
        page.getByText("ACCOUNT A PRIVATE TITLE", { exact: true }),
      ).toHaveCount(0);
      await browserExpect(
        page.getByRole("button", { name: "Open", exact: true }),
      ).toHaveCount(0);
      await tab(page, "Account").click();
      await page.getByRole("button", { name: "Sign out", exact: true }).click();
      await login("owner-a@example.test");
      await unlock();
      await browserExpect(
        page.getByText("ACCOUNT A PRIVATE TITLE", { exact: true }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Open", exact: true }).click();
      await browserExpect(page.getByLabel("Message PrivateAI")).toHaveValue(
        "SYNTHETIC ACCOUNT A DRAFT",
      );
      expect(external).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      // A server-side revocation must also clear the active workspace on access recheck.
      await h.db.pool.query(
        'DELETE FROM "session" WHERE "userId"=(SELECT id FROM "user" WHERE email=$1)',
        ["owner-a@example.test"],
      );
      h.restart();
      await page.evaluate(() => window.dispatchEvent(new Event("focus")));
      await browserExpect(page.getByLabel("Test email address")).toBeVisible();
      expect(await page.locator("body").textContent()).not.toContain(
        "SYNTHETIC ACCOUNT A DRAFT",
      );
      await context.close();
    } finally {
      await browser.close();
    }
  },
  45000,
);
