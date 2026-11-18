# Unfinished and unbuilt: one list (18 November 2026)

For the owner, before the final test pass of the UI work. Read-only survey of the docs, the switches in the code and `git log` up to `7598d7b`. Nothing was built, run or changed for this list.

## Summary

- 136 rows in 12 areas. Done 3, Done (off) 1, Partly 28, Partly (off) 20, Not started 18, Waiting for owner 66. Every open T-id in the test list is cited at least once.
- Plain "Done" is rare because nothing has been checked on a real phone, in Safari or on the hosted app (LRF section 6). The UI redesign is built and tested in Chromium only.
- Eight features are built and off by build switch (canvas, memory, projects, read aloud, PDF export, voice conversation, whiteboard, Scheduled); server switches add image creation, picture questions, Secure, sync, metering, research, code, voice, background tasks and purge. All are off.
- Most "Not started" rows are deliberate "later" items; the new gaps are image creation's hosted config, pinch-zoom, the style-file split, source cards and the "allowance used up" signal.
- Most "Waiting for owner" rows are legal reads, account steps (keys, billing, deploy) and device tests (T-xx).
- Known limits marked `shortcut:` in the code are grouped into rows by area (file and line given).

**Top 5 open items** (chosen by: blocks the final UI test pass or the first invitee):

1. Real-device pass of the new UI on iPhone Safari, Android and a tablet (T-148, T-149, T-158 to T-161, T-45 to T-52).
2. A fresh CI run and screen tour on the current head: the last written tour result is from `7468eee`, before notices, image creation and whiteboard.
3. The deploy chain: database steps, deploy and the manifest approval (T-143, T-29 to T-31, T-120).
4. The legal read of the first-start notice, the partner table (German not written, not in the app) and the 16 Nov texts (T-155, T-05 to T-10).
5. Keys and spend numbers before invites: Brave key, separate alpha key, app ceiling and daily cap (T-04, T-03, T-60, T-61).

**How the status is set.** Done: the docs say built and tested, and real devices or a live call do not matter for it. Partly: built, but something is still unverified (most often a real phone, Safari or the hosted app: `docs/launch-readiness-final.md` section 6 says none of these were ever checked). "(off)": behind a switch that is off by default, counted with Done or Partly. Waiting for owner: an owner test, decision or account step blocks it. Not started: nothing built. Where sources disagree, the newest dated one wins; the conflicts are listed at the end.

Short names: "log" = `docs/ui-redesign-log.md`; "plan" = `docs/ui-redesign-plan-20261116.md`; "decisions" = `docs/owner-decisions.md`; "LRF" = `docs/launch-readiness-final.md`; T-xx = `docs/owner-test-list.md`.

## Chat & UI

