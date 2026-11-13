import type { Pool, PoolClient } from "pg";
import type { z } from "zod";
import type { RequestAllowance } from "../shared/contracts";
import {
  usageId,
  usageAllowanceSchema,
  usageOutcome,
  usageUnits,
  unitRowIds,
  NOT_UNIT_ROW,
  type UsageLedger,
} from "./usage-contract";
import { usageMetricsSchema, type UsageMetrics } from "./usage-metrics";
import { normalizeDecimalString } from "./usage-cost";

/** Shared request counts only. Injected pool/migrations; never auto-activated. */
/**
 * Operator SQL (schema owner, listed in accountPrivilegePlan), like the purge function: the runtime
 * role may only read allowances, so the owner-set automatic allowance is started through this
 * function. It fixes the bounds (1 to 31 days, 1 to 10,000 requests), reads the database clock and
 * starts a period only when the account has none now or later. Not a migration (older releases).
 */
export function autoAllowanceFunctionSql(schema: string): string {
  return `CREATE OR REPLACE FUNCTION ${schema}.start_auto_allowance(p_account text, p_days integer, p_limit integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = ${schema}, pg_temp AS $fn$
DECLARE
  now_ms bigint := (extract(epoch FROM clock_timestamp()) * 1000)::bigint;
BEGIN
  IF p_account IS NULL OR p_account !~ '^[A-Za-z0-9_-]{1,80}$' OR p_days NOT BETWEEN 1 AND 31 OR p_limit NOT BETWEEN 1 AND 10000 THEN
    RAISE EXCEPTION 'invalid automatic allowance';
  END IF;
  INSERT INTO usage_accounts VALUES (p_account) ON CONFLICT DO NOTHING;
  PERFORM 1 FROM usage_accounts WHERE account_id = p_account FOR UPDATE;
  IF EXISTS (SELECT 1 FROM usage_allowances WHERE account_id = p_account AND ends_at > now_ms) THEN
    RETURN false;
  END IF;
  INSERT INTO usage_allowances VALUES (p_account, 'auto-' || p_account || '-' || now_ms, now_ms, now_ms + p_days::bigint * 86400000, p_limit);
  RETURN true;
END
$fn$`;
}

export class PostgresUsageLedger implements UsageLedger {
  constructor(
    private database: Pool,
    private syntheticClock?: () => number,
  ) {}

