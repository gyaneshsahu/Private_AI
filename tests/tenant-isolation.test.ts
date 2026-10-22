import { afterEach, describe, expect, it, vi } from "vitest";
import { createServer } from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
import express from "express";
import { InviteRegistry } from "../server/invite-registry";
import { SqliteUsageLedger } from "../server/usage-ledger";
import { PostgresUsageLedger } from "../server/usage-postgres";
import type { UsageLedger } from "../server/usage-contract";
import { Approvals } from "../server/research";
import { usageDatabase } from "./fixtures/usage-postgres";
import { applyAccountMigrations } from "../server/account-migrations";
import { requestAccountClosure } from "../server/account-closure";
import { checks } from "../shared/contracts";
import { asUndiciRequestResult } from "./fixtures/undici-request";
const upstream = vi.hoisted(() => vi.fn());
const search = vi.hoisted(() => vi.fn());
vi.mock("undici", async (importOriginal) => ({
  ...(await importOriginal<typeof import("undici")>()),
  request: (url: unknown, options: unknown) =>
    Promise.resolve(upstream(url, options)).then(asUndiciRequestResult),
}));
vi.mock("../server/research", async (original) => ({
  ...(await original<typeof import("../server/research")>()),
  searchWeb: search,
}));
import { createApp } from "../server/app";
import { createSyntheticConsumerWorkspace } from "../server/consumer-workspace";

/*
 * Tenant isolation (PRD: public hosting). Two accounts, A and B.
 * Not exercised here: encrypted vault separation across accounts, tabs and sign-out. It
 * needs a real browser (IndexedDB) and is covered by tests/consumer-control.test.ts
 * ("keeps account vaults separate ...").
 * PostgreSQL-gated (skip unless PRIVATEAI_SYNTHETIC_PG is set): every `postgres:` ledger
 * case and the "consumer workspace (PostgreSQL)" cases below.
 */
const pgEnabled = !!process.env.PRIVATEAI_SYNTHETIC_PG;
const cleanups: (() => Promise<void> | void)[] = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
  upstream.mockReset();
  search.mockReset();
});

const NOW = 1_000_000;
const A = "account-a",
  B = "account-b";
const grant = (accountId: string, requestLimit: number) => ({
  accountId,
  periodId: `${accountId}-period`,
  startsAt: 0,
  endsAt: NOW * 10,
  requestLimit,
});
const metrics = (n: number) => ({
  promptTokens: n,
  completionTokens: n * 2,
  model: "SYNTHETIC_ONLY",
  costUsd: "0.000" + String(n).padStart(3, "0"),
});

type Ledger = UsageLedger & {
  createAllowance(input: ReturnType<typeof grant>): void | Promise<void>;
};
async function ledgerFor(backend: "sqlite" | "postgres"): Promise<Ledger> {
  if (backend === "sqlite") {
    const ledger = new SqliteUsageLedger(":memory:", () => NOW);
    cleanups.push(() => ledger.close());
    return ledger as Ledger;
  }
  const db = await usageDatabase();
  cleanups.push(db.dispose);
  return new PostgresUsageLedger(db.pool, () => NOW) as Ledger;
}

