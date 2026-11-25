-- Feedback from testers (owner, 25 November 2026; docs/feedback-20261125.md), behind inference.feedback.
-- What a tester wrote in the feedback form: a category, a text, perhaps a rating, perhaps a
-- screenshot he attached himself, and the two things the form says it sends along (interface
-- language, window size). Read and deleted only by the owner. Deleted with the account.
CREATE TABLE feedback (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  created_at bigint NOT NULL,
  category text NOT NULL CHECK (category IN ('problem', 'idea', 'wording', 'other')),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  rating smallint CHECK (rating BETWEEN 1 AND 5),
  screenshot_type text CHECK (screenshot_type IN ('image/jpeg', 'image/png')),
  screenshot bytea CHECK (octet_length(screenshot) <= 600000),
  lang text NOT NULL CHECK (lang IN ('en', 'de')),
  width integer NOT NULL CHECK (width BETWEEN 100 AND 10000),
  height integer NOT NULL CHECK (height BETWEEN 100 AND 10000),
  CHECK ((screenshot IS NULL) = (screenshot_type IS NULL))
);
CREATE INDEX feedback_newest ON feedback (created_at DESC);
CREATE INDEX feedback_account ON feedback (account_id, created_at);
