import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

export async function usageDatabase(options: { empty?: boolean } = {}) {
  const connectionString = process.env.PRIVATEAI_SYNTHETIC_PG;
  if (!connectionString)
    throw Error("Explicit synthetic PostgreSQL connection required.");
  const url = new URL(connectionString);
  if (
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    url.pathname !== "/privateai_synthetic"
  )
    throw Error("Only the named local synthetic database may be tested.");
  const schema = `usage_test_${randomUUID().replaceAll("-", "")}`;
  const admin = new Pool({ connectionString });
  const pools = new Set<Pool>();
  const connect = () => {
    const pool = new Pool({
      connectionString,
      options: `-c search_path=${schema}`,
      max: 10,
      connectionTimeoutMillis: 3000,
    });
    pools.add(pool);
    return pool;
  };
  const close = async (pool: Pool) => {
    await pool.end();
    pools.delete(pool);
  };
  const dispose = async () => {
    await Promise.all([...pools].map(close));
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.end();
  };
  try {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    const pool = connect();
    if (!options.empty)
      await pool.query(
        await readFile("server/migrations/0004-usage-ledger.sql", "utf8"),
      );
    return { pool, connect, close, dispose };
  } catch (error) {
    await dispose();
    throw error;
  }
}
