import { requestPurgeFunctionSql } from "./request-retention";
import { autoAllowanceFunctionSql } from "./usage-postgres";

/** SQL for operator review only. Does not create roles, passwords, databases or execute grants. */
export function accountPrivilegePlan(input: {
  schema: string;
  runtimeRole: string;
  noticeRole: string;
}): string[] {
  const identifier = (value: string) => {
    if (!/^[a-z][a-z0-9_]{0,62}$/.test(value))
      throw Error("Simple PostgreSQL identifier required.");
    return `"${value}"`;
  };
  if (input.runtimeRole === input.noticeRole)
    throw Error("Separate runtime and notice identities required.");
  const schema = identifier(input.schema),
    runtime = identifier(input.runtimeRole),
    notice = identifier(input.noticeRole);
  const table = (name: string) => `${schema}."${name}"`;
  return [
    `GRANT USAGE ON SCHEMA ${schema} TO ${runtime},${notice}`,
    `GRANT SELECT,INSERT,UPDATE,DELETE ON ${["user", "session", "account", "verification", "passkey", "rateLimit", "research_consent", "consumer_request_count", "account_email_proof", "account_credential_change"].map(table).join(",")} TO ${runtime}`,
    `GRANT SELECT ON ${["privateai_schema_migrations", "account_recovery_control", "usage_accounts", "usage_allowances"].map(table).join(",")} TO ${runtime}`,
    // PostgreSQL row locking requires UPDATE privilege; control mode stays read-only.
    `GRANT UPDATE ("updatedAt") ON ${table("account_recovery_control")} TO ${runtime},${notice}`,
    `GRANT UPDATE (account_id) ON ${table("usage_accounts")} TO ${runtime}`,
    `GRANT SELECT,INSERT ON ${table("usage_requests")} TO ${runtime}`,
    `GRANT UPDATE (state,updated_at) ON ${table("usage_requests")} TO ${runtime}`,
    // Completed-request metering (migration 0013): read for the usage summary, insert at settlement.
    `GRANT SELECT,INSERT ON ${table("usage_metrics")} TO ${runtime}`,
    // Usage records (migration 0022): one row per forwarded request; only the browser's token report is updated.
    `GRANT SELECT,INSERT ON ${table("usage_records")} TO ${runtime}`,
    `GRANT UPDATE (prompt_tokens,completion_tokens,cached_tokens,reasoning_tokens,audio_seconds,report,report_note,reported_at) ON ${table("usage_records")} TO ${runtime}`,
    // Sign-in code delivery log (migration 0020): count, record and prune, never update.
    `GRANT SELECT,INSERT,DELETE ON ${table("signin_delivery")} TO ${runtime}`,
    // Background tasks (migration 0021): sealed rows the runtime creates, claims, updates and deletes.
    `GRANT SELECT,INSERT,UPDATE,DELETE ON ${table("background_tasks")},${table("background_results")} TO ${runtime}`,
    // Vault sync (migration 0023): ciphertext, wrapped keys and hashes the runtime stores, replaces and deletes.
    `GRANT SELECT,INSERT,UPDATE,DELETE ON ${["sync_accounts", "sync_items", "sync_devices", "sync_wrappers", "sync_pairings"].map(table).join(",")} TO ${runtime}`,
    // Project-file blobs (migration 0024): the runtime stores and deletes them; the delete trigger
    // queues object keys, which the runtime's sweep reads and removes.
    `GRANT SELECT,INSERT,DELETE ON ${table("sync_blobs")},${table("sync_blob_sweep")} TO ${runtime}`,
    // Secure mode (migration 0025): the runtime creates an account's wrapped key once and updates only its
    // counters, never the key columns; items and file blobs as in sync.
    `GRANT SELECT,INSERT ON ${table("custody_keys")} TO ${runtime}`,
    `GRANT UPDATE (seq,used_bytes,blob_bytes) ON ${table("custody_keys")} TO ${runtime}`,
    `GRANT SELECT,INSERT,UPDATE,DELETE ON ${table("secure_items")} TO ${runtime}`,
    `GRANT SELECT,INSERT,DELETE ON ${table("secure_blobs")} TO ${runtime}`,
    `GRANT SELECT,INSERT ON ${table("account_security_event")} TO ${runtime}`,
    `GRANT SELECT,INSERT ON ${table("account_closure")} TO ${runtime}`,
    // Account data export reads the account's own billing binding and operations.
    `GRANT SELECT ON ${table("billing_customer_binding")},${table("billing_operation")} TO ${runtime}`,
    `GRANT SELECT ON ${table("account_recovery_control")},${table("account_security_event")},${table("account_closure")} TO ${notice}`,
    `GRANT UPDATE ("deliveryState","dispatchToken","dispatchedAt","settledAt") ON ${table("account_security_event")} TO ${notice}`,
    // 90-day request-record purge: callable by the runtime, which keeps no DELETE on usage tables.
    requestPurgeFunctionSql(schema),
    `REVOKE ALL ON FUNCTION ${schema}.purge_expired_requests() FROM PUBLIC`,
    `GRANT EXECUTE ON FUNCTION ${schema}.purge_expired_requests() TO ${runtime}`,
    // Owner-set automatic allowance (13 November): the runtime may start a bounded period, never insert rows itself.
    autoAllowanceFunctionSql(schema),
    `REVOKE ALL ON FUNCTION ${schema}.start_auto_allowance(text, integer, integer) FROM PUBLIC`,
    `GRANT EXECUTE ON FUNCTION ${schema}.start_auto_allowance(text, integer, integer) TO ${runtime}`,
  ];
}

/** What the connected role can do; read-only, for the hosted role check (plan 7.6). */
export async function describeConnectedRole(database: {
  query(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: Record<string, unknown>[] }>;
}): Promise<{
  role: string;
  superuser: boolean;
  createRole: boolean;
  createInSchema: boolean;
  restricted: boolean;
}> {
  const { rows } = await database.query(
    "SELECT current_user AS role, rolsuper AS superuser, rolcreaterole AS createrole, has_schema_privilege(current_user, current_schema(), 'CREATE') AS createinschema FROM pg_roles WHERE rolname = current_user",
  );
  const row = rows[0] ?? {};
  const superuser = row.superuser === true,
    createRole = row.createrole === true,
    createInSchema = row.createinschema === true;
  return {
    role: String(row.role ?? ""),
    superuser,
    createRole,
    createInSchema,
    restricted: !superuser && !createRole && !createInSchema,
  };
}