| Item | Status | What is missing | Where it is written |
| --- | --- | --- | --- |
| Design system: colours, one font, workspace wash, sign-in glow (step 1) | Partly | Checked in Chromium only. Real phones and Safari not checked. | log, "step 1"; LRF section 6; T-148 |
| Start screen and one-line message box (step 2) | Partly | Real phone keyboards not checked. The "Auto" control is still wider than its text. | log, "step 2" and "message box on one line"; T-82, T-84 |
| Signal when the allowance is used up | Not started | The browser gets no signal, so live voice stays shown until the server refuses. | log, "message box on one line", "Not done" |
| Left menu (comet logo, quiet rows, search, tabs) | Partly | The "Secure Max" row and "Saved to your account" line keep their old look. Chromium only. | log, "left menu" |
| Answers: bubble, headings, code blocks, tables | Partly | Chromium only. Syntax colours in code are not built (later). | log, "answers, phone, sign-in, Settings"; LRF CC-23 |
| Code blocks keep "Copied", focus and selection across re-renders | Done | - | log, "whiteboard" table, "Chat recovery"; commit e663eb9 |
| Phone layout: "+" panel, 44 px rows, tap feedback, box clear of the home bar | Partly | Tap feedback and home-bar spacing are only "built", no test named. No real iPhone or Android. | log, "answers, phone, sign-in, Settings"; T-148 |
| Sign-in and Settings restyle | Partly | Chromium only; real devices not checked. | log, "answers, phone, sign-in, Settings"; T-148, T-149 |
| Upload screens (photo to text, ask about a picture) | Partly | "Ask about a picture" dialog checked by screenshots only. | log, "upload screens" |
| Calm error notes, one dialog style, Secure Max under Incognito | Partly | Chromium only. | log, "errors, dialogs, Secure Max in the menu" |
| Smooth theme change and gentle rise-in of new messages | Partly | Only "built"; no test named for either. | log, "leftovers" and "answers, phone, sign-in, Settings" |
| Protected-connection lock chip | Partly | Passed CI after a fix; real devices not checked. | log, "leftovers" and "final pass" |
| Logo kit, favicons, PWA icons, social image | Partly | Served and linked; not seen on a real home screen or in a share preview. | log, "logo, favicons, icons" |
| One first-start notice; per-feature popups removed | Partly | Built and tested in EN and DE. Waits for the legal read (see Legal & texts). | log, "one notice"; `docs/notices-inventory-20261117.md` |
| Split the style file into one file per area | Not started | Plan step 5 asks for `src/styles/*.css`; the folder does not exist. | plan, section 5 |
| Screenshot of every finished UI piece for the owner | Partly | The log records the request, not which screenshots were sent. | log, "Next" item 5 |
| Open UI decisions: bundled font, matching the website's colours | Waiting for owner | Palette and greeting are decided and built; these two are not. | plan, section 6, items 2 and 6 |
| Keyboard shortcuts | Partly | Wired and tested; a browser may keep a key for itself. | LRF K-1; T-147 |
| Phone, tablet, offline and message checks on real devices | Waiting for owner | Owner device tests not done. | T-82 to T-88, T-148 to T-150 |
| Later items: per-message "< 2/2 >", branch limit, mode descriptions, "Report a problem" in the chat, chat search excerpts, finer date groups, account-wide instructions, global memory switch | Not started | Marked "later, after launch". | LRF CC-09, CC-11, CC-17, CC-22, CC-27, CC-31, SS-18; decisions 16 Nov item 24 |
| Lazy-loaded parts after a failed load | Partly | A part that imports a failed part fails until a reload; Safari names no file. | `src/LoadBoundary.tsx:67`; LRF section 6 |
| Canvas (`VITE_CANVAS`) | Partly (off) | Never run against Privatemode; no phone. Decision on canvas for the alpha. | `docs/canvas-20261114.md`, "Not verified"; T-98 to T-101 |
| Memory (`VITE_MEMORY`) | Partly (off) | Live probe passed 14 Nov. Device tests and the alpha decision open. | READINESS, 14 Nov afternoon; T-89 to T-93 |
| Projects (`VITE_PROJECTS`) | Partly (off) | Nothing verified live. Device tests and decision open. | `docs/projects-20261114.md`, "NOT verified"; T-107 to T-110 |
| Read aloud and PDF export (`VITE_READ_ALOUD`, `VITE_PDF_EXPORT`) | Partly (off) | No real voices, devices or print dialog. Render build switches not verified. | `docs/read-aloud-and-pdf-export-20261114.md`, section 6; T-43, T-58, T-59, T-70 to T-72 |
| German interface (`VITE_GERMAN_UI`) | Partly (off) | Built; stays off until the German legal read. | T-10, T-64, T-65 |
| Code execution (`inference.code`) | Partly (off) | Live: Fast 30 of 30, Thinking 16 of 16. No device check; Pyodide caching decision open. | `docs/code-execution-20261114.md`; decisions 14 Nov item 3 |
| Ask about a picture (`inference.images`) | Partly (off) | One tiny synthetic picture answered live on 14 Nov; no real photo or phone. Daily pictures and cost to decide. | `docs/images-20261114.md`; READINESS, 14 Nov; decisions 14 Nov item 4 |
| Real files: 100-page PDF, Excel, Word, scans | Waiting for owner | Owner tests. Scans stored as JBIG2 or JPEG 2000 end in "no readable text". | T-53 to T-56, T-75; `src/extraction.worker.ts:145` |
| Known limits in file reading and copying | Partly | Excel dates stay serial numbers; unusual workbook layouts are refused; a long pasted question uses its first 48 words; "copy last code block" finds only top-level fences; an old OCR data copy stays in the browser after a data change. | `src/xlsx.ts:72`, `src/xlsx.ts:169`, `src/passage-retrieval.ts:101`, `src/shortcut-copy.ts:13`, `src/extraction.worker.ts:36` |
| "Summarise the whole document" button | Waiting for owner | Default: not now (about 18 requests per long document). | T-73 |
| Scheduled, Manual (`VITE_SCHEDULED`) | Partly (off) | Nothing live; no phone; calendar files not imported into real calendars. | `docs/scheduled-20261115.md`, section 7; T-115 to T-117, T-127, T-128 |
| Background tasks, Auto (`inference.backgroundTasks`) | Partly (off) | No live call. Consent texts need the legal read; a DPIA before invitees. | READINESS, 15 Nov; T-111 to T-114, T-118, T-119; decisions 15 Nov items 5 and 12 |
| Alerts when a scheduled task is due | Not started | Owner: Web Push later, no email. | LRF FE-17 |

