import { afterEach, expect, it, vi } from "vitest";
import express from "express";
import { request, type Server } from "node:http";
import type { Pool, PoolClient } from "pg";
import {
  inspectProductionDatabase,
  productionOperations,
} from "../server/production-operations";
import { applyAccountMigrations } from "../server/account-migrations";
import { usageDatabase } from "./fixtures/usage-postgres";

const enabled = !!process.env.PRIVATEAI_SYNTHETIC_PG;
const cleanups: (() => Promise<unknown>)[] = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});

it("bounds pool acquisition and releases a connection arriving after timeout", async () => {
  let callback!: (
    error: Error | undefined,
    client: PoolClient,
    release: () => void,
  ) => void;
  const release = vi.fn();
  const query = vi.fn();
  const database = {
    connect: (fn: typeof callback) => {
      callback = fn;
    },
  } as unknown as Pool;
  expect(await inspectProductionDatabase(database, 15)).toBe(false);
  callback(undefined, { query } as unknown as PoolClient, release);
  expect(release).toHaveBeenCalledOnce();
  expect(query).not.toHaveBeenCalled();
});

it("destroys a connection with a stalled query and ignores late results", async () => {
  let finish!: () => void;
  const query = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const release = vi.fn();
  const client = { query, release, on: vi.fn(), off: vi.fn() };
  const database = {
    connect: (fn: Function) => fn(undefined, client, release),
  } as unknown as Pool;
  expect(await inspectProductionDatabase(database, 15)).toBe(false);
  expect(release).toHaveBeenCalledExactlyOnceWith(true);
  // A real destroyed pg client rejects further queries. The stub models that too.
  query.mockRejectedValueOnce(Error("destroyed"));
  finish();
  await new Promise((resolve) => setTimeout(resolve, 5));
  expect(release).toHaveBeenCalledOnce();
});

it("fails closed on acquisition errors and invalid deadlines", async () => {
  const database = {
    connect: (fn: Function) => fn(Error("synthetic secret/database details")),
  } as unknown as Pool;
  expect(await inspectProductionDatabase(database)).toBe(false);
  for (const value of [0, -1, 5001, NaN, 1.5])
    expect(() => inspectProductionDatabase(database, value)).toThrow(
      "deadline",
    );
});

