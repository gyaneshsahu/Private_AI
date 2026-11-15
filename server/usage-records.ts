// Usage records (docs/usage-metering-20261115.md): one row per request the relay forwarded, paid
// or free, with the feature, the units charged, the weight version, what the relay itself measured
// (encrypted byte sizes, duration, model) and, once the browser reports them, the token counts it
// read from the decrypted reply. Numbers only: never content, never a title, never a prompt.
// Allowance itself stays in the usage ledger (usage_requests); these rows explain it per feature.
import { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { FEATURES, type Feature } from "../shared/usage-config";
import { usageId } from "./usage-contract";

type Result<T> = T | Promise<T>;
export type RecordOutcome = "complete" | "interrupted" | "refused";
export type ReportState = "none" | "accepted" | "flagged";

export interface NewUsageRecord {
  requestId: string;
  accountId: string;
  feature: Feature;
  units: number;
  weightVersion: number;
  outcome: RecordOutcome;
  model?: string;
  requestBytes?: number;
  responseBytes?: number;
  durationMs?: number;
}
export interface UsageRecord extends NewUsageRecord {
  createdAt: number;
  promptTokens?: number;
  completionTokens?: number;
  cachedTokens?: number;
  reasoningTokens?: number;
  audioSeconds?: number;
  report: ReportState;
  reportNote?: string;
}

const count = z.number().int().min(0).max(10_000_000);
/** What the browser may report about one of its own requests. Nothing else is accepted. */
export const usageReportSchema = z
  .object({
    requestId: usageId,
    promptTokens: count,
    completionTokens: count,
    cachedTokens: count.optional(),
    reasoningTokens: count.optional(),
    audioSeconds: z.number().int().min(0).max(3600).optional(),
  })
  .strict();
export type UsageReport = z.infer<typeof usageReportSchema>;

const recordSchema = z
  .object({
    requestId: usageId,
    accountId: usageId,
    feature: z.enum(FEATURES),
    units: z.number().int().min(0).max(20),
    weightVersion: z.number().int().min(1).max(10_000),
    outcome: z.enum(["complete", "interrupted", "refused"]),
    model: z.string().regex(/^[a-zA-Z0-9._-]{1,64}$/).optional(),
    requestBytes: z.number().int().min(0).max(100_000_000).optional(),
    responseBytes: z.number().int().min(0).max(1_000_000_000).optional(),
    durationMs: z.number().int().min(0).max(86_400_000).optional(),
  })
  .strict();

export interface UsageRecords {
  /** Adds one record; a repeated request id is ignored. */
  record(input: NewUsageRecord): Result<void>;
  /** One of the account's own records; another account's id reads as absent. */
  get(accountId: string, requestId: string): Result<UsageRecord | undefined>;
  /** Stores the browser's report once; false when the record is missing or already reported. */
  report(accountId: string, requestId: string, report: UsageReport, state: "accepted" | "flagged", note?: string): Result<boolean>;
  /** The account's records created at or after `since`, oldest first. */
  since(accountId: string, since: number): Result<UsageRecord[]>;
  /** Every account's records created in [from, to), oldest first (operator scripts). */
  between(from: number, to: number): Result<UsageRecord[]>;
}

/**
 * Plausibility bounds for a browser report, checked against what the relay measured itself.
 * shortcut: first estimates, not calibrated on live traffic; scripts/usage-metering.ts suggest
 * prints the observed bytes per token, so tighten these after the first week of the alpha.
 */
export const PLAUSIBILITY = {
  /**
   * A prompt token is at least one byte of the encrypted body. Measured by the lead on 15 November:
   * the encryption adds about 0.15 % to a request body (518,714 bytes became 519,512), so the
   * encrypted size is the plaintext size for these bounds.
   */
  minBytesPerPromptToken: 1,
  /** JSON escaping of non-Latin text is the worst case (about 6 bytes per character, several per token). */
  maxBytesPerPromptToken: 32,
  promptOverheadBytes: 4096,
  /** Each streamed event is encrypted on its own, so one short token can take a few hundred bytes. */
  maxBytesPerCompletionToken: 2048,
  responseOverheadBytes: 8192,
  maxTokensPerSecond: 2000,
  /** A report later than this after the record is refused. */
  reportWindowMs: 15 * 60_000,
} as const;

/**
 * Why a report is implausible (a fixed code), or undefined when it fits what the relay saw.
 * The units charged never depend on it: they were fixed by the relay before the request went out.
 */
export function implausible(record: UsageRecord, report: UsageReport, maxOutputTokens?: number): string | undefined {
  const p = PLAUSIBILITY;
  const { promptTokens: prompt, completionTokens: completion } = report;
  if (record.outcome !== "complete") return "not_complete";
  if ((report.cachedTokens ?? 0) > prompt) return "cached_above_prompt";
  if ((report.reasoningTokens ?? 0) > completion) return "reasoning_above_completion";
  if (record.requestBytes !== undefined) {
    if (prompt * p.minBytesPerPromptToken > record.requestBytes) return "prompt_above_bytes";
    // A picture is many bytes but few tokens, so only text requests have a lower bound.
    if (record.feature !== "image" && prompt * p.maxBytesPerPromptToken + p.promptOverheadBytes < record.requestBytes)
      return "prompt_below_bytes";
  }
  if (maxOutputTokens !== undefined && completion > maxOutputTokens) return "completion_above_limit";
  if (record.responseBytes !== undefined && completion * p.maxBytesPerCompletionToken + p.responseOverheadBytes < record.responseBytes)
    return "completion_below_bytes";
  if (record.durationMs !== undefined && completion > p.maxTokensPerSecond * Math.max(1, record.durationMs / 1000))
    return "too_fast";
  return undefined;
}

const COLUMNS =
  "request_id,account_id,created_at,feature,units,weight_version,outcome,model,request_bytes,response_bytes,duration_ms,prompt_tokens,completion_tokens,cached_tokens,reasoning_tokens,audio_seconds,report,report_note";
export const RECORD_COLUMNS = COLUMNS;
const optional = (value: unknown) => (value == null ? undefined : Number(value));
/** A database row (either store) as a record; absent numbers stay absent. */
export function recordFromRow(row: Record<string, unknown>): UsageRecord {
  const value: UsageRecord = {
    requestId: String(row.request_id),
    accountId: String(row.account_id),
    createdAt: Number(row.created_at),
    feature: row.feature as Feature,
    units: Number(row.units),
    weightVersion: Number(row.weight_version),
    outcome: row.outcome as RecordOutcome,
    report: row.report as ReportState,
  };
  const extra: Partial<UsageRecord> = {
    model: row.model == null ? undefined : String(row.model),
    requestBytes: optional(row.request_bytes),
    responseBytes: optional(row.response_bytes),
    durationMs: optional(row.duration_ms),
    promptTokens: optional(row.prompt_tokens),
    completionTokens: optional(row.completion_tokens),
    cachedTokens: optional(row.cached_tokens),
    reasoningTokens: optional(row.reasoning_tokens),
    audioSeconds: optional(row.audio_seconds),
    reportNote: row.report_note == null ? undefined : String(row.report_note),
  };
  for (const [key, field] of Object.entries(extra)) if (field !== undefined) Object.assign(value, { [key]: field });
  return value;
}
/** Insert parameters in COLUMNS order (created_at supplied by the store). */
export function insertValues(input: NewUsageRecord, createdAt: number) {
  const r = recordSchema.parse(input);
  return [
    r.requestId, r.accountId, createdAt, r.feature, r.units, r.weightVersion, r.outcome,
    r.model ?? null, r.requestBytes ?? null, r.responseBytes ?? null, r.durationMs ?? null,
  ];
}
export function reportValues(report: UsageReport, state: "accepted" | "flagged", note: string | undefined, now: number) {
  const r = usageReportSchema.parse(report);
  if (note !== undefined && !/^[a-z_]{1,40}$/.test(note)) throw Error("Invalid report note.");
  return [r.promptTokens, r.completionTokens, r.cachedTokens ?? null, r.reasoningTokens ?? null, r.audioSeconds ?? null, state, note ?? null, now];
}

/** Offline and test store (node:sqlite); production uses PostgresUsageRecords. */
export class SqliteUsageRecords implements UsageRecords {
  private db: DatabaseSync;
  constructor(
    path: string,
    private now = Date.now,
  ) {
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS usage_records (
        request_id TEXT PRIMARY KEY, account_id TEXT NOT NULL, created_at INTEGER NOT NULL,
        feature TEXT NOT NULL, units INTEGER NOT NULL, weight_version INTEGER NOT NULL,
        outcome TEXT NOT NULL CHECK(outcome IN ('complete','interrupted','refused')),
        model TEXT, request_bytes INTEGER, response_bytes INTEGER, duration_ms INTEGER,
        prompt_tokens INTEGER, completion_tokens INTEGER, cached_tokens INTEGER, reasoning_tokens INTEGER,
        audio_seconds INTEGER, report TEXT NOT NULL DEFAULT 'none' CHECK(report IN ('none','accepted','flagged')),
        report_note TEXT, reported_at INTEGER
      );
      CREATE INDEX IF NOT EXISTS usage_records_account ON usage_records(account_id, created_at);
      CREATE INDEX IF NOT EXISTS usage_records_created ON usage_records(created_at);`);
  }
  record(input: NewUsageRecord) {
    this.db
      .prepare(`INSERT OR IGNORE INTO usage_records(${COLUMNS.split(",").slice(0, 11).join(",")}) VALUES(?,?,?,?,?,?,?,?,?,?,?)`)
      .run(...(insertValues(input, this.now()) as (string | number | null)[]));
  }
  get(accountId: string, requestId: string) {
    usageId.parse(accountId);
    usageId.parse(requestId);
    const row = this.db.prepare(`SELECT ${COLUMNS} FROM usage_records WHERE account_id=? AND request_id=?`).get(accountId, requestId);
    return row ? recordFromRow(row) : undefined;
  }
  report(accountId: string, requestId: string, report: UsageReport, state: "accepted" | "flagged", note?: string) {
    usageId.parse(accountId);
    const values = reportValues(report, state, note, this.now()) as (string | number | null)[];
    return (
      this.db
        .prepare(
          `UPDATE usage_records SET prompt_tokens=?,completion_tokens=?,cached_tokens=?,reasoning_tokens=?,audio_seconds=?,report=?,report_note=?,reported_at=?
          WHERE account_id=? AND request_id=? AND report='none'`,
        )
        .run(...values, accountId, requestId).changes === 1
    );
  }
  since(accountId: string, since: number) {
    usageId.parse(accountId);
    return this.db
      .prepare(`SELECT ${COLUMNS} FROM usage_records WHERE account_id=? AND created_at>=? ORDER BY created_at,request_id`)
      .all(accountId, since)
      .map(recordFromRow);
  }
  between(from: number, to: number) {
    return this.db
      .prepare(`SELECT ${COLUMNS} FROM usage_records WHERE created_at>=? AND created_at<? ORDER BY created_at,request_id`)
      .all(from, to)
      .map(recordFromRow);
  }
  close() {
    this.db.close();
  }
}
