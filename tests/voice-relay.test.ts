// Voice input through the relay (docs/voice-to-text-20261114.md): off unless switched on, admitted
// like chat, charged through the same usage ledger, bounded by size and by count, nothing logged.
// Upstream is a test double: no audio, no key and no provider call. Synthetic only.
import { afterEach, expect, it, vi } from "vitest";
import { createServer, type Server } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
import { scheduleModelCheck } from "../server/model-watch";
import { SqliteUsageLedger } from "../server/usage-ledger";
import { validateQualification, watchedModels, qualifiedModels } from "../shared/contracts";
import { voiceChunkLimit, voiceUnits } from "../shared/voice";
import { fakeManifest, privatemodeReport } from "./fixtures/privatemode-report";

const PATH = "/v1/audio/transcriptions";
const SPEECH = { model: "whisper-large-v3", allowanceCost: 2 };
const VOICE = { chunkSeconds: 30, maxTurnSeconds: 180, dailyUnits: 20 }; // 40 seconds a day
const servers: Server[] = [];
afterEach(async () => {
  upstream.mockReset();
  vi.restoreAllMocks();
  takeCounts();
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
const transcript = () =>
  new Response("ciphertext-transcript", {
    headers: { "content-type": "application/json", "privatemode-oae-response-header": "nonce", "set-cookie": "upstream=1" },
  });

async function listen(extra: Partial<Config> = {}) {
  const server = createServer();
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const root = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  server.on(
    "request",
    createApp({
      origin: root,
      qualification: privatemodeReport({ speech: SPEECH }),
      apiKey: "TEST_KEY_NOT_REAL",
      providerManifest: fakeManifest,
      voice: VOICE,
      ...extra,
    }),
  );
  return root;
}
async function session(root: string, cookie?: string) {
  const response = await fetch(root + "/api/status", cookie ? { headers: { Cookie: cookie } } : {});
  const status = await response.json();
  const sessionCookie = response.headers.get("set-cookie")!.split(";")[0];
  return { status, cookie: cookie ? `${cookie}; ${sessionCookie}` : sessionCookie };
}
const headers = (cookie: string, csrf: string, model: string | null = SPEECH.model, units: string | null = "2") => ({
  Cookie: cookie,
  "X-PrivateAI-CSRF": csrf,
  authorization: "Bearer relay-injects-the-key",
  ...(model ? { "privatemode-target-model": model } : {}),
  ...(units ? { "x-privateai-voice-units": units } : {}),
  "privatemode-client": "SDK",
  "Content-Type": "multipart/form-data; boundary=synthetic",
});
const post = (root: string, path: string, h: Record<string, string>, body: BodyInit = new Uint8Array(64).fill(7)) =>
  fetch(root + path, { method: "POST", headers: { Origin: root, ...h }, body });
async function signedIn(extra: Partial<Config> = {}) {
  const registry = (extra.invites as InviteRegistry | undefined) ?? new InviteRegistry(":memory:");
  const usage = (extra.usage as SqliteUsageLedger | undefined) ?? new SqliteUsageLedger(":memory:");
  const root = await listen({ ...extra, invites: registry, usage });
  const invite = registry.issue(Date.now() + 60000);
  const registration = await fetch(root + "/auth/register", {
    method: "POST",
    redirect: "manual",
    headers: { Origin: root, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id: invite.id, token: invite.token, password: "SYNTHETIC account password" }),
  });
  const account = await session(root, registration.headers.get("set-cookie")!.split(";")[0]);
  const settled = () => vi.waitFor(() => expect(usage.summary(invite.id)).toMatchObject({ pending: 0 }));
  return { root, usage, accountId: invite.id, ...account, settled };
}

it("is off by default: no status field and no route without the switch, and none without a speech model in the report", async () => {
  for (const extra of [{ voice: undefined }, { qualification: privatemodeReport() }]) {
    const root = await listen(extra);
    const { status, cookie } = await session(root);
    expect(status.voice).toBeUndefined();
    const refused = await post(root, PATH, headers(cookie, status.csrf));
    expect(refused.status).toBe(404);
  }
  expect(upstream).not.toHaveBeenCalled();
});

it("needs a session and the CSRF token, like chat", async () => {
  const root = await listen();
  expect((await post(root, PATH, {})).status).toBe(401);
  const { cookie } = await session(root);
  expect((await post(root, PATH, { Cookie: cookie })).status).toBe(403);
  expect(upstream).not.toHaveBeenCalled();
});

it("forwards the encrypted recording with the real key and the pinned speech model, returns the encrypted reply, and logs nothing", async () => {
  const logs = (["log", "warn", "error", "info"] as const).map((level) => vi.spyOn(console, level).mockImplementation(() => {}));
  upstream.mockImplementation(async () => transcript());
  const root = await listen();
  const { status, cookie } = await session(root);
  expect(status.voice).toEqual({ ...VOICE, usedUnits: 0 });
  expect(status.inference.qualification.speech).toEqual(SPEECH);
  const body = new Uint8Array(4096).fill(9);
  const reply = await post(root, PATH, headers(cookie, status.csrf), body);
  expect(reply.status).toBe(200);
  expect(await reply.text()).toBe("ciphertext-transcript");
  expect(reply.headers.get("privatemode-oae-response-header")).toBe("nonce");
  expect(reply.headers.get("set-cookie")).toBeNull();
  const [url, options] = upstream.mock.calls[0];
  expect(String(url)).toBe("https://api.privatemode.ai/v1/audio/transcriptions");
  expect(options.headers).toEqual({
    accept: "*/*",
    "content-type": "multipart/form-data; boundary=synthetic",
    "privatemode-target-model": SPEECH.model,
    "privatemode-client": "SDK",
    authorization: "Bearer TEST_KEY_NOT_REAL",
  });
  expect(Buffer.from(options.body).equals(Buffer.from(body))).toBe(true);
  await vi.waitFor(() => expect(takeCounts()).toMatchObject({ "voice.completed": 1 }));
  for (const log of logs) expect(log).not.toHaveBeenCalled();
});

it("accepts only the report's speech model, and the chat route never accepts it", async () => {
  const root = await listen();
  const { status, cookie } = await session(root);
  for (const model of ["glm-5.3-flash", "voxtral-mini-3b", null])
    expect((await post(root, PATH, headers(cookie, status.csrf, model))).status).toBe(400);
  const chat = await post(root, "/v1/chat/completions", { ...headers(cookie, status.csrf), "Content-Type": "application/json" });
  expect(chat.status).toBe(400);
  expect(upstream).not.toHaveBeenCalled();
  expect(takeCounts()).toMatchObject({ "voice.refused_model": 3 });
});

it("the stop switch refuses voice input at once and the status hides the button", async () => {
  const root = await listen({ inferenceStopped: () => true });
  const { status, cookie } = await session(root);
  expect(status.voice).toBeUndefined();
  expect((await post(root, PATH, headers(cookie, status.csrf))).status).toBe(503);
  expect(upstream).not.toHaveBeenCalled();
});

// An honest chunk at the requested 32,000 bit/s: 4,400 bytes a second with the WebM container's
// share, enlarged by a third (as if the encryption were base64), plus 2,000 bytes of header and form.
const honest = (seconds: number) => Math.ceil(seconds * 4_400 * (4 / 3)) + 2_000;

it("checks each chunk's encrypted size against its reported length: honest sizes pass, inflated or over-long chunks are refused before anything is forwarded", async () => {
  // units x 2 s x 4,000 bytes/s x 2 + 8,192: 24,192 bytes for 1 unit, 248,192 for 15 (30 s), far under the bridge's 1 MiB.
  expect(voiceChunkLimit(1)).toBe(24_192);
  expect(voiceChunkLimit(15)).toBe(248_192);
  expect(voiceChunkLimit(15)).toBeLessThan(1024 * 1024);
  // The browser's count: 2-second steps rounded up, at least 1, never more than a chunk's 15.
  expect([voiceUnits(300, 30), voiceUnits(2_000, 30), voiceUnits(2_001, 30), voiceUnits(30_250, 30), voiceUnits(9_999, 10)]).toEqual([1, 1, 2, 15, 5]);
  for (let seconds = 1; seconds <= 30; seconds++)
    expect(honest(seconds), `${seconds} s`).toBeLessThanOrEqual(voiceChunkLimit(voiceUnits(seconds * 1000, 30)));
  upstream.mockImplementation(async () => transcript());
  const root = await listen({ voice: { ...VOICE, dailyUnits: 1000 } });
  const { status, cookie } = await session(root);
  const send = (bytes: number, units: string | null) =>
    post(root, PATH, headers(cookie, status.csrf, SPEECH.model, units), new Uint8Array(bytes));
  // Honest chunks of 2, 10 and 30 seconds pass.
  for (const [seconds, units] of [[2, "1"], [10, "5"], [30, "15"]] as const) expect((await send(honest(seconds), units)).status).toBe(200);
  // A 30-second body that claims 10 seconds, and one byte over the limit of its units, are refused.
  for (const [bytes, units] of [[honest(30), "5"], [voiceChunkLimit(5) + 1, "5"]] as const) {
    const refused = await send(bytes, units);
    expect(refused.status).toBe(413);
    expect(refused.headers.get("x-privateai-voice")).toBe("refused_size");
  }
  expect((await send(voiceChunkLimit(5), "5")).status).toBe(200);
  // No length, a length over one chunk (16 units = 32 s), and nonsense are refused.
  for (const units of [null, "0", "16", "1.5", "abc"]) {
    const refused = await send(honest(2), units);
    expect(refused.status).toBe(400);
    expect(refused.headers.get("x-privateai-voice")).toBe("refused_units");
  }
  // Above the largest chunk the body parser refuses before the handler runs.
  expect((await send(voiceChunkLimit(15) + 1, "15")).status).toBe(413);
  expect(upstream).toHaveBeenCalledTimes(4);
  const counts: Record<string, number> = {};
  await vi.waitFor(() => {
    Object.assign(counts, takeCounts());
    expect(counts).toMatchObject({ "voice.completed": 4, "voice.refused_size": 3, "voice.refused_units": 5 });
  });
});

it("keeps the daily voice budget in the usage ledger: units add up, the status shows used units, a chunk over the budget is refused, and a restart forgets nothing", async () => {
  upstream.mockImplementation(async () => transcript());
  const dir = await mkdtemp(join(tmpdir(), "privateai-voice-budget-"));
  const file = join(dir, "usage.sqlite");
  const registry = new InviteRegistry(":memory:");
  const config = { invites: registry, autoAllowance: { requestLimit: 50, days: 7 } };
  const ledgers: SqliteUsageLedger[] = [];
  const open = () => ledgers[ledgers.push(new SqliteUsageLedger(file)) - 1];
  try {
    const { root, usage, accountId, status, cookie, settled } = await signedIn({ ...config, usage: open() });
    // 15 + 4 units: 38 seconds of the 40; each chunk is one allowance charge of the speech cost (2).
    for (const units of ["15", "4"]) {
      const reply = await post(root, PATH, headers(cookie, status.csrf, SPEECH.model, units), new Uint8Array(honest(Number(units) * 2)));
      expect(reply.status).toBe(200);
      await reply.text();
      await settled();
    }
    expect(usage.summary(accountId)).toMatchObject({ used: 4 });
    const fresh = await (await fetch(root + "/api/status", { headers: { Cookie: cookie } })).json();
    expect(fresh.voice.usedUnits).toBe(19);
    // 2 more units would make 21 of 20: refused, nothing forwarded or charged. 1 more fits.
    const over = await post(root, PATH, headers(cookie, status.csrf, SPEECH.model, "2"));
    expect(over.status).toBe(429);
    expect(over.headers.get("x-privateai-voice")).toBe("refused_voice_daily");
    expect((await post(root, PATH, headers(cookie, status.csrf, SPEECH.model, "1"))).status).toBe(200);
    await settled();
    expect(upstream).toHaveBeenCalledTimes(3);
    expect(usage.summary(accountId)).toMatchObject({ used: 6 });

    // A restart: a new server and a new ledger object on the same database file.
    const restarted = open();
    const root2 = await listen({ ...config, usage: restarted });
    const login = await fetch(root2 + "/auth/login", {
      method: "POST",
      redirect: "manual",
      headers: { Origin: root2, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ id: accountId, password: "SYNTHETIC account password" }),
    });
    const again = await session(root2, login.headers.get("set-cookie")!.split(";")[0]);
    expect(again.status.voice.usedUnits).toBe(20);
    const refused = await post(root2, PATH, headers(again.cookie, again.status.csrf, SPEECH.model, "1"));
    expect(refused.headers.get("x-privateai-voice")).toBe("refused_voice_daily");
    expect(upstream).toHaveBeenCalledTimes(3);
  } finally {
    for (const server of servers.splice(0)) {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    for (const ledger of ledgers) ledger.close();
    await rm(dir, { recursive: true, force: true });
  }
});
it("refuses without allowance, at the chat allowance's daily cap, and at the spending limit", async () => {
  upstream.mockImplementation(async () => transcript());
  const none = await signedIn();
  const noAllowance = await post(none.root, PATH, headers(none.cookie, none.status.csrf));
  expect(noAllowance.status).toBe(429);
  expect(noAllowance.headers.get("x-privateai-voice")).toBe("refused_allowance");
  expect((await noAllowance.json()).error).toBe(
    "Not enough request allowance: voice input counts as 2 requests. No request was forwarded.",
  );
  // Daily cap of 3 units: one recording (2 units) fits, the second would make 4.
  const capped = await signedIn({ autoAllowance: { requestLimit: 50, days: 7, dailyLimit: 3 } });
  const first = await post(capped.root, PATH, headers(capped.cookie, capped.status.csrf));
  expect(first.status).toBe(200);
  await first.text();
  await capped.settled();
  const second = await post(capped.root, PATH, headers(capped.cookie, capped.status.csrf));
  expect(second.headers.get("x-privateai-voice")).toBe("refused_daily");
  // Spend guard: an approved spend below one request's worst case refuses.
  const poor = await signedIn({
    autoAllowance: { requestLimit: 50, days: 7 },
    qualification: privatemodeReport({ speech: SPEECH, approvedSpendUSD: 0.000001 }),
  });
  // The status already hides the button: chat is not ready at the spending limit.
  expect(poor.status.voice).toBeUndefined();
  const spend = await post(poor.root, PATH, headers(poor.cookie, poor.status.csrf));
  expect(spend.status).toBe(429);
  expect(spend.headers.get("x-privateai-voice")).toBe("refused_spend");
  expect(upstream).toHaveBeenCalledTimes(1);
  expect(takeCounts()).toMatchObject({ "voice.refused_allowance": 1, "voice.refused_daily": 1 });
});

it("a recording the provider refuses is not reflected, and the next attempt within a minute is not charged again", async () => {
  const alert = vi.spyOn(console, "warn").mockImplementation(() => {});
  upstream.mockImplementationOnce(async () => new Response("secret upstream detail", { status: 500 }));
  upstream.mockImplementation(async () => transcript());
  const { root, usage, accountId, status, cookie, settled } = await signedIn({ autoAllowance: { requestLimit: 50, days: 7 } });
  const refused = await post(root, PATH, headers(cookie, status.csrf));
  expect(refused.status).toBe(502);
  expect(refused.headers.get("x-privateai-upstream")).toBe("unavailable");
  expect(await refused.text()).not.toContain("secret upstream detail");
  await settled();
  expect(usage.summary(accountId)).toMatchObject({ used: 2 });
  const again = await post(root, PATH, headers(cookie, status.csrf));
  expect(again.status).toBe(200);
  await again.text();
  expect(usage.summary(accountId)).toMatchObject({ used: 2 });
  expect(takeCounts()).toMatchObject({ "voice.upstream_unavailable": 1, "voice.retry_not_counted": 1, "voice.completed": 1 });
  expect(alert).not.toHaveBeenCalled();
});

it("one request at a time per account: a recording being transcribed blocks a second one and a chat message", async () => {
  let finish!: (reply: Response) => void;
  upstream.mockImplementationOnce(() => new Promise<Response>((resolve) => (finish = resolve)));
  const { root, status, cookie } = await signedIn({ autoAllowance: { requestLimit: 50, days: 7 } });
  const running = post(root, PATH, headers(cookie, status.csrf));
  await vi.waitFor(() => expect(upstream).toHaveBeenCalledTimes(1));
  const second = await post(root, PATH, headers(cookie, status.csrf));
  expect(second.status).toBe(429);
  expect(second.headers.get("x-privateai-voice")).toBe("refused_account_busy");
  const chat = await post(root, "/v1/chat/completions", {
    ...headers(cookie, status.csrf, "glm-5.3-flash"),
    "Content-Type": "application/json",
  });
  expect(chat.status).toBe(429);
  finish(transcript());
  expect((await running).status).toBe(200);
});

it("the report names the speech model: validated, never a chat model, and watched by the daily model check", async () => {
  const report = validateQualification(privatemodeReport({ speech: SPEECH }));
  expect(qualifiedModels(report).has(SPEECH.model)).toBe(false);
  expect([...watchedModels(report)]).toEqual(["glm-5.3-flash", "glm-5.3", SPEECH.model]);
  expect(() => validateQualification(privatemodeReport({ speech: { model: "glm-5.3", allowanceCost: 1 } }))).toThrow();
  expect(() => validateQualification(privatemodeReport({ speech: { model: "whisper-latest", allowanceCost: 1 } }))).toThrow();
  expect(() => validateQualification(privatemodeReport({ speech: { model: SPEECH.model, allowanceCost: 0 } }))).toThrow();
  expect(() => validateQualification(privatemodeReport({ speech: { ...SPEECH, extra: 1 } }))).toThrow();
  const lines: string[] = [];
  const stop = scheduleModelCheck(
    report,
    "TEST_KEY_NOT_REAL",
    (line) => lines.push(line),
    async () => ({ data: [{ id: "glm-5.3-flash" }, { id: "glm-5.3" }] }),
    () => ({ recordedAt: "TEST", models: { "glm-5.3-flash": { id: "glm-5.3-flash" }, "glm-5.3": { id: "glm-5.3" } } }),
  );
  await vi.waitFor(() => expect(lines.join("\n")).toContain(`${SPEECH.model} is no longer in Privatemode's model list`));
  stop();
});
