// Privacy-safe analytics (docs/analytics-20261125.md): what the owner's dashboard shows. Counts
// only. No message, title, file name, search text, address or device detail is ever part of it.
import { z } from "zod";

/** Things the browser may count, by fixed name. One request per use, with nothing but the name. */
export const USE_EVENTS = [
  "canvas.opened",
  "whiteboard.opened",
  "project.created",
  "memory.saved",
  "scheduled.created",
  "voice-conversation.started",
  "read-aloud.used",
  "pdf-export.used",
] as const;
export type UseEvent = (typeof USE_EVENTS)[number];
export const useEventRequest = z.object({ name: z.enum(USE_EVENTS) }).strict();

/** One calendar day (UTC) of the dashboard. */
export interface AnalyticsDay {
  day: string; // YYYY-MM-DD
  /** Accounts with at least one request that day. */
  active: number;
  /** Of those, accounts that were also active on an earlier day of the window. */
  returning: number;
  /** Requests by kind (shared/usage-config.ts FEATURES), all outcomes. */
  requests: Record<string, number>;
  /** List-price euros before VAT for what the price list covers; `unpriced` requests are not in it. */
  costEUR: number;
  unpriced: number;
  /** Day totals of the server's fixed-name counters and of USE_EVENTS (as "use.<name>"). */
  counters: Record<string, number>;
}
export interface AnalyticsView {
  from: string;
  to: string;
  retentionDays: number;
  /** False when usage records are off: the people and cost columns are then empty, only counters show. */
  records: boolean;
  /** Distinct accounts active in the last 7 days, and in the 7 days before. */
  weeklyActive: number;
  weeklyActiveBefore: number;
  /** Accounts active in both of those weeks. */
  weeklyReturning: number;
  days: AnalyticsDay[];
}

/** Counter names that mean something failed, and names that mean a limit was reached. */
export const isErrorCounter = (name: string) => /(?:^|\.)(?:failed|upstream_unavailable|upstream_rejected|status_5\d\d|not_permitted)$/.test(name) || /\.failed$/.test(name);
export const isLimitCounter = (name: string) => /refused_(?:allowance|daily|spend|account_busy|instance_busy)|busy_|no_credit/.test(name);
