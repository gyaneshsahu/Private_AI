CREATE TABLE account_security_event (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  "userId" uuid NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "sessionId" uuid NOT NULL,
  kind text NOT NULL CHECK (kind = 'sign_in_recovery'),
  "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deliveryState" text NOT NULL DEFAULT 'pending' CHECK ("deliveryState" IN ('pending','sent')),
  UNIQUE ("sessionId", kind)
);
CREATE INDEX account_security_pending ON account_security_event ("createdAt") WHERE "deliveryState"='pending';
