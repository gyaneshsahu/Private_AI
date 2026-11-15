// Storage for background tasks and their undelivered results (docs/background-tasks-20261115.md).
// Rows hold sealed values only (server/background-crypto.ts) beside the plain fields the scheduler
// needs: times, pause, skip count and the consent record (version, time, sensitive: no content).
// PostgreSQL in production (migration 0021), memory for the development server and offline tests.
import type { Pool } from "pg";

export interface TaskRow {
  taskId: string;
  accountId: string;
  /** Sealed JSON: the task, its attachment text and the hashes of results already reported. */
  payload: string;
  nextDueAt: number;
  /** nextDueAt plus this task's fixed spread, so tasks set for the same minute do not all start at once. */
  runAfter: number;
  paused: boolean;
  /** Runs skipped in a row for want of allowance; the task pauses at BACKGROUND_LIMITS.skipsBeforePause. */
  skips: number;
  lastRunAt?: number;
  consent: { version: string; at: number; sensitive: boolean };
  createdAt: number;
}
export type ResultStatus = "done" | "failed" | "skipped";
export interface ResultRow {
  resultId: string;
  taskId: string;
  accountId: string;
  ranAt: number;
  status: ResultStatus;
  /** A fixed code (snake case), never content. */
  reason?: string;
  /** Sealed answer text. */
  text?: string;
  promptTokens?: number;
  completionTokens?: number;
  expiresAt: number;
}
export type TaskPatch = Partial<Pick<TaskRow, "payload" | "nextDueAt" | "runAfter" | "paused" | "skips" | "lastRunAt" | "consent">>;
/** UTC hours [from, to) in which runs may start; absent means any hour. */
export interface RunWindow {
  from: number;
  to: number;
}

export interface BackgroundStore {
  tasks(accountId: string): Promise<TaskRow[]>;
  task(accountId: string, taskId: string): Promise<TaskRow | undefined>;
  /** Inserts unless the account already has `max` tasks or the id is taken; one atomic check. */
  insertTask(row: TaskRow, max: number): Promise<"ok" | "full" | "exists">;
  updateTask(accountId: string, taskId: string, patch: TaskPatch): Promise<boolean>;
  /** Deletes the task and every stored result of it. */
  deleteTask(accountId: string, taskId: string): Promise<void>;
  /**
   * Claims the earliest task due by `now` for `leaseMs` (a run in progress), skipping paused tasks,
   * accounts that are closing or suspended, and tasks another process holds. Two processes never
   * claim the same task.
   */
  claimDue(now: number, leaseMs: number): Promise<TaskRow | undefined>;
  /** Ends a claim with the run's changes. */
  release(taskId: string, patch: TaskPatch): Promise<void>;
  /** Adds a result and keeps only the newest `keep` of that task. */
  insertResult(row: ResultRow, keep: number): Promise<void>;
  results(accountId: string): Promise<ResultRow[]>;
  /** The browser saved it in the vault: deleted at once. */
  ack(accountId: string, resultId: string): Promise<void>;
  /** Deletes results past their expiry; returns how many. */
  purge(now: number): Promise<number>;
  /** Every sealed value not under `keyId`, for re-sealing after a key change. */
  staleSealed(keyId: string): Promise<{ kind: "task" | "result"; id: string; accountId: string; sealed: string }[]>;
  reseal(kind: "task" | "result", id: string, sealed: string): Promise<void>;
}

export const inWindow = (window: RunWindow | undefined, now: number) => {
  if (!window) return true;
  const hour = new Date(now).getUTCHours();
  return window.from < window.to ? hour >= window.from && hour < window.to : hour >= window.from || hour < window.to;
};

