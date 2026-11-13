// Production chat controls in the relay (step 4): spending ceiling, operator stop switch,
// and the production guard that only admits credentials with both in place.
import { afterEach, expect, it, vi } from "vitest";
import type { Server } from "node:http";
import { checks } from "../shared/contracts";
import { productionAccountTarget } from "../shared/account-design";
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
const qualification = (approvedSpendUSD: number) => ({
  provider: "tinfoil",
  model: "TEST_ONLY",
  origin: "https://test.tinfoil.sh",
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
  approvedSpendUSD,
});
// A ledger that reports spend only; its other methods must not be reached in these cases.
const ledger = (meteredUSD: string, unmetered = 0) => ({
  spend: vi.fn(async () => ({ meteredUSD, unmetered })),
  summary: vi.fn(),
  reserve: vi.fn(async () => false),
  dispatch: vi.fn(),
  metrics: vi.fn(),
  finish: vi.fn(),
});

async function start(extra: Partial<Config>) {
  const config: Config = {
    origin: "http://127.0.0.1",
    qualification: qualification(1),
    apiKey: "TEST_KEY_NOT_REAL",
    ...extra,
  };
  const app = createApp(config);
  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  servers.push(server);
  const root = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  config.origin = root;
  const response = await fetch(root + "/api/status");
  const status = await response.json();
  const send = () =>
    fetch(root + "/api/inference/v1/chat/completions", {
      method: "POST",
      headers: {
        Cookie: response.headers.get("set-cookie")!.split(";")[0],
        "X-PrivateAI-CSRF": status.csrf,
        "X-Tinfoil-Enclave-Url": "https://test.tinfoil.sh",
        "Ehbp-Encapsulated-Key": "a".repeat(64),
        "Content-Type": "application/octet-stream",
      },
      body: new Uint8Array(32).fill(9),
    });
  return { status, send };
}

it("refuses a request whose worst case would pass the approved spend, before any allowance or upstream call", async () => {
  // Worst case per request: (5000 + 500) / 1e6 = USD 0.0055; 0.995 already metered.
  const usage = ledger("0.995");
  const { send } = await start({ qualification: qualification(1), usage });
  usage.spend.mockClear(); // the status page checked spend too
  const response = await send();
  expect(response.status).toBe(429);
  expect((await response.json()).error).toContain("approved spending limit");
  expect(usage.spend).toHaveBeenCalledOnce();
  expect(usage.reserve).not.toHaveBeenCalled();
  expect(upstream).not.toHaveBeenCalled();
});

it("lets a request within the approved spend continue to the allowance check", async () => {
  const usage = ledger("0.5", 10);
  const { send } = await start({ qualification: qualification(1), usage });
  usage.spend.mockClear(); // the status page checked spend too
  const response = await send();
  // No signed-in account in this plain setup, so the allowance refuses; spend did not.
  expect(response.status).toBe(429);
  expect((await response.json()).error).toContain("No request allowance");
  expect(usage.spend).toHaveBeenCalledOnce();
  expect(upstream).not.toHaveBeenCalled();
});

it("refuses chat and reports paused while the operator stop switch is on", async () => {
  let stopped = true;
  const { status, send } = await start({ inferenceStopped: () => stopped });
  expect(status.inference).toMatchObject({ ready: false, reason: "Private chat is paused by the operator." });
  expect(status.inference.qualification).toBeUndefined();
  const refused = await send();
  expect(refused.status).toBe(503);
  expect((await refused.json()).error).toContain("paused by the operator");
  expect(upstream).not.toHaveBeenCalled();
  stopped = false;
  upstream.mockResolvedValue(
    new Response(new Uint8Array(16), { headers: { "Ehbp-Response-Nonce": "b".repeat(64) } }),
  );
  expect((await send()).status).toBe(200);
});

it("production candidate admits credentials only with the explicit setting and a spend-reporting ledger", () => {
  const base = {
    origin: productionAccountTarget.origin,
    consumer: { mode: "production-candidate" } as never,
    apiKey: "TEST_KEY_NOT_REAL",
    qualification: qualification(1),
  };
  expect(() => createApp(base)).toThrow("without upstream credentials");
  expect(() => createApp({ ...base, productionInference: true })).toThrow("without upstream credentials");
  const { spend: _omit, ...noSpend } = ledger("0");
  expect(() => createApp({ ...base, productionInference: true, usage: noSpend })).toThrow(
    "without upstream credentials",
  );
  // With both in place the guard no longer refuses (later setup needs a real consumer).
  let message = "";
  try {
    createApp({ ...base, productionInference: true, usage: ledger("0") });
  } catch (error) {
    message = (error as Error).message;
  }
  expect(message).not.toContain("without upstream credentials");
  // A search key is accepted only together with qualified production chat; Goggles never.
  const guarded = (extra: Partial<Config>) => {
    try {
      createApp({ ...base, productionInference: true, usage: ledger("0"), ...extra });
      return "";
    } catch (error) {
      return (error as Error).message;
    }
  };
  expect(guarded({ searchKey: "SYNTHETIC" })).not.toContain("without upstream credentials");
  expect(guarded({ searchKey: "SYNTHETIC", searchGoggles: true })).toContain("without upstream credentials");
});

it("reports chat as not ready while the approved spend is reached (T4 rehearsal finding)", async () => {
  const reached = await start({ qualification: qualification(1), usage: ledger("0.995") });
  expect(reached.status.inference).toMatchObject({
    ready: false,
    reason: "The approved spending limit for this provider review is reached.",
  });
  expect(reached.status.inference.qualification).toBeUndefined();
  const room = await start({ qualification: qualification(1), usage: ledger("0.5") });
  expect(room.status.inference.ready).toBe(true);
});
