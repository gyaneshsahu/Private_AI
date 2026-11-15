# End-to-end encrypted sync between devices, the core (15 November 2026)

**Status: built and tested offline, switched off by default (`inference.vaultSync`). Nothing verified on real browsers, phones or PostgreSQL. An independent cryptography review is required before public launch.** Agent C (core), built at the same time as Agent U (screens) against `.local/sync-contract.md`. Design basis: `docs/multi-device-and-usability-20261115.md`, sections 3 and 4. Owner decisions of 15 November: "Yes, build sync"; sync with device approval and a recovery key is the lasting design; a lost passphrase must be recoverable through the recovery key.

## 1. What it does

A user turns sync on once. From then on their saved chats, memories, projects (with their instructions) and scheduled tasks are on every device they approve. The server stores an encrypted copy it cannot read. Project files stay on the device where they were added (Stage 3, section 9). Incognito chats are never saved and never synced.

## 2. Key scheme

```
                     account key AK (32 random bytes, made in the browser, never sent unwrapped)
                                              |
        +------------------+------------------+------------------+--------------------+
        |                  |                  |                  |                    |
  HKDF "item|<id>"   HKDF "local-vault"  HKDF "device-label"  HKDF "account-proof"  HKDF "file|<id>"
  per-item key        this device's        device names          32 bytes; server     Stage 3 only
  (AES-256-GCM)       vault key            (AES-GCM)             keeps SHA-256        (not built)

  AK is wrapped (encrypted) once per unlocker; the server stores the wrapped blobs only:

  device wrapper    = ECDH(ephemeral, device public key) -> HKDF -> AES-GCM(AK)
                      device key pair: ECDH P-256, private key non-extractable, in IndexedDB
  recovery wrapper  = HKDF(recovery key, 128 random bits) -> AES-GCM(AK)
  approval          = an existing device makes a device wrapper for the new device's public key
  local passphrase  = PBKDF2 (600,000 rounds) -> AES-GCM(AK), kept ONLY in this device's vault
```

- All crypto is WebCrypto (`src/sync/crypto.ts`); no new dependency. HKDF-SHA-256 with the salt `cometrow-sync-v1`.
- **Item ciphertext:** AES-256-GCM, 96-bit random nonce, AAD `accountId|itemId|version`. The payload is JSON `{ kind, data }`; the kind is inside the ciphertext. Item ids are derived from AK and the local id (HKDF, shaped as a UUID), so the server cannot link them to local ids or tell a chat from the memory list.
- **Device wrapper:** a fresh ephemeral ECDH key per wrap, HKDF salt is the ephemeral public key, AAD `device-wrapper|accountId|deviceId`. Format: `1 || ephemeral public key (65) || nonce (12) || ciphertext`.
- **Recovery key:** 128 random bits as 26 Crockford base32 characters plus 2 check characters, shown as 7 groups of 4 (`000G-40R4-0M30-E209-185G-R38E-1W73` is the test vector for the bytes 0 to 15). The check is a weighted sum modulo 1021 (a prime), so every single wrong character and every swap of two neighbours is caught (tested exhaustively on 20 random keys). O is read as 0, I and L as 1. The user types the last group back before sync starts.
- **Proofs:** the server keeps SHA-256 of `HKDF(AK, "account-proof|account")` and of `HKDF(recovery key, "recovery-proof|account")`. Registering a new device id outside pairing needs both; the comparison is constant-time (`timingSafeEqual`). These are 256-bit values, so their hashes give no offline guessing target.
- **Device token:** each device has a random 32-byte token sent as `X-Sync-Device: <deviceId>.<token>`; the server keeps its SHA-256 and compares in constant time. Item reads and writes, revocation and approving need a device token, not only the Google session.
- **No passphrase-derived key on the server.** The local passphrase wrap never leaves the device.

## 3. The local vault with sync on (migration)

**Choice: the vault is re-encrypted under a key derived from AK** (`HKDF(AK, "local-vault")`), not "AK wraps the old vault key". Why: the old key is a non-extractable PBKDF2 key, so it cannot be wrapped; and as long as the passphrase is the root, a forgotten passphrase stays total loss. Re-encryption reuses the passphrase-change code (`Vault.reencrypt`, one IndexedDB transaction): per-chat data keys are re-wrapped (chat bodies are not re-encrypted, so large chats are fast), projects, memories, project files and tasks are re-sealed. All or nothing: a failure leaves the vault as it was. Tested with a populated vault (two chats, a project with instructions, a project file of 1.5 million characters, memories with a pin, a task).

