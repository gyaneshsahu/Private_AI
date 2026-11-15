# End-to-end encrypted sync between devices, the core (15 November 2026)

**Status: built and tested offline, switched off by default (`inference.vaultSync`). Nothing verified on real browsers, phones or PostgreSQL. An independent cryptography review is required before public launch.** Agent C (core), built at the same time as Agent U (screens) against `.local/sync-contract.md`. Design basis: `docs/multi-device-and-usability-20261115.md`, sections 3 and 4. Owner decisions of 15 November: "Yes, build sync"; sync with device approval and a recovery key is the lasting design; a lost passphrase must be recoverable through the recovery key.

## 1. What it does

A user turns sync on once. From then on their saved chats, memories, projects (with their instructions) and scheduled tasks are on every device they approve. The server stores an encrypted copy it cannot read. Project files stay on the device where they were added, unless the deployment also switches on Stage 3 (`inference.vaultSync.blobs`, section 14): then they sync as encrypted blobs and other devices download them when they are opened or used. Incognito chats are never saved and never synced.

## 2. Key scheme

```
                     account key AK (32 random bytes, made in the browser, never sent unwrapped)
                                              |
        +------------------+------------------+------------------+--------------------+
        |                  |                  |                  |                    |
  HKDF "item|<id>"   HKDF "local-vault"  HKDF "device-label"  HKDF "account-proof"  HKDF "file|<id>"
  per-item key        this device's        device names          32 bytes; server     per-blob key
  (AES-256-GCM)       vault key            (AES-GCM)             keeps SHA-256        (Stage 3, section 14)

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

## 9. Project files, Stage 3

Built on 15 November: see section 14. Two points of the earlier plan changed. The blobs go through our server (no signed addresses: the server must check the device token, the size and the quota, and it never sees a key either way), and they have their own quota. The sentence "older devices ignore the new field" was wrong: the item payload and the project list are strict, so a Stage 1 device would refuse the new shape. Stage 1 never ran in production, so Stage 1 and Stage 3 must simply ship together (the engine still reads the Stage 1 shape).

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

## 14. Stage 3: project files (15 November 2026)

**Status: built and tested offline, behind its own switch `inference.vaultSync.blobs` (absent means off: files stay on their device as in Stage 1). Object storage not tested live (no account exists). Real browsers not tested.** Owner decision of 15 November: project files sync as encrypted blobs as part of the lasting design.

### 14.1 Design as built

- **What a blob is.** A project file is kept today as its extracted text in passages, never the original file (`src/projects.ts`). The blob is exactly that: the file's JSON (name, passages) as stored in the vault, encrypted. The manifest's `type` names this format (`extracted-text-v1`), so originals could be added later as a second type.
- **Keys.** Blob id = `blobIdFor(AK, localFileId)` (HKDF `item-id|project-file|<id>`, shaped as a UUID): the server cannot link it to the local file id or tell it from an item id. Key = `fileKey(AK, blobId)` (HKDF `file|<blobId>`). Cipher AES-256-GCM, 96-bit random nonce, AAD `fileAad(accountId, blobId, 1)` = `account|blob|1|project-file`. A file is never edited (only added or removed), so the version is always 1. Format: `nonce (12) || ciphertext || tag (16)`, 28 bytes more than the plaintext.
- **Manifest inside the projects item.** The `projects` item's payload is now `{ projects, files }`. Each file entry: file id, project id, name, characters, time, plaintext size, type, blob id, SHA-256 of the plaintext. All of it is inside the item's ciphertext; the server sees none of it. Files are merged by file id apart from the projects, so a file added on one device while the instructions changed on another makes no "(2)" project copy. A file entry never conflicts (files are immutable).
- **This device's record** (sealed under AK in the sync database): each manifest entry with a flag "here" (in this vault: added here or downloaded), and the blob deletes still owed. A local file without an entry is new (to upload); an entry marked here without the local file was deleted here; an entry not here is "Not downloaded yet".
- **Order.** In each cycle: pull, then upload new local files (one blob each, `PUT /api/sync/blobs/:blobId`), then push the items (the manifest lists only files already uploaded), then delete the blobs of files that the accepted list no longer has. Deletes are kept until the server confirms them (404 counts as done). A file removed while it was uploading is deleted again at once. The offline queue is the vault as before: a file without an entry is pending, counted in `pending`, and retried with the engine's backoff.
- **Lazy download.** Another device lists the file at once (from the manifest) and downloads its blob only on `downloadFile(id)` (the project screen's Download button) or `ensureProjectFiles(projectId)` (before a question in a project chat). The download streams with progress, is decrypted, checked against the manifest hash and file id, and written into the local vault; a mismatch is refused ("damaged"), never kept.
- **Deletes reach every device.** Removing a downloaded file (the existing Remove) or a file never downloaded here (`removeSyncedProjectFile`) drops it from the manifest; other devices remove their copy at their next sync, and the device that removed it deletes the blob.
- **Screens.** The project screen (`src/ProjectPanel.tsx`) shows, only while file sync is on: an intro sentence, the quota line ("Synced files: 5 MB of 1 GB used, 1,019 MB left"), per file "Not downloaded yet" with Download, a progress bar while downloading, a failure with its reason and Try again, "Waiting to sync", "Uploading", "Too large to sync (limit 10 MB). It stays on this device." and "Not synced: your file storage is full." Texts in English and German in `src/text/sync-files.ts`. The file limits of a project (20 files, 1,500,000 characters, 3,000,000 over all projects) count files not downloaded here too. The screen reads `src/sync/files.ts` only, so it works the same without sync.
- **For the lead (one line, in a file this agent did not own):** the send path in `src/App.tsx` should `await ensureProjectFiles(conversation.projectId)` (exported from `src/sync`) before a question in a project chat; on `false`, say that some files could not be downloaded. Until then a question uses only the files already on this device (`withProjectFiles` is synchronous).

### 14.2 What the server sees and stores

- Per account: how many blobs, each blob's size (the plaintext size plus 28 bytes, not padded), and when it was stored, read and deleted (through the content-free counts `sync.blob.put`, `sync.blob.get`, `sync.blob.delete`). It never sees names, contents, which project a blob belongs to, or which file it is. It never logs blob bytes.
- Tables (migration 0024): `sync_blobs` (account, blob id, size, the bytes or an object key, time; it goes with `sync_accounts`) and `sync_blob_sweep` (object keys waiting to be deleted in the bucket; keys only, no account). A delete trigger on `sync_blobs` queues the key of every deleted row that lives in the bucket, also when the row goes through the cascade of an account erase, so the server's sweep (after each write and hourly) deletes the object. An object whose database write failed after the upload stays unreferenced (rare; a listing sweep would catch it, not built).
- Object storage (store `"s3"`): object keys are random (not the blob id, not the account), so the bucket provider cannot group objects by account. Requests are signed with AWS Signature Version 4 (`server/vault-sync-blobs.ts`, `node:crypto` and `fetch` only, path-style, PUT, GET and DELETE of one object).

### 14.3 Limits and the quota choice

- Per file: `maxFileMb`, default **10 MB**, at most 25. 10 MB is today's lower limit (a document above 10 MB is refused before reading, `src/documents.ts`); the blob is the extracted text, which is usually much smaller than the original.
- Per account: `quotaMb`, default **1024 MB** for the alpha (10 to 10,240).
- **Choice: a separate quota for files, not combined with the 200 MB item quota.** A full file storage must never stop chats, memories and tasks from syncing; with one shared quota, a few large files would. The two are shown apart (`/api/sync/state` gains `files: { count, usedBytes, limitBytes, maxFileBytes }`; the engine's `fileView().quota`). The screens' quota line (another agent's file) can show both; the project screen shows the file line.
- A file over the limit stays on its device with its own state; a file over the quota waits ("storage full") and goes up when space is freed. Neither blocks the rest.

### 14.4 Switch and configuration

`inference.vaultSync.blobs: { "store": "postgres" | "s3", "quotaMb": 1024, "maxFileMb": 10, "s3": { "endpoint", "region", "bucket" } }`, strict zod; `s3` is required with `"s3"` and refused with `"postgres"`. The access key and secret come **only** from the environment variables `PRIVATEAI_BLOB_S3_ACCESS_KEY_ID` and `PRIVATEAI_BLOB_S3_SECRET_ACCESS_KEY`; the strict schema refuses them in the file, and a missing one stops the start. Development server: `PRIVATEAI_VAULT_SYNC=1 PRIVATEAI_VAULT_SYNC_FILES=1` (memory, 1 GB, 10 MB). Routes (device token and CSRF like the other sync routes, only with the switch on): `PUT /api/sync/blobs/:blobId` (raw body, 413 `too-large` or `quota`), `GET /api/sync/blobs/:blobId`, `DELETE /api/sync/blobs/:blobId`. `POST /api/sync/reset` and the account erase delete the blobs too.

### 14.5 Cost

- `store: "postgres"`: the blobs are rows in the existing database. The alpha worst case (30 users with 1 GB each) is 30 GB of database storage; the price of Render database storage at that size was not checked.
- `store: "s3"` on Hetzner Object Storage (prices from `docs/multi-device-and-usability-20261115.md`, fetched 15 November): EUR 6.49 a month base, which includes 1 TB stored and 1 TB egress, no request fees. At 1 GB per account that covers about 1,000 full accounts, so the alpha costs **EUR 6.49 a month** whatever the use; beyond 1 TB about EUR 6.35 per TB-month and EUR 1.00 per TB of egress. Objects under 64 KB are billed as 64 KB (most extracted-text blobs are small; not padded here).

### 14.6 What the owner must do before `store: "s3"`

1. Create a Hetzner Object Storage bucket in an EU location (Falkenstein `fsn1` or Nuremberg `nbg1`), private, no public access.
2. Sign Hetzner's AVV (data processing agreement) in the Hetzner account, and add Hetzner to the Art. 30 record and the privacy wording (draft section 7).
3. Create an access key for that bucket and set `PRIVATEAI_BLOB_S3_ACCESS_KEY_ID` and `PRIVATEAI_BLOB_S3_SECRET_ACCESS_KEY` in the service's environment (Render), never in the config file.
4. Set `"blobs": { "store": "s3", "s3": { "endpoint": "https://fsn1.your-objectstorage.com", "region": "fsn1", "bucket": "<name>" } }`.

Until then use `"store": "postgres"`. The lead runs the live probe once the bucket exists, from the service shell where the two variables are set: `node --import tsx scripts/blob-s3-probe.ts https://fsn1.your-objectstorage.com fsn1 <bucket>` (puts, reads back and deletes one random 1 KB object; prints no key).

