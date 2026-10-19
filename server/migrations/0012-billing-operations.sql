-- Intent must commit before any provider mutation. No raw response or hosted bearer URL.
CREATE TABLE billing_operation (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('customer','checkout','portal')),
  state TEXT NOT NULL CHECK(state IN ('submitted','uncertain','ready','closed')),
  price_id TEXT,
  customer_id TEXT,
  object_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE UNIQUE INDEX billing_operation_active ON billing_operation(account_id,kind)
  WHERE state<>'closed';
CREATE INDEX billing_operation_account ON billing_operation(account_id,created_at DESC);
