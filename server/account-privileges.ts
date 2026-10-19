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
    `GRANT SELECT,INSERT ON ${table("account_security_event")} TO ${runtime}`,
    `GRANT SELECT ON ${table("account_recovery_control")},${table("account_security_event")} TO ${notice}`,
    `GRANT UPDATE ("deliveryState","dispatchToken","dispatchedAt","settledAt") ON ${table("account_security_event")} TO ${notice}`,
  ];
}
