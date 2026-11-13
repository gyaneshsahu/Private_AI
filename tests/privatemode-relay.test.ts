// Privatemode through the one admission path (Stage 3, plan points 1, 2 and 6). The browser
// SDK calls three paths at the site root; the app maps them under /api/inference, so session,
// CSRF, invite gate, request limits, stop switch and, for chat, allowance, spend guard and one
// request per account apply exactly as for Tinfoil. Upstream is a test double. Synthetic only.
import { afterEach, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer, get as httpGet, type Server } from "node:http";
import { asUndiciRequestResult } from "./fixtures/undici-request";
const upstream = vi.hoisted(() => vi.fn());
vi.mock("undici", async (importOriginal) => ({
  ...(await importOriginal<typeof import("undici")>()),
  request: (url: unknown, options: unknown) =>
    Promise.resolve(upstream(url, options)).then(asUndiciRequestResult),
}));
import { createApp, expiryWarnings, type Config } from "../server/app";
import { takeCounts } from "../server/counters";
import { InviteRegistry } from "../server/invite-registry";
import { SqliteUsageLedger } from "../server/usage-ledger";
import { privatemodeKeyExpiryWarning } from "../server/providers/privatemode-relay";
import { PRIVATEMODE_WASM_SHA256 } from "../src/providers/privatemode-client";
import { fakeManifest, privatemodeReport } from "./fixtures/privatemode-report";

