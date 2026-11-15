# Devices and sync: screens and Stage 0 vault fixes (15 November 2026)

**Status: built and tested offline (Agent U).** The Stage 0 fixes are pure improvements and are live without any switch. The sync screens show only when `/api/status` has `vaultSync` (the deployment switch `inference.vaultSync`, Agent C). They call only the engine API of the shared contract (`.local/sync-contract.md`). In this branch `src/sync/index.ts` is a thin in-memory stub ("stub: replaced by Agent C's engine at merge"); the browser tests replace it with a fake that two or three browser contexts share. Agent C's design doc is `vault-sync-20261115.md`; this file covers the screens only. Background: `multi-device-and-usability-20261115.md`.

All texts are in `src/text/sync.ts` (English and German, identical keys). The English wording is quoted below; the German is in the same file.

## 1. What is live without the switch (Stage 0)

No new server storage. Code: `src/vault.ts`, `src/vault-backup.ts`, `src/VaultUnlock.tsx`, `src/VaultBackup.tsx`.

### 1.1 New device: no silent empty vault

When this browser holds no vault for the account (`Vault.exists()`), Saved shows above the passphrase:

- Heading: "No saved chats on this device yet"
- "Saved chats from your other devices are not here. They stay on the device where you saved them. Creating a vault here starts an empty one."
- "To bring them here: create the vault, then on your other device open Saved and download an encrypted backup, and restore that file here under Encrypted backup and restore."
- Only when the deployment has sync: "Or turn on sync in Settings, Devices and sync, and approve this device from your other device."

The button keeps its name "Create or unlock vault" (many end-to-end specs use it). The notice is hidden on a device that sync has already unlocked.

### 1.2 Remember this device

- A checkbox under the passphrase: "Remember this device", with the risk beside it: "No passphrase needed on this browser next time. Anyone who can use this browser profile can open your saved chats. Only choose this on your own device."
- How: the vault key that `derive()` returns is a non-extractable WebCrypto key. When the box is ticked it is stored as that `CryptoKey` object in the vault's own IndexedDB (`meta`, `remembered-key`). The page can use it but never read or export it. Nothing leaves the device; no sync core is needed.
- On each visit the app opens the vault by itself. After the 15-minute idle lock, Saved shows "This device is remembered. Your saved chats open without the passphrase." and one button, "Open saved chats".
- Unticking it and unlocking forgets the key. A passphrase change keeps a remembered device remembered (with the new key). "Delete everything" and the forgotten-passphrase reset delete it with the vault.
- Default: unticked on the local vault (so nothing changes for anyone who does not choose it). In the sync screens it is preselected, as the owner asked for a smooth new device. Owner decision D-U2 below.
- Limit stated honestly: this is as strong as the browser profile. Malware or anyone using the profile gets in; the at-rest protection of the saved data on a remembered device is the operating system's account protection, not the passphrase.

### 1.3 Forgotten passphrase

While locked and a vault exists, the form has a text button "Forgot your passphrase?". It opens a panel "Forgot your passphrase":

- Without sync on for the account: "Without the passphrase nobody can open the saved data on this device, not even us. You can delete it and start again with a new passphrase. Backup files made with the old passphrase still need the old passphrase." If the deployment has sync: "After you start again, turn on sync: it gives you a recovery key, so a forgotten passphrase is not a loss next time."
- With sync on (owner decision of 15 November): first "Sync is on for your account, so your recovery key can open your saved data again." and the recovery key form (section 2.5). After it works: "Choose a new passphrase for this device", "New passphrase", "Save new passphrase", then "Your new passphrase is set.". Below, under "Last resort", the delete button.
- The delete button "Delete this device's saved data and start again" opens a confirmation (`src/ConfirmDialog.tsx`, focus starts on Cancel): title "Delete this device's saved data?", text "This deletes every saved chat, memory, project, project file and scheduled task on this device. It cannot be undone. Your account, your allowance and your other devices are not affected.", a field "Type DELETE to confirm" (German: LÖSCHEN), and "Delete and start again", which stays off until the word matches. After it: "This device's saved data was deleted. Choose a new passphrase to start again." and the new-device notice again.
- Limit: while locked the app cannot read the tasks, so an Auto background task of this account on the server is not deleted by this reset; its next result would arrive as "unknown task". The unlocked "Delete everything" still deletes them.

### 1.4 Backup

