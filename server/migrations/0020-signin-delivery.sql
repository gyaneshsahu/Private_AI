-- Per-recipient sign-in code delivery log: bounds inbox flooding independently of
-- the per-IP rate limit. The identifier is a keyed SHA-256 of the lowercased
-- address (server/account-auth.ts), so the table holds no addresses and no
-- content. Rows are pruned after a day.
CREATE TABLE signin_delivery (
  identifier char(64) NOT NULL CHECK (identifier ~ '^[0-9a-f]{64}$'),
  sent_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX signin_delivery_identifier ON signin_delivery(identifier, sent_at);