const servers: Server[] = [];
afterEach(async () => {
  upstream.mockReset();
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
const ok = (body = "ciphertext-reply") =>
  new Response(body, {
    headers: {
      "content-type": "text/event-stream",
      "privatemode-oae-response-header": "nonce",
      "set-cookie": "upstream=1",
    },
  });
const ROOT_PATHS = ["/v1/chat/completions", "/privatemode/v1/attest", "/privatemode/v1/secret"];

async function listen(extra: Partial<Config> = {}) {
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
const post = (
  root: string,
  path: string,
  headers: Record<string, string>,
  body: BodyInit = new Uint8Array(32).fill(7),
) => fetch(root + path, { method: "POST", headers: { Origin: root, ...headers }, body });
const chatHeaders = (cookie: string, csrf: string, model = "glm-5.3-flash", mode?: string) => ({
  Cookie: cookie,
  "X-PrivateAI-CSRF": csrf,
  authorization: "Bearer relay-injects-the-key",
  "privatemode-target-model": model,
  "privatemode-client": "SDK",
  "Content-Type": "application/json",
  ...(mode ? { "X-PrivateAI-Mode": mode } : {}),
});
async function signedIn(extra: Partial<Config> = {}) {
  const registry = new InviteRegistry(":memory:");
  const usage = new SqliteUsageLedger(":memory:");
  const root = await listen({ invites: registry, usage, ...extra });
  const signIn = async () => {
    const invite = registry.issue(Date.now() + 60000);
    const registration = await fetch(root + "/auth/register", {
      method: "POST",
      redirect: "manual",
      headers: { Origin: root, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ id: invite.id, token: invite.token, password: "SYNTHETIC account password" }),
    });
    return { accountId: invite.id, cookie: registration.headers.get("set-cookie")!.split(";")[0] };
  };
  return { root, usage, signIn };
}

it("refuses every root path without a session or without the CSRF token, forwarding nothing", async () => {
  const root = await listen();
  for (const path of ROOT_PATHS) expect((await post(root, path, {})).status, path).toBe(401);
  const { cookie } = await session(root);
  for (const path of ROOT_PATHS) expect((await post(root, path, { Cookie: cookie })).status, path).toBe(403);
  expect(upstream).not.toHaveBeenCalled();
});

it("invite gate: without a signed-in account the root paths are refused before any session", async () => {
  const { root } = await signedIn();
  for (const path of ROOT_PATHS) {
    const refused = await post(root, path, {});
    expect([302, 303, 401, 403], path).toContain(refused.status);
  }
  expect(upstream).not.toHaveBeenCalled();
});

it("forwards chat, attestation and key exchange with the real key and routing headers only", async () => {
  upstream.mockImplementation(async () => ok());
  const root = await listen();
  const { status, cookie } = await session(root);
  const chat = await post(root, "/v1/chat/completions", chatHeaders(cookie, status.csrf));
  expect(chat.status).toBe(200);
  expect(await chat.text()).toBe("ciphertext-reply");
  expect(chat.headers.get("privatemode-oae-response-header")).toBe("nonce");
  expect(chat.headers.get("set-cookie")).toBeNull();
  for (const path of ["/privatemode/v1/attest", "/privatemode/v1/secret"])
    expect((await post(root, path, chatHeaders(cookie, status.csrf))).status, path).toBe(200);
  expect(upstream.mock.calls.map(([url]) => String(url))).toEqual([
    "https://api.privatemode.ai/v1/chat/completions",
    "https://api.privatemode.ai/privatemode/v1/attest",
    "https://api.privatemode.ai/privatemode/v1/secret",
  ]);
  for (const [, options] of upstream.mock.calls) {
    const headers = Object.fromEntries(
      Object.entries(options.headers as Record<string, string>).map(([k, v]) => [k.toLowerCase(), v]),
    );
    expect(headers.authorization).toBe("Bearer TEST_KEY_NOT_REAL");
    expect(headers["privatemode-target-model"]).toBe("glm-5.3-flash");
    for (const dropped of ["cookie", "x-privateai-csrf", "x-privateai-mode", "origin"])
      expect(headers[dropped], dropped).toBeUndefined();
  }
});

it("admits only the report's exact models; a family alias or another model is refused", async () => {
  upstream.mockImplementation(async () => ok());
  const root = await listen();
  const { status, cookie } = await session(root);
  for (const model of ["glm-latest", "glm-flash-latest", "gpt-oss-120b", ""])
    expect((await post(root, "/v1/chat/completions", chatHeaders(cookie, status.csrf, model))).status, model).toBe(400);
  // Another tier's model is admitted only in its own mode.
  expect((await post(root, "/v1/chat/completions", chatHeaders(cookie, status.csrf, "glm-5.3", "fast"))).status).toBe(400);
  expect(upstream).not.toHaveBeenCalled();
});

it("stop switch: refuses chat, attestation, key exchange and the manifest, and reports paused", async () => {
  let stopped = true;
  upstream.mockImplementation(async () => ok());
  const root = await listen({ inferenceStopped: () => stopped });
  const { status, cookie } = await session(root);
  expect(status.inference).toMatchObject({ ready: false, reason: "Private chat is paused by the operator." });
  expect(status.inference.cacheSalt).toBeUndefined();
  for (const path of ROOT_PATHS) {
    const refused = await post(root, path, chatHeaders(cookie, status.csrf));
    expect(refused.status, path).toBe(503);
    expect((await refused.json()).error).toContain("paused by the operator");
  }
  expect((await fetch(root + "/api/inference/privatemode/manifest", { headers: { Cookie: cookie } })).status).toBe(503);
  expect(upstream).not.toHaveBeenCalled();
  stopped = false;
  expect((await post(root, "/v1/chat/completions", chatHeaders(cookie, status.csrf))).status).toBe(200);
});

it("spend guard: refuses Privatemode chat before allowance or upstream, counting every request at worst case", async () => {
  const usage = {
    // Privatemode never meters: every forwarded request is unmetered. Worst case here is
    // (5000 + 4096) / 1e6 = USD 0.009096 each (largest tier); after 110 of them nothing fits in USD 1.
    spend: vi.fn(async () => ({ meteredUSD: "0", unmetered: 110 })),
    summary: vi.fn(),
    reserve: vi.fn(async () => true),
    dispatch: vi.fn(),
    metrics: vi.fn(),
    finish: vi.fn(),
  };
  const root = await listen({ usage });
  const { status, cookie } = await session(root);
  expect(status.inference).toMatchObject({ ready: false });
  const refused = await post(root, "/v1/chat/completions", chatHeaders(cookie, status.csrf));
  expect(refused.status).toBe(429);
  expect((await refused.json()).error).toContain("approved spending limit");
  expect(usage.reserve).not.toHaveBeenCalled();
  expect(upstream).not.toHaveBeenCalled();
});

it("allowance and one request per account apply to Privatemode chat; usage settles unmetered", async () => {
  let release!: () => void;
  upstream.mockImplementation(
    async () =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("data: first\n\n"));
            release = () => controller.close();
          },
        }),
        { headers: { "content-type": "text/event-stream" } },
      ),
  );
  const { root, usage, signIn } = await signedIn();
  const account = await signIn();
  const { status, cookie } = await session(root, account.cookie);
  // No allowance yet: refused before upstream.
  const none = await post(root, "/v1/chat/completions", chatHeaders(cookie, status.csrf));
  expect(none.status).toBe(429);
  expect((await none.json()).error).toContain("No request allowance");
  expect(upstream).not.toHaveBeenCalled();
  usage.createAllowance({
    accountId: account.accountId,
    periodId: "synthetic-period",
    startsAt: Date.now() - 1000,
    endsAt: Date.now() + 60000,
    requestLimit: 2,
  });
  const first = await post(root, "/v1/chat/completions", chatHeaders(cookie, status.csrf));
  expect(first.status).toBe(200);
  const reader = first.body!.getReader();
  await reader.read();
  // The first reply is still streaming: a second request on the same account is refused.
  const second = await post(root, "/v1/chat/completions", chatHeaders(cookie, status.csrf));
  expect(second.status).toBe(429);
  expect((await second.json()).error).toContain("already running for this account");
  release();
  while (!(await reader.read()).done);
  await vi.waitFor(() =>
    expect(usage.summary(account.accountId)).toMatchObject({
      used: 1,
      pending: 0,
      meteredRequests: 0,
      unmeteredRequests: 1,
    }),
  );
  // Thinking costs 3 units: refused with 1 left.
  const thinking = await post(root, "/v1/chat/completions", chatHeaders(cookie, status.csrf, "glm-5.3", "thinking"));
  expect(thinking.status).toBe(429);
  expect((await thinking.json()).error).toContain("this mode counts as 3 requests");
  expect(upstream).toHaveBeenCalledTimes(1);
  usage.close();
});

