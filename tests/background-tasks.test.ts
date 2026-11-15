// Background tasks (docs/background-tasks-20261115.md), offline: a fake Privatemode client, a fake
// search, the SQLite usage ledger and the memory store. Synthetic data only: the "CV" is made up.
import { describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { validateQualification, type Source } from "../shared/contracts";
import { nextDue, type ScheduledTask } from "../shared/scheduled-tasks";
import { ephemeralKeyRing, open, parseKeyRing, seal } from "../server/background-crypto";
import { BackgroundModelError, createPrivatemodeBackgroundClient, type BackgroundFailure, type BackgroundModelClient, type BackgroundModelRequest } from "../server/background-privatemode";
import { MemoryBackgroundStore, type TaskRow } from "../server/background-store";
import {
  BACKGROUND_CONSENT_VERSION,
  BACKGROUND_LIMITS,
  createBackgroundTasks,
  followingDue,
  spreadOf,
  type BackgroundDeps,
} from "../server/background-tasks";
import { takeCounts } from "../server/counters";
import { createAttestQueue } from "../server/providers/privatemode-attest-queue";
import { SqliteUsageLedger } from "../server/usage-ledger";
import { createApp } from "../server/app";
import { serverMessage } from "../src/server-messages";
import { fakeManifest, privatemodeReport } from "./fixtures/privatemode-report";

const DAY = 86_400_000;
const ACCOUNT = "acct-synthetic-1";
const CV = "SYNTHETIC CV ONLY: Alex Example, data analyst, five years of SQL and Python, Berlin. Phone {{PHONE-1}}.";
const qualification = () => validateQualification(privatemodeReport());

function taskBody(over: Partial<ScheduledTask> = {}, extra: Record<string, unknown> = {}) {
  const task: ScheduledTask = {
    id: randomUUID(),
    name: "Job search",
    instruction: "Every day, find new job offers that match my CV and list them with one line each.",
    trigger: { every: 1, unit: "day", time: "08:00", timeZone: "Europe/Berlin" },
    mode: "auto",
    notify: { inApp: true, calendar: false },
    answerMode: "fast",
    useSearch: false,
    createdAt: "2026-11-15T10:00:00.000Z",
    nextDueAt: "2000-01-01T00:00:00.000Z",
    ...over,
  };
  return { task, consent: { version: BACKGROUND_CONSENT_VERSION, acceptedAt: "2026-11-15T10:00:00.000Z", sensitive: false }, ...extra };
}

function fakeModel() {
  const script: (BackgroundFailure | "ok")[] = [];
  const calls: BackgroundModelRequest[] = [];
  let readyFailure: BackgroundFailure | undefined;
  const model: BackgroundModelClient = {
    async ready() {
      if (readyFailure) throw new BackgroundModelError(readyFailure);
    },
    async complete(request) {
      calls.push(request);
      const next = script.shift() ?? "ok";
      if (next !== "ok") throw new BackgroundModelError(next);
      return { text: "SYNTHETIC ANSWER: two matching offers.", usage: { promptTokens: 1200, completionTokens: 300 } };
    },
    close() {},
  };
  return { model, script, calls, failReady: (kind?: BackgroundFailure) => void (readyFailure = kind) };
}

function setup(over: Partial<BackgroundDeps> & { limit?: number } = {}) {
  let clock = Date.parse("2026-11-15T10:00:00Z");
  const usage = new SqliteUsageLedger(":memory:", () => clock);
  usage.createAllowance({ accountId: ACCOUNT, periodId: "synthetic", startsAt: clock - 1000, endsAt: clock + 60 * DAY, requestLimit: over.limit ?? 150 });
  const store = new MemoryBackgroundStore();
  const fake = fakeModel();
  let sources: Source[] = [];
  const searched: string[] = [];
  const state = { stopped: false, spend: true, slot: true };
  const logs: string[] = [];
  const deps: BackgroundDeps = {
    store,
    keys: ephemeralKeyRing(),
    settings: { maxAutoTasks: 3 },
    qualification,
    stopped: () => state.stopped,
    usage,
    ensureAllowance: async () => {},
    spendAllows: async () => state.spend,
    claimSlot: () => (state.slot ? () => {} : undefined),
    search: {
      id: "brave",
      recipientLabel: "Brave Search API",
      search: async (query) => {
        searched.push(query);
        return sources;
      },
    },
    takeSearch: () => true,
    giveBackSearch: () => {},
    model: fake.model,
    cacheSalt: () => "s".repeat(64),
    log: (line) => logs.push(line),
    now: () => clock,
    ...over,
  };
  const service = createBackgroundTasks(deps);
  const runAt = async (iso: string) => {
    clock = Date.parse(iso);
    await service.tick();
  };
  return {
    service,
    store,
    usage,
    fake,
    state,
    logs,
    deps,
    runAt,
    setSources: (next: Source[]) => void (sources = next),
    searched,
    clock: () => clock,
    setClock: (t: number) => void (clock = t),
  };
}
const used = (s: ReturnType<typeof setup>) => (s.usage.summary(ACCOUNT) as { used: number }).used;
const source = (n: number): Source => ({ id: `web-${n}`, title: `Synthetic offer ${n}`, text: `Data analyst role ${n}`, url: `https://jobs.example.test/${n}` });

describe("background task runs", () => {
  it("runs the job search from a CV: one reservation, sealed result, only new results, ack deletes", async () => {
    takeCounts();
    const s = setup();
    const body = taskBody(
      { useSearch: true, searchText: "data analyst jobs Berlin" },
      { attachment: { text: CV }, consent: { version: BACKGROUND_CONSENT_VERSION, acceptedAt: "2026-11-15T10:00:00.000Z", sensitive: true } },
    );
    const created = await s.service.create(ACCOUNT, body);
    expect(created).toMatchObject({ task: { nextDueAt: "2026-11-16T07:00:00.000Z", mode: "auto" } });
    s.setSources([source(1), source(2)]);
    await s.runAt("2026-11-16T07:11:00Z");
    // Exactly the approved search text, then one model request with the CV and both results.
    expect(s.searched).toEqual(["data analyst jobs Berlin"]);
    expect(s.fake.calls).toHaveLength(1);
    const sent = s.fake.calls[0];
    expect(sent.model).toBe("glm-5.3-flash");
    expect(sent.maxTokens).toBe(1024);
    expect(sent.options).toEqual({ reasoning_effort: "low", cache_salt: "s".repeat(64) });
    expect(sent.messages[1].content).toContain(CV);
    expect(sent.messages[1].content).toContain("https://jobs.example.test/2");
    expect(sent.messages[0].content).toContain("{{IBAN-1}}"); // the masking instruction
    // Fast 1 + search 1 + attachment 2.
    expect(used(s)).toBe(4);
    const [result] = await s.service.results(ACCOUNT);
    expect(result).toMatchObject({ status: "done", text: "SYNTHETIC ANSWER: two matching offers.", usage: { promptTokens: 1200, completionTokens: 300 } });
    // At rest: nothing readable in the stored rows.
    const raw = JSON.stringify([...s.store.taskRows.values(), ...s.store.resultRows.values()]);
    for (const plain of ["SYNTHETIC CV", "Alex Example", "job offers", "data analyst jobs", "SYNTHETIC ANSWER", "Job search"])
      expect(raw).not.toContain(plain);
    expect((await s.service.list(ACCOUNT))[0]).toMatchObject({ nextDueAt: "2026-11-17T07:00:00.000Z", lastRunAt: "2026-11-16T07:11:00.000Z" });
    // Next day, the same results: nothing new, no model request, no allowance.
    await s.runAt("2026-11-17T07:11:00Z");
    expect(s.fake.calls).toHaveLength(1);
    expect(used(s)).toBe(4);
    expect((await s.service.results(ACCOUNT)).at(-1)).toMatchObject({ status: "done", reason: "no_new_results" });
    // A day later one new result: only it is sent.
    s.setSources([source(1), source(2), source(3)]);
    await s.runAt("2026-11-18T07:11:00Z");
    expect(s.fake.calls).toHaveLength(2);
    expect(s.fake.calls[1].messages[1].content).toContain("https://jobs.example.test/3");
    expect(s.fake.calls[1].messages[1].content).not.toContain("https://jobs.example.test/1");
    // Acknowledged results are deleted at once.
    for (const r of await s.service.results(ACCOUNT)) await s.service.ack(ACCOUNT, r.id);
    expect(await s.service.results(ACCOUNT)).toEqual([]);
    expect(s.store.resultRows.size).toBe(0);
    const counts = takeCounts();
    expect(counts).toMatchObject({ "background.created": 1, "background.completed": 2, "background.no_new_results": 1, "background.delivered": 3 });
    // Counts carry fixed names only.
    expect(Object.keys(counts).every((name) => /^[a-z_.]+$/.test(name))).toBe(true);
  });

  it("skips without allowance, pauses after three skips and resumes on request", async () => {
    const s = setup({ limit: 1 });
    const { task } = taskBody();
    await s.service.create(ACCOUNT, { ...taskBody(), task });
    s.usage.reserve(ACCOUNT, "used-up", 1);
    await s.runAt("2026-11-16T07:11:00Z");
    await s.runAt("2026-11-17T07:11:00Z");
    await s.runAt("2026-11-18T07:11:00Z");
    await s.runAt("2026-11-19T07:11:00Z"); // paused: not claimed
    expect((await s.service.results(ACCOUNT)).map((r) => r.reason)).toEqual(["allowance_exhausted", "allowance_exhausted", "paused_allowance"]);
    expect(s.fake.calls).toHaveLength(0);
    expect((await s.service.list(ACCOUNT))[0].paused).toBe(true);
    const resumed = await s.service.patch(ACCOUNT, task.id, { paused: false });
    expect(resumed).toMatchObject({ task: { nextDueAt: "2026-11-20T07:00:00.000Z" } });
    expect("task" in resumed && resumed.task.paused).toBeFalsy();
    expect(s.store.taskRows.get(task.id)?.skips).toBe(0);
  });

  it("honours the stop switch, the spend guard, the daily cap and the daily run count", async () => {
    const s = setup({ dailyLimit: 3 });
    for (let i = 0; i < 3; i++) await s.service.create(ACCOUNT, taskBody({ answerMode: i === 2 ? "thinking" : "fast" }));
    s.state.stopped = true;
    await s.runAt("2026-11-16T07:11:00Z");
    expect((await s.service.results(ACCOUNT)).map((r) => r.reason)).toEqual(["service_paused", "service_paused", "service_paused"]);
    s.state.stopped = false;
    s.state.spend = false;
    await s.runAt("2026-11-17T07:11:00Z");
    expect((await s.service.results(ACCOUNT)).slice(3).map((r) => r.reason)).toEqual(["service_limit", "service_limit", "service_limit"]);
    s.state.spend = true;
    // Daily cap 3 units: two Fast runs (1 each) and a Thinking run (3) never all fit in one day.
    await s.runAt("2026-11-18T07:11:00Z");
    const day = (await s.service.results(ACCOUNT)).slice(6);
    expect(day.some((r) => r.reason === "daily_limit")).toBe(true);
    expect(day.filter((r) => r.status === "done")).toHaveLength(s.fake.calls.length);
    expect(used(s)).toBeGreaterThan(0);
    expect(used(s)).toBeLessThanOrEqual(3);
    // Daily runs per account: a task moved back to due today is refused once three ran.
    const t = setup();
    for (let i = 0; i < 3; i++) await t.service.create(ACCOUNT, taskBody());
    await t.runAt("2026-11-16T07:11:00Z");
    const extra = taskBody();
    t.deps.settings.maxAutoTasks = 4;
    await t.service.create(ACCOUNT, extra);
    await t.store.updateTask(ACCOUNT, extra.task.id, { runAfter: t.clock() });
    await t.service.tick();
    expect((await t.service.results(ACCOUNT)).at(-1)).toMatchObject({ status: "skipped", reason: "daily_runs" });
    expect(BACKGROUND_LIMITS.dailyRunsPerAccount).toBe(3);
  });

  it("retries once on an outage (backup model), never on a refusal; a missing model and a changed deployment fail closed", async () => {
    const outcomes: Record<string, unknown> = {};
    for (const [name, script] of [
      ["outage", ["unavailable", "ok"]],
      ["outage twice", ["unavailable", "unavailable"]],
      ["refused", ["rejected"]],
      ["model gone", ["model-not-found"]],
      ["rotation", ["deployment-changed"]],
    ] as const) {
      const s = setup();
      s.fake.script.push(...script);
      await s.service.create(ACCOUNT, taskBody({ answerMode: "thinking" }));
      await s.runAt("2026-11-16T07:11:00Z");
      outcomes[name] = {
        models: s.fake.calls.map((c) => c.model),
        result: (await s.service.results(ACCOUNT)).map((r) => r.reason ?? r.status),
        used: used(s),
      };
    }
    expect(outcomes).toEqual({
      outage: { models: ["glm-5.3", "glm-5.3-flash"], result: ["done"], used: 3 },
      "outage twice": { models: ["glm-5.3", "glm-5.3-flash"], result: ["provider_unavailable"], used: 3 },
      refused: { models: ["glm-5.3"], result: ["provider_refused"], used: 3 },
      "model gone": { models: ["glm-5.3"], result: ["model_not_found"], used: 3 },
      rotation: { models: ["glm-5.3"], result: ["deployment_changed"], used: 3 },
    });
  });

  it("waits, without spending, while attestation is not free or users hold the slots", async () => {
    const s = setup();
    const { task } = (await s.service.create(ACCOUNT, taskBody())) as { task: ScheduledTask };
    s.fake.failReady("attestation-busy");
    await s.runAt("2026-11-16T07:11:00Z");
    expect(await s.service.results(ACCOUNT)).toEqual([]);
    expect(used(s)).toBe(0);
    expect(s.store.taskRows.get(task.id)?.runAfter).toBe(s.clock() + BACKGROUND_LIMITS.deferMs);
    s.fake.failReady(undefined);
    s.state.slot = false;
    await s.runAt("2026-11-16T07:17:00Z");
    expect(await s.service.results(ACCOUNT)).toEqual([]);
    s.state.slot = true;
    await s.runAt("2026-11-16T07:23:00Z");
    expect((await s.service.results(ACCOUNT)).map((r) => r.status)).toEqual(["done"]);
    // Rotation found at verification fails closed before anything is spent.
    const r = setup();
    await r.service.create(ACCOUNT, taskBody());
    r.fake.failReady("deployment-changed");
    await r.runAt("2026-11-16T07:11:00Z");
    expect((await r.service.results(ACCOUNT)).map((x) => x.reason)).toEqual(["deployment_changed"]);
    expect(used(r)).toBe(0);
  });

  it("keeps 7 results per task, deletes undelivered results after 7 days and with the task", async () => {
    const s = setup();
    const { task } = (await s.service.create(ACCOUNT, taskBody())) as { task: ScheduledTask };
    for (let day = 16; day < 26; day++) await s.runAt(`2026-11-${day}T07:11:00Z`);
    expect(await s.service.results(ACCOUNT)).toHaveLength(BACKGROUND_LIMITS.resultsPerTask);
    s.setClock(Date.parse("2026-11-25T07:11:00Z") + 7 * DAY - 60_000);
    expect(await s.store.purge(s.clock())).toBeLessThan(7);
    expect(await s.store.purge(Date.parse("2026-11-25T07:11:00Z") + 7 * DAY)).toBeGreaterThan(0);
    expect(await s.service.results(ACCOUNT)).toHaveLength(0);
    await s.runAt("2026-12-03T07:11:00Z");
    expect(await s.service.results(ACCOUNT)).toHaveLength(1);
    await s.service.remove(ACCOUNT, task.id);
    expect(s.store.taskRows.size + s.store.resultRows.size).toBe(0);
  });
});

describe("scheduling", () => {
  it("spreads tasks set for the same minute over ten minutes, fixed per task, and never catches up", () => {
    const spreads = Array.from({ length: 50 }, () => spreadOf(randomUUID()));
    expect(spreads.every((ms) => ms >= 0 && ms < BACKGROUND_LIMITS.spreadMs)).toBe(true);
    expect(new Set(spreads).size).toBeGreaterThan(40);
    const id = randomUUID();
    expect(spreadOf(id)).toBe(spreadOf(id));
    const trigger = { every: 1, unit: "day" as const, time: "08:00", timeZone: "Europe/Berlin" };
    // Down for three days: one run, then the next future due time.
    expect(new Date(followingDue(trigger, Date.parse("2026-11-16T07:00:00Z"), Date.parse("2026-11-19T12:00:00Z"))).toISOString()).toBe(
      "2026-11-20T07:00:00.000Z",
    );
    expect(nextDue(trigger, new Date("2026-11-16T07:00:00Z")).toISOString()).toBe("2026-11-17T07:00:00.000Z");
  });

  it("claims the earliest due task once, skips paused tasks and closing accounts, and holds a lease", async () => {
    const closed = new Set<string>();
    const store = new MemoryBackgroundStore(() => closed);
    const row = (taskId: string, runAfter: number, over: Partial<TaskRow> = {}): TaskRow => ({
      taskId,
      accountId: "a",
      payload: "k1.x.y",
      nextDueAt: runAfter,
      runAfter,
      paused: false,
      skips: 0,
      consent: { version: "v", at: 0, sensitive: false },
      createdAt: 0,
      ...over,
    });
    await store.insertTask(row("late", 300), 5);
    await store.insertTask(row("early", 100), 5);
    await store.insertTask(row("paused", 50, { paused: true }), 5);
    await store.insertTask(row("closing", 10, { accountId: "b" }), 5);
    closed.add("b");
    expect(await store.insertTask(row("early", 1), 5)).toBe("exists");
    expect(await store.insertTask(row("fourth", 1), 3)).toBe("full");
    expect((await store.claimDue(1000, 60_000))?.taskId).toBe("early");
    expect((await store.claimDue(1000, 60_000))?.taskId).toBe("late");
    expect(await store.claimDue(1000, 60_000)).toBeUndefined();
    // The lease runs out: a crashed run is claimed again.
    expect((await store.claimDue(70_000, 60_000))?.taskId).toBe("early");
    await store.release("late", { runAfter: 500_000 });
    expect(await store.claimDue(80_000, 60_000)).toBeUndefined();
  });

  it("starts runs only inside the configured UTC hours", async () => {
    const s = setup({ settings: { maxAutoTasks: 3, runHourUtcWindow: { from: 22, to: 6 } } });
    await s.service.create(ACCOUNT, taskBody());
    await s.runAt("2026-11-16T07:11:00Z");
    expect(s.fake.calls).toHaveLength(0);
    await s.runAt("2026-11-16T22:00:00Z");
    expect(s.fake.calls).toHaveLength(1);
  });
});

describe("encryption at rest", () => {
  const ring = parseKeyRing(`k1:${Buffer.alloc(32, 7).toString("base64")}`);
  it("opens only with the right key, row and field, and refuses a changed value", () => {
    const sealed = seal(ring, "SYNTHETIC instruction", "task|a|t1");
    expect(sealed.startsWith("k1.")).toBe(true);
    expect(sealed).not.toContain("SYNTHETIC");
    expect(open(ring, sealed, "task|a|t1")).toBe("SYNTHETIC instruction");
    expect(seal(ring, "same", "c")).not.toBe(seal(ring, "same", "c")); // a fresh nonce each time
    expect(() => open(ring, sealed, "task|b|t1")).toThrow();
    const [id, nonce, body] = sealed.split(".");
    const flipped = Buffer.from(body, "base64url");
    flipped[0] ^= 1;
    expect(() => open(ring, [id, nonce, flipped.toString("base64url")].join("."), "task|a|t1")).toThrow();
    expect(() => open(parseKeyRing(`k2:${Buffer.alloc(32, 8).toString("base64")}`), sealed, "task|a|t1")).toThrow();
    for (const bad of ["", "k1:short", `K1:${Buffer.alloc(32).toString("base64")}`, `k1:${Buffer.alloc(32).toString("base64")}\nk1:${Buffer.alloc(32).toString("base64")}`])
      expect(() => parseKeyRing(bad)).toThrow();
  });

  it("re-seals under a new key; a row whose key is gone pauses instead of running", async () => {
    const old = parseKeyRing(`k1:${Buffer.alloc(32, 1).toString("base64")}`);
    const s = setup({ keys: old });
    const { task } = (await s.service.create(ACCOUNT, taskBody())) as { task: ScheduledTask };
    await s.runAt("2026-11-16T07:11:00Z");
    const rotated = parseKeyRing(`k2:${Buffer.alloc(32, 2).toString("base64")}\nk1:${Buffer.alloc(32, 1).toString("base64")}`);
    const next = createBackgroundTasks({ ...s.deps, keys: rotated });
    expect(await next.resealStale()).toBe(2); // the task and its result
    expect(s.store.taskRows.get(task.id)?.payload.startsWith("k2.")).toBe(true);
    expect((await next.list(ACCOUNT))[0].name).toBe("Job search");
    expect((await next.results(ACCOUNT))[0].text).toContain("SYNTHETIC ANSWER");
    // Only the new key, and a row still under the old one: it cannot run, so it pauses.
    const onlyNew = createBackgroundTasks({ ...s.deps, keys: parseKeyRing(`k3:${Buffer.alloc(32, 3).toString("base64")}`) });
    s.setClock(Date.parse("2026-11-17T07:11:00Z"));
    await onlyNew.tick();
    expect(s.store.taskRows.get(task.id)?.paused).toBe(true);
    expect(s.fake.calls).toHaveLength(1);
  });
});

describe("admission of a new task", () => {
  it("refuses without consent, with an old consent, an attachment without the extra consent, unmasked identifiers and Manual tasks", async () => {
    const s = setup();
    const { consent: _c, ...noConsent } = taskBody();
    const refused = async (body: unknown) => ((await s.service.create(ACCOUNT, body)) as { error?: string }).error;
    expect(await refused(noConsent)).toMatch(/consent first/);
    expect(await refused({ ...taskBody(), consent: { version: "2020-01-01", acceptedAt: "2026-11-15T10:00:00.000Z", sensitive: false } })).toMatch(/has changed/);
    expect(await refused(taskBody({}, { attachment: { text: CV } }))).toMatch(/extra consent/);
    expect(await refused(taskBody({ instruction: "Mail the list to alex.example@example.test every day." }))).toMatch(/masked/);
    expect(await refused(taskBody({}, { attachment: { text: "IBAN DE89 3704 0044 0532 0130 00" }, consent: { version: BACKGROUND_CONSENT_VERSION, acceptedAt: "2026-11-15T10:00:00.000Z", sensitive: true } }))).toMatch(/masked/);
    expect(await refused(taskBody({ mode: "manual" }))).toMatch(/not valid/);
    expect(await refused(taskBody({}, { attachment: { text: "x".repeat(30_001) } }))).toMatch(/not valid/);
    expect(s.store.taskRows.size).toBe(0);
  });
});

describe("the server's Privatemode client", () => {
  const behaviour = { verify: "ok" as "ok" | "rotate" | "429", bytes: fakeManifest as Uint8Array, reply: (): Promise<unknown> => Promise.resolve({ choices: [{ message: { content: "SYNTHETIC" } }], usage: { prompt_tokens: 10, completion_tokens: 5 } }) };
  function client(now: { t: number }, queue?: Parameters<typeof createPrivatemodeBackgroundClient>[0]["attestQueue"]) {
    const made: { options: Record<string, unknown>; verify: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> }[] = [];
    const logs: string[] = [];
    const c = createPrivatemodeBackgroundClient({
      apiKey: "SYNTHETIC_KEY_NOT_REAL",
      qualification,
      manifest: fakeManifest,
      attestQueue: queue,
      log: (line) => logs.push(line),
      now: () => now.t,
      sdk: (options) => {
        const sdk = {
          options,
          verify: vi.fn(async () => {
            if (behaviour.verify === "rotate") (options.onManifestUpdate as (b: Uint8Array) => void)(new Uint8Array([1]));
            if (behaviour.verify === "429") throw Error("updating mesh CA: doing attest request: unexpected status code: 429");
          }),
          refreshSecret: vi.fn(async () => {}),
          get manifestBytes() {
            return behaviour.bytes;
          },
          chat: { completions: { create: vi.fn(() => behaviour.reply()) } },
          close: vi.fn(),
        };
        made.push(sdk);
        return sdk;
      },
    });
    return { c, made, logs };
  }
  const request = (): BackgroundModelRequest => ({ model: "glm-5.3-flash", messages: [{ role: "user", content: "x" }], maxTokens: 10, options: {}, signal: new AbortController().signal });

  it("pins the approved manifest, the Wasm hash and the OCSP policy, and reuses one client for 10 minutes", async () => {
    const now = { t: 0 };
    const { c, made } = client(now, createAttestQueue());
    expect(await c.complete(request())).toEqual({ text: "SYNTHETIC", usage: { promptTokens: 10, completionTokens: 5 } });
    expect(made[0].options).toMatchObject({
      manifestBytes: fakeManifest,
      expectedWasmHash: qualification().privatemode!.wasmSha256,
      nvidiaOCSPPolicy: { allowUnknown: false, revokedGracePeriodHours: 0 },
      openAIOptions: { maxRetries: 0 },
      apiBaseURL: "https://api.privatemode.ai",
    });
    now.t = 9 * 60_000;
    await c.complete(request());
    expect(made).toHaveLength(1);
    now.t = 10 * 60_000;
    await c.complete(request());
    expect(made).toHaveLength(2);
    expect(made[0].close).toHaveBeenCalled();
  });

  it("fails closed on a rotation and stays stopped for an hour, with an alert", async () => {
    const now = { t: 0 };
    const { c, made, logs } = client(now);
    behaviour.verify = "rotate";
    await expect(c.ready(new AbortController().signal)).rejects.toMatchObject({ kind: "deployment-changed" });
    behaviour.verify = "ok";
    now.t = 30 * 60_000;
    await expect(c.ready(new AbortController().signal)).rejects.toMatchObject({ kind: "deployment-changed" });
    expect(made).toHaveLength(1); // no attestation while blocked
    expect(logs.join(" ")).toMatch(/CometRow model alert:.*background tasks/);
    now.t = 61 * 60_000;
    await c.ready(new AbortController().signal);
    // Bytes the report does not approve, even without the callback: refused.
    const other = client({ t: 0 });
    behaviour.bytes = new TextEncoder().encode("{}");
    await expect(other.c.ready(new AbortController().signal)).rejects.toMatchObject({ kind: "deployment-changed" });
    behaviour.bytes = fakeManifest;
  });

  it("counts the queue as quiet only with half its burst free", async () => {
    const queue = createAttestQueue();
    expect(queue.idle()).toBe(true);
    const ok = async () => ({ statusCode: 200, headers: {}, body: { dump: async () => {} } });
    for (let i = 0; i < 4; i++) await queue.run(ok, new AbortController().signal);
    expect(queue.idle()).toBe(false); // users verified just now: background waits
  });

  it("waits for a quiet attestation queue and maps provider failures", async () => {
    const busy = client({ t: 0 }, { idle: () => false, run: async () => "busy" });
    await expect(busy.c.ready(new AbortController().signal)).rejects.toMatchObject({ kind: "attestation-busy" });
    expect(busy.made).toHaveLength(0);
    const { c, made } = client({ t: 0 });
    const fail = (status: number, message = "x") => () => Promise.reject(Object.assign(new Error(message), { status }));
    behaviour.reply = fail(404);
    await expect(c.complete(request())).rejects.toMatchObject({ kind: "model-not-found" });
    behaviour.reply = fail(400);
    await expect(c.complete(request())).rejects.toMatchObject({ kind: "rejected" });
    expect(made).toHaveLength(1); // a refusal keeps the verified client
    behaviour.reply = fail(503);
    await expect(c.complete(request())).rejects.toMatchObject({ kind: "unavailable" });
    behaviour.reply = () => Promise.resolve({ choices: [{ message: { content: "ok" } }] });
    await c.complete(request());
    expect(made).toHaveLength(2); // an outage discards it
    const noReport = createPrivatemodeBackgroundClient({ apiKey: "x", qualification: () => undefined, log: () => {} });
    await expect(noReport.ready(new AbortController().signal)).rejects.toMatchObject({ kind: "not-qualified" });
  });
});

describe("HTTP routes", () => {
  async function serve(config: Partial<Parameters<typeof createApp>[0]> = {}) {
    const server = createServer();
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw Error("port");
    const origin = `http://127.0.0.1:${address.port}`;
    const fake = fakeModel();
    server.on(
      "request",
      createApp({
        origin,
        dev: true,
        backgroundTasks: { maxAutoTasks: 3, store: new MemoryBackgroundStore(), keys: ephemeralKeyRing(), model: fake.model, log: () => {}, start: false },
        ...config,
      }),
    );
    const status = await fetch(`${origin}/api/status`);
    const cookie = status.headers.getSetCookie()[0].split(";")[0];
    const { csrf, backgroundTasks } = await status.json();
    const call = (method: string, path: string, body?: unknown, csrfHeader = true) =>
      fetch(`${origin}/api/background-tasks${path}`, {
        method,
        headers: { cookie, "content-type": "application/json", ...(csrfHeader ? { "x-privateai-csrf": csrf } : {}) },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
    return { call, backgroundTasks, close: () => new Promise((resolve) => server.close(resolve)) };
  }

  it("follows the contract: status, create, limits, patch, results, ack and delete, behind CSRF", async () => {
    const api = await serve();
    try {
      expect(api.backgroundTasks).toEqual({ maxAutoTasks: 3, minIntervalHours: 24, consentVersion: BACKGROUND_CONSENT_VERSION });
      expect((await api.call("POST", "", taskBody(), false)).status).toBe(403);
      const first = taskBody();
      const created = await api.call("POST", "", first);
      expect(created.status).toBe(200);
      const { task } = await created.json();
      expect(task.id).toBe(first.task.id);
      expect(task.nextDueAt).not.toBe(first.task.nextDueAt); // set by the server
      expect(Date.parse(task.nextDueAt)).toBeGreaterThan(Date.now());
      expect((await api.call("POST", "", first)).status).toBe(409);
      await api.call("POST", "", taskBody());
      await api.call("POST", "", taskBody());
      const full = await api.call("POST", "", taskBody());
      expect(full.status).toBe(409);
      expect(serverMessage((await full.json()).error, "de")).toMatch(/Höchstzahl/);
      const { consent: _c, ...noConsent } = taskBody();
      expect((await api.call("POST", "", noConsent)).status).toBe(400);
      const listed = await (await api.call("GET", "")).json();
      expect(listed.limits).toEqual({ maxAutoTasks: 3, minIntervalHours: 24 });
      expect(listed.tasks).toHaveLength(3);
      const patched = await api.call("PATCH", `/${task.id}`, { name: "Renamed", trigger: { every: 2, unit: "day", time: "09:30", timeZone: "Europe/Berlin" } });
      expect(patched.status).toBe(200);
      expect((await patched.json()).task).toMatchObject({ name: "Renamed", trigger: { every: 2, time: "09:30" } });
      expect((await api.call("PATCH", `/${randomUUID()}`, { name: "x" })).status).toBe(404);
      expect((await api.call("PATCH", `/${task.id}`, { mode: "manual" })).status).toBe(400);
      const results = await api.call("GET", "/results");
      expect(await results.json()).toEqual({ results: [] });
      expect((await api.call("POST", `/results/${randomUUID()}/ack`)).status).toBe(204);
      expect((await api.call("DELETE", `/${task.id}`)).status).toBe(204);
      expect((await (await api.call("GET", "")).json()).tasks).toHaveLength(2);
    } finally {
      await api.close();
    }
  });

  it("needs a signed-in account and exists only while the switch is on", async () => {
    const noAccount = await serve({ dev: false });
    try {
      const refused = await noAccount.call("GET", "");
      expect(refused.status).toBe(401);
      expect(serverMessage((await refused.json()).error, "de")).toBe("Melden Sie sich an, um Hintergrundaufgaben zu nutzen.");
    } finally {
      await noAccount.close();
    }
    const off = await serve({ backgroundTasks: undefined });
    try {
      expect(off.backgroundTasks).toBeUndefined();
      expect((await off.call("GET", "")).status).toBe(404);
    } finally {
      await off.close();
    }
  });
});
