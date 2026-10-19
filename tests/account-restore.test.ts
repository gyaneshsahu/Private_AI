import { afterEach, expect, it } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { Pool } from "pg";
import { mkdir, writeFile } from "node:fs/promises";
import { usageDatabase } from "./fixtures/usage-postgres";
import {
  applyAccountMigrations,
  planAccountMigrations,
} from "../server/account-migrations";
import {
  accountRecoveryOpen,
  quarantineSyntheticRestore,
} from "../server/account-restore";
import { finishSignInRecovery } from "../server/account-recovery";
import { dispatchOneSecurityNotice } from "../server/security-notices";
import { createSyntheticConsumerWorkspace } from "../server/consumer-workspace";
import { PostgresUsageLedger } from "../server/usage-postgres";
import { inspectProductionDatabase } from "../server/production-operations";

const enabled =
  !!process.env.PRIVATEAI_SYNTHETIC_PG &&
  process.env.PRIVATEAI_SYNTHETIC_RESTORE === "1";
const container = "privateai-auth-synthetic-20261019";
const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});

function docker(args: string[], input?: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", args, {
      windowsHide: true,
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const chunks: Buffer[] = [],
      errors: Buffer[] = [];
    let bytes = 0;
    const timer = setTimeout(() => {
      child.kill();
      reject(Error("Synthetic Docker operation timed out."));
    }, 20_000);
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.stdout.on("data", (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > 8 * 1024 * 1024) {
        child.kill();
        reject(Error("Synthetic archive exceeded bound."));
      } else chunks.push(chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => errors.push(chunk));
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(Buffer.concat(chunks));
      else
        reject(
          Error(
            `Synthetic Docker command failed: ${Buffer.concat(errors).toString("utf8").slice(0, 700)}`,
          ),
        );
    });
    child.stdin.on("error", () => {
      /* A rejected archive may close stdin early; exit status is authoritative. */
    });
    child.stdin.end(input);
  });
}

async function setup() {
  const labels = JSON.parse(
    (
      await docker([
        "inspect",
        container,
        "--format",
        "{{json .Config.Labels}}",
      ])
    ).toString("utf8"),
  );
  expect(labels["privateai.purpose"]).toBe("synthetic-auth");
  const source = await usageDatabase({ empty: true });
  cleanups.push(source.dispose);
  await applyAccountMigrations(source.pool);
  const schema = (await source.pool.query("SELECT current_schema() AS name"))
    .rows[0].name as string;
  if (!/^usage_test_[a-f0-9]{32}$/.test(schema))
    throw Error("Unexpected source schema.");
  const admin = new Pool({
    connectionString: process.env.PRIVATEAI_SYNTHETIC_PG,
  });
  cleanups.push(() => admin.end());
  const target = async () => {
    const name = `privateai_restore_${randomUUID().replaceAll("-", "")}`;
    await admin.query(`CREATE DATABASE "${name}"`);
    // Only databases created successfully by this invocation are eligible for removal.
    cleanups.push(async () => {
      await admin.query(`DROP DATABASE "${name}"`);
    });
    await admin.query(`REVOKE CONNECT ON DATABASE "${name}" FROM PUBLIC`);
    const url = new URL(process.env.PRIVATEAI_SYNTHETIC_PG!);
    url.pathname = "/" + name;
    const pool = new Pool({
      connectionString: url.toString(),
      options: `-c search_path=${schema}`,
      connectionTimeoutMillis: 3000,
    });
    cleanups.push(() => pool.end());
    return { name, pool };
  };
  const dump = () =>
    docker([
      "exec",
      container,
      "pg_dump",
      "--username=privateai_synthetic",
      "--dbname=privateai_synthetic",
      "--format=custom",
      "--no-owner",
      "--no-privileges",
      `--schema=${schema}`,
    ]);
  const restore = (name: string, archive: Buffer) => {
    if (!/^privateai_restore_[a-f0-9]{32}$/.test(name))
      throw Error("Unexpected restore target.");
    return docker(
      [
        "exec",
        "-i",
        container,
        "pg_restore",
        "--username=privateai_synthetic",
        `--dbname=${name}`,
        "--single-transaction",
        "--exit-on-error",
        "--no-owner",
        "--no-privileges",
      ],
      archive,
    );
  };
  return { source, schema, target, dump, restore };
}

