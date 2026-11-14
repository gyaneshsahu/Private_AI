# Voice input: privacy wording, DRAFT for the owner's approval (14 November 2026)

**Status: DRAFT by the agent. Nothing in the binding texts was changed.** `shared/privacy-copy.ts`, `shared/privacy-policy.ts` and `shared/provider-disclosure.ts` are as they were. The German sentences need a legal read. The only text that ships with the code is the first-use note inside the app (part 4), and it shows only while voice input is switched on.

**When this matters.** Only when the owner switches voice input on (`docs/voice-to-text-20261114.md`). While it is off, no sentence below needs to change.

**What the code does** (tested offline, `tests/voice-input.test.ts` and `tests/voice-relay.test.ts`): the recording stays in the browser's memory, is encrypted in the browser by the Privatemode SDK, passes through our relay as bytes we cannot open, and is dropped in the browser when the text arrives. We store no audio and log no body. We count that a voice request happened, like a chat request.

**What we do not know** (ask Privatemode before publishing): whether Edgeless keeps audio or transcripts, and for how long it keeps records about audio requests. The sentences below say only what CometRow does. Sentences about Edgeless are marked.

## 1. Sentences that would change

| # | File and place | Today | Problem once voice input is on | Proposed |
| --- | --- | --- | --- | --- |
| 1 | `shared/privacy-copy.ts`, section `device` ("What stays on your device"), first sentence | "Before anything is sent, CometRow looks for ID numbers, bank account and card numbers, ..." | A number the user says aloud is inside the recording. Masking works on text only | Add one sentence after "...keeps the real value on your device.": see 2.1 |
| 2 | `shared/privacy-copy.ts`, `PRIVACY_SUMMARY` and `PRIVACY_SUMMARY_DE` | "ID, bank and contact details stay on your device; everything else is sealed ..." | Not true for spoken numbers | See 2.2 |
| 3 | `shared/privacy-copy.ts`, section `sealed`, first sentence | "The rest of your question, your selected files and the earlier messages you included are locked in your browser ..." | Recordings are not named | See 2.3 |
| 4 | `shared/privacy-copy.ts`, section `ours`, first sentence | "We can see that your account asked something, when, how many times, which model answered, ..." | A voice request is counted too | See 2.4 |
| 5 | `shared/provider-disclosure.ts`, `privatemode` text, English and German | "Your messages are answered by our AI provider Edgeless Systems GmbH ..." | Recordings go to the same provider and are not named | See 2.5 |
| 6 | `shared/privacy-policy.ts` | No sentence about the microphone | The policy should say when the microphone is used and that no audio is kept | New short section, see 2.6 |
| 7 | `src/text/app.ts`, `photoNote` (tools menu) | "Dictation, live voice, image creation and sharing are not connected: no permissions or media are collected for them." | Wrong for dictation once it is on | Already handled in code: while voice input is on, the app shows `photoNoteVoice` instead. No decision needed |

If the corrections draft of 13 November (`docs/privacy-policy-corrections-draft-20261113.md`, part 2.3, "what the app stores in the browser") is adopted, add one line there: "`cometrow.voice.note-seen`: that the note about voice input was shown."

## 2. Proposed text, English and German

### 2.1 Section "What stays on your device": one added sentence

EN: "This works on text. If you use voice input and say such a number aloud, it is part of the recording and goes to the secure server with it."

DE: "Das wirkt nur bei Text. Wenn Sie die Spracheingabe nutzen und eine solche Nummer laut sagen, ist sie Teil der Aufnahme und geht mit ihr an den sicheren Server."

### 2.2 Summary sentence

EN: "ID, bank and contact details you type stay on your device; everything else is sealed so only one checked secure server can read it, and we never can."

DE: "Identifikations-, Bank- und Kontaktangaben, die Sie tippen, bleiben auf Ihrem Gerät; alles andere wird versiegelt, sodass nur ein einziger geprüfter sicherer Server es lesen kann und wir nie."

Note: the dictated text is masked like typed text when it is sent to the chat. "You type" is short for "in text". The owner may prefer "in your text".

### 2.3 Section "sealed": first sentence

EN: "The rest of your question, your selected files, the earlier messages you included and any voice recording you make are locked in your browser so that only one secure server can open them."

DE: "Der Rest Ihrer Frage, Ihre ausgewählten Dateien, die früheren Nachrichten, die Sie einbezogen haben, und jede Sprachaufnahme, die Sie machen, werden in Ihrem Browser so verschlossen, dass nur ein einziger sicherer Server sie öffnen kann."

### 2.4 Section "What we can see": first sentence

