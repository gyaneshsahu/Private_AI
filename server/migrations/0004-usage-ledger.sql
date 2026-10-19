CREATE TABLE usage_accounts (account_id TEXT PRIMARY KEY);
CREATE TABLE usage_allowances (
  account_id TEXT NOT NULL REFERENCES usage_accounts(account_id),
  period_id TEXT PRIMARY KEY,
  starts_at BIGINT NOT NULL,
  ends_at BIGINT NOT NULL,
  request_limit INTEGER NOT NULL CHECK (request_limit BETWEEN 1 AND 1000000),
  CHECK (starts_at >= 0 AND ends_at > starts_at AND ends_at <= 8640000000000000),
  UNIQUE (period_id, account_id)
);
CREATE INDEX usage_account_period ON usage_allowances(account_id, starts_at, ends_at);
CREATE TABLE usage_requests (
  request_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  period_id TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('reserved','dispatched','transport_complete','uncertain')),
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  FOREIGN KEY (period_id, account_id) REFERENCES usage_allowances(period_id, account_id)
);
CREATE INDEX usage_period_requests ON usage_requests(period_id);
