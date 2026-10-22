# What a user can delete today, and how — 22 October 2026

Status: ledger entry prepared by the agent on 22 October 2026 from the code on branch commit `7ce181a` and the documents named below. No code was changed. Labels: **IMPLEMENTED** means the path exists in the repository and has local tests recorded in READINESS or ARCHITECTURE; **PROPOSED** means it is described in a policy document but no runtime, job or route exists; **UNVERIFIED ON HOSTED** means the hosted candidate at app.cometrow.com has not been exercised for it (launch plan Phase 0.3 is TODO; private chat, email delivery and search are disabled there). Nothing here passes a gate. Physical erasure from storage media, write-ahead logs or expired backups is not claimed anywhere in this document.

## Summary table

| What | How, today | Status | What it leaves behind |
| --- | --- | --- | --- |
| One saved conversation | Saved list → Delete (`src/ConversationLibrary.tsx` → `Vault.delete` in `src/vault.ts`) | IMPLEMENTED locally; UNVERIFIED ON HOSTED | Opaque tombstone `deleted:<id>`; vault salt and check metadata; downloaded backups; browser or OS backups |
| All saved conversations at once | No single in-app control. Delete each snapshot, or clear the site's data in the browser (a browser action, outside the app) | NOT IMPLEMENTED as one control | Same as above; clearing site data also removes the vault metadata and the tombstones |
| Lock the vault | Lock control, sign-out, or 15 minutes without input (`src/App.tsx`, `Vault.lock`) | IMPLEMENTED locally; hosted vault save/reopen UNVERIFIED | Nothing is deleted; the key leaves application memory |
| Encrypted backup file | Delete the file on the device yourself | USER ACTION; the app cannot reach it | Any other copies; the file still opens with its original passphrase |
| Account (closure) | Account page → Close account, typed `DELETE ACCOUNT`, fresh email-code proof (`src/AccountDeletion.tsx`, `/api/account/close` in `server/account-auth.ts`, `server/account-closure.ts`) | IMPLEMENTED locally (synthetic lab and production-origin candidate); DISABLED on the hosted candidate because email delivery is off; UNVERIFIED ON HOSTED | Closure receipt; usage ledger rows; credentials and contact data until the purge runs |
| Credentials and contact data after closure | Purge after seven days unless held (`server/inactive-consumer-retention.ts`, migration 0009) | PROPOSED; the function is test-only and no job, CLI or scheduler calls it | Usage rows (by design); backups until they expire |
| Request ledger rows (`usage_requests`, `usage_metrics`) | Not deletable by the user | NOT DELETABLE BY US today; retention period is an owner decision pending | — |
| Sealed server working memory (Tinfoil cache) | Clears on its own, minutes to hours [supplier statement] | NOT DELETABLE BY US; no purge control exists | — |
| Sealed server billing metadata | About 90 days [supplier statement]; policy categories differ | NOT DELETABLE BY US | — |
| Search provider query records (Brave) | Up to 90 days [supplier statement] | NOT DELETABLE BY US; search is off on the hosted candidate | — |

## 1. Saved conversations and projects (the vault)

Where it lives: an account-scoped IndexedDB database in the browser, encrypted with a passphrase-derived key (PBKDF2-SHA256, 600,000 iterations, AES-256-GCM, one wrapped data key per conversation; README and ARCHITECTURE "Local encrypted history"). We never hold a copy.

**Delete one conversation — IMPLEMENTED.** In Saved, the Delete button calls `Vault.delete(id)` (`src/vault.ts`, `delete`). Inside one read/write transaction it checks the vault identity, writes the marker `deleted:<id>` to the meta store, then removes the conversation record, which holds the ciphertext and the wrapped key. Other open tabs are told over a BroadcastChannel. The app then shows: "Encrypted records and wrapped key deleted. Device backups and exported copies are outside this deletion." (`src/App.tsx`, the `onDelete` handler). The marker prevents a stale tab from saving the deleted record again (ARCHITECTURE, data lifecycle step 6). It is a random-ID marker with no content and no key. Deleting requires an unlocked vault; a lock mid-transaction aborts it.

