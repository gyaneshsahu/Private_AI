# Secure mode storage and the Secure Max section (16 November 2026)

Status: built and tested offline, behind `inference.secureStore` (off by default). Nothing verified on PostgreSQL, real phones or a hosted server. The owner's direction is `docs/product-modes-20261116.md`; section 3 there (Secure Max as its own sidebar section) is what is wired.

## 1. Design in one paragraph

One storage engine, two key holders. Secure Max is the existing vault with the hardened encrypted sync (`docs/vault-sync-20261115.md`), unchanged. Secure reuses the same item format, merge rules, file blobs and server code in a "custodial" form: the server creates one random key per account, keeps it wrapped under a master key that is not in the database, and hands it to the signed-in browser. No passphrase, no device approval, no recovery key, no pairing, no device tokens. A chat or project belongs to the store that holds it.

## 2. The two vaults in the browser

| | Secure | Secure Max |
| --- | --- | --- |
| Browser database | `cometrow-secure-<account>` plus the engine's `cometrow-secure-sync-<account>` | `privateai-vault-<account>` plus `cometrow-sync-<account>` (as before) |
| Key | `GET /api/secure/key` after sign-in, kept in memory only | from this device, the code approval or the recovery key |
| Server routes | `/api/secure/key`, `/state`, `/items`, `/blobs` | `/api/sync/*` (as before) |
| Where it shows | the normal sidebar, Saved, Settings while working in Secure | only inside the Secure Max section of the sidebar |
| Saving | automatic after each answer (not temporary chats) | automatic while unlocked |
| Sign-out | both local Secure databases are deleted | stays on the device, locked |

`src/stores.ts` opens the Secure vault and engine, remembers which id came from which store, and merges the two lists. `src/App.tsx` routes every read and write by the mode of the chat or project. Memory, scheduled tasks and project files are held for one mode at a time: the mode of the open project, otherwise of the open chat, otherwise of the section the user is in. A Secure chat never reads Secure Max memory, and the reverse.

## 3. The interface (section 3 of the owner's decision)

