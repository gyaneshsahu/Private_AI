// Code execution, server side (docs/code-execution-20261114.md): a paid chat request lets the
// same account make up to two follow-up requests in the same mode without more allowance.
// Off unless switched on. Upstream is a test double: no key and no provider call. Synthetic only.
import { afterEach, expect, it, vi } from "vitest";
import { createServer, type Server } from "node:http";
import { asUndiciRequestResult } from "./fixtures/undici-request";
const upstream = vi.hoisted(() => vi.fn());
vi.mock("undici", async (importOriginal) => ({
  ...(await importOriginal<typeof import("undici")>()),
  request: (url: unknown, options: unknown) =>
    Promise.resolve(upstream(url, options)).then(asUndiciRequestResult),
}));
import { createApp, type Config } from "../server/app";
import { CONTINUATIONS, CREDIT_MS, ContinuationCredits } from "../server/continuation-credit";
import { takeCounts } from "../server/counters";
import { InviteRegistry } from "../server/invite-registry";
import { SqliteUsageLedger } from "../server/usage-ledger";
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
const ok = () =>
  new Response("ciphertext-reply", {
    headers: { "content-type": "text/event-stream", "privatemode-oae-response-header": "nonce" },
  });

async function signedIn(extra: Partial<Config> = {}) {
  const registry = new InviteRegistry(":memory:");
  const usage = (extra.usage as SqliteUsageLedger | undefined) ?? new SqliteUsageLedger(":memory:");
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
      autoAllowance: { requestLimit: 50, days: 7 },
      code: true,
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
    const used = () => (usage.summary(invite.id) as { used: number }).used;
    /** One chat request; `tool` declares it a follow-up. Resolves once the ledger has settled. */
    const chat = async (tool = false, mode = "fast") => {
      const reply = await fetch(root + "/v1/chat/completions", {
        method: "POST",
        headers: {
          Origin: root,
          Cookie: cookie,
          "X-PrivateAI-CSRF": status.csrf,
          authorization: "Bearer relay-injects-the-key",
          "privatemode-target-model": mode === "fast" ? "glm-5.3-flash" : "glm-5.3",
          "Content-Type": "application/json",
          "X-PrivateAI-Mode": mode,
          ...(tool ? { "X-PrivateAI-Continuation": "tool" } : {}),
        },
        body: new Uint8Array(32).fill(7),
      });
      await reply.text();
      await vi.waitFor(() => expect(usage.summary(invite.id)).toMatchObject({ pending: 0 }));
      return reply.status;
    };
    return { status, chat, used };
  };
  return { root, signIn };
}

it("the credit itself: two follow-ups per grant, same mode only, gone after 90 seconds, one account never uses another's", () => {
  expect([CONTINUATIONS, CREDIT_MS]).toEqual([2, 90_000]);
  const credits = new ContinuationCredits();
  expect(credits.claim("alice", "fast", 0)).toBe(false);
  credits.grant("alice", "fast", 0);
  expect(credits.claim("bob", "fast", 1)).toBe(false);
  expect(credits.claim("alice", "thinking", 1)).toBe(false);
  expect(credits.claim("alice", "fast", 1)).toBe(true);
  expect(credits.claim("alice", "fast", 2)).toBe(true);
  expect(credits.claim("alice", "fast", 3)).toBe(false);
  credits.grant("alice", "fast", 10);
  expect(credits.claim("alice", "fast", 10 + CREDIT_MS)).toBe(false);
  // A new paid request replaces what was left: credits never add up.
  credits.grant("alice", "fast", 0);
  credits.grant("alice", "fast", 1);
  expect([1, 2, 3].map((now) => credits.claim("alice", "fast", now))).toEqual([true, true, false]);
});

it("the status says code execution is on only with the switch", async () => {
  const on = await (await signedIn()).signIn();
  expect(on.status.code).toBe(true);
  const off = await (await signedIn({ code: undefined })).signIn();
  expect(off.status).not.toHaveProperty("code");
});

