# Background tasks: consent texts (DRAFT, 15 November 2026)

**Status: drafts by the agent for the owner's legal read. Nobody has approved them.** German is the binding text once approved. The interface (Agent M) shows them at the moment the user picks "Background task" for a task; the final strings belong in `src/text/scheduled.ts`. The server stores, with each task, only the consent version (today `2026-11-15-draft`, `BACKGROUND_CONSENT_VERSION` in `server/background-tasks.ts`), the time and whether the extra consent was given. Any change to these texts needs a new version string, so tasks are never stored under a text the user did not see.

How it is shown (proposal for Agent M): the base text always; the extra text when the task has an attached document, or when the instruction looks like health content (the browser decides; the server does not read for it). Two separate checkboxes when both apply, each unticked by default, and a "Save as background task" button that stays disabled until the shown boxes are ticked. "Keep it manual" is the other button, equally prominent.

## 1. Base consent (every background task)

**English**

> **Run this task in the background?**
> A background task runs on our server at the times you set, even when CometRow is closed. For that, **our server stores this task and can read it**: its name, its instruction, its schedule and, if CometRow decided when you created it that the task needs a web search, the search text made from its instruction, with identifiers removed on your device. [changed 19 November: search is automatic; for the legal read] Everything is stored encrypted, so a copy of our database alone does not reveal it, but our running server can read it, and so could anyone who gains control of it.
> At each run, the task is sent end to end encrypted to the same checked secure server that answers your chats. If the task has a search text, our server sends exactly that text to the search provider (Brave) first. [changed 19 November: search is automatic; for the legal read]
> The answer waits on our server, encrypted, until CometRow saves it on your device. It is deleted from our server at once when it is saved, and after 7 days at the latest.
> Each run counts against your request allowance like a message. A task that cannot run for lack of allowance pauses itself after three tries.
> You can pause or delete the task at any time. Deleting it, or switching it back to Manual, removes it and its stored answers from our server at once. Closing your account removes all of them.
> [ ] I agree that CometRow's server stores and reads this task to run it in the background.

**German**

> **Diese Aufgabe im Hintergrund ausführen?**
> Eine Hintergrundaufgabe läuft zu den von Ihnen gewählten Zeiten auf unserem Server, auch wenn CometRow geschlossen ist. Dafür **speichert unser Server diese Aufgabe und kann sie lesen**: ihren Namen, ihre Anweisung, ihren Zeitplan und, falls CometRow beim Erstellen entschieden hat, dass die Aufgabe eine Websuche braucht, den aus ihrer Anweisung gebildeten Suchtext, aus dem Kennungen auf Ihrem Gerät entfernt wurden. [changed 19 November: search is automatic; for the legal read] Alles wird verschlüsselt gespeichert, sodass eine Kopie unserer Datenbank allein nichts verrät, aber unser laufender Server kann es lesen, und ebenso jeder, der die Kontrolle über ihn erlangt.
> Bei jeder Ausführung wird die Aufgabe Ende-zu-Ende-verschlüsselt an denselben geprüften sicheren Server gesendet, der Ihre Chats beantwortet. Wenn die Aufgabe einen Suchtext hat, sendet unser Server zuerst genau diesen Text an den Suchanbieter (Brave). [changed 19 November: search is automatic; for the legal read]
> Die Antwort wartet verschlüsselt auf unserem Server, bis CometRow sie auf Ihrem Gerät speichert. Sobald sie gespeichert ist, wird sie von unserem Server gelöscht, spätestens nach 7 Tagen.
> Jede Ausführung zählt wie eine Nachricht für Ihr Anfragen-Kontingent. Eine Aufgabe, die mangels Kontingent nicht laufen kann, pausiert sich nach drei Versuchen selbst.
> Sie können die Aufgabe jederzeit pausieren oder löschen. Wenn Sie sie löschen oder wieder auf „Manuell“ stellen, werden sie und ihre gespeicherten Antworten sofort von unserem Server entfernt. Wenn Sie Ihr Konto schließen, werden alle entfernt.
> [ ] Ich willige ein, dass der Server von CometRow diese Aufgabe speichert und liest, um sie im Hintergrund auszuführen.

