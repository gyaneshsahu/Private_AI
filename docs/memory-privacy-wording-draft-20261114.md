# Memory across chats: privacy wording, DRAFT for the owner's approval (14 November 2026)

**Status: DRAFT by the agent. Nothing in the binding texts was changed.** `shared/privacy-copy.ts`, `shared/privacy-policy.ts` and `shared/provider-disclosure.ts` are as they were. The German sentences need a legal read. The only texts that ship with the code are the in-app texts in part 3, and they show only while memory is switched on.

**When this matters.** Only when the owner switches memory on (`VITE_MEMORY=1`, see `docs/memory-20261114.md`). While it is off, no sentence below needs to change.

## 1. The claim, and how it was checked

The claim: **"Memories are stored only on your device. Our server stores none of them and keeps no profile of you."**

Checked in the code on 14 November 2026:

- No file under `server/` was changed for this feature. There is no route, status field, counter or log line for memory. The switch is a build setting of the web app.
- Saving, editing, deleting, pinning and "Forget all" write to the browser's own storage (IndexedDB) only. They make no network request. The browser test for the Memory screen fails if the page asks any other address for anything.
- The memories are encrypted in the browser with the vault key before they are stored. The test reads the raw stored records and finds no plain text.
- A memory leaves the device only as part of a question: inside the encrypted request that goes to the model. Our systems pass that locked package along and cannot open it. The test of the real request path checks that the block is in that one request and nowhere else.
- The account data export holds no vault content and is unchanged.

What stays true but must be said, so the claim is not read as more than it is:

1. **The memory text is sent.** A memory that fits the question goes to the provider's secure server with that question. "Stored only on your device" is true. "Never leaves your device" would be false. Do not write it.
2. **Our request records are a little larger.** Where we record how long a question was (token counts), a question with memories is longer. The record does not say why and holds no text.
3. **The provider handles the memory like the rest of the question.** Whatever is true for a question at the provider (short-term cache, retention of records about requests) is true for the memories sent with it.
4. **A backup file holds the memories**, encrypted with the vault passphrase. It is a file on the user's device. Any copy still opens with the passphrase it was made with.
5. **Special categories.** A user can save a health fact on purpose. It is then sent with questions it fits. The app never proposes a memory by itself.

## 2. Sentences of the binding texts that would change

| # | File and place | Today | Problem once memory is on | Proposed |
| --- | --- | --- | --- | --- |
| 1 | `shared/privacy-copy.ts`, section `sealed` ("What is sealed and sent"), first sentence | "The rest of your question, your selected files and the earlier messages you included are locked in your browser so that only one secure server can open them." | Memories that go with the question are not named | See 2.1 |
| 2 | `shared/privacy-copy.ts`, section `device` ("What stays on your device"), last sentence | "An incognito chat is never saved on this device, and disappearing messages are deleted from this device after the time you choose; neither changes what the secure server or our records hold." | Memory is a new thing kept on the device, and the reader should learn here that it is also sent | Add the sentences in 2.2 after it |
| 3 | `shared/privacy-policy.ts`, "What you can delete, and how" | "Everything saved on this device: open Saved and use Delete everything on this device; it removes every saved conversation and project in this browser and locks the vault, and cannot be undone." | Memories are deleted too, and they have their own delete controls | See 2.3 |
| 4 | `shared/privacy-policy.ts`, "What we cannot delete for you" | (no sentence about memories) | A memory that was already sent with a question is with the provider like that question | Add the sentence in 2.4 |
| 5 | `shared/privacy-copy.ts`, `PRIVACY_SUMMARY` and `PRIVACY_SUMMARY_DE` | "ID, bank and contact details stay on your device; everything else is sealed so only one checked secure server can read it, and we never can." | Still true: memories that are sent fall under "everything else is sealed" | No change needed |
| 6 | `shared/privacy-copy.ts`, section `ours` | "We can see that your account asked something, when, how many times, which model answered, and afterwards how long the question and answer were ..." | Still true. The length includes the memories that were sent | No change needed. Optional clarification in 2.5 |

If the corrections draft of 13 November (`docs/privacy-policy-corrections-draft-20261113.md`, the part on what the app stores in the browser) is adopted, add one line there: "Memories you saved: in the encrypted vault, until you delete them."

### 2.1 Section "What is sealed and sent", first sentence

EN: "The rest of your question, your selected files, the earlier messages you included and the memories that fit your question are locked in your browser so that only one secure server can open them."

DE: "Der Rest Ihrer Frage, Ihre ausgewählten Dateien, die früheren Nachrichten, die Sie einbezogen haben, und die Erinnerungen, die zu Ihrer Frage passen, werden in Ihrem Browser so verschlossen, dass nur ein einziger sicherer Server sie öffnen kann."

### 2.2 Section "What stays on your device", added at the end

EN: "If you use memory, CometRow keeps what you asked it to remember in the encrypted vault on this device. Our server stores no memories and keeps no profile of you. For each question your browser picks the memories that fit, and only those are sent, sealed, together with the question. Under each answer you can see which ones were sent. Memory is not used in incognito chats or while the vault is locked."

