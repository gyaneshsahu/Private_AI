// Privacy-safe analytics (docs/analytics-20261125.md), the server side: the dashboard's numbers
// from usage records and counter totals (pure), cost from the price list, the switch, the owner
// list, the event route's fixed names, the flush with retention, and what a view may contain.
import { createServer } from "node:http";
import { afterEach, expect, it } from "vitest";
import { createApp } from "../server/app";
import { dayOf, flushAnalytics, MemoryAnalyticsStore, recordEuros, summarize, type AnalyticsSettings } from "../server/analytics";
import { count, takeAnalyticsCounts, takeCounts } from "../server/counters";
import { SqliteUsageRecords, type UsageRecord } from "../server/usage-records";
import { isErrorCounter, isLimitCounter, USE_EVENTS } from "../shared/analytics";

const servers: { close(): void }[] = [];
afterEach(() => {
  servers.splice(0).forEach((s) => s.close());
  takeAnalyticsCounts();
  takeCounts();
});
const DAY = 86_400_000;
const NOW = Date.parse("2026-11-25T15:00:00Z");
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
let n = 0;
const record = (accountId: string, daysAgo: number, change: Partial<UsageRecord> = {}): UsageRecord => ({
  requestId: `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`,
  accountId,
  feature: "chat-fast",
  units: 1,
  weightVersion: 2,
  outcome: "complete",
  model: "glm-5.3-flash",
  promptTokens: 1_000_000,
  completionTokens: 1_000_000,
  createdAt: NOW - daysAgo * DAY,
  report: "accepted",
  ...change,
});

it("active and returning accounts, requests by kind and cost per day; weekly numbers", () => {
  const records = [
    record(A, 0),
    record(A, 0, { feature: "chat-thinking", model: "glm-5.3" }),
    record(B, 0, { feature: "image-create", model: "flux-2-klein", promptTokens: undefined, completionTokens: undefined }),
    record(A, 1),
    record(C, 1, { model: "unknown-model" }),
    record(C, 9),
    record(B, 10),
  ];
  const view = summarize({ records, counters: { [dayOf(NOW)]: { "search.failed": 2 } }, now: NOW, days: 3, retentionDays: 90 });
  expect(view).toMatchObject({ from: "2026-11-23", to: "2026-11-25", records: true, retentionDays: 90 });
  expect(view.days.map((d) => d.day)).toEqual(["2026-11-23", "2026-11-24", "2026-11-25"]);
  const [, yesterday, today] = view.days;
  expect(yesterday).toMatchObject({ active: 2, returning: 0, requests: { "chat-fast": 2 }, unpriced: 1 });
  // Today: A was here yesterday (returning), B was not within these three days.
  expect(today).toMatchObject({ active: 2, returning: 1, requests: { "chat-fast": 1, "chat-thinking": 1, "image-create": 1 }, unpriced: 0, counters: { "search.failed": 2 } });
  // List prices: flash 0.20 + 0.65, glm-5.3 1.55 + 5.74, one klein image 0.014.
  expect(today.costEUR).toBeCloseTo(0.85 + 7.29 + 0.014, 4);
  expect(yesterday.costEUR).toBeCloseTo(0.85, 4);
  // The last 7 days: A, B, C. The 7 before: C and B. Both weeks: B and C.
  expect(view).toMatchObject({ weeklyActive: 3, weeklyActiveBefore: 2, weeklyReturning: 2 });
  // A view holds no account id and no request id.
  expect(JSON.stringify(view)).not.toMatch(/1111|2222|3333|0000-4000/);
  // Without usage records only the counters show.
  const bare = summarize({ records: undefined, counters: {}, now: NOW, days: 2, retentionDays: 30 });
  expect(bare).toMatchObject({ records: false, weeklyActive: 0 });
  expect(bare.days).toEqual([
    { day: "2026-11-24", active: 0, returning: 0, requests: {}, costEUR: 0, unpriced: 0, counters: {} },
    { day: "2026-11-25", active: 0, returning: 0, requests: {}, costEUR: 0, unpriced: 0, counters: {} },
  ]);
});

it("cost of one record: chat by tokens, an image by the piece, voice by the minute, unknown stays unknown", () => {
  expect(recordEuros(record(A, 0))).toBeCloseTo(0.85, 6);
  expect(recordEuros(record(A, 0, { cachedTokens: 1_000_000 }))).toBeCloseTo(0.05 + 0.65, 6);
  expect(recordEuros(record(A, 0, { feature: "image-create", model: "flux-2-pro" }))).toBe(0.028);
  expect(recordEuros(record(A, 0, { feature: "image-create", model: "flux-2-pro", outcome: "refused" }))).toBe(0);
  expect(recordEuros(record(A, 0, { feature: "voice", model: "whisper-large-v3", audioSeconds: 120 }))).toBeCloseTo(0.028, 6);
  expect(recordEuros(record(A, 0, { feature: "search", model: undefined }))).toBe(0);
  expect(recordEuros(record(A, 0, { model: "unknown-model" }))).toBeUndefined();
  expect(recordEuros(record(A, 0, { promptTokens: undefined }))).toBeUndefined();
});