it("an owner-set automatic allowance: a signed-in invitee can chat at once, is capped, and gets a new period after it ends", async () => {
  upstream.mockImplementation(async () => ok());
  const { root, usage, signIn } = await signedIn({ autoAllowance: { requestLimit: 2, days: 4 / 86_400 } }); // a 4-second period
  const account = await signIn();
  const { status, cookie } = await session(root, account.cookie);
  expect(status.requestAllowance).toMatchObject({ state: "active", limit: 2, used: 0 });
  for (let i = 0; i < 2; i++) {
    const chat = await post(root, "/v1/chat/completions", chatHeaders(cookie, status.csrf));
    expect(chat.status).toBe(200);
    await chat.text();
  }
  await vi.waitFor(() => expect(usage.summary(account.accountId)).toMatchObject({ used: 2, pending: 0 }));
  const capped = await post(root, "/v1/chat/completions", chatHeaders(cookie, status.csrf));
  expect(capped.status).toBe(429);
  expect(upstream).toHaveBeenCalledTimes(2);
  // Once the period has ended, a new one starts with the next request.
  await vi.waitFor(
    async () => {
      const renewed = await post(root, "/v1/chat/completions", chatHeaders(cookie, status.csrf));
      expect(renewed.status).toBe(200);
      await renewed.text();
    },
    { timeout: 8000, interval: 500 },
  );
  usage.close();
});

