# Picture questions: privacy wording, DRAFT for the owner's approval (14 November 2026)

**Status: DRAFT by the agent. Nothing in the binding texts was changed.** `shared/privacy-copy.ts`, `shared/privacy-policy.ts`, `shared/provider-disclosure.ts` and `shared/health-consent.ts` are as they were. The German sentences need a legal read. The only texts that ship with the code are the notice and the tool texts inside the app (part 4), and they show only while picture questions are switched on.

**When this matters.** Only when the owner switches picture questions on (`docs/images-20261114.md`). While they are off, no sentence below needs to change.

**What the code does** (tested offline, `tests/image-upload.test.ts`, `tests/image-redaction-ui.test.ts`, `tests/image-relay.test.ts`): the chosen file is drawn again on the device, so hidden file data (place, time, device) is not in what is sent. The user can cover parts with black boxes, and the boxes are part of the picture that is sent. The picture is encrypted in the browser by the Privatemode SDK, passes through our relay as bytes we cannot open, and is dropped in the browser when the answer ends. We store no picture and log no body. A saved chat keeps the question, the answer and the line "[Picture: not kept]". We count that a picture question happened, like a chat request.

**What the code does not do.** It does not find everything private in a picture. Suggested boxes cover only printed identifiers that the on-device text reading gets right. Faces, handwriting, names, addresses and whatever else the picture shows are sent unless the user covers them. No sentence may say or suggest otherwise.

**What we do not know** (ask Privatemode before publishing): whether Edgeless keeps pictures, for how long it keeps records about picture requests, and whether a picture can sit in the short-term working memory (the prompt cache). The sentences below say only what CometRow does. Sentences about Edgeless are marked.

## 1. Sentences that would change

| # | File and place | Today | Problem once picture questions are on | Proposed |
| --- | --- | --- | --- | --- |
| 1 | `shared/privacy-copy.ts`, section `device` ("What stays on your device") | "Before anything is sent, CometRow looks for ID numbers, bank account and card numbers, ... It replaces each one with a stand-in ... and keeps the real value on your device." | True for text only. A number inside a picture is sent unless the user covers it | Add the sentences in 2.1 |
| 2 | `shared/privacy-copy.ts`, `PRIVACY_SUMMARY` and `PRIVACY_SUMMARY_DE` | "ID, bank and contact details stay on your device; everything else is sealed ..." | Not true for a picture | See 2.2 |
| 3 | `shared/privacy-copy.ts`, section `sealed`, first sentence | "The rest of your question, your selected files and the earlier messages you included are locked in your browser ..." | Pictures are not named | See 2.3 |
| 4 | `shared/privacy-copy.ts`, section `ours` | "... We keep no copy of your conversations; saved history lives only on your device ..." | Should say that a picture is in no saved history at all | See 2.4 |
| 5 | `shared/provider-disclosure.ts`, `privatemode` text, English and German | "Your messages are answered by our AI provider Edgeless Systems GmbH ..." | Pictures go to the same provider and are not named | See 2.5 |
| 6 | `shared/privacy-policy.ts` | No sentence about pictures or the camera for this purpose | The policy should say what happens to a picture | New short section, see 2.6 |
| 7 | `shared/health-consent.ts`, second paragraph | "Your message is sent, locked, to the secure server ... Some identifiers, like account numbers, are replaced on your device before sending; health details are not." | A health picture is "part of your message" only by reading generously | See 2.7. Changing it needs a new consent version, so everyone is asked again |
| 8 | `src/text/photo.ts`, "Photo to text" intro | "... Nothing is uploaded." | Still true: "Photo to text" is a separate entry and sends no picture. No change | None |

If the corrections draft of 13 November (`docs/privacy-policy-corrections-draft-20261113.md`, part 2.3, "what the app stores in the browser") is adopted, add one line there: "`cometrow.images.note-seen`: that the note about pictures was shown."

## 2. Proposed text, English and German

### 2.1 Section "What stays on your device": added sentences

EN: "This works on text. A picture you attach is sent as you see it in the last step before attaching. CometRow removes the hidden data in the file, such as the place and time a photo was taken. Anything the picture shows, including numbers, names, faces and handwriting, is sent unless you cover it with a black box. CometRow can suggest boxes for printed numbers and email addresses it recognises. These suggestions can miss things."

