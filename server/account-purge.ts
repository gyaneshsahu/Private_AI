// Closed-account purge (docs/account-purge-20261116.md), behind `inference.accountPurge`, off by
// default. A closed account (account_closure row) is deleted `graceDays` after the closure request:
// the "user" row goes, and with it, by ON DELETE CASCADE, its sessions, sign-in methods, passkeys,
// security notices, Secure items, files and key, sync data, memories and projects stored there,
// and background tasks. Usage and billing rows carry no contact data and stay for reconciliation.
// The closure receipt stays, stamped purgedAt. Operator suspensions (holdUntil 'infinity') are
// never purged, and nothing runs while account recovery verification is in progress.
import type { Pool } from "pg";

const DAY_MS = 24 * 60 * 60 * 1000;
export const ACCOUNT_PURGE_DEFAULT_DAYS = 30;
/** Accounts per pass: a large backlog is worked off over several daily passes, never in one long lock. */
const BATCH = 100;

/**
 * Operator SQL (run as the schema owner, listed in accountPrivilegePlan): the runtime role may call
 * this function but holds no UPDATE on account_closure and no DELETE on the Secure key table, so it
 * cannot erase accounts by any other rule. The function reads the database clock.
 * Not a migration: an unknown recorded migration would stop older releases.
 */
export function accountPurgeFunctionSql(schema: string): string {
  return `CREATE OR REPLACE FUNCTION ${schema}.purge_closed_accounts(grace_days integer, OUT accounts bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ${schema}, pg_temp AS $fn$
DECLARE
  ids uuid[];
BEGIN
  accounts := 0;
  -- The table CHECK already keeps purgeAfter at least 7 days after the request.
  IF grace_days IS NULL OR grace_days < 7 OR grace_days > 365 THEN
    RAISE EXCEPTION 'grace_days must be 7 to 365';
  END IF;
  -- A restored database is verified before anything is erased from it.
  IF (SELECT mode FROM account_recovery_control WHERE singleton) IS DISTINCT FROM 'normal' THEN
    RETURN;
  END IF;
  SELECT coalesce(array_agg("userId"), '{}') INTO ids FROM (
    SELECT "userId" FROM account_closure
    WHERE "purgedAt" IS NULL
      AND "purgeAfter" <= clock_timestamp()
      AND "requestedAt" + make_interval(days => grace_days) <= clock_timestamp()
      AND ("holdUntil" IS NULL OR "holdUntil" <= clock_timestamp())
    ORDER BY "requestedAt" LIMIT ${BATCH}
    FOR UPDATE SKIP LOCKED) due;
  IF cardinality(ids) = 0 THEN
    RETURN;
  END IF;
  -- Sign-in codes are keyed by address, not by the account row (as in server/account-closure.ts).
  DELETE FROM verification WHERE identifier IN (SELECT 'sign-in-otp-'||email FROM "user" WHERE id = ANY(ids));
  DELETE FROM "user" WHERE id = ANY(ids);
  UPDATE account_closure SET "purgedAt" = clock_timestamp() WHERE "userId" = ANY(ids);
  accounts := cardinality(ids);
END
$fn$`;
}

export async function purgeClosedAccounts(database: Pool, graceDays: number): Promise<number> {
  return (await database.query("SELECT accounts::int AS accounts FROM purge_closed_accounts($1)", [graceDays])).rows[0].accounts;
}

/** Runs the purge now and daily; log lines carry counts only. Returns the stop function. */
export function scheduleAccountPurge(database: Pool, graceDays: number, log: (line: string) => void): () => void {
  const run = () =>
    purgeClosedAccounts(database, graceDays).then(
      (accounts) => {
        if (accounts) log(`Closed accounts purged: ${accounts}.\n`);
      },
      // Most likely the function is not installed yet (accountPrivilegePlan): nothing was deleted.
      () => log("Closed account purge failed; nothing was deleted.\n"),
    );
  void run();
  const timer = setInterval(run, DAY_MS);
  timer.unref();
  return () => clearInterval(timer);
}