## Whiteboard

| Item | Status | What is missing | Where it is written |
| --- | --- | --- | --- |
| Whiteboard next to the chat and "In this chat" panel (`VITE_WHITEBOARD`) | Partly (off) | Chromium only. Safari and iPhone not tested. No live model call through the app. | `docs/whiteboard-20261117.md`, "Not verified / later"; log, "Next" item 1 |
| Real-device checks | Waiting for owner | Finger drawing and undo, sending the board, the Chat \| Whiteboard switch, Safari on a Mac. | T-158 to T-161 |
| Pinch-zoom and pan | Not started | On a phone, board text is about 8 px; a tall panel has empty space. | plan, "Build later"; `docs/whiteboard-20261117.md` |
| Real handwriting check | Waiting for owner | The study used computer fonts; about 10 hand-drawn boards are needed. | `docs/whiteboard-study-20261117.md`, open decision 7 |
| Study decisions: picture size, format, typed text, allowance, boards per chat, pens and eraser | Waiting for owner | Built with the study's defaults (JPEG, typed words sent, 2 units, one board per chat); not confirmed. | `docs/whiteboard-study-20261117.md`, open decisions 1 to 6; log, "Next" item 4 |
| Board edited on two devices at once | Not started | The later sync wins whole; no merge. | `docs/whiteboard-20261117.md`, "Not verified / later" |

## Image creation

| Item | Status | What is missing | Where it is written |
| --- | --- | --- | --- |
| Create image, provider mocked (`PRIVATEAI_IMAGE_CREATION`) | Partly (off) | No provider account, key or live call. One early "could not be created" was not reproduced. | `docs/image-creation-20261117.md`; log, "image creation" |
| Provider choice and contract (DPA, no training, retention, EU) | Waiting for owner | Recommendation: Microsoft Foundry FLUX.2 [pro] EU or Google Vertex Imagen 4 Fast. | `docs/image-creation-20261117.md`, "Provider choice" and owner steps 1 to 2 |
| API key and a small test spend (up to EUR 2) | Waiting for owner | Needed before any live call. | `docs/image-creation-20261117.md`, owner steps 3 to 4 |
| Switch in the hosted deployment config | Not started | Wired only in the development server; `server/deployment-config.ts` has no image-creation entry. | `server/index.ts:76-87`; `server/deployment-config.ts` |
| Second provider adapter | Not started | Only Black Forest Labs and mock exist; about half a day each. | `docs/image-creation-20261117.md`, "Effort" |
| Daily limits per plan (free 3, Plus 10, Pro 30) | Not started | One number for now (`IMAGE_DAILY`, default 3); needs plans at the route. | `docs/image-creation-20261117.md`, "Allowance" |
| Images as encrypted blobs (lift the per-chat budget) | Waiting for owner | A chat holds about 4 to 10 images under the 4 MiB sync limit. | log, "Next" item 3; `src/CreateImage.tsx:16` |
| AI Act labelling, acceptable-use line, privacy page entry | Waiting for owner | Lawyer's question on Art. 50(2); texts to approve. | `docs/image-creation-20261117.md`, "Safety and the law" and owner step 5 |
| Polish the card and the "suitable answer" rule | Not started | After real use. | `docs/image-creation-20261117.md`, "Effort" |

