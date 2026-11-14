# Projects with instructions and files: privacy wording, DRAFT for the owner's approval (14 November 2026)

**Status: DRAFT by the agent. Nothing in the binding texts was changed.** `shared/privacy-copy.ts`, `shared/privacy-policy.ts` and `shared/provider-disclosure.ts` are as they were. The German sentences need a legal read. The in-app texts (`src/text/projects.ts`) show only while the switch is on.

**When this matters.** Only when the owner switches project instructions and files on (`VITE_PROJECTS=1`, see `docs/projects-20261114.md`). Grouping chats by project already exists and is already covered ("every saved conversation and project").

## 1. The claim, and how it was checked

The claim: **"Project instructions and project files are stored only on your device, in your encrypted vault. Our server stores none of them and does not know your projects."**

Checked in the code on 14 November 2026:

- No file under `server/` was changed. No route, status field, counter or log line for projects.
- Editing instructions and adding or removing files write to the browser's own storage only, encrypted with the vault key. The browser test fails if the page asks any other address for anything. The Node test reads the raw records and finds no plain text.
- File text is extracted in the browser by the existing worker. The original file is not kept, only its extracted text.
- Instructions and the chosen passages leave the device only inside the encrypted request to the model, masked first.

What must be said with it:

1. **Instructions and the matching passages of project files are sent** with each question in a chat of that project. "Stored only on your device" is true; "never leaves your device" would be false.
2. **Our request records are a little larger** (token counts), without saying why.
3. **The provider handles them like the rest of the question.**
4. **The backup file holds project names and instructions, not project files.**

## 2. Sentences of the binding texts that would change

| # | File and place | Today | Proposed |
| --- | --- | --- | --- |
| 1 | `shared/privacy-copy.ts`, section `sealed`, first sentence | "The rest of your question, your selected files and the earlier messages you included are locked in your browser ..." | Add "the instructions of the chat's project and the matching passages of its files" after "your selected files" (2.1) |
| 2 | `shared/privacy-copy.ts`, section `device`, after the last sentence | (nothing about project instructions and files) | Add 2.2 |
| 3 | `shared/privacy-policy.ts`, "What you can delete, and how" | "... it removes every saved conversation and project in this browser ..." | Add 2.3 |
| 4 | `shared/privacy-copy.ts`, `PRIVACY_SUMMARY` | still true | No change |

### 2.1 Section "What is sealed and sent"

EN: "The rest of your question, your selected files, in a project chat the project's instructions and the passages of its files that match your question, and the earlier messages you included are locked in your browser so that only one secure server can open them."

DE: "Der Rest Ihrer Frage, Ihre ausgewählten Dateien, in einem Projekt-Chat die Anweisungen des Projekts und die zu Ihrer Frage passenden Abschnitte seiner Dateien sowie die früheren Nachrichten, die Sie einbezogen haben, werden in Ihrem Browser so verschlossen, dass nur ein sicherer Server sie öffnen kann."

### 2.2 Section "What stays on your device", added

EN: "Project instructions and the text of project files are kept only in the encrypted vault on this device. Our server does not receive or store them. With each question in a project chat, the instructions and the passages of the project's files that best match the question are sent with that question, sealed like the rest of it. Incognito chats never use them."

DE: "Projektanweisungen und der Text von Projektdateien werden nur im verschlüsselten Tresor auf diesem Gerät aufbewahrt. Unser Server erhält und speichert sie nicht. Mit jeder Frage in einem Projekt-Chat werden die Anweisungen und die am besten zur Frage passenden Abschnitte der Projektdateien mitgesendet, so verschlossen wie der Rest der Frage. Inkognito-Chats verwenden sie nie."

### 2.3 "What you can delete, and how", added

EN: "Project instructions and files: open the project, edit or remove them, or delete the project. Delete everything on this device removes them too. A backup file contains project instructions, not project files."

DE: "Projektanweisungen und -dateien: Öffnen Sie das Projekt und ändern oder entfernen Sie sie, oder löschen Sie das Projekt. „Alles auf diesem Gerät löschen“ entfernt sie ebenfalls. Eine Sicherungsdatei enthält Projektanweisungen, aber keine Projektdateien."

## 3. Texts in the app (already in the code, shown only with the switch on)

In `src/text/projects.ts`: `instructionsIntro`, `filesIntro`, `notInBackup`, `instructionsSent`, `removeAlso`, `eraseAlso`, in English and German. The owner may want to read them together with part 2.
