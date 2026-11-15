# End-to-end encrypted sync between devices, the core (15 November 2026)

**Status: built and tested offline, switched off by default (`inference.vaultSync`). Hardened on 16 November after an independent security review of the code (section 15: every finding, its fix and its test). Nothing verified on real browsers, phones or PostgreSQL. An external cryptography review is still required before public launch.** Agent C (core), built at the same time as Agent U (screens) against `.local/sync-contract.md`. Design basis: `docs/multi-device-and-usability-20261115.md`, sections 3 and 4. Owner decisions of 15 November: "Yes, build sync"; sync with device approval and a recovery key is the lasting design; a lost passphrase must be recoverable through the recovery key.

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
- **Device token:** each device has a random 32-byte token sent as `X-Sync-Device: <deviceId>.<token>`; the server keeps its SHA-256 and compares in constant time. Item reads and writes need a device token, not only the Google session. On the device the token is stored only sealed under `HKDF(AK, "device-token")` and is in memory only while the vault is unlocked with AK; a locked device sends no device header (review H4).
- **Fresh AK proof:** removing a device, approving a pairing and resetting need the device token **and** the AK proof in the same request (computed from AK at that moment, never stored on the device). Resetting without any device takes the recovery key's proof instead.
- **Tombstones:** a delete is `AES-GCM(itemKey, {"kind":"conversation","at":...})` with AAD `accountId|itemId|version|deleted`, sent as a PUT with `deleted: true`. Only chats are ever deleted.
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
| Approval from another device | the 8-character code | New devices (section 7). |

A device that is neither remembered nor has a local passphrase needs the recovery key or an approval at every visit. Recommendation to the screens: when "remember this device" is off, ask for a local passphrase.

**Passphrase change with sync on** re-wraps AK under the new passphrase (nothing else is re-encrypted). Replacing or removing an existing local passphrase needs the current one, except right after a recovery-key unlock (review L2). The Stage-0 "remember this device" slot is dropped when sync is turned on and never opens a synced vault: a synced vault is remembered through its sync device key (review M7, L3). **Turning sync off on this device** needs the local passphrase (an existing one must be the one given) and re-encrypts the vault under it as a plain passphrase vault, so AK no longer stays on the device (review L9); then it removes this device from the account and forgets its key. It does **not** delete the server copy; only "reset" does. **Delete everything on this device** (`deleteEverythingOnThisDevice({ alsoDeleteSyncedData })`) removes the vault and the sync database here, and with `alsoDeleteSyncedData` the server copy too; otherwise it removes this device from the account.

## 4. What the server stores and sees

