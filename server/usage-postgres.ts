import type { Pool, PoolClient } from "pg";
import type { z } from "zod";
import type { RequestAllowance } from "../shared/contracts";
import {
  usageId,
  usageAllowanceSchema,
  usageOutcome,
  type UsageLedger,
} from "./usage-contract";
import { usageMetricsSchema, type UsageMetrics } from "./usage-metrics";

/** Shared request counts only. Injected pool/migrations; never auto-activated. */
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
  async summary(accountId: string): Promise<RequestAllowance> {
    usageId.parse(accountId);
    const now = await this.now(this.database);
    const result = await this.database.query(
      `SELECT a.request_limit,a.ends_at,COUNT(r.request_id)::int AS used,
      COUNT(*) FILTER (WHERE r.state IN ('reserved','dispatched'))::int AS pending,
      COUNT(*) FILTER (WHERE r.state='uncertain')::int AS uncertain
      FROM usage_allowances a LEFT JOIN usage_requests r ON a.period_id=r.period_id
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
    };
  }
  async reserve(accountId: string, requestId: string): Promise<boolean> {
    usageId.parse(accountId);
    usageId.parse(requestId);
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
        AND (SELECT COUNT(*) FROM usage_requests r WHERE r.period_id=a.period_id)<a.request_limit`,
        [accountId, now],
      );
      if (!period.rowCount) return false;
      const inserted = await client.query(
        `INSERT INTO usage_requests VALUES($1,$2,$3,'reserved',$4,$4)
        ON CONFLICT (request_id) DO NOTHING RETURNING request_id`,
        [requestId, accountId, period.rows[0].period_id, now],
      );
      return inserted.rowCount === 1;
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
  async metrics(requestId: string): Promise<UsageMetrics | undefined> {
    usageId.parse(requestId);
    const result = await this.database.query(
      "SELECT prompt_tokens,completion_tokens,model,cost_usd::text AS cost_usd,web_search_calls FROM usage_metrics WHERE request_id=$1",
      [requestId],
    );
    const row = result.rows[0];
    return row
      ? {
          promptTokens: Number(row.prompt_tokens),
          completionTokens: Number(row.completion_tokens),
          model: String(row.model),
          ...(row.cost_usd != null
            ? { costUsd: String(row.cost_usd).replace(/\.?0+$/, "") }
            : {}),
          ...(row.web_search_calls != null
            ? { webSearchCalls: Number(row.web_search_calls) }
            : {}),
        }
      : undefined;
  }
}