## Voice

| Item | Status | What is missing | Where it is written |
| --- | --- | --- | --- |
| Voice conversation: sent at once, 1 s silence, read while written, talk-over (`VITE_LIVE_VOICE`) | Partly (off) | No full turn with a real microphone; delay of about 2.5 s is an estimate. Talk-over not tried in real rooms. | `docs/voice-conversation-20261117.md` |
| Live voice colour ball | Partly (off) | No real microphone turn; smoothness on a slow phone not checked. | log, "live voice ball" |
| Voice conversation device tests and the alpha decision | Waiting for owner | Owner tests not done. | T-102 to T-106 |
| Dictation (`inference.voice`) | Partly (off) | Transcription checked live with synthetic samples only; real microphones and phones open. | `docs/voice-to-text-20261114.md`, "Checked live"; T-57, T-121 to T-123 |
| Voice limits and microphone permission header | Waiting for owner | Recording length, daily budget, permission for everyone or only with voice on. | T-68, T-69; decisions 15 Nov item 10 |
| Ask Privatemode about audio | Waiting for owner | Only needed if voice goes on. | T-27; decisions 15 Nov item 15 |
| Shorter live-voice texts (`what`, `cost`) | Waiting for owner | Proposals written; nothing changed. | `docs/ui-text-shortening-proposal.md`, "Live voice" |
| No voice-conversation button on Android | Waiting for owner | Built; agent default "accept for the alpha". | decisions 16 Nov item 23 |

## Charts & answers

| Item | Status | What is missing | Where it is written |
| --- | --- | --- | --- |
| Chart rule (58 tokens) and line and bar charts | Partly | Live: 10 of 10 without, 8 of 10 with a chart. Not tested: Thinking mode, long chats, answers with web sources. | `docs/charts-20261117.md` |
| Pie charts, several series, negative values | Not started | Left out on purpose; add if real use asks. | `docs/charts-20261117.md`, "Not built" |
| Image cards from web search | Not started | Design and cost note only. | `docs/charts-20261117.md`, "Second phase" |
| Decisions for image cards and web thumbnails | Waiting for owner | Brave named for images, count against the search allowance, legal read on thumbnails; web pictures and video thumbnails through the server. | `docs/charts-20261117.md`, "Open points"; plan, section 4 and section 6 item 4 |
| Source cards for web search | Not started | Citations show as small chips. A `.source-card` style exists but no component uses it. | plan, section 4; log, "answers"; `src/chat-design.css:311` |

## Search & research

| Item | Status | What is missing | Where it is written |
| --- | --- | --- | --- |
| Brave production key | Waiting for owner | Owner step. | T-04 |
| Deep research (`inference.research`) | Partly (off) | Live run of 3 questions on 14 Nov; the in-chat version (16 Nov) only offline. | READINESS, 14 and 16 Nov; T-94 to T-97 |
| Web search on the hosted app | Waiting for owner | Live checks after deploy. | T-32 |
| Brave Goggle for German rules (`PRIVATEAI_SEARCH_GOGGLES`) | Done (off) | Tested live on 20 questions; off. | `docs/german-rules-20261113.md` |
| Brave gets 10 results on rules searches: say so in the privacy text? | Waiting for owner | Decision. | T-79 |
| Brave DPA | Waiting for owner | "To check". | `docs/privacy-partners-draft-20261117.md`, "For the lawyer" item 2 |
| Known limits in German-rules detection | Partly | "Write me what my notice period is" is missed; "auf Deutsch" counts as naming Germany; some prose is flagged; rule figures in money calculations are missed. | `src/german-rules.ts:197`, `:254`, `:281`, `:324` |

## Accounts & sign-in