it("counters reach the day totals once, the hourly log still sees them, and old days are deleted", async () => {
  const settings: AnalyticsSettings = { store: new MemoryAnalyticsStore(), ownerEmails: ["owner@example.test"], retentionDays: 7 };
  count("search.failed");
  count("search.failed");
  count("use.canvas.opened");
  await flushAnalytics(settings, NOW);
  await flushAnalytics(settings, NOW); // nothing new: nothing added twice
  expect(await settings.store.read("2026-11-01")).toEqual({ "2026-11-25": { "search.failed": 2, "use.canvas.opened": 1 } });
  expect(takeCounts()).toEqual({ "search.failed": 2, "use.canvas.opened": 1 });
  count("search.failed");
  await flushAnalytics(settings, NOW + DAY);
  // Eight days on, the first day is past the 7 days kept.
  await flushAnalytics(settings, NOW + 8 * DAY);
  expect(Object.keys(await settings.store.read("2026-01-01"))).toEqual(["2026-11-26"]);
  expect(isErrorCounter("search.failed")).toBe(true);
  expect(isErrorCounter("chat.fast.upstream_unavailable")).toBe(true);
  expect(isErrorCounter("chat.fast.completed")).toBe(false);
  expect(isLimitCounter("chat.thinking.refused_allowance")).toBe(true);
  expect(isLimitCounter("search.refused_daily")).toBe(true);
  expect(isLimitCounter("search.executed")).toBe(false);
});

async function start(analytics?: AnalyticsSettings) {
  const records = new SqliteUsageRecords(":memory:");
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw Error("port");
  const origin = `http://127.0.0.1:${address.port}`;
  server.on("request", createApp({ origin, dev: true, metering: { plan: "alpha", records }, ...(analytics ? { analytics: { ...analytics, start: false } } : {}) }));
  servers.push(server);
  const first = await fetch(`${origin}/api/status`);
  const cookie = first.headers.get("set-cookie")!.split(";")[0];
  const status = (await first.json()) as { csrf: string; analytics?: true; ownerDashboard?: true };
  const get = (path: string) => fetch(origin + path, { headers: { cookie } });
  const post = (path: string, body: unknown, csrf = status.csrf) =>
    fetch(origin + path, { method: "POST", headers: { cookie, "content-type": "application/json", "x-privateai-csrf": csrf }, body: JSON.stringify(body) });
  return { status, get, post, records };
}

it("the switch and the owner list: off by default; only an owner sees the dashboard, anyone else gets not found", async () => {
  const off = await start();
  expect(off.status.analytics).toBeUndefined();
  expect(off.status.ownerDashboard).toBeUndefined();
  expect((await off.get("/api/owner/analytics")).status).toBe(404);
  expect((await off.post("/api/analytics/event", { name: "canvas.opened" })).status).toBe(404);
  // On, but this account (the development server's stand-in address) is not on the list.
  const other = await start({ store: new MemoryAnalyticsStore(), ownerEmails: ["owner@example.test"], retentionDays: 30 });
  expect(other.status).toMatchObject({ analytics: true });
  expect(other.status.ownerDashboard).toBeUndefined();
  const refused = await other.get("/api/owner/analytics");
  expect(refused.status).toBe(404);
  expect(await refused.json()).toEqual({ error: "Unsupported operation." });
  // On the list.
  const owner = await start({ store: new MemoryAnalyticsStore(), ownerEmails: ["local@development.test"], retentionDays: 30 });
  expect(owner.status).toMatchObject({ analytics: true, ownerDashboard: true });
  await owner.records.record({ requestId: "00000000-0000-4000-8000-00000000aaaa", accountId: A, feature: "chat-fast", units: 1, weightVersion: 2, outcome: "complete", model: "glm-5.3-flash" });
  // Feature use: fixed names only, counted without the account.
  for (const name of USE_EVENTS) expect((await owner.post("/api/analytics/event", { name })).status, name).toBe(204);
  for (const bad of [{ name: "anything.else" }, { name: "canvas.opened", text: "x" }, {}]) expect((await owner.post("/api/analytics/event", bad)).status).toBe(400);
  expect((await owner.post("/api/analytics/event", { name: "canvas.opened" }, "wrong")).status).toBe(403);
  const reply = await owner.get("/api/owner/analytics?days=7");
  expect(reply.status).toBe(200);
  expect(reply.headers.get("cache-control")).toBe("no-store");
  const view = (await reply.json()) as { days: { active: number; requests: Record<string, number>; counters: Record<string, number> }[]; retentionDays: number; weeklyActive: number };
  expect(view.days).toHaveLength(7);
  expect(view.days.at(-1)).toMatchObject({ active: 1, requests: { "chat-fast": 1 }, counters: { "use.canvas.opened": 1, "use.project.created": 1 } });
  expect(view).toMatchObject({ retentionDays: 30, weeklyActive: 1 });
  // Never more days than are kept.
  expect(((await (await owner.get("/api/owner/analytics?days=999")).json()) as { days: unknown[] }).days).toHaveLength(30);
});
