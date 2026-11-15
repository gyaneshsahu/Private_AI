CREATE TABLE usage_records (
  request_id TEXT PRIMARY KEY CHECK (request_id ~ '^[A-Za-z0-9_-]{1,100}$'),
  account_id TEXT NOT NULL CHECK (account_id ~ '^[A-Za-z0-9_-]{1,100}$'),
  created_at BIGINT NOT NULL CHECK (created_at >= 0),
  feature TEXT NOT NULL CHECK (feature ~ '^[a-z][a-z0-9-]{1,31}$'),
  units INTEGER NOT NULL CHECK (units BETWEEN 0 AND 20),
  weight_version INTEGER NOT NULL CHECK (weight_version >= 1),
  outcome TEXT NOT NULL CHECK (outcome IN ('complete', 'interrupted', 'refused')),
  model TEXT CHECK (model IS NULL OR char_length(model) BETWEEN 1 AND 64),
  request_bytes INTEGER CHECK (request_bytes IS NULL OR request_bytes >= 0),
  response_bytes BIGINT CHECK (response_bytes IS NULL OR response_bytes >= 0),
  duration_ms INTEGER CHECK (duration_ms IS NULL OR duration_ms >= 0),
  prompt_tokens INTEGER CHECK (prompt_tokens IS NULL OR prompt_tokens >= 0),
  completion_tokens INTEGER CHECK (completion_tokens IS NULL OR completion_tokens >= 0),
  cached_tokens INTEGER CHECK (cached_tokens IS NULL OR cached_tokens >= 0),
  reasoning_tokens INTEGER CHECK (reasoning_tokens IS NULL OR reasoning_tokens >= 0),
  audio_seconds INTEGER CHECK (audio_seconds IS NULL OR audio_seconds >= 0),
  report TEXT NOT NULL DEFAULT 'none' CHECK (report IN ('none', 'accepted', 'flagged')),
  report_note TEXT CHECK (report_note IS NULL OR report_note ~ '^[a-z_]{1,40}$'),
  reported_at BIGINT CHECK (reported_at IS NULL OR reported_at >= 0)
);
CREATE INDEX usage_records_account ON usage_records(account_id, created_at);
CREATE INDEX usage_records_created ON usage_records(created_at);
