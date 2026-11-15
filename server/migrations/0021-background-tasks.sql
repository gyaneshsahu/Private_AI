-- Background tasks (Auto mode of "Scheduled", docs/background-tasks-20261115.md). Behind its own
-- switch, off by default. Content (task text, search text, attachment, results) is sealed with
-- AES-256-GCM by the server before it reaches these tables; the plain columns are times, flags,
-- counts and the consent record (version, time, sensitive), never content.
CREATE TABLE background_tasks (
  task_id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  payload text NOT NULL CHECK (char_length(payload) BETWEEN 30 AND 200000),
  next_due_at bigint NOT NULL CHECK (next_due_at >= 0),
  run_after bigint NOT NULL CHECK (run_after >= next_due_at),
  paused boolean NOT NULL DEFAULT false,
  skips integer NOT NULL DEFAULT 0 CHECK (skips >= 0),
  last_run_at bigint CHECK (last_run_at IS NULL OR last_run_at >= 0),
  claimed_until bigint,
  consent_version text NOT NULL CHECK (consent_version ~ '^[a-z0-9.-]{1,40}$'),
  consent_at bigint NOT NULL CHECK (consent_at >= 0),
  consent_sensitive boolean NOT NULL,
  created_at bigint NOT NULL CHECK (created_at >= 0)
);
CREATE INDEX background_tasks_account ON background_tasks(account_id);
CREATE INDEX background_tasks_due ON background_tasks(run_after) WHERE NOT paused;
CREATE TABLE background_results (
  result_id uuid PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES background_tasks(task_id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  ran_at bigint NOT NULL CHECK (ran_at >= 0),
  status text NOT NULL CHECK (status IN ('done','failed','skipped')),
  reason text CHECK (reason IS NULL OR reason ~ '^[a-z_]{1,40}$'),
  text_sealed text CHECK (text_sealed IS NULL OR char_length(text_sealed) <= 200000),
  prompt_tokens integer CHECK (prompt_tokens IS NULL OR prompt_tokens >= 0),
  completion_tokens integer CHECK (completion_tokens IS NULL OR completion_tokens >= 0),
  expires_at bigint NOT NULL CHECK (expires_at > ran_at)
);
CREATE INDEX background_results_account ON background_results(account_id, ran_at);
CREATE INDEX background_results_task ON background_results(task_id, ran_at);
CREATE INDEX background_results_expiry ON background_results(expires_at);
