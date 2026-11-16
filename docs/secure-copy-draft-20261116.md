# Secure and Secure Max: texts per storage mode (draft for the legal read, 16 November 2026)

Status: draft. Built behind an optional `storage` prop that defaults to today's texts, so nothing changes in the app until the lead wires it. The German is binding only after the owner's legal read. Binding legal texts (`shared/privacy-*.ts`) are not edited; their proposed replacement is below.

## Why

Owner rule of 16 November (`docs/product-modes-20261116.md`, section 4): a text must be true for where the data lives. Many texts were written for the device vault and say "stored only on this device" or "our server stores none". With Secure on, that is false: Secure saves to the account on our server, encrypted while stored, and CometRow holds the key. "CometRow cannot read them" is said only about Secure Max.

## The three modes

- **local**: production today, no Secure switch. The encrypted vault on this device. Today's texts are true and stay.
- **secure**: Secure, the default once `status.secureStore` is on. Saved to the account, encrypted while stored, CometRow holds the key, on all devices after sign-in. Never "only on this device", never "we cannot read".
- **max**: Secure Max. End-to-end encrypted with a key only the user holds, synced to approved devices. The only place for "CometRow cannot read them".

Texts that are about the way to the AI (masking, the checked secure server, "read on this device" for files) are the same in every mode and were not changed.

## How it works in the code

A key `x_secure` or `x_max` in a text block replaces `x` in that mode (`forStorage` in `src/text/mode-copy.ts`). An empty Secure text hides the line: the project screen's line about the encrypted backup is not shown in Secure, which has no backup file. Texts in files owned by other work are proposed in `src/text/mode-copy.ts` and not used yet.

"On all your devices" for Secure Max assumes the first Secure Max unlock sets up sync with a recovery key (audit finding FE-02). Until that is fixed, a device-only Secure Max vault makes those delete texts too broad.

Origin of each row: "audit table FE-04" is the wording from the features audit; "agent proposal" is new wording by the build agent (several of these were flagged in the settings audit, SS-02).

## Settings, Privacy & data: the summary sentence (shared/privacy-copy.ts, not edited)

Today: "ID, bank and contact details stay on your device; everything else is sealed so only one checked secure server can read it, and we never can." With Secure on, both halves are false: the saved chat, identifiers included, is stored with the account, and CometRow holds the key.

Proposed for Secure (`privacySummary_secure` in `src/text/mode-copy.ts`):

- EN: ID, bank and contact details are masked before a message goes to the AI, and the message is sealed so that only one checked secure server can read it on the way. What you save is stored with your account, encrypted, and CometRow holds the key.
- DE: Identifikations-, Bank- und Kontaktangaben werden verborgen, bevor eine Nachricht an die KI geht, und die Nachricht wird versiegelt, sodass unterwegs nur ein einziger geprüfter sicherer Server sie lesen kann. Was Sie speichern, liegt verschlüsselt in Ihrem Konto, und CometRow verwahrt den Schlüssel.

Alternative (shorter, the approved one-liner from product-modes section 4): "Saved to your account and available on all your devices after sign-in. CometRow holds the key." / "In Ihrem Konto gespeichert und nach der Anmeldung auf allen Ihren Geräten verfügbar. CometRow verwahrt den Schlüssel." The paragraph after the summary (`secureLong`) already says that our systems can technically access the data.

## Questions for the owner (agent default in brackets)

1. The privacy summary for Secure: the longer sentence above, or the one-liner [the longer sentence: it keeps the masking and secure-server facts].
2. Secure memory intro says "They are never used to train AI or for advertising." Confirm this is a promise we keep for all stored content [yes, it is a red line in both modes].
3. Account export text for Secure says saved items are listed by number, size and time without content. Check against the Secure export (FE-03) once built [recheck then].
4. Footer: "No advertising. No training on your data." instead of "Built for a bounded evaluation." [yes].
## The texts, screen by screen

### Memory (src/text/memory.ts, MemorySettings, RememberDialog, MemoryNote)

#### `memory.intro` (audit table FE-04)