/** In memory: the development server (lost on restart) and the offline tests. */
export class MemoryBackgroundStore implements BackgroundStore {
  readonly taskRows = new Map<string, TaskRow & { claimedUntil?: number }>();
  readonly resultRows = new Map<string, ResultRow>();
  constructor(private closedAccounts: () => Set<string> = () => new Set()) {}
  private copy = <T>(row: T): T => structuredClone(row);
  async tasks(accountId: string) {
    return [...this.taskRows.values()]
      .filter((t) => t.accountId === accountId)
      .sort((a, b) => a.createdAt - b.createdAt)
      .map(({ claimedUntil: _, ...row }) => this.copy(row));
  }
  async task(accountId: string, taskId: string) {
    const row = this.taskRows.get(taskId);
    if (row?.accountId !== accountId) return undefined;
    const { claimedUntil: _, ...plain } = row;
    return this.copy(plain);
  }
  async insertTask(row: TaskRow, max: number) {
    if (this.taskRows.has(row.taskId)) return "exists" as const;
    if ((await this.tasks(row.accountId)).length >= max) return "full" as const;
    this.taskRows.set(row.taskId, this.copy(row));
    return "ok" as const;
  }
  async updateTask(accountId: string, taskId: string, patch: TaskPatch) {
    const row = this.taskRows.get(taskId);
    if (row?.accountId !== accountId) return false;
    Object.assign(row, this.copy(patch));
    return true;
  }
  async deleteTask(accountId: string, taskId: string) {
    if (this.taskRows.get(taskId)?.accountId !== accountId) return;
    this.taskRows.delete(taskId);
    for (const [id, r] of this.resultRows) if (r.taskId === taskId) this.resultRows.delete(id);
  }
  async claimDue(now: number, leaseMs: number) {
    const closed = this.closedAccounts();
    const due = [...this.taskRows.values()]
      .filter((t) => !t.paused && t.runAfter <= now && !(t.claimedUntil! > now) && !closed.has(t.accountId))
      .sort((a, b) => a.runAfter - b.runAfter)[0];
    if (!due) return undefined;
    due.claimedUntil = now + leaseMs;
    const { claimedUntil: _, ...row } = due;
    return this.copy(row);
  }
  async release(taskId: string, patch: TaskPatch) {
    const row = this.taskRows.get(taskId);
    if (!row) return;
    Object.assign(row, this.copy(patch));
    row.claimedUntil = undefined;
  }
  async insertResult(row: ResultRow, keep: number) {
    if (!this.taskRows.has(row.taskId)) return; // deleted while it ran
    this.resultRows.set(row.resultId, this.copy(row));
    const mine = [...this.resultRows.values()].filter((r) => r.taskId === row.taskId).sort((a, b) => b.ranAt - a.ranAt);
    for (const old of mine.slice(keep)) this.resultRows.delete(old.resultId);
  }
  async results(accountId: string) {
    return [...this.resultRows.values()]
      .filter((r) => r.accountId === accountId)
      .sort((a, b) => a.ranAt - b.ranAt)
      .map(this.copy);
  }
  async ack(accountId: string, resultId: string) {
    if (this.resultRows.get(resultId)?.accountId === accountId) this.resultRows.delete(resultId);
  }
  async purge(now: number) {
    let n = 0;
    for (const [id, r] of this.resultRows) if (r.expiresAt <= now && this.resultRows.delete(id)) n++;
    return n;
  }
  async staleSealed(keyId: string) {
    const stale = (s: string) => !s.startsWith(`${keyId}.`);
    return [
      ...[...this.taskRows.values()]
        .filter((t) => stale(t.payload))
        .map((t) => ({ kind: "task" as const, id: t.taskId, accountId: t.accountId, sealed: t.payload })),
      ...[...this.resultRows.values()]
        .filter((r) => r.text && stale(r.text))
        .map((r) => ({ kind: "result" as const, id: r.resultId, accountId: r.accountId, sealed: r.text! })),
    ];
  }
  async reseal(kind: "task" | "result", id: string, sealed: string) {
    if (kind === "task") {
      const row = this.taskRows.get(id);
      if (row) row.payload = sealed;
    } else {
      const row = this.resultRows.get(id);
      if (row) row.text = sealed;
    }
  }
}

const TASK_COLUMNS =
  "task_id,account_id,payload,next_due_at,run_after,paused,skips,last_run_at,consent_version,consent_at,consent_sensitive,created_at";