| Item | Status | What is missing | Where it is written |
| --- | --- | --- | --- |
| Google sign-in status, test account, Google-only for the alpha | Waiting for owner | Owner steps and decision. | T-16, T-62 |
| Passkeys | Waiting for owner | Adding and signing in hidden in production by the 20 Oct decision. | LRF SS-06; T-126, T-156 |
| Closing an account in production | Waiting for owner | Needs an e-mail code and e-mail sending is off. | decisions 16 Nov item 2; T-153 |
| Automatic deletion of closed accounts (`inference.accountPurge`) | Partly (off) | Grace days and switch-on date; needs the privilege SQL. | LRF section 4; T-143, T-154 |
| Sign-in e-mail template | Partly | Styled and tested; never sent (sending is off). | log, "logo, favicons, icons" |
| Self-service Secure Max reset (7-day delay) | Not started | Support erases on request until then. | decisions 16 Nov item 1 |
| Consent record on the device or also on the server | Waiting for owner | Decision. | T-63; decisions D3 |
| Support mailbox shown in Help | Waiting for owner | Show it only if the mailbox is watched. | decisions 16 Nov item 9; T-17 |

## Sync & vault

| Item | Status | What is missing | Where it is written |
| --- | --- | --- | --- |
| Secure mode, server-held key (`inference.secureStore`) | Partly (off) | Tested with two browser contexts; never on real devices or hosted. | LRF section 4; T-144, T-152 |
| Master key `PRIVATEAI_CUSTODY_KEY` | Waiting for owner | Needed before Secure goes on anywhere. | T-142 |
| Secure Max, end-to-end sync (`inference.vaultSync`) | Partly (off) | Never on real browsers, phones or PostgreSQL hosted. | READINESS, 16 Nov "Encrypted sync hardened"; T-133 to T-138, T-145, T-146 |
| Synced project files (`vaultSync.blobs`) and Hetzner | Partly (off) | Owner decisions and bucket. | T-139 to T-141 |
| External cryptography review of sync | Waiting for owner | Costs money; recommended before any invitee turns sync on. | decisions, sync item 1; LRF section 6 |
| Vault checks without sync (new device, remember device, backups) | Waiting for owner | Owner device tests. | T-124, T-125, T-129 to T-132 |
| QR pairing, signed deletes, key rotation on device removal | Not started | Accepted for the alpha; on the review list. | decisions, sync items 5 to 7 |
| 30-day trash for chats deleted on another device | Not started | "Not now". | decisions, sync item 18 |

## Billing & usage

| Item | Status | What is missing | Where it is written |
| --- | --- | --- | --- |
| Privatemode paid billing | Partly | On as an individual (owner-reported). Switch to business with the VAT ID after registration. | T-01; LRF section 7 |
| Spend cap at Privatemode (EUR 50 a month) | Done | Set (owner-reported). | T-02 |
| Raise the cap before 10 invitees; alert value | Waiting for owner | EUR 50 is below the worst case of about EUR 180 for 10 invitees. | decisions 16 Nov item 25 |
| Separate alpha key with expiry | Waiting for owner | Whether the reported key is separate, and its expiry. | T-03 |
| App spend ceiling and daily cap | Waiting for owner | Numbers. | T-60, T-61; decisions D5 |
| Usage metering (`inference.metering`) | Partly (off) | Not verified live; byte-per-token estimates not calibrated; plan values are proposals. | `docs/usage-metering-20261115.md`; `server/usage-records.ts:82`; decisions 15 Nov item 13 |
| Price list and key limits in the signed report | Waiting for owner | Confirm figures; add the two values when signing. | decisions 16 Nov items 26 and 29 |
| Cost of a file question; free or paid at launch; launch capacity | Waiting for owner | Decisions. | T-74, T-76, T-77 |
| Prompt cache always reports 0 cached tokens | Waiting for owner | Question to Privatemode. | decisions 14 Nov item 14 |
| Free token balance reading | Waiting for owner | Read it in the portal. | T-24 |
| Charging customers (payments) | Waiting for owner | Ten gaps before a consumer may pay (VAT prices, invoices, withdrawal consent, cancellation, refunds...); each waits on an owner or legal decision. | `docs/billing-items-20261023.md`; READINESS, 23 Oct; T-76 |

