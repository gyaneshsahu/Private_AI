import { expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SqliteUsageLedger } from "../server/usage-ledger";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

it("keeps the exact admission ceiling across concurrent worker processes", async () => {
  const dir = await mkdtemp(join(tmpdir(), "privateai-synthetic-usage-"));
  const path = join(dir, "usage.sqlite");
  const ledger = new SqliteUsageLedger(path, () => 5);
  try {
    ledger.createAllowance({
      accountId: "synthetic",
      periodId: "parallel",
      startsAt: 0,
      endsAt: 10,
      requestLimit: 10,
    });
    const workers = await Promise.all(
      ["one", "two"].map((prefix) =>
        promisify(execFile)(process.execPath, [
          "--import",
          "tsx",
          "tests/fixtures/usage-worker.ts",
          path,
          prefix,
        ]),
      ),
    );
    expect(workers.reduce((total, w) => total + Number(w.stdout), 0)).toBe(10);
    expect(ledger.summary("synthetic")).toMatchObject({
      used: 10,
      remaining: 0,
      state: "exhausted",
    });
  } finally {
    ledger.close();
    await rm(dir, { recursive: true, force: true });
  }
});

it("retains dispatched failures and unfinished reservations across reopen without automatic refunds", async () => {
  const dir = await mkdtemp(join(tmpdir(), "privateai-synthetic-usage-"));
  const path = join(dir, "usage.sqlite");
  let ledger = new SqliteUsageLedger(path, () => 10);
  try {
    ledger.createAllowance({
      accountId: "alice",
      periodId: "p1",
      startsAt: 0,
      endsAt: 100,
      requestLimit: 3,
    });
    expect(ledger.reserve("alice", "a")).toBe(true);
    ledger.dispatch("alice", "a");
    ledger.finish("alice", "a", "uncertain");
    ledger.finish("alice", "a", "uncertain");
    expect(() => ledger.finish("alice", "a", "transport_complete")).toThrow();
    expect(ledger.reserve("alice", "b")).toBe(true);
    expect(ledger.reserve("alice", "c")).toBe(true);
    ledger.dispatch("alice", "c");
    ledger.close();
    ledger = new SqliteUsageLedger(path, () => 20);
    expect(ledger.summary("alice")).toMatchObject({
      state: "exhausted",
      used: 3,
      remaining: 0,
      pending: 2,
      uncertain: 1,
    });
    expect(ledger.reserve("alice", "d")).toBe(false);
    expect(ledger.reserve("alice", "a")).toBe(false);
    expect(ledger.summary("bob")).toEqual({ state: "unavailable" });
    expect(() => ledger.finish("bob", "c", "transport_complete")).toThrow();
  } finally {
    ledger.close();
    await rm(dir, { recursive: true, force: true });
  }
});

it("admits against the same durable allowance through two connections and rotates only to explicit periods", async () => {
  const dir = await mkdtemp(join(tmpdir(), "privateai-synthetic-usage-"));
  let now = 5;
  const a = new SqliteUsageLedger(join(dir, "usage.sqlite"), () => now);
  const b = new SqliteUsageLedger(join(dir, "usage.sqlite"), () => now);
  try {
    a.createAllowance({
      accountId: "alice",
      periodId: "p1",
      startsAt: 0,
      endsAt: 10,
      requestLimit: 2,
    });
    expect(() =>
      b.createAllowance({
        accountId: "alice",
        periodId: "overlap",
        startsAt: 5,
        endsAt: 20,
        requestLimit: 100,
      }),
    ).toThrow();
    expect(a.reserve("alice", "r1")).toBe(true);
    expect(b.reserve("alice", "r2")).toBe(true);
    expect(a.reserve("alice", "r3")).toBe(false);
    expect(b.reserve("bob", "r1")).toBe(false);
    now = 10;
    expect(a.summary("alice")).toEqual({ state: "unavailable" });
    expect(b.reserve("alice", "r3")).toBe(false);
    a.createAllowance({
      accountId: "alice",
      periodId: "p2",
      startsAt: 10,
      endsAt: 20,
      requestLimit: 1,
    });
    expect(b.reserve("alice", "r3")).toBe(true);
    b.dispatch("alice", "r3");
    b.finish("alice", "r3", "transport_complete");
    expect(a.summary("alice")).toMatchObject({
      used: 1,
      pending: 0,
      uncertain: 0,
    });
    expect(() => a.dispatch("alice", "r3")).toThrow();
    expect(() =>
      a.createAllowance({
        accountId: "bob",
        periodId: "bad",
        startsAt: 0,
        endsAt: 0,
        requestLimit: 1,
      }),
    ).toThrow();
    expect(() =>
      a.createAllowance({
        accountId: "bob",
        periodId: "bad",
        startsAt: 0,
        endsAt: 10,
        requestLimit: NaN,
      }),
    ).toThrow();
  } finally {
    a.close();
    b.close();
    await rm(dir, { recursive: true, force: true });
  }
});

it("records completed-request metering once and never for uncertain outcomes", async () => {
  const ledger = new SqliteUsageLedger(":memory:", () => 10);
  try {
    ledger.createAllowance({
      accountId: "alice",
      periodId: "p",
      startsAt: 0,
      endsAt: 100,
      requestLimit: 3,
    });
    const metrics = {
      promptTokens: 12,
      completionTokens: 34,
      model: "m",
      costUsd: "0.000046",
    };
    expect(ledger.reserve("alice", "a")).toBe(true);
    ledger.dispatch("alice", "a");
    ledger.finish("alice", "a", "transport_complete", metrics);
    ledger.finish("alice", "a", "transport_complete", {
      ...metrics,
      promptTokens: 99,
    });
    expect(ledger.metrics("a")).toEqual(metrics);
    expect(ledger.reserve("alice", "b")).toBe(true);
    ledger.dispatch("alice", "b");
    ledger.finish("alice", "b", "uncertain", metrics);
    expect(ledger.metrics("b")).toBeUndefined();
    expect(ledger.reserve("alice", "c")).toBe(true);
    ledger.dispatch("alice", "c");
    expect(() =>
      ledger.finish("alice", "c", "transport_complete", {
        ...metrics,
        model: "bad model",
      }),
    ).toThrow();
    expect(ledger.metrics("c")).toBeUndefined();
    expect(ledger.summary("alice")).toMatchObject({
      used: 3,
      pending: 1,
      uncertain: 1,
    });
  } finally {
    ledger.close();
  }
});
