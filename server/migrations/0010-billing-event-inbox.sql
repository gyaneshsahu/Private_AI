CREATE TABLE billing_event_inbox (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  object_id TEXT NOT NULL,
  event_created BIGINT NOT NULL CHECK (event_created >= 0),
  api_version TEXT NOT NULL,
  live_mode BOOLEAN NOT NULL CHECK (live_mode = false),
  received_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','reconciled','blocked'))
);
CREATE INDEX billing_event_pending ON billing_event_inbox(received_at) WHERE state='pending';