- Today (device vault, stays for "local"): CometRow can remember what you ask it to remember, for all your chats. Memories are stored only on this device, inside your encrypted vault. Our server stores none of them and keeps no profile of you.
- Secure EN: CometRow can remember what you ask it to remember, for all your chats. Memories are saved to your account, encrypted while stored. CometRow holds the key. They are never used to train AI or for advertising.
- Secure DE: CometRow kann sich für alle Ihre Chats merken, was Sie ihm zum Merken geben. Erinnerungen werden in Ihrem Konto gespeichert, verschlüsselt abgelegt. CometRow verwahrt den Schlüssel. Sie werden nie für KI-Training oder Werbung genutzt.
- Secure Max EN: CometRow can remember what you ask it to remember, for your Secure Max chats. Memories are encrypted with a key only you hold. CometRow cannot read them.
- Secure Max DE: CometRow kann sich für Ihre Secure-Max-Chats merken, was Sie ihm zum Merken geben. Erinnerungen werden mit einem Schlüssel verschlüsselt, den nur Sie haben. CometRow kann sie nicht lesen.

#### `memory.notUsed` (audit table FE-04)

- Today (device vault, stays for "local"): Memory is not used in incognito chats or while the vault is locked. You can also switch it off for one chat in that chat's menu.
- Secure EN: Memory is not used in incognito chats. You can also switch it off for one chat in that chat's menu.
- Secure DE: Das Gedächtnis wird in Inkognito-Chats nicht verwendet. Sie können es auch für einen einzelnen Chat im Menü dieses Chats ausschalten.
- Secure Max EN: Memory is not used in incognito chats or while Secure Max is locked. You can also switch it off for one chat in that chat's menu.
- Secure Max DE: Das Gedächtnis wird in Inkognito-Chats und bei gesperrtem Secure Max nicht verwendet. Sie können es auch für einen einzelnen Chat im Menü dieses Chats ausschalten.

#### `memory.locked` (agent proposal)

- Today (device vault, stays for "local"): Unlock your vault to use memory. Until then no memory is read, saved or sent. You unlock the vault under Saved.
- Secure EN: Memory is not available right now: your account's saved data has not loaded. Until then no memory is read, saved or sent.
- Secure DE: Das Gedächtnis ist gerade nicht verfügbar: Die gespeicherten Daten Ihres Kontos sind noch nicht geladen. Bis dahin wird keine Erinnerung gelesen, gespeichert oder gesendet.
- Secure Max EN: Unlock Secure Max to use its memory. Until then no memory is read, saved or sent.
- Secure Max DE: Entsperren Sie Secure Max, um sein Gedächtnis zu nutzen. Bis dahin wird keine Erinnerung gelesen, gespeichert oder gesendet.

#### `memory.deleteText` (audit table FE-04)

- Today (device vault, stays for "local"): It is removed from this device. This cannot be undone.
- Secure EN: It is deleted on all your devices. This cannot be undone.
- Secure DE: Sie wird auf allen Ihren Geräten gelöscht. Das lässt sich nicht rückgängig machen.
- Secure Max EN: It is deleted on all your devices. This cannot be undone.
- Secure Max DE: Sie wird auf allen Ihren Geräten gelöscht. Das lässt sich nicht rückgängig machen.

#### `memory.forgetAllText` (audit table FE-04)

- Today (device vault, stays for "local"): All 2 memories are removed from this device. This cannot be undone. Saved chats stay as they are.
- Secure EN: All 2 memories are deleted on all your devices. This cannot be undone. Your chats stay as they are.
- Secure DE: Alle 2 Erinnerungen werden auf allen Ihren Geräten gelöscht. Das lässt sich nicht rückgängig machen. Ihre Chats bleiben, wie sie sind.
- Secure Max EN: All 2 memories are deleted on all your devices. This cannot be undone. Your chats stay as they are.
- Secure Max DE: Alle 2 Erinnerungen werden auf allen Ihren Geräten gelöscht. Das lässt sich nicht rückgängig machen. Ihre Chats bleiben, wie sie sind.

#### `memory.added` (audit table FE-04)

- Today (device vault, stays for "local"): Saved to memory on this device.
- Secure EN: Saved to memory.
- Secure DE: Im Gedächtnis gespeichert.
- Secure Max EN: Saved to memory.
- Secure Max DE: Im Gedächtnis gespeichert.