it("counts outcomes per mode and refusals by class, with fixed names and nothing that identifies anyone", async () => {
  upstream.mockImplementation(async () => ok());
  const { root, usage, signIn } = await signedIn({ autoAllowance: { requestLimit: 1, days: 7 } });
  const account = await signIn();
  const { status, cookie } = await session(root, account.cookie);
  takeCounts();
  const first = await post(root, "/v1/chat/completions", chatHeaders(cookie, status.csrf, "glm-5.3-flash", "fast"));
  await first.text();
  await vi.waitFor(() => expect(usage.summary(account.accountId)).toMatchObject({ pending: 0 }));
  await (await post(root, "/v1/chat/completions", chatHeaders(cookie, status.csrf, "glm-5.3-flash", "fast"))).text();
  await vi.waitFor(() => expect(takeCounts()).toEqual({ "chat.fast.completed": 1, "chat.fast.refused_allowance": 1 }));
  // Taking the counts resets them.
  expect(takeCounts()).toEqual({});
  usage.close();
});

it("without an automatic allowance nothing is created: an invitee without one is refused", async () => {
  const { root, usage, signIn } = await signedIn();
  const account = await signIn();
  const { status, cookie } = await session(root, account.cookie);
  expect(status.requestAllowance).toEqual({ state: "unavailable" });
  expect((await post(root, "/v1/chat/completions", chatHeaders(cookie, status.csrf))).status).toBe(429);
  expect(upstream).not.toHaveBeenCalled();
  usage.close();
});

it("a browser that hangs up frees its account slot at once, so the automatic retry is not refused", async () => {
  // The upstream reply never ends and ignores the abort, like a slow provider still settling.
  upstream.mockImplementation(
    async () =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("data: first\n\n"));
          },
        }),
        { headers: { "content-type": "text/event-stream" } },
      ),
  );
  const { root, usage, signIn } = await signedIn();
  const account = await signIn();
  const { status, cookie } = await session(root, account.cookie);
  usage.createAllowance({
    accountId: account.accountId,
    periodId: "synthetic-period",
    startsAt: Date.now() - 1000,
    endsAt: Date.now() + 60000,
    requestLimit: 5,
  });
  const hangUp = new AbortController();
  const first = await fetch(root + "/v1/chat/completions", {
    method: "POST",
    headers: { Origin: root, ...chatHeaders(cookie, status.csrf) },
    body: new Uint8Array(32).fill(7),
    signal: hangUp.signal,
  });
  await first.body!.getReader().read();
  hangUp.abort();
  await vi.waitFor(async () => {
    const retry = await post(root, "/v1/chat/completions", chatHeaders(cookie, status.csrf));
    expect(retry.status).toBe(200);
    await retry.body?.cancel();
  });
  usage.close();
});

it("a Privatemode failure stays at Privatemode: classified for the same-provider backup, never sent to Tinfoil", async () => {
  upstream
    .mockImplementationOnce(async () => new Response("model not found", { status: 404 }))
    .mockImplementationOnce(async () => new Response("overloaded", { status: 503 }))
    .mockImplementationOnce(async () => {
      throw Error("connection reset");
    });
  const root = await listen();
  const { status, cookie } = await session(root);
  const rejected = await post(root, "/v1/chat/completions", chatHeaders(cookie, status.csrf, "glm-5.3", "thinking"));
  expect(rejected.status).toBe(502);
  expect(rejected.headers.get("x-privateai-upstream")).toBe("rejected");
  expect(await rejected.text()).not.toContain("model not found");
  // The client's one retry uses the mode's backup at the same provider.
  const backup = await post(root, "/v1/chat/completions", chatHeaders(cookie, status.csrf, "glm-5.3-flash", "thinking"));
  expect(backup.status).toBe(502);
  expect(backup.headers.get("x-privateai-upstream")).toBe("unavailable");
  const broken = await post(root, "/v1/chat/completions", chatHeaders(cookie, status.csrf, "glm-5.3-flash", "thinking"));
  expect(broken.status).toBe(502);
  expect(upstream).toHaveBeenCalledTimes(3);
  for (const [url] of upstream.mock.calls) expect(new URL(url).origin).toBe("https://api.privatemode.ai");
});