Tables (migration 0023): `sync_accounts` (proof hashes, a change counter, the running byte total `used_bytes`; migration 0024 adds `blob_bytes`), `sync_items` (item id, version, ciphertext, size, change time, deleted flag; a tombstone has a ciphertext too), `sync_devices` (device id, public key, encrypted label, token hash, created, last seen, revoked), `sync_wrappers` (device and recovery wrappers), `sync_pairings` (keyed by account and pairing id: the new device's public key, token hash and commitment, expiry, and once approved the wrapper, the encrypted label, the tag and the approving device). All reference the account and go with it. The operator erase and the migration count (18) are unchanged.

The server can see: how many items an account has, their sizes (not padded) and change times, which writes are tombstones, how many devices and when each was last seen, when pairings happen. It cannot see: what an item is, any content, device names, any key, any pairing code. It never logs ciphertext, wrappers or bodies: the only output is fixed counts (`sync.setup`, `sync.push`, `sync.delete`, `sync.pull`, `sync.conflict`, `sync.device.revoke`, `sync.reset`, `sync.pairing.created`, `sync.pairing.approved`, `sync.pairing.completed`, `sync.pairing.expired`, and the `sync.blob.*` counts). Bad or oversized JSON is answered by the sync router itself, never by Express's default handler, which logs the body in production (tested with `NODE_ENV=production`).

Routes (all under the signed-in session and CSRF, only with the switch on): `GET /api/sync/state`, `POST /setup`, `POST /devices`, `GET /wrappers`, `POST /devices/:id/revoke` (token + AK proof), `GET /items` (pages of at most 200 items and about 8 MB of ciphertext), `PUT /items/:id` (content or, with `deleted: true`, a tombstone; there is no unauthenticated delete route any more), `POST /pairings`, `GET /pairings`, `POST /pairings/:id/approve` (token + AK proof), `GET /pairings/:id/result`, `POST /pairings/:id/complete`, `POST /reset` (token + AK proof, or the recovery proof). Input is strict: canonical base64 of bounded size, ciphertext at least 28 bytes (review L1, as the database checks), UUIDs, exact key lengths, no extra fields. Limits: an item at most 4 MB of ciphertext (413 `too-large`, distinct from 413 `quota`); quota per account from the config (alpha suggestion 200 MB); devices per account from the config (suggestion 5); writes (items and blobs) per account: a burst of 2,000, then 20 per second (429); tombstones older than 90 days are purged at the next write. Every write for one account holds a row lock on `sync_accounts`, so versions, the cursor, the running quota and the device limit hold under concurrent requests.

## 5. Merge rules (`src/sync/merge.ts`)

The engine keeps, per item, the last version it synced (sealed under AK on the device) as the common base, so every merge is three-way.

- **Chats:** fields three-way (when both changed one, the server's wins); messages by id, union, the newer edit (by message time) wins per message, messages added on this device stay in place; attachments by id; every branch kept (a branch changed on one side and replaced on the other survives as an archived branch). If the result is not a valid saved chat, the server's version is kept and this device's version is saved as "<title> (conflict copy)".
- **Memories, projects, tasks:** by element id. Changed on one side only: that side. Changed on both: the newer wins (memories by time; projects and tasks: the server's), the other is kept as a copy with a new id. Edited on one side, deleted on the other: the edit is kept. A task run on two devices (only run times differ) is settled without a copy. A copied task becomes Manual.
- **Deletes are authenticated tombstones.** A delete applies only when it opens under the item's key with the tombstone AAD; anything else is ignored and this device's copy is pushed back. A tombstone on a list is invalid (lists are never deleted). If this device changed the chat in any way since its last sync (title, draft, branch or messages, whatever the clocks say), or deleted a chat that another device edited since, the delete stands and the other version is kept as a conflict copy (review L5, M2). Nothing is silently lost (tested in both orders). A local 30-day trash was considered and not built: it would need a restore screen; conflict copies are visible in the chat list at once.
- **Never backwards:** a version lower than or equal to the one synced here is ignored, also when the server offers it in a 409 (review M2). A 409 saying the item no longer exists (its tombstone purged after 90 days) keeps this device's edit as a new chat.
- **Messages:** a message edited here and deleted elsewhere is kept; a message added here goes after the nearest earlier message that is still there, or after the rest when none is (review L4).
- **A newer app version:** an item that decrypts but this version cannot parse (an unknown kind or field) is held: neither applied nor overwritten, counted in `needsUpgrade`; everything else keeps syncing (review M5). A chat is kept with fields a newer version added.

## 6. The engine (`src/sync/engine.ts`, API in `src/sync/index.ts`)

Pulls with a cursor in pages of up to 200 items and about 8 MB (lists before chats, so a project exists before its chats; a chat whose project is on a later page is held back until every page is in, review M4; the cursor never passes an item not applied yet). Each remote item is written into the vault before its merge base moves (review H2), and every write is checked against the copy the merge used, so a save made in this tab meanwhile is never overwritten (review H3: the cycle starts again). Then it pushes every local change with version checks, 6 requests at a time. A 409 merges at once and pushes the result in the same cycle. 413 sets `error: "quota"`; the rest waits. The offline queue is the vault itself: whatever differs from the last synced version is pending (`pending` counts it, also while offline). Network or server errors back off 5 s, 10 s, 20 s up to 5 minutes. It syncs on unlock, on focus, every 60 seconds while visible, 2 seconds after each local save, and checks every 10 seconds whether a new device is waiting (`pairingRequested`). After it writes remote changes into the vault it calls `onSyncApplied` listeners: the screens must re-read the vault then (a save based on an older copy gets the existing "changed elsewhere" refusal, never an overwrite). A device the server says was removed or reset elsewhere is **detached** (review C1): `phase: "error"`, `error` and `detached` set to `"removed"` or `"reset-elsewhere"`. It keeps its key pair, its cached wrapper and a copy of the recovery wrapper, the vault is not locked and opens as before (device key, local passphrase, or the old recovery key even after a reset), and it can join a new setup (set up, be approved, or a recovery key) without losing data: the vault moves under the new key before the old record is replaced. The state also has `remembered` and `pairingRequestedAt`. The sync database is created only once sync is used on the device.

Measured in Node with the real routes and the memory store (fake-indexeddb): 500 chats of about 4 KB each, setup and first push 1.5 s, pairing and full pull on a second device 0.75 s, a sync with nothing changed 0.14 s. Real browsers will be slower (IndexedDB, network); not measured.

## 7. Pairing (rebuilt after the security review, finding H1)

Authenticated in both directions; the server never sees the code.

1. The new device makes its key pair `pk`, a pairing id and a random **40-bit secret s**, shown as **8 Crockford base32 characters** in two groups of 4 (`7K3M-9QXR`; case, spaces, hyphens, O for 0 and I or L for 1 are forgiven). It computes `m = PBKDF2-SHA-256(s, "cometrow-pair-v1|account|pairingId|pk", 200,000 rounds, 256 bits)`, which never leaves it, and sends `c = HKDF(m, "cometrow-pair-commit-v1")` with `pk` (`POST /pairings`). The server stores `pk` and `c`.
2. The user types s on a signed-in, unlocked device. It lists the waiting requests (`GET /pairings`, device token; at most 3 pending), recomputes `c` for each from the `pk` the server hands over, and refuses when none matches: a key swapped by the server gives another `c`. It wraps AK to `pk` and adds `tag = HMAC-SHA-256(K, "result|pairingId|pk|wrapper")` with `K = HKDF(m, "cometrow-pair-tag-v1")`, and approves with a fresh AK proof (`POST /pairings/:id/approve`).
3. The new device collects the result (`GET /pairings/:id/result`) and **checks the tag before it unwraps, keeps or adopts anything**. Only then it completes (`POST /pairings/:id/complete { remember }`): the server creates its device row now (and keeps its wrapper only when it is remembered), then the vault is opened or moved under AK. A forged result is refused and a non-empty local vault stays exactly as it was (tested).

**A flaw in the proposed protocol, fixed here:** the brief had `c` be the PBKDF2 output and `K = HKDF(PBKDF2 output)`. The server stores `c`, so it could have computed `K` and forged the tag. Here both `c` and `K` come from `m` through separate HKDF labels, and `m` is never sent (a test shows that a tag keyed from `c` does not verify).

**Limits:** 10 minutes by the new device's own clock as well as the server's; one approval, one completion; an approval is void once its approver is removed or the request expires (M7); 5 requests per account per hour, 3 pending; 10 approvals and 30 lookups per account per 10 minutes; the AK proof on approval means a stolen device token alone cannot mint a device. Rate limits are in process memory (one instance in the alpha).

**What remains (for the external cryptographer):** the secret has 40 bits. Whoever holds `c` (the server, a database reader) can try every s offline: 2^40 PBKDF2 at 200,000 rounds is about 2.2 × 10^17 HMAC-SHA-256 iterations. At about 5 × 10^9 iterations per second for a current high-end GPU that is about 500 GPU-days, so finishing within the 10 minutes needs about 70,000 GPUs (half that on average). Expensive, but not impossible for a well-funded attacker who also controls the server at that moment. A PAKE (for example CPace) or a QR code with a 128-bit secret would remove this bound; both are on the review list.

## 8. Threat analysis

Rewritten after the security review to match the code (section 15 maps each finding to its fix).

| Who | Can | Cannot |
| --- | --- | --- |
| CometRow operating the server honestly | See counts, sizes, change times, device counts and last-seen times, pairing times, which writes are tombstones | Read any content, device name or key; see a pairing code |
| Database thief (or a backup copy) | The same metadata; ciphertext; wrapped keys; proof hashes; pairing commitments of the last 10 minutes | Decrypt: every wrapper needs a device private key (never on the server), the recovery key (128 bits) or AK. No passphrase-derived value is stored. A commitment can be ground for its 40-bit code (section 7), which is useless once the pairing is over |
| Stolen unlocked device | Everything that user can see, as on any sync product | More than the account holds |
| Stolen locked device, remembered | Opens it: the device key is in the browser profile (the stated risk of "remember"); with it, everything an unlocked device can do. Removal from another device stops its sync (token refused, wrapper deleted) | Keep syncing after removal; re-enrol under a new id (needs the recovery key's proof). Removal is **not a remote wipe**: the copy already on that device stays openable there (section 15, C1) |
| Stolen locked device, not remembered | Guess a weak local passphrase offline (PBKDF2, 600,000 rounds). Its sync token is sealed under an AK-derived key, so without the passphrase it cannot call any device route: no reading, no deleting, no removing devices, no reset | Anything without the passphrase |
| Holder of a device token (without AK) | Read ciphertext and its metadata; push ciphertext that every device refuses | Delete anything (a tombstone must open under the item key; a forged one is ignored and the chat is pushed back); remove a device, approve a pairing or reset (each needs a fresh AK proof) |
| Malicious server or a compromised deployment | Withhold items; serve an old version to a device that never saw a newer one (a fresh device has no protection); claim a device was removed or the data reset (the device then stops syncing, **keeps its key and all its data** and shows it); grind a pairing code within the 10 minutes with very large compute (section 7); ship app code that reads content before encryption (as today) | Change content, move it between items, accounts or versions, or turn content into a delete (AAD with "deleted"); make a device delete a chat; delete a list; roll back an item on a device that already synced a newer version (also through a 409); hand a new device its own account key (the pairing tag) |
| Google account taken over (no device, no recovery key) | Ciphertext metadata via `/state`; the recovery wrapper (useless without the key); start a pairing request (the user must type its code on an unlocked device; the prompt no longer opens by itself) | Read anything; reset the synced copy (needs a device with AK or the recovery key); approve anything |
| A removed device that kept AK in memory | Decrypt ciphertext it gets hold of later by other means; AK is not rotated on removal; collect nothing it approved (approvals die with their approver) | Fetch it from us: item routes need a non-revoked device token, and a new id needs the recovery key's proof |

**Not built, for the crypto review:** AK rotation on device removal; a signed or MACed manifest of item versions (rollback and withheld items on a fresh device); a PAKE or a 128-bit QR secret for pairing; challenge-response instead of static proofs; size padding; rate limits in the database for several instances. Section 15 lists the full set of open questions.

## 9. Project files, Stage 3

Built on 15 November: see section 14. Two points of the earlier plan changed. The blobs go through our server (no signed addresses: the server must check the device token, the size and the quota, and it never sees a key either way), and they have their own quota. The sentence "older devices ignore the new field" was wrong: the item payload and the project list are strict, so a Stage 1 device would refuse the new shape. Stage 1 never ran in production, so Stage 1 and Stage 3 must simply ship together (the engine still reads the Stage 1 shape).

## 10. Switch, limits, cost

- Deployment config `inference.vaultSync: { enabled, quotaMb (10..2000), maxDevices (1..10) }`, strict zod, absent means off (`tests/deployment-inference-config.test.ts`). `/api/status` gains `vaultSync: { quotaBytes, maxDevices }`. Development: `PRIVATEAI_VAULT_SYNC=1` (memory store, gone at restart).
- Upgrade: migration 0023 and the privilege SQL re-run (`docs/development-deployment.md`). Account erase deletes all five tables for the account; the 90-day purge does not touch live sync data; database backups keep the ciphertext for their retention.
- Cost: records are text, a few MB per active user, in the existing PostgreSQL. No new processor for Stage 1.
- Limits: 4 MB per item (a chat with very large attached documents can exceed it: `error: "item-too-large"`, that chat stays on its devices); quota; devices; 200 items per page; a vault of thousands of chats re-reads every chat at each sync (fine at 500, not measured beyond).
- Two tabs on one device run two engines on the same sync database. Version checks keep this safe; a `navigator.locks` guard would avoid the duplicate work (not built).

## 11. Tests (offline)

- `tests/vault-sync-crypto.test.ts`: recovery key vector, every typo and neighbour swap caught, wrap and unwrap, wrong key, wrong account, AAD tamper (version, item, account, bit flip), labels, proofs; pairing code vector and normalisation, commitment bound to secret, account, pairing id and key, tag checks, a tag keyed from the commitment refused; tombstone AAD (not content, not another version, item or account).
- `tests/vault-sync-server.test.ts`: validation (28-byte minimum), accounts apart, versions and conflicts (with `deleted` and `updatedAt`), encrypted tombstones and no DELETE route, cursor pages, quota, 4 MB limit as `too-large`, device limit, revocation only with an AK proof, re-enrolment refused without the recovery proof, commitment pairing (list, approve with tag and AK proof, complete once, not remembered keeps no wrapper, expiry also after approval, approval void after its approver is removed, approval rate limit), device-limit refusal, reset only with a device token and AK proof or the recovery proof, byte pages, write limit, tombstone purge, counts only and no console output, production-mode body errors, `pairingPending` and `pairingRequestedAt`, mounted only with the switch, session and CSRF, the status field, the operator erase order.
- `tests/vault-sync-engine.test.ts`: setup on A with migration of a populated vault (no content in anything sent), pairing B with the 8-character code (wrong code refused), B has everything but project files, edits on both merged (messages, memories with a conflict copy), branches kept, deletes in both orders (any edit kept as a copy), `pairingRequested`, B removed (detached, data kept, opens again), recovery on a fresh C with a typo and a wrong key first, reset (A detached with `reset-elsewhere`); forgotten local passphrase replaced through the recovery key; a remembered device opening offline and after a lock; sync off leaves the vault exactly as before; incognito never sent; quota surfaced; offline queue counted and sent later; 500 chats.
- `tests/vault-sync-hardening.test.ts`: one test per finding of section 15 (24, all failing on the code before the fixes, 50484bd) and the texts of `src/text/sync-hardening.ts`.
- `tests/vault-sync-postgres.test.ts` (durable, the lead runs it): the PostgreSQL store under the restricted runtime role, two concurrent writers, the running quota, tombstones and their purge, byte pages, devices, commitment pairings (approved once under concurrency, completed once, expiry after approval, void after the approver is removed), schema checks (no NULL or short ciphertext, approved needs wrapper, label, tag and approver), the notice role refused, reset cascade, operator erase of one account only.
- Earlier tests rerun: all vault, memory, projects, scheduled-vault, operator and config tests.

## 12. What is not verified

- Real browsers (Chrome, Safari, Firefox), phones, iOS storage eviction, real IndexedDB speed. The engine ran in Node against fake-indexeddb.
- PostgreSQL: the durable test is written but not run by this agent (rule 4). Lead: `npm run test:durable` with `PRIVATEAI_SYNTHETIC_PG` set.
- Cryptography: no independent review. Required before public launch (Stage 5).
- The screens (Agent U) against this engine: merged and tested by the lead. After the hardening of 16 November the screens still need the wiring listed in section 15.4.

## 13. Owner decisions (recommended default first)

| # | Decision | Recommended default |
| --- | --- | --- |
| VS-1 | Quota and device limit for the alpha | 200 MB, 5 devices |
| VS-2 | Privacy wording (draft `vault-sync-privacy-wording-draft-20261115.md`) | Approve after the legal read of the German; ship in the same release as the switch |
| VS-3 | Pairing channel strength | Decided (owner, 15 November): the 8-character code. Built on 16 November as the commitment and tag protocol of section 7; a PAKE or 128-bit QR secret stays on the crypto review list |
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
- The Render bridge (`server/render-bridge.ts`, lead's commit 9451116) forwards `X-Sync-Device` and admits blob bodies up to 64 MB (items 6 MB; everything else 1 MB). It still buffers each body in memory before sign-in is checked; a blob through it is at most `maxFileMb` (25 MB by the schema) plus 28 bytes once the app checks it. Not tested through the bridge here.

### 14.9 Owner decisions (recommended default first)

| # | Decision | Recommended default |
| --- | --- | --- |
| VS-6 | File quota per account in the alpha, separate from the item quota | 1 GB, separate |
| VS-7 | Store for the alpha | `postgres` until the Hetzner bucket, AVV and keys exist, then `s3` (Falkenstein) |
| VS-8 | Per-file limit | 10 MB (today's upload limit) |
| VS-9 | Privacy wording for files (draft section 7) | Approve with the legal read, together with VS-2 |

## 15. Security review of 15 November: what was fixed (16 November 2026)

An independent review of the code at 37386df found 1 critical, 4 high, 8 medium and 9 low findings (`.local/sync-review-20261115.md`). Every critical, high and medium finding and L1 to L5, L8 and L9 are fixed below; L6 is answered by the new pairing (there is no code hash any more); L7 (the recovery key on the clipboard and as a file) is a screen matter handled by the wiring agent; M1's screen part (no auto-open of the approval prompt) is the wiring agent's, its engine part (the request time) is here. Also fixed: seven findings of the wiring agent's real end-to-end test (W1 to W7). Every fix has a test in `tests/vault-sync-hardening.test.ts` unless named otherwise; all 24 of those tests fail on 50484bd and pass now. Sync was not live, so the wire protocol and migrations 0023 and 0024 changed (no data to migrate; a database that already applied the old 0023 or 0024 must be recreated, the checksums differ).

### 15.1 Finding by finding

| Id | Fix | Test |
| --- | --- | --- |
| C1 | No server response deletes the device key, the cached wrapper or local data. "Removed" (403 revoked) and "reset elsewhere" (401 unknown device, or `/state` saying so with this device's header) detach the device: it stops syncing, keeps its keys, is not locked, shows `detached`. A copy of the recovery wrapper is kept on the device, so the recovery key opens the local data even after a reset. Joining a new setup moves the vault under the new key before the old record is replaced. `/reset` needs the typed confirmation plus a device token with a fresh AK proof, or the recovery proof. | "A and B synced; A resets; B keeps all data …", "a device that is not remembered, locked when the reset happens …"; server: "resets only with the confirmation AND …" |
| H1 | Pairing with a commitment and a tag key from a PBKDF2 master the server never sees (section 7); approval needs an AK proof; the new device checks the tag before it uses anything and completes only then; never a migration of a non-empty vault before the check. Flaw in the brief's derivation fixed (tag key from the commitment). | "refuses a result the server made up …", "refuses to approve when the server swapped the new device's key …"; crypto: "commits without revealing the tag key …"; server: "pairs with a commitment …" |
| H2 | The merge base moves only after the vault write; the cursor never passes an item not applied. | "H2: when the vault write is refused, the merge base stays …" |
| H3 | Chat writes from sync pass the copy the merge used (`basedOn`); a sync delete is checked the same way (`Vault.delete(id, basedOn)`); a newer save here makes the cycle start again. | "H3: a chat saved here while the pull runs survives …" |
| H4 | Tombstones are AEAD records under the item key, AAD with version and "deleted"; anything else is ignored and the chat pushed back. The device token is stored only sealed under an AK-derived key; a locked device sends no device header. Revocation, approval and reset need a fresh AK proof. | "keeps no usable token at rest …", "ignores a tombstone that does not open …"; server: revoke with proof only |
| M2 | A 409 with a version not newer than the base is not applied; the 409 carries `deleted` and `updatedAt`; a delete against local edits always keeps a copy. | "M2: a 409 with an older version …", engine test deletes in both orders |
| M3 | A tombstone on a list is invalid (local wins); lists never stop syncing. | "M3: a tombstone on a list is invalid …" |
| M4 | Chats whose project is unknown on a page with more pages are held back until all pages are in. | "M4: a chat whose project arrives on a later page …" |
| M5 | `safeParse` everywhere in apply; the envelope ignores unknown fields; an unparsable item is held (`needsUpgrade`), never applied or overwritten. | "M5: an item from a newer app version is held …" |
| M6 | The client tells 413 `quota` from any other 413 (`item-too-large`). (The bridge part was fixed in 9451116.) | "M6: an item refused as too large …"; server: 4 MB as `too-large` |
| M7 | Revocation deletes the pairings the device approved; collecting checks expiry and that the approver is not revoked; the device row is created at completion. The Stage-0 remember slot is dropped when sync is turned on and never opens a synced vault. | "M7, L3: the Stage-0 remembered key goes …"; server: "an approval is void once its approver is removed …"; durable test |
| M8 | Items paged by bytes (8 MB); per-account write bucket (2,000, then 20 per second) for items and blobs; running `used_bytes` and `blob_bytes` under the row lock; tombstones purged after 90 days. | server: "pages by bytes, limits writes …"; blobs: "counts blob writes …"; durable tests |
| L1 | Ciphertext at least 28 bytes in the routes, as in the database. | server: 27 bytes refused; durable test |
| L2 | Replacing or removing a local passphrase needs the current one unless the vault was opened with the recovery key. | "L2: a device-key unlock cannot replace …" |
| L3 | A synced vault open without AK is opened with AK, never re-encrypted; the local passphrase stays. | "M7, L3: …" |
| L4 | A message edited here and deleted elsewhere is kept; a new message after a deleted one goes after the nearest surviving one, or after the rest. | "L4: message merge" (2 tests) |
| L5 | A remote delete keeps a copy whenever the chat changed here (title, draft, branch, messages), not by message times. | "L5: a chat renamed here …" |
| L6 | No code hash exists any more; the doc no longer presents one. | server: the creation answer has no code |
| L8 | The statement is corrected: task masking maps never leave the device unencrypted; with sync on they travel end-to-end encrypted in the tasks item (`src/vault.ts`). Wording only, no test. | none |
| L9 | Completion tells the server whether to keep the wrapper (no follow-up call to ignore). Turning sync off re-encrypts the vault as a passphrase vault (`Vault.leaveSync`). | "L9: turning sync off …"; server: not remembered keeps no wrapper |
| W1 | The recovery key's last group is normalised like the key (case, spaces, hyphens, O, I, L). | "1: the recovery key's last group …" |
| W2 | See M7 and L3; `unlockThisDevice` opens a vault open without AK with AK. | "M7, L3: …" |
| W3 | `SyncState.remembered`. | "3, 6: …" |
| W4 | The move under AK keeps version tracking (old record versions are mapped to the new ones). | "4: the open chat saves right after sync was turned on …" |
| W5 | `refresh()` decides only about the record its request was sent for, and only with this device's header. | "5: a state request sent before this device was registered …" |
| W6 | `SyncState.pairingRequestedAt`; `reset-elsewhere` is its own code. | "3, 6: …" |
| W7 | The sync database is created only when sync is used (setup, pairing, recovery). | "7: no sync database is created on load …" |
| Blobs | Blob routes count against the write limit; reset (with its proof) deletes blobs; a removed device's blob calls are refused (as before). | blobs tests |

### 15.2 Protocol changes

- `PUT /items/:id` takes `deleted: true` with an encrypted tombstone; `DELETE /items/:id` is gone. Items in `GET /items` always have a ciphertext and carry `seq`; a 409 carries `deleted` and `updatedAt`.
- `POST /devices/:id/revoke` body `{ accountProof }`. `POST /reset` body `{ confirm, accountProof }` with the device header, or `{ confirm, recoveryProof }`.
- Pairing: `POST /pairings { pairingId, deviceId, newDevicePublicKey, commitment }` returns `{ pairingId, expiresAt }`; `GET /pairings` (device) lists pending requests; `POST /pairings/:id/approve { deviceWrapper, labelCiphertext, tag, accountProof }`; `GET /pairings/:id/result` returns `{ deviceWrapper, tag }`; `POST /pairings/:id/complete { remember }` creates the device. `POST /pairings/find` is gone.
- `/state` adds `pairingRequestedAt` (to a signed-in device only).
- Migrations: 0023 (`used_bytes`, ciphertext never NULL and at least 28 bytes, tombstone index, pairings keyed by account and pairing id with `commitment`, `tag`, `approved_by`, no `code_hash`), 0024 (`blob_bytes`). 18 migrations as before.

### 15.3 Engine API changes for the screens

- `startPairing()` returns an 8-character code (`formatPairingCode` from `src/sync` shows it as 4 and 4; `PAIRING_CODE_LENGTH` is exported). `wait` can reject with `SyncError("pairing-unverified")`; a device limit at completion gives `"refused"`.
- `approvePairing(code, label)` takes the 8 characters in any case, with spaces or a hyphen; returns `"expired"` when no request waits; throws `locked` when this device is locked or detached, `rate-limited`, `device-limit`.
- `resetSync(confirm, { localPassphrase?, recoveryKey? })`: an unlocked, active device, or `recoveryKey` when none is (throws `locked`, `wrong-key`, `wrong-proof`). A remembered device no longer needs a local passphrase for it (it keeps its key); a device that is not remembered still does (`needs-local-passphrase`).
- `turnOffSyncOnThisDevice({ localPassphrase })`: needs the vault unlocked and the passphrase always (`needs-local-passphrase` first, the wrong one rejects), because the vault becomes a passphrase vault.
- `revokeDevice`, `setRememberDevice` and `deleteEverythingOnThisDevice({ alsoDeleteSyncedData: true })` need this device unlocked (`locked`).
- `SyncState`: `detached` (`"removed"` or `"reset-elsewhere"`, with `phase: "error"` and the same `error`), `remembered`, `pairingRequestedAt`, `needsUpgrade`. Error codes added: `removed`, `reset-elsewhere`, `item-too-large`, `pairing-unverified`, `wrong-key`, `wrong-proof`, `needs-upgrade`. `revoked` is no longer produced.
- `Vault`: `setLocalPassphrase(next)` without `current` is refused when one exists, unless opened with the recovery key; `rememberDevice(true)` on a synced vault keeps no slot; `unlockRemembered()` refuses a synced vault; new `leaveSync(passphrase)`; `delete(id, basedOn?)`.

### 15.4 For the lead: wiring and texts

Texts are in `src/text/sync-hardening.ts` (English and German):

| State or refusal | Text |
| --- | --- |
| `state.detached === "removed"` | `detachedRemoved`, with buttons "Sync this device again" (`syncAgain`: the setup or new-device screens) and the existing "Turn off sync on this device" |
| `state.detached === "reset-elsewhere"` | `detachedResetElsewhere` (contains "reset"; the existing `errorReset` also matches), same buttons |
| detached, `!state.remembered` and no local passphrase | `detachedKeepAccess` with the local passphrase form |
| `state.needsUpgrade > 0` | `needsUpgrade(n)` |
| `error === "item-too-large"` | `itemTooLarge` |
| `wait` rejected with `pairing-unverified` | `pairingUnverified`, with "Get a new code" |
| pairing code on both devices | `codeHint` |
| approval prompt with `state.pairingRequestedAt` | `pairingRequestedAt(time)` |
| `turnOffSyncOnThisDevice` throws `needs-local-passphrase` | `turnOffNeedsPassphrase` |
| `locked` from reset, remove, approve | `unlockFirst` |
| reset with no active device | `resetNeedsRecoveryKey` (ask for the recovery key, pass `recoveryKey`) |
| `wrong-key`, `wrong-proof` | `wrongRecoveryKey`, `wrongProof` |
| `rate-limited` | `rateLimited` |

Wiring needed (files this agent did not own; checked with the end-to-end test `tests/vault-sync-e2e-ui.test.ts`, which fails only on these):

1. `src/SyncPairing.tsx`: `PAIRING_CODE_LENGTH = 8` (or import it from `src/sync`), show `formatPairingCode(code)`; the e2e test's `/^\d{6}$/` becomes `/^[0-9A-HJKMNP-TV-Z]{8}$/`. With only this changed locally, 3 of the 4 e2e cases pass.
2. `src/App.tsx` and `src/VaultUnlock.tsx` use the Stage-0 remember slot as a marker for a synced vault (`store.rememberDevice(...)`, `store.isRemembered()`, "Open saved chats"). That slot is now never kept for a synced vault: use `useSyncState().remembered` and `openLocalVault` instead (the e2e step "After a lock, Open saved chats" waits for the button otherwise).
3. A removed device now shows `detached: "removed"` (phase "error"), not the new-device dialog with "revoked"; the e2e step after "A removes B" expects the old dialog.
4. The detached state and the texts above in the settings section and the indicator.

### 15.5 What remains for the external cryptographer

1. Pairing: 40-bit secret with a 200,000-round PBKDF2 commitment; offline grinding within 10 minutes needs about 70,000 current GPUs (section 7). A PAKE (CPace) or a 128-bit QR secret would remove the bound. Review the HKDF labels and that the tag binds pairing id, public key and wrapper.
2. AK epochs and rotation on device removal (a removed device that kept AK reads anything it gets later).
3. A MACed or signed manifest of item versions (rollback and withheld items on a fresh device; a malicious server can still claim "removed" or "reset", which now costs only availability).
4. Proofs are static bearer values (the AK proof on revoke, approve and reset; the recovery proof): consider challenge-response, so a TLS-edge observer cannot replay them.
5. HKDF domain separation (one fixed salt for deriveKey and deriveBits; info strings), and that the device wrapper's KDF info does not bind the recipient public key.
6. At-rest protection of non-extractable IndexedDB keys per browser, and the sealed token under an AK-derived key.
7. Size and time metadata (no padding; tombstones are visible as such).
8. PBKDF2 600,000 for the local passphrase; whether Argon2 (WASM) is worth it.
9. Integrity of the delivered web code (no pinning or transparency).

### 15.6 Not verified

- PostgreSQL: `tests/vault-sync-postgres.test.ts` and `tests/vault-sync-blobs-postgres.test.ts` were rewritten for the new store and schema but not run by this agent (rule 4). Lead: `npm run test:durable` with `PRIVATEAI_SYNTHETIC_PG` set.
- Real browsers and phones; PBKDF2 200,000 rounds on a slow phone (the approver computes it once per waiting request, at most 3).
- The screens against the new API (section 15.4).
- Rate limits and the write bucket are per process.

### 15.7 Owner decisions (recommended default first)

| # | Decision | Recommended default |
| --- | --- | --- |
| VS-10 | Every device and the recovery key lost: `/reset` now needs a device with AK or the recovery key, so such a user cannot start over alone | Support erases the sync rows on request after identity checks (operator SQL exists); a delayed self-service reset with a notice to all devices later |
| VS-11 | Removal is not a remote wipe: a removed device keeps opening its local copy (remembered: by itself) | Accept and say so in the privacy wording and the removal dialog |
| VS-12 | A local 30-day trash for chats deleted by sync | Not now: conflict copies cover edits; a trash needs a restore screen and changes what "delete" means on other devices |