#### `memory.forgotten` (audit table FE-04)

- Today (device vault, stays for "local"): All memories are deleted from this device.
- Secure EN: All memories are deleted.
- Secure DE: Alle Erinnerungen sind gelöscht.
- Secure Max EN: All memories are deleted.
- Secure Max DE: Alle Erinnerungen sind gelöscht.

#### `memory.rememberText` (agent proposal)

- Today (device vault, stays for "local"): It is stored on this device, in your encrypted vault. It is sent to the protected model with questions it fits. You can change the words first.
- Secure EN: It is saved to your account, encrypted while stored. It is sent to the protected model with questions it fits. You can change the words first.
- Secure DE: Sie wird in Ihrem Konto gespeichert, verschlüsselt abgelegt. Sie wird mit Fragen, zu denen sie passt, an das geschützte Modell gesendet. Sie können den Wortlaut vorher ändern.
- Secure Max EN: It is saved in Secure Max, encrypted with a key only you hold. It is sent to the protected model with questions it fits. You can change the words first.
- Secure Max DE: Sie wird in Secure Max gespeichert, mit einem Schlüssel verschlüsselt, den nur Sie haben. Sie wird mit Fragen, zu denen sie passt, an das geschützte Modell gesendet. Sie können den Wortlaut vorher ändern.

#### `memory.rememberLocked` (agent proposal)

- Today (device vault, stays for "local"): Memory needs your unlocked vault, so nothing can be saved now. Unlock the vault under Saved and try again.
- Secure EN: Memory is not available right now, so nothing can be saved. Try again in a moment.
- Secure DE: Das Gedächtnis ist gerade nicht verfügbar. Deshalb kann jetzt nichts gespeichert werden. Versuchen Sie es gleich noch einmal.
- Secure Max EN: Memory in Secure Max needs Secure Max unlocked, so nothing can be saved now. Unlock Secure Max and try again.
- Secure Max DE: Das Gedächtnis in Secure Max braucht ein entsperrtes Secure Max. Deshalb kann jetzt nichts gespeichert werden. Entsperren Sie Secure Max und versuchen Sie es noch einmal.

#### `memory.usedGone` (agent proposal)

- Today (device vault, stays for "local"): Not available: deleted, or the vault is locked.
- Secure EN: Not available: deleted, or not loaded yet.
- Secure DE: Nicht verfügbar: gelöscht oder noch nicht geladen.
- Secure Max EN: Not available: deleted, or Secure Max is locked.
- Secure Max DE: Nicht verfügbar: gelöscht, oder Secure Max ist gesperrt.

### Projects (src/text/projects.ts, ProjectPanel)

#### `projects.deleteText` (audit table FE-04)

- Today (device vault, stays for "local"): The project's instructions and files are deleted from this device. This cannot be undone. Choose what happens to its chats.
- Secure EN: The project's instructions and files are deleted on all your devices. This cannot be undone. Choose what happens to its chats.
- Secure DE: Die Anweisungen und Dateien des Projekts werden auf allen Ihren Geräten gelöscht. Das lässt sich nicht rückgängig machen. Wählen Sie, was mit seinen Chats geschieht.
- Secure Max EN: The project's instructions and files are deleted on all your devices. This cannot be undone. Choose what happens to its chats.
- Secure Max DE: Die Anweisungen und Dateien des Projekts werden auf allen Ihren Geräten gelöscht. Das lässt sich nicht rückgängig machen. Wählen Sie, was mit seinen Chats geschieht.

#### `projects.instructionsIntro` (audit table FE-04)

