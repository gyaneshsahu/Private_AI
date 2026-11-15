# Multi-device use, sign-in and restore, and usability against privacy (15 November 2026)

**Status: review and design for the owner, plus one offline browser test. No product code was changed.** Agent review on the development line (`9d86e4e`). Sources: the code and docs named in each section, public vendor pages (fetched 15 November 2026), and one third-party support matrix for passkeys. Nothing here is decided; the owner decides. Where a fact is from a third party or not re-checked, it says so.

The owner's request in one line: CometRow must feel as smooth as ChatGPT or Gemini on phone, tablet and computer, with privacy as a verified promise. Red lines unless the owner changes them: no selling user data, no training on user data, and in the default mode nothing readable by CometRow is stored on our server.

## Summary

| Question | Short answer |
| --- | --- |
| Can a user use CometRow on a second device today? | Signing in works (Google). The account and the allowance follow. **Nothing saved follows**: chats, memory, projects, project files and Manual tasks stay in the first browser. The only way to move them is a backup file plus the original passphrase. Project files are never in the backup. Tested in a real browser with two devices (section 1.3). |
| What if the passphrase is lost? | The saved data on that device and every backup file are closed for good. There is no recovery and no reset button in the app while locked. Tested (section 1.3). |
| Biggest usability gaps | No sync between devices; chats are only kept if the user presses Save; the passphrase is typed on every visit and again after 15 idle minutes; a new device silently starts an empty vault; a backup fails above 100 saved chats; no notifications. |
| Recommended default | **End-to-end encrypted sync**: the server stores only ciphertext that CometRow cannot read. One random account key per user, unlocked by: this device (remembered), a passkey with the PRF extension where supported, approval from another signed-in device, and a recovery key shown once. Chats save automatically (incognito excepted). |
| Does that cross the red line? | No, if the keys never reach the server: nothing **readable** by CometRow is stored. But today's promise "We keep no copy of your conversations" must change to "we keep an encrypted copy we cannot read", and the metadata we can see (counts, sizes, times) must be stated. Policy drafts in section 3. |
| Files | Encrypted blobs in EU object storage, downloaded only when opened. Recommended: Hetzner Object Storage (German company, German sites). About EUR 6.49 a month for 30 alpha users at 1 GB each, and about EUR 7.50 (expected) to EUR 41 (worst case) a month for 1,000 users at 5 GB each. |
| Optional extras | Content-free push notifications (opt-in per device). Not recommended now: key escrow ("CometRow can help me recover") and readable sync; both cross the red line and would have to be labelled opt-ins with a policy change. |
| Privatemode DPA and training | The public DPA (last updated 24 July 2026) has **no sentence about training**. No training follows only from purpose limitation: section 2(1) and section 4(4) "process the Data only for the purposes agreed in this DPA". Exact text in section 4. Ask Edgeless for an explicit no-training sentence. |

## 1. Second device today

### 1.1 The steps, as a user experiences them

Assume Anna uses CometRow on her laptop. She has saved chats, two memories, a project with instructions and one file, and a Manual scheduled task. Now she opens CometRow on her phone.

1. **She opens the app on the phone and signs in with Google.** In production Google is the only way in for a new device: email codes are switched off (`server/deployment-process.ts`, `emailEnabled: false`). Her Google account must be on the alpha allowlist, as on the laptop. Passkeys exist in the account system (`server/account-auth.ts`, the Better Auth passkey plugin), but only as a **sign-in method that a signed-in user can add on the account page**. A passkey synced by Apple or Google can sign her in on her other devices. It has nothing to do with the vault. No passkey derives or holds any vault key today.
2. **What she sees after sign-in.** Her email address and her remaining allowance ("138 of 150 requests remaining"), the same as on the laptop, because both come from our server (`/api/status`). Chat works at once with the same allowance.
3. **What she does not see.** Her saved chats, memories, projects, project instructions, project files and Manual tasks. The sidebar says there are no saved chats. They live only in the laptop's browser, in the encrypted vault in IndexedDB (`src/vault.ts`, one database per account, `privateai-vault-<account id>`).
4. **She opens Saved and types her usual passphrase.** The app does not open her laptop's vault (it cannot: there is none on the phone). It **silently creates a new, empty vault** on the phone with that passphrase. The button reads "Create or unlock vault". Nothing tells her that her laptop data is elsewhere.
5. **To move her data she must use a backup file.** On the laptop: open Saved, unlock, press "Download encrypted backup". The browser saves a file (`privateai-encrypted.privateai-backup`), encrypted with the laptop vault's passphrase. She must get that file to the phone herself (email to herself, a cloud drive, a cable). On the phone: open Saved, unlock (the phone vault), pick the file under "Encrypted backup and restore", type the **original** passphrase, tick "I want to add copies from this backup to the current vault", press "Restore as new copies".
6. **What the restore brings:** the saved chats (as new copies), project names and instructions (projects get new ids), memories (merged), scheduled tasks (always as Manual tasks with new ids, so a restore never creates a server copy).
7. **What the restore does not bring:** project files (by design, `docs/projects-20261114.md`, "Backup"); she must add them again. Unsaved chats. Chats on the laptop after the backup was made.
8. **From now on the two devices drift apart.** A chat saved on the phone never reaches the laptop and the other way round. Every move is another backup and another restore, and each restore adds duplicates of what was restored before.
9. **Background (Auto) tasks**, if the owner switches them on: these live on our server per account, so the server keeps running them whatever device she uses. Each result goes to **whichever signed-in browser with an unlocked vault fetches it first** (`src/ScheduledPanel.tsx`, the results poll), is saved there and deleted from the server. So a result can end up on the phone only, titled "unknown task" there if the phone vault does not hold the task.

