-- Apply only after duplicate inspection; never merge existing identities.
CREATE UNIQUE INDEX account_provider_identity_unique ON account ("providerId", "accountId");
CREATE UNIQUE INDEX passkey_credential_unique ON passkey ("credentialID");