DE: "Das gilt für Text. Ein Bild, das Sie anhängen, wird so gesendet, wie Sie es im letzten Schritt vor dem Anhängen sehen. CometRow entfernt die verborgenen Daten in der Datei, etwa Ort und Zeit der Aufnahme. Alles, was im Bild zu sehen ist, auch Nummern, Namen, Gesichter und Handschrift, wird gesendet, wenn Sie es nicht mit einem schwarzen Kasten abdecken. CometRow kann Kästen für gedruckte Nummern und E-Mail-Adressen vorschlagen, die es erkennt. Diese Vorschläge können etwas übersehen."

### 2.2 The one-sentence summary

EN: "In text, ID, bank and contact details stay on your device; a picture is sent as you see it, with the parts you covered blacked out; everything that is sent is sealed so only one checked secure server can read it, and we never can."

DE: "In Texten bleiben Identifikations-, Bank- und Kontaktangaben auf Ihrem Gerät; ein Bild wird so gesendet, wie Sie es sehen, mit geschwärzten Stellen, wo Sie es abgedeckt haben; alles Gesendete wird versiegelt, sodass nur ein einziger geprüfter sicherer Server es lesen kann und wir nie."

### 2.3 Section "What is sealed and sent": first sentence

EN: "The rest of your question, your selected files, a picture you attached and the earlier messages you included are locked in your browser so that only one secure server can open them."

DE: "Der Rest Ihrer Frage, Ihre ausgewählten Dateien, ein angehängtes Bild und die früheren Nachrichten, die Sie einbezogen haben, werden in Ihrem Browser verschlossen, sodass nur ein einziger sicherer Server sie öffnen kann."

### 2.4 Section "What we can see": one added sentence

EN: "A picture you attach is not stored anywhere by CometRow: not on our server, not in your saved history and not in this browser. It is sent once with your question. Later messages in the chat do not include it."

DE: "Ein angehängtes Bild wird von CometRow nirgends gespeichert: nicht auf unserem Server, nicht in Ihrem gespeicherten Verlauf und nicht in diesem Browser. Es wird einmal mit Ihrer Frage gesendet. Spätere Nachrichten im Chat enthalten es nicht."

### 2.5 Provider section (Privatemode): first sentence

EN: "Your messages, and pictures you attach to them, are answered by our AI provider Edgeless Systems GmbH, Bochum, Germany (Privatemode), on secure servers in the EU ..."

DE: "Ihre Nachrichten und die Bilder, die Sie anhängen, werden von unserem KI-Anbieter Edgeless Systems GmbH, Bochum, Deutschland (Privatemode), auf sicheren Servern in der EU beantwortet ..."

**About Edgeless, not confirmed:** add "Edgeless states that it does not keep pictures after the reply is sent" only after Edgeless has said so in writing.

### 2.6 Privacy policy: a new short section "Pictures"

EN: "If you attach a picture to a question, your browser first draws it again without the hidden data in the file and makes it smaller. You can cover parts of it. The picture is then sent, locked, to the secure server of our AI provider together with your question, and is used only to answer it. We cannot open it. We do not store it. The camera is used only when you choose to take a photo, and only while the camera preview is open. Reading text in the picture to suggest cover-up boxes happens on your device; for this, your browser loads reading data from our server once, and the picture is not sent for it."

DE: "Wenn Sie einer Frage ein Bild anhängen, zeichnet Ihr Browser es zuerst neu, ohne die verborgenen Daten in der Datei, und verkleinert es. Sie können Teile davon abdecken. Das Bild wird dann zusammen mit Ihrer Frage verschlossen an den sicheren Server unseres KI-Anbieters gesendet und nur für die Antwort verwendet. Wir können es nicht öffnen. Wir speichern es nicht. Die Kamera wird nur verwendet, wenn Sie ein Foto aufnehmen möchten, und nur solange die Kameravorschau geöffnet ist. Das Lesen von Text im Bild für die Vorschläge zum Abdecken geschieht auf Ihrem Gerät; dafür lädt Ihr Browser einmal Lesedaten von unserem Server, und das Bild wird dafür nicht gesendet."