async function fixture(options: { migrate?: boolean } = {}) {
  const db = await usageDatabase({ empty: true });
  cleanups.push(db.dispose);
  if (options.migrate !== false) await applyAccountMigrations(db.pool);
  const operations = productionOperations(db.pool);
  const app = express().use(operations.middleware);
  const handlers: express.Response[] = [];
  app.get("/hold", (_req, res) => handlers.push(res));
  app.get("/work", (_req, res) => res.json({ accepted: true }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  cleanups.push(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
  const address = server.address();
  if (!address || typeof address === "string") throw Error("Missing listener");
  const call = (path: string, method = "GET") =>
    new Promise<{ status: number; body: string; cache?: string }>(
      (resolve, reject) => {
        const req = request(
          { hostname: "127.0.0.1", port: address.port, path, method },
          (res) => {
            let body = "";
            res.on("data", (data) => {
              body += data;
            });
            res.on("end", () =>
              resolve({
                status: res.statusCode!,
                body,
                cache: res.headers["cache-control"],
              }),
            );
            res.on("error", reject);
          },
        );
        req.on("error", reject);
        req.end();
      },
    );
  return { ...db, operations, server, handlers, call };
}

it.skipIf(!enabled)(
  "checks migration checksums and recovery without writing or automatically migrating",
  async () => {
    const f = await fixture();
    expect(await f.operations.ready).toBe(true);
    expect(await f.call("/readyz")).toMatchObject({
      status: 200,
      body: "ready",
      cache: "no-store",
    });
    const before = await f.pool.query("SELECT * FROM account_recovery_control");
    await f.pool.query(
      "UPDATE privateai_schema_migrations SET checksum='altered' WHERE name='0012-billing-operations.sql'",
    );
    expect(await f.call("/readyz")).toMatchObject({
      status: 503,
      body: "unavailable",
    });
    expect(
      (await f.pool.query("SELECT * FROM account_recovery_control")).rows,
    ).toEqual(before.rows);
    expect(
      (
        await f.pool.query(
          "SELECT checksum FROM privateai_schema_migrations WHERE name='0012-billing-operations.sql'",
        )
      ).rows[0].checksum,
    ).toBe("altered");
    expect((await f.call("/healthz")).status).toBe(200);
  },
);

it.skipIf(!enabled)(
  "refuses an unmigrated startup until reconstruction and exposes only minimal probe output",
  async () => {
    const f = await fixture({ migrate: false });
    expect(await f.operations.ready).toBe(false);
    expect(await f.call("/readyz")).toMatchObject({
      status: 503,
      body: "unavailable",
    });
    expect((await f.call("/work")).status).toBe(503);
    expect((await f.call("/healthz", "POST")).status).toBe(503);
    expect((await f.call("/healthz?details=1")).status).toBe(503);
    await applyAccountMigrations(f.pool);
    expect((await f.call("/work")).status).toBe(503);
    const replacement = productionOperations(f.pool);
    expect(await replacement.ready).toBe(true);
  },
);

it.skipIf(!enabled)(
  "reports unavailable on quarantine, locks and disconnected database while liveness survives",
  async () => {
    const f = await fixture();
    expect(await f.operations.ready).toBe(true);
    await f.pool.query(
      "UPDATE account_recovery_control SET mode='quarantined'",
    );
    expect((await f.call("/readyz")).status).toBe(503);
    // Synthetic fixture reset only; the application never changes recovery mode.
    await f.pool.query("UPDATE account_recovery_control SET mode='normal'");
    const locker = await f.pool.connect();
    try {
      await locker.query("BEGIN");
      await locker.query(
        "LOCK TABLE account_recovery_control IN ACCESS EXCLUSIVE MODE",
      );
      const start = performance.now();
      expect((await f.call("/readyz")).status).toBe(503);
      expect(performance.now() - start).toBeLessThan(5000);
    } finally {
      await locker.query("ROLLBACK");
      locker.release();
    }
    expect((await f.call("/readyz")).status).toBe(200);
    await f.close(f.pool);
    expect((await f.call("/readyz")).status).toBe(503);
    expect((await f.call("/healthz")).status).toBe(200);
  },
);

it.skipIf(!enabled)(
  "single-flights concurrent probes and cannot reopen during draining",
  async () => {
    const f = await fixture();
    expect(await f.operations.ready).toBe(true);
    const connect = vi.spyOn(f.pool, "connect");
    const locker = await f.pool.connect();
    try {
      await locker.query("BEGIN");
      await locker.query(
        "LOCK TABLE account_recovery_control IN ACCESS EXCLUSIVE MODE",
      );
      connect.mockClear();
      const probes = Array.from({ length: 12 }, () => f.call("/readyz"));
      await vi.waitFor(() => expect(connect).toHaveBeenCalledOnce());
      await new Promise((resolve) => setTimeout(resolve, 40));
      f.operations.beginDrain();
      await locker.query("ROLLBACK");
      expect(
        (await Promise.all(probes)).every((result) => result.status === 503),
      ).toBe(true);
      expect(connect).toHaveBeenCalledOnce();
      expect((await f.call("/work")).status).toBe(503);
    } finally {
      locker.release();
      connect.mockRestore();
    }
  },
);

it.skipIf(!enabled)(
  "survives loss of its acquired PostgreSQL connection and leaves the next explicit probe usable",
  async () => {
    const f = await fixture();
    expect(await f.operations.ready).toBe(true);
    const client = await f.pool.connect();
    const pid = (await client.query("SELECT pg_backend_pid() AS pid")).rows[0]
      .pid as number;
    client.release();
    const other = f.connect();
    const lock = await other.connect();
    try {
      await lock.query("BEGIN");
      await lock.query(
        "LOCK TABLE account_recovery_control IN ACCESS EXCLUSIVE MODE",
      );
      const result = inspectProductionDatabase(f.pool);
      await vi.waitFor(
        async () => {
          expect(
            (
              await other.query(
                "SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1",
                [pid],
              )
            ).rows[0]?.wait_event_type,
          ).toBe("Lock");
        },
        { timeout: 800, interval: 10 },
      );
      // This PID belongs only to this invocation's isolated synthetic probe.
      expect(
        (await other.query("SELECT pg_terminate_backend($1) AS stopped", [pid]))
          .rows[0].stopped,
      ).toBe(true);
      expect(await result).toBe(false);
    } finally {
      await lock.query("ROLLBACK");
      lock.release();
    }
    expect(await inspectProductionDatabase(f.pool)).toBe(true);
  },
);

it.skipIf(!enabled)(
  "allows an admitted response to finish but denies new requests after drain",
  async () => {
    const f = await fixture();
    expect(await f.operations.ready).toBe(true);
    const response = f.call("/hold");
    await vi.waitFor(() => expect(f.handlers).toHaveLength(1));
    const done = f.operations.waitForDrain(1000);
    expect((await f.call("/work")).status).toBe(503);
    expect((await f.call("/readyz")).status).toBe(503);
    f.handlers[0].send("completed existing response");
    expect((await response).body).toBe("completed existing response");
    expect(await done).toBe(true);
    expect(await f.operations.shutdown(f.server)).toEqual({ drained: true });
  },
);

it.skipIf(!enabled)(
  "bounds forced shutdown, preserves interruption and makes repeated shutdown idempotent",
  async () => {
    const f = await fixture();
    expect(await f.operations.ready).toBe(true);
    const response = f.call("/hold").then(
      () => "unexpected completion",
      () => "interrupted",
    );
    await vi.waitFor(() => expect(f.handlers).toHaveLength(1));
    expect(await f.operations.waitForDrain(15)).toBe(false);
    const stopping = f.operations.shutdown(f.server, 20);
    expect(f.operations.shutdown(f.server, 20)).toBe(stopping);
    expect(await stopping).toEqual({ drained: false });
    expect(await response).toBe("interrupted");
  },
);