for (const backend of ["sqlite", "postgres"] as const)
  describe.skipIf(backend === "postgres" && !pgEnabled)(
    `${backend}: usage ledger isolation`,
    () => {
      it("keeps A out of B's allowance: no allowance of its own means no reservation, whatever B holds", async () => {
        const usage = await ledgerFor(backend);
        await usage.createAllowance(grant(B, 5));
        expect(await usage.reserve(A, "a-1")).toBe(false);
        expect(await usage.summary(A)).toEqual({ state: "unavailable" });
        expect(await usage.summary(B)).toMatchObject({
          state: "active",
          used: 0,
          remaining: 5,
        });
      });

      it("counts each account against its own limit and cannot reuse another account's period ID", async () => {
        const usage = await ledgerFor(backend);
        await usage.createAllowance(grant(A, 1));
        await usage.createAllowance(grant(B, 3));
        // A period ID belongs to one account; A cannot attach a second allowance to B's period.
        await expect(
          Promise.resolve().then(() =>
            usage.createAllowance({ ...grant(A, 9), periodId: `${B}-period` }),
          ),
        ).rejects.toThrow();
        expect(await usage.reserve(A, "a-1")).toBe(true);
        expect(await usage.reserve(A, "a-2")).toBe(false); // A exhausted
        for (const id of ["b-1", "b-2", "b-3"])
          expect(await usage.reserve(B, id)).toBe(true);
        expect(await usage.reserve(B, "b-4")).toBe(false);
        expect(await usage.summary(A)).toMatchObject({ used: 1, limit: 1 });
        expect(await usage.summary(B)).toMatchObject({ used: 3, limit: 3 });
      });

      it("refuses A's dispatch and settlement of B's request ID, leaving B's request intact", async () => {
        const usage = await ledgerFor(backend);
        await usage.createAllowance(grant(A, 5));
        await usage.createAllowance(grant(B, 5));
        expect(await usage.reserve(B, "b-secret")).toBe(true);
        await expect(
          Promise.resolve().then(() => usage.dispatch(A, "b-secret")),
        ).rejects.toThrow();
        // B dispatches; A still cannot settle it, with or without metering.
        await usage.dispatch(B, "b-secret");
        for (const outcome of ["transport_complete", "uncertain"] as const)
          await expect(
            Promise.resolve().then(() =>
              usage.finish(A, "b-secret", outcome, metrics(7)),
            ),
          ).rejects.toThrow();
        expect(await usage.metrics(A, "b-secret")).toBeUndefined();
        expect(await usage.summary(B)).toMatchObject({
          used: 1,
          pending: 1,
          uncertain: 0,
          meteredRequests: 0,
        });
        expect(await usage.summary(A)).toMatchObject({ used: 0, pending: 0 });
        // B's own settlement still succeeds afterwards.
        await usage.finish(B, "b-secret", "transport_complete", metrics(3));
        // Metering is readable only through the owning account.
        expect(await usage.metrics(B, "b-secret")).toEqual(metrics(3));
        expect(await usage.metrics(A, "b-secret")).toBeUndefined();
        expect(await usage.summary(B)).toMatchObject({
          pending: 0,
          meteredRequests: 1,
        });
      });

      it("never lets A replay B's request ID, before or after B settles it, and does not charge A", async () => {
        const usage = await ledgerFor(backend);
        await usage.createAllowance(grant(A, 5));
        await usage.createAllowance(grant(B, 5));
        expect(await usage.reserve(B, "b-replay")).toBe(true);
        expect(await usage.reserve(A, "b-replay")).toBe(false);
        await usage.dispatch(B, "b-replay");
        await usage.finish(B, "b-replay", "transport_complete", metrics(4));
        expect(await usage.reserve(A, "b-replay")).toBe(false);
        await expect(
          Promise.resolve().then(() =>
            usage.finish(A, "b-replay", "transport_complete", metrics(4)),
          ),
        ).rejects.toThrow();
        expect(await usage.summary(A)).toMatchObject({ used: 0, remaining: 5 });
        expect(await usage.summary(B)).toMatchObject({ used: 1 });
      });

      it("keeps metering recorded for A out of B's summary", async () => {
        const usage = await ledgerFor(backend);
        await usage.createAllowance(grant(A, 5));
        await usage.createAllowance(grant(B, 5));
        expect(await usage.reserve(A, "a-metered")).toBe(true);
        await usage.dispatch(A, "a-metered");
        await usage.finish(A, "a-metered", "transport_complete", metrics(12));
        expect(await usage.reserve(B, "b-quiet")).toBe(true);
        await usage.dispatch(B, "b-quiet");
        await usage.finish(B, "b-quiet", "uncertain");
        const a = await usage.summary(A),
          b = await usage.summary(B);
        expect(a).toMatchObject({
          meteredRequests: 1,
          promptTokens: 12,
          completionTokens: 24,
          costUsd: "0.000012",
        });
        expect(b).toMatchObject({
          meteredRequests: 0,
          promptTokens: 0,
          completionTokens: 0,
          unmeteredRequests: 1,
          uncertain: 1,
        });
        expect(b).not.toHaveProperty("costUsd");
      });
    },
  );

