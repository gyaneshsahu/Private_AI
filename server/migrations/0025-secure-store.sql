-- Secure mode (docs/secure-store-20261116.md). Behind inference.secureStore, off by default. Saved
-- content is stored for the account, encrypted in the browser under the account's key. Unlike vault
-- sync, the server holds that key: custody_keys keeps it wrapped (AES-256-GCM) under a master key
-- that lives in the service's environment, never in this database. A copy of this database alone
-- therefore opens nothing; the running service can.
-- The custody row is also the account row for Secure (change counter and running totals), as
-- sync_accounts is for vault sync. Own tables, not a column on the sync tables: a sync reset or a
-- sync schema change never touches Secure data, and the two key holders never share a row.
CREATE TABLE custody_keys (
  account_id uuid PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  -- nonce (12) + the wrapped 32-byte key + tag (16)
  wrapped_key bytea NOT NULL CHECK (octet_length(wrapped_key) = 60),
  -- Names the master key that wrapped this row (a later rotation re-wraps row by row).
  master_key_id text NOT NULL CHECK (master_key_id ~ '^[0-9a-f]{16}$'),
  seq bigint NOT NULL DEFAULT 0 CHECK (seq >= 0),
  used_bytes bigint NOT NULL DEFAULT 0 CHECK (used_bytes >= 0),
  blob_bytes bigint NOT NULL DEFAULT 0 CHECK (blob_bytes >= 0),
  -- The account's default for new chats: a preference the server may see, not content.
  default_mode text NOT NULL DEFAULT 'secure' CHECK (default_mode IN ('secure', 'max')),
  created_at bigint NOT NULL CHECK (created_at >= 0)
);
-- Same shape and checks as sync_items (migration 0023).
CREATE TABLE secure_items (
  account_id uuid NOT NULL REFERENCES custody_keys(account_id) ON DELETE CASCADE,
  item_id uuid NOT NULL,
  version integer NOT NULL CHECK (version >= 1),
  ciphertext bytea NOT NULL CHECK (octet_length(ciphertext) BETWEEN 28 AND 4194304),
  size integer NOT NULL CHECK (size BETWEEN 28 AND 4194304),
  seq bigint NOT NULL CHECK (seq >= 1),
  updated_at bigint NOT NULL CHECK (updated_at >= 0),
  deleted boolean NOT NULL,
  PRIMARY KEY (account_id, item_id),
  CHECK (size = octet_length(ciphertext))
);
CREATE INDEX secure_items_seq ON secure_items(account_id, seq);
CREATE INDEX secure_items_tombstones ON secure_items(account_id, updated_at) WHERE deleted;
-- Project files. Same columns as sync_blobs (migration 0024) so one store class serves both; in this
-- version the bytes are always in this table (object_key stays NULL: no object storage for Secure yet).
CREATE TABLE secure_blobs (
  account_id uuid NOT NULL REFERENCES custody_keys(account_id) ON DELETE CASCADE,
  blob_id uuid NOT NULL,
  size integer NOT NULL CHECK (size BETWEEN 28 AND 26214428),
  data bytea NOT NULL CHECK (octet_length(data) = size),
  object_key text CHECK (object_key IS NULL),
  created_at bigint NOT NULL CHECK (created_at >= 0),
  PRIMARY KEY (account_id, blob_id)
);