### 14.7 Tests (offline)

- `tests/vault-sync-blobs.test.ts`: blob crypto (round trip, wrong account, other blob id, other version, wrong key, bit flip, blob id unlinkable), AWS SigV4 against five vectors of the published AWS test suite and the S3 GET Object example of the AWS documentation, the S3 store against a local fake that recomputes every signature (path-style, payload hash, wrong secret refused, errors without keys), the routes (validation, device token, minimum and maximum size, replace counted once, quota 413, accounts apart, revoked device refused, reset deletes the account's blobs only, counts only, no console output, no routes without the switch, operator erase order).
- `tests/vault-sync-files.test.ts`: two simulated devices with the engine and the real routes: A adds a file, nothing readable sent, B lists it without downloading, B downloads it with progress and gets the exact file, B deletes it, the blob and A's copy are gone; B removes a file it never downloaded; a file added during an instructions edit elsewhere makes no project copy; `ensureProjectFiles`; a changed blob is refused; a file above the limit, the quota full then freed, offline then online.
- `tests/vault-sync-files-ui.test.ts`: the project screen at 375, 768 and 1280 px in English and German (view driven through test hooks).
- `tests/deployment-inference-config.test.ts`: the `blobs` schema and the environment keys.
- `tests/vault-sync-blobs-postgres.test.ts` (durable, the lead runs it): migration 0024 under the runtime role, quota with two concurrent writers, the bytes in the table and in an object store, the sweep queue with a failing bucket, reset and the operator erase. `tests/account-migrations.test.ts` counts 18.

### 14.8 Not verified

- Hetzner Object Storage live (no account): the signer matches the AWS vectors and a local fake, but Hetzner's acceptance of the exact requests (path-style, region name) is not proven.
- PostgreSQL: the durable test is written, not run by this agent.
- Real browsers and phones; download speed and memory with 10 MB blobs; iOS storage eviction of downloaded files.
- The app wiring of `ensureProjectFiles` before a question (section 14.1). Until it is wired, switching `blobs` on means a project chat on a second device answers without the files not downloaded there yet: wire it first.
- **The Render bridge caps request bodies at 1 MB** (`server/render-bridge.ts` buffers every body and answers 413 above 1,048,576 bytes). Through Render, a blob above about 1 MB is refused there and shown as "Too large to sync"; the same cap already hits Stage 1 items above 1 MB (the routes allow 4 MB). Not changed here (a security boundary before sign-in). Lead decision: stream `PUT /api/sync/*` bodies through the bridge with their own cap, or set `maxFileMb` to 1 until then (a 1 MB file is then still 28 bytes over: in practice files up to about 1 MB of extracted text).
- Found and fixed on the way: the bridge did not forward `X-Sync-Device`, so every sync route that needs a device answered 401 through Render (Stage 1 too).

### 14.9 Owner decisions (recommended default first)

| # | Decision | Recommended default |
| --- | --- | --- |
| VS-6 | File quota per account in the alpha, separate from the item quota | 1 GB, separate |
| VS-7 | Store for the alpha | `postgres` until the Hetzner bucket, AVV and keys exist, then `s3` (Falkenstein) |
| VS-8 | Per-file limit | 10 MB (today's upload limit) |
| VS-9 | Privacy wording for files (draft section 7) | Approve with the legal read, together with VS-2 |