Left behind: the tombstone; the vault's salt and passphrase-check metadata; any encrypted backup you downloaded earlier; whatever the browser or operating system backed up on its own (outside the application's erasure promise, README "Deletion retains an opaque random-ID marker").

**Delete everything at once — NOT IMPLEMENTED as one control.** A repository search on 22 October found no "clear vault" or `deleteDatabase` path in `src/`. Users delete snapshots one by one, or clear the site's storage in the browser, which is a browser action the app neither triggers nor can confirm. Projects (`projects-v1` registry) are deleted with the conversations they organise only through the browser's site-data clearing; there is no in-app "delete project and its contents" path recorded.

**Lock — IMPLEMENTED, not a deletion.** `Vault.lock()` clears the key and salt from memory, bumps the generation counter so in-flight work refuses to write, and broadcasts a lock to other tabs. Auto-lock after 15 minutes without keyboard or pointer input (`src/App.tsx`); confirmed sign-out broadcasts a lock and clears transient content (ARCHITECTURE "Account/workspace composition"). Locking is "not a forensic memory-erasure guarantee" (ARCHITECTURE, data lifecycle step 5). Changing the passphrase (`src/VaultSecurity.tsx`) re-wraps every record and locks; it does not delete anything and cannot revoke older backups.

Hosted status: vault save and reopen on app.cometrow.com are UNVERIFIED (CLAUDE_HANDOFF, launch plan 0.3).

## 2. Encrypted backup files on the device

`src/VaultBackup.tsx` downloads a single encrypted file (version 1 envelope, PBKDF2 and AES-256-GCM, original vault passphrase required; ARCHITECTURE "Portable encrypted saved history"). The panel states: "Deleting history here cannot delete downloaded copies." and "Nothing is uploaded."

Deleting the file is a user action on the device. The app has no record of where the file went or how many copies exist, and cannot delete, expire or revoke it. A passphrase change does not invalidate old files; they still open with the passphrase they were made with. Restore adds copies rather than overwriting, so a restore followed by a delete still leaves the file.

## 3. Account closure

**Path — IMPLEMENTED locally.** The account page's Close account section (`src/AccountDeletion.tsx`) requires the typed phrase `DELETE ACCOUNT` (`DELETE TEST ACCOUNT` in the synthetic lab), posts to `/api/account/close` (`server/account-auth.ts`), which calls `requestAccountClosure` (`server/account-closure.ts`). In one transaction under the per-account enrollment lock it requires an unconsumed email-code proof younger than five minutes for the current session and the account's verified email, inserts an `account_closure` row (`userId`, `requestedAt`, `purgeAfter = requestedAt + 7 days`), deletes every session of the account and deletes the pending sign-in OTP. Outcomes: `closed`, `busy` (409, another change in progress), `reauthenticate` (403). Authentication completion checks closure before issuing access; there is no reopening route (ARCHITECTURE "Account closure and deletion boundary").

The UI states before confirmation: "Credential deletion is prepared for a seven-day retention period, but no automatic purge or backup deletion is active. Usage records remain for reconciliation. Saved conversations in this browser, other devices, exports and provider records are not erased here. Delete local snapshots in Saved before closing the account."

**On the hosted candidate — DISABLED.** The deployed and pending candidates run with `emailEnabled=false`; closure, recovery and credential removal controls are disabled when email delivery is unavailable (CLAUDE_HANDOFF, commit `9c9be8e`; `src/AccountAccess.tsx` shows "Email delivery is disabled."). A hosted user today cannot close an account from the app. The owner can revoke access by removing an identity from the allowlist and redeploying; that is an operator action, not a user path, and is UNVERIFIED as a procedure.

**What closure deletes:** sessions (immediate sign-out everywhere) and the pending OTP. **What it keeps:** the account row with its email, the sign-in method rows and passkeys until the purge runs; the closure receipt permanently; usage ledger rows permanently (by design, for reconciliation); any security notice already admitted for dispatch.

## 4. Inactive-account retention and purge

