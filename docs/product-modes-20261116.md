# Two modes: Secure and Secure Max (proposal, 16 November 2026)

Owner direction of 16 November: CometRow gets two modes. **Secure** is the default: a normal account, with chats, memory, projects, files and tasks stored on our server, encrypted at rest, on every device after sign-in. No passphrase, no device approval, no recovery key. **Secure Max** is optional: the end-to-end encrypted vault that is already built, where CometRow cannot read saved content. The mode belongs to a chat or a project and is chosen with a lock toggle on New chat / New project; Settings holds an optional account default (a professional can make Secure Max the default for everything). Nothing is asked at login. Content moves between modes only by explicit export.

**This changes a red line.** Until now: "in the default mode nothing readable by CometRow is stored on our server." From now: in Secure, CometRow holds the key and can technically read saved content; "we cannot read your data" is said only about Secure Max. No selling of data and no training on data stay red lines in both modes.

Status: proposal plus texts. Nothing here is switched on. The legal read of every text is the owner's.

## 1. The pitch

1. **One storage engine, two key holders.** The encrypted sync built on 15 November (items, files as blobs, merging edits from two devices, quotas, erase) becomes the storage for both modes. The only difference is who holds the key:
   - Secure: the server creates the account's key, keeps it wrapped under a master key that lives outside the database, and hands it to the browser after sign-in.
   - Secure Max: the key is created on the user's device and never reaches us (device approval, recovery key).
   That is far less new code than a second, plaintext storage system, and Secure still gets real protection: a stolen database alone is unreadable, because the master key is not in it.
2. **Secure is still better than a normal chat app.** In both modes the question goes to the AI inside Privatemode's sealed environment (the AI provider cannot read it and does not train on it), personal details are masked before a web search, and there is no advertising and no training. Secure only changes where *saved* content lives and who holds its key.
3. **Secure Max is the product for professionals.** Lawyers, doctors, tax advisers and consultants have secrecy duties (in Germany § 203 StGB). "Not even the provider can read it" is what they need and will pay for. My proposal: Secure Max is part of the paid plan, offered first to a few professional testers after the external cryptography review. Decision 6 below.
4. **Where I disagree or add.**
   - Build no server-side reading features in the first version of Secure (server search, background runs over saved chats). The server *can* decrypt, but every feature that does so is a new promise to explain. First version: the server stores and hands out; the browser does the work, as today.
   - The name "Secure Max" is easy to understand, but it invites the question "so Secure is not fully secure?". The texts below answer it by naming the real difference: who holds the key. The lawyer should check both names as advertising claims.
   - Secure Max always comes with a recovery key (sync on). A device-only vault with no recovery key is the design that loses people's data; I would stop offering it as a choice. Decision 3.

## 2. How each feature behaves

| | Secure (default) | Secure Max |
| --- | --- | --- |
| Who holds the key | CometRow (wrapped under a master key outside the database) | Only the user (devices and recovery key) |
| Can CometRow read saved content | Technically yes; access is restricted and logged | No |
| What we see in any case | Account, times, number and size of items | The same, plus the list of devices |
| Saving | Automatic, every chat except temporary ones | Automatic once Secure Max is unlocked on the device |
| New device | Sign in: everything is there | Approve on a device already in use by typing the 8-character code the new device shows, or use the recovery key |
| Forgotten or lost | Sign in again | Recovery key; without devices and recovery key the data is gone, support cannot help |
| Memory | One memory for Secure chats | A separate memory, used only in Secure Max chats (decision 4) |
| Projects | A project has one mode; its chats and files inherit it | The same |
| Files | Stored with the account, opened on any device | Encrypted blobs, downloaded when opened; 10 MB per file |
| Scheduled tasks | Manual now; Auto (server runs it) after the legal read | Manual only: runs while the app is open on the device |
| Search | On the device over the synced copy; server search possible later | On the device only, while unlocked |
| Removing a device | Sign-out everywhere is possible | Stops syncing; does not erase what is on that device |
| Support | Can help restore or export on request | Cannot see or recover content |
| Asking the AI, masking, web search, voice, pictures, code | The same in both modes | The same in both modes |
| Temporary chat | Saved nowhere, as today | Saved nowhere |
| Moving between modes | Export, then import | Export, then import |

## 3. The interface (owner decision of 16 November, replaces the lock toggle)

