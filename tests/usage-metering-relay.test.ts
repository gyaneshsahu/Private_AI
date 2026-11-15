// Usage metering through the relay (docs/usage-metering-20261115.md): with the switch on, the
// weights file sets the charge, every forwarded request gets a record with what the relay measured,
// the browser reports its decrypted token counts under the id the relay gave it, and the account
// sees its own meter. Off: nothing of this exists. Upstream is a test double: no key, no provider.
import { afterEach, expect, it, vi } from "vitest";
import { createServer, type Server } from "node:http";
import { asUndiciRequestResult } from "./fixtures/undici-request";
const upstream = vi.hoisted(() => vi.fn());
vi.mock("undici", async (importOriginal) => ({
  ...(await importOriginal<typeof import("undici")>()),
  request: (url: unknown, options: unknown) => Promise.resolve(upstream(url, options)).then(asUndiciRequestResult),
}));
import { createApp, type Config } from "../server/app";
import { takeCounts } from "../server/counters";
import { InviteRegistry } from "../server/invite-registry";
import { SqliteUsageLedger } from "../server/usage-ledger";
import { SqliteUsageRecords } from "../server/usage-records";
import { fakeManifest, privatemodeReport } from "./fixtures/privatemode-report";

const servers: Server[] = [];
afterEach(async () => {
  upstream.mockReset();
  takeCounts();
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
const REPLY = "x".repeat(5000);
const ok = () => new Response(REPLY, { headers: { "content-type": "text/event-stream", "privatemode-oae-response-header": "nonce" } });

async function relay(extra: Partial<Config> = {}, metered = true) {
  const registry = new InviteRegistry(":memory:");
  const usage = new SqliteUsageLedger(":memory:");
  const records = new SqliteUsageRecords(":memory:");
  const server = createServer();
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const root = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  server.on(
    "request",
    createApp({
      origin: root,
      qualification: privatemodeReport(),
      apiKey: "TEST_KEY_NOT_REAL",
      providerManifest: fakeManifest,
      invites: registry,
      usage,
      autoAllowance: { requestLimit: 50, days: 7, dailyLimit: 40 },
      code: true,
      ...(metered ? { metering: { plan: "alpha", records } } : {}),
      ...extra,
    }),
  );
  const signIn = async () => {
    const invite = registry.issue(Date.now() + 60000);
    const registration = await fetch(root + "/auth/register", {
      method: "POST",
      redirect: "manual",
      headers: { Origin: root, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ id: invite.id, token: invite.token, password: "SYNTHETIC account password" }),
    });
    const first = registration.headers.get("set-cookie")!.split(";")[0];
    const response = await fetch(root + "/api/status", { headers: { Cookie: first } });
    const status = await response.json();
    const cookie = `${first}; ${response.headers.get("set-cookie")!.split(";")[0]}`;
    const headers = { Origin: root, Cookie: cookie, "X-PrivateAI-CSRF": status.csrf };
    const used = () => (usage.summary(invite.id) as { used: number }).used;
    const chat = async (mode = "fast", tool = false, bytes = 3000) => {
      const reply = await fetch(root + "/v1/chat/completions", {
        method: "POST",
        headers: {
          ...headers,
          "privatemode-target-model": mode === "fast" ? "glm-5.3-flash" : "glm-5.3",
          "Content-Type": "application/json",
          "X-PrivateAI-Mode": mode,
          ...(tool ? { "X-PrivateAI-Continuation": "tool" } : {}),
        },
        body: new Uint8Array(bytes).fill(7),
      });
      await reply.text();
      await vi.waitFor(() => expect(usage.summary(invite.id)).toMatchObject({ pending: 0 }));
      return reply;
    };
    const report = (body: unknown) =>
      fetch(root + "/api/usage/report", { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const meter = async () => (await fetch(root + "/api/usage/meter", { headers })).json();
    return { id: invite.id, status, chat, used, report, meter };
  };
  return { signIn, records };
}

it("off: no record id, no report or meter routes, the report's own costs", async () => {
  upstream.mockImplementation(async () => ok());
  const { signIn } = await relay({}, false);
  const alice = await signIn();
  expect(alice.status).not.toHaveProperty("metering");
  const reply = await alice.chat("thinking");
  expect(reply.headers.get("x-privateai-request")).toBeNull();
  // The test report's Thinking costs 3.
  expect(alice.used()).toBe(3);
  expect((await alice.report({ requestId: "x", promptTokens: 1, completionTokens: 1 })).status).toBe(404);
});

it("on: the weights charge (Thinking 5), each forwarded request is recorded with its sizes, and the status says so", async () => {
  upstream.mockImplementation(async () => ok());
  const { signIn, records } = await relay();
  const alice = await signIn();
  expect(alice.status.metering).toEqual({ plan: "alpha", weightsVersion: 1 });
  expect(alice.status.inference.qualification.modes.thinking.allowanceCost).toBe(5);
  const reply = await alice.chat("thinking", false, 4000);
  expect(alice.used()).toBe(5);
  const id = reply.headers.get("x-privateai-request")!;
  expect(id).toMatch(/^[0-9a-f-]{36}$/);
  await vi.waitFor(() => expect(records.get(alice.id, id)).toBeDefined());
  expect(records.get(alice.id, id)).toMatchObject({
    feature: "chat-thinking",
    units: 5,
    weightVersion: 1,
    outcome: "complete",
    model: "glm-5.3",
    requestBytes: 4000,
    responseBytes: REPLY.length,
    report: "none",
  });
});

it("a calculation's free follow-ups are recorded at 0 units and folded into one line on the meter", async () => {
  upstream.mockImplementation(async () => ok());
  const { signIn, records } = await relay();
  const alice = await signIn();
  const ids = [];
  for (const tool of [false, true, true]) ids.push((await alice.chat("fast", tool)).headers.get("x-privateai-request")!);
  expect(alice.used()).toBe(1);
  await vi.waitFor(() => expect(records.since(alice.id, 0)).toHaveLength(3));
  expect(records.since(alice.id, 0).map((r) => [r.feature, r.units])).toEqual([
    ["chat-fast", 1],
    ["code-followup", 0],
    ["code-followup", 0],
  ]);
  for (const requestId of ids) expect((await alice.report({ requestId, promptTokens: 1000, completionTokens: 200 })).status).toBe(204);
  const view = await alice.meter();
  expect(view.week).toMatchObject({ used: 1, limit: 50, remaining: 49 });
  expect(view.today).toEqual({ used: 1, limit: 40 });
  expect(view.recent[0]).toMatchObject({ feature: "chat-fast", units: 1, followUps: 2, tokens: 3600 });
});

it("reports: accepted once, flagged when implausible, refused for another account, unknown ids and bad bodies", async () => {
  upstream.mockImplementation(async () => ok());
  const { signIn, records } = await relay();
  const alice = await signIn();
  const bob = await signIn();
  const first = (await alice.chat("fast", false, 3000)).headers.get("x-privateai-request")!;
  const second = (await alice.chat("fast", false, 3000)).headers.get("x-privateai-request")!;
  await vi.waitFor(() => expect(records.since(alice.id, 0)).toHaveLength(2));
  expect((await bob.report({ requestId: first, promptTokens: 700, completionTokens: 50 })).status).toBe(404);
  expect((await alice.report({ requestId: first, promptTokens: 700, completionTokens: 50, cachedTokens: 0 })).status).toBe(204);
  expect((await alice.report({ requestId: first, promptTokens: 1, completionTokens: 1 })).status).toBe(409);
  // More prompt tokens than the 3,000 encrypted bytes the relay forwarded: kept, but flagged.
  expect((await alice.report({ requestId: second, promptTokens: 5000, completionTokens: 50 })).status).toBe(204);
  expect(records.get(alice.id, first)).toMatchObject({ report: "accepted", promptTokens: 700 });
  expect(records.get(alice.id, second)).toMatchObject({ report: "flagged", reportNote: "prompt_above_bytes" });
  for (const bad of [{ requestId: first }, { requestId: first, promptTokens: -1, completionTokens: 1 }, { requestId: first, promptTokens: 1, completionTokens: 1, text: "hello" }])
    expect((await alice.report(bad)).status).toBe(400);
  // The charge never moved: two Fast messages.
  expect(alice.used()).toBe(2);
  expect(takeCounts()).toMatchObject({ "metering.report_accepted": 1, "metering.report_flagged_prompt_above_bytes": 1 });
});

it("an upstream refusal is recorded as refused, and the retry on its reservation as a free retry", async () => {
  upstream.mockImplementationOnce(async () => new Response("no", { status: 503 }));
  upstream.mockImplementation(async () => ok());
  const { signIn, records } = await relay();
  const alice = await signIn();
  expect((await alice.chat()).status).toBe(502);
  expect((await alice.chat()).status).toBe(200);
  expect(alice.used()).toBe(1);
  await vi.waitFor(() => expect(records.since(alice.id, 0)).toHaveLength(2));
  expect(records.since(alice.id, 0).map((r) => [r.feature, r.units, r.outcome])).toEqual([
    ["chat-fast", 1, "refused"],
    ["retry", 0, "complete"],
  ]);
});