it("serves the approved manifest only, and the pinned Wasm at its hash-named path with a one-year immutable cache", async () => {
  const root = await listen();
  const { cookie } = await session(root);
  const manifest = await fetch(root + "/api/inference/privatemode/manifest", { headers: { Cookie: cookie } });
  expect(manifest.status).toBe(200);
  expect(manifest.headers.get("cache-control")).toBe("no-store");
  expect(new Uint8Array(await manifest.arrayBuffer())).toEqual(fakeManifest);
  const wasm = await fetch(root + `/api/inference/privatemode/privatemode-${PRIVATEMODE_WASM_SHA256}.wasm`, {
    headers: { Cookie: cookie },
  });
  expect(wasm.status).toBe(200);
  expect(wasm.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
  expect(wasm.headers.get("content-type")).toBe("application/wasm");
  // Whatever encoding was used, the decoded bytes the SDK hashes are the pinned file.
  const decoded = Buffer.from(await wasm.arrayBuffer());
  expect(createHash("sha256").update(decoded).digest("hex")).toBe(PRIVATEMODE_WASM_SHA256);
  // On the wire it is about 5 MB instead of 29 MB; a client without Brotli gets the plain file.
  const wire = (encoding: string) =>
    new Promise<{ length: number; encoding?: string }>((done, fail) =>
      httpGet(
        `${root}/api/inference/privatemode/privatemode-${PRIVATEMODE_WASM_SHA256}.wasm`,
        { headers: { Cookie: cookie, "Accept-Encoding": encoding } },
        (res) => {
          let length = 0;
          res.on("data", (chunk: Buffer) => (length += chunk.length));
          res.on("end", () => done({ length, encoding: res.headers["content-encoding"] }));
        },
      ).on("error", fail),
    );
  const brotli = await wire("br");
  expect(brotli.encoding).toBe("br");
  expect(brotli.length).toBeLessThan(decoded.length / 3);
  expect(await wire("identity")).toEqual({ length: decoded.length, encoding: undefined });
  // Any other name is refused, and nothing else is cacheable.
  const other = await fetch(root + `/api/inference/privatemode/privatemode-${"0".repeat(64)}.wasm`, {
    headers: { Cookie: cookie },
  });
  expect(other.status).toBe(404);
  expect(other.headers.get("cache-control")).toBe("no-store");
  // A manifest the report does not approve is never served.
  const unapproved = await listen({ providerManifest: new TextEncoder().encode("{}") });
  const s = await session(unapproved);
  expect(
    (await fetch(unapproved + "/api/inference/privatemode/manifest", { headers: { Cookie: s.cookie } })).status,
  ).toBe(503);
});

it("keeps connect-src same-origin: no Privatemode host in the content security policy", async () => {
  const root = await listen();
  const csp = (await fetch(root + "/api/status")).headers.get("content-security-policy") ?? "";
  expect(csp).toContain("connect-src 'self';");
  expect(csp).not.toContain("privatemode");
});

it("with a Tinfoil report, the root paths and Privatemode endpoints are not served", async () => {
  upstream.mockImplementation(async () => ok());
  const { privatemode: _drop, ...rest } = privatemodeReport();
  const tinfoil = {
    ...rest,
    provider: "tinfoil",
    origin: "https://test.tinfoil.sh/",
    repository: "tinfoilsh/test-only",
  };
  const root = await listen({ qualification: tinfoil });
  const { status, cookie } = await session(root);
  expect(status.inference.ready).toBe(true);
  for (const path of ROOT_PATHS)
    expect((await post(root, path, chatHeaders(cookie, status.csrf))).status, path).not.toBe(200);
  expect((await post(root, "/api/inference/privatemode/v1/attest", chatHeaders(cookie, status.csrf))).status).not.toBe(200);
  expect(upstream).not.toHaveBeenCalled();
});

it("gives each account its own stable prompt-cache salt; two accounts never share one", async () => {
  const { root, signIn } = await signedIn({ cacheSaltSecret: "SYNTHETIC cache salt secret for tests" });
  const alice = await signIn();
  const bob = await signIn();
  const a1 = (await session(root, alice.cookie)).status.inference.cacheSalt;
  const a2 = (await session(root, alice.cookie)).status.inference.cacheSalt; // a new session, same account
  const b1 = (await session(root, bob.cookie)).status.inference.cacheSalt;
  expect(a1).toMatch(/^[a-f0-9]{64}$/);
  expect(a2).toBe(a1);
  expect(b1).toMatch(/^[a-f0-9]{64}$/);
  expect(b1).not.toBe(a1);
  // Without accounts (local use), each browser session has its own.
  const root2 = await listen();
  const s1 = (await session(root2)).status.inference.cacheSalt;
  const s2 = (await session(root2)).status.inference.cacheSalt;
  expect(s1).toMatch(/^[a-f0-9]{64}$/);
  expect(s2).not.toBe(s1);
});

it("survives a client that disconnects mid-reply on attestation and keeps serving (parity run finding)", async () => {
  upstream.mockImplementation(
    async () =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("first"));
            setTimeout(() => {
              try {
                controller.close();
              } catch {
                /* already cancelled by the relay */
              }
            }, 1500);
          },
        }),
      ),
  );
  const root = await listen();
  const { status, cookie } = await session(root);
  const controller = new AbortController();
  const reply = await fetch(root + "/privatemode/v1/attest", {
    method: "POST",
    headers: { Origin: root, ...chatHeaders(cookie, status.csrf) },
    body: "opaque",
    signal: controller.signal,
  });
  await reply.body!.getReader().read();
  controller.abort();
  await new Promise((r) => setTimeout(r, 2000));
  expect((await post(root, "/privatemode/v1/secret", chatHeaders(cookie, status.csrf))).status).toBe(200);
});