describe("research approvals are bound to the issuing session (unit)", () => {
  const request = { kind: "search", value: "PUBLIC_SYNTHETIC_QUERY" } as const;
  it("refuses another session's consume and revoke, and burns the grant for its owner only once", () => {
    const approvals = new Approvals();
    const grantA = approvals.issue("session-a", request);
    expect(() => approvals.consume("session-b", grantA.id, request)).toThrow();
    expect(() => approvals.consume("session-b", grantA.id)).toThrow();
    approvals.revoke("session-b", grantA.id); // must not cancel A's approval
    expect(approvals.consume("session-a", grantA.id, request)).toEqual(request);
    expect(() => approvals.consume("session-a", grantA.id, request)).toThrow();
  });
  it("does not let one session's pending approvals expose or consume another's ids", () => {
    const approvals = new Approvals();
    const one = approvals.issue("session-a", request),
      two = approvals.issue("session-b", request);
    expect(one.id).not.toBe(two.id);
    expect(() => approvals.consume("session-a", two.id)).toThrow();
    expect(approvals.consume("session-b", two.id)).toEqual(request);
    expect(approvals.consume("session-a", one.id)).toEqual(request);
  });
});

/** Relay over HTTP with invited accounts, the SQLite ledger and the in-memory Approvals. */
async function relay() {
  const registry = new InviteRegistry(":memory:");
  const usage = new SqliteUsageLedger(":memory:");
  const reserved: { accountId: string; requestId: string }[] = [];
  const barrier: { [accountId: string]: Promise<void> | undefined } = {};
  const waiting: { [accountId: string]: number } = {};
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw Error("port");
  const origin = `http://127.0.0.1:${address.port}`;
  const qualification = {
    provider: "tinfoil",
    model: "SYNTHETIC_ONLY",
    origin: "https://test.tinfoil.sh",
    repository: "tinfoilsh/test-only",
    releaseDigests: ["a".repeat(64)],
    reviewedAt: new Date(Date.now() - 1000).toISOString(),
    validUntil: new Date(Date.now() + 60000).toISOString(),
    review: Object.fromEntries(
      checks.map((key) => [
        key,
        { status: "pass", evidence: ["Synthetic fixture"] },
      ]),
    ),
    maxInputCharacters: 5000,
    maxOutputTokens: 500,
    pricing: { inputPerMillion: 1, outputPerMillion: 1, currency: "USD" },
    approvedSpendUSD: 1,
  };
  server.on(
    "request",
    createApp({
      origin,
      invites: registry,
      usage: {
        summary: (accountId) => usage.summary(accountId),
        reserve: async (accountId, requestId) => {
          reserved.push({ accountId, requestId });
          if (barrier[accountId]) {
            waiting[accountId] = (waiting[accountId] ?? 0) + 1;
            await barrier[accountId];
          }
          return usage.reserve(accountId, requestId);
        },
        dispatch: (accountId, requestId) =>
          usage.dispatch(accountId, requestId),
        finish: (accountId, requestId, outcome, metered) =>
          usage.finish(accountId, requestId, outcome, metered),
        metrics: (accountId, requestId) => usage.metrics(accountId, requestId),
      },
      qualification,
      apiKey: "SYNTHETIC_NOT_REAL",
      searchKey: "SYNTHETIC_ONLY",
    }),
  );
  cleanups.push(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    registry.close();
    usage.close();
  });
  const account = async () => {
    const invite = registry.issue(Date.now() + 60000);
    const registration = await fetch(origin + "/auth/register", {
      method: "POST",
      redirect: "manual",
      headers: {
        Origin: origin,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        id: invite.id,
        token: invite.token,
        password: "SYNTHETIC account password",
      }),
    });
    expect(registration.status).toBe(303);
    const cookie = registration.headers.get("set-cookie")!.split(";")[0];
    const response = await fetch(origin + "/api/status", {
      headers: { Cookie: cookie },
    });
    const status = await response.json();
    const sessionCookie = response.headers.get("set-cookie")!.split(";")[0];
    return {
      id: invite.id as string,
      accessCookie: cookie,
      sessionCookie,
      csrf: status.csrf as string,
      headers: {
        Origin: origin,
        Cookie: cookie + "; " + sessionCookie,
        "X-PrivateAI-CSRF": status.csrf as string,
        "Content-Type": "application/json",
      } as Record<string, string>,
    };
  };
  type Account = Awaited<ReturnType<typeof account>>;
  const call = (a: Account, path: string, body?: unknown) =>
    fetch(origin + path, {
      method: body === undefined ? "GET" : "POST",
      headers: a.headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  const send = (a: Account, extra: Record<string, string> = {}) =>
    fetch(origin + "/api/inference/v1/chat/completions", {
      method: "POST",
      headers: {
        ...a.headers,
        "Content-Type": "application/octet-stream",
        "X-Tinfoil-Enclave-Url": qualification.origin,
        "Ehbp-Encapsulated-Key": "a".repeat(64),
        ...extra,
      },
      body: new Uint8Array(32).fill(9),
    });
  const allow = (a: Account, requestLimit: number) =>
    usage.createAllowance({
      accountId: a.id,
      periodId: `${a.id}-period`,
      startsAt: Date.now() - 1000,
      endsAt: Date.now() + 60000,
      requestLimit,
    });
  const ok = () =>
    new Response(new Uint8Array(64), {
      headers: { "Ehbp-Response-Nonce": "b".repeat(64) },
    });
  const pending = (a: Account) =>
    (usage.summary(a.id) as { pending?: number }).pending;
  return {
    origin,
    registry,
    usage,
    reserved,
    barrier,
    waiting,
    account,
    call,
    send,
    allow,
    ok,
    pending,
  };
}
const query = { kind: "search", value: "PUBLIC_SYNTHETIC_QUERY" } as const;

describe("relay isolation over HTTP (SQLite ledger)", () => {
  it("binds allowances and request IDs to the caller, ignores account hints, and keeps A's metering out of B's status", async () => {
    const h = await relay();
    const [a, b] = [await h.account(), await h.account()];
    await h.allow(a, 3);
    await h.allow(b, 3);
    upstream.mockImplementation(async () => h.ok());
    expect((await h.send(a)).status).toBe(200);
    await expect.poll(() => h.pending(a)).toBe(0);
    // The reservation is for A's own ID with a server-generated request ID.
    expect(h.reserved).toHaveLength(1);
    expect(h.reserved[0].accountId).toBe(a.id);
    const aRequestId = h.reserved[0].requestId;
    // B cannot be steered to A's account or request ID by header.
    expect(
      (
        await h.send(b, {
          "X-Account-ID": a.id,
          "X-Request-ID": aRequestId,
          "X-PrivateAI-Account": a.id,
        })
      ).status,
    ).toBe(200);
    expect(h.reserved[1].accountId).toBe(b.id);
    expect(h.reserved[1].requestId).not.toBe(aRequestId);
    await expect.poll(() => h.pending(b)).toBe(0);
    expect(h.usage.summary(a.id)).toMatchObject({ used: 1, remaining: 2 });
    expect(h.usage.summary(b.id)).toMatchObject({ used: 1, remaining: 2 });
    // Replaying A's request ID against B's account is refused by the ledger.
    expect(h.usage.reserve(b.id, aRequestId)).toBe(false);
    expect(() => h.usage.finish(b.id, aRequestId, "uncertain")).toThrow();
    expect(h.usage.summary(a.id)).toMatchObject({ used: 1, uncertain: 0 });
    // Status reports only the caller's allowance, even with a hint for the other account.
    const statusA = await (
      await h.call(a, "/api/status?accountId=" + b.id)
    ).json();
    expect(statusA.accountId).toBe(a.id);
    expect(statusA.requestAllowance).toMatchObject({ used: 1 });
  });

  it("does not let an account without an allowance spend B's, and an exhausted A does not block B", async () => {
    const h = await relay();
    const [a, b] = [await h.account(), await h.account()];
    await h.allow(b, 5);
    expect((await h.send(a)).status).toBe(429);
    expect(upstream).not.toHaveBeenCalled();
    await h.allow(a, 1);
    upstream.mockImplementation(async () => h.ok());
    expect((await h.send(a)).status).toBe(200);
    await expect.poll(() => h.pending(a)).toBe(0);
    expect((await h.send(a)).status).toBe(429);
    expect((await h.send(b)).status).toBe(200);
    expect(h.usage.summary(b.id)).toMatchObject({ used: 1, remaining: 4 });
  });

  it("keeps A's session cookie and CSRF from acting on B's workspace status and approvals", async () => {
    const h = await relay();
    const [a, b] = [await h.account(), await h.account()];
    expect(a.csrf).not.toBe(b.csrf);
    // B's process session behind A's access cookie is not B's session.
    const crossStatus = await fetch(h.origin + "/api/status", {
      headers: {
        ...a.headers,
        Cookie: a.accessCookie + "; " + b.sessionCookie,
      },
    });
    const crossBody = await crossStatus.json();
    expect(crossBody.accountId).toBe(a.id);
    expect(crossBody.csrf).not.toBe(b.csrf);
    expect(JSON.stringify(crossBody)).not.toContain(b.id);
    // Mixed cookie and CSRF pairs are refused for mutations.
    for (const headers of [
      { ...b.headers, "X-PrivateAI-CSRF": a.csrf },
      { ...a.headers, "X-PrivateAI-CSRF": b.csrf },
    ])
      expect(
        (
          await fetch(h.origin + "/api/research/prepare", {
            method: "POST",
            headers,
            body: JSON.stringify(query),
          })
        ).status,
      ).toBe(403);
    // This composition has no billing surface (billing routes are PostgreSQL-gated below).
    const billing = await h.call(a, "/api/billing/overview");
    expect(billing.status).toBe(404);
    expect(await billing.text()).not.toContain(b.id);
  });

  it("refuses an approval issued to A for B, and cross-session cancel leaves it usable by A once", async () => {
    const h = await relay();
    const [a, b] = [await h.account(), await h.account()];
    search.mockResolvedValue([]);
    const issued = await (
      await h.call(a, "/api/research/prepare", query)
    ).json();
    expect(
      (
        await h.call(b, "/api/research/execute", {
          id: issued.id,
          request: query,
        })
      ).status,
    ).toBe(400);
    // B's cancel must not remove A's grant, and its answer must be
    // indistinguishable from cancelling an approval that never existed.
    const foreign = await h.call(b, "/api/research/cancel", { id: issued.id });
    const missing = await h.call(await h.account(), "/api/research/cancel", {
      id: "0".repeat(48),
    });
    expect(foreign.status).toBe(missing.status);
    expect(await foreign.text()).toBe(await missing.text());
    expect(search).not.toHaveBeenCalled();
    expect(
      (
        await h.call(a, "/api/research/execute", {
          id: issued.id,
          request: query,
        })
      ).status,
    ).toBe(200);
    expect(search).toHaveBeenCalledTimes(1);
    expect(
      (
        await h.call(a, "/api/research/execute", {
          id: issued.id,
          request: query,
        })
      ).status,
    ).toBe(400);
  });

  it("refuses A's approval once A's invite is revoked while B's own approval keeps working", async () => {
    const h = await relay();
    const [a, b] = [await h.account(), await h.account()];
    search.mockResolvedValue([]);
    const issued = await (
      await h.call(a, "/api/research/prepare", query)
    ).json();
    const own = await (await h.call(b, "/api/research/prepare", query)).json();
    h.registry.revoke(a.id);
    expect(
      (
        await h.call(a, "/api/research/execute", {
          id: issued.id,
          request: query,
        })
      ).status,
    ).toBe(401);
    expect(search).not.toHaveBeenCalled();
    expect(
      (
        await h.call(b, "/api/research/execute", {
          id: own.id,
          request: query,
        })
      ).status,
    ).toBe(200);
    expect(search).toHaveBeenCalledTimes(1);
  });

  it("bounds in-flight requests per account: A's pending request does not block B, A's second one is refused", async () => {
    const h = await relay();
    const [a, b] = [await h.account(), await h.account()];
    await h.allow(a, 5);
    await h.allow(b, 5);
    upstream.mockImplementation(async () => h.ok());
    let release!: () => void;
    h.barrier[a.id] = new Promise<void>((resolve) => (release = resolve));
    cleanups.push(() => release());
    const inFlight = h.send(a);
    await expect.poll(() => h.waiting[a.id]).toBe(1);
    expect((await h.send(a)).status).toBe(429); // same account: refused locally
    expect(h.waiting[a.id]).toBe(1);
    expect((await h.send(b)).status).toBe(200); // other account unaffected
    expect(h.reserved.filter((r) => r.accountId === b.id)).toHaveLength(1);
    release();
    delete h.barrier[a.id];
    expect((await inFlight).status).toBe(200);
    await expect.poll(() => h.pending(a)).toBe(0);
    expect(h.usage.summary(a.id)).toMatchObject({ used: 1 });
    expect(h.usage.summary(b.id)).toMatchObject({ used: 1 });
  });

  it("leaves B's allowance and session working after A is revoked", async () => {
    const h = await relay();
    const [a, b] = [await h.account(), await h.account()];
    await h.allow(a, 5);
    await h.allow(b, 5);
    upstream.mockImplementation(async () => h.ok());
    const before = h.usage.summary(b.id);
    h.registry.revoke(a.id);
    expect((await h.send(a)).status).toBe(401);
    expect((await h.call(a, "/api/status")).status).toBe(401);
    expect(upstream).not.toHaveBeenCalled();
    expect(h.usage.summary(b.id)).toEqual(before);
    const status = await (await h.call(b, "/api/status")).json();
    expect(status.accountId).toBe(b.id);
    expect(status.csrf).toBe(b.csrf);
    expect(status.requestAllowance).toMatchObject({
      state: "active",
      remaining: 5,
    });
    expect((await h.send(b)).status).toBe(200);
  });

  it("returns only the caller's own account ID in API responses", async () => {
    const h = await relay();
    const [a, b] = [await h.account(), await h.account()];
    await h.allow(a, 1);
    await h.allow(b, 1);
    upstream.mockImplementation(async () => h.ok());
    search.mockResolvedValue([]);
    const bodies: string[] = [];
    const record = async (response: Response) => {
      const text = await response.text();
      bodies.push(text + JSON.stringify([...response.headers]));
      return text;
    };
    await record(await h.call(a, "/api/status?accountId=" + b.id));
    await record(await h.send(a, { "X-Account-ID": b.id }));
    await record(await h.send(a, { "X-Account-ID": b.id })); // allowance exhausted
    const prepared = JSON.parse(
      await record(await h.call(a, "/api/research/prepare", query)),
    );
    await record(
      await h.call(a, "/api/research/execute", {
        id: prepared.id,
        request: query,
      }),
    );
    await record(await h.call(a, "/api/nope?accountId=" + b.id));
    for (const text of bodies) expect(text).not.toContain(b.id);
    expect(bodies[0]).toContain(a.id);
    const statusB = await (await h.call(b, "/api/status")).json();
    expect(statusB.accountId).toBe(b.id);
    expect(JSON.stringify(statusB)).not.toContain(a.id);
  });
});

/** PostgreSQL-gated: the consumer workspace with Better Auth sessions and billing rehearsal. */
async function workspace() {
  const db = await usageDatabase({ empty: true });
  cleanups.push(db.dispose);
  await applyAccountMigrations(db.pool);
  const messages: { email: string; otp: string }[] = [];
  const secret = randomBytes(48).toString("base64url");
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  cleanups.push(
    () => new Promise<void>((resolve) => server.close(() => resolve())),
  );
  const address = server.address();
  if (!address || typeof address === "string") throw Error("port");
  const origin = `http://localhost:${address.port}`;
  const identifier = (prefix: string) =>
    `${prefix}_${randomUUID().replaceAll("-", "")}`;
  const plan = {
    id: "synthetic",
    name: "Synthetic evaluation plan",
    priceId: "price_synthetic",
    amountMinor: 1000,
    currency: "USD" as const,
    interval: "month" as const,
  };
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
      livemode: false as const,
    })),
    createCheckout: vi.fn(async (input: { customerId: string }) => {
      const id = identifier("cs_test");
      return {
        id,
        livemode: false as const,
        mode: "subscription" as const,
        customer: input.customerId,
        status: "open" as const,
        url: `https://checkout.stripe.com/c/pay/${id}`,
      };
    }),
    checkout: vi.fn(async () => undefined),
    createPortal: vi.fn(async (input: { customerId: string }) => ({
      id: identifier("bps"),
      customer: input.customerId,
      livemode: false as const,
      url: "https://billing.stripe.com/p/session/synthetic",
    })),
  };
  const instance = createSyntheticConsumerWorkspace({
    origin,
    secret,
    database: db.pool,
    deliverCode: async (m) => {
      messages.push(m);
    },
    searchKey: "SYNTHETIC_ONLY",
    billing: { provider: provider as never, plans: [plan] },
  });
  const app = express();
  app.use(instance.app);
  server.on("request", app);
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
    await call("/api/auth/email-otp/send-verification-otp", {
      email,
      type: "sign-in",
    });
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
    const current = await (
      await call("/api/auth/get-session", undefined, { cookie })
    ).json();
    return {
      cookie,
      csrf: status.csrf as string,
      id: status.accountId as string,
      session: current.session.id as string,
      headers: { cookie, "x-privateai-csrf": status.csrf as string },
    };
  };
  return { db, instance, provider, plan, call, signIn };
}

