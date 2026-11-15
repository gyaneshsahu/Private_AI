-- Vault sync Stage 3: project files as encrypted blobs (docs/vault-sync-20261115.md, "Stage 3:
-- project files"). Behind inference.vaultSync.blobs, off by default. Every blob is ciphertext made in
-- the browser under a key the server never has. The plain columns are the account, a random-looking
-- blob id, the size and the time. With object storage (store "s3") the bytes live in the bucket under
-- a random object key and `data` is NULL here; the row stays the index for quota, reset and erase.
CREATE TABLE sync_blobs (
  account_id uuid NOT NULL REFERENCES sync_accounts(account_id) ON DELETE CASCADE,
  blob_id uuid NOT NULL,
  size integer NOT NULL CHECK (size BETWEEN 28 AND 26214428),
  data bytea CHECK (data IS NULL OR octet_length(data) = size),
  object_key text CHECK (object_key IS NULL OR object_key ~ '^[0-9a-f]{32}$'),
  created_at bigint NOT NULL CHECK (created_at >= 0),
  PRIMARY KEY (account_id, blob_id),
  CHECK ((data IS NULL) <> (object_key IS NULL))
);
-- Object keys whose rows are gone (a delete, a reset, or an account erase cascading from "user"),
-- waiting for the server to delete the object in the bucket. Keys only: no account, no blob id.
CREATE TABLE sync_blob_sweep (
  object_key text PRIMARY KEY CHECK (object_key ~ '^[0-9a-f]{32}$'),
  queued_at bigint NOT NULL CHECK (queued_at >= 0)
);
CREATE FUNCTION sync_blobs_queue_sweep() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $fn$
BEGIN
  IF OLD.object_key IS NOT NULL THEN
    INSERT INTO sync_blob_sweep(object_key, queued_at)
      VALUES (OLD.object_key, (extract(epoch FROM clock_timestamp()) * 1000)::bigint)
      ON CONFLICT (object_key) DO NOTHING;
  END IF;
  RETURN OLD;
END
$fn$;
CREATE TRIGGER sync_blobs_sweep AFTER DELETE ON sync_blobs FOR EACH ROW EXECUTE FUNCTION sync_blobs_queue_sweep();