- The normal sidebar holds only Secure chats and projects. Below them is one entry, "Secure Max", with a lock (filled and named "Secure Max, locked" while locked).
- Opening the entry replaces it with the section (`src/SecureMaxSection.tsx`, from the screens agent). The first time in a browser the explanation is shown; Cancel returns to the normal sidebar and focus goes back to the entry. Otherwise focus moves into the section.
- Inside: New Secure Max chat, New Secure Max project (the name form is in `src/SecureMaxLists.tsx`), Lock now, the section's own search, projects and chats.
- Locked (a new device, after Lock now, after 15 minutes): "Unlock Secure Max" opens the existing screens: the code approval or recovery key on a device that is not approved, otherwise this device's own unlock form. Nothing outside the section needs Secure Max.
- The 15-minute lock counts only activity while the user is in the section or in a Secure Max chat. Working in Secure does not keep Secure Max unlocked.
- Secure Max is offered only when `vaultSync` with file sync is on. Without it the section and entry do not exist. The older local passphrase vault then stays reachable under Saved, as before, so nobody loses data (an owner decision, listed in the agent's report).
- Settings, Sync section: "Open CometRow in Secure Max" (this account on this device, stored in the browser, no content; it applies only once the explanation was confirmed in this browser, and it is cleared at sign-out so a shared computer starts the next person in the normal section) and, while Secure Max is unlocked here, "Reset Secure Max" with the typed phrase.
- Reset Secure Max uses the hardened sync reset (`deleteEverythingOnThisDevice` with the synced copy): it needs this unlocked device's proof of the account key, deletes the synced copy and this device's Secure Max data, and "Unlock Secure Max" then starts a fresh one. A locked device uses "Forgot your passphrase?" with the recovery key, as before. `resetSync` alone was not used because it keeps the local data, and the owner's text says "on the server and on this device".
- "After a recent sign-in" is a screen gate only: the status carries `signedInAt` while Secure is on, and the button is off when the session is older than 5 minutes. The server does not check it; the real gate is the reset proof.
- `resetSecureMaxConfirmed()` runs on sign-out, when a request finds the session gone, and when the account changes.
- Sign-out first tries to send what is not sent yet (at most 3 seconds). If Secure changes are still waiting, the user is asked before the local copy is deleted. When the session ends by itself (expired, signed out elsewhere), there is no session left to send with: unsent Secure changes on that device are lost.

## 4. Key handling in plain words

- Each account gets one random 32-byte key the first time the signed-in browser asks for it.
- The database stores only the wrapped key: AES-256-GCM under the master key, with the account id and the master key's id bound in. A wrapped key copied to another account, or opened under another master key, does not open.
- The master key is `PRIVATEAI_CUSTODY_KEY` in the service's environment (base64 of 32 random bytes). It is never in the database or a config file. Missing or malformed with the switch on stops the start; the error never repeats the value. The development switch makes a random one in memory, so everything stored is gone at restart.
- A row that does not open under the current master key answers 503 and is never replaced: replacing it would lose the account's data.
- The runtime database role may create a key row and update its counters, never the wrapped key or its key id, and it cannot delete a key row (durable test).
- `GET /api/secure/key` answers only the signed-in account, with `Cache-Control: no-store`, behind the app's origin check. The browser keeps the key in memory (the vault object), never in storage. The local Secure database cannot be opened on the device without the served key.
- Finding: the vault keeps the raw account key bytes in memory for encrypting items, as Secure Max does. The contract asked for a non-extractable import; that would need the item encryption to change. Same exposure as Secure Max: script running in the page while unlocked.

## 5. What the server can and cannot do

- It can: unwrap any account's key while running (it holds the master key), and so decrypt that account's Secure content. In this version no route does that. It sees account, times, number and size of items and files.
- It cannot: read Secure Max content, which stays end-to-end encrypted.
- It never logs keys or content: fixed counts only (`secure.key`, `secure.push`, `secure.pull`, `secure.conflict`, `secure.delete`, `secure.blob.*`).
- Account export lists Secure items and files by id, size and time (not the content, which the app shows after sign-in). The operator erase and the deletion of the user row remove the key row, items and files.

## 6. What a database thief gets

Only ciphertext and wrapped keys. Without the master key from the service environment, nothing opens. A thief who also gets the running service's environment can open every Secure account. That is the difference from Secure Max, and why the texts say CometRow holds the key.

## 7. Creating the master key, and losing it

- Create it once, on a trusted machine: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. Store it in the host's secret store as `PRIVATEAI_CUSTODY_KEY` and in the owner's password manager. Never in the repository, a config file, a ticket or a chat.
- Losing it means every Secure account's saved content is gone for good: the wrapped keys cannot be opened. Backups of the database do not help without it. Keep the offline copy.
- A leaked master key means every Secure account's content can be opened by whoever also has the database. Rotation is not built (section 9).

## 8. The switch and costs

- Config: `inference.secureStore: { "enabled": true, "quotaMb": 200, "filesQuotaMb": 1024 }` (strict; `quotaMb` 10 to 2000, `filesQuotaMb` 10 to 10240). Absent or `"enabled": false`: no route, no status field, no browser request, no new IndexedDB database (browser test).
- Development: `PRIVATEAI_SECURE_STORE=1` (memory store, random master key).
- Migration 0025 (`custody_keys`, `secure_items`, `secure_blobs`): apply it and re-apply the privilege plan before deploying this build, even with the switch off: the account export reads `custody_keys`. Production readiness refuses to start with a pending migration.
- Cost: database storage per account (items 200 MB, files 1 GB by default). No provider cost; nothing here talks to Privatemode.

## 9. Not built

- Master key rotation (the `master_key_id` column is there for it), an access log for use of the master key outside normal serving, retention jobs and backup purge, server-side search or any server feature that reads content, the delayed reset for the all-lost case, moving or importing content between modes, object storage for Secure files (bytes stay in the database), a server-side recent-sign-in check for the reset, "Open in Secure Max" synced between devices.

## 10. Tests and live checks

- Offline: `tests/secure-store-server.test.ts` (routes, key only to the signed-in account, accounts apart, no-store also on 401, quotas, byte paging, write limit, blobs, counts only, switch off = 404, operator erase), `tests/secure-store-engine.test.ts` (two devices, merge, delete, offline, nothing in the Secure Max store), `tests/deployment-inference-config.test.ts` (schema and the master key), `tests/secure-store-e2e-ui.test.ts` (real app in Chromium: two devices of one account, automatic save, an edit on B reaches A, sign-out deletes B's Secure databases, the section's explanation and Cancel, a Secure Max chat and memory never outside the section, locked on a new device until approved, Lock now, Reset Secure Max, phone width in German, switch absent = no /api/secure request and no Secure database).
- For the lead (PostgreSQL): `tests/secure-store-postgres.test.ts`, `tests/account-migrations.test.ts` (19 migrations), `tests/render-bridge.test.ts` (body limits for `/api/secure/items/` and `/api/secure/blobs/`), `tests/consumer-control.test.ts` (the session now sets `signedInAt`).
- Live, before switching on: create the master key; deploy with the switch off and check export and erase; switch on for a test account; sign in on two real phones and check the chat is there without anything typed; sign out and check the browser's site data no longer holds `cometrow-secure-*`.