EN: "We can see that your account asked something or used voice input, when, how many times, which model answered, ..." (the rest unchanged). Add at the end of the section: "We keep no recording and no text made from it."

DE: "Wir können sehen, dass Ihr Konto etwas gefragt oder die Spracheingabe genutzt hat, wann, wie oft, welches Modell geantwortet hat, ..." (Rest unverändert). Am Ende des Abschnitts: "Wir behalten keine Aufnahme und keinen daraus erzeugten Text."

Note: we do not see how long a recording was. We see the size of the encrypted upload in passing and do not record it.

### 2.5 Provider disclosure (Privatemode)

EN, added after the second sentence: "If you use voice input, your recording is turned into text by a speech model of the same provider, on the same secure servers in the EU."

DE: "Wenn Sie die Spracheingabe nutzen, wird Ihre Aufnahme von einem Sprachmodell desselben Anbieters in Text umgewandelt, auf denselben sicheren Servern in der EU."

**Marked, not verified:** that the speech models run on the same sub-processors (Scaleway, Lyceum) and only in the EU. The data processing agreement of 24 July 2026 covers the service as a whole according to our record (`docs/dpa-record-privatemode-20261112.md`), but nobody checked it for the speech models. The existing sentence "Edgeless states that it keeps records such as time and token counts, without the content of your messages, for up to 90 days" should be confirmed for audio requests before it is read as covering them.

### 2.6 Privacy policy: new short section "Voice input"

EN: "Voice input is optional. Your browser asks for the microphone only when you press the microphone button, and it is released when the recording stops. A recording is at most [2] minutes long. It stays in your browser's memory until it has been turned into text, then it is dropped. We do not store recordings, and our systems cannot open them on the way. The text appears in the message box and is sent only when you press Send. We do not use your browser's own dictation service."

DE: "Die Spracheingabe ist freiwillig. Ihr Browser fragt erst nach dem Mikrofon, wenn Sie die Mikrofon-Taste drücken, und gibt es frei, sobald die Aufnahme endet. Eine Aufnahme ist höchstens [2] Minuten lang. Sie bleibt im Speicher Ihres Browsers, bis sie in Text umgewandelt ist, und wird dann verworfen. Wir speichern keine Aufnahmen, und unsere Systeme können sie auf dem Weg nicht öffnen. Der Text erscheint im Nachrichtenfeld und wird erst gesendet, wenn Sie auf Senden drücken. Den Diktierdienst Ihres Browsers verwenden wir nicht."

The number in brackets is `inference.voice.maxSeconds` as the owner sets it.

## 3. Questions for the legal read

1. A voice is personal data. A recording can also carry special categories (health) if the user speaks about them. Does the draft health-consent step (`shared/health-consent.ts`) need to name voice input?
2. Is a voice recording that is used only to make text "biometric data for the purpose of uniquely identifying" a person (Art. 9 GDPR)? We do not identify anyone by voice. The legal read should confirm that no extra basis is needed.
3. The records of processing (Art. 30 draft) need a line for voice input: purpose, the processor (Edgeless), no storage on our side.
4. Does the data processing agreement with Edgeless cover the speech models and audio content? Ask Edgeless in writing, together with the retention question.

## 4. The in-app note (ships with the code, shown before the first recording)

EN: "Your recording goes encrypted to the protected speech model in the EU, over the same checked connection as chat. CometRow keeps no copy: the recording stays in this browser's memory until it is turned into text, then it is dropped. Only the text lands in the message box. Nothing goes to the chat until you press Send. The text may contain errors, so read it first. Numbers you say aloud, such as a bank or ID number, are part of the recording: the stand-ins that keep them on your device work on text only."

DE: "Ihre Aufnahme geht verschlüsselt an das geschützte Sprachmodell in der EU, über dieselbe geprüfte Verbindung wie der Chat. CometRow behält keine Kopie: Die Aufnahme bleibt im Speicher dieses Browsers, bis sie in Text umgewandelt ist, und wird dann verworfen. Nur der Text landet im Nachrichtenfeld. An den Chat geht nichts, bevor Sie auf Senden drücken. Der Text kann Fehler enthalten, lesen Sie ihn also zuerst. Nummern, die Sie laut sagen, etwa eine Konto- oder Ausweisnummer, sind Teil der Aufnahme: Die Platzhalter, die solche Nummern auf Ihrem Gerät halten, wirken nur bei Text."

"In the EU" in this note rests on the same unverified point as 2.5. If the owner wants no unverified claim in the app, remove "in the EU" from `src/text/voice.ts` (both languages) until Edgeless confirms it.
