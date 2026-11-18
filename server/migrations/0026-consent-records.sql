-- One acceptance at sign-in (owner, 18 November 2026; docs/legal-read-consent-20261118.md): the
-- versions of the Terms and the Privacy Policy named on the sign-in page ("By continuing, you agree to
-- our Terms and Privacy Policy"), recorded with the time and the sign-in method when the user signs in.
-- One row per account and version pair, so a new version is recorded at the next sign-in after it
-- changes. Deleted with the account.
CREATE TABLE consent_records (
  account_id uuid NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  terms_version text NOT NULL CHECK (terms_version ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  privacy_version text NOT NULL CHECK (privacy_version ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  accepted_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  method text NOT NULL CHECK (method IN ('google', 'apple', 'email', 'passkey', 'other')),
  PRIMARY KEY (account_id, terms_version, privacy_version)
);