- **The normal sidebar stays exactly as it is** (new chat, search, projects, tasks, saved chats) and holds only Secure chats. No toggle on New chat or New project. A new user signs in and types: nothing is asked at login.
- **Secure Max is a separate section in the sidebar** with a lock icon. Inside it: a "Secure Max" header with the lock, a distinct colour band (never colour alone), "New Secure Max chat", "New Secure Max project", the section's own chats, projects, memory and search, and "Lock now".
- **First time the section is opened:** the confirmation dialog (section 4: paragraph, trade-offs, "I understand"). Cancel returns to the normal sidebar.
- **New device:** the normal account and chats are there at once. The section shows as locked with one button, "Unlock Secure Max": approve on a device already in use by typing the code the new device shows, or use the recovery key. Without either, everything outside the section still works.
- **Locking:** after 15 minutes without activity inside the section, and with "Lock now".
- **Settings:** "Reset Secure Max" (after a recent sign-in, with a clear warning and a typed confirmation) deletes the Secure Max vault on the server and on this device and starts a fresh one, so nobody has to contact support. Optional: "Open CometRow in Secure Max" for professionals who work there all day (replaces the earlier "Default for new chats", which the section makes unnecessary).
- **Lists outside the section never show Secure Max items,** not even as locked entries. A chat never changes section; moving content is an explicit export.
- Secure Max is offered only when file sync is on (owner, 16 November), so "files" in the dialog is true.

## 4. Texts (English and German; the German is binding after the legal read)

### Picker

| | English | German |
| --- | --- | --- |
| Toggle label | Secure Max | Secure Max |
| One line when on | Encrypted with a key only you hold. CometRow can't read what you save here. | Mit einem Schlüssel verschlüsselt, den nur Sie haben. CometRow kann nicht lesen, was Sie hier speichern. |
| One line when off (Settings only) | Saved to your account and available on all your devices after sign-in. CometRow holds the key. | In Ihrem Konto gespeichert und nach der Anmeldung auf allen Ihren Geräten verfügbar. CometRow verwahrt den Schlüssel. |

### Confirmation dialog

**Title:** Use Secure Max? / Secure Max verwenden?

**Paragraph (EN):** In Secure Max, what you save here (your chats, files and memories) is encrypted on your device with a key only you hold. Our server keeps only an encrypted copy, so CometRow cannot read the content. We can still see your account, when you use it, how many items you have saved and how large they are, and how many devices you use and when.

**Paragraph (DE):** In Secure Max wird alles, was Sie hier speichern (Chats, Dateien und Erinnerungen), auf Ihrem Gerät mit einem Schlüssel verschlüsselt, den nur Sie haben. Unser Server bewahrt nur eine verschlüsselte Kopie auf. CometRow kann den Inhalt deshalb nicht lesen. Sichtbar bleiben für uns Ihr Konto, die Zeiten der Nutzung Anzahl und Größe der gespeicherten Einträge sowie die Anzahl Ihrer Geräte und wann sie zuletzt genutzt wurden.

**What is different (EN):**
- If you lose all your devices and your recovery key, this data is gone for good. Our support cannot recover it.
- A new device must be approved on a device you already use, by typing the code the new device shows, or with your recovery key.
- Removing a device stops it syncing. It does not erase what is already on that device.
- Scheduled tasks run only while CometRow is open on your device.
- Search covers these chats only on a device where Secure Max is unlocked.
- Memories saved in Secure Max are used only in Secure Max chats.
- A chat or project cannot be switched to Secure later. You can export it.

**Was anders ist (DE):**
- Wenn Sie alle Ihre Geräte und Ihren Wiederherstellungsschlüssel verlieren, sind diese Daten endgültig verloren. Unser Support kann sie nicht wiederherstellen.
- Ein neues Gerät muss auf einem bereits genutzten Gerät freigegeben werden, indem Sie dort den Code eingeben, den das neue Gerät anzeigt, oder mit Ihrem Wiederherstellungsschlüssel.
- Wenn Sie ein Gerät entfernen, wird es nicht mehr synchronisiert. Was bereits auf dem Gerät liegt, wird dadurch nicht gelöscht.
- Geplante Aufgaben laufen nur, solange CometRow auf Ihrem Gerät geöffnet ist.
- Die Suche erfasst diese Chats nur auf einem Gerät, auf dem Secure Max entsperrt ist.
- In Secure Max gespeicherte Erinnerungen werden nur in Secure-Max-Chats verwendet.
- Ein Chat oder Projekt kann später nicht auf Secure umgestellt werden. Sie können es exportieren.