it("attestation goes through one queue: a full queue answers 503 attestation_busy at once, while key exchange and chat are never queued", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  // Attest calls hang upstream, so the burst is used up and the queue fills.
  upstream.mockImplementation(async (url: URL) =>
    String(url).endsWith("/attest") ? new Promise<Response>(() => {}) : ok(),
  );
  const root = await listen();
  const { status, cookie } = await session(root);
  // 14 different browser sessions, one attest call each (one session alone is capped first).
  const others = await Promise.all(Array.from({ length: 14 }, () => session(root)));
  const controller = new AbortController();
  const answered: Response[] = [];
  for (const other of others)
    void fetch(root + "/privatemode/v1/attest", {
      method: "POST",
      headers: { Origin: root, ...chatHeaders(other.cookie, other.status.csrf) },
      body: new Uint8Array(32).fill(7),
      signal: controller.signal,
    }).then((r) => answered.push(r), () => {});
  // 6 sent at once, 1 or 2 waiting; the rest cannot be sent within 20 s and are refused at once.
  await vi.waitFor(() => expect(answered.length).toBeGreaterThanOrEqual(2), { timeout: 3000 });
  expect(upstream.mock.calls.filter(([url]) => String(url).endsWith("/attest"))).toHaveLength(6);
  for (const refused of answered) {
    expect(refused.status).toBe(503);
    expect(await refused.json()).toEqual({
      error: "CometRow is busy checking the secure server. Please try again in a minute.",
      reason: "attestation_busy",
    });
  }
  const started = Date.now();
  expect((await post(root, "/privatemode/v1/secret", chatHeaders(cookie, status.csrf))).status).toBe(200);
  expect((await post(root, "/v1/chat/completions", chatHeaders(cookie, status.csrf))).status).toBe(200);
  expect(Date.now() - started).toBeLessThan(1000);
  expect(upstream.mock.calls.filter(([url]) => String(url).endsWith("/attest"))).toHaveLength(6);
  // The log line carries counts only.
  expect(warn.mock.calls.flat().filter((line) => String(line).startsWith("Privatemode attestation")).join(" ")).toMatch(/^Privatemode attestation queue: \{"sent":6,"waited":[12],"waitedMs":0,"limited429":0,"busy":\d+,"perMinute":6,"lastPauseMs":0\}/);
  expect(warn.mock.calls.flat().join(" ")).not.toMatch(/csrf|cookie|Bearer|TEST_KEY/i);
  controller.abort();
  warn.mockRestore();
});

