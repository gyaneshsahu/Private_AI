CREATE TABLE account_email_proof (
  "sessionId" uuid PRIMARY KEY REFERENCES session(id) ON DELETE CASCADE,
  "verifiedEmail" text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT clock_timestamp(),
  "consumedAt" timestamptz
);
CREATE TABLE account_credential_change (
  "userId" uuid PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  "changedAt" timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE account_security_event DROP CONSTRAINT account_security_event_kind_check;
ALTER TABLE account_security_event ADD CONSTRAINT account_security_event_kind_check
  CHECK (kind IN ('sign_in_recovery','credential_removed'));