**Limits that bite:**

- A backup refuses entirely when the vault holds more than 100 saved chats (`src/vault.ts`, `readAvailable(100)` throws "backupMaximum") or more than 10 MB of content.
- "Download encrypted backup" is disabled when there are no saved chats and no projects, even if there are memories or tasks (`src/App.tsx`, `canExport`).
- The passphrase is needed on every visit: the key is held in memory only, and the vault locks after 15 minutes without a tap or key press (`src/App.tsx`, the idle timer).

### 1.2 Loss

| What is lost | What happens | Recoverable? |
| --- | --- | --- |
| The passphrase | The vault on every device opens only with its passphrase. "Create or unlock vault" keeps failing. While locked the app offers no "Delete everything" and no reset; the only way out is to clear the site's data in the browser settings, which deletes the vault. Every backup file made with that passphrase is closed too. | **No.** Nobody can recover it, not CometRow, not the user. This is what the privacy policy says today ("If you lose your password, nobody can recover your saved history"). |
| The device (laptop stolen, phone broken) | The vault on it is gone for the user. A thief needs the passphrase to read it (PBKDF2-SHA256, 600,000 rounds, AES-256-GCM); a weak passphrase can be guessed offline. | Only from a backup file, with its original passphrase. Everything saved after the last backup is lost. |
| The browser data (cleared, private window, iOS storage eviction) | Same as losing the device. | Only from a backup file. |
| The Google account | She cannot sign in. If an operator restores access to the account, the vault is untouched and still opens with the passphrase. | The account: through support (operator scripts). The vault: unaffected. |
| Changing the passphrase | Old backup files still need the old passphrase. | Yes, with the old passphrase. |

### 1.3 The test, and its results

File: `tests/second-device-ui.test.ts` (vitest plus Playwright Chromium, own Vite server on a random port, `src/inference.ts` replaced, no network beyond the local server). Two separate browser contexts are two devices: their own storage and IndexedDB, signed in to the same account. Both read one shared fake account record through `/api/status`, the way other UI tests fake the server. The real account server and Postgres are not exercised here (the per-account allowance on the server is covered by `tests/account-usage-http.test.ts`).

| Test | What it shows | Result |
| --- | --- | --- |
| Device A (computer, 1280 px): saves a chat through the app; a memory, a project with instructions and a file, and a Manual task are written into the vault the way the app writes them; downloads the backup | All five kinds are in the vault; the browser storage holds no plaintext (canary strings searched in the raw IndexedDB dump); the backup file holds no plaintext; decrypted, it holds the chat, the memory, the project and the task, **and not the project file** | Pass |
| Device B (phone, 375 px): signs in to the same account | The account and the same allowance ("138 of 150") show on both devices; after the server books one more request, device B shows "137 of 150" on its next status read. Typing **the same passphrase** on device B creates a new, **empty** vault: no chats, memories, projects, files or tasks | Pass |
| Device B: restores device A's backup with the original passphrase | Chat, project name and instructions, memory and task (as Manual) arrive; the project file does not; a memory added on device B never reaches device A; neither device sent anything to our server but `GET /api/status` | Pass |
| Lost passphrase, on device A | A wrong passphrase is refused; while locked there is no "Delete everything", no backup and no recovery control; the stored data is ciphertext only; the backup file refuses the wrong passphrase; the right passphrase still opens it (no back door, and no data destroyed) | Pass |

Run on 15 November 2026: 4 of 4 passed, 6.9 s. `npx tsc --noEmit`: clean.

## 2. Usability review, area by area

"Leading products" means ChatGPT, Gemini and Claude unless stated. Their behaviour is from public help pages and press (sources at the end); plan limits change often.

