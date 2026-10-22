-- Per-address sign-in code delivery log: bounds email bombing independently of
-- the per-IP rate limit. Rows carry no content and are pruned after a day.
CREATE TABLE signin_delivery (
  identifier text NOT NULL CHECK (char_length(identifier) BETWEEN 3 AND 254),
  sent_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX signin_delivery_identifier ON signin_delivery(identifier, sent_at);
