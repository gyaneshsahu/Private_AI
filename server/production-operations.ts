import type { RequestHandler } from "express";
import type { Server } from "node:http";
import type { Pool, PoolClient } from "pg";
import { planAccountMigrations } from "./account-migrations";
import { accountRecoveryOpen } from "./account-restore";
import { operationMetrics } from "./operation-metrics";

/** No migrations, retries or recovery-state changes. Late acquisitions are released. */
export function inspectProductionDatabase(
  database: Pool,
  deadlineMs = 5000,
): Promise<boolean> {
  if (!Number.isInteger(deadlineMs) || deadlineMs < 1 || deadlineMs > 5000)
    throw Error("Invalid production inspection deadline.");
  return new Promise((resolve) => {
    let finished = false;
    let connection: PoolClient | undefined;
    const disconnected = () => finish(false, true);
    const finish = (healthy: boolean, discard = false) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      connection?.off("error", disconnected);
      connection?.release(discard);
      connection = undefined;
      resolve(healthy);
    };
    const timer = setTimeout(() => finish(false, true), deadlineMs);
    database.connect((error, client, release) => {
      if (finished) {
        if (client) release();
        return;
      }
      if (error || !client) {
        finish(false);
        return;
      }
      connection = client;
      client.on("error", disconnected);
      void (async () => {
        await client.query("BEGIN READ ONLY");
        await client.query("SET LOCAL statement_timeout='1500ms'");
        await client.query("SET LOCAL lock_timeout='1000ms'");
        await client.query(
          "SET LOCAL idle_in_transaction_session_timeout='2000ms'",
        );
        const plan = await planAccountMigrations(client);
        const open = await accountRecoveryOpen(client);
        await client.query("COMMIT");
        finish(plan.pending.length === 0 && open);
      })().catch(() => finish(false, true));
    });
  });
}

/** Admission/readiness for the inactive candidate, not provider or release qualification. */
export function productionOperations(database: Pool) {
  const metrics = operationMetrics();
  let started = false;
  let draining = false;
  let pending: Promise<boolean> | undefined;
  let active = 0;
  const empty = new Set<() => void>();
  const inspect = () => {
    if (draining) return Promise.resolve(false);
    pending ??= inspectProductionDatabase(database).finally(() => {
      pending = undefined;
    });
    return pending;
  };
  const ready = inspect().then((valid) => {
    started = valid;
    return valid;
  });
  const middleware: RequestHandler = async (req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    if (req.method === "GET" && req.originalUrl === "/healthz") {
      res.type("text/plain").send("ok");
      return;
    }
    if (req.method === "GET" && req.originalUrl === "/readyz") {
      const healthy = started && !draining && (await inspect()) && !draining;
      metrics.probe(healthy);
      res
        .status(healthy ? 200 : 503)
        .type("text/plain")
        .send(healthy ? "ready" : "unavailable");
      return;
    }
    if (!started || draining) {
      metrics.rejectAdmission();
      res.setHeader("Retry-After", "5");
      res.status(503).json({
        code: "SERVICE_NOT_ADMITTED",
        error: "Service temporarily unavailable. No new request was started.",
      });
      return;
    }
    active++;
    const record = metrics.admit();
    let done = false;
    const complete = () => {
      if (done) return;
      done = true;
      res.off("finish", complete);
      res.off("close", complete);
      active--;
      record(res.statusCode, res.writableFinished);
      if (active === 0) for (const notify of [...empty]) notify();
    };
    res.once("finish", complete);
    res.once("close", complete);
    next();
  };
  const beginDrain = () => {
    draining = true;
  };
  const waitForDrain = (deadlineMs = 10_000) => {
    if (!Number.isInteger(deadlineMs) || deadlineMs < 1 || deadlineMs > 30_000)
      throw Error("Invalid drain deadline.");
    beginDrain();
    if (!active) return Promise.resolve(true);
    return new Promise<boolean>((resolve) => {
      const complete = (clean: boolean) => {
        clearTimeout(timer);
        empty.delete(onEmpty);
        resolve(clean);
      };
      const onEmpty = () => complete(true);
      const timer = setTimeout(() => complete(false), deadlineMs);
      empty.add(onEmpty);
    });
  };
  let stopping: Promise<{ drained: boolean }> | undefined;
  const shutdown = (server: Server, deadlineMs = 10_000) => {
    if (stopping) return stopping;
    if (!Number.isInteger(deadlineMs) || deadlineMs < 1 || deadlineMs > 30_000)
      throw Error("Invalid drain deadline.");
    // The caller owns pool lifetime and process exit; never close another replica's pool here.
    beginDrain();
    stopping = new Promise((resolve) => {
      let finished = false;
      const finish = (clean: boolean) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        resolve({ drained: clean });
      };
      const timer = setTimeout(() => {
        finish(false);
        server.closeAllConnections();
      }, deadlineMs);
      server.close(() => finish(active === 0));
      server.closeIdleConnections();
    });
    return stopping;
  };
  const snapshot = () => ({
    schemaVersion: 1 as const,
    scope: "process" as const,
    admission: draining
      ? ("draining" as const)
      : started
        ? ("open" as const)
        : ("unavailable" as const),
    ...metrics.snapshot(),
  });
  return { ready, middleware, beginDrain, waitForDrain, shutdown, snapshot };
}