type TaskRecord = Record<string, unknown>;
const taskFrom = (r: TaskRecord): TaskRow => ({
  taskId: String(r.task_id),
  accountId: String(r.account_id),
  payload: String(r.payload),
  nextDueAt: Number(r.next_due_at),
  runAfter: Number(r.run_after),
  paused: r.paused === true,
  skips: Number(r.skips),
  ...(r.last_run_at != null ? { lastRunAt: Number(r.last_run_at) } : {}),
  consent: { version: String(r.consent_version), at: Number(r.consent_at), sensitive: r.consent_sensitive === true },
  createdAt: Number(r.created_at),
});
const resultFrom = (r: TaskRecord): ResultRow => ({
  resultId: String(r.result_id),
  taskId: String(r.task_id),
  accountId: String(r.account_id),
  ranAt: Number(r.ran_at),
  status: r.status as ResultStatus,
  ...(r.reason != null ? { reason: String(r.reason) } : {}),
  ...(r.text_sealed != null ? { text: String(r.text_sealed) } : {}),
  ...(r.prompt_tokens != null ? { promptTokens: Number(r.prompt_tokens) } : {}),
  ...(r.completion_tokens != null ? { completionTokens: Number(r.completion_tokens) } : {}),
  expiresAt: Number(r.expires_at),
});
/** Patch fields to SQL columns, in a fixed order. */
const PATCH_COLUMNS: [keyof TaskPatch, string[], (p: TaskPatch) => unknown[]][] = [
  ["payload", ["payload"], (p) => [p.payload]],
  ["nextDueAt", ["next_due_at"], (p) => [p.nextDueAt]],
  ["runAfter", ["run_after"], (p) => [p.runAfter]],
  ["paused", ["paused"], (p) => [p.paused]],
  ["skips", ["skips"], (p) => [p.skips]],
  ["lastRunAt", ["last_run_at"], (p) => [p.lastRunAt]],
  ["consent", ["consent_version", "consent_at", "consent_sensitive"], (p) => [p.consent!.version, p.consent!.at, p.consent!.sensitive]],
];
function setClause(patch: TaskPatch, first: number) {
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const [key, columns, read] of PATCH_COLUMNS)
    if (patch[key] !== undefined) {
      const v = read(patch);
      columns.forEach((c, i) => {
        values.push(v[i]);
        sets.push(`${c}=$${first + values.length - 1}`);
      });
    }
  return { sets, values };
}

