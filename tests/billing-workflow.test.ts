import { workspaceControl } from "../evaluation/workspace-navigation";
import { afterEach, expect, it, vi } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { createServer } from "node:http";
import express from "express";
import { resolve } from "node:path";
import { mkdir } from "node:fs/promises";
import { chromium, expect as browserExpect } from "@playwright/test";
import Stripe from "stripe";
import { Pool } from "pg";
import {
  billingEventApiVersion,
  createSyntheticBillingReceiver,
} from "../server/billing-events";
import { reconcileBillingReceipt } from "../server/billing-reconciliation";
import { usageDatabase } from "./fixtures/usage-postgres";
import { applyAccountMigrations } from "../server/account-migrations";
import { createSyntheticConsumerWorkspace } from "../server/consumer-workspace";
import {
  createSyntheticBillingWorkflow,
  billingWorkflowPrivilegePlan,
} from "../server/billing-workflow";
import {
  createTestBillingProvider,
  type BillingProvider,
} from "../server/billing-provider";
import { hostedBillingUrl, type BillingPlan } from "../shared/billing";

const enabled = !!process.env.PRIVATEAI_SYNTHETIC_PG;
const plan: BillingPlan = {
  id: "synthetic",
  name: "Synthetic evaluation plan",
  priceId: "price_synthetic",
  amountMinor: 1000,
  currency: "USD",
  interval: "month",
};
const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});
const identifier = (prefix: string) =>
  `${prefix}_${randomUUID().replaceAll("-", "")}`;
type Checkout = {
  id: string;
  livemode: false;
  mode: "subscription";
  customer: string;
  status: "open" | "complete" | "expired";
  url: string | null;
};
function providerFixture() {
  const sessions = new Map<string, Checkout>();
  const provider = {
    price: vi.fn(async () => ({
      id: plan.priceId,
      livemode: false,
      active: true,
      type: "recurring",
      unit_amount: plan.amountMinor,
      currency: "usd",
      recurring: {
        interval: "month",
        interval_count: 1,
        usage_type: "licensed",
      },
      billing_scheme: "per_unit",
    })),
    createCustomer: vi.fn(async (_operationId: string) => ({
      id: identifier("cus"),
      livemode: false,
    })),
    createCheckout: vi.fn(
      async (input: Parameters<BillingProvider["createCheckout"]>[0]) => {
        const id = identifier("cs_test");
        const session: Checkout = {
          id,
          livemode: false,
          mode: "subscription",
          customer: input.customerId,
          status: "open",
          url: `https://checkout.stripe.com/c/pay/${id}`,
        };
        sessions.set(id, session);
        return session;
      },
    ),
    checkout: vi.fn(async (id: string) => sessions.get(id)),
    createPortal: vi.fn(
      async (input: Parameters<BillingProvider["createPortal"]>[0]) => ({
        id: identifier("bps"),
        customer: input.customerId,
        livemode: false,
        url: "https://billing.stripe.com/p/session/synthetic",
      }),
    ),
  } satisfies BillingProvider;
  return { provider, sessions };
}
async function fixture() {
  const db = await usageDatabase({ empty: true });
  cleanups.push(db.dispose);
  await applyAccountMigrations(db.pool);
  const fake = providerFixture();
  const messages: { email: string; otp: string }[] = [];
  const secret = randomBytes(40).toString("hex");
  const server = createServer();
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  cleanups.push(() => new Promise<void>((done) => server.close(() => done())));
  const address = server.address();
  if (!address || typeof address === "string") throw Error("No port");
  const origin = `http://localhost:${address.port}`;
  function replica() {
    const instance = createSyntheticConsumerWorkspace({
      database: db.connect(),
      origin,
      secret,
      deliverCode: async (m) => {
        messages.push(m);
      },
      billing: { provider: fake.provider, plans: [plan] },
    });
    instance.app.use(express.static(resolve("dist")));
    return instance;
  }
  let active = replica();
  const webhookSecret = `whsec_${randomBytes(32).toString("hex")}`;
  const boundary = express();
  boundary.use(
    createSyntheticBillingReceiver({
      database: db.pool,
      signingSecret: webhookSecret,
    }),
  );
  boundary.use((req, res) => active.app(req, res));
  server.on("request", boundary);
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
  async function signIn(email = identifier("person") + "@example.test") {
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
    const status = await (
      await call("/api/status", undefined, { cookie })
    ).json();
    return {
      cookie,
      status,
      headers: { cookie, "X-PrivateAI-CSRF": status.csrf },
    };
  }
  return {
    db,
    ...fake,
    origin,
    messages,
    call,
    signIn,
    restart: () => {
      active = replica();
    },
    webhookSecret,
  };
}