**Checkbox:** I understand that CometRow cannot recover this data for me. / Mir ist bewusst, dass CometRow diese Daten nicht für mich wiederherstellen kann.

**Buttons:** Use Secure Max · Cancel / Secure Max verwenden · Abbrechen

### Secure, wherever it is described (must not imply that nobody can read it)

**EN:** Secure saves your chats, files and memories to your account on our servers, encrypted while stored. CometRow holds the key, so your data is on all your devices as soon as you sign in, and we can restore it for you. It also means our systems can technically access it; we do so only to run the service, and never to train AI or for advertising.

**DE:** Secure speichert Ihre Chats, Dateien und Erinnerungen in Ihrem Konto auf unseren Servern, verschlüsselt abgelegt. CometRow verwahrt den Schlüssel. Deshalb sind Ihre Daten nach der Anmeldung auf allen Ihren Geräten verfügbar, und wir können sie für Sie wiederherstellen. Das bedeutet auch, dass unsere Systeme technisch darauf zugreifen können. Wir tun das nur, um den Dienst zu betreiben, nie zum Training von KI und nie für Werbung.

Not said anywhere about Secure: "private", "only you", "we cannot read", "zero knowledge", "end-to-end".

## 5. What the law side needs (for the owner and the lawyer)

1. **Privacy policy:** a new section per mode: what is stored, where (the hosting location must be named exactly: check the Render region and Render as a US processor), who holds the key, legal basis (contract, Art. 6(1)(b)), retention, and that Secure data can be demanded by authorities with a valid order while Secure Max content cannot be handed over readable.
2. **Health and other special data (Art. 9):** people will type health data into chats that we now store. The lawyer must say whether Secure needs explicit consent at sign-up or a clear notice is enough.
3. **Retention (proposal):** kept until the user deletes it; deleted items gone from the live database at once and from backups within 30 days; accounts unused for 24 months are deleted after two warning emails.
4. **Access rule:** no reading of Secure content without a support request from the user or a legal duty; every use of the master key outside normal serving is logged; written down as a one-page policy.
5. **Breach process:** content can now leak, so the plan needs: who decides (you), the 72-hour notice to the authority (Art. 33), the notice to users when the risk is high (Art. 34), and the key separation as the mitigating fact (database alone is unreadable). The existing breach plan (checklist F1) gets a Secure section.
6. **DPIA and the Art. 30 record:** both updated for stored content; the hosting provider's processing agreement checked for content, not only account data.
7. **Consent:** none at login for Secure (contract), subject to point 2. The Secure Max dialog above is an information step, not a legal consent.

## 6. Plan and effort (agent working sessions, each a few hours with tests)

| # | Step | Effort | Needs you |
| --- | --- | --- | --- |
| 1 | Secure storage: server-held key, the existing engine in "custodial" form, automatic saving, sign in on a second device and everything is there; behind `inference.secureStore`, off | 1 to 2 sessions (started 16 November) | nothing yet |
| 2 | Mode per chat and project: lock toggle, dialog, lists with locks, account default in Settings; English and German | 1 session (started 16 November) | the texts' legal read |
| 3 | Secure files and memory, export and import between modes, account export and erase covering both | 1 session | |
| 4 | Operations: master key handling and rotation, access log, retention jobs, backup purge, breach runbook, policy drafts | 1 session | master key created by you; legal read |
| 5 | Device tests on your phones; first invitees get Secure only | your time | device tests |
| 6 | Secure-only extras, one by one: server search, Auto tasks, email when a task finished | 1 session each | Auto: your legal read |
| 7 | Secure Max for a few professional testers | small; it is built | external cryptography review, paid |

## 7. Decisions for you (my recommendation in brackets)

1. One engine with a server-held key for Secure, instead of a separate plaintext store [yes].
2. First version of Secure: the server only stores and hands out; no server feature reads content yet [yes].
3. Secure Max always with sync and a recovery key; no device-only vault as a choice, and always with file sync on, so that "files" in the dialog is true [yes].
4. Memory: separate per mode [decided 16 November: Secure Max memory and search work only inside the section while unlocked]; later, optionally let Secure Max chats read Secure memories (never the other way) [later].
5. On sign-out, the local copy of Secure data on that device is deleted [yes: shared computers].
6. Secure Max in the paid plan, first for professional testers [yes].
7. Retention values in section 5.3 [yes, after the legal read].
8. Hosting of stored content: stay on Render's database for the alpha, or move content to an EU-owned host before launch [decide before launch; I will compare costs].
