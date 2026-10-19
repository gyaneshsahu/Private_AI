CREATE TABLE consumer_request_count (
  session_id UUID PRIMARY KEY REFERENCES "session"(id) ON DELETE CASCADE,
  count INTEGER NOT NULL CHECK (count BETWEEN 1 AND 200)
);

-- No query, URL, result, prompt or response content is stored here.
CREATE TABLE research_consent (
  id TEXT PRIMARY KEY CHECK (id ~ '^[a-f0-9]{48}$'),
  session_id UUID NOT NULL REFERENCES "session"(id) ON DELETE CASCADE,
  commitment TEXT NOT NULL CHECK (commitment ~ '^[a-f0-9]{64}$'),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX research_consent_session_idx ON research_consent(session_id);