The vault's identity record gains `sync: 1`; a vault that never turns sync on keeps exactly `{ salt, check }` (tested: no new field, no sync database, no network, the passphrase change unchanged, all earlier vault tests pass).

**Unlocking a synced vault on a device:**

| Way | What it takes | Notes |
| --- | --- | --- |
| Remembered device | nothing | The device wrapper is also cached locally, so it opens offline. `unlockThisDevice()` / `openLocalVault(vault)` opens it again after the idle lock or a lock from another tab. Anyone with this browser profile gets in (stated risk). |
| Local passphrase | the passphrase | Optional (`setLocalPassphrase`). It is an alternative unlocker for a device that is not remembered, not a second lock on a remembered one: the device key opens the vault without it. |
| Recovery key | the 28 characters | Works on a new device and on a **locked existing device** (forgotten passphrase). Afterwards `setLocalPassphrase(new)` sets a new passphrase without the old one. Tested: populated vault, passphrase forgotten, recovery key, all data back, new passphrase works. |
| Approval from another device | the 6-digit code | New devices. |

A device that is neither remembered nor has a local passphrase needs the recovery key or an approval at every visit. Recommendation to the screens: when "remember this device" is off, ask for a local passphrase.

**Passphrase change with sync on** re-wraps AK under the new passphrase (nothing else is re-encrypted). **Turning sync off on this device** keeps the local data, opened from then on by the local passphrase (required: `needs-local-passphrase` otherwise), removes this device from the account and forgets its key. It does **not** delete the server copy; only "reset" does. **Delete everything on this device** (`deleteEverythingOnThisDevice({ alsoDeleteSyncedData })`) removes the vault and the sync database here, and with `alsoDeleteSyncedData` the server copy too; otherwise it removes this device from the account.

## 4. What the server stores and sees

