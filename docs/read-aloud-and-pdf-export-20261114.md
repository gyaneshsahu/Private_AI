# Read aloud and PDF export (14 November 2026)

Two features for the invite-only test phase. Both run only on the device. Nothing is sent anywhere, and the server did not change. Both are off by default, each behind its own switch. Checklist rows U3 and U4.

## 1. The switches

| Feature | Build variable | Default |
| --- | --- | --- |
| Read aloud | `VITE_READ_ALOUD=1` | off |
| PDF export | `VITE_PDF_EXPORT=1` | off |

They are build settings, read in `src/device-features.ts`, the same way as `VITE_GERMAN_UI`. `Dockerfile` and `Dockerfile.render` take each as a build argument. To turn one on for invitees: add the Render environment variable with the value `1` and deploy. To turn it off: remove it and deploy. While a switch is off the button does not exist on the page.

Why a build setting and not a field in the server config and `/api/status`: neither feature talks to the server, so the server has nothing to decide. A server field would touch four shared files (`server/deployment-config.ts`, `server/consumer-workspace.ts`, `server/app.ts`, `shared/contracts.ts`) for the same result. The price: turning a feature on needs a deploy with a new build, not only a config edit and restart. If the owner wants a switch without a rebuild, the server field is about ten lines and one config test.

Unverified, as for `VITE_GERMAN_UI`: that Render hands service environment variables to the Docker build.

## 2. Read aloud

### What it does

Each complete answer has a "Read aloud" button (German: "Vorlesen"). It uses the browser's built-in speech synthesis (`window.speechSynthesis`). Privatemode has no speech model, and the owner approved browser speech only as an on-device function.

- The voice follows the answer's language, German or English. The language comes from the existing word count in `src/arithmetic/numbers.ts` (`languageOf`, now exported). On a tie the interface language is used.
- It reads the answer as the screen shows it (`spokenText` in `src/read-aloud.ts` walks the rendered answer). So markdown signs are never read. A code block becomes "Code block omitted." A formula becomes the word "formula". A table is announced and read row by row. Citation chips, source ids and the app's grey notices are left out. A web address becomes the word "link". A masking placeholder that is still in the text becomes "masked value".
- While an answer is read, the button is marked as pressed and a second button, "Pause reading", appears. Pressing "Read aloud" again stops.
- Only one answer is read at a time. Reading stops when a message is sent, another conversation opens, the vault locks or unlocks, the message goes away, or the page is left or reloaded.
- Long text is cut into pieces of at most 200 characters at sentence ends, because some engines stop in the middle of a long utterance (Chrome after about 15 seconds). No keep-alive timer was needed with pieces this short.
- Nothing about what was spoken is stored. There is no rate setting.

### The local-voice rule

Some browser voices are not on the device. Chrome's "Google ..." voices and Edge's "Online (Natural)" voices send the text to the vendor. A voice is used only if all three hold (`chooseVoice` in `src/read-aloud.ts`):

1. The voice reports `localService === true`. A missing or false flag means the voice is not used.
2. Its name and its `voiceURI` do not contain `google`, `online`, `network`, `cloud`, `remote` or `natural`. This is a second check in case a browser reports the flag wrongly.
3. The browser is not on Android.

If no voice passes for the answer's language, CometRow does not speak and says so: "No on-device voice for German is installed on this device ...", with a hint where to add a voice in Windows and on Apple devices. There is never a fallback to another voice or another language.

### Limits of the rule, per browser

The flag is the browser's own statement. A web page cannot check it. This table is from the type definitions and from general knowledge of the browsers, not from tests on real devices.

