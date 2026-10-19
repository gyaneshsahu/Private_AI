-- Receipt survives credential-row removal; retention/backup policy requires activation review.
CREATE TABLE account_closure (
  "userId" uuid PRIMARY KEY,
  "requestedAt" timestamptz NOT NULL DEFAULT clock_timestamp(),
  "purgeAfter" timestamptz NOT NULL DEFAULT clock_timestamp()+interval '7 days',
  "purgedAt" timestamptz,
  "holdUntil" timestamptz,
  CHECK ("purgeAfter">="requestedAt"+interval '7 days')
);