it.skipIf(!enabled)(
  "restores a stale synthetic archive offline and quarantines resurrected sessions, notices and stale allowance",
  async () => {
    const h = await setup();
    const user = randomUUID(),
      session = randomUUID();
    await h.source.pool.query(
      "INSERT INTO \"user\"(id,name,email,\"emailVerified\") VALUES($1,'','restore@example.test',true)",
      [user],
    );
    await h.source.pool.query(
      'INSERT INTO "session"(id,"userId",token,"expiresAt","updatedAt") VALUES($1,$2,$3,NOW()+interval \'1 hour\',NOW())',
      [session, user, randomUUID()],
    );
    await h.source.pool.query(
      "INSERT INTO verification(identifier,value,\"expiresAt\") VALUES('synthetic challenge','synthetic keyed code',NOW()+interval '5 minutes')",
    );
    await h.source.pool.query(
      "INSERT INTO research_consent VALUES($1,$2,$3,NOW()+interval '5 minutes')",
      ["a".repeat(48), session, "b".repeat(64)],
    );
    const usage = new PostgresUsageLedger(h.source.pool);
    await usage.createAllowance({
      accountId: user,
      periodId: "synthetic-recovery",
      startsAt: Date.now() - 1000,
      endsAt: Date.now() + 3600000,
      requestLimit: 5,
    });
    expect(await usage.reserve(user, "before-backup")).toBe(true);
    expect(await finishSignInRecovery(h.source.pool, user, session)).toBe(
      "completed",
    );
    await expect(
      quarantineSyntheticRestore(h.source.pool, "privateai_synthetic"),
    ).rejects.toThrow("Dedicated synthetic restore");
    const archive = await h.dump();
    expect(archive.subarray(0, 5).toString()).toBe("PGDMP");
    // These security facts happened after the backup and must not be undone by restoration.
    expect(await usage.reserve(user, "after-backup")).toBe(true);
    await h.source.pool.query('DELETE FROM "session" WHERE id=$1', [session]);
    await h.source.pool.query(
      "UPDATE account_security_event SET \"deliveryState\"='accepted'",
    );
    const target = await h.target();
    const started = performance.now();
    await h.restore(target.name, archive);
    archive.fill(0);
    expect((await planAccountMigrations(target.pool)).pending).toEqual([]);
    expect(
      (await target.pool.query('SELECT count(*)::int n FROM "session"')).rows[0]
        .n,
    ).toBe(1);
    const restoredUsage = new PostgresUsageLedger(target.pool);
    expect(await restoredUsage.summary(user)).toMatchObject({ used: 1 });
    expect(await usage.summary(user)).toMatchObject({ used: 2 });
    // The restored snapshot alone is not a valid authorization source.
    const result = await quarantineSyntheticRestore(target.pool, target.name);
    expect(result).toEqual({
      mode: "quarantined",
      sessionsInvalidated: 1,
      challengesInvalidated: 1,
      noticesHeld: 1,
    });
    expect(await accountRecoveryOpen(target.pool)).toBe(false);
    expect(await inspectProductionDatabase(target.pool)).toBe(false);
    expect(
      (await target.pool.query("SELECT * FROM research_consent")).rowCount,
    ).toBe(0);
    expect(
      (
        await target.pool.query(
          'SELECT "deliveryState" FROM account_security_event',
        )
      ).rows[0].deliveryState,
    ).toBe("blocked");
    expect(
      await dispatchOneSecurityNotice(target.pool, {
        submit: async () => {
          throw Error("Must never submit");
        },
      }),
    ).toBe("paused");
    expect(await finishSignInRecovery(target.pool, user, session)).toBe(
      "reauthenticate",
    );
    const server = createServer();
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    cleanups.push(
      () => new Promise<void>((resolve) => server.close(() => resolve())),
    );
    const address = server.address();
    if (!address || typeof address === "string") throw Error("port");
    const origin = `http://localhost:${address.port}`;
    let sends = 0;
    const app = createSyntheticConsumerWorkspace({
      origin,
      database: target.pool,
      secret: randomBytes(48).toString("base64url"),
      deliverCode: async () => {
        sends++;
      },
    });
    server.on("request", app.app);
    for (const path of [
      "/api/status",
      "/api/auth/get-session",
      "/api/account/security-notices",
    ])
      expect((await fetch(origin + path)).status).toBe(503);
    const denied = await fetch(
      origin + "/api/auth/email-otp/send-verification-otp",
      {
        method: "POST",
        headers: { origin, "content-type": "application/json" },
        body: JSON.stringify({
          email: "restore@example.test",
          type: "sign-in",
        }),
      },
    );
    expect(denied.status).toBe(503);
    expect(sends).toBe(0);
    expect(await restoredUsage.summary(user)).toMatchObject({ used: 1 }); // Preserve stale evidence for reconciliation, never reset to zero.
    expect(
      (await h.source.pool.query('SELECT count(*)::int n FROM "session"'))
        .rows[0].n,
    ).toBe(0);
    expect(await accountRecoveryOpen(h.source.pool)).toBe(true);
    expect(await quarantineSyntheticRestore(target.pool, target.name)).toEqual({
      mode: "quarantined",
      sessionsInvalidated: 0,
      challengesInvalidated: 0,
      noticesHeld: 0,
    });
    const durationMs = Math.round(performance.now() - started);
    await mkdir(".local/account-review", { recursive: true });
    await writeFile(
      ".local/account-review/restore-evidence.json",
      JSON.stringify(
        {
          synthetic: true,
          recordedAt: new Date().toISOString(),
          database: "PostgreSQL local isolated restore",
          durationMs,
          restoredSessionCount: 1,
          sourceUsage: 2,
          backupUsage: 1,
          quarantine: result,
          hostedRecoveryQualified: false,
        },
        null,
        2,
      ),
    );
  },
  45000,
);

it.skipIf(!enabled)(
  "rejects a corrupt archive and rolls back a failed quarantine without modifying the source",
  async () => {
    const h = await setup();
    const archive = await h.dump();
    const corrupted = await h.target();
    await expect(
      h.restore(
        corrupted.name,
        archive.subarray(0, Math.floor(archive.length / 2)),
      ),
    ).rejects.toThrow();
    expect(
      (
        await corrupted.pool.query(
          "SELECT to_regclass('privateai_schema_migrations') AS history",
        )
      ).rows[0].history,
    ).toBeNull();
    const target = await h.target();
    await h.restore(target.name, archive);
    archive.fill(0);
    await expect(
      quarantineSyntheticRestore(h.source.pool, target.name),
    ).rejects.toThrow("identity does not match");
    await target.pool
      .query(`CREATE FUNCTION reject_quarantine() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic quarantine failure'; END $$;
    CREATE TRIGGER deny_quarantine BEFORE DELETE ON verification FOR EACH STATEMENT EXECUTE FUNCTION reject_quarantine()`);
    await expect(
      quarantineSyntheticRestore(target.pool, target.name),
    ).rejects.toThrow("synthetic quarantine failure");
    expect(await accountRecoveryOpen(target.pool)).toBe(true); // Still offline; never serve this failed restoration.
    expect(await accountRecoveryOpen(h.source.pool)).toBe(true);
  },
  45000,
);
