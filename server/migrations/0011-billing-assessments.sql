-- Inactive test-mode ownership and assessment only; no entitlement or allowance grants.
CREATE TABLE billing_customer_binding (
  customer_id TEXT PRIMARY KEY CHECK (customer_id ~ '^cus_[A-Za-z0-9]+$'),
  -- Preserve opaque billing identity without preventing the separate credential purge.
  -- A future authenticated creator must establish ownership before inserting a binding.
  account_id UUID NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE billing_assessment (
  event_id TEXT NOT NULL REFERENCES billing_event_inbox(event_id),
  outcome TEXT NOT NULL CHECK (outcome IN ('active_observed','inactive_observed','review','unavailable')),
  reason TEXT NOT NULL,
  subscription_id TEXT,
  customer_id TEXT,
  price_id TEXT,
  period_end BIGINT,
  attempt INTEGER NOT NULL CHECK(attempt > 0),
  observed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(event_id, attempt)
);
