// Deep research at the relay (docs/deep-research-20261114.md): off unless switched on; a run is a
// declared plan request, charged the whole run at its start, and a declared answer request that
// belongs to it and is never refused for allowance; a run starts while 1 unit is left (owner,
// 18 November); runs and searches are capped per account per day, a run's searches taken at its start. Upstream and search are test doubles: no key, no provider call.
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
import { takeCounts } from "../server/counters";
import { InviteRegistry } from "../server/invite-registry";
import {
  declaredResearch,
  researchAllowed,
  ResearchTickets,
  TICKET_MS,
} from "../server/research-admission";
import { SqliteUsageLedger } from "../server/usage-ledger";
import { RESEARCH_KINDS } from "../shared/deep-research";
import { fakeManifest, privatemodeReport } from "./fixtures/privatemode-report";

const RESEARCH = { cost: 15, dailyRuns: 3, dailySearches: 24 };
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
const searchDouble = () => ({
  id: "brave" as const,
  recipientLabel: "Brave Search API",
  search: vi.fn(async () => []),
});

async function signedIn(extra: Partial<Config> = {}) {
  const registry = new InviteRegistry(":memory:");
  const usage = new SqliteUsageLedger(":memory:");
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
      search: searchDouble(),
      research: RESEARCH,
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
    /** One chat request, declared as `kind` when given. Resolves once the ledger has settled. */
    const chat = async (kind?: "plan" | "answer", mode = kind === "answer" ? "thinking" : "fast") => {
      const reply = await fetch(root + "/v1/chat/completions", {
        method: "POST",
        headers: {
          Origin: root,
          Cookie: cookie,
          "X-PrivateAI-CSRF": status.csrf,
          "privatemode-target-model": mode === "fast" ? "glm-5.3-flash" : "glm-5.3",
          "Content-Type": "application/json",
          "X-PrivateAI-Mode": mode,
          ...(kind ? { "X-PrivateAI-Kind": RESEARCH_KINDS[kind] } : {}),
        },
        body: new Uint8Array(32).fill(7),
      });
      const body = await reply.text();
      await vi.waitFor(() => expect(usage.summary(invite.id)).toMatchObject({ pending: 0 }));
      return { status: reply.status, body };
    };
    const api = async (path: string, body: unknown) => {
      const reply = await fetch(root + path, {
        method: "POST",
        headers: { Origin: root, Cookie: cookie, "X-PrivateAI-CSRF": status.csrf, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return { status: reply.status, body: await reply.json() };
    };
    /** One approved search through the existing routes. */
    const search = async (value: string) => {
      const request = { kind: "search", value };
      const prepared = await api("/api/research/prepare", request);
      return api("/api/research/execute", { id: prepared.body.id, request });
    };
    return { status, chat, used, search };
  };
  return { root, signIn };
}

it("the declaration: only the two kinds, only with the switch, only for a listed account when there is a list", () => {
  const header = (kind: string) => ({ "x-privateai-kind": kind });
  expect(declaredResearch({}, RESEARCH, undefined)).toEqual({ step: undefined });
  // Another kind (the image feature's) is not research.
  expect(declaredResearch(header("image"), RESEARCH, undefined)).toEqual({ step: undefined });
  expect(declaredResearch(header("research-plan"), RESEARCH, undefined)).toEqual({ step: "plan", cost: 15, total: 15 });
  expect(declaredResearch(header("research-answer"), RESEARCH, undefined)).toEqual({ step: "answer", cost: 0, total: 15 });
  expect(declaredResearch(header("research-plan"), undefined, undefined)).toEqual({ refused: "off" });
  const listed = { ...RESEARCH, allowedEmails: ["Premium@example.test"] };
  expect(researchAllowed(listed, "premium@example.test")).toBe(true);
  expect(researchAllowed(listed, "other@example.test")).toBe(false);
  expect(researchAllowed(listed, undefined)).toBe(false);
  expect(declaredResearch(header("research-answer"), listed, "other@example.test")).toEqual({ refused: "off" });
});

it("the ticket: one answer per plan, gone after its time, one account never uses another's", () => {
  const tickets = new ResearchTickets();
  expect(tickets.claim("alice", 0)).toBe(false);
  tickets.grant("alice", 0);
  expect(tickets.claim("bob", 1)).toBe(false);
  expect(tickets.claim("alice", 1)).toEqual({ unusedSearches: 0 });
  expect(tickets.claim("alice", 2)).toBe(false);
  tickets.grant("alice", 0);
  expect(tickets.claim("alice", TICKET_MS)).toBe(false);
  // The run's searches: used one by one, a failed one returned, the rest reported at the answer.
  tickets.grant("alice", 0, 2);
  expect(tickets.useSearch("bob", 1)).toBe(false);
  expect(tickets.useSearch("alice", 1)).toBe(true);
  tickets.returnSearch("alice");
  expect(tickets.useSearch("alice", 1) && tickets.useSearch("alice", 1)).toBe(true);
  expect(tickets.useSearch("alice", 1)).toBe(false);
  tickets.grant("alice", 0, 3);
  tickets.useSearch("alice", 1);
  expect(tickets.claim("alice", 2)).toEqual({ unusedSearches: 2 });
});

it("the status shows deep research only with the switch, with search, and to an account on the list", async () => {
  expect((await (await signedIn()).signIn()).status.research).toEqual({ cost: 15, dailyRuns: 3 });
  expect((await (await signedIn({ research: undefined })).signIn()).status).not.toHaveProperty("research");
  expect((await (await signedIn({ search: undefined })).signIn()).status).not.toHaveProperty("research");
  // The invite accounts of this test server have no email, so a list leaves them out.
  const listed = await (await signedIn({ research: { ...RESEARCH, allowedEmails: ["premium@example.test"] } })).signIn();
  expect(listed.status).not.toHaveProperty("research");
  expect((await listed.chat("plan")).status).toBe(400);
  expect(upstream).not.toHaveBeenCalled();
});

it("a run costs 15, all charged at its start; its answer is a continuation that is never charged; one answer per plan", async () => {
  upstream.mockImplementation(async () => ok());
  const { chat, used } = await (await signedIn()).signIn();
  expect((await chat("plan")).status).toBe(200);
  expect(used()).toBe(15);
  expect((await chat("answer")).status).toBe(200);
  expect(used()).toBe(15);
  // The run is closed: another answer needs another plan.
  const again = await chat("answer");
  expect(again.status).toBe(400);
  expect(again.body).toContain("no longer open");
  expect(used()).toBe(15);
  expect(upstream).toHaveBeenCalledTimes(2);
  expect(takeCounts()).toMatchObject({ "research.plan.completed": 1, "research.answer.completed": 1 });
});

it("an answer is never refused for allowance: the run was counted at its start, even if the rest was spent meanwhile", async () => {
  upstream.mockImplementation(async () => ok());
  const { chat, used } = await (await signedIn({ autoAllowance: { requestLimit: 16, days: 7, dailyLimit: 16 } })).signIn();
  expect((await chat("plan")).status).toBe(200);
  // Another tab spends the last unit while the run is searching.
  expect((await chat()).status).toBe(200);
  expect(used()).toBe(16);
  expect((await chat()).status).toBe(429);
  expect((await chat("answer")).status).toBe(200);
  expect(used()).toBe(16);
});

it("an answer without a plan, a plan in Thinking and an answer in Fast are refused and nothing is forwarded", async () => {
  upstream.mockImplementation(async () => ok());
  const { chat, used } = await (await signedIn()).signIn();
  expect((await chat("answer")).status).toBe(400);
  expect((await chat("plan", "thinking")).status).toBe(400);
  expect((await chat("plan")).status).toBe(200);
  expect((await chat("answer", "fast")).status).toBe(400);
  expect(used()).toBe(15);
  expect(upstream).toHaveBeenCalledTimes(1);
});

it("with the switch off a declared research request is refused; ordinary chat is unchanged", async () => {
  upstream.mockImplementation(async () => ok());
  const { chat, used } = await (await signedIn({ research: undefined })).signIn();
  const refused = await chat("plan");
  expect(refused.status).toBe(400);
  expect(refused.body).toContain("not switched on");
  expect(upstream).not.toHaveBeenCalled();
  expect((await chat()).status).toBe(200);
  expect(used()).toBe(1);
});

it("a run starts while 1 unit is left and is charged what is left; at 0 it is refused calmly with the reset time", async () => {
  upstream.mockImplementation(async () => ok());
  const short = await (await signedIn({ autoAllowance: { requestLimit: 3, days: 7 } })).signIn();
  expect((await short.chat("plan")).status).toBe(200);
  expect(short.used()).toBe(3);
  expect((await short.chat("answer")).status).toBe(200);
  expect(short.used()).toBe(3);
  const refused = await short.chat("plan");
  expect(refused.status).toBe(429);
  expect(JSON.parse(refused.body)).toMatchObject({ code: "limit", error: expect.stringMatching(/^Limit reached\. It resets at /) });
  expect(refused.body).not.toMatch(/\d+ requests/);
  expect(upstream).toHaveBeenCalledTimes(2);
});

it("the daily request limit: a run starts while 1 unit of the day is left and takes what the day has left", async () => {
  upstream.mockImplementation(async () => ok());
  const { chat, used } = await (await signedIn({ autoAllowance: { requestLimit: 50, days: 7, dailyLimit: 16 } })).signIn();
  await chat();
  await chat();
  expect((await chat("plan")).status).toBe(200);
  expect(used()).toBe(16);
  const refused = await chat();
  expect(refused.status).toBe(429);
  expect(JSON.parse(refused.body).code).toBe("limit");
});

it("runs per day: the plan over the cap is refused before anything is forwarded or counted", async () => {
  upstream.mockImplementation(async () => ok());
  const { signIn } = await signedIn({ research: { ...RESEARCH, cost: 2, dailyRuns: 2 } });
  const alice = await signIn();
  expect((await alice.chat("plan")).status).toBe(200);
  expect((await alice.chat("plan")).status).toBe(200);
  const third = await alice.chat("plan");
  expect(third.status).toBe(429);
  expect(third.body).toContain("daily deep research limit");
  expect(alice.used()).toBe(4);
  expect(upstream).toHaveBeenCalledTimes(2);
  // Another account has its own count.
  expect((await (await signIn()).chat("plan")).status).toBe(200);
});

it("a plan the provider refused does not count as a run, and its repeat is not charged twice", async () => {
  upstream.mockImplementationOnce(async () => new Response("no", { status: 503 }));
  upstream.mockImplementation(async () => ok());
  const { chat, used } = await (await signedIn({ research: { ...RESEARCH, dailyRuns: 1 } })).signIn();
  expect((await chat("plan")).status).toBe(502);
  expect((await chat("answer")).status).toBe(400);
  expect((await chat("plan")).status).toBe(200);
  expect(used()).toBe(15);
});

it("a run's searches are counted at its start: with the day otherwise full, the run still has its 4", async () => {
  upstream.mockImplementation(async () => ok());
  const search = searchDouble();
  const { chat, search: find } = await (await signedIn({ search, research: { ...RESEARCH, dailySearches: 4 } })).signIn();
  expect((await chat("plan")).status).toBe(200);
  for (const n of [1, 2, 3, 4]) expect((await find(`synthetic ${n}`)).status).toBe(200);
  expect((await find("synthetic 5")).status).toBe(429);
  expect((await chat("answer")).status).toBe(200);
});

it("unused run searches go back at the answer, and a run cannot start with no search left in the day", async () => {
  upstream.mockImplementation(async () => ok());
  const search = searchDouble();
  const { chat, search: find, used } = await (await signedIn({ search, research: { ...RESEARCH, dailySearches: 5 } })).signIn();
  expect((await chat("plan")).status).toBe(200);
  expect((await find("synthetic 1")).status).toBe(200);
  expect((await chat("answer")).status).toBe(200);
  // 1 used; the run's 3 unused went back: 4 more fit, then the day is full.
  for (const n of [2, 3, 4, 5]) expect((await find(`synthetic ${n}`)).status).toBe(200);
  expect((await find("synthetic 6")).status).toBe(429);
  const refused = await chat("plan");
  expect(refused.status).toBe(429);
  expect(refused.body).toContain("daily search limit");
  expect(used()).toBe(15);
  expect(upstream).toHaveBeenCalledTimes(2);
});

it("searches per day: every approved search counts, the one over the cap is refused before the provider is called", async () => {
  const search = searchDouble();
  const { signIn } = await signedIn({ search, research: { ...RESEARCH, dailySearches: 2 } });
  const alice = await signIn();
  expect((await alice.search("first synthetic text")).status).toBe(200);
  expect((await alice.search("second synthetic text")).status).toBe(200);
  const third = await alice.search("third synthetic text");
  expect(third.status).toBe(429);
  expect(third.body.error).toContain("daily search limit");
  expect(search.search).toHaveBeenCalledTimes(2);
  expect(search.search.mock.calls.map((call) => (call as unknown[])[0])).toEqual(["first synthetic text", "second synthetic text"]);
  // Another account has its own count; a search the provider failed does not count.
  const bob = await signIn();
  search.search.mockRejectedValueOnce(new Error("synthetic outage"));
  expect((await bob.search("fourth synthetic text")).status).toBe(400);
  expect((await bob.search("fifth synthetic text")).status).toBe(200);
  expect((await bob.search("sixth synthetic text")).status).toBe(200);
  expect((await bob.search("seventh synthetic text")).status).toBe(429);
});

it("without the switch searches are not capped (behaviour as before)", async () => {
  const search = searchDouble();
  const { search: run } = await (await signedIn({ search, research: undefined })).signIn();
  for (const n of [1, 2, 3]) expect((await run(`synthetic text ${n}`)).status).toBe(200);
});
