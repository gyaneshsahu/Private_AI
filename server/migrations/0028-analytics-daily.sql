-- Privacy-safe analytics (owner, 25 November 2026; docs/analytics-20261125.md), behind inference.analytics.
-- Day totals of the server's fixed-name counters (errors, limits reached, feature use). No account,
-- session, address or text: a row is a day, a counter's name and a number. Rows older than the
-- configured retention are deleted by the app.
CREATE TABLE analytics_daily (
  day date NOT NULL,
  name text NOT NULL CHECK (name ~ '^[a-z0-9_.-]{1,80}$'),
  value bigint NOT NULL CHECK (value >= 0),
  PRIMARY KEY (day, name)
);
