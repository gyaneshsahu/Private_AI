-- End-to-end encrypted vault sync (docs/vault-sync-20261115.md). Behind inference.vaultSync, off by
-- default. Every content column is ciphertext made in the browser under a key the server never has;
-- the plain columns are ids, versions, sizes, times and hashes of device tokens and pairing codes.
CREATE TABLE sync_accounts (
  account_id uuid PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  auth_hash bytea NOT NULL CHECK (octet_length(auth_hash) = 32),
  recovery_hash bytea NOT NULL CHECK (octet_length(recovery_hash) = 32),
  seq bigint NOT NULL DEFAULT 0 CHECK (seq >= 0),
  created_at bigint NOT NULL CHECK (created_at >= 0)
);
CREATE TABLE sync_items (
  account_id uuid NOT NULL REFERENCES sync_accounts(account_id) ON DELETE CASCADE,
  item_id uuid NOT NULL,
  version integer NOT NULL CHECK (version >= 1),
  ciphertext bytea CHECK (ciphertext IS NULL OR octet_length(ciphertext) BETWEEN 28 AND 4194304),
  size integer NOT NULL CHECK (size BETWEEN 0 AND 4194304),
  seq bigint NOT NULL CHECK (seq >= 1),
  updated_at bigint NOT NULL CHECK (updated_at >= 0),
  deleted boolean NOT NULL,
  PRIMARY KEY (account_id, item_id),
  CHECK (deleted = (ciphertext IS NULL)),
  CHECK (size = coalesce(octet_length(ciphertext), 0))
);
CREATE INDEX sync_items_seq ON sync_items(account_id, seq);
CREATE TABLE sync_devices (
  account_id uuid NOT NULL REFERENCES sync_accounts(account_id) ON DELETE CASCADE,
  device_id uuid NOT NULL,
  public_key bytea NOT NULL CHECK (octet_length(public_key) = 65),
  label_ciphertext bytea NOT NULL CHECK (octet_length(label_ciphertext) BETWEEN 1 AND 512),
  token_hash bytea NOT NULL CHECK (octet_length(token_hash) = 32),
  created_at bigint NOT NULL CHECK (created_at >= 0),
  last_seen_at bigint NOT NULL CHECK (last_seen_at >= 0),
  revoked_at bigint CHECK (revoked_at IS NULL OR revoked_at >= 0),
  PRIMARY KEY (account_id, device_id)
);
CREATE TABLE sync_wrappers (
  wrapper_id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES sync_accounts(account_id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('device', 'recovery')),
  device_id uuid,
  blob bytea NOT NULL CHECK (octet_length(blob) BETWEEN 1 AND 512),
  created_at bigint NOT NULL CHECK (created_at >= 0),
  CHECK ((kind = 'device') = (device_id IS NOT NULL))
);
CREATE UNIQUE INDEX sync_wrappers_device ON sync_wrappers(account_id, device_id) WHERE kind = 'device';
CREATE UNIQUE INDEX sync_wrappers_recovery ON sync_wrappers(account_id) WHERE kind = 'recovery';
CREATE TABLE sync_pairings (
  pairing_id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES sync_accounts(account_id) ON DELETE CASCADE,
  device_id uuid NOT NULL,
  new_device_public_key bytea NOT NULL CHECK (octet_length(new_device_public_key) = 65),
  token_hash bytea NOT NULL CHECK (octet_length(token_hash) = 32),
  code_hash bytea NOT NULL CHECK (octet_length(code_hash) = 32),
  state text NOT NULL CHECK (state IN ('pending', 'approved', 'refused')),
  created_at bigint NOT NULL CHECK (created_at >= 0),
  expires_at bigint NOT NULL CHECK (expires_at > created_at),
  wrapped_for_new_device bytea CHECK (wrapped_for_new_device IS NULL OR octet_length(wrapped_for_new_device) BETWEEN 1 AND 512),
  label_ciphertext bytea CHECK (label_ciphertext IS NULL OR octet_length(label_ciphertext) BETWEEN 1 AND 512),
  CHECK ((state = 'approved') = (wrapped_for_new_device IS NOT NULL))
);
CREATE INDEX sync_pairings_account ON sync_pairings(account_id, expires_at);