- The limits up front: "Each backup file holds up to 100 saved chats and 10 MB of content. With more, the backup is split into several files: download each one and keep them together."
- Download works with only memories or only tasks (it was disabled without chats or projects). An empty vault gets "There is nothing to back up yet. Save a chat, a memory, a project or a task first."
- Over 100 chats or 10 MB: export in parts (`planBackupParts`): at most 100 chats and 10 MiB each; every part carries the projects, memories and tasks; project files only in part 1. The screen says "Your saved data needs 3 backup files. Download each one. To restore, restore every file; restoring a file twice adds nothing twice." and shows "Download part 1 of 3" (then "Part 1 of 3 downloaded") per file. One button per file, because browsers block several downloads from one click.
- Known limits, said in plain words: one chat over 10 MB: "One saved chat is larger than 10 MB, the limit for a backup file. This is a known limit. ..."; files too large: "With project files the backup would be larger than 10 MB. Untick Include project files and download again. ..."
- "Include project files" (shown when Projects is on), ticked by default (owner default MD-13: yes, as an option), with "Makes the file larger. Older versions of CometRow cannot restore a backup with project files." The format stays version 1 with one optional field `projectFiles`; an older app refuses such a file (strict schema), it does not misread it.
- Restore without duplicates: an item whose id is already here with the same content is skipped. Otherwise it gets a stable new id derived from its id and content (SHA-256), so restoring the same file again finds that copy and skips it. A chat changed here since the backup comes back once as a separate copy. Projects follow the same rule; project files merge by file id; memories and tasks were already merged by text. The intro now reads "... What is already here is skipped, so restoring the same file again adds nothing twice. A chat that changed here since the backup comes back as a separate copy."
- Limit: a restored copy that the user later deleted does not come back on a later restore of the same file (its id has a tombstone).

## 2. Sync screens (need the core and `status.vaultSync`)

