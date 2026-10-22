import { afterEach, expect, it, vi } from "vitest";
import { createServer } from "node:http";
import { InviteRegistry } from "../server/invite-registry";
import { SqliteUsageLedger } from "../server/usage-ledger";
import { checks, validateQualification } from "../shared/contracts";
import { asUndiciRequestResult } from "./fixtures/undici-request";
const upstream = vi.hoisted(() => vi.fn());
vi.mock("undici", async (importOriginal) => ({
  ...(await importOriginal<typeof import("undici")>()),
  request: (url: unknown, options: unknown) =>
    Promise.resolve(upstream(url, options)).then(asUndiciRequestResult),
}));
import { createApp } from "../server/app";

afterEach(() => upstream.mockReset());

/**
 * Cost exposure from interrupted requests. The supplier bills output generated
 * up to the point a stream ended, including client disconnects, and its usage
 * records carry no client identifier. The relay therefore records such a
 * request as uncertain with no metering, the client reports cost unknown, and
 * the only bound is structural: one request in flight per account times the
 * qualified output limit at published rates.
 */
it("an interrupted stream settles as uncertain with no metering, and the documented exposure bound holds", async () => {
  const registry = new InviteRegistry(":memory:");
  const usage = new SqliteUsageLedger(":memory:");
  const finished: {
    accountId: string;
    requestId: string;
    outcome: string;
    metrics?: unknown;
  }[] = [];
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw Error("port");
  const origin = `http://127.0.0.1:${address.port}`;
  const qualification = validateQualification({
    provider: "tinfoil",
    model: "SYNTHETIC_ONLY",
    origin: "https://test.tinfoil.sh",
    repository: "tinfoilsh/test-only",
    releaseDigests: ["a".repeat(64)],
    reviewedAt: new Date(Date.now() - 1000).toISOString(),
    validUntil: new Date(Date.now() + 60000).toISOString(),
    review: Object.fromEntries(
      checks.map((key) => [
        key,
        {
          status: "pass",
          evidence: ["Synthetic fixture; not provider qualification"],
        },
      ]),
    ),
    maxInputCharacters: 5000,
    maxOutputTokens: 4096,
    pricing: { inputPerMillion: 0.15, outputPerMillion: 0.6, currency: "USD" },
    approvedSpendUSD: 1,
  });
  server.on(
    "request",
    createApp({
      origin,
      invites: registry,
      usage: {
        summary: (accountId) => usage.summary(accountId),
        reserve: (accountId, requestId) => usage.reserve(accountId, requestId),
        dispatch: (accountId, requestId) =>
          usage.dispatch(accountId, requestId),
        metrics: (accountId, requestId) => usage.metrics(accountId, requestId),
        finish: (accountId, requestId, outcome, metrics) => {
          finished.push({ accountId, requestId, outcome, metrics });
          return usage.finish(accountId, requestId, outcome, metrics);
        },
      },
      qualification,
      apiKey: "SYNTHETIC_NOT_REAL",
    }),
  );
  try {
    const invite = registry.issue(Date.now() + 60000);
    const registration = await fetch(origin + "/auth/register", {
      method: "POST",
      redirect: "manual",
      headers: {
        Origin: origin,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        id: invite.id,
        token: invite.token,
        password: "SYNTHETIC account password",
      }),
    });
    const cookie = registration.headers.get("set-cookie")!.split(";")[0];
    const status = await fetch(origin + "/api/status", {
      headers: { Cookie: cookie },
    });
    const headers = {
      Origin: origin,
      Cookie: cookie + "; " + status.headers.get("set-cookie")!.split(";")[0],
      "X-PrivateAI-CSRF": (await status.json()).csrf,
      "X-Tinfoil-Enclave-Url": qualification.origin,
      "Ehbp-Encapsulated-Key": "a".repeat(64),
      "Content-Type": "application/octet-stream",
    };
    usage.createAllowance({
      accountId: invite.id,
      periodId: "period",
      startsAt: Date.now() - 1000,
      endsAt: Date.now() + 60000,
      requestLimit: 5,
    });
    // Upstream streams one chunk, then stalls until the client goes away.
    let released!: () => void;
    const clientGone = new Promise<void>((resolve) => (released = resolve));
    upstream.mockImplementation(
      async (_url, options: { signal: AbortSignal }) =>
        new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(new Uint8Array(32).fill(7));
              options.signal.addEventListener(
                "abort",
                () => {
                  released();
                  controller.error(new Error("TEST client disconnected"));
                },
                { once: true },
              );
            },
          }),
          { headers: { "Ehbp-Response-Nonce": "b".repeat(64) } },
        ),
    );
    const abort = new AbortController();
    const response = await fetch(
      origin + "/api/inference/v1/chat/completions",
      {
        method: "POST",
        headers,
        body: new Uint8Array(32).fill(9),
        signal: abort.signal,
      },
    );
    const reader = response.body!.getReader();
    await reader.read();
    abort.abort();
    await clientGone;
    await reader.cancel().catch(() => {});
    await expect.poll(() => finished.length).toBe(1);
    expect(finished[0].outcome).toBe("uncertain");
    expect(finished[0].metrics).toBeUndefined();
    expect(
      usage.metrics(finished[0].accountId, finished[0].requestId),
    ).toBeUndefined();
    expect(usage.summary(invite.id)).toMatchObject({
      used: 1,
      pending: 0,
      uncertain: 1,
    });
    // Documented bound: one in-flight request per account × qualified output limit at published rates.
    const worstCaseUsd =
      (qualification.maxOutputTokens * qualification.pricing.outputPerMillion) /
      1_000_000;
    expect(worstCaseUsd).toBeCloseTo(0.0024576, 7);
    expect(worstCaseUsd).toBeLessThan(qualification.approvedSpendUSD);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    registry.close();
    usage.close();
  }
});