describe.skipIf(!pgEnabled)("consumer workspace (PostgreSQL)", () => {
  it("refuses A's cookie and CSRF on B's approvals and billing, and returns only the caller's account ID", async () => {
    const h = await workspace();
    const a = await h.signIn("tenant-a@example.test"),
      b = await h.signIn("tenant-b@example.test");
    expect(a.id).not.toBe(b.id);
    expect(a.csrf).not.toBe(b.csrf);
    const crossHeaders = [
      { cookie: a.cookie, "x-privateai-csrf": b.csrf },
      { cookie: b.cookie, "x-privateai-csrf": a.csrf },
    ];
    const routes: [string, unknown][] = [
      ["/api/research/prepare", query],
      ["/api/billing/checkout", { planId: h.plan.id }],
      ["/api/billing/portal", {}],
    ];
    for (const [path, body] of routes)
      for (const headers of crossHeaders)
        expect((await h.call(path, body, headers)).status).toBe(403);
    expect(h.provider.price).not.toHaveBeenCalled();
    expect(h.provider.createPortal).not.toHaveBeenCalled();
    const statusA = await (
      await h.call("/api/status", undefined, a.headers)
    ).json();
    expect(statusA.accountId).toBe(a.id);
    expect(JSON.stringify(statusA)).not.toContain(b.id);
    expect(
      (await h.call("/api/billing/checkout", { planId: h.plan.id }, a.headers))
        .status,
    ).toBe(200);
    const overviewB = await h.call(
      "/api/billing/overview",
      undefined,
      b.headers,
    );
    const overviewBText = await overviewB.text();
    expect(overviewB.status).toBe(200);
    expect(JSON.parse(overviewBText)).toMatchObject({ customerBound: false });
    expect(overviewBText).not.toContain(a.id);
    expect(overviewBText).not.toMatch(/cus_/);
    // B has no customer of its own: the portal is refused and never touches A's customer.
    expect((await h.call("/api/billing/portal", {}, b.headers)).status).toBe(
      409,
    );
    expect(h.provider.createPortal).not.toHaveBeenCalled();
  });

  it("refuses an approval issued to A's session for B, and after A signs out", async () => {
    const h = await workspace();
    const a = await h.signIn("tenant-a@example.test"),
      b = await h.signIn("tenant-b@example.test");
    search.mockResolvedValue([]);
    const prepared = await (
      await h.call("/api/research/prepare", query, a.headers)
    ).json();
    expect(
      (
        await h.call(
          "/api/research/execute",
          { id: prepared.id, request: query },
          b.headers,
        )
      ).status,
    ).toBe(400);
    await expect(
      h.instance.control.approvals.consume(b.session, prepared.id, query),
    ).rejects.toThrow();
    // B's cancel cannot remove A's grant either, and answers exactly as a
    // cancel of an approval that never existed.
    const foreign = await h.call(
      "/api/research/cancel",
      { id: prepared.id },
      b.headers,
    );
    const missing = await h.call(
      "/api/research/cancel",
      { id: "0".repeat(48) },
      b.headers,
    );
    expect(foreign.status).toBe(missing.status);
    expect(await foreign.text()).toBe(await missing.text());
    expect(
      (await h.db.pool.query("SELECT count(*)::int n FROM research_consent"))
        .rows[0].n,
    ).toBe(1);
    expect((await h.call("/api/auth/sign-out", {}, a.headers)).status).toBe(
      200,
    );
    expect(
      (
        await h.call(
          "/api/research/execute",
          { id: prepared.id, request: query },
          a.headers,
        )
      ).status,
    ).toBe(401);
    await expect(
      h.instance.control.approvals.consume(a.session, prepared.id, query),
    ).rejects.toThrow();
    expect(search).not.toHaveBeenCalled();
    // B is still signed in and can run its own approval.
    const own = await (
      await h.call("/api/research/prepare", query, b.headers)
    ).json();
    expect(
      (
        await h.call(
          "/api/research/execute",
          { id: own.id, request: query },
          b.headers,
        )
      ).status,
    ).toBe(200);
  });

  it("keeps B's allowance and session intact when A signs out or closes the account, and A's metering out of B's summary", async () => {
    const h = await workspace();
    const a = await h.signIn("tenant-a@example.test"),
      b = await h.signIn("tenant-b@example.test");
    const period = (accountId: string, requestLimit: number) => ({
      accountId,
      periodId: `${accountId}-period`,
      startsAt: Date.now() - 1000,
      endsAt: Date.now() + 600000,
      requestLimit,
    });
    await h.instance.usage.createAllowance(period(a.id, 3));
    await h.instance.usage.createAllowance(period(b.id, 3));
    expect(await h.instance.usage.reserve(a.id, "a-tenant-request")).toBe(true);
    await h.instance.usage.dispatch(a.id, "a-tenant-request");
    await h.instance.usage.finish(
      a.id,
      "a-tenant-request",
      "transport_complete",
      metrics(9),
    );
    expect(await h.instance.usage.reserve(b.id, "a-tenant-request")).toBe(
      false,
    );
    const statusB = await (
      await h.call("/api/status", undefined, b.headers)
    ).json();
    expect(statusB.requestAllowance).toMatchObject({
      state: "active",
      used: 0,
      meteredRequests: 0,
    });
    expect(statusB.requestAllowance).not.toHaveProperty("costUsd");
    expect((await h.call("/api/auth/sign-out", {}, a.headers)).status).toBe(
      200,
    );
    expect((await h.call("/api/status", undefined, a.headers)).status).toBe(
      401,
    );
    // Lab closure flow for A (needs a fresh email proof, so it may ask to reauthenticate);
    // whatever it answers, B must be unaffected.
    await requestAccountClosure(h.db.pool, a.id, a.session);
    const after = await (
      await h.call("/api/status", undefined, b.headers)
    ).json();
    expect(after.accountId).toBe(b.id);
    expect(after.csrf).toBe(b.csrf);
    expect(after.requestAllowance).toMatchObject({
      state: "active",
      used: 0,
      remaining: 3,
    });
    expect(await h.instance.usage.reserve(b.id, "b-after-a-gone")).toBe(true);
  });
});