## Deployment & ops

| Item | Status | What is missing | Where it is written |
| --- | --- | --- | --- |
| Deploy the new code (chat off), database step, chat on for owner only | Waiting for owner | Render still runs the October build with chat off. | T-29 to T-31; T-list header |
| Database migrations 0023 to 0025 and privilege SQL | Waiting for owner | Before the next deploy. | T-143 |
| Approve Privatemode's new manifest; then `inference.liveManifest` | Waiting for owner | Owner rule: only after checking. | T-120; decisions 15 Nov item 1 |
| Build switches on Render | Waiting for owner | Not verified that Render passes them into the build. | T-43 |
| Rotate the exposed database password | Waiting for owner | Owner step. | T-14 |
| Backups, downtime alert, hosted restore | Waiting for owner | Owner steps. | T-19, T-20, T-42 |
| Safe Browsing warning | Waiting for owner | Before invites. | T-15 |
| Hosted live checks, rollback, headers | Waiting for owner | After deploy. | T-32 to T-38 |
| Hosted 404 and 500 pages | Waiting for owner | Tested at server level, never seen in a browser. | LRF SS-10; T-151 |
| Invitees, support mailbox, pause rule; first two friends | Waiting for owner | Owner steps. | T-17, T-39 |
| Development tools inside the Render image | Not started | Prune dev dependencies in a final build stage. | `docs/dependency-exceptions.md`, "Separate finding" |
| Limits kept in one server's memory | Partly | Image and research counts, voice units (when there is no ledger), retry and follow-up credits, the attestation queue and sync rate limits are lost on restart and not shared across instances. | `server/image-admission.ts:48`, `server/research-admission.ts:58`, `server/providers/privatemode-voice.ts:37`, `server/app.ts:535`, `server/continuation-credit.ts:9`, `server/providers/privatemode-attest-queue.ts:7`, `server/vault-sync.ts:506` |
| Other known server limits | Partly | Model-list watch knows only two changing keys until a live record; a synced file is read whole into memory; a failed transaction can leave an unreferenced object in the bucket; the secret scan knows only this project's key shapes. | `server/model-watch.ts:23`, `server/vault-sync.ts:480`, `server/vault-sync-postgres.ts:339`, `scripts/secret-scan.mjs:4` |
| Attestation-limit answer from Privatemode | Waiting for owner | Still open in the test list. | T-23 |
| Alpha routines: calendar reminders, daily and weekly checks, during the alpha | Waiting for owner | Start with the first invitee. | T-21, T-40, T-41, T-44 |
| Optional add-ons; two items from the owner's concerns log | Waiting for owner | Old Render disk, test organisation, status page; describe or drop B13 and F2. | T-80, T-81 |
| Old agent worktrees | Done | Removed; branches and archive tags kept. | log, "Next" item 2 |

## Legal & texts