DE: "Wenn Sie das Gedächtnis nutzen, bewahrt CometRow das, was es sich merken soll, im verschlüsselten Tresor auf diesem Gerät auf. Unser Server speichert keine Erinnerungen und führt kein Profil über Sie. Für jede Frage wählt Ihr Browser die passenden Erinnerungen aus, und nur diese werden versiegelt zusammen mit der Frage gesendet. Unter jeder Antwort sehen Sie, welche gesendet wurden. In Inkognito-Chats und bei gesperrtem Tresor wird das Gedächtnis nicht verwendet."

### 2.3 Policy, "What you can delete, and how"

Replace "it removes every saved conversation and project in this browser" by:

EN: "it removes every saved conversation, project and memory in this browser"

DE: "das entfernt jede gespeicherte Unterhaltung, jedes Projekt und jede Erinnerung in diesem Browser"

And add after the first sentence of that section:

EN: "One memory: open Settings, then Memory, and choose Delete next to it. All memories: use Forget all on the same screen."

DE: "Eine Erinnerung: Öffnen Sie „Einstellungen“, dann „Gedächtnis“, und wählen Sie daneben „Löschen“. Alle Erinnerungen: Verwenden Sie auf derselben Seite „Alles vergessen“."

### 2.4 Policy, "What we cannot delete for you", one added sentence

EN: "Deleting a memory removes it from your device. It does not reach back into questions that were already sent with it: for those the same applies as for the questions themselves."

DE: "Wenn Sie eine Erinnerung löschen, wird sie von Ihrem Gerät entfernt. Auf Fragen, die bereits mit ihr gesendet wurden, wirkt das nicht zurück: Für diese gilt dasselbe wie für die Fragen selbst."

### 2.5 Optional, section "What we can see" (`ours`)

EN: "The length of a question includes the memories sent with it."

DE: "Zur Länge einer Frage zählen auch die mit ihr gesendeten Erinnerungen."

### 2.6 Health and other special categories (if the health consent text of `shared/health-consent.ts` is adopted)

EN: "If you save health details as a memory, they are sent to the secure server with the questions they fit, like health details you type into a question."

DE: "Wenn Sie Gesundheitsangaben als Erinnerung speichern, werden sie mit den Fragen, zu denen sie passen, an den sicheren Server gesendet, wie Gesundheitsangaben, die Sie in eine Frage schreiben."

## 3. In-app texts that ship with the code (shown only while memory is on)

These are in `src/text/memory.ts`. They are not binding legal text, but they make privacy statements, so the owner should read them.

**The Memory screen, shown every time (this is the first-use note):**

EN: "CometRow can remember what you ask it to remember, for all your chats. Memories are stored only on this device, inside your encrypted vault. Our server stores none of them and keeps no profile of you."

EN: "When a memory fits your question, it is sent to the protected model together with that question. Email addresses, phone numbers, bank details and similar identifiers in a memory are masked first, like in any message. Under each answer you can see which memories were sent. Think twice before you save health details or other very personal facts."

EN: "Memory is not used in incognito chats or while the vault is locked. You can also switch it off for one chat in that chat's menu."

DE: "CometRow kann sich für alle Ihre Chats merken, was Sie ihm zum Merken geben. Erinnerungen werden nur auf diesem Gerät gespeichert, in Ihrem verschlüsselten Tresor. Unser Server speichert keine davon und führt kein Profil über Sie."

DE: "Passt eine Erinnerung zu Ihrer Frage, wird sie zusammen mit dieser Frage an das geschützte Modell gesendet. E-Mail-Adressen, Telefonnummern, Bankdaten und ähnliche Kennungen in einer Erinnerung werden vorher verborgen, wie in jeder Nachricht. Unter jeder Antwort sehen Sie, welche Erinnerungen gesendet wurden. Überlegen Sie gut, bevor Sie Gesundheitsdaten oder andere sehr persönliche Angaben speichern."

DE: "Das Gedächtnis wird in Inkognito-Chats und bei gesperrtem Tresor nicht verwendet. Sie können es auch für einen einzelnen Chat im Menü dieses Chats ausschalten."

**The question before saving:**

EN: "It is stored on this device, in your encrypted vault. It is sent to the protected model with questions it fits. You can change the words first."

DE: "Sie wird auf diesem Gerät gespeichert, in Ihrem verschlüsselten Tresor. Sie wird mit Fragen, zu denen sie passt, an das geschützte Modell gesendet. Sie können den Wortlaut vorher ändern."

**Added to two existing texts while memory is on** (the existing sentences in `src/text/app.ts` and `src/text/vault-ui.ts` were not edited; one sentence is appended on screen):

- Backup ("Download saved conversations and projects to your device ..."): EN "Your memories are included." DE "Ihre Erinnerungen sind enthalten."
- Delete everything on this device (confirmation): EN "Your memories are deleted too." DE "Ihre Erinnerungen werden ebenfalls gelöscht."

One wording limit to know: the masking sentence says "similar identifiers". Masking recognises the kinds listed in the privacy statement (ID numbers, bank and card numbers, tax and insurance numbers, phone numbers, email addresses, labelled dates of birth). Names and addresses in a memory are not masked. If the owner wants this said on the Memory screen, add: EN "Names and addresses are not masked." DE "Namen und Adressen werden nicht verborgen."

## 4. Wording to avoid

- "Your memories never leave your device." False: the ones that fit a question are sent with it.
- "We cannot see your memories" without "our systems pass the sealed package along". Keep it tied to the existing sealed-request explanation.
- "CometRow learns about you." It stores only what the user saved, word for word.
