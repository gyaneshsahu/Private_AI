import { expect, it, vi } from "vitest";
import { createServer } from "node:http";
import { InviteRegistry } from "../server/invite-registry";
import { SqliteUsageLedger } from "../server/usage-ledger";
import { PostgresUsageLedger } from "../server/usage-postgres";
import { usageDatabase } from "./fixtures/usage-postgres";
import { checks } from "../shared/contracts";
const upstream = vi.hoisted(() => vi.fn());
vi.mock("undici", async (importOriginal) => ({
  ...(await importOriginal<typeof import("undici")>()),
  fetch: upstream,
}));
import { createApp } from "../server/app";

for (const backend of ["sqlite", "postgres"] as const)
  it.skipIf(backend === "postgres" && !process.env.PRIVATEAI_SYNTHETIC_PG)(
    `${backend}: binds durable allowance to authenticated accounts, counts failures and blocks forwarding when exhausted`,
    async () => {
      const registry = new InviteRegistry(":memory:");
      const database =
        backend === "postgres" ? await usageDatabase() : undefined;
      const usage = database
        ? new PostgresUsageLedger(database.pool)
        : new SqliteUsageLedger(":memory:");
      let admissionBarrier: Promise<void> | undefined;
      let releaseAdmission: (() => void) | undefined;
      let waiting = 0;
      let unavailable = false;
      const server = createServer();
      await new Promise<void>((resolve) =>
        server.listen(0, "127.0.0.1", resolve),
      );
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
            {
              status: "pass",
              evidence: ["Synthetic fixture; not provider qualification"],
            },
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
            summary: async (accountId) => {
              if (unavailable) throw Error("synthetic ledger outage");
              return usage.summary(accountId);
            },
            reserve: async (accountId, requestId) => {
              if (admissionBarrier) {
                waiting++;
                await admissionBarrier;
              }
              if (unavailable) throw Error("synthetic ledger outage");
              return usage.reserve(accountId, requestId);
            },
            dispatch: (accountId, requestId) =>
              usage.dispatch(accountId, requestId),
            finish: (accountId, requestId, outcome) =>
              usage.finish(accountId, requestId, outcome),
          },
          qualification,
          apiKey: "SYNTHETIC_NOT_REAL",
        }),
      );
      try {
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
          return {
            id: invite.id,
            headers: {
              Origin: origin,
              Cookie:
                cookie +
                "; " +
                response.headers.get("set-cookie")!.split(";")[0],
              "X-PrivateAI-CSRF": status.csrf,
              "X-Tinfoil-Enclave-Url": qualification.origin,
              "Ehbp-Encapsulated-Key": "a".repeat(64),
              "Content-Type": "application/octet-stream",
            },
          };
        };
        const alice = await account(),
          bob = await account();
        await usage.createAllowance({
          accountId: alice.id,
          periodId: "alice-period",
          startsAt: Date.now() - 1000,
          endsAt: Date.now() + 60000,
          requestLimit: 2,
        });
        const send = (a: typeof alice) =>
          fetch(origin + "/api/inference/v1/chat/completions", {
            method: "POST",
            headers: { ...a.headers, "X-Account-ID": alice.id },
            body: new Uint8Array(32).fill(9),
          });
        expect((await send(bob)).status).toBe(429);
        expect(upstream).not.toHaveBeenCalled();
        upstream.mockResolvedValueOnce(
          new Response(new Uint8Array(64), {
            headers: { "Ehbp-Response-Nonce": "b".repeat(64) },
          }),
        );
        expect((await send(alice)).status).toBe(200);
        upstream.mockRejectedValueOnce(
          new Error("SYNTHETIC_SECRET_DIAGNOSTIC"),
        );
        const failed = await send(alice);
        expect(failed.status).toBe(502);
        expect(await failed.text()).not.toContain(
          "SYNTHETIC_SECRET_DIAGNOSTIC",
        );
        expect((await send(alice)).status).toBe(429);
        expect(upstream).toHaveBeenCalledTimes(2);
        await expect
          .poll(async () => {
            const summary = await usage.summary(alice.id);
            return summary.state === "unavailable" ? -1 : summary.pending;
          })
          .toBe(0);
        const status = await (
          await fetch(origin + "/api/status?accountId=" + bob.id, {
            headers: alice.headers,
          })
        ).json();
        expect(status.requestAllowance).toMatchObject({
          state: "exhausted",
          used: 2,
          remaining: 0,
          uncertain: 1,
          pending: 0,
        });
        expect(
          (
            await (
              await fetch(origin + "/api/status", { headers: bob.headers })
            ).json()
          ).requestAllowance,
        ).toEqual({ state: "unavailable" });
        registry.revoke(alice.id);
        expect((await send(alice)).status).toBe(401);
        expect(upstream).toHaveBeenCalledTimes(2);
        await usage.createAllowance({
          accountId: bob.id,
          periodId: "bob-period",
          startsAt: Date.now() - 1000,
          endsAt: Date.now() + 60000,
          requestLimit: 6,
        });
        admissionBarrier = new Promise<void>((resolve) => {
          releaseAdmission = resolve;
        });
        upstream.mockImplementation(
          async () =>
            new Response(new Uint8Array(64), {
              headers: { "Ehbp-Response-Nonce": "b".repeat(64) },
            }),
        );
        const concurrent = Array.from({ length: 3 }, () => send(bob));
        await expect.poll(() => waiting).toBe(3);
        expect((await send(bob)).status).toBe(429);
        expect(upstream).toHaveBeenCalledTimes(2);
        releaseAdmission!();
        admissionBarrier = undefined;
        expect(
          (await Promise.all(concurrent)).map((response) => response.status),
        ).toEqual([200, 200, 200]);
        await expect
          .poll(async () => {
            const summary = await usage.summary(bob.id);
            return summary.state === "unavailable" ? -1 : summary.pending;
          })
          .toBe(0);
        expect(upstream).toHaveBeenCalledTimes(5);
        unavailable = true;
        expect((await send(bob)).status).toBe(503);
        expect(
          (
            await (
              await fetch(origin + "/api/status", { headers: bob.headers })
            ).json()
          ).requestAllowance,
        ).toEqual({ state: "unavailable" });
        expect(upstream).toHaveBeenCalledTimes(5);
        unavailable = false;
        expect((await send(bob)).status).toBe(200);
        await expect
          .poll(async () => {
            const summary = await usage.summary(bob.id);
            return summary.state === "unavailable" ? -1 : summary.pending;
          })
          .toBe(0);
      } finally {
        releaseAdmission?.();
        server.closeAllConnections();
        await new Promise<void>((resolve) => server.close(() => resolve()));
        registry.close();
        if (usage instanceof SqliteUsageLedger) usage.close();
        if (database) await database.dispose();
        upstream.mockReset();
      }
    },
  );
