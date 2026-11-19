# Notices, consent and prompts

## 18 November 2026: the ChatGPT model (replaces the rules below)

Owner's decision: consent for everything (sensitive and health data, web search, image partners, data flows) comes from ONE acceptance on the sign-in page: "By continuing, you agree to our Terms and Privacy Policy" (DE: "Indem Sie fortfahren, stimmen Sie unseren Nutzungsbedingungen und unserer Datenschutzerklärung zu."), with links to `/terms` and `/privacy`. Signing in there records the versions (`shared/legal-versions.ts`) with the time and the sign-in method (`server/account-consent.ts`, migration 0026). The Terms and the Privacy Policy carry all details (`shared/terms-of-use.ts`, `shared/privacy-policy.ts`). For the legal read: `docs/legal-read-consent-20261118.md`, including what the law may need beyond this acceptance.

**Removed:** the health and sensitive-data consent (card before the first message, the "declined" note, the Settings choice, the picture question's health step, the server switch); the first-start notice; the web search approval card (search text, "Search and answer", "Answer without searching", the German-rules "search first?" choice, the "search again" offer); the scheduled "Run now" search card; the consent boxes of background (Auto) tasks (the server's per-task consent record is filled in by the app).

**How search works now (19 November 2026, `docs/owner-decisions.md`):** search is automatic. The app searches when a question needs current information, after masking identifiers on the device. One Settings switch, "Look things up online", on by default, turns it off. The "+" > "Search the web" item and the opt-in switches are removed.

**The only thing that still asks:** the Secure Max confirmation (once).

**Still on screen, not consent or warnings (owner to confirm they may stay):**

| What | Why it is there |
| --- | --- |
| "Answers come from an AI, not a person. Check important answers." under the message box | possibly required by the EU AI Act Art. 50(1); the lawyer decides (see the legal-read doc) |
| "Searched the web" line under an answer after a search | opens to the exact searched text and the sources (a status line, not a question) |
| Deep research: the plan to review and start, with its cost | a feature step (costs 15 units); it can be made to start at once if wanted |
| "Remember that …" offers to save a memory; "Every day at …" offers a scheduled task | feature offers from the user's own words, nothing is sent until chosen |
| Secure Max recovery-key and reset warnings | prevent losing data that only the user's devices can open |
| Error messages (connection, limits, too large) | say why something did not work |

## Earlier rules (17 November), replaced above

## The first-start notice (built; for the legal read)

Shown once per browser above the message box, with "Privacy" (opens the privacy policy) and "Got it". Never again in that browser (`localStorage` key `cometrow.first-start-notice`; with storage blocked it shows until "Got it" on each visit).

One text everywhere (owner, 18 November), whatever features a build has switched on:

- EN: "CometRow protects your chats with sealed, encrypted processing in the EU. A few features, such as web search and image creation, use trusted partners instead, because they rarely involve personal details. Details are in Privacy."
- DE: "CometRow schützt Ihre Chats mit versiegelter, verschlüsselter Verarbeitung in der EU. Einige Funktionen, etwa die Websuche und die Bilderstellung, nutzen stattdessen vertrauenswürdige Partner, weil dabei selten persönliche Angaben vorkommen. Einzelheiten unter Datenschutz."
- **For the legal read, new point:** the text names web search and image creation as examples even in a build where one of them is switched off (image creation is off by default and has no provider yet). Is an example of a feature the user cannot use acceptable ("such as" / "etwa"), or must the text follow the switches?
- Earlier version (17 November): the example was "image creation" only when that switch was on, otherwise "web search".
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
| Feature instructions | `attachmentsNote` (supported files and limits), `canvas.askNote`, `projects.instructionsIntro` | shorten in a later pass (`docs/ui-text-shortening-proposal.md`) |
| Per-answer lines | `keptNote` (placeholders were used and put back), `images.attachedNote`, `images.thinkingNote` | keep `keptNote` as a positive fact; the picture lines can move to Help |
| Sync and recovery-key warnings | `sync.keyWarning`, `promptWarning`, `modes.maxResetWarning` | keep: they prevent data loss in Secure Max |
| Footer | `footerNote` "No advertising. No training on your data." | keep, true |

Possible in-context legal duties to ask the lawyer about: the AI disclosure line (AI Act Art. 50(1)); labelling of generated images (AI Act Art. 50(2) and (4), see `docs/image-creation-20261117.md`); whether the microphone and camera need a short in-context line beyond the browser's own permission prompt (we think the browser prompt plus the privacy page suffice).
