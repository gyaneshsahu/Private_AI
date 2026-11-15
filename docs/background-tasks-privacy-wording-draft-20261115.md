# Background tasks: privacy and legal wording (DRAFT, 15 November 2026)

**Status: drafts by the agent. No binding text was edited** (`shared/privacy-copy.ts`, `shared/privacy-policy.ts`, `shared/provider-disclosure.ts` and the legal pair file are unchanged). German is binding once approved; both languages must change together or the pair test (`shared/legal-text-pairs.json`) fails. Match the words to `docs/i18n-glossary-20261113.md` before use. These sentences describe the build in `docs/background-tasks-20261115.md` and are true only while it is built that way.

The core change in one line: today the policy says our systems cannot open what you send. For a background task that is no longer true, so every sentence that says so needs a scope ("for chats and manual tasks") and a new section says what is different.

## 1. Privacy statement (`shared/privacy-copy.ts`)

### "What is sealed and sent" (`sealed`), last sentence

- Today (EN): "Our own systems pass the locked package along and cannot open it."
- Proposed (EN): "For chats and manual tasks, our own systems pass the locked package along and cannot open it. Background tasks are the exception; see below."
- Today (DE): "Unsere eigenen Systeme reichen das verschlossene Paket weiter und können es nicht öffnen."
- Proposed (DE): "Bei Chats und manuellen Aufgaben reichen unsere eigenen Systeme das verschlossene Paket weiter und können es nicht öffnen. Hintergrundaufgaben sind die Ausnahme; siehe unten."

### "What we can see" (`ours`), second and last sentences

- Today (EN): "We never see what you asked or what was answered." and "We keep no copy of your conversations; saved history lives only on your device, locked with a password we do not have."
- Proposed (EN): "In chats and manual tasks we never see what you asked or what was answered." and "We keep no copy of your conversations; saved history lives only on your device, locked with a password we do not have. The only exception is a task you choose to run as a background task, described below."
- Today (DE): "Wir sehen nie, was Sie gefragt haben oder was geantwortet wurde." and "Wir behalten keine Kopie Ihrer Unterhaltungen; der gespeicherte Verlauf liegt nur auf Ihrem Gerät, verschlossen mit einem Passwort, das wir nicht haben."
- Proposed (DE): "In Chats und manuellen Aufgaben sehen wir nie, was Sie gefragt haben oder was geantwortet wurde." and "Wir behalten keine Kopie Ihrer Unterhaltungen; der gespeicherte Verlauf liegt nur auf Ihrem Gerät, verschlossen mit einem Passwort, das wir nicht haben. Die einzige Ausnahme ist eine Aufgabe, die Sie als Hintergrundaufgabe ausführen lassen; sie ist unten beschrieben."

### "What we cannot promise yet" (`notyet`)

- Today (EN): "There is no anonymous mode: we know which account asked, never what was asked."
- Proposed (EN): "There is no anonymous mode: we know which account asked, and for chats never what was asked."
- Today (DE): "Es gibt keinen anonymen Modus: Wir wissen, welches Konto gefragt hat, nie was gefragt wurde."
- Proposed (DE): "Es gibt keinen anonymen Modus: Wir wissen, welches Konto gefragt hat, und bei Chats nie, was gefragt wurde."

### New section after "When you search the web": "Background tasks"

**EN.** "Background tasks: a scheduled task runs by itself only if you choose Background task for it and agree to the text shown. Then our server stores the task (its name, instruction, schedule and the search text you approved) and, if you attached one, the text of one document, with email addresses, phone numbers, bank, card, tax, insurance and ID numbers and labelled birth dates replaced on your device. Names, addresses and other facts written in words are not replaced. Everything is stored encrypted with a key kept apart from the database, but our running server can read it in order to run the task. At the times you set, our server sends the task end to end encrypted to the same checked secure server that answers your chats and, if you approved a search, sends exactly that search text to the search provider first. The answer is stored encrypted on our server until CometRow saves it on your device, and then deleted at once; an answer that is never fetched is deleted after 7 days. We store with each task when you agreed and to which text, never your words in that record. Each run counts against your request allowance. Deleting a background task, or switching it to Manual, removes it and its stored answers from our server at once. Up to 3 background tasks per account, at most one run a day each."