- Today (device vault, stays for "local"): Sent with every question in this project's chats. Email addresses, bank details and similar identifiers in them are masked first, like in any message. Not sent in incognito chats or after a chat is moved out of the project. Stored only in your encrypted vault on this device.
- Secure EN: Sent with every question in this project's chats. Email addresses, bank details and similar identifiers in them are masked first, like in any message. Not sent in incognito chats or after a chat is moved out of the project. Saved to your account, encrypted while stored.
- Secure DE: Werden mit jeder Frage in den Chats dieses Projekts gesendet. E-Mail-Adressen, Bankdaten und ähnliche Kennungen darin werden vorher verborgen, wie in jeder Nachricht. Nicht in Inkognito-Chats und nicht mehr, wenn ein Chat aus dem Projekt verschoben wurde. In Ihrem Konto gespeichert, verschlüsselt abgelegt.
- Secure Max EN: Sent with every question in this project's chats. Email addresses, bank details and similar identifiers in them are masked first, like in any message. Not sent in incognito chats or after a chat is moved out of the project. Encrypted with a key only you hold.
- Secure Max DE: Werden mit jeder Frage in den Chats dieses Projekts gesendet. E-Mail-Adressen, Bankdaten und ähnliche Kennungen darin werden vorher verborgen, wie in jeder Nachricht. Nicht in Inkognito-Chats und nicht mehr, wenn ein Chat aus dem Projekt verschoben wurde. Mit einem Schlüssel verschlüsselt, den nur Sie haben.

#### `projects.filesIntro` (audit table FE-04)

- Today (device vault, stays for "local"): Text documents only. The text is read on this device and kept in your encrypted vault. For each question, the passages that match it best are sent with it, like a large document attached to a chat. Pictures cannot be project files.
- Secure EN: Text documents only. The text is read on this device and saved to your account, encrypted while stored. For each question, the passages that match it best are sent with it. Pictures cannot be project files.
- Secure DE: Nur Textdokumente. Der Text wird auf diesem Gerät gelesen und in Ihrem Konto gespeichert, verschlüsselt abgelegt. Zu jeder Frage werden die passendsten Abschnitte mitgesendet. Bilder können keine Projektdateien sein.
- Secure Max EN: Text documents only. The text is read on this device and encrypted with a key only you hold. For each question, the passages that match it best are sent with it. Pictures cannot be project files.
- Secure Max DE: Nur Textdokumente. Der Text wird auf diesem Gerät gelesen und mit einem Schlüssel verschlüsselt, den nur Sie haben. Zu jeder Frage werden die passendsten Abschnitte mitgesendet. Bilder können keine Projektdateien sein.

#### `projects.notInBackup` (audit table FE-04)

- Today (device vault, stays for "local"): Project files are in the encrypted backup only when you tick Include project files. Project names and instructions are always included.
- Secure EN: (line not shown)
- Secure DE: (Zeile wird nicht gezeigt)

### Project files with sync (src/text/sync-files.ts, ProjectPanel)

#### `sync-files.intro` (agent proposal)

- Today (device vault, stays for "local"): Files are encrypted on this device and synced to your other devices. Another device downloads a file when it is opened or used in a chat.
- Secure EN: Files are saved to your account, encrypted while stored, and are on all your devices after sign-in. Another device downloads a file when it is opened or used in a chat.
- Secure DE: Dateien werden in Ihrem Konto gespeichert, verschlüsselt abgelegt, und sind nach der Anmeldung auf allen Ihren Geräten. Ein anderes Gerät lädt eine Datei herunter, wenn sie geöffnet oder in einem Chat verwendet wird.

### Canvas (src/text/canvas.ts, CanvasPanel)

#### `canvas.note` (audit table FE-04)

- Today (device vault, stays for "local"): Kept on this device with the conversation. Sent only when you ask for changes.
- Secure EN: Saved with the conversation. Sent to the AI only when you ask for changes.
- Secure DE: Wird mit der Unterhaltung gespeichert. Nur an die KI gesendet, wenn Sie Änderungen anfordern.
- Secure Max EN: Saved with the conversation. Sent to the AI only when you ask for changes.
- Secure Max DE: Wird mit der Unterhaltung gespeichert. Nur an die KI gesendet, wenn Sie Änderungen anfordern.

### Scheduled tasks (src/text/scheduled.ts, ScheduledPanel, TaskForm, ScheduleCard)

#### `scheduled.intro` (agent proposal)