### 2.7 Health consent, second paragraph (needs a new consent version)

EN: "Your message, and any picture you attach, is sent, locked, to the secure server of our AI provider, which works out the answer and sends it back. Some identifiers in text, like account numbers, are replaced on your device before sending; health details are not, and nothing in a picture is replaced."

DE: "Ihre Nachricht und jedes angehängte Bild werden verschlossen an den sicheren Server unseres KI-Anbieters gesendet, der die Antwort erstellt und zurücksendet. Einige Kennungen in Texten, etwa Kontonummern, werden vor dem Senden auf Ihrem Gerät ersetzt; Gesundheitsangaben nicht, und in einem Bild wird nichts ersetzt."

Until this is approved, the app covers the gap in its own flow: while the consent step is on and the user has not agreed, every picture is asked about ("Does this picture show health or other sensitive details?"), and "Yes" leads to the existing consent card.

## 3. Claims we must not make

- Not "pictures are anonymised", "personal data is removed from pictures" or "we blur faces". None of these is true.
- Not "automatic redaction". The app suggests boxes, and the user decides.
- Not "pictures never leave your device". They are sent to the model. Only "Photo to text" keeps the photo on the device.
- Not "the provider deletes pictures at once" until Edgeless has confirmed it.
- "Not stored" is about CometRow. Say "CometRow does not store the picture", not "the picture is not stored anywhere".

## 4. Texts that ship with the code (only while picture questions are on)

From `src/text/images.ts`. A test (`tests/image-upload.test.ts`) fails if these texts lose the limits or gain a claim of full masking.

The first-upload notice, English:

> Your picture goes encrypted to the protected Fast model in the EU, over the same checked connection as chat. It is sent once, together with your question.
>
> On this device, CometRow first removes the hidden data in the file, such as the place and time a photo was taken, and makes the picture smaller.
>
> You can cover parts of the picture with black boxes before you send it. CometRow can suggest boxes for printed details such as email addresses, phone numbers and bank numbers. These suggestions can miss things. Faces, handwriting and anything else the picture shows are not covered unless you cover them yourself.
>
> CometRow does not store the picture: not on this device, not in saved chats and not on our server. After the answer it is gone. Later messages in the chat do not include it.

The first-upload notice, German:

> Ihr Bild geht verschlüsselt an das geschützte Modell „Schnell“ in der EU, über dieselbe geprüfte Verbindung wie der Chat. Es wird einmal gesendet, zusammen mit Ihrer Frage.
>
> Auf diesem Gerät entfernt CometRow zuerst die verborgenen Daten in der Datei, etwa Ort und Zeit der Aufnahme, und verkleinert das Bild.
>
> Sie können Teile des Bildes vor dem Senden mit schwarzen Kästen abdecken. CometRow kann Kästen für gedruckte Angaben vorschlagen, etwa E-Mail-Adressen, Telefonnummern und Kontonummern. Diese Vorschläge können etwas übersehen. Gesichter, Handschrift und alles andere im Bild werden nicht abgedeckt, wenn Sie es nicht selbst abdecken.
>
> CometRow speichert das Bild nicht: nicht auf diesem Gerät, nicht in gespeicherten Chats und nicht auf unserem Server. Nach der Antwort ist es weg. Spätere Nachrichten im Chat enthalten es nicht.

Points for the owner in these texts:

- "in the EU" and "protected" repeat what the voice note says. They rest on the provider section, which is owner-reported.
- "not on this device" means: not written to storage. The picture is in the browser's memory until the answer ends.
- "After the answer it is gone" is about CometRow. See "What we do not know" above.
- The health question and its German text are new wording, not part of the approved consent: "Does this picture show health or other sensitive details? For example a medical letter, a prescription, a lab result, a skin or body photo, or something about religion, sexual life or ethnic origin. CometRow cannot tell what a picture shows, so it asks you." / "Zeigt dieses Bild Gesundheitsangaben oder andere sensible Angaben? Zum Beispiel einen Arztbrief, ein Rezept, einen Laborbefund, ein Foto von Haut oder Körper oder etwas zu Religion, Sexualleben oder ethnischer Herkunft. CometRow kann den Inhalt eines Bildes nicht erkennen und fragt deshalb Sie."
