// Privacy-safe analytics for the owner (docs/analytics-20261125.md): off unless configured.
// Two sources, both content-free:
// 1. The usage records the app already keeps (one row per request: account, kind, model, token
//    counts, no content). Active and returning accounts, requests by kind and cost are computed
//    from them when the dashboard is opened; nothing new about a person is stored.
// 2. The server's fixed-name counters (errors, limits reached, feature use): their day totals go
//    into one small table with no account in it, kept for `retentionDays`.
// Nothing goes to a third party. Only an address on the owner list can read it.
import express, { Router, type Response } from "express";
import type { Pool } from "pg";
import { useEventRequest, type AnalyticsDay, type AnalyticsView } from "../shared/analytics";
import { chatEuros, pricesAt } from "../shared/usage-config";
import { count, takeAnalyticsCounts } from "./counters";
import type { UsageRecord, UsageRecords } from "./usage-records";

const DAY = 86_400_000;
export const dayOf = (at: number) => new Date(at).toISOString().slice(0, 10);

export interface AnalyticsStore {
  /** Adds to the day's totals. */
  add(day: string, totals: Record<string, number>): Promise<void>;
  /** Totals per day from `fromDay` on. */
  read(fromDay: string): Promise<Record<string, Record<string, number>>>;
  /** Deletes every day before `beforeDay`. */
  prune(beforeDay: string): Promise<void>;
}

/** For the development server and tests: in this process's memory. */
export class MemoryAnalyticsStore implements AnalyticsStore {
  private days = new Map<string, Map<string, number>>();
  async add(day: string, totals: Record<string, number>) {
    const row = this.days.get(day) ?? new Map<string, number>();
    for (const [name, value] of Object.entries(totals)) row.set(name, (row.get(name) ?? 0) + value);
    this.days.set(day, row);
  }
  async read(fromDay: string) {
    return Object.fromEntries([...this.days].filter(([day]) => day >= fromDay).map(([day, row]) => [day, Object.fromEntries(row)]));
  }
  async prune(beforeDay: string) {
    for (const day of this.days.keys()) if (day < beforeDay) this.days.delete(day);
  }
}

/** Migration 0028: one row per day and counter name. */
export class PostgresAnalyticsStore implements AnalyticsStore {
  constructor(private database: Pool) {}
  async add(day: string, totals: Record<string, number>) {
    const names = Object.keys(totals);
    if (!names.length) return;
    await this.database.query(
      `INSERT INTO analytics_daily(day, name, value)
       SELECT $1::date, n, v FROM unnest($2::text[], $3::bigint[]) AS t(n, v)
       ON CONFLICT (day, name) DO UPDATE SET value = analytics_daily.value + EXCLUDED.value`,
      [day, names, names.map((name) => totals[name])],
    );
  }
  async read(fromDay: string) {
    const { rows } = await this.database.query("SELECT to_char(day, 'YYYY-MM-DD') AS day, name, value FROM analytics_daily WHERE day >= $1::date", [fromDay]);
    const out: Record<string, Record<string, number>> = {};
    for (const row of rows) (out[row.day as string] ??= {})[row.name as string] = Number(row.value);
    return out;
  }
  async prune(beforeDay: string) {
    await this.database.query("DELETE FROM analytics_daily WHERE day < $1::date", [beforeDay]);
  }
}

/** List-price euros of one record, or undefined when the price list has no price for it. */
export function recordEuros(record: UsageRecord): number | undefined {
  const prices = pricesAt(record.createdAt);
  const price = record.model ? prices.models[record.model] : undefined;
  if (record.feature === "image-create") return record.outcome === "complete" ? price?.perImage : 0;
  if (record.feature === "voice") return price?.perAudioMinute === undefined || record.audioSeconds === undefined ? undefined : (record.audioSeconds / 60) * price.perAudioMinute;
  // Searches and page reads cost nothing at the model provider; the search provider bills them apart.
  if (record.feature === "search" || record.feature === "page-fetch") return 0;
  if (!record.model || record.promptTokens === undefined || record.completionTokens === undefined) return undefined;
  return chatEuros(prices, record.model, record.promptTokens, record.completionTokens, record.cachedTokens);
}

