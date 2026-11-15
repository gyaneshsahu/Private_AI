# Vault sync: privacy wording draft (15 November 2026)

**Draft for the owner. Not binding. The binding texts (`shared/privacy-*.ts`) are not changed.** The German needs the legal read. The wording matches what is built (`docs/vault-sync-20261115.md`): it differs from the earlier draft in `docs/multi-device-and-usability-20261115.md` in two points. Turning sync off on one device does **not** delete the server copy (only "Delete synced data" does), and sizes are **not** padded.

## 1. The main sentence (replaces "We keep no copy of your conversations; saved history lives only on your device, locked with a password we do not have.")

- EN: "If you turn on sync, we store an encrypted copy of your saved chats, memories, projects and scheduled tasks on our servers in the EU, so that you can use them on your other devices. It is locked on your devices with a key we never receive, so we cannot read it. Files you add to a project stay on the device where you added them."
- DE: "Wenn Sie die Synchronisierung einschalten, speichern wir eine verschlüsselte Kopie Ihrer gespeicherten Chats, Erinnerungen, Projekte und geplanten Aufgaben auf unseren Servern in der EU, damit Sie sie auf Ihren anderen Geräten nutzen können. Sie wird auf Ihren Geräten mit einem Schlüssel verschlossen, den wir nie erhalten; deshalb können wir sie nicht lesen. Dateien, die Sie einem Projekt hinzufügen, bleiben auf dem Gerät, auf dem Sie sie hinzugefügt haben."

## 2. What we can see (metadata list)

- EN: "We can see: how many items you store, how large each one is and when it changes; how many devices you use and when each one was last connected; when you add a device. We cannot see what an item is or contains, the names of your devices, or any of your keys."
- DE: "Wir sehen: wie viele Einträge Sie speichern, wie groß jeder ist und wann er sich ändert; wie viele Geräte Sie nutzen und wann jedes zuletzt verbunden war; wann Sie ein Gerät hinzufügen. Wir sehen nicht, was ein Eintrag ist oder enthält, wie Ihre Geräte heißen, und keinen Ihrer Schlüssel."

## 3. Recovery (replaces "If you lose your password, nobody can recover your saved history.")

- EN: "If sync is on and you forget the passphrase on a device, your recovery key opens it again. If you lose all your devices and your recovery key, nobody can open your synced data, not even us."
- DE: "Wenn die Synchronisierung eingeschaltet ist und Sie die Passphrase auf einem Gerät vergessen, öffnet Ihr Wiederherstellungsschlüssel es wieder. Wenn Sie alle Ihre Geräte und Ihren Wiederherstellungsschlüssel verlieren, kann niemand Ihre synchronisierten Daten öffnen, auch wir nicht."

## 4. Turning it off and deleting

- EN: "Turning sync off on a device keeps your data on that device and removes the device from your account; the encrypted copy on our servers stays for your other devices. "Delete synced data" deletes the encrypted copy on our servers. Closing your account deletes it too. Our database backups keep it for up to [7] more days, still encrypted."
- DE: "Wenn Sie die Synchronisierung auf einem Gerät ausschalten, bleiben Ihre Daten auf diesem Gerät, und das Gerät wird aus Ihrem Konto entfernt; die verschlüsselte Kopie auf unseren Servern bleibt für Ihre anderen Geräte. „Synchronisierte Daten löschen“ löscht die verschlüsselte Kopie auf unseren Servern. Auch wenn Sie Ihr Konto schließen, wird sie gelöscht. Unsere Datenbanksicherungen bewahren sie noch bis zu [7] Tage auf, weiterhin verschlüsselt."

The [7] days must follow `docs/backup-retention-policy.md`; check before use.

## 5. A remembered device

- EN: "If you choose "Remember this device", this browser opens your data without a passphrase. Anyone who can use this browser profile can then open it. Remove a lost device from your other devices."
- DE: "Wenn Sie „Dieses Gerät merken“ wählen, öffnet dieser Browser Ihre Daten ohne Passphrase. Dann kann sie jeder öffnen, der dieses Browserprofil benutzen kann. Entfernen Sie ein verlorenes Gerät über Ihre anderen Geräte."

## 6. For the record of processing (Art. 30) and the threat model

- Category: encrypted copy of saved content (end-to-end encrypted, the controller holds no key). Still personal data under GDPR. Retention: until the user deletes it, resets sync or closes the account; backups as above.
- Metadata as in section 2, plus hashed device tokens, hashed proofs and the encrypted device names.
- Threat model addition: `docs/vault-sync-20261115.md` section 8.