  private async now(client: Pick<PoolClient, "query">): Promise<number> {
    return this.syntheticClock
      ? this.syntheticClock()
      : Number(
          (
            await client.query(
              "SELECT floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint AS now",
            )
          ).rows[0].now,
        );
  }
  private async transaction<T>(
    run: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.database.connect();
    try {
      await client.query("BEGIN");
      const result = await run(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  async createAllowance(
    input: z.input<typeof usageAllowanceSchema>,
  ): Promise<void> {
    const value = usageAllowanceSchema.parse(input);
    await this.transaction(async (client) => {
      await client.query(
        "INSERT INTO usage_accounts VALUES($1) ON CONFLICT DO NOTHING",
        [value.accountId],
      );
      await client.query(
        "SELECT account_id FROM usage_accounts WHERE account_id=$1 FOR UPDATE",
        [value.accountId],
      );
      const overlaps = await client.query(
        "SELECT 1 FROM usage_allowances WHERE account_id=$1 AND starts_at<$2 AND ends_at>$3",
        [value.accountId, value.endsAt, value.startsAt],
      );
      if (overlaps.rowCount) throw Error("Overlapping allowance period.");
      await client.query(
        "INSERT INTO usage_allowances VALUES($1,$2,$3,$4,$5)",
        [
          value.accountId,
          value.periodId,
          value.startsAt,
          value.endsAt,
          value.requestLimit,
        ],
      );
    });
  }
  /**
   * Starts the owner-set automatic allowance through the operator function. Where the function is
   * not installed (local and owner-role databases), it falls back to a direct insert; on the hosted
   * restricted role that insert is refused, so the operator function must be installed.
   */
  async startAutoAllowance(accountId: string, days: number, requestLimit: number): Promise<boolean> {
    usageId.parse(accountId);
    try {
      const result = await this.database.query("SELECT start_auto_allowance($1,$2,$3) AS created", [
        accountId,
        days,
        requestLimit,
      ]);
      return result.rows[0]?.created === true;
    } catch (error) {
      if ((error as { code?: string }).code !== "42883") throw error; // 42883: function not installed
      const startsAt = Date.now();
      await this.createAllowance({
        accountId,
        periodId: `auto-${accountId}-${startsAt}`,
        startsAt,
        endsAt: startsAt + days * 86_400_000,
        requestLimit,
      });
      return true;
    }
  }
  /** True when an allowance with this period ID exists, whatever its account or dates. */
  async hasAllowance(periodId: string): Promise<boolean> {
    usageId.parse(periodId);
    const result = await this.database.query(
      "SELECT 1 FROM usage_allowances WHERE period_id=$1",
      [periodId],
    );
    return result.rowCount === 1;
  }
  /** End of the account's latest allowance ending at or before `endsAt`, for gap-free renewals. */
  async lastAllowanceEnd(
    accountId: string,
    endsAt: number,
  ): Promise<number | undefined> {
    usageId.parse(accountId);
    const result = await this.database.query(
      "SELECT MAX(ends_at)::text AS ends_at FROM usage_allowances WHERE account_id=$1 AND ends_at<=$2",
      [accountId, endsAt],
    );
    const value = result.rows[0]?.ends_at;
    return value == null ? undefined : Number(value);
  }
  async summary(accountId: string): Promise<RequestAllowance> {
    usageId.parse(accountId);
    const now = await this.now(this.database);
    const result = await this.database.query(
      `SELECT a.request_limit,a.ends_at,COUNT(r.request_id)::int AS used,
      COUNT(*) FILTER (WHERE r.state IN ('reserved','dispatched'))::int AS pending,
      COUNT(*) FILTER (WHERE r.state='uncertain')::int AS uncertain,
      COUNT(m.request_id)::int AS metered,
      COALESCE(SUM(m.prompt_tokens),0)::text AS prompt_tokens,
      COALESCE(SUM(m.completion_tokens),0)::text AS completion_tokens,
      COUNT(m.cost_usd)::int AS costed,
      COALESCE(SUM(m.cost_usd),0)::text AS cost_usd,
      COUNT(*) FILTER (WHERE r.state IN ('transport_complete','uncertain') AND m.request_id IS NULL AND ${NOT_UNIT_ROW})::int AS unmetered
      FROM usage_allowances a LEFT JOIN usage_requests r ON a.period_id=r.period_id
      LEFT JOIN usage_metrics m ON m.request_id=r.request_id
      WHERE a.account_id=$1 AND a.starts_at<=$2 AND a.ends_at>$2 GROUP BY a.period_id`,
      [accountId, now],
    );
    const row = result.rows[0];
    if (!row) return { state: "unavailable" };
    return {
      state: row.used < row.request_limit ? "active" : "exhausted",
      limit: row.request_limit,
      used: row.used,
      remaining: Math.max(0, row.request_limit - row.used),
      pending: row.pending,
      uncertain: row.uncertain,
      resetsAt: new Date(Number(row.ends_at)).toISOString(),
      meteredRequests: row.metered,
      promptTokens: Number(row.prompt_tokens),
      completionTokens: Number(row.completion_tokens),
      ...(row.costed > 0
        ? { costUsd: normalizeDecimalString(String(row.cost_usd)) }
        : {}),
      unmeteredRequests: row.unmetered,
    };
  }
  async usedInLast(accountId: string, windowMs: number): Promise<number> {
    usageId.parse(accountId);
    const result = await this.database.query(
      "SELECT COUNT(*)::int AS used FROM usage_requests WHERE account_id=$1 AND created_at>$2",
      [accountId, (await this.now(this.database)) - windowMs],
    );
    return result.rows[0].used;
  }
  async reserve(
    accountId: string,
    requestId: string,
    units = 1,
  ): Promise<boolean> {
    usageId.parse(accountId);
    usageId.parse(requestId);
    usageUnits.parse(units);
    return this.transaction(async (client) => {
      const account = await client.query(
        "SELECT account_id FROM usage_accounts WHERE account_id=$1 FOR UPDATE",
        [accountId],
      );
      if (!account.rowCount) return false;
      const now = await this.now(client);
      const period = await client.query(
        `SELECT a.period_id FROM usage_allowances a
        WHERE account_id=$1 AND starts_at<=$2 AND ends_at>$2
        AND (SELECT COUNT(*) FROM usage_requests r WHERE r.period_id=a.period_id)+$3<=a.request_limit`,
        [accountId, now, units],
      );
      if (!period.rowCount) return false;
      const inserted = await client.query(
        `INSERT INTO usage_requests VALUES($1,$2,$3,'reserved',$4,$4)
        ON CONFLICT (request_id) DO NOTHING RETURNING request_id`,
        [requestId, accountId, period.rows[0].period_id, now],
      );
      if (inserted.rowCount !== 1) return false;
      const extra = unitRowIds(requestId, units);
      if (extra.length)
        await client.query(
          `INSERT INTO usage_requests SELECT unnest($1::text[]),$2::text,$3::text,'transport_complete',$4::bigint,$4::bigint`,
          [extra, accountId, period.rows[0].period_id, now],
        );
      return true;
    });
  }
  async dispatch(accountId: string, requestId: string): Promise<void> {
    usageId.parse(accountId);
    usageId.parse(requestId);
    const now = await this.now(this.database);
    const result = await this.database.query(
      "UPDATE usage_requests SET state='dispatched',updated_at=$1 WHERE account_id=$2 AND request_id=$3 AND state='reserved'",
      [now, accountId, requestId],
    );
    if (result.rowCount !== 1)
      throw Error("Request was not reserved for dispatch.");
  }
  async finish(
    accountId: string,
    requestId: string,
    outcome: z.infer<typeof usageOutcome>,
    metrics?: UsageMetrics,
  ): Promise<void> {
    usageId.parse(accountId);
    usageId.parse(requestId);
    usageOutcome.parse(outcome);
    const metered =
      outcome === "transport_complete" && metrics
        ? usageMetricsSchema.parse(metrics)
        : undefined;
    await this.transaction(async (client) => {
      const result = await client.query(
        "SELECT state FROM usage_requests WHERE account_id=$1 AND request_id=$2 FOR UPDATE",
        [accountId, requestId],
      );
      if (result.rows[0]?.state === outcome) return;
      if (result.rows[0]?.state !== "dispatched")
        throw Error("Invalid usage settlement.");
      const now = await this.now(client);
      await client.query(
        "UPDATE usage_requests SET state=$1,updated_at=$2 WHERE request_id=$3",
        [outcome, now, requestId],
      );
      if (metered)
        await client.query(
          `INSERT INTO usage_metrics VALUES($1,$2,$3,$4,$5,$6,$7)
          ON CONFLICT (request_id) DO NOTHING`,
          [
            requestId,
            metered.promptTokens,
            metered.completionTokens,
            metered.model,
            metered.costUsd ?? null,
            metered.webSearchCalls ?? null,
            now,
          ],
        );
    });
  }
  /** Completed-request metering for one request, or undefined when none was recorded. */
  async spend(since: number, until: number) {
    const result = await this.database.query(
      `SELECT COALESCE(SUM(m.cost_usd),0)::text AS metered,
        COUNT(*) FILTER (WHERE m.cost_usd IS NULL)::int AS unmetered
      FROM usage_requests r LEFT JOIN usage_metrics m ON m.request_id=r.request_id
      WHERE r.created_at>=$1 AND r.created_at<$2 AND ${NOT_UNIT_ROW}`,
      [since, until],
    );
    return {
      meteredUSD: normalizeDecimalString(String(result.rows[0].metered)),
      unmetered: Number(result.rows[0].unmetered),
    };
  }
  async metrics(
    accountId: string,
    requestId: string,
  ): Promise<UsageMetrics | undefined> {
    usageId.parse(accountId);
    usageId.parse(requestId);
    const result = await this.database.query(
      "SELECT m.prompt_tokens,m.completion_tokens,m.model,m.cost_usd::text AS cost_usd,m.web_search_calls FROM usage_metrics m JOIN usage_requests r ON r.request_id=m.request_id WHERE m.request_id=$1 AND r.account_id=$2",
      [requestId, accountId],
    );
    const row = result.rows[0];
    return row
      ? {
          promptTokens: Number(row.prompt_tokens),
          completionTokens: Number(row.completion_tokens),
          model: String(row.model),
          ...(row.cost_usd != null
            ? { costUsd: normalizeDecimalString(String(row.cost_usd)) }
            : {}),
          ...(row.web_search_calls != null
            ? { webSearchCalls: Number(row.web_search_calls) }
            : {}),
        }
      : undefined;
  }
}