- Today (device vault, stays for "local"): A Manual task is kept only in your encrypted vault on this device. When it is due, CometRow shows it here and above the chat, and you tap Run now. Nothing runs while CometRow is closed.
- Secure EN: A Manual task is saved to your account, encrypted while stored, and is on all your devices after sign-in. When it is due, CometRow shows it here and above the chat, and you tap Run now. Nothing runs while CometRow is closed.
- Secure DE: Eine manuelle Aufgabe wird in Ihrem Konto gespeichert, verschlüsselt abgelegt, und ist nach der Anmeldung auf allen Ihren Geräten. Wenn sie fällig ist, zeigt CometRow sie hier und über dem Chat, und Sie tippen auf „Jetzt ausführen“. Solange CometRow geschlossen ist, läuft nichts.
- Secure Max EN: A Manual task is kept in Secure Max, encrypted with a key only you hold. When it is due, CometRow shows it here and above the chat, and you tap Run now. Nothing runs while CometRow is closed.
- Secure Max DE: Eine manuelle Aufgabe wird in Secure Max gespeichert, mit einem Schlüssel verschlüsselt, den nur Sie haben. Wenn sie fällig ist, zeigt CometRow sie hier und über dem Chat, und Sie tippen auf „Jetzt ausführen“. Solange CometRow geschlossen ist, läuft nichts.

#### `scheduled.locked` (agent proposal)

- Today (device vault, stays for "local"): Unlock your saved conversations to see and create scheduled tasks. They are kept in the same encrypted vault.
- Secure EN: Scheduled tasks are not available right now: your account's saved data has not loaded. Try again in a moment.
- Secure DE: Geplante Aufgaben sind gerade nicht verfügbar: Die gespeicherten Daten Ihres Kontos sind noch nicht geladen. Versuchen Sie es gleich noch einmal.
- Secure Max EN: Unlock Secure Max to see and create its scheduled tasks.
- Secure Max DE: Entsperren Sie Secure Max, um seine geplanten Aufgaben zu sehen und anzulegen.

#### `scheduled.deleteText` (audit table FE-04)

- Today (device vault, stays for "local"): The task is deleted from this device. This cannot be undone.
- Secure EN: The task is deleted on all your devices. This cannot be undone.
- Secure DE: Die Aufgabe wird auf allen Ihren Geräten gelöscht. Das lässt sich nicht rückgängig machen.
- Secure Max EN: The task is deleted on all your devices. This cannot be undone.
- Secure Max DE: Die Aufgabe wird auf allen Ihren Geräten gelöscht. Das lässt sich nicht rückgängig machen.

#### `scheduled.deleteBackgroundText` (agent proposal)

- Today (device vault, stays for "local"): The task is deleted from this device, and its copy and any waiting results are deleted from our server. This cannot be undone.
- Secure EN: The task is deleted on all your devices, and its copy and any waiting results are deleted from our server. This cannot be undone.
- Secure DE: Die Aufgabe wird auf allen Ihren Geräten gelöscht, und ihre Kopie und wartende Ergebnisse werden von unserem Server gelöscht. Das lässt sich nicht rückgängig machen.
- Secure Max EN: The task is deleted on all your devices, and its copy and any waiting results are deleted from our server. This cannot be undone.
- Secure Max DE: Die Aufgabe wird auf allen Ihren Geräten gelöscht, und ihre Kopie und wartende Ergebnisse werden von unserem Server gelöscht. Das lässt sich nicht rückgängig machen.

#### `scheduled.modeManualText` (audit table FE-04)

- Today (device vault, stays for "local"): CometRow shows the task when it is due and you tap Run now. Stored only on this device.
- Secure EN: CometRow shows the task when it is due and you tap Run now. Saved to your account.
- Secure DE: CometRow zeigt die Aufgabe, wenn sie fällig ist, und Sie tippen auf „Jetzt ausführen“. In Ihrem Konto gespeichert.
- Secure Max EN: CometRow shows the task when it is due and you tap Run now. Saved in Secure Max.
- Secure Max DE: CometRow zeigt die Aufgabe, wenn sie fällig ist, und Sie tippen auf „Jetzt ausführen“. In Secure Max gespeichert.

#### `scheduled.cardLocked` (agent proposal)

- Today (device vault, stays for "local"): Scheduled tasks are kept in your encrypted vault. Unlock your saved conversations first, or send this as a normal message.
- Secure EN: Scheduled tasks are not available right now. Try again in a moment, or send this as a normal message.
- Secure DE: Geplante Aufgaben sind gerade nicht verfügbar. Versuchen Sie es gleich noch einmal oder senden Sie dies als normale Nachricht.
- Secure Max EN: Scheduled tasks in Secure Max need Secure Max unlocked. Unlock it first, or send this as a normal message.
- Secure Max DE: Geplante Aufgaben in Secure Max brauchen ein entsperrtes Secure Max. Entsperren Sie es zuerst oder senden Sie dies als normale Nachricht.