**DE.** "Hintergrundaufgaben: Eine geplante Aufgabe läuft nur dann von selbst, wenn Sie für sie „Hintergrundaufgabe“ wählen und dem angezeigten Text zustimmen. Dann speichert unser Server die Aufgabe (ihren Namen, ihre Anweisung, ihren Zeitplan und den Suchtext, den Sie freigegeben haben) und, falls Sie eines angehängt haben, den Text eines Dokuments, in dem E-Mail-Adressen, Telefonnummern, Bank-, Karten-, Steuer-, Versicherungs- und Ausweisnummern sowie gekennzeichnete Geburtsdaten auf Ihrem Gerät ersetzt wurden. Namen, Adressen und andere Angaben in Worten werden nicht ersetzt. Alles wird mit einem Schlüssel verschlüsselt gespeichert, der getrennt von der Datenbank aufbewahrt wird, aber unser laufender Server kann es lesen, um die Aufgabe auszuführen. Zu den von Ihnen gewählten Zeiten sendet unser Server die Aufgabe Ende-zu-Ende-verschlüsselt an denselben geprüften sicheren Server, der Ihre Chats beantwortet, und sendet, falls Sie eine Suche freigegeben haben, zuerst genau diesen Suchtext an den Suchanbieter. Die Antwort wird verschlüsselt auf unserem Server gespeichert, bis CometRow sie auf Ihrem Gerät speichert, und dann sofort gelöscht; eine Antwort, die nie abgerufen wird, wird nach 7 Tagen gelöscht. Wir speichern zu jeder Aufgabe, wann Sie zugestimmt haben und welchem Text, nie Ihre Worte in diesem Eintrag. Jede Ausführung zählt für Ihr Anfragen-Kontingent. Wenn Sie eine Hintergrundaufgabe löschen oder auf „Manuell“ stellen, werden sie und ihre gespeicherten Antworten sofort von unserem Server entfernt. Bis zu 3 Hintergrundaufgaben pro Konto, jede höchstens einmal am Tag."

## 2. Privacy policy (`shared/privacy-policy.ts`)

### "What you can delete, and how" (`delete`)

- Add (EN): "One background task: open Scheduled and choose Delete next to it, or switch it to Manual; it and its stored answers are removed from our server at once."
- Add (DE): "Eine Hintergrundaufgabe: Öffnen Sie „Geplant“ und wählen Sie daneben „Löschen“, oder stellen Sie sie auf „Manuell“; sie und ihre gespeicherten Antworten werden sofort von unserem Server entfernt."
- After "Your account: ... Close account" add (EN): "Closing the account also removes every background task and stored answer." (DE): "Das Schließen des Kontos entfernt auch jede Hintergrundaufgabe und jede gespeicherte Antwort."

### "What we cannot delete for you" (`cannot`, and the Privatemode variant `PRIVATEMODE_CANNOT`)

- Add (EN): "The search provider's records of the search text of a background task, kept under that provider's policy, as for any approved search."
- Add (DE): "Die Aufzeichnungen des Suchanbieters über den Suchtext einer Hintergrundaufgabe, nach dessen Richtlinie aufbewahrt, wie bei jeder freigegebenen Suche."
- Our own request records sentence is unchanged: a background run makes the same content-free record.

## 3. Provider disclosure (`shared/provider-disclosure.ts`, Privatemode text)

