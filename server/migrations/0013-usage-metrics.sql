CREATE TABLE usage_metrics (
  request_id TEXT PRIMARY KEY REFERENCES usage_requests(request_id),
  prompt_tokens INTEGER NOT NULL CHECK (prompt_tokens >= 0),
  completion_tokens INTEGER NOT NULL CHECK (completion_tokens >= 0),
  model TEXT NOT NULL CHECK (char_length(model) BETWEEN 1 AND 64),
  cost_usd NUMERIC(21, 12) CHECK (cost_usd IS NULL OR cost_usd >= 0),
  web_search_calls INTEGER CHECK (web_search_calls IS NULL OR web_search_calls >= 0),
  recorded_at BIGINT NOT NULL CHECK (recorded_at >= 0)
);