| Browser | What it offers | Result under the rule |
| --- | --- | --- |
| Chrome on Windows, Mac, Linux | Operating-system voices with the flag set, plus "Google ..." voices with the flag unset | System voices are used. Google voices are refused twice (flag and name) |
| Edge on Windows, Mac | System voices with the flag set, plus "Online (Natural)" voices with the flag unset | System voices are used. Online voices are refused twice |
| Firefox on a computer | System voices only, flag set | Used |
| Safari on Mac, iPhone, iPad | System voices only, flag set. All browsers on iPhone and iPad use the same engine | Used. Unverified whether every listed Apple voice is already downloaded |
| Any browser on Android | Voices of the phone's speech engine. That engine can use the network for a voice, and the flag does not reliably show it | **Never speaks.** The user reads: "This browser does not reliably say whether its voices stay on the device ..." |
| Browsers without speech synthesis | Nothing | The button is not shown |

Known weak points:

- A browser that sets the flag on a network voice with a harmless name would pass. No such desktop browser is known to the author, but it cannot be excluded.
- The name check can refuse a harmless local voice, for example a local Windows voice with "Natural" in its name. This errs on the safe side.
- Android is recognised by the word "Android" in the browser's user agent. A browser that hides it (desktop mode) would be treated like a computer, and then only the flag and the name check protect.
- The result on Android is that read aloud does not work on Android phones at all. This is the owner's rule "prefer not speaking over leaking", but it is a real product gap. See the open decisions.

### Accessibility

The button has a fixed name and `aria-pressed`. The pause button also has a fixed name and `aria-pressed`. The refusal text is a `role="status"` region. The spoken text itself is not announced through `aria-live`, so a screen reader does not read it a second time. A screen reader user who starts read aloud will still hear two voices if the screen reader talks at the same time. That is not solved and not tested with a real screen reader.

## 3. PDF export

### What it is

"Export as PDF" (German: "Als PDF exportieren") on each complete answer, and "Export conversation as PDF" in the conversation menu. The app builds a print-only view (`src/pdf-export.tsx`, `src/print.css`) and opens the browser's print dialog with `window.print()`. The user picks "Save as PDF" there. On a phone it is the print or share sheet.

The export of one answer contains the question before it and the answer. The export of the conversation contains every message of the open conversation, in order.

The page contains:

- a header: CometRow, the conversation title, the conversation's date in the interface language's format;
- for each message: "Question" or "Answer", the answer mode label as the screen shows it, the app's own notices for that message (unchecked figures, no official source, arithmetic and completeness warnings, the large-document passage note, the kept-on-device note, an incomplete or failed answer), then the text as the screen renders it;
- under an answer with sources: the source list, each with its title, page and full address;
- a footer: "Exported from CometRow on <date>. Answers can contain errors."

Print rules: dark text on white whatever the app's theme; page margins of 18 and 16 mm; no app chrome, no buttons, no composer; headings stay with their text; code blocks, tables, list items and display formulas are kept whole where they fit on a page; long code lines wrap; wide tables wrap inside the page width; formulas are the same KaTeX rendering as on screen; links in the text are followed by their address.

What cannot appear: the view receives only the messages of the open conversation and renders them with the same component as the screen. It gets no other conversation, no account detail and no vault state. Text that is masked on screen is the same masked text in the export. Source bodies are not printed, only titles and addresses.

Ordinary printing of the app (Ctrl+P without an export) is unchanged.

### What it is not

- It is not a one-tap file download. The user goes through the print dialog and chooses where to save. The file name is the browser's choice.
- The page header and footer lines that some browsers add (address, date, page number) are the user's print settings. The app cannot switch them off.
- It exports the open conversation only. To export a saved conversation, open it first.
- A code block or table longer than one page is split by the browser.

### Is the print dialog enough?

For the test phase: yes, in the author's judgement. Desktop Chrome, Edge, Firefox and Safari all offer "Save as PDF" in the print dialog. iPhone, iPad and Android offer it through the system print sheet. The result has real, selectable text, real formulas and correct tables, because the browser's own layout engine draws it.

A real file download needs a PDF library. None was added. Rough costs, from memory and not measured for this project:

| Library | Licence | Rough size (minified) | What it would mean |
| --- | --- | --- | --- |
| jsPDF | MIT | about 300 kB; its HTML mode also needs html2canvas, about 200 kB | HTML mode draws the page as a picture or with weak text layout. Formulas and tables suffer |
| html2pdf.js (jsPDF plus html2canvas) | MIT | about 500 kB together | Pages are pictures. Text cannot be selected or searched. Large files |
| pdfmake | MIT | about 1 MB and more with fonts | Its own document format. We would rewrite the answer renderer for it. No KaTeX |
| pdf-lib | MIT | about 500 kB | Low-level drawing only. We would write our own page layout |

None of them matches the browser's print quality for formulas and tables without turning pages into pictures. A download would cost a new dependency in the supply chain, several days of layout work, and a worse document.

## 4. Proposed sentences for the privacy texts (owner decides; legal texts not edited)

English: "Read aloud uses a voice that is installed on your device. The text of the answer does not leave your device for this. If your device offers only online voices, CometRow does not read aloud."

German: "Die Vorlesefunktion verwendet eine Stimme, die auf Ihrem Gerät installiert ist. Der Text der Antwort verlässt Ihr Gerät dafür nicht. Bietet Ihr Gerät nur Online-Stimmen an, liest CometRow nicht vor."

English: "Export as PDF uses the print function of your browser. The file is created on your device. CometRow does not receive it."

German: "Der PDF-Export verwendet die Druckfunktion Ihres Browsers. Die Datei entsteht auf Ihrem Gerät. CometRow erhält sie nicht."

Note for the owner: the first sentence rests on the browser's own flag. A more careful wording is "a voice that your browser reports as installed on your device".

## 5. Tests (all offline)

- `tests/read-aloud.test.ts` (12 tests, Node): the two switches; the voice rule with fake voice lists (local German present, only online German present, default voice, missing flag, a flag contradicted by the name or the `voiceURI`, Android); waiting for `voiceschanged` with a time limit; addresses and placeholders in German and English; chunking; the reader's states with a fake engine (order, pause, resume, stop, one answer at a time, engine error).
- `tests/pdf-export.test.ts` (5 tests, Node): the export view's markup for a synthetic conversation with a table, code, a formula, a warning, a passage note and sources, with English and German headings and dates; masked text stays masked and source bodies stay out; the switch; the print stylesheet's rules.
- `tests/device-features-ui.test.ts` (4 tests, headless Chromium through vitest, its own Vite server on a random port, fixture `tests/fixtures/device-features-entry.tsx`): a German and an English answer are turned into the expected spoken text from the real rendered page; the local voice of the right language is chosen; pause, resume and stop; the refusal with only an online German voice; the export view in print media hides the stand-in chrome, composer and buttons, nothing is wider than an A4 page less margins (a very long word in a table, a 400-character code line), text is black on white although the page is dark, and `page.pdf()` gives a PDF of 12 to 40 pages for a 24-message conversation.

## 6. Not verified

- Any real voice. Every test uses a fake speech engine. No sound was ever produced.
- Real Safari (Mac, iPhone, iPad), real Firefox, real Edge, any Android phone, any real print dialog. Only headless Chromium was used.
- What each real browser reports in `localService`. The table in section 2 is from knowledge, not from measurement.
- Pause and resume on real engines. Some engines are known to handle them badly.
- Real screen readers (NVDA, JAWS, VoiceOver, TalkBack) together with read aloud.
- The buttons inside the full app with the switches on. The tests use the components in a test page. `src/App.tsx` only places them and stops reading on the events listed above. That wiring was type-checked and the existing app test still passes with the switches off, but it was not exercised with them on.
- The printed look on paper sizes other than A4, and the look of the PDF by eye. The test checks widths and page count, not beauty.
- That Render passes the two build variables into the Docker build.
- The full test suite, the durable suite and the Playwright end-to-end specs were not run. No spec under `tests/browser` was added or edited.

## 7. Open decisions for the owner

1. Android: read aloud never speaks there. Accept this for the test phase, or allow Android with a clear warning? The author recommends keeping it off.
2. Is the print dialog accepted as "PDF export", or is a one-tap download required (section 3 has the cost)?
3. Build switch or server switch (section 1)?
4. The privacy sentences in section 4.
5. Should the export of one answer include the question before it? It does now.
