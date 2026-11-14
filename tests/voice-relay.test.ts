// Voice input through the relay (docs/voice-to-text-20261114.md): off unless switched on, admitted
// like chat, charged through the same usage ledger, bounded by size and by count, nothing logged.
// Upstream is a test double: no audio, no key and no provider call. Synthetic only.
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
import { scheduleModelCheck } from "../server/model-watch";
import { SqliteUsageLedger } from "../server/usage-ledger";
import { validateQualification, watchedModels, qualifiedModels } from "../shared/contracts";
import { voiceDailyCount, voiceUploadLimit } from "../shared/voice";
import { fakeManifest, privatemodeReport } from "./fixtures/privatemode-report";

const PATH = "/v1/audio/transcriptions";
const SPEECH = { model: "whisper-large-v3", allowanceCost: 2 };
const VOICE = { maxSeconds: 30, dailyMinutes: 1 }; // two recordings a day
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
const headers = (cookie: string, csrf: string, model: string | null = SPEECH.model) => ({
  Cookie: cookie,
  "X-PrivateAI-CSRF": csrf,
  authorization: "Bearer relay-injects-the-key",
  ...(model ? { "privatemode-target-model": model } : {}),
  "privatemode-client": "SDK",
  "Content-Type": "multipart/form-data; boundary=synthetic",
});
const post = (root: string, path: string, h: Record<string, string>, body: BodyInit = new Uint8Array(64).fill(7)) =>
  fetch(root + path, { method: "POST", headers: { Origin: root, ...h }, body });
async function signedIn(extra: Partial<Config> = {}) {
  const registry = new InviteRegistry(":memory:");
  const usage = new SqliteUsageLedger(":memory:");
  const root = await listen({ invites: registry, usage, ...extra });
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
  expect(status.voice).toEqual({ maxSeconds: 30 });
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

it("bounds the upload by size: one byte over the limit for the maximum length is refused before anything is forwarded", async () => {
  // 30 s x 4,000 bytes/s x 2 + 65,536 = 305,536 bytes; 120 s gives 1,025,536 (under the bridge's 1 MiB).
  expect(voiceUploadLimit(30)).toBe(305_536);
  expect(voiceUploadLimit(120)).toBe(1_025_536);
  expect(voiceUploadLimit(120)).toBeLessThanOrEqual(1024 * 1024);
  upstream.mockImplementation(async () => transcript());
  const root = await listen();
  const { status, cookie } = await session(root);
  const refused = await post(root, PATH, headers(cookie, status.csrf), new Uint8Array(305_537));
  expect(refused.status).toBe(413);
  expect(refused.headers.get("x-privateai-voice")).toBe("refused_size");
  expect(upstream).not.toHaveBeenCalled();
  expect(takeCounts()).toMatchObject({ "voice.refused_size": 1 });
  expect((await post(root, PATH, headers(cookie, status.csrf), new Uint8Array(305_536))).status).toBe(200);
});

it("charges the speech model's allowance units through the usage ledger and bounds recordings per day by count", async () => {
  expect(voiceDailyCount(1, 30)).toBe(2);
  expect(voiceDailyCount(10, 120)).toBe(5);
  upstream.mockImplementation(async () => transcript());
  const { root, usage, accountId, status, cookie, settled } = await signedIn({ autoAllowance: { requestLimit: 50, days: 7 } });
  for (let i = 1; i <= 2; i++) {
    const reply = await post(root, PATH, headers(cookie, status.csrf));
    expect(reply.status).toBe(200);
    await reply.text();
    await settled();
    expect(usage.summary(accountId)).toMatchObject({ used: 2 * i });
  }
  const third = await post(root, PATH, headers(cookie, status.csrf));
  expect(third.status).toBe(429);
  expect(third.headers.get("x-privateai-voice")).toBe("refused_voice_daily");
  expect(upstream).toHaveBeenCalledTimes(2);
  expect(usage.summary(accountId)).toMatchObject({ used: 4 });
  expect(takeCounts()).toMatchObject({ "voice.completed": 2, "voice.refused_voice_daily": 1 });
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
