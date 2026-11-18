// Voice in the usage metering ledger (docs/usage-metering-20261115.md, "Voice"): with metering on,
// every forwarded chunk gets a record (feature voice, the allowance units charged, the weights
// version, sizes; the 2-second units ride in its ID), version 2 charges 1 unit per chunk, and the
// meter shows the same voice numbers as the status. Off: nothing of this exists and voice charges
// as before. Upstream is a test double: no audio, no key and no provider call. Synthetic only.
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
import { voiceUnitsOf } from "../server/usage-contract";
import { SqliteUsageLedger } from "../server/usage-ledger";
import { SqliteUsageRecords } from "../server/usage-records";
import { voiceChunkLimit } from "../shared/voice";
import { fakeManifest, privatemodeReport } from "./fixtures/privatemode-report";

const PATH = "/v1/audio/transcriptions";
// The report's own cost per chunk: what charges while metering is off.
const SPEECH = { model: "whisper-large-v3", allowanceCost: 3 };
const VOICE = { chunkSeconds: 30, maxTurnSeconds: 180, dailyUnits: 60 };
const TRANSCRIPT = "ciphertext-transcript";
const servers: Server[] = [];
afterEach(async () => {
  upstream.mockReset();
  takeCounts();
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
const transcript = () => new Response(TRANSCRIPT, { headers: { "content-type": "application/json", "privatemode-oae-response-header": "nonce" } });

async function relay(metering: false | { weightsVersion?: number } = {}, extra: Partial<Config> = {}) {
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
      qualification: privatemodeReport({ speech: SPEECH }),
      apiKey: "TEST_KEY_NOT_REAL",
      providerManifest: fakeManifest,
      invites: registry,
      usage,
      autoAllowance: { requestLimit: 50, days: 7, dailyLimit: 40 },
      voice: VOICE,
      ...(metering ? { metering: { plan: "alpha", records, ...metering } } : {}),
      ...extra,
    }),
  );
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
  const settled = () => vi.waitFor(() => expect(usage.summary(invite.id)).toMatchObject({ pending: 0 }));
  /** One chunk of `units` 2-second steps, `bytes` long (at most what its units allow by default). */
  const chunk = async (units: number, bytes = Math.min(4096, voiceChunkLimit(units))) => {
    const reply = await fetch(root + "/api/inference" + PATH, {
      method: "POST",
      headers: {
        ...headers,
        "privatemode-target-model": SPEECH.model,
        "x-privateai-voice-units": String(units),
        "Content-Type": "multipart/form-data; boundary=synthetic",
      },
      body: new Uint8Array(bytes).fill(9),
    });
    await reply.text();
    await settled();
    return reply;
  };
  const status_ = async () => (await fetch(root + "/api/status", { headers })).json();
  const meter = async () => fetch(root + "/api/usage/meter", { headers });
  const report = (body: unknown) =>
    fetch(root + "/api/usage/report", { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const used = () => (usage.summary(invite.id) as { used: number }).used;
  const recorded = async (n: number) => {
    await vi.waitFor(() => expect(records.since(invite.id, 0)).toHaveLength(n));
    return records.since(invite.id, 0);
  };
  return { id: invite.id, chunk, status: status_, meter, report, used, records, recorded, initial: status };
}

it("on (version 2 in force): one record per chunk at 1 unit, with its 2-second units in the ID, sizes and model; no browser report", async () => {
  upstream.mockImplementation(async () => transcript());
  const alice = await relay();
  expect(alice.initial.metering).toEqual({ plan: "alpha", weightsVersion: 2 });
  expect(alice.initial.inference.qualification.speech).toEqual({ ...SPEECH, allowanceCost: 1 });
  // Turn 1: 30 s, 30 s, 10 s. Turn 2: 20 s, 6 s.
  for (const units of [15, 15, 5, 10, 3]) {
    const reply = await alice.chunk(units);
    expect(reply.status).toBe(200);
    // Voice is measured by the relay: no request id for a browser report.
    expect(reply.headers.get("x-privateai-request")).toBeNull();
  }
  expect(alice.used()).toBe(5);
  const rows = await alice.recorded(5);
  expect(rows.map((r) => voiceUnitsOf(r.requestId))).toEqual([15, 15, 5, 10, 3]);
  for (const r of rows) {
    expect(r.requestId).toMatch(/^voice-\d+-[0-9a-f-]{36}$/);
    expect(r).toMatchObject({
      feature: "voice",
      units: 1,
      weightVersion: 2,
      outcome: "complete",
      model: SPEECH.model,
      responseBytes: TRANSCRIPT.length,
      report: "none",
    });
    expect(r.requestBytes).toBe(Math.min(4096, voiceChunkLimit(voiceUnitsOf(r.requestId))));
    // Numbers only: no audio, text or file name in a record.
    expect(Object.keys(r).sort()).toEqual(
      ["accountId", "createdAt", "durationMs", "feature", "model", "outcome", "report", "requestBytes", "requestId", "responseBytes", "units", "weightVersion"].sort(),
    );
  }
  // A report for a voice record is refused and changes nothing.
  expect((await alice.report({ requestId: rows[0].requestId, promptTokens: 0, completionTokens: 0, audioSeconds: 1 })).status).toBe(409);
  expect(alice.records.get(alice.id, rows[0].requestId)).toMatchObject({ report: "none" });
  expect(alice.records.get(alice.id, rows[0].requestId)).not.toHaveProperty("audioSeconds");
});

it("the daily voice budget across chunks and turns; the meter and the status show the same used and left", async () => {
  upstream.mockImplementation(async () => transcript());
  const alice = await relay();
  for (const units of [15, 15, 5]) expect((await alice.chunk(units)).status).toBe(200);
  for (const units of [10, 3]) expect((await alice.chunk(units)).status).toBe(200);
  const status = await alice.status();
  const meter = await (await alice.meter()).json();
  expect(status.voice).toMatchObject({ dailyUnits: 60, usedUnits: 48 });
  expect(meter.voice).toEqual({ dailyUnits: status.voice.dailyUnits, chunkSeconds: 30, usedUnits: status.voice.usedUnits });
  // 48 of 60: a recording starts while any voice time is left (owner, 18 November), so 15 more run
  // and make 63; the next start is refused before anything is sent, with no charge and no record.
  expect(await alice.chunk(15)).toHaveProperty("status", 200);
  expect(alice.used()).toBe(6);
  await alice.recorded(6);
  expect((await (await alice.meter()).json()).voice.usedUnits).toBe(63);
  expect((await alice.status()).voice.usedUnits).toBe(63);
  const over = await alice.chunk(1);
  expect(over.status).toBe(429);
  expect(over.headers.get("x-privateai-voice")).toBe("refused_voice_daily");
  // The meter's feature table counts chunks and the allowance units they were charged.
  expect((await (await alice.meter()).json()).features).toContainEqual({ feature: "voice", requests: 6, units: 6, tokens: 0, reported: 0 });
});

it("version 1 pinned: each chunk charges 2 units and its record says version 1", async () => {
  upstream.mockImplementation(async () => transcript());
  const alice = await relay({ weightsVersion: 1 });
  expect(alice.initial.metering).toEqual({ plan: "alpha", weightsVersion: 1 });
  for (const units of [15, 4]) expect((await alice.chunk(units)).status).toBe(200);
  expect(alice.used()).toBe(4);
  expect((await alice.recorded(2)).map((r) => [r.units, r.weightVersion])).toEqual([
    [2, 1],
    [2, 1],
  ]);
});

it("off: no record, no request id, no meter, and the report's own cost per chunk, exactly as before", async () => {
  upstream.mockImplementation(async () => transcript());
  const alice = await relay(false);
  expect(alice.initial).not.toHaveProperty("metering");
  expect(alice.initial.inference.qualification.speech).toEqual(SPEECH);
  expect(alice.initial.voice).toEqual({ ...VOICE, usedUnits: 0 });
  const reply = await alice.chunk(15);
  expect(reply.status).toBe(200);
  expect([...reply.headers.keys()].filter((name) => name.startsWith("x-privateai"))).toEqual([]);
  expect(alice.used()).toBe(SPEECH.allowanceCost);
  expect((await alice.meter()).status).toBe(404);
  expect(alice.records.since(alice.id, 0)).toEqual([]);
  expect(alice.records.between(0, Date.now() + 1)).toEqual([]);
});

it("the size cross-check: a chunk larger than its units allow is refused before anything is sent and gets no record", async () => {
  upstream.mockImplementation(async () => transcript());
  const alice = await relay();
  expect((await alice.chunk(1, voiceChunkLimit(1) + 1)).status).toBe(413);
  expect((await alice.chunk(16)).status).toBe(400);
  expect(upstream).not.toHaveBeenCalled();
  expect(alice.used()).toBe(0);
  // Exactly at the limit passes, and the record keeps the size the relay checked.
  expect((await alice.chunk(1, voiceChunkLimit(1))).status).toBe(200);
  const [row] = await alice.recorded(1);
  expect(row).toMatchObject({ requestBytes: voiceChunkLimit(1), units: 1 });
  expect(row.requestBytes!).toBeLessThanOrEqual(voiceChunkLimit(voiceUnitsOf(row.requestId)));
});

it("a chunk the provider refuses is recorded as refused, and the next one on the retry credit at 0 units", async () => {
  upstream.mockImplementationOnce(async () => new Response("no", { status: 503 }));
  upstream.mockImplementation(async () => transcript());
  const alice = await relay();
  expect((await alice.chunk(15)).status).toBe(502);
  expect((await alice.chunk(15)).status).toBe(200);
  expect(alice.used()).toBe(1);
  expect((await alice.recorded(2)).map((r) => [r.feature, r.units, r.outcome])).toEqual([
    ["voice", 1, "refused"],
    ["voice", 0, "complete"],
  ]);
});