Code: `src/SyncScreens.tsx` (Settings section, indicator, pairing prompt, new-device dialog, typed confirmation, local passphrase dialog), `src/SyncSetup.tsx`, `src/SyncPairing.tsx`, `src/SyncRecoveryKey.tsx` (typing help on the engine's own key format). Each step moves focus to its heading.

### 2.1 Turn on sync (Settings, "Devices and sync")

1. "Sync keeps your saved chats, memory, projects and scheduled tasks the same on your phone, tablet and computer. They are encrypted on your device before they leave it." Button "Turn on sync" (if the vault is locked: "Open your saved chats first (Saved), then turn on sync here.").
2. "Turn on sync": what syncs ("saved chats, memory, projects and their instructions, scheduled tasks and settings. Not yet: project files. Never: incognito chats."), what the server keeps and can and cannot see (counts, sizes, change times, devices and last seen; not content, titles, device names or keys), and in bold "If you lose all your devices, the recovery key is the only way back to your saved data. Nobody else can recover it, not even us." Fields: "Name of this device" (prefilled, for example "Chrome, Windows"), "Remember this device" (preselected, with its risk). "Continue" calls `setUpSync`.
3. "Your recovery key", "This key is shown only once. Save it now." The key as a list of 7 groups of 4; each group is read out character by character ("Group 1: A B C D"). "Copy", "Download as a file" (`cometrow-recovery-key.txt`), "Print" (prints only the key sheet). Warning: "Do not keep the key on this device or in the same place as it. If both are lost or stolen together, the key does not help. ..." Then "I have saved it".
4. "Check that you saved it", "Type the last group of your recovery key" (the last 4 characters; O is read as 0, I and L as 1 before the engine compares), "Turn on sync" calls `confirmRecoveryKeySaved`. Wrong: "That does not match the last group. Look at the key you saved." with "Show the key again". Right: "Sync is on. This device is the first in your list."

### 2.2 New device after sign-in

When the engine says `needs-approval`, a modal dialog opens by itself: "Your saved data is on your other devices", "Sync is on for your account. To open your saved chats here, approve this device from a device where CometRow is open, or use your recovery key." "Remember this device" preselected with its risk. One primary button "Approve from another device", then "Use your recovery key", then "Not now" with "Not now gives you an empty vault on this device. It is not synced and does not show your other devices' chats."

- Approve: "Approve this device", the 6-digit code large (3 and 3, read digit by digit), "On your other device, open CometRow. It shows A new device wants access. Enter this code there, check it matches, and approve.", "The code works for 10 minutes and only once.", "Waiting for approval…". Expired: "The code expired. Get a new code to try again." with "Get a new code". Refused: "The approval did not work. Get a new code, or use your recovery key." When the engine leaves `needs-approval`, the dialog closes and the notice says "This device is approved. Your saved data is arriving."
- Recovery key: section 2.5.
- Not now: Saved shows "Not synced: this device keeps its own saved chats." and "Get my saved data from my other devices", which opens the dialog again.

### 2.3 Existing device: approve

When the engine reports a pairing request, a quiet notice appears at the top of the page by itself, and the form below opens only from it (security review M1, section 8): "A new device wants access", "Enter the code it shows.", in bold "Only approve a device you are holding right now. If you did not just ask for this on another device, do not approve: someone may be trying to get into your account." Fields "Code shown on the new device" (numeric, spaces allowed) and "Name for the new device", "Approve" and "Not now". Results: "Approved. The new device can now open your saved data." / "That code does not match. ..." / "The request expired. Start again on the new device." The same form is under "Approve a new device" in Settings.

### 2.4 Devices list and status (Settings)

- Status: "Last synced <time>" or "Not synced yet.", "No changes waiting." or "2 changes waiting to sync.", a progress bar "Storage used for sync" and "12.5 MB of 200 MB used, 187.5 MB left.", "Sync now", "Approve a new device".
- Errors in plain words (from the engine's `state.error` codes `offline`, `quota`, `revoked`, `server`, `rate-limited`, `item-too-large`): "You are offline. ...", "Your sync storage is full. ...", "This device was removed from sync on another device. ...", "Our server did not answer as expected. ...", "Too many sync requests in a short time. ...", "One saved chat is larger than 4 MB, the limit for sync. ...", and anything else "Sync stopped because of a problem. Try Sync now.". The engine merges conflicts and never reports one; the old conflict text stays for safety. A removed device also shows the removed text in Settings and in the new-device dialog.
- "Your devices": name, "This device", "Removed", "Added <date>", "Last seen <date>", and "Remove" for other devices (its accessible name is "Remove <name>"). Confirmation: "Removing a device stops it from syncing and deletes its key on our server, so it cannot get new changes. It does not delete the saved data already on that device: whoever can open that device can still read it. If the device was lost or stolen, also secure your Google account."
- "Turn off sync on this device": "Your saved data stays on this device but stops syncing. Your other devices keep syncing. To sync here again you need approval from another device or your recovery key."
- "Delete synced data on the server": the full consequence text and a field "Type DELETE SYNCED DATA to confirm" (German: SYNCHRONISIERTE DATEN LÖSCHEN); the button stays off until it matches. The screen always passes the contract's English phrase to `resetSync`.

### 2.5 Recovery key input

"Use your recovery key", "Recovery key" (grouping in 4s as you type, upper case, spaces and dashes ignored, O read as 0, I and L as 1, as the engine reads them), the hint line: "28 letters and digits in 7 groups of 4. ...", "8 more characters to go.", "2 characters too many.", "U is not used in recovery keys. They use the digits 0 to 9 and the letters A to Z without U.", "This key does not check out. Look for a mistyped character.", "The key looks complete." The check is the engine's own (`decodeRecoveryKey`, re-exported from `src/sync/index.ts`: 26 Crockford base32 characters plus 2 check characters, weighted sum modulo 1021). The button "Open my saved data" works once there are 28 valid characters; a key that fails the check gets "wrong key" from the engine at once. Wrong key (from the engine): "This recovery key does not open your saved data. Check each group and try again."

### 2.6 Status indicator

In the sidebar footer under "Vault unlocked · This device": a small button with a shape and a word, never colour alone: "Synced" (filled dot), "Syncing" (turning ring, still with reduced motion), "Offline" (hollow), "Sync problem" (square), "Locked", "Not synced here". Its name is "Sync: Synced. Open devices and sync" and it opens that Settings section. It is not a `role="status"` element.

## 3. Contract changes and assumptions (for the lead and Agent C)

Proposed additions (in the stub, marked PROPOSED):

1. `SyncState.pairingRequested?: boolean`: needed so the existing device shows the prompt by itself (owner: "the other device shows the prompt by itself"). Without it the prompt never appears and only the Settings button works. The server can derive it from an open row in `sync_pairings`.
2. `startPairing(opts?: { rememberDevice: boolean })`: the contract has no way to pass the new device's "Remember this device" choice on the approval path.
3. `setLocalPassphrase(passphrase: string): Promise<void>`: the owner's flow "recovery key, then set a new local passphrase" on a locked device. The screens import it, so the engine must export it (a no-op is fine if a sync device needs no passphrase).
4. **The main open gap:** the contract gives no way for the app's `Vault` (`src/vault.ts`) to receive the account key or open after the engine unlocks (approval or recovery key). Today the app calls `openIfRemembered()` after the engine leaves `needs-approval`, which opens the vault only if a remembered key exists in the vault. Proposal: the engine, on unlock with "remember this device", stores the vault key it uses as the vault's `remembered-key` (the same non-extractable `CryptoKey` slot), or exports `openLocalVault(vault: Vault)`. Until the core lands, the end-to-end unlock of a new device is not verified. Relatedly, the engine's device wrapper and the Stage 0 `Vault.rememberDevice` are separate today, so a reload of a sync-remembered device would still ask for the passphrase unless the core fills that slot.
5. Error codes: resolved; the screens map the engine's six codes (section 2.4).
6. Resolved: `setUpSync` returns 7 groups of 4 with dashes; the last group is the last 4 characters.
7. Resolved: the screens' own format module (`src/recovery-key-format.ts`, 6 groups and a 2-bit check) is deleted; the screens use the engine's format (section 2.5). Item 4 is resolved by `openLocalVault` (section 8).
8. `AppStatus.vaultSync?: { quotaBytes; maxDevices }` added to `shared/contracts.ts`; Agent C adds the same line (merge: keep one).

## 4. Tests (offline)

- `tests/vault-sync-screens-ui.test.ts` (vitest plus Chromium, own Vite server on a random port, `src/inference.ts` and `src/sync/index.ts` replaced by `tests/fixtures/sync-fake.js`, which asks the test through `/__sync/*`): at 375, 768 and 1280 px in English and German (12 runs plus one focus check): the new-device notice, remember this device across a reload and after a lock, backup with only a memory, restore of the same file twice adding the chat once, the forgotten-passphrase reset with the typed word; turn on sync with focus on each step, the key in 7 groups read out per character, the download containing the key, a wrong and a right last group; a new device whose dialog opens by itself with "Remember this device" preselected, the code shown and approved from a second context whose prompt appeared by itself (a wrong code refused first), the approved device's Saved not claiming it is empty; a third context: an expired code and a new one, then the recovery key with a typo hint, a short key, a foreign character, a well-formed wrong key refused, the right key in lower case; turn off sync on that device; the devices list, revoke with its sentence, errors in plain words, the indicator's four states and that it opens Settings; forgotten passphrase with sync on (recovery key, then new passphrase, delete as last resort); delete synced data with the typed phrase; no sideways scroll; 44 px targets for primary actions at phone width. Added with the wiring: the "delete everything" question with "Also delete the synced copy" (cancelled), the local passphrase asked after a recovery without "Remember this device", the local passphrase asked before turning sync off (the fake refuses first, as the engine does), the three new error texts. 13 of 13 passed.
- `tests/vault-sync-e2e-ui.test.ts` (no fake, section 8). 4 of 4 passed, about 40 seconds.
- `tests/vault-remember.test.ts`, `tests/vault-backup.test.ts` (updated: a repeat restore adds 0; restore into the source vault skips; parts above 100 chats; memories alone; project files on request), `tests/sync-texts.test.ts` (grouping, normalising, hints on the engine's check, all texts translated with numbers kept; replaces `tests/recovery-key-format.test.ts`).
- Updated: `tests/second-device-ui.test.ts` (the forgot link now exists), `tests/fixtures/i18n-screens-entry.tsx` (new `VaultBackup` props), and `tests/browser/vault-backup.spec.ts` (a repeat restore of an unchanged chat now shows "Restored 0" and keeps 1; not run, Playwright specs are not run by build agents).

## 5. What is not verified

- Against the real engine and server: verified in Chromium with the memory store (section 8). Not with PostgreSQL, not across a real network, not in Safari or Firefox.
- Real phones, Safari, Firefox, iOS storage eviction of the remembered key, printing on paper, a real screen reader (the structure was checked, not the speech).
- `tests/production-workspace.test.ts` and the Playwright specs under `tests/browser` were not run.

## 6. Device tests for the owner (for the lead to add to the test list)

1. Phone, no vault: open Saved and read the new-device notice. Is it clear that your laptop chats are not here?
2. Laptop: tick "Remember this device", unlock, close the browser, open it again: Saved opens without the passphrase. Untick it, unlock again, reopen: the passphrase is asked again.
3. Lock, press "Forgot your passphrase?" and go as far as the typed confirmation, then Cancel. Check nothing was deleted.
4. With only a memory saved, download a backup; restore the same file twice into another device: one memory, no duplicates.
5. With sync on (after the core lands): turn on sync on the laptop, print the recovery key, then on the phone approve with the code; check the prompt appeared on the laptop by itself and that the phone shows your chats.
6. On a third browser, use the recovery key with one wrong character: the hint appears; then the right key.
7. Remove the phone in Devices; check it stops syncing and still shows what it had.

## 7. Owner decisions (recommended default first)

| # | Decision | Recommended default |
| --- | --- | --- |
| D-U1 | "Include project files" in the backup | Ticked by default, as an option (MD-13) |
| D-U2 | "Remember this device" on the local vault (no sync) | Unticked by default, as a choice with its risk (MD-6); preselected in the sync screens |
| D-U3 | Forgotten-passphrase reset while locked leaves Auto tasks on the server | Accept for the alpha; the unlocked "Delete everything" removes them |
| D-U4 | A restored copy the user deleted does not come back on a later restore of the same file | Accept (a deleted item stays deleted) |

## 8. Wiring into the app (added 15 November, after the core merged)

All in `src/App.tsx`, small and local; the switch decides everything. With `inference.vaultSync` absent nothing below runs: no `/api/sync` request and no sync database (tested).

- **Attach:** only when `/api/status` has `vaultSync` and an `accountId` (signed in). `attachSync({ vault, accountId, csrf })` with the CSRF token through a getter (it changes when the session renews; the 30-second status poll does not re-attach). `detachSync()` on sign-out, on an account change and when the switch is absent.
- **Pulled changes:** `onSyncApplied` re-reads saved chats, projects (with instructions), memories and scheduled tasks while the vault is shown. While a recovery-key unlock still shows its own screen (forgotten passphrase), nothing is flipped: the new-passphrase step stays on screen.
- **Opening a synced vault:** the engine opens it with this device's key at start (`attachSync` runs `unlockThisDevice`); the app's own remembered-key opening at start waits until after the attach, so the device key, not the older Stage 0 key, opens a synced vault (otherwise the vault would be open without the account key and nothing would sync). "Open saved chats" after a lock calls `openLocalVault`. Approval and the recovery key are shown when the engine leaves "needs-approval".
- **Remember this device:** the engine has no "remembered here" in its state, so the app keeps the vault's own remembered-key slot in step with the sync choice (set up, approval, recovery key: `rememberDevice(choice)`), and the lock screen reads that slot. On a synced device, a change of the tick on the passphrase form calls `setRememberDevice`. VS-5: when a device is not remembered and has no local passphrase, a dialog asks for one ("This device is not remembered. Choose a passphrase to open your saved data here next time. ...", with Not now).
- **Turn off sync here / delete the synced data:** when the engine answers `needs-local-passphrase`, a dialog asks for a passphrase ("Your saved data stays on this device. Choose a passphrase to open it here from now on.") and the action is retried with it.
- **Delete everything on this device:** in sync here, one question (not the browser's) with the box "Also delete the synced copy on our server" (unticked) and "Your other devices keep what they already have but stop syncing, and your recovery key stops working. Without this, only this device is removed from sync." The forgotten-passphrase reset has the same box under the typed word. Both go to `deleteEverythingOnThisDevice({ alsoDeleteSyncedData })`; then sync attaches again (the engine stops itself).

**Security review fixes in the screens (15 November, evening):**

- M1, pairing: the approval form never opens by itself. A quiet notice appears: "A device asked to join your account at <time>. Approve only a device you are holding." with "Review the request" and "Not now". The form says "Requested at <time>.", asks to tick "I am holding this device" (the code field stays off until then), then the code. The time is when this device first noticed the request: the engine reports only `pairingRequested`, not the request's time (engine need). After an approval every other device shows once "A new device was added: <name>, <time>." (from the devices list; the ids this browser has already seen are kept in localStorage, ids only, no names).
- Pairing code format: `PAIRING_CODE_LENGTH` in `src/SyncPairing.tsx` (6 today) drives the input check, the length limit, the digit keyboard and the display in two halves; the input ignores case, spaces and dashes and reads O as 0, I and L as 1. The 8-character Crockford code is that one line.
- L7, recovery key: beside Copy and Download, "Copied text can stay in your clipboard history, and downloads can sync to other clouds. Printing or writing it down is safest." Focus starts on Print.
- C1, removed or reset elsewhere: a removed device says "This device was removed from sync on another device. Your saved data stays here, but it no longer syncs." in the new-device dialog and in Settings, and its Not now note reads "Not now keeps the saved data that is on this device, without sync."; the primary button there is approval, never a deletion. A reset from another device has its text ready ("Sync was reset from another device. Your saved data is still on this device, ...") for an error code containing `reset`, but the engine does not report one today: it turns sync off silently (engine need).

**Project files synced as blobs (Stage 3):** before a question in a project chat, when sync and file sync are on here (`useSyncFiles().enabled`), the app shows "Getting project files…" and awaits `ensureProjectFiles(projectId)`. If a file could not be downloaded, it asks "Send without some project files?" / "Some project files are not on this device yet; they could not be downloaded. Send without them?" with Send anyway and Cancel; Cancel sends nothing and keeps the question in the composer. Tested in `tests/vault-sync-screens-ui.test.ts` at 1280 px English and 375 px German with a fake files module (`tests/fixtures/sync-files-fake.js`); not against real blobs (the end-to-end server has no provider, so no question can be sent there).

**End-to-end test** `tests/vault-sync-e2e-ui.test.ts`: the real Express app with `vaultSync` and the memory store, the client from Vite middleware on the same random port, Chromium contexts signed in to one synthetic account (the session's account id comes from a test cookie). English at 1280 px: A turns sync on (key in 7 groups, last group typed in lower case); B is approved by code from A's prompt, which appears by itself, and shows A's chat, memory and project with instructions; a rename and a new memory on B reach A after Sync now; C opens with the recovery key after a typo hint and a refusal; A forgets its passphrase, uses the key, sets a new one, has everything, and the new one unlocks after a lock; A reloads and opens without the passphrase, still "Synced"; A removes B and B shows the removed text; C deletes everything without the synced copy and A lists it as removed. German at 375 px: setup and pairing with all data checked. Stage 0: a remembered vault without sync, sync turned on, reload: opens with the device key, "Synced", no error. Switch absent: no `/api/sync` request, no IndexedDB database before a vault is made.

**Engine and vault findings (not changed here; the core's files belong to another agent):**

1. `confirmRecoveryKeySaved` compares the typed group exactly; it does not read O as 0 or I and L as 1 as `decodeRecoveryKey` does. The screen normalises first. Fix: compare `decodeRecoveryKey`-style normalised text.
2. `Vault.reencrypt` keeps the Stage 0 remembered-key slot when the vault moves under the account key (`adoptAccountKey`), even when the user turns sync on without "Remember this device", and `unlockRemembered` then opens the synced vault without the account key and without `onSync("unlocked")`; `unlockThisDevice` answers "ok" for any unlocked vault. The app works around both (slot kept in step with the choice; the device key opens first). Fix: drop the slot in `adoptAccountKey` unless remembered, and let `unlockThisDevice` re-open with the account key when the vault is open without one.
3. `SyncState` has no "remembered here" flag; a `remembered: boolean` would let the app drop its slot workaround.
4. With the switch on, `attachSync` creates the `cometrow-sync-<account>` database on page load before any vault exists. Accepted for now (the switch is off by default); fix: open the store only once a device record or a vault exists.
5. Saving the open chat right after turning sync on is refused as "changed in another tab": `adoptAccountKey` calls `lock()`, which clears the vault's version tracking. The user can save it as a new conversation. Fix: keep `versions` and `observed` across that internal lock.
6. `refresh()` reads `this.device` after its request returns: a state request sent before a device record existed (the 10-second poll during a recovery or approval) can be judged against the new record and remove it ("unknown" read as revoked). Fix: capture the device before the request and compare after.
7. Not sync: in development (React StrictMode runs the mount effect twice) two first `/api/status` calls of a cookieless page can open two sessions; the page keeps one CSRF token and the browser the other cookie until the next status poll, so the first POST gets 403. The end-to-end test opens the session before the page loads, as a real sign-in does.
8. The engine does not report the time of a pairing request, nor that sync was reset from another device (it turns sync off silently); the screens are ready for both (section 8, security review).