## 2. Extra consent: an attached document (for example a CV)

**English**

> **This task includes a document.**
> The text of your document is stored on our server with the task, encrypted, and is sent with every run. Before it leaves this device, CometRow replaces email addresses, phone numbers, bank, card, tax, insurance and ID numbers and labelled birth dates with stand-ins. **Names, addresses, employers, schools, dates and everything written in words stay as they are.** A CV usually contains such details, and it can also contain information about health, religion, nationality or union membership. Only attach what you are willing to have stored on our server for as long as the task exists.
> [ ] I agree that this document's text, with the identifiers listed above replaced, is stored on CometRow's server and sent with every run of this task, including any sensitive information it contains.

**German**

> **Diese Aufgabe enthält ein Dokument.**
> Der Text Ihres Dokuments wird mit der Aufgabe verschlüsselt auf unserem Server gespeichert und bei jeder Ausführung mitgesendet. Bevor er dieses Gerät verlässt, ersetzt CometRow E-Mail-Adressen, Telefonnummern, Bank-, Karten-, Steuer-, Versicherungs- und Ausweisnummern sowie gekennzeichnete Geburtsdaten durch Platzhalter. **Namen, Adressen, Arbeitgeber, Schulen, Daten und alles, was in Worten geschrieben ist, bleiben, wie sie sind.** Ein Lebenslauf enthält meist solche Angaben, und er kann auch Angaben zu Gesundheit, Religion, Staatsangehörigkeit oder Gewerkschaftszugehörigkeit enthalten. Hängen Sie nur an, was Sie für die Dauer der Aufgabe auf unserem Server gespeichert haben möchten.
> [ ] Ich willige ein, dass der Text dieses Dokuments, mit den oben genannten ersetzten Kennungen, auf dem Server von CometRow gespeichert und bei jeder Ausführung dieser Aufgabe mitgesendet wird, einschließlich der darin enthaltenen sensiblen Angaben.

## 3. Extra consent: health-looking content

Shown when the browser's check finds that the instruction or the document looks like health content (symptoms, medication, diagnoses, therapy).

**English**

> **This task seems to be about health.**
> Health information is specially protected. As a background task, it is stored on our server, encrypted, and our running server can read it. CometRow does not give medical advice and a background answer is not checked by anyone before you read it. For anything urgent, call 112 or your doctor; do not wait for a scheduled answer.
> [ ] I explicitly agree that CometRow's server stores and processes this health information to run the task in the background.

**German**

> **Diese Aufgabe scheint Gesundheit zu betreffen.**
> Gesundheitsdaten sind besonders geschützt. Als Hintergrundaufgabe werden sie verschlüsselt auf unserem Server gespeichert, und unser laufender Server kann sie lesen. CometRow gibt keine medizinische Beratung, und eine Antwort im Hintergrund wird von niemandem geprüft, bevor Sie sie lesen. Rufen Sie in dringenden Fällen die 112 oder Ihre Ärztin oder Ihren Arzt an; warten Sie nicht auf eine geplante Antwort.
> [ ] Ich willige ausdrücklich ein, dass der Server von CometRow diese Gesundheitsdaten speichert und verarbeitet, um die Aufgabe im Hintergrund auszuführen.

## 4. The persistent badge and the one-line reminder

- Badge on every Auto task, in lists and in the task view: "Background task" / "Hintergrundaufgabe".
- Line under the badge in the task view: "Stored on our server and readable by it. Delete it to remove it." / "Auf unserem Server gespeichert und von ihm lesbar. Löschen Sie die Aufgabe, um sie zu entfernen."

## 5. Withdrawal

Withdrawing consent is the same as deleting the task or switching it to Manual: one tap, effective at once on the server. The text says so (section 1). Questions for the legal read: whether an explicit "Withdraw consent" label is also needed next to "Delete"; whether the base consent and the extra consent may share one screen; and whether the health check on the device must be stated in the policy.
