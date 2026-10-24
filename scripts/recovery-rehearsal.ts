import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Pool } from "pg";
import { planAccountMigrations } from "../server/account-migrations";
import { accountRecoveryOpen } from "../server/account-restore";

// Launch plan 7.1: read-only helper for the joint recovery rehearsal.
// Prints the steps and their commands; `record` runs only SELECT checks and
// appends a timestamped, secret-free entry to the receipt so recovery time can
// be measured between steps. It never writes to a database or a hosted service.

export const STEPS = [
  [
    "baseline",
    "Owner: record the live commit SHA (Render Events page). Agent: `record baseline` against the throwaway database URL file and the candidate origin.",
  ],
  [
    "paused",
    "Owner: enter paused recovery on the throwaway database only: `UPDATE account_recovery_control SET mode='quarantined' WHERE singleton=true;` in its shell. Agent: `record paused` (recoveryOpen must be false).",
  ],
  [
    "backup",
    "Owner: take the Render backup or point-in-time snapshot of the throwaway database; note its time. Agent: `record backup`.",
  ],
  [
    "loss",
    "Owner: simulate loss on the throwaway database only (drop one account table in its shell). Agent: `record loss` (the dropped table reports an error, nothing else changes).",
  ],
  [
    "restored",
    "Owner: restore the snapshot into a new throwaway database; put its URL in a new URL file. Agent: `record restored` with the new file (counts match `backup`, pending must be `[]`).",
  ],
  [
    "checked",
    "Owner, in the service shell: `node --import tsx server/deployment-database-entry.ts privileges-check <config>` then `check <config>` (pending 0). Agent: `record checked`.",
  ],
  [
    "reopened",
    "Owner: leave recovery after reconciliation: `UPDATE account_recovery_control SET mode='normal' WHERE singleton=true;`. Agent: `record reopened` (recoveryOpen true, readyz 200). Elapsed since `loss` is the recovery time.",
  ],
] as const;
export type Step = (typeof STEPS)[number][0];

const ACCOUNT_TABLES = [
  "user",
  "session",
  "account_recovery_control",
  "account_security_event",
  "usage_accounts",
  "usage_allowances",
  "usage_requests",
];

/** Every statement this script sends passes here first. */
export function assertReadOnly(sql: string) {
  if (!/^\s*select\b/i.test(sql) || sql.includes(";"))
    throw Error(`Refused: not a single SELECT statement: ${sql.slice(0, 60)}`);
  return sql;
}

type Database = { query(sql: string): Promise<{ rows: Record<string, unknown>[] }> };

export async function collectChecks(database: Database, origin?: string) {
  const guarded: Database = { query: (sql) => database.query(assertReadOnly(sql)) };
  const counts: Record<string, number | string> = {};
  for (const table of ACCOUNT_TABLES)
    counts[table] = await guarded
      .query(`SELECT count(*)::int AS n FROM "${table}"`)
      .then((r) => Number(r.rows[0]?.n ?? 0), (e: Error) => `error: ${e.message}`);
  const probe = async (path: string) => {
    if (!origin) return null;
    const started = performance.now();
    const response = await fetch(new URL(path, origin), { redirect: "manual" });
    return { status: response.status, ms: Math.round(performance.now() - started) };
  };
  return {
    migrations: await planAccountMigrations(guarded as unknown as Pool),
    recoveryOpen: await accountRecoveryOpen(guarded as unknown as Pool),
    counts,
    readyz: await probe("/readyz"),
    healthz: await probe("/healthz"),
  };
}

export type Receipt = {
  rehearsal: "7.1";
  synthetic: true;
  entries: ({ step: Step; at: string; sinceFirstMs: number } & Awaited<
    ReturnType<typeof collectChecks>
  >)[];
};

export function appendEntry(
  previous: Receipt | undefined,
  step: Step,
  checks: Awaited<ReturnType<typeof collectChecks>>,
  now = new Date(),
): Receipt {
  const receipt = previous ?? { rehearsal: "7.1", synthetic: true, entries: [] };
  const first = receipt.entries[0] ? Date.parse(receipt.entries[0].at) : now.getTime();
  receipt.entries.push({
    step,
    at: now.toISOString(),
    sinceFirstMs: now.getTime() - first,
    ...checks,
  });
  return receipt;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const [command, step, urlFile, receiptPath, origin] = process.argv.slice(2);
  if (command === "steps") {
    for (const [name, text] of STEPS) console.log(`${name}: ${text}`);
  } else if (
    command === "record" &&
    STEPS.some(([name]) => name === step) &&
    urlFile &&
    receiptPath
  ) {
    const url = (await readFile(urlFile, "utf8")).trim();
    if (!/^postgres(ql)?:\/\//.test(url)) throw Error("URL file must hold one PostgreSQL URL.");
    const database = new Pool({ connectionString: url, max: 1, statement_timeout: 15000 });
    try {
      const checks = await collectChecks(database, origin);
      const previous = await readFile(receiptPath, "utf8").then(
        (text) => JSON.parse(text) as Receipt,
        () => undefined,
      );
      const receipt = appendEntry(previous, step as Step, checks);
      await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + "\n");
      console.log(JSON.stringify(receipt.entries.at(-1)));
    } finally {
      await database.end();
    }
  } else {
    console.error(
      "Usage: node --import tsx scripts/recovery-rehearsal.ts steps | record <step> <connection-file> <receipt.json> [origin]",
    );
    process.exitCode = 2;
  }
}