### Saved list (src/text/saved-list.ts, ConversationLibrary)

#### `saved-list.deleteText` (audit table FE-04)

- Today (device vault, stays for "local"): “Title” will be deleted from this device, with all its branches. This cannot be undone.
- Secure EN: “Title” will be deleted with all its branches, on all your devices. This cannot be undone.
- Secure DE: “Title” wird mit allen Zweigen auf allen Ihren Geräten gelöscht. Das lässt sich nicht rückgängig machen.
- Secure Max EN: “Title” will be deleted with all its branches, on all your devices. This cannot be undone.
- Secure Max DE: “Title” wird mit allen Zweigen auf allen Ihren Geräten gelöscht. Das lässt sich nicht rückgängig machen.

### Devices and sync (src/text/sync.ts, SyncSettings, SyncSetup)

#### `sync.offIntro` (audit table FE-04)

- Today (device vault, stays for "local"): Sync keeps your saved chats, memory, projects and scheduled tasks the same on your phone, tablet and computer. They are encrypted on your device before they leave it.
- Secure EN: Your chats, memory, projects and tasks are on all your devices as soon as you sign in. The settings below are for Secure Max only.
- Secure DE: Ihre Chats, Erinnerungen, Projekte und Aufgaben sind nach der Anmeldung auf allen Ihren Geräten. Die Einstellungen hier betreffen nur Secure Max.

#### `sync.explainWhat` (audit table FE-04)

- Today (device vault, stays for "local"): What syncs: saved chats, memory, projects and their instructions, scheduled tasks and settings. Not yet: project files. Never: incognito chats.
- Secure Max EN: What syncs: your Secure Max chats, memory, projects with their instructions and files, scheduled tasks and settings. Never: incognito chats.
- Secure Max DE: Was synchronisiert wird: Ihre Secure-Max-Chats, Erinnerungen, Projekte mit Anweisungen und Dateien, geplante Aufgaben und Einstellungen. Nie: Inkognito-Chats.

### Texts in files owned by others (src/text/mode-copy.ts, not used yet)

#### `app.projectCreated` (audit table FE-04)

- Secure EN: Project created. Chats in a project are not added to the AI's context automatically.
- Secure DE: Projekt erstellt. Chats eines Projekts werden nicht automatisch in den Kontext der KI aufgenommen.
- Secure Max EN: Project created. Chats in a project are not added to the AI's context automatically.
- Secure Max DE: Projekt erstellt. Chats eines Projekts werden nicht automatisch in den Kontext der KI aufgenommen.

#### `app.organized` (audit table FE-04)

- Secure EN: Changes saved.
- Secure DE: Änderungen gespeichert.
- Secure Max EN: Changes saved.
- Secure Max DE: Änderungen gespeichert.

#### `app.incognitoBanner` (audit table FE-04)

- Secure EN: Nothing from this chat is saved, not on this device and not in your account. It is gone when you start another chat, reload or sign out. This does not change what the secure server keeps for a short time or the request records we hold.
- Secure DE: Nichts aus diesem Chat wird gespeichert, weder auf diesem Gerät noch in Ihrem Konto. Er ist weg, sobald Sie einen anderen Chat beginnen, neu laden oder sich abmelden. Das ändert nichts daran, was der sichere Server kurzzeitig behält, und nichts an unseren Aufzeichnungen über Anfragen.
- Secure Max EN: Nothing from this chat is saved, not on this device and not in your account. It is gone when you start another chat, lock, reload or sign out. This does not change what the secure server keeps for a short time or the request records we hold.
- Secure Max DE: Nichts aus diesem Chat wird gespeichert, weder auf diesem Gerät noch in Ihrem Konto. Er ist weg, sobald Sie einen anderen Chat beginnen, sperren, neu laden oder sich abmelden. Das ändert nichts daran, was der sichere Server kurzzeitig behält, und nichts an unseren Aufzeichnungen über Anfragen.

