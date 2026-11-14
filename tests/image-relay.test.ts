// Image questions at the relay (docs/images-20261114.md): off unless switched on; a declared image
// request gets the larger body bound and pays the image price and one of the day's images; an
// undeclared large body is refused. Upstream is a test double: no image, no key, no provider call.
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
import { readFileSync } from "node:fs";
import { imageDayCount } from "../server/image-admission";
import { BASELINE_FILE, modelAlerts } from "../server/model-watch";
import { InviteRegistry } from "../server/invite-registry";
import { BRIDGE_REQUEST_HEADERS } from "../server/render-bridge";
import { SqliteUsageLedger } from "../server/usage-ledger";
import { qualifiedModels, validateQualification, watchedModels } from "../shared/contracts";
import {
  BRIDGE_BODY_LIMIT,
  IMAGE_KIND_HEADER,
  imageBodyAllowance,
  imageDataUrlLength,
  imageRequestLimit,
} from "../shared/images";
import { fakeManifest, privatemodeReport } from "./fixtures/privatemode-report";

const PATH = "/v1/chat/completions";
const VISION = { model: "glm-5.3-flash", allowanceCost: 3 };
const IMAGES = { maxBytes: 60_000, dailyImages: 2 };
// The fixture report allows 5,000 characters: the text bound is the 65,536-byte floor.
const TEXT_LIMIT = 65_536;
const IMAGE_LIMIT = TEXT_LIMIT + imageBodyAllowance(IMAGES.maxBytes);
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
const answer = () =>
  new Response("ciphertext-answer", { headers: { "content-type": "text/event-stream" } });