it("one session cannot fill the shared attestation queue: 2 calls at once, 10 per 10 minutes", async () => {
  let release: (() => void)[] = [];
  upstream.mockImplementation(async (url: URL) =>
    String(url).endsWith("/attest") ? new Promise<Response>((done) => release.push(() => done(ok()))) : ok(),
  );
  const root = await listen();
  const mine = await session(root);
  const theirs = await session(root);
  const attest = (who: typeof mine) => post(root, "/privatemode/v1/attest", chatHeaders(who.cookie, who.status.csrf));
  const running = [attest(mine), attest(mine)];
  await vi.waitFor(() => expect(release).toHaveLength(2));
  const third = await attest(mine);
  expect(third.status).toBe(503);
  expect((await third.json()).reason).toBe("attestation_busy");
  // Another user is not affected.
  const other = attest(theirs);
  await vi.waitFor(() => expect(release).toHaveLength(3));
  for (const done of release.splice(0)) done();
  for (const reply of [...(await Promise.all(running)), await other]) expect(reply.status).toBe(200);
  // 2 used; 8 more pass a minute apart (so the shared queue has refilled), the 11th within
  // 10 minutes is refused (the window itself is a plain time filter; a later clock would expire the test report).
  upstream.mockImplementation(async () => ok());
  let clock = Date.now();
  const now = vi.spyOn(Date, "now").mockImplementation(() => clock);
  for (let i = 0; i < 8; i++) {
    clock += 61_000;
    expect((await attest(mine)).status).toBe(200);
  }
  expect((await attest(mine)).status).toBe(503);
  expect((await attest(theirs)).status).toBe(200);
  now.mockRestore();
  expect((await post(root, "/privatemode/v1/secret", chatHeaders(mine.cookie, mine.status.csrf))).status).toBe(200);
});

it("shows the operator's notice file to everyone as plain text, and nothing when it is missing or empty", async () => {
  const dir = await mkdtemp(join(tmpdir(), "privateai-notice-"));
  const noticeFile = join(dir, "notice.txt");
  try {
    const missing = await listen({ noticeFile });
    expect((await session(missing)).status.operatorNotice).toBeUndefined();
    await writeFile(noticeFile, "  Chat moves to our backup provider on 20 November.\u0007\n<b>x</b>  ");
    const shown = await listen({ noticeFile });
    expect((await session(shown)).status.operatorNotice).toBe("Chat moves to our backup provider on 20 November. <b>x</b>");
    await writeFile(noticeFile, "\n");
    expect((await session(await listen({ noticeFile }))).status.operatorNotice).toBeUndefined();
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

it("warns the operator 48 hours before the provider review ends, and once it has ended", () => {
  const now = Date.parse("2026-11-12T00:00:00Z");
  const report = (hours: number) => ({ validUntil: new Date(now + hours * 3_600_000).toISOString() });
  expect(expiryWarnings(report(49), now)).toEqual([]);
  expect(expiryWarnings(report(47), now)[0]).toContain("(in 47 hours)");
  expect(expiryWarnings(report(-1), now)[0]).toContain("Chat is refused for everyone");
  expect(expiryWarnings(undefined, now)).toEqual([]);
  // The key's own expiry is reported alongside.
  const both = { ...report(10), privatemode: { portalKeyLimit: { expiresAt: new Date(now + 3 * 86400000).toISOString() } } };
  expect(expiryWarnings(both, now)).toHaveLength(2);
});

it("warns ahead of the dedicated key's recorded expiry", () => {
  const now = Date.parse("2026-11-12T00:00:00Z");
  const at = (days: number) =>
    ({
      privatemode: { portalKeyLimit: { expiresAt: new Date(now + days * 86400000).toISOString() } },
    }) as never;
  expect(privatemodeKeyExpiryWarning(at(30), now)).toBeUndefined();
  expect(privatemodeKeyExpiryWarning(at(10), now)).toContain("in 10 days");
  expect(privatemodeKeyExpiryWarning(at(-1), now)).toContain("expired");
  expect(privatemodeKeyExpiryWarning(undefined, now)).toBeUndefined();
});