#### `app.projectsNote` (agent proposal)

- Secure EN: Projects group your chats. They do not send other chats or files to the AI automatically.
- Secure DE: Projekte ordnen Ihre Chats. Sie senden andere Chats oder Dateien nicht automatisch an die KI.
- Secure Max EN: Projects group your chats. They do not send other chats or files to the AI automatically.
- Secure Max DE: Projekte ordnen Ihre Chats. Sie senden andere Chats oder Dateien nicht automatisch an die KI.

#### `app.appearanceNote` (agent proposal)

- Secure EN: This appearance choice is kept in this browser. It contains no chat content.
- Secure DE: Diese Wahl der Darstellung wird in diesem Browser gespeichert. Sie enthält keine Chat-Inhalte.
- Secure Max EN: This appearance choice is kept in this browser. It contains no chat content.
- Secure Max DE: Diese Wahl der Darstellung wird in diesem Browser gespeichert. Sie enthält keine Chat-Inhalte.

#### `app.savedIntro` (agent proposal)

- Secure EN: Your chats are saved to your account automatically, encrypted while stored, and are on all your devices after sign-in. CometRow holds the key.
- Secure DE: Ihre Chats werden automatisch in Ihrem Konto gespeichert, verschlüsselt abgelegt, und sind nach der Anmeldung auf allen Ihren Geräten. CometRow verwahrt den Schlüssel.
- Secure Max EN: Secure Max chats are encrypted with a key only you hold and synced to your approved devices. CometRow cannot read them.
- Secure Max DE: Secure-Max-Chats werden mit einem Schlüssel verschlüsselt, den nur Sie haben, und mit Ihren freigegebenen Geräten synchronisiert. CometRow kann sie nicht lesen.

#### `app.titleNote` (agent proposal)

- Secure EN: Name the conversation. It is saved automatically.
- Secure DE: Geben Sie der Unterhaltung einen Namen. Sie wird automatisch gespeichert.
- Secure Max EN: Name the conversation. It is saved automatically while Secure Max is unlocked.
- Secure Max DE: Geben Sie der Unterhaltung einen Namen. Sie wird automatisch gespeichert, solange Secure Max entsperrt ist.

#### `app.footerNote` (agent proposal)

- Secure EN: No advertising. No training on your data.
- Secure DE: Keine Werbung. Kein Training mit Ihren Daten.
- Secure Max EN: No advertising. No training on your data.
- Secure Max DE: Keine Werbung. Kein Training mit Ihren Daten.

#### `app.photoNote` (audit table FE-04)

- Pictures on (any mode) EN: Photo to text reads printed text on this device and asks for the camera only when you press Use camera. To ask about what a picture shows, use Ask about a picture. Dictation, live voice, image creation and sharing are not connected: no permissions or media are collected for them.
- Pictures on (any mode) DE: Foto zu Text liest gedruckten Text auf diesem Gerät und fragt erst nach der Kamera, wenn Sie „Kamera verwenden“ drücken. Um etwas zum Inhalt eines Bildes zu fragen, verwenden Sie „Frage zu einem Bild stellen“. Diktieren, Gespräche per Stimme, Bilderstellung und Teilen sind nicht angebunden: Dafür werden keine Berechtigungen oder Medien erfasst.

#### `app.photoNoteVoice` (audit table FE-04)

- Pictures on (any mode) EN: Photo to text reads printed text on this device and asks for the camera only when you press Use camera. To ask about what a picture shows, use Ask about a picture. Dictation asks for the microphone only when you press the microphone button. Live voice, image creation and sharing are not connected: no permissions or media are collected for them.
- Pictures on (any mode) DE: Foto zu Text liest gedruckten Text auf diesem Gerät und fragt erst nach der Kamera, wenn Sie „Kamera verwenden“ drücken. Um etwas zum Inhalt eines Bildes zu fragen, verwenden Sie „Frage zu einem Bild stellen“. Das Diktieren fragt erst nach dem Mikrofon, wenn Sie die Mikrofon-Taste drücken. Gespräche per Stimme, Bilderstellung und Teilen sind nicht angebunden: Dafür werden keine Berechtigungen oder Medien erfasst.