Source: `docs/backup-retention-policy.md` ("Consumer-account implementation extension — 19 October, inactive") and `server/inactive-consumer-retention.ts`.

**PROPOSED, not active.** Migration 0009 records purge eligibility seven days after closure and supports incident holds (`holdUntil`). `purgeSyntheticClosedAccounts` deletes the `user` row (auth and contact children cascade) for due rows and stamps `purgedAt`. It refuses to run unless the database is the named synthetic one, the schema is a disposable test schema and account access is quarantined; it is "never imported by the application, auth router, CLI or scheduler". Its return value states the limits explicitly: `usageRetained: true`, `backupErasureVerified: false`, `physicalErasureVerified: false`.

The retention policy's own caveats apply: seven days plus seven days of backup expiry "describes intended logical retention, not verified physical erasure of WAL, storage or backups"; the schedule for usage, financial records, closure receipts, sender metadata, logs and provider-held content "need a reviewed schedule and disclosures before activation; no 14-day all-data-erasure promise". Launch plan Phase 3.3 (review migration, holds and backup cleanup; prepare the activation proposal) is TODO.

## 5. What cannot be deleted by us

| Item | Why | Source and label |
| --- | --- | --- |
| Sealed server working memory (prompt cache) | Lives in enclave GPU memory with no fixed expiration; unused entries are evicted within minutes, at the tail within hours; not written to disk; no opt-out or purge documented. Our client sends a fresh random `user_cache_secret` per request, which prevents reuse, not retention. | [supplier statement] https://docs.tinfoil.sh/sdk/prompt-caching.md, recorded in `docs/provider-qualification.md` 21 October; our client behaviour [verified] in `src/verified-chat.ts` |
| Sealed server billing metadata | Router logs time, model and token counts, not content; "most billing-related metadata is retained for 90 days" per the 15 October written reply; the published policy gives per-category periods (security logs 90 days, usage metrics while the account is active, billing records for accounting periods). Field-to-category mapping is an open question to the supplier. | [supplier statement, owner-supplied reply] `docs/provider-qualification.md` "Supplier reply received — 15 October"; https://tinfoil.sh/privacy |
| Our relay's ledger rows | `usage_requests` (request ID, account ID, period, state, two timestamps) and `usage_metrics` (prompt and completion tokens, model, published cost, web-search calls, recorded time) are the admission and reconciliation record; closure keeps them by design. Retention period: owner decision pending (launch plan 3.3; READINESS "Relay guards" privacy note). | [verified] `server/migrations/0004-usage-ledger.sql`, `0013-usage-metrics.sql`, `server/account-closure.ts` |
| Closure receipt | Opaque user ID and lifecycle times; "deliberately survives credential purge". | [verified] ARCHITECTURE "Account closure and deletion boundary" |
| Search provider query records | Brave may keep query records up to 90 days; query data is excluded from its DPA. Search is not enabled on the hosted candidate. | [supplier statement] https://api-dashboard.search.brave.com/documentation/resources/privacy-notice via `docs/search-provider-comparison.md` |
| Hosting edge and access logs | Fields, retention and operator access "not yet established". | `docs/backup-retention-policy.md` retention matrix |
| Database backups | Encrypted copies with a proposed seven-day expiry; registry backups cannot recover vault contents. | PROPOSED, `docs/backup-retention-policy.md` |
| Content already copied elsewhere | Clipboard, screenshots, OS copies, other devices, content already sent to the sealed server in an earlier request. | ARCHITECTURE "What each party can see" |

## 6. Open items this entry does not settle

- Owner decision on the retention period for ledger rows and closure receipts (launch plan 3.3).
- Activation of the credential purge and backup expiry (PROPOSED).
- A hosted rehearsal of every user-facing path above on app.cometrow.com once email delivery exists (launch plan 0.3 covers vault save/reopen only; closure needs email).
- Whether a single "delete all saved history" control should exist; none is recorded as planned.
- Supplier answer to the retention-category mapping (`docs/provider-outreach-20261020.md`, question 4).
