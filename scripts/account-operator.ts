import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { z } from "zod";

/**
 * Prints one SQL transaction for the owner to review and run in psql as the
 * schema owner. Never connects to a database. Tables come from
 * server/migrations/0001-0020; keep this list in step with new migrations.
 */
export const commands = ["show", "suspend", "unsuspend", "erase"] as const;
export type Command = (typeof commands)[number];

/** Same rule the sign-in accepts (server/account-auth.ts), lowercased like Better Auth. */
export function emailLiteral(email: string): string {
  const value = email.trim().toLowerCase();
  if (!z.email().max(254).safeParse(value).success || /[\\\0-\x1f]/.test(value))
    throw Error("A valid email address is required.");
  // The accepted alphabet has no backslash, so doubling quotes is safe whatever standard_conforming_strings is.
  return `'${value.replaceAll("'", "''")}'`;
}

const target = "(SELECT id FROM operator_target)";
const sessions = `(SELECT id FROM session WHERE "userId" IN ${target})`;
const accountText = "(SELECT id::text FROM operator_target)";
const otpTypes = ["sign-in", "email-verification", "forget-password", "change-email"];
const verification = (literal: string) =>
  `(identifier IN (${otpTypes.map((type) => `'${type}-otp-'||${literal}`).join(",")}) OR EXISTS (SELECT 1 FROM operator_target t WHERE verification.value LIKE '%'||t.id::text||'%'))`;

/** Every table holding rows for one account, with the predicate that finds them. */
const tables = (literal: string): [string, string][] => [
  ["user", `id IN ${target}`],
  ["session", `"userId" IN ${target}`],
  ["account", `"userId" IN ${target}`],
  ["passkey", `"userId" IN ${target}`],
  ["account_security_event", `"userId" IN ${target}`],
  ["account_credential_change", `"userId" IN ${target}`],
  ["account_email_proof", `"sessionId" IN ${sessions}`],
  ["consumer_request_count", `session_id IN ${sessions}`],
  ["research_consent", `session_id IN ${sessions}`],
  ["verification", verification(literal)],
  ["usage_accounts", `account_id IN ${accountText}`],
  ["usage_allowances", `account_id IN ${accountText}`],
  ["usage_requests", `account_id IN ${accountText}`],
  ["usage_metrics", `request_id IN (SELECT request_id FROM usage_requests WHERE account_id IN ${accountText})`],
  ["billing_customer_binding", `account_id IN ${target}`],
  ["billing_operation", `account_id IN ${target}`],
  ["billing_assessment", `customer_id IN (SELECT customer_id FROM billing_customer_binding WHERE account_id IN ${target})`],
  ["account_closure", `"userId" IN ${target}`],
];

const counts = (literal: string) =>
  [
    ...tables(literal).map(
      ([name, where]) => `SELECT '${name}' AS "table", count(*) AS rows FROM "${name}" WHERE ${where}`,
    ),
    `SELECT 'suspended', count(*) FROM account_closure WHERE "userId" IN ${target} AND "holdUntil"='infinity' AND "purgedAt" IS NULL`,
  ].join("\nUNION ALL ") + ";";

export function operatorSql(command: Command, email: string): string {
  const literal = emailLiteral(email);
  const body: Record<Command, string[]> = {
    show: [],
    // An account_closure row blocks sign-in (recordSessionAccess, sign-in code hook); 'infinity' marks an operator suspension and keeps the purge away.
    suspend: [
      `INSERT INTO account_closure ("userId","requestedAt","purgeAfter","holdUntil") SELECT id,stamp,stamp+interval '7 days','infinity' FROM operator_target, (SELECT clock_timestamp() AS stamp) t ON CONFLICT ("userId") DO NOTHING;`,
      `DELETE FROM session WHERE "userId" IN ${target};`,
      `DELETE FROM verification WHERE ${verification(literal)};`,
    ],
    // Removes only an operator suspension; a closure the person requested stays.
    unsuspend: [
      `DELETE FROM account_closure WHERE "userId" IN ${target} AND "holdUntil"='infinity' AND "purgedAt" IS NULL;`,
    ],
    // Children first (usage_metrics -> usage_requests -> usage_allowances; billing_assessment found via the binding); "user" cascades to the auth tables.
    erase: [
      `DELETE FROM session WHERE "userId" IN ${target};`,
      ...[
        "usage_metrics",
        "usage_requests",
        "usage_allowances",
        "usage_accounts",
        "billing_assessment",
        "billing_operation",
        "billing_customer_binding",
        "verification",
      ].map((name) => `DELETE FROM "${name}" WHERE ${Object.fromEntries(tables(literal))[name]};`),
      // Kept: the closure receipt (opaque ID and times, no contact data), stamped as purged.
      `UPDATE account_closure SET "purgedAt"=clock_timestamp() WHERE "userId" IN ${target} AND "purgedAt" IS NULL;`,
      `DELETE FROM "user" WHERE id IN ${target};`,
    ],
  };
  return [
    `-- CometRow account operator: ${command}. Review, then run as the schema owner with psql -v ON_ERROR_STOP=1.`,
    "BEGIN;",
    `CREATE TEMP TABLE operator_target ON COMMIT DROP AS SELECT id FROM "user" WHERE lower(email)=${literal};`,
    `SELECT count(*) AS accounts_matched FROM operator_target;`,
    ...body[command],
    counts(literal),
    command === "show" ? "ROLLBACK;" : "COMMIT;",
    "",
  ].join("\n");
}

export function main(argv: string[]): string {
  const [command, flag, email, ...rest] = argv;
  if (!commands.includes(command as Command) || flag !== "--email" || !email || rest.length)
    throw Error(`Usage: node --import tsx scripts/account-operator.ts <${commands.join("|")}> --email <address>`);
  return operatorSql(command as Command, email);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    process.stdout.write(main(process.argv.slice(2)));
  } catch (error) {
    console.error((error as Error).message);
    process.exitCode = 1;
  }
}
