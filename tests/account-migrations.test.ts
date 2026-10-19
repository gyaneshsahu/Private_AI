import { expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  applyAccountMigrations,
  planAccountMigrations,
} from "../server/account-migrations";
import { usageDatabase } from "./fixtures/usage-postgres";

const enabled = !!process.env.PRIVATEAI_SYNTHETIC_PG;
it.skipIf(!enabled)(
  "plans without mutation and applies once under concurrent migrators without losing account rows",
  async () => {
    const db = await usageDatabase({ empty: true });
    try {
      const plan = await planAccountMigrations(db.pool);
      expect(plan.applied).toEqual([]);
      expect(plan.pending).toHaveLength(10);
      expect(
        (
          await db.pool.query(
            "SELECT to_regclass('privateai_schema_migrations') AS history",
          )
        ).rows[0].history,
      ).toBeNull();
      const results = await Promise.all([
        applyAccountMigrations(db.pool),
        applyAccountMigrations(db.connect()),
      ]);
      expect(
        results.every(
          (result) =>
            result.applied.length === 10 && result.pending.length === 0,
        ),
      ).toBe(true);
      await db.pool.query(
        'INSERT INTO "user"(id,name,email,"emailVerified","createdAt","updatedAt") VALUES($1,\'\',\'migration@example.test\',true,NOW(),NOW())',
        [randomUUID()],
      );
      await applyAccountMigrations(db.pool);
      expect(
        (await db.pool.query('SELECT count(*)::int n FROM "user"')).rows[0].n,
      ).toBe(1);
      expect(
        (
          await db.pool.query(
            "SELECT count(*)::int n FROM privateai_schema_migrations",
          )
        ).rows[0].n,
      ).toBe(10);
    } finally {
      await db.dispose();
    }
  },
);

it.skipIf(!enabled)(
  "rejects modified or incomplete migration history without attempting repair",
  async () => {
    const db = await usageDatabase({ empty: true });
    try {
      await applyAccountMigrations(db.pool);
      await db.pool.query(
        "UPDATE privateai_schema_migrations SET checksum='changed' WHERE name='0004-usage-ledger.sql'",
      );
      await expect(planAccountMigrations(db.pool)).rejects.toThrow(
        "Stop and review",
      );
      await expect(applyAccountMigrations(db.pool)).rejects.toThrow(
        "Stop and review",
      );
      expect(
        (
          await db.pool.query(
            "SELECT checksum FROM privateai_schema_migrations WHERE name='0004-usage-ledger.sql'",
          )
        ).rows[0].checksum,
      ).toBe("changed");
      await db.pool.query(
        "DELETE FROM privateai_schema_migrations WHERE name='0001-consumer-auth.sql'",
      );
      await expect(applyAccountMigrations(db.pool)).rejects.toThrow(
        "Stop and review",
      );
      expect(
        (
          await db.pool.query(
            "SELECT count(*)::int n FROM privateai_schema_migrations",
          )
        ).rows[0].n,
      ).toBe(9);
    } finally {
      await db.dispose();
    }
  },
);

it.skipIf(!enabled)(
  "rolls back the complete pending batch on a later DDL failure and preserves pre-existing data",
  async () => {
    const db = await usageDatabase({ empty: true });
    try {
      await db.pool.query(
        "CREATE TABLE account_security_event (sentinel text); INSERT INTO account_security_event VALUES('preserve synthetic data')",
      );
      await expect(applyAccountMigrations(db.pool)).rejects.toThrow();
      expect(
        (
          await db.pool.query(
            "SELECT to_regclass('privateai_schema_migrations') AS history,to_regclass('\"user\"') AS users",
          )
        ).rows[0],
      ).toEqual({ history: null, users: null });
      expect(
        (await db.pool.query("SELECT sentinel FROM account_security_event"))
          .rows,
      ).toEqual([{ sentinel: "preserve synthetic data" }]);
    } finally {
      await db.dispose();
    }
  },
);