/** Production: tables from migration 0021, used by the restricted runtime role. */
export class PostgresBackgroundStore implements BackgroundStore {
  constructor(private database: Pick<Pool, "query" | "connect">) {}
  async tasks(accountId: string) {
    const { rows } = await this.database.query(
      `SELECT ${TASK_COLUMNS} FROM background_tasks WHERE account_id=$1 ORDER BY created_at`,
      [accountId],
    );
    return rows.map(taskFrom);
  }
  async task(accountId: string, taskId: string) {
    const { rows } = await this.database.query(
      `SELECT ${TASK_COLUMNS} FROM background_tasks WHERE account_id=$1 AND task_id=$2`,
      [accountId, taskId],
    );
    return rows[0] ? taskFrom(rows[0]) : undefined;
  }
  async insertTask(row: TaskRow, max: number) {
    // The account's "user" row is locked first, so two inserts for one account count in turn.
    const client = await this.database.connect();
    try {
      await client.query("BEGIN");
      await client.query('SELECT id FROM "user" WHERE id=$1 FOR UPDATE', [row.accountId]);
      const outcome = (await client.query("SELECT 1 FROM background_tasks WHERE task_id=$1", [row.taskId])).rows.length
        ? ("exists" as const)
        : Number((await client.query("SELECT count(*) AS n FROM background_tasks WHERE account_id=$1", [row.accountId])).rows[0].n) >= max
          ? ("full" as const)
          : ("ok" as const);
      if (outcome === "ok")
        await client.query(`INSERT INTO background_tasks (${TASK_COLUMNS}) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, [
          row.taskId,
          row.accountId,
          row.payload,
          row.nextDueAt,
          row.runAfter,
          row.paused,
          row.skips,
          row.lastRunAt ?? null,
          row.consent.version,
          row.consent.at,
          row.consent.sensitive,
          row.createdAt,
        ]);
      await client.query("COMMIT");
      return outcome;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  async updateTask(accountId: string, taskId: string, patch: TaskPatch) {
    const { sets, values } = setClause(patch, 3);
    if (!sets.length) return !!(await this.task(accountId, taskId));
    const result = await this.database.query(
      `UPDATE background_tasks SET ${sets.join(",")} WHERE account_id=$1 AND task_id=$2`,
      [accountId, taskId, ...values],
    );
    return (result as { rowCount?: number | null }).rowCount === 1;
  }
  async deleteTask(accountId: string, taskId: string) {
    // Results go with the task (ON DELETE CASCADE); named here too so the intent is plain.
    await this.database.query("DELETE FROM background_results WHERE account_id=$1 AND task_id=$2", [accountId, taskId]);
    await this.database.query("DELETE FROM background_tasks WHERE account_id=$1 AND task_id=$2", [accountId, taskId]);
  }
  async claimDue(now: number, leaseMs: number) {
    const { rows } = await this.database.query(
      `UPDATE background_tasks SET claimed_until=$2 WHERE task_id = (
        SELECT t.task_id FROM background_tasks t
        WHERE NOT t.paused AND t.run_after<=$1 AND (t.claimed_until IS NULL OR t.claimed_until<=$1)
        AND NOT EXISTS (SELECT 1 FROM account_closure c WHERE c."userId"=t.account_id)
        ORDER BY t.run_after LIMIT 1 FOR UPDATE SKIP LOCKED)
      RETURNING ${TASK_COLUMNS}`,
      [now, now + leaseMs],
    );
    return rows[0] ? taskFrom(rows[0]) : undefined;
  }
  async release(taskId: string, patch: TaskPatch) {
    const { sets, values } = setClause(patch, 2);
    await this.database.query(
      `UPDATE background_tasks SET ${[...sets, "claimed_until=NULL"].join(",")} WHERE task_id=$1`,
      [taskId, ...values],
    );
  }
  async insertResult(row: ResultRow, keep: number) {
    await this.database.query(
      `INSERT INTO background_results (result_id,task_id,account_id,ran_at,status,reason,text_sealed,prompt_tokens,completion_tokens,expires_at)
      SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10 WHERE EXISTS (SELECT 1 FROM background_tasks WHERE task_id=$2)`,
      [
        row.resultId,
        row.taskId,
        row.accountId,
        row.ranAt,
        row.status,
        row.reason ?? null,
        row.text ?? null,
        row.promptTokens ?? null,
        row.completionTokens ?? null,
        row.expiresAt,
      ],
    );
    await this.database.query(
      `DELETE FROM background_results WHERE task_id=$1 AND result_id NOT IN (
        SELECT result_id FROM background_results WHERE task_id=$1 ORDER BY ran_at DESC LIMIT $2)`,
      [row.taskId, keep],
    );
  }
  async results(accountId: string) {
    const { rows } = await this.database.query(
      "SELECT * FROM background_results WHERE account_id=$1 ORDER BY ran_at",
      [accountId],
    );
    return rows.map(resultFrom);
  }
  async ack(accountId: string, resultId: string) {
    await this.database.query("DELETE FROM background_results WHERE account_id=$1 AND result_id=$2", [accountId, resultId]);
  }
  async purge(now: number) {
    const result = await this.database.query("DELETE FROM background_results WHERE expires_at<=$1", [now]);
    return Number((result as { rowCount?: number | null }).rowCount ?? 0);
  }
  async staleSealed(keyId: string) {
    const prefix = `${keyId}.%`;
    const tasks = await this.database.query(
      "SELECT task_id AS id, account_id, payload AS sealed FROM background_tasks WHERE payload NOT LIKE $1",
      [prefix],
    );
    const results = await this.database.query(
      "SELECT result_id AS id, account_id, text_sealed AS sealed FROM background_results WHERE text_sealed IS NOT NULL AND text_sealed NOT LIKE $1",
      [prefix],
    );
    return [
      ...tasks.rows.map((r) => ({ kind: "task" as const, id: String(r.id), accountId: String(r.account_id), sealed: String(r.sealed) })),
      ...results.rows.map((r) => ({ kind: "result" as const, id: String(r.id), accountId: String(r.account_id), sealed: String(r.sealed) })),
    ];
  }
  async reseal(kind: "task" | "result", id: string, sealed: string) {
    await this.database.query(
      kind === "task"
        ? "UPDATE background_tasks SET payload=$2 WHERE task_id=$1"
        : "UPDATE background_results SET text_sealed=$2 WHERE result_id=$1",
      [id, sealed],
    );
  }
}
