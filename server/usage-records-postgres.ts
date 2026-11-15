import type { Pool } from "pg";
import { usageId } from "./usage-contract";
import {
  RECORD_COLUMNS,
  insertValues,
  recordFromRow,
  reportValues,
  type NewUsageRecord,
  type UsageRecord,
  type UsageRecords,
  type UsageReport,
} from "./usage-records";

/** Usage records in PostgreSQL (migration 0022). Injected pool; the database clock stamps every row. */
export class PostgresUsageRecords implements UsageRecords {
  constructor(
    private database: Pool,
    private syntheticClock?: () => number,
  ) {}
  private async now(): Promise<number> {
    return this.syntheticClock
      ? this.syntheticClock()
      : Number((await this.database.query("SELECT floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint AS now")).rows[0].now);
  }
  async record(input: NewUsageRecord): Promise<void> {
    const values = insertValues(input, await this.now());
    await this.database.query(
      `INSERT INTO usage_records(${RECORD_COLUMNS.split(",").slice(0, 11).join(",")}) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (request_id) DO NOTHING`,
      values,
    );
  }
  async get(accountId: string, requestId: string): Promise<UsageRecord | undefined> {
    usageId.parse(accountId);
    usageId.parse(requestId);
    const row = (
      await this.database.query(`SELECT ${RECORD_COLUMNS} FROM usage_records WHERE account_id=$1 AND request_id=$2`, [accountId, requestId])
    ).rows[0];
    return row ? recordFromRow(row) : undefined;
  }
  async report(accountId: string, requestId: string, report: UsageReport, state: "accepted" | "flagged", note?: string): Promise<boolean> {
    usageId.parse(accountId);
    const values = reportValues(report, state, note, await this.now());
    const result = await this.database.query(
      `UPDATE usage_records SET prompt_tokens=$1,completion_tokens=$2,cached_tokens=$3,reasoning_tokens=$4,audio_seconds=$5,report=$6,report_note=$7,reported_at=$8
      WHERE account_id=$9 AND request_id=$10 AND report='none'`,
      [...values, accountId, requestId],
    );
    return result.rowCount === 1;
  }
  async since(accountId: string, since: number): Promise<UsageRecord[]> {
    usageId.parse(accountId);
    const result = await this.database.query(
      `SELECT ${RECORD_COLUMNS} FROM usage_records WHERE account_id=$1 AND created_at>=$2 ORDER BY created_at,request_id`,
      [accountId, since],
    );
    return result.rows.map(recordFromRow);
  }
  async between(from: number, to: number): Promise<UsageRecord[]> {
    const result = await this.database.query(
      `SELECT ${RECORD_COLUMNS} FROM usage_records WHERE created_at>=$1 AND created_at<$2 ORDER BY created_at,request_id`,
      [from, to],
    );
    return result.rows.map(recordFromRow);
  }
}
