# Notices: one general notice, everything else listed (17 November 2026)

Owner's correction, 17 November: show exactly one general notice, once, at first start, with "Got it", never again. No per-feature cautions, popups or "less secure" tags. Keep only what must stay, each shown once: the health and sensitive-data consent (legally required) and the Secure Max confirmation. List every other notice and remove it or move it to the privacy page; mark anything where the law may require an in-context notice. Never write anything untrue.

## The first-start notice (built; for the legal read)

Shown once per browser above the message box, with "Privacy" (opens the privacy policy) and "Got it". Never again in that browser (`localStorage` key `cometrow.first-start-notice`; with storage blocked it shows until "Got it" on each visit).

- EN: "CometRow protects your chats with sealed, encrypted processing in the EU. A few features, such as {web search | image creation}, use a trusted partner instead, because they rarely involve personal details. Details are in Privacy."
- DE: "CometRow schützt Ihre Chats mit versiegelter, verschlüsselter Verarbeitung in der EU. Einige Funktionen, etwa {die Websuche | die Bilderstellung}, nutzen stattdessen einen vertrauenswürdigen Partner, weil dabei selten persönliche Angaben vorkommen. Einzelheiten unter Datenschutz."
- The example is "image creation" only when that switch is on; otherwise "web search", so the sentence is always true.
- **Legal read:** whether this one notice, plus the privacy page, is enough information at first use (GDPR Art. 13), and whether "sealed" needs a word of explanation.

## Kept (each shown once, at the moment it matters)

| Notice | Where | Why |
| --- | --- | --- |
| Health and sensitive-data consent | before the first message or picture that may contain such data | **Legally required** (GDPR Art. 9(2)(a) explicit consent). Wording change bumps its version (decisions doc item 20) |
| Secure Max confirmation ("Open Secure Max?", tick box) | the first time Secure Max is opened | Owner's decision; the user must understand that lost keys mean lost data |
| "Answers come from an AI, not a person. Check important answers." | the line under the message box | **May be legally required in context**: EU AI Act Art. 50(1) (people must be informed that they interact with an AI system unless obvious). Ask the lawyer; until then it stays |
| Search approval ("Search the web for: ...") | before a web search runs | Not a notice: it is the user's choice of what is sent to the search partner |

## Removed from the screens on 17 November (now covered by the first-start notice and the privacy page)

| Notice (text key) | Where it was | What it said, in short |
| --- | --- | --- |
| `voiceText.noteTitle`, `note`, `noteStart`, `noteLater` | first tap on the microphone ("Before you dictate") | recording goes encrypted to the protected speech model in the EU; no copy kept |
| `imageText.noteTitle`, `note1` to `note4` | first "Ask about a picture" ("Before you send a picture") | sent once, encrypted, to the Fast model; hidden file data removed; you can cover parts; not stored |
| `photoUiText.intro`, `cameraHint`, `cameraNote` | Photo to text | reads printed text on this device; camera only when pressed; camera on only while the preview is open |
| `liveVoiceText.note` | Voice conversation panel | recording encrypted to the EU speech model; numbers said aloud are not masked |
| `appText.researchNote` | Research page | results only for this session; "use public, non-sensitive queries only" |
| second sentence of `incognitoBanner`, `disappearingBanner` | banners of incognito and disappearing chats | "This does not change what the secure server keeps for a short time or the request records we hold." |

All of these facts belong on the privacy page (see `docs/privacy-partners-draft-20261117.md`); the number masking limit of voice is listed there explicitly.

## Corrected because they were not true in every mode

| Text | Problem | Now |
| --- | --- | --- |
| `memoryText.intro`: "Memories are stored only on this device, inside your encrypted vault. Our server stores none of them and keeps no profile of you." | In Secure mode (the default) memories are saved, encrypted, to the account on our servers (Data controls says so) | "Memories are stored encrypted, with your saved chats." (EN and DE) |
| `canvasText.note`: "Kept on this device with the conversation." | In Secure mode the conversation, and so the canvas, is saved to the account | the line is no longer shown |

## Listed, not changed (owner decides; these are instructions or states, not cautions)

| Group | Examples (text keys) | Recommendation |
| --- | --- | --- |
| State lines of sign-in and account | `account.notice*`, `codeNote`, `introCode` | keep: they say what is happening |
| Help texts inside Settings and Data controls | `secureLong`, `appearanceNote`, `languageNote`, `accountPageNote` | keep: Settings is the place for details |
| Feature instructions | `attachmentsNote` (supported files and limits), `canvas.askNote`, `deepResearch.planNote`, `scheduled.searchNote`, `projects.instructionsIntro` | shorten in a later pass (`docs/ui-text-shortening-proposal.md`) |
| Per-answer lines | `keptNote` (placeholders were used and put back), `images.attachedNote`, `images.thinkingNote` | keep `keptNote` as a positive fact; the picture lines can move to Help |
| Sync and recovery-key warnings | `sync.keyWarning`, `promptWarning`, `modes.maxResetWarning` | keep: they prevent data loss in Secure Max |
| Footer | `footerNote` "No advertising. No training on your data." | keep, true |

Possible in-context legal duties to ask the lawyer about: the AI disclosure line (AI Act Art. 50(1)); labelling of generated images (AI Act Art. 50(2) and (4), see `docs/image-creation-20261117.md`); whether the microphone and camera need a short in-context line beyond the browser's own permission prompt (we think the browser prompt plus the privacy page suffice).
