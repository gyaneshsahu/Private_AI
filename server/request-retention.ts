import type { Pool } from "pg";

const DAY_MS = 24 * 60 * 60 * 1000;
/** The privacy policy states request records are kept for 90 days and then deleted. */
export const REQUEST_RETENTION_MS = 90 * DAY_MS;

/**
 * Operator SQL (run as the schema owner, listed in accountPrivilegePlan): the
 * runtime role may call this function but holds no DELETE on usage tables, so
 * it cannot erase its own allowance count. The function fixes the rule and
 * reads the database clock. Records past 90 days stay while their allowance
 * period is open, because the allowance counts their rows; `held` reports them.
 * Not a migration: an unknown recorded migration would stop older releases.
 */
export function requestPurgeFunctionSql(schema: string): string {
  return `CREATE OR REPLACE FUNCTION ${schema}.purge_expired_requests(OUT requests bigint, OUT metrics bigint, OUT held bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ${schema}, pg_temp AS $fn$
DECLARE
  now_ms bigint := (extract(epoch FROM clock_timestamp()) * 1000)::bigint;
  cutoff bigint := now_ms - ${REQUEST_RETENTION_MS};
BEGIN
  DELETE FROM usage_metrics WHERE request_id IN (
    SELECT r.request_id FROM usage_requests r JOIN usage_allowances a ON a.period_id = r.period_id
    WHERE r.created_at < cutoff AND a.ends_at <= now_ms);
  GET DIAGNOSTICS metrics = ROW_COUNT;
  DELETE FROM usage_requests r USING usage_allowances a
    WHERE a.period_id = r.period_id AND r.created_at < cutoff AND a.ends_at <= now_ms;
  GET DIAGNOSTICS requests = ROW_COUNT;
  SELECT count(*) INTO held FROM usage_requests WHERE created_at < cutoff;
END
$fn$`;
}

export async function purgeExpiredRequests(
  database: Pool,
): Promise<{ requests: number; metrics: number; held: number }> {
  const row = (
    await database.query(
      "SELECT requests::int, metrics::int, held::int FROM purge_expired_requests()",
    )
  ).rows[0];
  return { requests: row.requests, metrics: row.metrics, held: row.held };
}

/** Runs the purge now and daily; log lines carry counts only. Returns the stop function. */
export function scheduleRequestPurge(
  database: Pool,
  log: (line: string) => void,
): () => void {
  const run = () =>
    purgeExpiredRequests(database).then(
      (result) => {
        if (result.requests || result.held)
          log(
            `Request records purged: ${result.requests} deleted, ${result.held} past 90 days held in an open allowance period.\n`,
          );
      },
      () => log("Request record purge failed.\n"),
    );
  void run();
  const timer = setInterval(run, DAY_MS);
  timer.unref();
  return () => clearInterval(timer);
}