- Add at the end (EN): "Background tasks you choose are sent to Privatemode by our server instead of your browser, end to end encrypted in the same way, after our server has checked the same approved release."
- Add (DE): "Hintergrundaufgaben, die Sie wählen, sendet unser Server statt Ihres Browsers an Privatemode, auf dieselbe Weise Ende-zu-Ende-verschlüsselt, nachdem unser Server dieselbe freigegebene Version geprüft hat."
- Open point for the DPA: Privatemode now receives requests from our server on our behalf for background tasks. The existing DPA covers our requests; confirm that requests started by our server (not by a user's browser) are inside it.

## 4. Threat model (`docs/threat-model-20261022.md`)

- The promise in line 5 ("everything else is sealed so only one checked secure server can read it, and we never...") gets the scope "in chats and manual tasks".
- Row "Our relay reads conversation content": add "Not true for background tasks, which the user opts into: the server process holds the key and reads them to run them (docs/background-tasks-20261115.md)."
- New rows:

| Threat | Mitigation | Residual risk |
| --- | --- | --- |
| Database dump or backup leaks background tasks | AES-256-GCM per value, key in a separate secret file, value bound to account, row and field | Anyone with the database and the key file reads everything |
| Server compromise reads background tasks | Opt-in per task; at most 3 per account; results deleted on delivery, 7 days at most; stop file and config switch | A compromised running server reads every task and result in it |
| Legal order for stored tasks | Stores only what runs; deletes on delivery | We can be compelled to hand over what is stored at that moment |
| A changed Privatemode deployment answers background runs | Server applies the same digest and Wasm pins as the browser; fail closed and alert; one hour block | Same as the browser path |
| Background runs starve users or exceed the attestation limit | One verified client per 10 minutes for all runs; attest only when the queue is quiet; two of three slots kept for users | One attest call per 10 minutes is the floor |
| A modified browser stores unmasked identifiers | The server runs the same detector and refuses | Names, addresses and plain-word facts are not detected anywhere |
| Runaway cost from scheduled runs | Allowance with weights, daily cap, spend guard on real metered cost, 3 runs a day per account, pause after 3 skips | Search fees are not in the allowance |

## 5. Record of processing (`docs/art30-record-draft-20261112.md`)

New row 9:

| # | Activity | Purpose | Legal basis | Data subjects and data | Recipients and processors | Transfer outside the EU | Retention | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 9 | Background tasks | Run a task the user scheduled while the app is closed | Art. 6(1)(a) consent per task; Art. 9(2)(a) explicit consent for special categories (CV, health) | Users and people named in their tasks or documents: task name, instruction, schedule, approved search text, one document's text after on-device masking, answers; consent version and time | Render (database, server); Edgeless Systems GmbH (Privatemode) for the runs; Brave Search (search text only) | Privatemode: none. Brave: USA (basis as in row 7) | Task: until deleted, switched to Manual or the account is closed. Answer: until delivered, 7 days at most. Consent record: with the task | built, switched off |

Row 3 (request records): add "including background runs".

## 6. DPIA note

A DPIA (checklist L10) is likely required for this activity on its own:

- **Special categories at scale.** A CV routinely contains data about health (disability, sick leave gaps), religion (church employers), union membership, nationality and photos. Health-looking tasks are expected. Art. 9 applies; the legal basis is explicit consent per task (Art. 9(2)(a)).
- **New storage of content.** For the first time our server stores readable (to the process) user content. The DPIA should weigh: encryption at rest, opt-in per task, 3 tasks per account, delete on delivery, 7-day cap, no content in logs or counts, access to the key file limited to the deployment.
- **Masking is partial.** Names and addresses are not masked. The consent says so; the DPIA should record it as a residual risk.
- **Automated runs without the user present.** The answer is not reviewed by anyone before the user reads it; health answers carry a warning (consent section 3).
- **Third parties.** Brave receives the search text daily (USA, transfer basis open as in row 7).

## 7. Retention summary

| What | Where | How long |
| --- | --- | --- |
| Task, document text, search text | Our database, sealed | Until deleted, switched to Manual, or the account is closed |
| Answer | Our database, sealed | Until the browser saves it (then at once), 7 days at most |
| Failed or skipped run | Our database | A fixed code, deleted like an answer |
| Consent record | Our database, plain | With the task |
| Request record of each run | Usage ledger | 90 days, as for chat |
| Search text | Brave | Up to 90 days, Brave's policy |
| Request content | Privatemode | Not kept after the answer, as for chat |

## 8. Owner decisions for the legal read (recommended defaults)

| # | Question | Recommended default |
| --- | --- | --- |
| P1 | Legal basis | Consent (Art. 6(1)(a)), explicit for special categories (Art. 9(2)(a)), recorded per task with version and time |
| P2 | Does withdrawal need its own button? | No: delete and "switch to Manual" are the withdrawal, stated in the consent text; ask the lawyer |
| P3 | DPIA | Yes, before the switch goes on for invitees |
| P4 | Privatemode DPA scope for server-started requests | Ask Privatemode in the next mail; no change expected |
| P5 | The new policy section and the scoped sentences | Approve together with the consent texts, German first |
| P6 | Health content | Allowed with the extra consent and the urgent-help warning; no server-side check |