it("a paid message carries two follow-ups free; the third is charged like a new message, and its own follow-ups are free again", async () => {
  upstream.mockImplementation(async () => ok());
  const { chat, used } = await (await signedIn()).signIn();
  expect(await chat()).toBe(200);
  expect(used()).toBe(1);
  expect(await chat(true)).toBe(200);
  expect(await chat(true)).toBe(200);
  expect(used()).toBe(1);
  // No credit left: charged normally. Being paid, it grants two again.
  expect(await chat(true)).toBe(200);
  expect(used()).toBe(2);
  expect(await chat(true)).toBe(200);
  expect(used()).toBe(2);
  expect(upstream).toHaveBeenCalledTimes(5);
  // Content-free counts: three follow-ups on credit, by mode.
  expect(takeCounts()).toMatchObject({ "chat.fast.tool_continuation": 3, "chat.fast.completed": 5 });
});

it("a follow-up with no paid message before it, in another mode, or from another account is charged", async () => {
  upstream.mockImplementation(async () => ok());
  const { signIn } = await signedIn();
  const alice = await signIn();
  const bob = await signIn();
  expect(await alice.chat(true)).toBe(200);
  expect(alice.used()).toBe(1);
  // Alice's credit (fast) does not cover a Thinking follow-up, which costs its 3 units.
  expect(await alice.chat(true, "thinking")).toBe(200);
  expect(alice.used()).toBe(4);
  expect(await bob.chat(true)).toBe(200);
  expect(bob.used()).toBe(1);
  expect(takeCounts()).not.toHaveProperty("chat.fast.tool_continuation");
});

it("without the switch the header means nothing: every request is charged", async () => {
  upstream.mockImplementation(async () => ok());
  const { chat, used } = await (await signedIn({ code: undefined })).signIn();
  await chat();
  await chat(true);
  await chat(true);
  expect(used()).toBe(3);
  expect(takeCounts()).not.toHaveProperty("chat.fast.tool_continuation");
});

it("the credit expires: a follow-up after 90 seconds is charged", async () => {
  upstream.mockImplementation(async () => ok());
  const { chat, used } = await (await signedIn()).signIn();
  const now = vi.spyOn(Date, "now");
  try {
    const start = Date.now();
    await chat();
    now.mockImplementation(() => start + CREDIT_MS + 5000);
    expect(await chat(true)).toBe(200);
    expect(used()).toBe(2);
  } finally {
    now.mockRestore();
  }
});

it("the daily cap, the stop switch and the spending limit still apply to follow-ups", async () => {
  upstream.mockImplementation(async () => ok());
  // Daily cap of 1 unit: the paid message uses it. Its two follow-ups cost nothing and pass;
  // the third would be charged and is refused.
  const capped = await (await signedIn({ autoAllowance: { requestLimit: 50, days: 7, dailyLimit: 1 } })).signIn();
  expect([await capped.chat(), await capped.chat(true), await capped.chat(true), await capped.chat(true)]).toEqual([200, 200, 200, 429]);
  expect(capped.used()).toBe(1);
  expect(takeCounts()).toMatchObject({ "chat.fast.refused_daily": 1 });

  let stopped = false;
  const paused = await (await signedIn({ inferenceStopped: () => stopped })).signIn();
  expect(await paused.chat()).toBe(200);
  stopped = true;
  expect(await paused.chat(true)).toBe(503);

  // Approved spend of 1 USD (the fixture): once the ledger shows more, a follow-up on credit is refused too.
  let spent = "0";
  const usage = new SqliteUsageLedger(":memory:");
  const spend = usage.spend.bind(usage);
  usage.spend = (since, until) => ({ ...spend(since, until), meteredUSD: spent });
  const limited = await (await signedIn({ usage })).signIn();
  expect(await limited.chat()).toBe(200);
  spent = "5";
  expect(await limited.chat(true)).toBe(429);
  expect(takeCounts()).toMatchObject({ "chat.fast.refused_spend": 1 });
  expect(upstream).toHaveBeenCalledTimes(5);
});

it("one request at a time holds for follow-ups", async () => {
  let finish!: (reply: Response) => void;
  upstream.mockImplementationOnce(async () => ok());
  upstream.mockImplementationOnce(() => new Promise<Response>((resolve) => (finish = resolve)));
  upstream.mockImplementation(async () => ok());
  const { chat } = await (await signedIn()).signIn();
  await chat();
  const running = chat(true);
  await vi.waitFor(() => expect(upstream).toHaveBeenCalledTimes(2));
  expect(await chat(true)).toBe(429);
  finish(ok());
  expect(await running).toBe(200);
  expect(takeCounts()).toMatchObject({ "chat.fast.refused_account_busy": 1 });
});
