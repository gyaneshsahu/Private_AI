import { afterEach, expect, it, vi } from "vitest";
import type { Server } from "node:http";
import { checks } from "../shared/contracts";
const upstream = vi.hoisted(() => vi.fn());
vi.mock("undici", async (importOriginal) => ({
  ...(await importOriginal<typeof import("undici")>()),
  fetch: upstream,
}));
import { createApp } from "../server/app";
const servers: Server[] = [];
afterEach(async () => {
  upstream.mockReset();
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
async function setup() {
  const qualification = {
    provider: "tinfoil",
    model: "TEST_ONLY",
    origin: "https://test.tinfoil.sh",
    repository: "tinfoilsh/test-only",
    releaseDigests: ["a".repeat(64)],
    reviewedAt: new Date(Date.now() - 1000).toISOString(),
    validUntil: new Date(Date.now() + 60000).toISOString(),
    review: Object.fromEntries(
      checks.map((key) => [
        key,
        { status: "pass", evidence: ["TEST ONLY not provider evidence"] },
      ]),
    ),
    maxInputCharacters: 5000,
    maxOutputTokens: 500,
    pricing: { inputPerMillion: 1, outputPerMillion: 1, currency: "USD" },
    approvedSpendUSD: 1,
  };
  const config = {
    origin: "http://127.0.0.1",
    qualification,
    apiKey: "TEST_KEY_NOT_REAL",
  };
  const app = createApp(config);
  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  servers.push(server);
  const address = server.address();
  if (!address || typeof address === "string") throw Error("No port");
  const root = `http://127.0.0.1:${address.port}`;
  config.origin = root;
  const response = await fetch(root + "/api/status");
  const status = await response.json();
  return {
    root,
    qualification,
    headers: {
      Cookie: response.headers.get("set-cookie")!.split(";")[0],
      "X-PrivateAI-CSRF": status.csrf,
      "X-Tinfoil-Enclave-Url": qualification.origin,
      "Ehbp-Encapsulated-Key": "a".repeat(64),
      "Content-Type": "application/octet-stream",
    },
  };
}
it("production relay finishes opaque bytes without aborting a completed upstream", async () => {
  let signal: AbortSignal | undefined;
  upstream.mockImplementation(async (_url, options) => {
    signal = options.signal;
    return new Response(new Uint8Array(64).fill(7), {
      headers: { "Ehbp-Response-Nonce": "b".repeat(64) },
    });
  });
  const { root, headers } = await setup();
  const response = await fetch(root + "/api/inference/v1/chat/completions", {
    method: "POST",
    headers,
    body: new Uint8Array(32).fill(9),
  });
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(new Uint8Array(await response.arrayBuffer())).toEqual(
    new Uint8Array(64).fill(7),
  );
  await new Promise<void>((resolve) => setImmediate(resolve));
  expect(signal?.aborted).toBe(false);
  expect(upstream).toHaveBeenCalledTimes(1);
});
it("production relay aborts a stalled upstream when the client disconnects", async () => {
  let released!: () => void;
  const cancelled = new Promise<void>((resolve) => (released = resolve));
  upstream.mockImplementation(
    async (_url, options) =>
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new Uint8Array(32).fill(7));
            options.signal.addEventListener(
              "abort",
              () => {
                released();
                controller.error(new Error("TEST cancelled"));
              },
              { once: true },
            );
          },
        }),
        { headers: { "Ehbp-Response-Nonce": "b".repeat(64) } },
      ),
  );
  const { root, headers } = await setup();
  const abort = new AbortController();
  const response = await fetch(root + "/api/inference/v1/chat/completions", {
    method: "POST",
    headers,
    body: new Uint8Array(32).fill(9),
    signal: abort.signal,
  });
  const reader = response.body!.getReader();
  await reader.read();
  abort.abort();
  await cancelled;
  await reader.cancel().catch(() => {});
  expect(upstream).toHaveBeenCalledTimes(1);
});
it("production relay rechecks qualification after startup and never forwards expired evidence", async () => {
  const { root, headers, qualification } = await setup();
  qualification.validUntil = new Date(Date.now() - 1).toISOString();
  const response = await fetch(root + "/api/inference/v1/chat/completions", {
    method: "POST",
    headers,
    body: new Uint8Array(32).fill(9),
  });
  expect(response.status).toBe(503);
  expect(upstream).not.toHaveBeenCalled();
  const status = await (
    await fetch(root + "/api/status", { headers: { Cookie: headers.Cookie } })
  ).json();
  expect(status.inference.ready).toBe(false);
});
