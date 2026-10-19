import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { Pool, PoolClient } from "pg";

const names = [
  "0001-consumer-auth.sql",
  "0002-account-uniqueness.sql",
  "0003-account-security-events.sql",
  "0004-usage-ledger.sql",
] as const;
interface Migration {
  name: string;
  sql: string;
  checksum: string;
}
export interface MigrationPlan {
  applied: string[];
  pending: string[];
}

async function sources(): Promise<Migration[]> {
  return Promise.all(
    names.map(async (name) => {
      const sql = (
        await readFile(new URL(`./migrations/${name}`, import.meta.url), "utf8")
      ).replaceAll("\r\n", "\n");
      return {
        name,
        sql,
        checksum: createHash("sha256").update(sql).digest("hex"),
      };
    }),
  );
}
async function plan(
  database: Pick<PoolClient, "query">,
  migrations: Migration[],
): Promise<MigrationPlan> {
  const exists = (
    await database.query(
      "SELECT to_regclass('privateai_schema_migrations') IS NOT NULL AS present",
    )
  ).rows[0].present;
  const applied: { name: string; checksum: string }[] = exists
    ? (
        await database.query(
          "SELECT name,checksum FROM privateai_schema_migrations ORDER BY name",
        )
      ).rows
    : [];
  for (const [index, recorded] of applied.entries()) {
    const expected = migrations[index];
    if (
      !expected ||
      expected.name !== recorded.name ||
      expected.checksum !== recorded.checksum
    )
      throw Error(
        "Migration history is unknown, out of order or has changed. Stop and review; no automatic repair.",
      );
  }
  return {
    applied: applied.map((row) => row.name),
    pending: migrations.slice(applied.length).map((row) => row.name),
  };
}

/** Read-only inspection. Missing history does not imply an existing schema is safe to adopt. */
export async function planAccountMigrations(
  database: Pool,
): Promise<MigrationPlan> {
  return plan(database, await sources());
}

/** Explicit provisioning operation, never called by application startup. */
export async function applyAccountMigrations(
  database: Pool,
): Promise<MigrationPlan> {
  const migrations = await sources();
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended(current_database() || ':' || current_schema() || ':privateai-schema',0))",
    );
    const before = await plan(client, migrations);
    await client.query(`CREATE TABLE IF NOT EXISTS privateai_schema_migrations (
      name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
    for (const migration of migrations.slice(before.applied.length)) {
      await client.query(migration.sql);
      await client.query(
        "INSERT INTO privateai_schema_migrations(name,checksum) VALUES($1,$2)",
        [migration.name, migration.checksum],
      );
    }
    await client.query("COMMIT");
    return { applied: migrations.map((value) => value.name), pending: [] };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
