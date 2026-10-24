import { Pool } from "pg";
import { loadDeploymentConfig } from "./deployment-config";
import {
  applyAccountMigrations,
  planAccountMigrations,
} from "./account-migrations";
import {
  accountPrivilegePlan,
  describeConnectedRole,
} from "./account-privileges";

// Separate operator command: application startup never provisions the database.
let database: Pool | undefined;
try {
  const [operation, file, ...extra] = process.argv.slice(2);
  // privileges-plan prints the grant SQL for the operator to review and run; it connects to nothing.
  if (operation === "privileges-plan") {
    const [schema, runtimeRole, noticeRole] = [file, ...extra];
    if (!schema || !runtimeRole || !noticeRole || extra.length !== 2)
      throw Error("Invalid command.");
    console.log(
      accountPrivilegePlan({ schema, runtimeRole, noticeRole })
        .map((sql) => `${sql};`)
        .join("\n"),
    );
  } else {
    if (
      !file ||
      extra.length ||
      ![
        "check",
        "initialize-empty",
        "apply-pending",
        "privileges-check",
      ].includes(operation)
    )
      throw Error("Invalid command.");
    const config = await loadDeploymentConfig(file);
    database = new Pool({
      connectionString: config.connectionString,
      max: 1,
      connectionTimeoutMillis: 5000,
      statement_timeout: 15000,
      ssl: config.databaseCa
        ? { ca: config.databaseCa, rejectUnauthorized: true }
        : false,
    });
    database.on("error", () => {});
    // `apply-pending` is the reviewed upgrade step for an already initialized
    // schema: it applies only migrations not yet recorded, under the advisory
    // lock, and refuses a history whose checksums differ. Startup never does this.
    const result =
      operation === "privileges-check"
        ? undefined
        : operation === "check"
          ? await planAccountMigrations(database)
          : await applyAccountMigrations(database, {
              requireEmpty: operation === "initialize-empty",
            });
    // privileges-check reports what the configured role can do (plan 7.6); nothing is changed.
    console.log(
      JSON.stringify(
        operation === "privileges-check"
          ? { operation, ...(await describeConnectedRole(database)) }
          : {
              operation,
              applied: result!.applied.length,
              pending: result!.pending.length,
              remoteTlsVerificationRequired: !!config.databaseCa,
            },
      ),
    );
  }
} catch {
  console.error(
    "Database preflight/provisioning failed. No credentials or database details logged; stop and review.",
  );
  process.exitCode = 1;
} finally {
  await database?.end();
}