#### `live-voice.liveVoiceMenuNote` (audit table FE-04)

- Pictures on (any mode) EN: Photo to text reads printed text on this device and asks for the camera only when you press Use camera. To ask about what a picture shows, use Ask about a picture. Dictation and live voice ask for the microphone only when you press their buttons. Image creation and sharing are not connected: no permissions or media are collected for them.
- Pictures on (any mode) DE: Foto zu Text liest gedruckten Text auf diesem Gerät und fragt erst nach der Kamera, wenn Sie „Kamera verwenden“ drücken. Um etwas zum Inhalt eines Bildes zu fragen, verwenden Sie „Frage zu einem Bild stellen“. Diktieren und Gespräche per Stimme fragen erst nach dem Mikrofon, wenn Sie ihre Tasten drücken. Bilderstellung und Teilen sind nicht angebunden: Dafür werden keine Berechtigungen oder Medien erfasst.

#### `workspace.searchPlaceholder` (audit table FE-04)

- Secure EN: Search chats
- Secure DE: Chats durchsuchen
- Secure Max EN: Search Secure Max chats
- Secure Max DE: Secure-Max-Chats durchsuchen

#### `workspace.vaultUnlocked` (audit table FE-04)

- Secure EN: Saved to your account
- Secure DE: In Ihrem Konto gespeichert
- Secure Max EN: Secure Max unlocked
- Secure Max DE: Secure Max entsperrt

#### `workspace.noSaved` (audit table FE-04)

- Secure EN: No chats here yet.
- Secure DE: Hier gibt es noch keine Chats.
- Secure Max EN: No chats here yet.
- Secure Max DE: Hier gibt es noch keine Chats.

#### `account.introSession` (agent proposal)

- Secure EN: Signing in opens your saved chats on any device. Secure Max, if you use it, stays locked until you unlock it.
- Secure DE: Mit der Anmeldung öffnen Sie Ihre gespeicherten Chats auf jedem Gerät. Secure Max bleibt, falls Sie es nutzen, gesperrt, bis Sie es entsperren.

#### `account.exportBody` (agent proposal)

- Secure EN: One file with the records this service holds about your account: your account identity and contact email, sign-in methods (never their secret keys or tokens), active sessions, security notices, request and usage records with their published cost, billing operations and any closure request. Your saved chats, files and memories are listed only by number, size and time, without their content (search text you approve passes through the service on the way to the search provider).
- Secure DE: Eine Datei mit den Daten, die dieser Dienst zu Ihrem Konto speichert: Ihre Kontoidentität und Kontakt-E-Mail-Adresse, Anmeldemethoden (niemals deren geheime Schlüssel oder Tokens), aktive Sitzungen, Sicherheitshinweise, Anfrage- und Nutzungsdaten mit ihren veröffentlichten Kosten, Abrechnungsvorgänge und einen etwaigen Antrag auf Schließung. Ihre gespeicherten Chats, Dateien und Erinnerungen sind nur mit Anzahl, Größe und Zeitpunkt aufgeführt, ohne ihren Inhalt (Suchtext, den Sie freigeben, läuft auf dem Weg zum Suchanbieter durch den Dienst hindurch).

#### `account.vaultNote` (agent proposal)

- Secure EN: Your saved chats are kept with your account, so signing in on a new device brings them back. Secure Max has its own key and its own recovery key.
- Secure DE: Ihre gespeicherten Chats liegen in Ihrem Konto. Wenn Sie sich auf einem neuen Gerät anmelden, sind sie wieder da. Secure Max hat einen eigenen Schlüssel und einen eigenen Wiederherstellungsschlüssel.

#### `privacy-copy.privacySummary` (agent proposal)

- Secure EN: ID, bank and contact details are masked before a message goes to the AI, and the message is sealed so that only one checked secure server can read it on the way. What you save is stored with your account, encrypted, and CometRow holds the key.
- Secure DE: Identifikations-, Bank- und Kontaktangaben werden verborgen, bevor eine Nachricht an die KI geht, und die Nachricht wird versiegelt, sodass unterwegs nur ein einziger geprüfter sicherer Server sie lesen kann. Was Sie speichern, liegt verschlüsselt in Ihrem Konto, und CometRow verwahrt den Schlüssel.
