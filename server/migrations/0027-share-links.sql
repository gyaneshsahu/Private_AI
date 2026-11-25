-- Encrypted share links (owner, 25 November 2026; docs/sharing-20261125.md), behind inference.shareLinks.
-- `cipher` is a snapshot encrypted in the browser; its key is in the link after "#" and never reaches
-- this server, so the row cannot be read here. Kept until `expires_at` (epoch milliseconds), then
-- deleted at the next sweep. Deleted with the account.
CREATE TABLE share_links (
  id text PRIMARY KEY CHECK (id ~ '^[A-Za-z0-9_-]{22}$'),
  account_id uuid NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  cipher text NOT NULL CHECK (length(cipher) BETWEEN 40 AND 4200000),
  created_at bigint NOT NULL,
  expires_at bigint NOT NULL CHECK (expires_at > created_at)
);
CREATE INDEX share_links_account ON share_links (account_id, expires_at);
CREATE INDEX share_links_expiry ON share_links (expires_at);