/** The dashboard's numbers from usage records and counter totals. Pure: the same input gives the same view. */
export function summarize(o: {
  records: readonly UsageRecord[] | undefined;
  counters: Record<string, Record<string, number>>;
  now: number;
  days: number;
  retentionDays: number;
}): AnalyticsView {
  const today = dayOf(o.now);
  const list = Array.from({ length: o.days }, (_, i) => dayOf(o.now - (o.days - 1 - i) * DAY));
  const byDay = new Map<string, UsageRecord[]>(list.map((day) => [day, []]));
  for (const record of o.records ?? []) byDay.get(dayOf(record.createdAt))?.push(record);
  const seen = new Set<string>();
  const days: AnalyticsDay[] = list.map((day) => {
    const records = byDay.get(day)!;
    const accounts = new Set(records.map((r) => r.accountId));
    const returning = [...accounts].filter((id) => seen.has(id)).length;
    for (const id of accounts) seen.add(id);
    const requests: Record<string, number> = {};
    let costEUR = 0;
    let unpriced = 0;
    for (const record of records) {
      requests[record.feature] = (requests[record.feature] ?? 0) + 1;
      const euros = recordEuros(record);
      if (euros === undefined) unpriced++;
      else costEUR += euros;
    }
    return { day, active: accounts.size, returning, requests, costEUR: Math.round(costEUR * 10_000) / 10_000, unpriced, counters: o.counters[day] ?? {} };
  });
  const week = (start: number, end: number) => new Set((o.records ?? []).filter((r) => r.createdAt >= start && r.createdAt < end).map((r) => r.accountId));
  const edge = Date.parse(`${today}T00:00:00Z`) + DAY; // the end of today, so "the last 7 days" are whole days
  const last = week(edge - 7 * DAY, edge);
  const before = week(edge - 14 * DAY, edge - 7 * DAY);
  return {
    from: list[0],
    to: today,
    retentionDays: o.retentionDays,
    records: !!o.records,
    weeklyActive: last.size,
    weeklyActiveBefore: before.size,
    weeklyReturning: [...last].filter((id) => before.has(id)).length,
    days,
  };
}

export interface AnalyticsSettings {
  store: AnalyticsStore;
  /** Lowercased addresses that may open the dashboard. */
  ownerEmails: readonly string[];
  retentionDays: number;
}
export const isOwner = (settings: AnalyticsSettings | undefined, email: unknown) =>
  !!settings && typeof email === "string" && settings.ownerEmails.includes(email.toLowerCase());

/** Moves the counters gathered since the last call into today's totals and drops days past retention. */
export async function flushAnalytics(settings: AnalyticsSettings, now = Date.now()) {
  const totals = takeAnalyticsCounts();
  if (Object.keys(totals).length) await settings.store.add(dayOf(now), totals);
  await settings.store.prune(dayOf(now - settings.retentionDays * DAY));
}

/** Every `everyMs` (10 minutes): flush. Returns the stop function. A failed flush loses at most that period's counts. */
export function scheduleAnalytics(settings: AnalyticsSettings, everyMs = 600_000): () => void {
  const timer = setInterval(() => void flushAnalytics(settings).catch(() => count("analytics.flush_failed")), everyMs);
  timer.unref();
  return () => clearInterval(timer);
}

export function analyticsRoutes(o: {
  settings: AnalyticsSettings;
  records?: UsageRecords;
  account(res: Response): string | undefined;
  email(res: Response): string | undefined;
  clock?: () => number;
}) {
  const clock = o.clock ?? Date.now;
  const router = Router();
  // The owner's dashboard. Anyone else gets "not found": the address tells nothing about itself.
  router.get("/api/owner/analytics", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    if (!isOwner(o.settings, o.email(res))) return void res.status(404).json({ error: "Unsupported operation." });
    const now = clock();
    const days = Math.min(Math.max(Number(req.query.days) || 30, 1), o.settings.retentionDays);
    try {
      await flushAnalytics(o.settings, now);
      const from = Date.parse(`${dayOf(now - (Math.max(days, 14) - 1) * DAY)}T00:00:00Z`);
      const [records, counters] = await Promise.all([o.records?.between(from, now + 1), o.settings.store.read(dayOf(now - (days - 1) * DAY))]);
      res.json(summarize({ records, counters, now, days, retentionDays: o.settings.retentionDays }));
    } catch {
      res.status(503).json({ error: "unavailable" });
    }
  });
  // One use of a feature, by fixed name. Counted without the account; the body holds nothing else.
  router.post("/api/analytics/event", express.json({ limit: "1kb" }), (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    if (!o.account(res)) return void res.status(401).json({ error: "signin" });
    const parsed = useEventRequest.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ error: "invalid" });
    count(`use.${parsed.data.name}`);
    res.status(204).end();
  });
  return router;
}
