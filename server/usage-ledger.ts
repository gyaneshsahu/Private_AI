import { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import type { RequestAllowance } from "../shared/contracts";
import {
  usageId as id,
  usageAllowanceSchema as allowance,
  type UsageLedger,
} from "./usage-contract";
import { usageMetricsSchema, type UsageMetrics } from "./usage-metrics";
import { sumDecimalStrings } from "./usage-cost";
export type { UsageLedger } from "./usage-contract";

/** Durable request counts, not token billing or proof of completed answers. */
export class SqliteUsageLedger implements UsageLedger {
  private db: DatabaseSync;
  constructor(
    path: string,
    private now = Date.now,
  ) {
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA busy_timeout=5000;
      PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS usage_allowances (
        account_id TEXT NOT NULL, period_id TEXT PRIMARY KEY,
        starts_at INTEGER NOT NULL, ends_at INTEGER NOT NULL,
        request_limit INTEGER NOT NULL CHECK(request_limit>0),
        CHECK(ends_at>starts_at)
      );
      CREATE INDEX IF NOT EXISTS usage_account_period ON usage_allowances(account_id,starts_at,ends_at);
      CREATE TABLE IF NOT EXISTS usage_requests (
        request_id TEXT PRIMARY KEY, account_id TEXT NOT NULL,
        period_id TEXT NOT NULL REFERENCES usage_allowances(period_id),
        state TEXT NOT NULL CHECK(state IN ('reserved','dispatched','transport_complete','uncertain')),
        created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS usage_period_requests ON usage_requests(period_id);
      CREATE TABLE IF NOT EXISTS usage_metrics (
        request_id TEXT PRIMARY KEY REFERENCES usage_requests(request_id),
        prompt_tokens INTEGER NOT NULL CHECK(prompt_tokens>=0),
        completion_tokens INTEGER NOT NULL CHECK(completion_tokens>=0),
        model TEXT NOT NULL, cost_usd TEXT, web_search_calls INTEGER,
        recorded_at INTEGER NOT NULL
      );`);
  }
  private transaction<T>(run: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = run();
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  /** Operator/service provisioning only; no HTTP grant or client-controlled limit. */
  createAllowance(input: z.input<typeof allowance>): void {
    const value = allowance.parse(input);
    if (value.endsAt <= value.startsAt)
      throw Error("Invalid allowance period.");
    this.transaction(() => {
      if (
        this.db
          .prepare(
            "SELECT 1 FROM usage_allowances WHERE account_id=? AND starts_at<? AND ends_at>?",
          )
          .get(value.accountId, value.endsAt, value.startsAt)
      )
        throw Error("Overlapping allowance period.");
      this.db
        .prepare("INSERT INTO usage_allowances VALUES(?,?,?,?,?)")
        .run(
          value.accountId,
          value.periodId,
          value.startsAt,
          value.endsAt,
          value.requestLimit,
        );
    });
  }
  /** True when an allowance with this period ID exists, whatever its account or dates. */
  hasAllowance(periodId: string): boolean {
    id.parse(periodId);
    return !!this.db
      .prepare("SELECT 1 FROM usage_allowances WHERE period_id=?")
      .get(periodId);
  }
  summary(accountId: string): RequestAllowance {
    id.parse(accountId);
    const now = this.now();
    const row = this.db
      .prepare(
        `SELECT a.period_id, a.request_limit, a.ends_at,
      COUNT(r.request_id) AS used,
      COALESCE(SUM(CASE WHEN r.state IN ('reserved','dispatched') THEN 1 ELSE 0 END),0) AS pending,
      COALESCE(SUM(CASE WHEN r.state='uncertain' THEN 1 ELSE 0 END),0) AS uncertain,
      COUNT(m.request_id) AS metered,
      COALESCE(SUM(m.prompt_tokens),0) AS prompt_tokens,
      COALESCE(SUM(m.completion_tokens),0) AS completion_tokens,
      COALESCE(SUM(CASE WHEN r.state IN ('transport_complete','uncertain') AND m.request_id IS NULL THEN 1 ELSE 0 END),0) AS unmetered
      FROM usage_allowances a LEFT JOIN usage_requests r ON a.period_id=r.period_id
      LEFT JOIN usage_metrics m ON m.request_id=r.request_id
      WHERE a.account_id=? AND a.starts_at<=? AND a.ends_at>?
      GROUP BY a.period_id`,
      )
      .get(accountId, now, now);
    if (!row) return { state: "unavailable" };
    // Costs are TEXT decimals; summed exactly here rather than as SQLite floats.
    const costs = this.db
      .prepare(
        `SELECT m.cost_usd FROM usage_metrics m JOIN usage_requests r ON r.request_id=m.request_id
      WHERE r.period_id=? AND m.cost_usd IS NOT NULL`,
      )
      .all(String(row.period_id))
      .map((cost) => String(cost.cost_usd));
    const used = Number(row.used),
      limit = Number(row.request_limit);
    return {
      state: used < limit ? "active" : "exhausted",
      limit,
      used,
      remaining: Math.max(0, limit - used),
      pending: Number(row.pending),
      uncertain: Number(row.uncertain),
      resetsAt: new Date(Number(row.ends_at)).toISOString(),
      meteredRequests: Number(row.metered),
      promptTokens: Number(row.prompt_tokens),
      completionTokens: Number(row.completion_tokens),
      ...(costs.length ? { costUsd: sumDecimalStrings(costs) } : {}),
      unmeteredRequests: Number(row.unmetered),
    };
  }
  reserve(accountId: string, requestId: string): boolean {
    id.parse(accountId);
    id.parse(requestId);
    return this.transaction(() => {
      // Replayed IDs never authorize a second forwarding, even across accounts.
      if (
        this.db
          .prepare("SELECT 1 FROM usage_requests WHERE request_id=?")
          .get(requestId)
      )
        return false;
      const now = this.now();
      const row = this.db
        .prepare(
          `SELECT a.period_id FROM usage_allowances a
        WHERE account_id=? AND starts_at<=? AND ends_at>?
        AND (SELECT COUNT(*) FROM usage_requests r WHERE r.period_id=a.period_id)<a.request_limit`,
        )
        .get(accountId, now, now);
      if (!row) return false;
      this.db
        .prepare("INSERT INTO usage_requests VALUES(?,?,?,'reserved',?,?)")
        .run(requestId, accountId, String(row.period_id), now, now);
      return true;
    });
  }
  dispatch(accountId: string, requestId: string): void {
    id.parse(accountId);
    id.parse(requestId);
    if (
      this.db
        .prepare(
          "UPDATE usage_requests SET state='dispatched',updated_at=? WHERE account_id=? AND request_id=? AND state='reserved'",
        )
        .run(this.now(), accountId, requestId).changes !== 1
    )
      throw Error("Request was not reserved for dispatch.");
  }
  finish(
    accountId: string,
    requestId: string,
    outcome: "transport_complete" | "uncertain",
    metrics?: UsageMetrics,
  ): void {
    id.parse(accountId);
    id.parse(requestId);
    z.enum(["transport_complete", "uncertain"]).parse(outcome);
    const metered =
      outcome === "transport_complete" && metrics
        ? usageMetricsSchema.parse(metrics)
        : undefined;
    this.transaction(() => {
      const row = this.db
        .prepare(
          "SELECT state FROM usage_requests WHERE account_id=? AND request_id=?",
        )
        .get(accountId, requestId);
      if (row?.state === outcome) return;
      if (row?.state !== "dispatched") throw Error("Invalid usage settlement.");
      const now = this.now();
      this.db
        .prepare(
          "UPDATE usage_requests SET state=?,updated_at=? WHERE account_id=? AND request_id=?",
        )
        .run(outcome, now, accountId, requestId);
      if (metered)
        this.db
          .prepare("INSERT OR IGNORE INTO usage_metrics VALUES(?,?,?,?,?,?,?)")
          .run(
            requestId,
            metered.promptTokens,
            metered.completionTokens,
            metered.model,
            metered.costUsd ?? null,
            metered.webSearchCalls ?? null,
            now,
          );
    });
  }
  /** Completed-request metering for one request, or undefined when none was recorded. */
  metrics(requestId: string): UsageMetrics | undefined {
    id.parse(requestId);
    const row = this.db
      .prepare(
        "SELECT prompt_tokens,completion_tokens,model,cost_usd,web_search_calls FROM usage_metrics WHERE request_id=?",
      )
      .get(requestId);
    return row
      ? {
          promptTokens: Number(row.prompt_tokens),
          completionTokens: Number(row.completion_tokens),
          model: String(row.model),
          ...(row.cost_usd != null ? { costUsd: String(row.cost_usd) } : {}),
          ...(row.web_search_calls != null
            ? { webSearchCalls: Number(row.web_search_calls) }
            : {}),
        }
      : undefined;
  }
  close() {
    this.db.close();
  }
}
