// Answer modes at the relay: admits exactly the tier's qualified models, sizes the spend check
// with the tier's output limit, and reserves the tier's allowance cost. Synthetic only.
import { afterEach, expect, it, vi } from "vitest";
import { createServer, type Server } from "node:http";
import { checks } from "../shared/contracts";
import { InviteRegistry } from "../server/invite-registry";
import { SqliteUsageLedger } from "../server/usage-ledger";
import { asUndiciRequestResult } from "./fixtures/undici-request";
const upstream = vi.hoisted(() => vi.fn());
vi.mock("undici", async (importOriginal) => ({
  ...(await importOriginal<typeof import("undici")>()),
  request: (url: unknown, options: unknown) =>
    Promise.resolve(upstream(url, options)).then(asUndiciRequestResult),
}));
import { createApp, type Config } from "../server/app";

const servers: Server[] = [];
afterEach(async () => {
  upstream.mockReset();
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
const ORIGIN = "https://test.tinfoil.sh";
const report = (withModes = true) => ({
  provider: "tinfoil",
  model: "TEST_A",
  origin: ORIGIN,
  repository: "tinfoilsh/test-only",
  releaseDigests: ["a".repeat(64)],
  reviewedAt: new Date(Date.now() - 1000).toISOString(),
  validUntil: new Date(Date.now() + 60000).toISOString(),
  review: Object.fromEntries(
    checks.map((key) => [key, { status: "pass", evidence: ["TEST ONLY not provider evidence"] }]),
  ),
  maxInputCharacters: 5000,
  maxOutputTokens: 500,
  pricing: { inputPerMillion: 1, outputPerMillion: 1, currency: "USD" },
  approvedSpendUSD: 1,
  ...(withModes
    ? {
        modes: {
          fast: { model: "TEST_A", backupModel: "TEST_B", maxOutputTokens: 1024, allowanceCost: 1 },
          thinking: { model: "TEST_A", backupModel: "TEST_C", maxOutputTokens: 4096, allowanceCost: 3 },
        },
      }
    : {}),
});
const ok = () =>
  new Response(new Uint8Array(8), { headers: { "Ehbp-Response-Nonce": "b".repeat(64) } });

async function listen(config: Config) {
  const app = createApp(config);
  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  servers.push(server);
  const root = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  config.origin = root;
  return root;
}
async function start(extra: Partial<Config> = {}) {
  const root = await listen({
    origin: "http://127.0.0.1",
    qualification: report(),
    apiKey: "TEST_KEY_NOT_REAL",
    ...extra,
  });
  const response = await fetch(root + "/api/status");
  const status = await response.json();
  return (model?: string, mode?: string) =>
    fetch(root + "/api/inference/v1/chat/completions", {
      method: "POST",
      headers: {
        Cookie: response.headers.get("set-cookie")!.split(";")[0],
        "X-PrivateAI-CSRF": status.csrf,
        "X-Tinfoil-Enclave-Url": ORIGIN,
        "Ehbp-Encapsulated-Key": "a".repeat(64),
        "Content-Type": "application/octet-stream",
        ...(model ? { "X-Tinfoil-Model": model } : {}),
        ...(mode ? { "X-PrivateAI-Mode": mode } : {}),
      },
      body: new Uint8Array(32).fill(9),
    });
}

it("admits exactly each mode's model and backup, always at the report's one provider", async () => {
  upstream.mockImplementation(async () => ok());
  const send = await start();
  expect((await send("TEST_A", "fast")).status).toBe(200);
  expect((await send("TEST_B", "fast")).status).toBe(200);
  expect((await send("TEST_C", "thinking")).status).toBe(200);
  expect((await send("TEST_A")).status).toBe(200); // no mode: the report's own model, as before
  expect(upstream.mock.calls.map((call) => call[1].headers["X-Tinfoil-Model"])).toEqual([
    "TEST_A",
    "TEST_B",
    "TEST_C",
    "TEST_A",
  ]);
  // Never cross-provider: every forwarded request goes to the report's one origin.
  for (const call of upstream.mock.calls) expect(new URL(call[0]).origin).toBe(ORIGIN);
  upstream.mockClear();
  for (const [model, mode] of [
    ["TEST_C", "fast"], // another tier's backup
    ["TEST_B", "thinking"],
    ["TEST_B", undefined], // a tier model without its mode
    ["TEST_D", "fast"], // not qualified at all
    ["TEST_A", "turbo"],
    ["TEST_A", "auto"], // Auto is decided on the device, never sent
  ] as const)
    expect((await send(model, mode)).status, `${model} ${mode}`).toBe(400);
  expect(upstream).not.toHaveBeenCalled();
});

it("refuses a mode the report does not have", async () => {
  upstream.mockImplementation(async () => ok());
  const send = await start({ qualification: report(false) });
  expect((await send("TEST_A", "fast")).status).toBe(400);
  expect((await send("TEST_A")).status).toBe(200);
});

it("sizes the spend check with the mode's own output limit", async () => {
  // Worst case: fast (5000 + 1024) / 1e6 = 0.006024, thinking (5000 + 4096) / 1e6 = 0.009096.
  const usage = {
    spend: vi.fn(async () => ({ meteredUSD: "0.992", unmetered: 0 })),
    summary: vi.fn(),
    reserve: vi.fn(async () => false),
    dispatch: vi.fn(),
    metrics: vi.fn(),
    finish: vi.fn(),
  };
  const send = await start({ usage });
  const thinking = await send("TEST_A", "thinking");
  expect(thinking.status).toBe(429);
  expect((await thinking.json()).error).toContain("approved spending limit");
  const fast = await send("TEST_A", "fast");
  // Spend allowed it; this plain setup has no signed-in account, so the allowance refuses.
  expect((await fast.json()).error).toContain("No request allowance");
  expect(upstream).not.toHaveBeenCalled();
});

it("a Thinking request uses its allowance cost; spend counts it once", async () => {
  upstream.mockImplementation(async () => ok());
  const registry = new InviteRegistry(":memory:");
  const usage = new SqliteUsageLedger(":memory:");
  // The invite gate reads the origin when the app is built, so the port comes first.
  const server = createServer();
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const root = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  server.on(
    "request",
    createApp({ origin: root, invites: registry, usage, qualification: report(), apiKey: "TEST_KEY_NOT_REAL" }),
  );
  const invite = registry.issue(Date.now() + 60000);
  const registration = await fetch(root + "/auth/register", {
    method: "POST",
    redirect: "manual",
    headers: { Origin: root, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id: invite.id, token: invite.token, password: "SYNTHETIC account password" }),
  });
  const cookie = registration.headers.get("set-cookie")!.split(";")[0];
  const statusResponse = await fetch(root + "/api/status", { headers: { Cookie: cookie } });
  const status = await statusResponse.json();
  usage.createAllowance({
    accountId: invite.id,
    periodId: "synthetic-period",
    startsAt: Date.now() - 1000,
    endsAt: Date.now() + 60000,
    requestLimit: 4,
  });
  const send = (mode: string) =>
    fetch(root + "/api/inference/v1/chat/completions", {
      method: "POST",
      headers: {
        Origin: root,
        Cookie: cookie + "; " + statusResponse.headers.get("set-cookie")!.split(";")[0],
        "X-PrivateAI-CSRF": status.csrf,
        "X-Tinfoil-Enclave-Url": ORIGIN,
        "Ehbp-Encapsulated-Key": "a".repeat(64),
        "Content-Type": "application/octet-stream",
        "X-Tinfoil-Model": "TEST_A",
        "X-PrivateAI-Mode": mode,
      },
      body: new Uint8Array(32).fill(9),
    });
  const thinking = await send("thinking");
  expect(thinking.status).toBe(200);
  await thinking.arrayBuffer();
  await vi.waitFor(() => expect(usage.summary(invite.id)).toMatchObject({ used: 3, pending: 0 }));
  // 3 used of 4: a second Thinking request (3 more) is refused, a Fast one (1) fits.
  const refused = await send("thinking");
  expect(refused.status).toBe(429);
  expect((await refused.json()).error).toContain("this mode counts as 3 requests");
  const fast = await send("fast");
  expect(fast.status).toBe(200);
  await fast.arrayBuffer();
  await vi.waitFor(() =>
    expect(usage.summary(invite.id)).toMatchObject({
      state: "exhausted",
      used: 4,
      remaining: 0,
      unmeteredRequests: 2,
    }),
  );
  expect(upstream).toHaveBeenCalledTimes(2);
  // Two forwarded requests without metering: spend counts two worst cases, not four.
  expect(usage.spend(0, Date.now() + 60000)).toEqual({ meteredUSD: "0", unmetered: 2 });
  usage.close();
});