async function listen(extra: Partial<Config> = {}) {
  const server = createServer();
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const root = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  server.on(
    "request",
    createApp({
      origin: root,
      qualification: privatemodeReport({ vision: VISION }),
      apiKey: "TEST_KEY_NOT_REAL",
      providerManifest: fakeManifest,
      images: IMAGES,
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
const headers = (
  cookie: string,
  csrf: string,
  { image = true, mode = "fast", model = VISION.model }: { image?: boolean; mode?: string; model?: string } = {},
) => ({
  Cookie: cookie,
  "X-PrivateAI-CSRF": csrf,
  "X-PrivateAI-Mode": mode,
  ...(image ? { "X-PrivateAI-Kind": "image" } : {}),
  "privatemode-target-model": model,
  "Content-Type": "application/json",
});
const post = (root: string, h: Record<string, string>, size = 4096) =>
  fetch(root + PATH, { method: "POST", headers: { Origin: root, ...h }, body: new Uint8Array(size).fill(7) });
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

it("the arithmetic of the caps: the image bound fits the bridge's 1 MiB limit at the default and at the largest setting", () => {
  expect(imageDataUrlLength(280_000)).toBe(373_359);
  expect(imageBodyAllowance(280_000)).toBe(747_742);
  // Text bound at 32,000 characters is 256,000 bytes.
  expect(imageRequestLimit(256_000, 280_000)).toBe(1_003_742);
  expect(256_000 + imageBodyAllowance(290_000)).toBe(1_030_406);
  expect(256_000 + imageBodyAllowance(290_000)).toBeLessThanOrEqual(BRIDGE_BODY_LIMIT);
  // A report with a larger text bound never lifts the image bound above the bridge's limit.
  expect(imageRequestLimit(900_000, 290_000)).toBe(BRIDGE_BODY_LIMIT);
  expect(BRIDGE_REQUEST_HEADERS as readonly string[]).toContain(IMAGE_KIND_HEADER);
});

it("is off by default: no status field, and a declared image request is refused, without the switch or without a vision model in the report", async () => {
  for (const extra of [{ images: undefined }, { qualification: privatemodeReport() }]) {
    const root = await listen(extra);
    const { status, cookie } = await session(root);
    expect(status.images).toBeUndefined();
    expect((await post(root, headers(cookie, status.csrf))).status).toBe(400);
    // Ordinary chat is untouched by the switch.
    upstream.mockImplementationOnce(async () => answer());
    expect((await post(root, headers(cookie, status.csrf, { image: false }))).status).toBe(200);
  }
  expect(upstream).toHaveBeenCalledTimes(2);
  expect(takeCounts()).toMatchObject({ "image.refused_off": 2 });
});

it("a declared image request gets the larger bound; the same body without the declaration is refused; one byte over the image bound is refused", async () => {
  upstream.mockImplementation(async () => answer());
  const root = await listen();
  const { status, cookie } = await session(root);
  expect(status.images).toEqual({ maxBytes: IMAGES.maxBytes });
  expect(status.inference.qualification.vision).toEqual(VISION);
  const undeclared = await post(root, headers(cookie, status.csrf, { image: false }), TEXT_LIMIT + 1);
  expect(undeclared.status).toBe(413);
  expect(upstream).not.toHaveBeenCalled();
  const declared = await post(root, headers(cookie, status.csrf), IMAGE_LIMIT);
  expect(declared.status).toBe(200);
  expect(await declared.text()).toBe("ciphertext-answer");
  // The declaration is ours: it is not passed on to the provider.
  expect(Object.keys(upstream.mock.calls[0][1].headers).join()).not.toContain("privateai");
  const over = await post(root, headers(cookie, status.csrf), IMAGE_LIMIT + 1);
  expect(over.status).toBe(413);
  expect(upstream).toHaveBeenCalledTimes(1);
  await vi.waitFor(() =>
    expect(takeCounts()).toMatchObject({ "image.completed": 1, "image.refused_size": 1, "chat.fast.completed": 1 }),
  );
});

it("an image question runs only on the vision model in the Fast mode; any other declaration is refused", async () => {
  const root = await listen();
  const { status, cookie } = await session(root);
  for (const h of [
    headers(cookie, status.csrf, { mode: "thinking", model: "glm-5.3" }),
    // Thinking's backup is the Fast model, but the mode is still Thinking.
    headers(cookie, status.csrf, { mode: "thinking" }),
    { ...headers(cookie, status.csrf), "X-PrivateAI-Kind": "video" },
  ])
    expect((await post(root, h)).status).toBe(400);
  expect(upstream).not.toHaveBeenCalled();
});

it("charges the image price, not the mode's text price, and bounds image questions per day by count", async () => {
  upstream.mockImplementation(async () => answer());
  const { root, usage, accountId, status, cookie, settled } = await signedIn({ autoAllowance: { requestLimit: 50, days: 7 } });
  // A Fast text message costs 1 unit.
  await (await post(root, headers(cookie, status.csrf, { image: false }))).text();
  await settled();
  expect(usage.summary(accountId)).toMatchObject({ used: 1 });
  for (let i = 1; i <= 2; i++) {
    const reply = await post(root, headers(cookie, status.csrf), IMAGE_LIMIT);
    expect(reply.status).toBe(200);
    await reply.text();
    await settled();
    expect(usage.summary(accountId)).toMatchObject({ used: 1 + 3 * i });
  }
  const third = await post(root, headers(cookie, status.csrf));
  expect(third.status).toBe(429);
  expect((await third.json()).error).toContain("daily picture limit");
  expect(usage.summary(accountId)).toMatchObject({ used: 7 });
  // Text chat still works after the day's images are used.
  expect((await post(root, headers(cookie, status.csrf, { image: false }))).status).toBe(200);
  expect(upstream).toHaveBeenCalledTimes(4);
  await vi.waitFor(() => expect(takeCounts()).toMatchObject({ "image.completed": 2, "image.refused_image_daily": 1 }));
});

it("refuses without enough allowance and at the daily unit cap, and such a refusal does not use up one of the day's images", async () => {
  upstream.mockImplementation(async () => answer());
  // Two units left in the period: a text message fits, an image question (3 units) does not.
  const tight = await signedIn({ autoAllowance: { requestLimit: 2, days: 7 } });
  for (let i = 0; i < 3; i++) {
    const refused = await post(tight.root, headers(tight.cookie, tight.status.csrf));
    expect(refused.status).toBe(429);
    expect((await refused.json()).error).toBe(
      "Not enough request allowance: a picture question counts as 3 requests. No request was forwarded.",
    );
  }
  expect(upstream).not.toHaveBeenCalled();
  // Daily cap of 4 units: one image question (3) fits, a second would make 6.
  const capped = await signedIn({ autoAllowance: { requestLimit: 50, days: 7, dailyLimit: 4 } });
  const first = await post(capped.root, headers(capped.cookie, capped.status.csrf));
  expect(first.status).toBe(200);
  await first.text();
  await capped.settled();
  const second = await post(capped.root, headers(capped.cookie, capped.status.csrf));
  expect(second.status).toBe(429);
  expect((await second.json()).error).toContain("daily request limit");
  expect(takeCounts()).toMatchObject({ "image.refused_allowance": 3, "image.refused_daily": 1 });
});

it("a text message's retry credit never pays for an image question, and a provider refusal gives the day's image back", async () => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  const { root, usage, accountId, status, cookie, settled } = await signedIn({ autoAllowance: { requestLimit: 50, days: 7 } });
  upstream.mockImplementationOnce(async () => new Response("secret upstream detail", { status: 500 }));
  upstream.mockImplementation(async () => answer());
  // A refused Fast text message (1 unit) leaves a retry credit for Fast text only.
  expect((await post(root, headers(cookie, status.csrf, { image: false }))).status).toBe(502);
  await settled();
  const image = await post(root, headers(cookie, status.csrf));
  expect(image.status).toBe(200);
  await image.text();
  await settled();
  expect(usage.summary(accountId)).toMatchObject({ used: 4 });
  // A refused image question: its retry within a minute is not charged or counted again.
  upstream.mockImplementationOnce(async () => new Response("secret upstream detail", { status: 500 }));
  const refused = await post(root, headers(cookie, status.csrf));
  expect(refused.status).toBe(502);
  expect(await refused.text()).not.toContain("secret upstream detail");
  await settled();
  const again = await post(root, headers(cookie, status.csrf));
  expect(again.status).toBe(200);
  await again.text();
  await settled();
  expect(usage.summary(accountId)).toMatchObject({ used: 7 });
  // Two images answered: the day's two are used, the refused one was given back.
  expect((await post(root, headers(cookie, status.csrf))).status).toBe(429);
});

it("the stop switch refuses image questions and the status hides the upload", async () => {
  const root = await listen({ inferenceStopped: () => true });
  const { status, cookie } = await session(root);
  expect(status.images).toBeUndefined();
  expect((await post(root, headers(cookie, status.csrf))).status).toBe(503);
  expect(upstream).not.toHaveBeenCalled();
});

it("the day count is a rolling 24 hours per account", () => {
  const day = imageDayCount(2);
  expect(day.take("a", 0)).toBe(true);
  expect(day.take("a", 1000)).toBe(true);
  expect(day.take("a", 2000)).toBe(false);
  expect(day.take("b", 2000)).toBe(true);
  expect(day.take("a", 86_400_000)).toBe(true);
  day.giveBack("a");
  expect(day.take("a", 86_400_001)).toBe(true);
  expect(day.take("a", 86_400_002)).toBe(false);
});

it("the report names the vision model: it must be the Fast mode's model, already admitted and already watched", () => {
  const report = validateQualification(privatemodeReport({ vision: VISION }));
  expect(qualifiedModels(report).has(VISION.model)).toBe(true);
  expect(watchedModels(report).has(VISION.model)).toBe(true);
  for (const vision of [
    { model: "glm-5.3", allowanceCost: 3 }, // the Thinking model has no vision
    { model: "deepseek-ocr-2", allowanceCost: 3 }, // not a model the report admits
    { model: VISION.model, allowanceCost: 0 },
    { ...VISION, extra: 1 },
  ])
    expect(() => validateQualification(privatemodeReport({ vision }))).toThrow();
  // Never cheaper than a Fast text message.
  const fast = { model: "glm-5.3-flash", glmReasoningEffort: "low", maxOutputTokens: 1024, allowanceCost: 2 };
  const modes = { ...privatemodeReport().modes, fast };
  expect(() => validateQualification(privatemodeReport({ modes, vision: { ...VISION, allowanceCost: 1 } }))).toThrow();
  expect(() => validateQualification(privatemodeReport({ modes, vision: VISION }))).not.toThrow();
});

it("the daily model check alerts when the vision model loses its vision task in Privatemode's list", () => {
  const baseline = JSON.parse(readFileSync(BASELINE_FILE, "utf8"));
  expect(baseline.models[VISION.model].tasks).toContain("vision");
  const entry = baseline.models[VISION.model];
  expect(modelAlerts({ data: [entry] }, [VISION.model], baseline)).toEqual([]);
  const blind = { ...entry, tasks: entry.tasks.filter((task: string) => task !== "vision") };
  const alerts = modelAlerts({ data: [blind] }, [VISION.model], baseline);
  expect(alerts).toHaveLength(1);
  expect(alerts[0]).toContain(VISION.model);
});