Tables (migration 0023): `sync_accounts` (proof hashes, a change counter), `sync_items` (item id, version, ciphertext, size, change time, deleted flag), `sync_devices` (device id, public key, encrypted label, token hash, created, last seen, revoked), `sync_wrappers` (device and recovery wrappers), `sync_pairings` (new device's public key, token and code hashes, expiry, the wrapper once approved). All reference the account and go with it.

The server can see: how many items an account has, their sizes (not padded) and change times, how many devices and when each was last seen, when pairings happen. It cannot see: what an item is, any content, device names, any key. It never logs ciphertext, wrappers or bodies: the only output is fixed counts (`sync.setup`, `sync.push`, `sync.pull`, `sync.conflict`, `sync.device.revoke`, `sync.reset`, `sync.pairing.created`, `sync.pairing.approved`, `sync.pairing.wrong-code`, `sync.pairing.expired`). Bad or oversized JSON is answered by the sync router itself, never by Express's default handler, which logs the body in production (tested with `NODE_ENV=production`).

Routes (all under the signed-in session and CSRF, only with the switch on): `GET /api/sync/state`, `POST /setup`, `POST /devices`, `GET /wrappers`, `POST /devices/:id/revoke`, `GET /items`, `PUT /items/:id`, `DELETE /items/:id`, `POST /pairings`, `POST /pairings/find`, `POST /pairings/:id/approve`, `GET /pairings/:id/result`, `POST /reset`. Input is strict: canonical base64 of bounded size, UUIDs, exact key lengths, no extra fields. Limits: an item at most 4 MB of ciphertext; quota per account from the config (alpha suggestion 200 MB); devices per account from the config (suggestion 5). Every write for one account holds a row lock on `sync_accounts`, so versions, the cursor, the quota and the device limit hold under concurrent requests.

## 5. Merge rules (`src/sync/merge.ts`)

The engine keeps, per item, the last version it synced (sealed under AK on the device) as the common base, so every merge is three-way.

- **Chats:** fields three-way (when both changed one, the server's wins); messages by id, union, the newer edit (by message time) wins per message, messages added on this device stay in place; attachments by id; every branch kept (a branch changed on one side and replaced on the other survives as an archived branch). If the result is not a valid saved chat, the server's version is kept and this device's version is saved as "<title> (conflict copy)".
- **Memories, projects, tasks:** by element id. Changed on one side only: that side. Changed on both: the newer wins (memories by time; projects and tasks: the server's), the other is kept as a copy with a new id. Edited on one side, deleted on the other: the edit is kept. A task run on two devices (only run times differ) is settled without a copy. A copied task becomes Manual.
- **Deletes are tombstones.** A delete wins over an older edit. If this device edited the chat after the delete (message time later than the tombstone), or deleted a chat that another device edited since, the delete stands and the other version is kept as a conflict copy. Nothing is silently lost (tested in both orders).
- **Never backwards:** a version lower than or equal to the one synced here is ignored.

## 6. The engine (`src/sync/engine.ts`, API in `src/sync/index.ts`)

Pulls with a cursor in pages of 200 (lists before chats, so a project exists before its chats), then pushes every local change with version checks, 6 requests at a time. A 409 merges at once and pushes the result in the same cycle. 413 sets `error: "quota"`; the rest waits. The offline queue is the vault itself: whatever differs from the last synced version is pending (`pending` counts it, also while offline). Network or server errors back off 5 s, 10 s, 20 s up to 5 minutes. It syncs on unlock, on focus, every 60 seconds while visible, 2 seconds after each local save, and checks every 10 seconds whether a new device is waiting (`pairingRequested`). After it writes remote changes into the vault it calls `onSyncApplied` listeners: the screens must re-read the vault then (a save based on an older copy gets the existing "changed elsewhere" refusal, never an overwrite). A revoked device locks its vault, forgets its key and shows "needs-approval" with `error: "revoked"`; its local data stays.

Measured in Node with the real routes and the memory store (fake-indexeddb): 500 chats of about 4 KB each, setup and first push 1.5 s, pairing and full pull on a second device 0.75 s, a sync with nothing changed 0.14 s. Real browsers will be slower (IndexedDB, network); not measured.

## 7. Pairing and its residual risk

The new device makes its key pair and asks (`POST /pairings`); it computes its 6-digit code itself from `SHA-256("cometrow-pairing-v1|account|public key")`. The user types the code on a signed-in device, which finds the request (`POST /pairings/find`, constant-time comparison of code hashes), **recomputes the code from the public key the server handed over**, refuses on a mismatch, and wraps AK to that key. Expiry 10 minutes, one use (approve once, collect once), 5 wrong codes per account per 10 minutes, 5 requests per hour and 3 pending at once.

Residual risk, stated plainly: the code is about 20 bits. Against a third party who cannot see the new device's key before the user compares codes, a swapped key gives a different code. **Against a malicious server it does not hold:** the server sees the real key first and can generate keys until one gives the same code (about a million key generations, seconds to a minute, inside the 10 minutes; rate limits do not apply to offline work). Fix for Stage 2, on the crypto review list: a QR code with the full key fingerprint, or a commit-then-reveal exchange. The rate limits are in process memory (one instance in the alpha).

## 8. Threat analysis

| Who | Can | Cannot |
| --- | --- | --- |
| CometRow operating the server honestly | See counts, sizes, change times, device counts and last-seen times, pairing times | Read any content, device name or key |
| Database thief (or a backup copy) | The same metadata; ciphertext; wrapped keys; proof hashes | Decrypt: every wrapper needs a device private key (never on the server), the recovery key (128 bits) or AK. No passphrase-derived value is stored, so there is nothing to guess offline |
| Stolen unlocked device | Everything that user can see, as on any sync product | More than the account holds |
| Stolen locked device, remembered | Opens it: the device key is in the browser profile (the stated risk of "remember"). Remove it from another device: its wrapper is deleted and its token refused | Keep syncing after removal; re-enrol under a new id (needs the recovery key's proof) |
| Stolen locked device, not remembered | Guess a weak local passphrase offline (PBKDF2, 600,000 rounds), as with today's vault | Anything without the passphrase |
| Malicious server or a compromised deployment | Withhold items, serve an old version to a device that never saw a newer one (a fresh device has no protection), forge tombstones (a delete is not authenticated, so it can make devices delete chats; lists are unaffected), delete everything, mount the pairing attack in section 7, ship app code that reads content before encryption (as today) | Change content or move it between items, accounts or versions undetected (AAD); roll back an item on a device that already synced a newer version |
| Google account taken over (no device, no recovery key) | Ciphertext metadata via `/state`; the recovery wrapper (useless without the key); start a pairing request (the user must type its code on their device); wipe the synced copy with `/reset` (data on the devices stays) | Read anything: items need a device token, and no wrapper opens without a device key or the recovery key |
| A removed device that kept AK in memory | Decrypt ciphertext it gets hold of later by other means; AK is not rotated on removal | Fetch it from us: item routes need a non-revoked device token, and a new id needs the recovery key's proof |

**Not built, for the crypto review:** AK rotation on device removal (re-encrypting every item); a signed or hashed manifest of item versions (protects a fresh device against rollback and withheld items); authenticated tombstones (an encrypted tombstone payload); size padding; a stronger pairing channel (QR fingerprint or commit-reveal); moving rate limits to the database for several instances. A manifest was considered for Stage 1 and left out: without key rotation and authenticated deletes it would protect little, and it needs its own design (who signs, how devices agree).

## 9. Project files, Stage 3 (not built; the interface is ready)

- Each file gets `fileId` (random UUID) and a per-file key `fileKey(AK, fileId)` (HKDF info `file|<fileId>`, in `src/sync/crypto.ts`). The blob is AES-256-GCM with AAD `fileAad(accountId, fileId, version)` = `account|file|version|project-file`, stored outside `sync_items` (EU object storage, for example Hetzner, through short-lived signed addresses).
- The file index (name, size, type, fileId, version) goes inside the encrypted `projects` item, so the bucket holds no names and the merge rules for projects cover it. Today the `projects` payload is the project list; Stage 3 adds a field, and older devices ignore it.
- Quota: blob sizes count against the same account quota (a server-side sum per account). Account erase and reset must also delete the blobs.

## 10. Switch, limits, cost

- Deployment config `inference.vaultSync: { enabled, quotaMb (10..2000), maxDevices (1..10) }`, strict zod, absent means off (`tests/deployment-inference-config.test.ts`). `/api/status` gains `vaultSync: { quotaBytes, maxDevices }`. Development: `PRIVATEAI_VAULT_SYNC=1` (memory store, gone at restart).
- Upgrade: migration 0023 and the privilege SQL re-run (`docs/development-deployment.md`). Account erase deletes all five tables for the account; the 90-day purge does not touch live sync data; database backups keep the ciphertext for their retention.
- Cost: records are text, a few MB per active user, in the existing PostgreSQL. No new processor for Stage 1.
- Limits: 4 MB per item (a chat with very large attached documents can exceed it: `error: "item-too-large"`, that chat stays on its devices); quota; devices; 200 items per page; a vault of thousands of chats re-reads every chat at each sync (fine at 500, not measured beyond).
- Two tabs on one device run two engines on the same sync database. Version checks keep this safe; a `navigator.locks` guard would avoid the duplicate work (not built).

## 11. Tests (offline)

- `tests/vault-sync-crypto.test.ts`: recovery key vector, every typo and neighbour swap caught, wrap and unwrap, wrong key, wrong account, AAD tamper (version, item, account, bit flip), labels, proofs, pairing code equal in browser and server, pinned vector.
- `tests/vault-sync-server.test.ts`: validation, accounts apart, versions and conflicts, tombstones, cursor pages, quota, 4 MB limit, device limit, revocation, re-enrolment refused without the recovery proof, pairing once, expiry, wrong-code and creation limits, device-limit refusal, reset, counts only and no console output, production-mode body errors, `pairingPending`, mounted only with the switch, session and CSRF, the status field, the operator erase order.
- `tests/vault-sync-engine.test.ts`: setup on A with migration of a populated vault (no content in anything sent), pairing B with the code (wrong code refused), B has everything but project files, edits on both merged (messages, memories with a conflict copy), branches kept, deletes in both orders, `pairingRequested`, revoke B (refused, locked), recovery on a fresh C with a typo and a wrong key first, reset; forgotten local passphrase replaced through the recovery key; a remembered device opening offline and after a lock; sync off leaves the vault exactly as before; incognito never sent; quota surfaced; offline queue counted and sent later; 500 chats.
- `tests/vault-sync-postgres.test.ts` (durable, the lead runs it): the PostgreSQL store under the restricted runtime role, two concurrent writers, quota, devices, pairing once under concurrency, schema checks, the notice role refused, reset cascade, operator erase of one account only.
- Earlier tests rerun: all vault, memory, projects, scheduled-vault, operator and config tests.

## 12. What is not verified

- Real browsers (Chrome, Safari, Firefox), phones, iOS storage eviction, real IndexedDB speed. The engine ran in Node against fake-indexeddb.
- PostgreSQL: the durable test is written but not run by this agent (rule 4). Lead: `npm run test:durable` with `PRIVATEAI_SYNTHETIC_PG` set.
- Cryptography: no independent review. Required before public launch (Stage 5).
- The screens (Agent U) against this engine: merged and tested by the lead.

## 13. Owner decisions (recommended default first)

| # | Decision | Recommended default |
| --- | --- | --- |
| VS-1 | Quota and device limit for the alpha | 200 MB, 5 devices |
| VS-2 | Privacy wording (draft `vault-sync-privacy-wording-draft-20261115.md`) | Approve after the legal read of the German; ship in the same release as the switch |
| VS-3 | Pairing channel strength | Accept the 6-digit code for the alpha with the stated server-side risk; add a QR fingerprint in Stage 2 |
| VS-4 | AK rotation on device removal | Not for the alpha; on the crypto review list |
| VS-5 | Not-remembered devices | Ask for a local passphrase when "remember this device" is off |
