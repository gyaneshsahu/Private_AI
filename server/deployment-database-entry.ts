import { Pool } from "pg";
import { loadDeploymentConfig } from "./deployment-config";
import {
  applyAccountMigrations,
  planAccountMigrations,
} from "./account-migrations";

// Separate operator command: application startup never provisions the database.
let database: Pool | undefined;
try {
  const [operation, file, ...extra] = process.argv.slice(2);
  if (
    !file ||
    extra.length ||
    !["check", "initialize-empty"].includes(operation)
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
  const result =
    operation === "check"
      ? await planAccountMigrations(database)
      : await applyAccountMigrations(database, { requireEmpty: true });
  console.log(
    JSON.stringify({
      operation,
      applied: result.applied.length,
      pending: result.pending.length,
      remoteTlsVerificationRequired: !!config.databaseCa,
    }),
  );
} catch {
  console.error(
    "Database preflight/provisioning failed. No credentials or database details logged; stop and review.",
  );
  process.exitCode = 1;
} finally {
  await database?.end();
}