| Area | Awkward today | Why (which privacy choice causes it) | How the leading products behave |
| --- | --- | --- | --- |
| **Multi-device** | Every device is an island. Phone, tablet and laptop each have their own vault. | Saved content lives only in the browser vault; the server stores nothing (rule: "nothing stored on the server beyond accounts and the content-free usage ledger"). | History, memory and projects are stored on the provider's servers and appear on every device after sign-in. Readable by the provider. |
| **Sign-in and restore** | Google is the only sign-in for a new device. Then a second secret, the passphrase, on every visit and after 15 idle minutes. Same passphrase on a new device silently makes an empty vault. Lost passphrase means total loss. | The vault key is derived from a passphrase and kept in memory only, so the server never holds anything that could unlock it. | One sign-in, and everything is there. End-to-end encrypted products solve the same problem with device approval (Bitwarden trusted devices, Apple Advanced Data Protection), a recovery key (Apple, WhatsApp, Signal), a passkey that unlocks (WhatsApp backups, Bitwarden, 1Password), or a Secret Key plus password (1Password). |
| **Saving chats** | A chat is kept only if the user presses "Save encrypted snapshot". Reload or lock clears unsaved work. | "Saving is always your choice" (privacy by default). | Every chat is saved automatically; a temporary or incognito chat is the exception. |
| **Files** | Project files are extracted text only (original files are never kept), limited to 3,000,000 characters per vault, not in the backup, on one device. | Original binaries are not persisted; the backup must stay under 10 MB; no server storage. | ChatGPT stores the original files per project (help pages: up to 512 MB per file, and 20 to 40 files per project by plan, figures third-party). Claude: projects with RAG on paid plans. Gemini: notebooks with many sources. All server-side. |
| **Memory** | Works, on one device only. Restore merges memories, but a second device does not learn new ones. | Stored in the vault. | Memory is server-side and on by default in Claude and ChatGPT; follows the user everywhere. |
| **Projects** | Same as memory, plus the files gap. | Same. | Server-side, on every device. |
| **Saved chats** | Organised well (pin, archive, rename, date groups), but the list is per device and needs the passphrase first. | Vault. | Same features, everywhere, no unlock step. |
| **Search** | Full-text search over saved chats works (`src/conversation-library.ts`: titles, messages, attachment names, branches), but only on that device and only after unlock. | On-device search over decrypted records; no server index, by design. | Server-side search on every device. Claude notes search is unavailable when the customer manages the encryption keys, the same trade-off we have. |
| **Notifications** | None outside the open app. No service worker, no manifest, no email sender. | Any push or email needs a third party (the browser maker's push service, a mail processor) and some server state. Analysed in `docs/scheduled-tasks-design-20261114.md`. | ChatGPT tasks send push and email; Gemini scheduled actions send a phone notification. |
| **Scheduled tasks** | Manual tasks run only when tapped in the open app. Auto tasks run on the server but their results land on whichever device fetches them first. | Manual: vault only. Auto: an opt-in that our server can read (`docs/background-tasks-20261115.md`). | Server runs them, results appear everywhere, with a notification. |
| **Voice** | Works per device. Audio is never stored. Nothing to sync. | Audio goes only to the confidential model. | Similar from the user's view; transcripts become part of server-side history. |
| **Sharing between own devices** | Only the backup file: download, move it yourself, restore with the original passphrase, duplicates on repeat. Copy as text is the other way. | No server storage. | Not needed: everything is already on every device. |

**Where privacy and usability truly conflict.** Most of the friction above is not a law of nature; it comes from "nothing on the server at all". End-to-end encrypted sync removes most of it while keeping "nothing readable by CometRow". Five conflicts remain even then, and only the owner can trade them:

1. **Recovery after losing everything.** If a user loses every device, every passkey and the recovery key, only a key held by someone else could help. If that someone is CometRow, CometRow could read the data. There is no design that gives both.
2. **Work while every device is closed** (scheduled answers, server search, a notification that says what the task found). The server must read the content. Already handled as the labelled Auto opt-in.
3. **Metadata.** Encrypted sync shows us how many items a user stores, their sizes and when they change. It can be reduced (padding, batching), not removed.
4. **The passkey provider joins the chain.** If a passkey unlocks the vault, the security of the user's Apple, Google or password-manager account becomes part of the vault's security. Those providers sync passkeys end-to-end encrypted, so they cannot read them either, but a takeover of that account plus a signed-in device opens the vault.
5. **Device-only by default is the most private, and the most awkward.** The owner said not to keep an awkward design only because it is the most private. Section 3 proposes sync on by default with a clear switch to keep data on one device.

## 3. Design options

### 3.0 The building block shared by the options: one account key, several ways to unlock it

Today the vault key is derived from the passphrase. That is why every device needs the passphrase and why losing it is total loss.

The standard fix (used by 1Password, Bitwarden, Apple and WhatsApp in their own ways):

- On the first device the app creates a random 256-bit **account vault key**. All saved records are encrypted under it. The existing design already wraps a fresh data key per conversation, so only the outer wrap changes.
- The account key is then **wrapped** (encrypted) several times, once per "unlocker". Each wrap can be stored on our server, because a wrap is useless without its unlocker:
  - **This device**: a non-extractable WebCrypto key kept in this browser. The page can use it but never read or export it. The user does not type anything on a remembered device.
  - **A passkey with PRF**: the passkey produces a secret on the user's device during sign-in; that secret unwraps the account key. One tap signs in and unlocks.
  - **Another device's approval**: the new device shows a code; a signed-in device approves and hands over the account key, encrypted end to end.
  - **A recovery key**: about 26 random characters (128 bits or more), shown once, printed or saved. Typed only when everything else is lost.
  - **Optionally a passphrase**, see the caution in 3.1.
- The server never sees the account key or any unlocker in usable form. Losing one unlocker is fine while another remains.

### 3.1 Option A: end-to-end encrypted sync of the vault (recommended default)

**User experience, step by step.**

1. First use, laptop: sign in with Google. The app says in one screen: "Your chats, memory, projects and files are saved automatically and kept in sync on your devices. They are locked on this device with a key we never get, so we cannot read them." Then it shows the recovery key with "Print" and "Save as file", and asks the user to type the last 4 characters back. Optional: "Add a passkey to sign in and unlock with one tap".
2. Daily use, same device: open the app. Already unlocked (remembered device). No passphrase. Optionally a biometric prompt (passkey) after idle time instead of a passphrase.
3. New phone: sign in with the passkey (one tap, if PRF works there) and everything appears. Or sign in with Google; the phone shows "Approve this phone from another device" with a 6-digit code and a QR code. On the laptop a banner says "A new device wants access. Code 482 913. Approve?" The user checks the code matches and taps Approve. The phone unlocks. Or, with no other device: "Use your recovery key".
4. Then: chats, memory, projects and tasks appear; file contents download when opened. A change on any device shows on the others within seconds when online.
5. Lost phone: on the laptop, "Devices", "Remove this phone". The server deletes that device's wrap and its session. (Data already on the phone stays readable to whoever unlocks that phone; the same is true for every sync product.)

**What the server stores and can read.**

| Stored | Readable by CometRow? |
| --- | --- |
| Encrypted records: one per chat, plus memory, projects, project file index, tasks (ciphertext, a random record id, a version number) | No |
| Wraps of the account key (per device, per passkey, the recovery-key wrap) | No |
| Per record: size, time of each change, which session uploaded it, deletion times; per account: number of records, total bytes, number of devices and passkeys | **Yes. This is the metadata that leaks.** Mitigation: pad record sizes to fixed steps (for example multiples of 4 KB), upload in batches, use random record ids |
| Device approval messages in transit | No (end-to-end encrypted, deleted when used or after 10 minutes) |

**Does this cross the red line?** The red line is "in the default mode nothing readable by CometRow is stored on our server". Ciphertext whose keys never reach the server is not readable by CometRow, so the line holds. Three honest caveats belong in the policy, not in small print: we do store an encrypted copy (today's text says we keep no copy); the metadata above is visible to us; and a broken or malicious app update could read content before it is encrypted, as today. Under GDPR the encrypted copy is still personal data that we store: it needs an Art. 30 entry, deletion on account closure, and a statement on how long database backups keep it.

**Key sources, compared.**

| Unlocker | User effort | Works on | Risk | Verdict |
| --- | --- | --- | --- | --- |
| (i) Passphrase (key derived from it, wrap stored on the server) | Type it on every new device | Everywhere | **Anyone with a copy of our database can guess weak passphrases offline**; PBKDF2 is the only key-stretching function WebCrypto offers; Argon2 would need a new library | Keep only for existing vaults and backup files; not as a server-stored wrap unless it is long and checked (or the owner accepts the risk) |
| (ii) Passkey with PRF | One tap | Apple iOS and iPadOS 18+ (cross-device fixed in 18.4), macOS Safari 18+ and Chrome 132+, Android Chrome with Google Password Manager, Windows 11 Hello since the February 2026 update (24H2 and 25H2; Chrome 147+ also at registration), Firefox 139+ (148+ with Windows Hello); 1Password, Proton Pass, Apple and Google passkeys support it. **Not**: Windows 10, Dashlane, NordPass; Bitwarden patchy; Microsoft Password Manager only at registration. Source: a third-party matrix (Corbado, September 2026), small samples | The passkey provider's account becomes part of the chain (conflict 4) | Best experience where it works; must be an addition, never the only unlocker |
| (iii) Device approval | Two taps and a code comparison | Everywhere the app runs | A user who approves without comparing the code could approve an attacker who already has their Google account | Main path for new devices without PRF |
| (iv) Recovery key | Store it once; type it only in an emergency | Everywhere | Lost recovery key plus lost devices means total loss | Required at setup, as Apple requires one for Advanced Data Protection |

**Passphrase or device loss.** Passphrase: no longer matters for daily use. One device lost: remove it from another device; nothing else changes. All devices lost: a synced passkey with PRF (it survives on the new phone through iCloud or Google) or the recovery key opens everything. All of those lost: total loss, as today.

**Effort.** Large. Account key and wraps, migration of existing passphrase vaults, a sync protocol (versions, conflicts, tombstones for deletions), server routes and a table for ciphertext, device approval, recovery key, a devices screen, tests at 375, 768 and 1280 px in English and German. Roughly 2 to 3 weeks of agent work plus an independent cryptography review before public launch.

**Cost.** Records are small (text): a few MB per active user. They fit in the existing Render PostgreSQL in Frankfurt for the alpha (Render storage prices not checked here). Files are option B.

**Risks.** A sync bug can lose or duplicate data on every device at once (needs version checks, never silent overwrite, and an undo window for deletions). Account takeover now gives the attacker the ciphertext, still useless without an unlocker. One more stored category to delete on account closure.

**Privacy policy changes (drafts; binding German needs the legal read).**

- Replace "We keep no copy of your conversations; saved history lives only on your device, locked with a password we do not have." with:
  - EN: "If sync is on, we store an encrypted copy of your saved chats, memory, projects and files on our servers in the EU, so that you can use them on your other devices. They are locked on your device with a key we never receive, so we cannot read them. We can see how many items you store, how large they are and when they change. Turn sync off to keep everything on this device only; turning it off deletes the copy on our servers."
  - DE: "Wenn die Synchronisierung eingeschaltet ist, speichern wir eine verschlüsselte Kopie Ihrer gespeicherten Chats, Erinnerungen, Projekte und Dateien auf unseren Servern in der EU, damit Sie sie auf Ihren anderen Geräten nutzen können. Sie wird auf Ihrem Gerät mit einem Schlüssel verschlossen, den wir nie erhalten; deshalb können wir sie nicht lesen. Wir sehen, wie viele Einträge Sie speichern, wie groß sie sind und wann sie sich ändern. Schalten Sie die Synchronisierung aus, um alles nur auf diesem Gerät zu behalten; beim Ausschalten wird die Kopie auf unseren Servern gelöscht."
- Replace "If you lose your password, nobody can recover your saved history." with:
  - EN: "If you lose all your devices, your passkeys and your recovery key, nobody can open your saved history, not even us."
  - DE: "Wenn Sie alle Ihre Geräte, Ihre Passkeys und Ihren Wiederherstellungsschlüssel verlieren, kann niemand Ihren gespeicherten Verlauf öffnen, auch wir nicht."
- Passkey unlock:
  - EN: "When you unlock with a passkey, your passkey manager (for example Apple, Google or 1Password) creates the key on your device. It is never sent to us."
  - DE: "Wenn Sie mit einem Passkey entsperren, erzeugt Ihr Passkey-Manager (zum Beispiel Apple, Google oder 1Password) den Schlüssel auf Ihrem Gerät. Er wird nie an uns gesendet."
- Automatic saving:
  - EN: "Chats are saved automatically. An incognito chat is never saved."
  - DE: "Chats werden automatisch gespeichert. Ein Inkognito-Chat wird nie gespeichert."
- Deletion section, add:
  - EN: "Closing your account deletes the encrypted copy on our servers. Our database backups keep it for up to 7 more days, still encrypted."
  - DE: "Wenn Sie Ihr Konto schließen, wird die verschlüsselte Kopie auf unseren Servern gelöscht. Unsere Datenbanksicherungen bewahren sie noch bis zu 7 Tage auf, weiterhin verschlüsselt."
  (The 7 days follow `docs/backup-retention-policy.md`; check the figure before use.)

### 3.2 Option B: project files and attachments as encrypted blobs in EU object storage

**User experience.** Add a PDF to a project on the laptop. On the phone the project lists the file at once (name, size). The contents download, decrypt and get read only when the file is used or opened. A quota bar shows "1.2 GB of 5 GB used". Over the quota: the add is refused with a plain sentence and a link to remove files.

**How it works.** The browser encrypts the original file and its extracted text, each with a fresh file key wrapped under the account key, pads the size, and uploads the ciphertext directly to the bucket through a short-lived signed address from our server (the server never handles the bytes). The bucket object name is random. The file index (name, size, type) is inside the encrypted project record, so the bucket holds no names. Keeping the original file (encrypted) lets every device show it and re-extract it with newer code; today only the extracted text is kept.

**What the provider and we can see.** Number of objects, their padded sizes, upload and download times, the account they belong to (through our server's records). Never names or contents.

**Storage providers** (list prices, excluding VAT; fetched 15 November 2026 unless marked; "3P" = third-party source, "K" = not re-checked this session):

| Provider (headquarters) | Storage | Egress (data out) | Requests | EU locations | DPA |
| --- | --- | --- | --- | --- | --- |
| Hetzner Object Storage (Germany) | EUR 6.49 a month base, includes 1 TB stored and 1 TB egress; more storage about EUR 6.35 per TB-month | EUR 1.00 per TB beyond 1 TB | Free | Falkenstein, Nuremberg (Germany), Helsinki | Yes, concluded by the customer in the account (not automatic) |
| OVHcloud Standard S3 (France) | 1-AZ about EUR 7.10 per TB-month; 3-AZ about EUR 14 | Free | Free | 3-AZ Paris; 1-AZ several, Frankfurt included (K) | Yes, in the contract (K) |
| Scaleway (France) | Multi-AZ about EUR 14.60 per TB-month (official pages conflict; 3P) | 75 GB a month free, then EUR 0.01 per GB | Included | Paris, Amsterdam, Warsaw | Yes (K) |
| IONOS S3 (Germany) | About USD 4.99 per TB-month | Tiered, rates not published in the docs | Free | Germany (Frankfurt, Berlin), Spain | AVV in the account (K) |
| Backblaze B2 (USA) | USD 6.95 per TB-month, first 10 GB free | Free up to 3 times the stored amount | Mostly free | Amsterdam | Yes, with SCCs |
| Cloudflare R2, EU jurisdiction (USA) | USD 15 per TB-month, 10 GB free | Free | USD 4.50 per million writes, USD 0.36 per million reads | "Inside the EU", no city named | Yes (K) |
| AWS S3, Frankfurt (USA) | USD 24.50 per TB-month (3P) | USD 0.09 per GB after 100 GB free | Writes about USD 5.40 per million (3P) | Frankfurt | Yes, in the service terms (K) |

The US companies fall under the US CLOUD Act whatever the EU region. For ciphertext this matters less, but EU-headquartered providers keep the story simple.

**Cost, worked out.** Two cases. Alpha: 30 users, quota 1 GB each, worst case all full (30 GB stored), each user downloads twice what they store per month (60 GB egress). Launch: 1,000 users, quota 5 GB each; worst case all full (5 TB stored, 10 TB egress a month); expected 20 % full (1 TB stored, 2 TB egress).

| Provider | 30 users, worst | 1,000 users, expected | 1,000 users, worst |
| --- | --- | --- | --- |
| Hetzner | EUR 6.49 | EUR 7.49 | EUR 40.89 (6.49 + 4 TB x 6.35 + 9 TB x 1.00) |
| OVHcloud 1-AZ | about EUR 0.21 | EUR 7.10 | EUR 35.50 |
| OVHcloud 3-AZ | about EUR 0.42 | EUR 14.00 | EUR 70.00 |
| Scaleway Multi-AZ | about EUR 0.44 | about EUR 33.85 | about EUR 172 |
| Backblaze B2 EU | about USD 0.14 | USD 6.95 | USD 34.75 |
| Cloudflare R2 EU | about USD 0.30 | about USD 15 | about USD 75 plus requests |
| AWS Frankfurt | about USD 0.74 | about USD 195 | about USD 1,014 |

Per user at 1,000 users this is under EUR 0.05 a month on Hetzner even in the worst case. Storage is not the cost problem; inference is.

**Recommendation for B:** Hetzner Object Storage in Nuremberg or Falkenstein. German company, German sites, cheapest at both sizes, no request fees, an AVV you sign in the account. Watch: the EUR 6.49 base fee applies from the first bucket; objects under 64 KB are billed as 64 KB (pad small files anyway); durability and replication statements were not checked here. Fallback with three-zone durability and free egress: OVHcloud 3-AZ.

**Quota per plan (proposal, prices not decided):** alpha 1 GB per account; at launch Free 500 MB, a middle plan 10 GB, a top plan 50 GB. Today's limits (20 files per project, 10 MB per file) can stay for the alpha.

**Effort.** Medium to large, after option A (needs the account key). Signed upload and download routes, quota accounting on the server (bytes per account, content-free), lazy download with a local cache, deletion on file removal and account closure, tests.

**Risks.** An extra processor (Hetzner) to name in the Art. 30 record and the policy. Orphaned objects if a delete fails (needs a sweep). Download costs if a bug downloads in a loop (rate limit per account).

**Privacy policy changes.**

- EN: "Files you add to a project are encrypted on your device and stored, still encrypted, with Hetzner Online GmbH in Germany. Neither Hetzner nor we can read them. We see how many files you store, their approximate sizes and when they are added, opened or deleted. Your plan includes [quota] of storage."
- DE: "Dateien, die Sie einem Projekt hinzufügen, werden auf Ihrem Gerät verschlüsselt und weiterhin verschlüsselt bei der Hetzner Online GmbH in Deutschland gespeichert. Weder Hetzner noch wir können sie lesen. Wir sehen, wie viele Dateien Sie speichern, ihre ungefähre Größe und wann sie hinzugefügt, geöffnet oder gelöscht werden. Ihr Tarif enthält [Kontingent] Speicherplatz."

### 3.3 Option C: architectures that trade privacy for usability

**C1. Key escrow, opt-in: "CometRow can help me recover".** The server keeps a wrap of the account key under a server-held key (ideally in a separate key store, released only after a support check with a delay and an email notice).

- Experience: lose everything, sign in with Google, ask support, wait 48 hours, get access back.
- Stores and can read: **CometRow can read the user's data while this is on.** A court order can force us to hand it over.
- Red line: **crosses it.** Acceptable only as a labelled opt-in, off by default, reversible (turning it off deletes our wrap), with the policy change below.
- Effort: medium, plus an operational recovery process and audit log. Cost: small. Risk: our server becomes a high-value target for every user who opts in; staff access must be controlled and logged.
- Policy:
  - EN: "If you turn on 'CometRow can help me recover', we keep a copy of your key on our server. We use it only when you ask us to restore your access, after you sign in and confirm your identity, and we tell you by email when we do. While this is on, CometRow could technically read your saved data, and we could be ordered by a court to hand it over. You can turn it off at any time; we then delete our copy of the key."
  - DE: "Wenn Sie „CometRow darf mir bei der Wiederherstellung helfen“ einschalten, bewahren wir eine Kopie Ihres Schlüssels auf unserem Server auf. Wir verwenden sie nur, wenn Sie uns bitten, Ihren Zugang wiederherzustellen, nachdem Sie sich angemeldet und Ihre Identität bestätigt haben, und wir informieren Sie dann per E-Mail. Solange diese Option eingeschaltet ist, könnte CometRow Ihre gespeicherten Daten technisch lesen, und ein Gericht könnte uns zur Herausgabe verpflichten. Sie können sie jederzeit ausschalten; dann löschen wir unsere Kopie des Schlüssels."
- Verdict: **not for the alpha.** The recovery key plus a synced passkey covers nearly everyone. Revisit if support sees real lockouts.

**C2. Readable sync, opt-in "Convenience mode".** Store chats readable on our server (like ChatGPT). Enables server-side search, server-run tasks with content, notifications that say what was found, and web access with no key at all.

- Red line: **crosses it hard**, and it changes what CometRow is. It would make us a holder of readable chats, with breach, staff-access and legal-order exposure for every user who opts in.
- Verdict: **not recommended.** Option A gives almost all of the same usability without it. The Auto background task is already the right size of exception: one task, opted in, labelled.

**C3. Recovery contact.** A trusted other CometRow user holds an encrypted share of the account key (Apple offers this). Does not cross the red line. Effort medium; useful later for families. Not needed for the alpha.

**C4. Keep device-only and polish the backup.** Automatic backups to a folder the user picks (File System Access API: Chrome and Edge on desktop only; not Safari or iOS), larger limits, project files in the backup. Most private, still awkward: no live sync, phones poorly served. Good as Stage 0 polish, not as the answer.

### 3.4 Notifications (applies to every option)

Content-free Web Push, opt-in per device (`docs/scheduled-tasks-design-20261114.md`, B1). Needs a service worker and a web app manifest; on iPhone only for a web app added to the Home Screen (iOS 16.4 and later). The notification says only "A task is due in CometRow". Stored: a push address per browser (at Apple, Google, Mozilla or Microsoft) and the next due time. Effort medium.

- EN: "If you turn on notifications on a device, we store a push address for that browser, run by your browser's maker (Apple, Google, Mozilla or Microsoft), and the time your next task is due. The notification only says that a task is due; it never contains the task or its answer."
- DE: "Wenn Sie Benachrichtigungen auf einem Gerät einschalten, speichern wir eine Push-Adresse für diesen Browser, die vom Hersteller Ihres Browsers (Apple, Google, Mozilla oder Microsoft) betrieben wird, und den Zeitpunkt, zu dem Ihre nächste Aufgabe fällig ist. Die Benachrichtigung sagt nur, dass eine Aufgabe fällig ist; sie enthält nie die Aufgabe oder ihre Antwort."

For an Auto task (which the server reads anyway) the notification could name the task, if the user agrees in the Auto consent.

### 3.5 Options at a glance

| | A. Encrypted sync | B. Encrypted files in EU storage | C1. Escrow opt-in | C2. Readable sync opt-in | C4. Better backups only |
| --- | --- | --- | --- | --- | --- |
| Feels like ChatGPT | Yes, except lost-everything recovery | Yes for files | Adds recovery | Fully | No |
| CometRow can read | No | No | Yes, for opted-in users | Yes, for opted-in users | No |
| Red line | Holds; policy wording changes | Holds; new processor named | Crossed, opt-in only | Crossed, opt-in only | Holds |
| Metadata visible to us | Counts, sizes, times | Counts, sizes, times | Same as A | Everything | None new |
| Effort | Large | Medium to large | Medium | Large | Small |
| Monthly cost at 1,000 users | Small (database) | EUR 7.50 to 41 (Hetzner) | Small | Small | None |

### 3.6 Recommendation

**Default path:** Option A with all four unlockers except the server-stored passphrase wrap, plus automatic saving, then option B for files on Hetzner. Sync on by default for new users, with a visible switch "Keep my data on this device only". Incognito chats are never saved or synced.

Why on by default: the owner's rule is usability first with privacy as a verified promise. Encrypted sync keeps the verified promise (CometRow cannot read it) and removes most of the friction. A user who wants device-only can have it with one switch.

**Optional extras:** content-free push notifications (opt-in per device). Later, if support shows a need: recovery contact (C3) before escrow (C1).

**Not recommended:** readable sync (C2). Escrow (C1) for the alpha.

### 3.7 Staged plan

| Stage | What | Server change | Effort | When |
| --- | --- | --- | --- | --- |
| 0 | Quick fixes with no new server storage: (1) "Save chats automatically" setting, on by default when the vault is unlocked, incognito excepted; (2) "Remember this device" with a non-extractable device key, so no passphrase on every visit (choice shown, with its risk: anyone using this browser profile gets in); (3) on a new device, explain that saved data does not follow and how to move it, instead of silently creating an empty vault (needs a content-free "this account has a vault elsewhere" flag, or just a plain sentence every time); (4) "Forgot passphrase? Start over on this device" while locked, with a clear warning; (5) backups above 100 chats (split files) and with memory or tasks only; (6) project files in the backup as an option | None (3 could use one boolean per account) | Small, 2 to 4 days | Alpha, now |
| 1 | Option A for records: account key, recovery key, device approval, sync of chats, memory, projects, tasks; migration of existing vaults; a deployment switch `inference.vaultSync`, default off; policy and Art. 30 update | New ciphertext table and routes | Large | Alpha, weeks 2 to 4 |
| 2 | Passkey PRF: sign in and unlock in one tap where supported; fallback to device approval | Small (wrap per passkey) | Medium | Alpha, after 1 |
| 3 | Option B: encrypted files on Hetzner, lazy download, quota; originals kept | Signed URLs, quota counter, bucket | Medium to large | Before launch |
| 4 | Content-free Web Push, service worker, manifest (also makes the app installable) | Push subscriptions table | Medium | Before launch |
| 5 | Independent cryptography and security review of 1 to 4 | None | External | Before public launch |

## 4. The Privatemode DPA and training

**Where the text comes from.** No Privatemode DPA text is in the repository: `docs/private/` holds three other files, and `docs/dpa-record-privatemode-20261112.md` only cites sections. The owner's notes (`docs/privatemode-master-notes.md`) contain no training clause. So the source is the public DPA at **https://www.privatemode.ai/dpa**, "Last updated: July 24, 2026", fetched on 15 November 2026. The same date as the version `shared/provider-disclosure.ts` cites.

**The exact clause.** The DPA contains **no sentence that mentions training** (the page text was searched for "train", "improv", "machine learn", "own purpose", "aggregat" and "anonymi": no hits). The Terms of Service (https://www.privatemode.ai/terms-of-service, last updated 13 November 2026) and the privacy policy (https://www.privatemode.ai/privacy-policy, last updated 6 August 2026) have no such sentence either. The clauses that rule out training are the purpose limitation:

> Section 4 (Confidentiality and Processor Obligations), paragraph (4): "The Processor and the persons it engages for processing will process the Data only for the purposes agreed in this DPA. No copies or duplicates will be made without the Controller's knowledge, except for backups required to ensure proper data processing and data required to comply with statutory retention obligations."

> Section 2 (Subject Matter, Nature, and Purpose of the Processing), paragraph (1): "The subject matter of the processing is the provision of an end-to-end encrypted inference infrastructure for generative AI models (Privatemode AI). The purpose of the processing is to process the inputs (prompts) submitted by the Controller in order to generate model responses in accordance with the Terms of Service and the related service description."

Supporting: section 11(1) "By design, the Service does not persistently store personal payload data (prompts and model responses)." Terms of Service 6.1: "The Service is designed so that even employees of Edgeless Systems cannot access data that is shared with the Service."

**In plain words.** Edgeless may use our users' prompts and answers only to produce the answer. Training a model is not an agreed purpose, so it would breach the DPA and GDPR (a processor that uses data for its own purposes becomes a controller under Art. 28(10)). The design adds a technical barrier: prompts are encrypted to sealed machines and not stored. **But there is no explicit "we do not train" sentence**, so our product sentence "does not use them to train any AI" rests on purpose limitation, not on words that say so. This is already open as owner decision 4 in `docs/owner-decisions.md`.

**Exceptions in the text.** Copies for backups "required to ensure proper data processing" and data kept for statutory retention (section 4(4)). Metadata (identifiers, usage volumes) is not specially protected and authorised Edgeless staff can access it (Terms 6.3); the provider keeps it up to 90 days and token counts permanently (its FAQ, recorded in the master notes). None of these is a training permission.

**Recommendation.** Ask Edgeless for one explicit sentence, in the DPA or the Enterprise agreement: "The Processor will not use Data, including inputs and outputs, to train, fine-tune or improve any model, and will not allow its sub-processors to do so." Tinfoil's DPA has such a sentence (section 2.1(3), `docs/tinfoil-search-terms-20261112.md`). Until then, keep our wording with the purpose-limitation reference, or say "uses them only to provide the service".

## 5. Decisions for the owner (recommended default first)

| # | Decision | Recommended default | Why |
| --- | --- | --- | --- |
| MD-1 | Build end-to-end encrypted sync (option A) | **Yes, for the alpha** behind `inference.vaultSync` (off until tested) | Removes most friction; keeps "not readable by CometRow" |
| MD-2 | Sync on or off by default once built | **On**, with "Keep my data on this device only" in Settings and in the first-run screen | Usability first; the promise still holds |
| MD-3 | Approve the policy change from "we keep no copy" to "we keep an encrypted copy we cannot read", with the metadata sentence | **Approve** (drafts in 3.1), after the legal read of the German | Must ship in the same release as sync |
| MD-4 | Unlockers | **Remembered device, passkey with PRF, device approval, recovery key (required at setup)**; no server-stored passphrase wrap | Offline guessing risk of passphrases |
| MD-5 | Save chats automatically | **Yes**, incognito excepted (Stage 0) | The largest daily friction |
| MD-6 | "Remember this device" before sync exists (Stage 0) | **Yes, as a choice** with its risk stated | No passphrase on every visit |
| MD-7 | Files as encrypted blobs, provider | **Hetzner Object Storage, Nuremberg or Falkenstein**; sign the AVV in the Hetzner account | EU company, cheapest, no request fees |
| MD-8 | Quotas | **Alpha 1 GB per account**; launch figures with pricing | Cost is negligible; limits abuse |
| MD-9 | Key escrow opt-in (C1) | **No, not for the alpha** | Crosses the red line; recovery key covers most cases |
| MD-10 | Readable sync opt-in (C2) | **No** | Crosses the red line; A gives nearly the same |
| MD-11 | Content-free push notifications | **Yes, opt-in per device, Stage 4** | Expected by users; nothing readable |
| MD-12 | Privatemode training sentence | **Ask Edgeless for an explicit no-training clause**; meanwhile keep the wording with the purpose-limitation reference | The DPA has no explicit sentence |
| MD-13 | Project files in the backup (Stage 0) | **Yes, as an option** ("include project files", may make the file large) | Today a restore silently loses them |

## 6. Device tests for the owner (for the lead to copy into the test list)

Today's behaviour (can be run now on the alpha):

1. On a second device (phone), sign in with the same Google account. Check the allowance matches the laptop. Open Saved, type your usual passphrase: you get an empty vault. Write down whether that surprised you.
2. On the laptop, download an encrypted backup. Move it to the phone (email to yourself or a cloud drive). Restore it with the original passphrase. Check chats, memory, projects and tasks arrive and project files do not. Note how long the whole move took.
3. On iPhone Safari, check where the downloaded backup file lands and whether the restore file picker finds it.
4. With more than 100 saved chats (synthetic), try a backup: it refuses. Note the message.
5. Lock the vault and type a wrong passphrase three times: no reset or recovery is offered.

For the designs (before building stage 2): 

6. On each of your devices, check passkey PRF support at a public test page (for example the WebAuthn PRF demo pages linked from the passkey matrix) with your actual passkey manager: iPhone, Android phone, Windows laptop (Windows Hello and Chrome version), Mac, and any password manager you use.
7. Try Apple's or Bitwarden's device approval once, to judge whether the flow in 3.1 step 3 feels acceptable.

## 7. What is not verified

- The test fakes `/api/status`; the real account server, Postgres, Google sign-in and the Render deployment were not used. Real phones, Safari and Firefox were not used.
- The background-task result going to the first device that fetches it is read from the code (`src/ScheduledPanel.tsx`), not tested across two devices.
- Storage prices: Hetzner, OVHcloud, IONOS, Backblaze, Cloudflare from vendor pages on 15 November 2026; Scaleway and AWS from third-party pages; DPA availability for OVHcloud, Scaleway, IONOS, Cloudflare and AWS not re-checked. Durability and replication of Hetzner Object Storage not checked. Render database storage prices not checked.
- Passkey PRF support comes from one third-party matrix with small community samples.
- Competitor behaviour and plan limits are from help pages and press; several help pages blocked fetching.
- Effort figures are estimates.

## Sources

- Code and docs: `src/vault.ts`, `src/vault-backup.ts`, `src/VaultBackup.tsx`, `src/App.tsx`, `src/conversation-library.ts`, `src/ScheduledPanel.tsx`, `server/account-auth.ts`, `shared/privacy-copy.ts`, `shared/privacy-policy.ts`, `docs/projects-20261114.md`, `docs/memory-20261114.md`, `docs/scheduled-tasks-design-20261114.md`, `docs/background-tasks-20261115.md`, `docs/threat-model-20261022.md`, `docs/dpa-record-privatemode-20261112.md`, `docs/provider-promises-20261112.md`.
- Privatemode: https://www.privatemode.ai/dpa (24 July 2026), https://www.privatemode.ai/terms-of-service (13 November 2026), https://www.privatemode.ai/privacy-policy (6 August 2026).
- Storage: https://www.hetzner.com/storage/object-storage/, https://www.ovhcloud.com/en/public-cloud/object-storage/, https://www.scaleway.com/en/pricing/storage/, https://cloud.ionos.com/storage/object-storage, https://www.backblaze.com/cloud-storage/pricing, https://developers.cloudflare.com/r2/pricing/, https://developers.cloudflare.com/r2/reference/data-location/, https://aws.amazon.com/s3/pricing/.
- Passkeys: https://www.corbado.com/blog/passkeys-prf-webauthn, https://www.corbado.com/blog/webauthn-l3-credential-manager-support, https://bitwarden.com/help/login-with-passkeys/.
- End-to-end encrypted recovery: https://support.apple.com/en-us/108756, https://bitwarden.com/help/about-trusted-devices/, https://support.1password.com/secret-key-security/, https://proton.me/support/recovery-phrase, https://signal.org/blog/introducing-secure-backups/, https://about.fb.com/news/2021/10/end-to-end-encrypted-backups-on-whatsapp/.
- Assistants: https://help.openai.com/en/articles/10169521, https://help.openai.com/en/articles/10291617, https://support.claude.com/en/articles/9517075, https://support.claude.com/en/articles/11817273.