it("test-only SDK creates fixed hosted sessions with opaque idempotency and no account content", async () => {
  const requests: { url: string; headers: Headers; body: string }[] = [];
  const client = Stripe.createFetchHttpClient(async (input, init) => {
    requests.push({
      url: String(input),
      headers: new Headers(init?.headers),
      body: String(init?.body ?? ""),
    });
    return new Response(JSON.stringify({ id: "synthetic" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
  expect(() =>
    createTestBillingProvider("sk_live_bad", "bpc_synthetic", client),
  ).toThrow();
  const provider = createTestBillingProvider(
    "sk_test_synthetic",
    "bpc_synthetic",
    client,
  );
  const operationId = randomUUID();
  await provider.createCustomer(operationId);
  await provider.createCheckout({
    operationId,
    customerId: "cus_synthetic",
    priceId: plan.priceId,
    returnOrigin: "http://localhost:4173",
  });
  await provider.createPortal({
    operationId,
    customerId: "cus_synthetic",
    returnOrigin: "http://localhost:4173",
  });
  expect(
    requests.every((r) => r.headers.get("Idempotency-Key") === operationId),
  ).toBe(true);
  const customer = new URLSearchParams(requests[0].body);
  expect([...customer.keys()]).toEqual(["metadata[privateai_operation]"]);
  const checkout = new URLSearchParams(requests[1].body);
  expect(checkout.get("customer")).toBe("cus_synthetic");
  expect(checkout.get("line_items[0][price]")).toBe(plan.priceId);
  expect(checkout.get("success_url")).toBe(
    "http://localhost:4173/?billing=return",
  );
  expect(new URLSearchParams(requests[2].body).get("configuration")).toBe(
    "bpc_synthetic",
  );
  for (const url of [
    "https://checkout.stripe.com.evil.test/c/pay/a",
    "http://checkout.stripe.com/c/pay/a",
    "https://evil@checkout.stripe.com/c/pay/a",
    "https://billing.stripe.com/p/session/a",
  ])
    expect(() => hostedBillingUrl(url, "checkout")).toThrow();
});

it.skipIf(!enabled)(
  "binds server-authenticated ownership, resumes one checkout across restart, uses portal and grants no access",
  async () => {
    const h = await fixture(),
      a = await h.signIn();
    expect(a.status.billingRehearsal).toBe(true);
    expect(
      (
        await h.call(
          "/api/billing/checkout",
          { planId: plan.id, customerId: "cus_attacker" },
          a.headers,
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await h.call(
          "/api/billing/checkout",
          { planId: plan.id },
          { cookie: a.cookie },
        )
      ).status,
    ).toBe(403);
    const first = await h.call(
      "/api/billing/checkout",
      { planId: plan.id },
      a.headers,
    );
    expect(first.status).toBe(200);
    const result = await first.json();
    h.restart();
    expect(
      await (
        await h.call("/api/billing/checkout", { planId: plan.id }, a.headers)
      ).json(),
    ).toEqual(result);
    expect(h.provider.createCustomer).toHaveBeenCalledTimes(1);
    expect(h.provider.createCheckout).toHaveBeenCalledTimes(1);
    const b = await h.signIn();
    expect((await h.call("/api/billing/portal", {}, b.headers)).status).toBe(
      409,
    );
    expect((await h.call("/api/billing/portal", {}, a.headers)).status).toBe(
      200,
    );
    expect(h.provider.createPortal.mock.calls[0][0].customerId).toBe(
      [...h.sessions.values()][0].customer,
    );
    const saved = await h.db.pool.query("SELECT * FROM billing_operation");
    expect(JSON.stringify(saved.rows)).not.toContain("https://");
    expect(JSON.stringify(saved.rows)).not.toContain("@example.test");
    expect(
      (await h.db.pool.query("SELECT count(*)::int n FROM usage_allowances"))
        .rows[0].n,
    ).toBe(0);
    expect(
      (await h.call("/api/inference/v1/chat/completions", {}, a.headers))
        .status,
    ).toBe(503);
  },
);

it.skipIf(!enabled)(
  "does not duplicate concurrent creation or repeat a persisted uncertain request",
  async () => {
    const h = await fixture(),
      a = await h.signIn();
    let finish!: (v: { id: string; livemode: false }) => void;
    h.provider.createCustomer.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const first = h.call(
      "/api/billing/checkout",
      { planId: plan.id },
      a.headers,
    );
    await vi.waitFor(() =>
      expect(h.provider.createCustomer).toHaveBeenCalledTimes(1),
    );
    expect(
      (await h.call("/api/billing/checkout", { planId: plan.id }, a.headers))
        .status,
    ).toBe(409);
    finish({ id: "cus_once", livemode: false });
    expect((await first).status).toBe(200);
    const b = await h.signIn();
    h.provider.createCheckout.mockRejectedValueOnce(
      Error("SENSITIVE FAILURE BODY"),
    );
    const failure = await h.call(
      "/api/billing/checkout",
      { planId: plan.id },
      b.headers,
    );
    expect(failure.status).toBe(409);
    expect(await failure.text()).not.toContain("SENSITIVE");
    const count = h.provider.createCheckout.mock.calls.length;
    h.restart();
    expect(
      (await h.call("/api/billing/checkout", { planId: plan.id }, b.headers))
        .status,
    ).toBe(409);
    expect(h.provider.createCheckout).toHaveBeenCalledTimes(count);
    expect(
      (
        await (
          await h.call("/api/billing/overview", undefined, b.headers)
        ).json()
      ).checkout,
    ).toBe("uncertain");
  },
);

it.skipIf(!enabled)(
  "rejects mismatched provider prices, customer identities and malicious redirect URLs",
  async () => {
    const h = await fixture(),
      a = await h.signIn();
    h.provider.price.mockResolvedValueOnce({
      ...(await h.provider.price()),
      unit_amount: 999,
    });
    expect(
      (await h.call("/api/billing/checkout", { planId: plan.id }, a.headers))
        .status,
    ).toBe(409);
    expect(h.provider.createCustomer).not.toHaveBeenCalled();
    h.provider.createCheckout.mockImplementationOnce(async (input) => ({
      id: "cs_test_bad",
      livemode: false,
      mode: "subscription",
      customer: input.customerId,
      status: "open",
      url: "https://attacker.test/payment",
    }));
    expect(
      (await h.call("/api/billing/checkout", { planId: plan.id }, a.headers))
        .status,
    ).toBe(409);
    const b = await h.signIn();
    h.provider.createCheckout.mockImplementationOnce(async () => ({
      id: "cs_test_other",
      livemode: false,
      mode: "subscription",
      customer: "cus_foreign",
      status: "open",
      url: "https://checkout.stripe.com/c/pay/other",
    }));
    expect(
      (await h.call("/api/billing/checkout", { planId: plan.id }, b.headers))
        .status,
    ).toBe(409);
  },
);

it.skipIf(!enabled)(
  "expired checkout can be replaced explicitly; completed checkout and return URLs never grant or repeat purchase",
  async () => {
    const h = await fixture(),
      a = await h.signIn();
    await h.call("/api/billing/checkout", { planId: plan.id }, a.headers);
    const old = [...h.sessions.values()][0];
    old.status = "expired";
    old.url = null;
    expect(
      await (
        await h.call("/api/billing/checkout", { planId: plan.id }, a.headers)
      ).json(),
    ).toMatchObject({ message: expect.stringContaining("expired") });
    expect(h.provider.createCheckout).toHaveBeenCalledTimes(1);
    await h.call("/api/billing/checkout", { planId: plan.id }, a.headers);
    expect(h.provider.createCheckout).toHaveBeenCalledTimes(2);
    const current = [...h.sessions.values()][1];
    current.status = "complete";
    current.url = null;
    expect(
      await (
        await h.call("/api/billing/checkout", { planId: plan.id }, a.headers)
      ).json(),
    ).toMatchObject({ message: expect.stringContaining("no access") });
    await h.call("/api/billing/checkout", { planId: plan.id }, a.headers);
    expect(h.provider.createCheckout).toHaveBeenCalledTimes(2);
    const status = await (
      await h.call("/api/billing/overview", undefined, a.headers)
    ).json();
    expect(status.accessGranted).toBe(false);
  },
);

it.skipIf(!enabled)(
  "quarantine and revocation block actions, including a response arriving after sign-out",
  async () => {
    const h = await fixture(),
      a = await h.signIn();
    await h.db.pool.query(
      "UPDATE account_recovery_control SET mode='quarantined'",
    );
    expect(
      (await h.call("/api/billing/checkout", { planId: plan.id }, a.headers))
        .status,
    ).toBe(503);
    expect(h.provider.price).not.toHaveBeenCalled();
    await h.db.pool.query("UPDATE account_recovery_control SET mode='normal'");
    let finish!: (v: { id: string; livemode: false }) => void;
    h.provider.createCustomer.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const request = h.call(
      "/api/billing/checkout",
      { planId: plan.id },
      a.headers,
    );
    await vi.waitFor(() =>
      expect(h.provider.createCustomer).toHaveBeenCalledTimes(1),
    );
    await h.call("/api/auth/sign-out", {}, a.headers);
    finish({ id: "cus_revoked", livemode: false });
    expect((await request).status).toBe(409);
    expect(h.provider.createCheckout).not.toHaveBeenCalled();
    expect(
      (
        await h.db.pool.query(
          "SELECT count(*)::int n FROM billing_customer_binding",
        )
      ).rows[0].n,
    ).toBe(0);
  },
);

it.skipIf(!enabled)(
  "whole browser journey: email login, checkout cancel/return, management, mobile layout and no draft disclosure",
  async () => {
    const h = await fixture();
    const browser = await chromium.launch({ headless: true });
    cleanups.push(() => browser.close());
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const transmissions: string[] = [];
    await context.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      const body = route.request().postData();
      if (body) transmissions.push(body);
      if (url.origin === h.origin) return route.continue();
      if (
        url.origin === "https://checkout.stripe.com" ||
        url.origin === "https://billing.stripe.com"
      )
        return route.fulfill({
          contentType: "text/html",
          body: `<h1>Synthetic hosted billing</h1><a href="${h.origin}/?billing=cancel">Cancel and return</a><a href="${h.origin}/?billing=return">Return to PrivateAI</a>`,
        });
      return route.abort();
    });
    const page = await context.newPage();
    await page.goto(h.origin + "/?account-lab=1");
    await page
      .getByLabel("Test email address")
      .fill("billingbrowser@example.test");
    await page
      .getByRole("button", { name: "Send test code", exact: true })
      .click();
    await browserExpect(page.getByLabel("Verification code")).toBeVisible();
    await page.getByLabel("Verification code").fill(h.messages.at(-1)!.otp);
    await page
      .getByRole("button", { name: "Verify test code", exact: true })
      .click();
    await page.getByRole("link", { name: "Open test workspace" }).click();
    await page
      .getByLabel("Message PrivateAI")
      .fill("SYNTHETIC-PRIVATE-DRAFT-NOT-FOR-BILLING");
    await workspaceControl(page, "Account")
      .click();
    await browserExpect(
      page.getByRole("heading", { name: "Subscription rehearsal" }),
    ).toBeVisible();
    await page.addStyleTag({ content: "html {font-size:200%}" });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await mkdir(".local/billing-evidence", { recursive: true });
    await page.screenshot({
      path: ".local/billing-evidence/rehearsal-mobile.png",
      fullPage: true,
    });
    // Declining departure must preserve the draft; the prepared checkout remains resumable.
    page.once("dialog", (dialog) => dialog.dismiss());
    await page
      .getByRole("button", { name: "Open test checkout", exact: true })
      .click();
    await browserExpect(
      page.getByRole("button", { name: "Continue or check checkout" }),
    ).toBeEnabled();
    expect(page.url()).toContain(h.origin);
    page.once("dialog", (dialog) => dialog.accept());
    await page
      .getByRole("button", { name: "Continue or check checkout" })
      .click();
    await page.getByRole("link", { name: "Cancel and return" }).click();
    await browserExpect(
      page.getByText("You returned without completing checkout.", {
        exact: false,
      }),
    ).toBeVisible();
    expect(h.provider.createCheckout).toHaveBeenCalledTimes(1);
    await page.getByRole("button", { name: "Manage test billing" }).click();
    await page.getByRole("link", { name: "Return to PrivateAI" }).click();
    await browserExpect(
      page.getByText("A return link does not confirm payment", {
        exact: false,
      }),
    ).toBeVisible();
    expect(transmissions.join("\n")).not.toContain("SYNTHETIC-PRIVATE-DRAFT");
    expect(JSON.stringify(h.provider.createCustomer.mock.calls)).not.toContain(
      "billingbrowser",
    );
    expect(
      (await h.db.pool.query("SELECT count(*)::int n FROM usage_allowances"))
        .rows[0].n,
    ).toBe(0);
  },
  30000,
);

it.skipIf(!enabled)(
  "signed event after checkout reconciles the same customer but still grants no private access",
  async () => {
    const h = await fixture(),
      a = await h.signIn();
    await h.call("/api/billing/checkout", { planId: plan.id }, a.headers);
    const session = [...h.sessions.values()][0];
    session.status = "complete";
    session.url = null;
    const eventId = identifier("evt");
    const payload = JSON.stringify({
      id: eventId,
      object: "event",
      type: "customer.subscription.updated",
      created: Math.floor(Date.now() / 1000),
      livemode: false,
      api_version: billingEventApiVersion,
      data: { object: { id: "sub_synthetic" } },
    });
    const response = await fetch(h.origin + "/api/billing/webhook", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "stripe-signature": Stripe.webhooks.generateTestHeaderString({
          payload,
          secret: h.webhookSecret,
        }),
      },
      body: payload,
    });
    expect(response.status).toBe(200);
    const now = Math.floor(Date.now() / 1000);
    const result = await reconcileBillingReceipt({
      database: h.db.pool,
      eventId,
      knownPriceIds: [plan.priceId],
      reader: {
        invoice: async () => {
          throw Error("Unexpected call");
        },
        checkout: async () => {
          throw Error("Unexpected call");
        },
        subscription: async () => ({
          id: "sub_synthetic",
          livemode: false,
          customer: session.customer,
          status: "active",
          pause_collection: null,
          pending_update: null,
          items: {
            has_more: false,
            data: [
              {
                quantity: 1,
                current_period_start: now - 1,
                current_period_end: now + 3600,
                price: { id: plan.priceId, livemode: false },
              },
            ],
          },
          latest_invoice: {
            id: "in_synthetic",
            livemode: false,
            customer: session.customer,
            status: "paid",
            amount_remaining: 0,
            parent: {
              type: "subscription_details",
              subscription_details: { subscription: "sub_synthetic" },
            },
          },
        }),
      },
    });
    expect(result.outcome).toBe("active_observed");
    expect(
      await (
        await h.call("/api/billing/overview", undefined, a.headers)
      ).json(),
    ).toMatchObject({ customerBound: true, accessGranted: false });
    expect(
      (await h.call("/api/inference/v1/chat/completions", {}, a.headers))
        .status,
    ).toBe(503);
  },
);

it.skipIf(!enabled)(
  "only exact top-level billing returns bypass cross-site navigation rejection",
  async () => {
    const h = await fixture(),
      a = await h.signIn();
    const headers = {
      ...a.headers,
      "sec-fetch-site": "cross-site",
      "sec-fetch-mode": "navigate",
      "sec-fetch-dest": "document",
    };
    // fetch supplies its own sec-fetch-mode; use ordinary request headers for negative API checks.
    expect(
      (await h.call("/api/billing/checkout", { planId: plan.id }, headers))
        .status,
    ).toBe(403);
    expect(
      (await h.call("/api/billing/overview", undefined, headers)).status,
    ).toBe(403);
    expect(
      (
        await h.call(
          "/?billing=return&next=https://evil.test",
          undefined,
          headers,
        )
      ).status,
    ).toBe(403);
    expect(h.provider.createCustomer).not.toHaveBeenCalled();
  },
);

it.skipIf(!enabled)(
  "late customer response cannot erase uncertainty or bind an account after the deadline",
  async () => {
    const h = await fixture(),
      a = await h.signIn();
    let finish!: (v: { id: string; livemode: false }) => void;
    h.provider.createCustomer.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    expect(
      (await h.call("/api/billing/checkout", { planId: plan.id }, a.headers))
        .status,
    ).toBe(409);
    finish({ id: "cus_late", livemode: false });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(
      (
        await h.db.pool.query(
          "SELECT count(*)::int n FROM billing_customer_binding",
        )
      ).rows[0].n,
    ).toBe(0);
    expect(
      (await h.db.pool.query("SELECT state FROM billing_operation")).rows[0]
        .state,
    ).toBe("uncertain");
    expect(
      (await h.call("/api/billing/checkout", { planId: plan.id }, a.headers))
        .status,
    ).toBe(409);
    expect(h.provider.createCustomer).toHaveBeenCalledTimes(1);
  },
  10000,
);

it.skipIf(!enabled)(
  "separate workflow role can create owned checkout but cannot read credentials or grant allowance",
  async () => {
    const h = await fixture(),
      a = await h.signIn();
    const role = identifier("billingworkflow");
    const password = randomBytes(24).toString("hex");
    let pool: Pool | undefined;
    try {
      const schema = (await h.db.pool.query("SELECT current_schema() AS name"))
        .rows[0].name;
      const session = (
        await h.db.pool.query('SELECT id FROM session WHERE "userId"=$1', [
          a.status.accountId,
        ])
      ).rows[0].id;
      await h.db.pool.query(
        `CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`,
      );
      for (const sql of billingWorkflowPrivilegePlan(schema, role))
        await h.db.pool.query(sql);
      const url = new URL(process.env.PRIVATEAI_SYNTHETIC_PG!);
      url.username = role;
      url.password = password;
      pool = new Pool({
        connectionString: url.toString(),
        options: `-c search_path=${schema}`,
      });
      const service = createSyntheticBillingWorkflow({
        database: pool,
        origin: h.origin,
        provider: h.provider,
        plans: [plan],
      });
      expect(
        await service.checkout(a.status.accountId, session, plan.id),
      ).toMatchObject({ url: expect.stringContaining("checkout.stripe.com") });
      await expect(pool.query("SELECT token FROM session")).rejects.toThrow(
        "permission denied",
      );
      await expect(pool.query('SELECT email FROM "user"')).rejects.toThrow(
        "permission denied",
      );
      await expect(
        pool.query("INSERT INTO usage_accounts(account_id) VALUES('bad')"),
      ).rejects.toThrow("permission denied");
      await expect(
        pool.query(
          "UPDATE billing_customer_binding SET customer_id='cus_other'",
        ),
      ).rejects.toThrow("permission denied");
    } finally {
      await pool?.end();
      await h.db.pool.query(`DROP OWNED BY "${role}"`);
      await h.db.pool.query(`DROP ROLE "${role}"`);
    }
  },
);

it("refuses a public billing rehearsal mount", () => {
  expect(() =>
    createSyntheticBillingWorkflow({
      database: {} as never,
      origin: "https://app.cometrow.com",
      provider: providerFixture().provider,
      plans: [plan],
    }),
  ).toThrow("localhost");
});