| Item | Status | What is missing | Where it is written |
| --- | --- | --- | --- |
| Privacy wording, policy fixes, health consent, AUP, 18+, terms draft, DPIA, record of processing, breach plan | Waiting for owner | Approvals. | T-05 to T-09 |
| German texts read by a native speaker or lawyer | Waiting for owner | German is binding. | T-10 |
| Legal read of the 16 Nov texts (Secure, deletion, footer, contact, background consent) | Waiting for owner | Lawyer. | T-155; `docs/secure-copy-draft-20261116.md` |
| First-start notice: enough under GDPR Art. 13? Explain "sealed"? | Waiting for owner | Legal read. | `docs/notices-inventory-20261117.md` |
| Privacy page section "which feature uses which partner" | Not started | Draft in English only; German not written; not in the app. | `docs/privacy-partners-draft-20261117.md` |
| AI disclosure line under the message box (AI Act Art. 50(1)) | Waiting for owner | Ask the lawyer; stays until then. | `docs/notices-inventory-20261117.md`, "Kept" |
| Health consent still says "Settings, Privacy & data" | Waiting for owner | Change to "Data controls" with a version bump, after the legal read. | decisions 16 Nov item 20; LRF section 6 |
| Shorter texts on upload and voice screens | Waiting for owner | Approve per row; "Required" rows wait for the legal read. | `docs/ui-text-shortening-proposal.md` |
| Terms of use page | Waiting for owner | None exists; add before launch. | T-157; decisions 16 Nov item 10 |
| Feature privacy drafts (voice, images, memory, research, projects, sync, metering, background tasks) | Waiting for owner | Approve after the legal read; then a new policy date. | decisions 15 Nov items 3 to 7; T-66 |
| Masking limits sentence; inactivity rule | Waiting for owner | Decisions. | T-67, T-78 |
| Capacity sentence wording | Waiting for owner | Approve. | decisions 16 Nov item 27 |
| Report checks, size numbers, safety case 07, qualification report | Waiting for owner | Accept in writing, confirm, grade, sign. | T-11, T-12, T-13, T-22 |
| File the Privatemode DPA | Waiting for owner | Owner step. | T-18 |
| German legal texts: identity values without a German entry stay English | Partly | The pair check flags it; add the German entry then. | `shared/legal-identity.ts:57` |
| Website and imprint leftovers | Waiting for owner | Owner step. | T-28 |

## Tests & CI

| Item | Status | What is missing | Where it is written |
| --- | --- | --- | --- |
| CI audit: picomatch advisory allowed by exact ID | Partly | Review due 24 November, then weekly; remove when fixed upstream. | `docs/dependency-exceptions.md` |
| CI on the latest commits | Partly | Last written result: 17 Nov evening, green except one "Code copied" timing and the audit (both fixed after). No result written for the later commits. | log, "Next" item 1 |
| Screen tour with every feature on and off | Partly | Last written result (564 and 378 screenshots, 0 failed) is from `7468eee`, before notices, image creation and whiteboard. | log, "final pass" |
| Local timeouts in `context-review` and `source-history-ui` | Partly | 25 s limit too short on this machine; they pass in CI. | log, "final pass" and "left menu" |
| Browser coverage | Partly | New UI tests run in Chromium only; Firefox and WebKit only via the 16 Nov harness on 17 screens. | LRF section 5 |
| Owner browser and device checks (Windows browsers, Safari, iPhone, Android, mobile data, keyboard, screen reader) | Waiting for owner | Owner tests. | T-45 to T-52 |
| Owner answer sample and arithmetic batches | Waiting for owner | Score and paste. | T-25, T-26 |

## Where the sources disagree

- The plan's status line says step 2 is next and the voice orb is "not yet in the app"; the log shows both built on 17 November. The log wins.
- The log's early row "chart instruction not added" is overtaken by its later charts section (rule added, limit raised to 3,700 characters).
- READINESS (16 Nov, agent B6) says keyboard shortcuts are "not wired into App.tsx yet"; `src/App.tsx:1181` calls `useShortcuts`, and LRF marks K-1 done.
- T-102 to T-106 still describe "Live voice" with a 3 s review; `docs/voice-conversation-20261117.md` renamed it and removed the countdown.
- Voice limits: T-68 says 120 s per recording and 10 minutes a day; decisions 15 Nov item 10 and `server/index.ts:73` say 30 s chunks, 3-minute turns, 150 units; T-106 recommends 30 s recordings, 20 a day.
- The whiteboard study's decisions 1 to 6 are still listed as waiting (log "Next" item 4), but the build already uses the study's defaults.
- Image generation was "later, not in this phase" on 13 November (decisions, owner update of 13 November); the owner asked for it on 17 November and it was built behind a switch.
- `docs/whiteboard-20261117.md` says the server never sees the board in the clear; in Secure mode (the default) CometRow holds the key (`docs/privacy-partners-draft-20261117.md`). Question for the owner: should the whiteboard sentence say "in Secure Max" only?
- T-23 (attestation-limit answer) is still open, but commit `42de90d` records Privatemode's answer of 16 November (owner-reported): no attestation limit, only token and request limits.
- T-01 is ticked but still has an open part (business billing); T-03 stays open although billing is reported done.
