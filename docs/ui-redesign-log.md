# UI redesign: running log

One line per check, newest first. "Test" names the Playwright file that keeps the check. Screenshots: `.local/ui-redesign/<step>/`. Plan: `docs/ui-redesign-plan-20261116.md`.

## Next (kept current, so work can resume after a break)

State, 17 November evening: voice conversation, charts, logo kit and icons, the one first-start notice, the whiteboard study and image creation (behind its switch, off, provider mocked) are done and tested.

1. **Whiteboard next to the chat:** owner's new brief (17 November): "Whiteboard" in the left menu with Incognito and Secure Max, also in "+" and during a chat; chat on the left, board on the right; light and dark. Mock sent for approval (`evaluation/ui-redesign/whiteboard-side-mock.html`; on a phone a Chat | Whiteboard switch). **Wait for the owner's OK before building.**
2. **Waiting for the owner:** image provider choice and contract checklist (`docs/image-creation-20261117.md`); shorter texts (`docs/ui-text-shortening-proposal.md`); first-start notice and privacy partners draft for the legal read (`docs/notices-inventory-20261117.md`, `docs/privacy-partners-draft-20261117.md`); whiteboard decisions (`docs/whiteboard-study-20261117.md`).
3. Owner asked: send a screenshot of every finished UI piece.

## 17 November 2026: image creation (provider mocked)

Details: `docs/image-creation-20261117.md`. Tests: `tests/image-creation.test.ts` (5), `tests/redesign-ui.test.ts` "image creation" (4: 2 cases at 375 and 1,280 px), then the older tests on messages, saved chats and metering. No live call, no key.

| Feature | Result | What broke | What was fixed |
| --- | --- | --- | --- |
| Our refusals (real, named people; minors) before any provider call | pass | - | - |
| Route: only the description sent, image back, daily limit, refusal and capacity give the count back, nothing kept, one ledger record per attempt, no description in the ledger | pass | the test read the ledger wrongly | test fixed |
| Black Forest Labs adapter against a fake API: EU endpoint, key only to the API (not the download host), poll, moderation, 402 | pass | - | - |
| Saved with the chat as base64; picture data URLs still refused | pass | - | - |
| "+" menu, dialog with images left today, refusal sentence, card with Download and Regenerate, answer button | pass (3 of 3 repeats; 1 earlier run showed "could not be created" once on the first request, not reproduced) | the card had no styles; under it the empty "Original sources unavailable" line and the answer's copy/read-aloud/retry row; Download used the share icon | card and dialog styled like the chart card and other dialogs; those rows hidden for created images; a download icon added (one icon per meaning) |

## 17 November 2026: one notice, no per-feature cautions

Details: `docs/notices-inventory-20261117.md`, `docs/privacy-partners-draft-20261117.md`. Tests: 21 older test files rerun, then end-to-end.

| Feature | Result | What broke | What was fixed |
| --- | --- | --- | --- |
| First-start notice, once, "Privacy" and "Got it" (EN, DE); names image creation only when it is on | pass | on a 420 px high phone at 200 % text it covered the chat (`chat-design.spec`) | it scrolls inside itself, at most a third of the screen |
| Removed: dictation note, picture notice, photo intro and camera notes, voice-conversation note, research caution, banner second sentences | pass after test updates | 22 checks in 5 older files expected these popups, plus `photo-to-text.spec` | tests now check they are gone |
| Memory and Canvas texts made true in Secure mode | done | they said "only on this device" | memory: "stored encrypted, with your saved chats"; canvas line removed |
| Protected-connection chip on German phones | pass | "Details zum Datenschutz" was cut | only the status is shown below 1,000 px |

## 17 November 2026: logo, favicons, icons

Source: the owner's official logo kit, `public/logo` (README there), used as-is. Tests: `tests/redesign-ui.test.ts` (logo, one icon per meaning), `tests/browser/redesign-sign-in.spec.ts` (logo on sign-in; brand files served and linked), `tests/email-template.test.ts`, `tests/error-pages.test.ts`. End-to-end 64 of 64.

| Feature | Result | What broke | What was fixed |
| --- | --- | --- | --- |
| Menu and sign-in: the kit's horizontal lockup, dark artwork on light, light artwork on dark | pass | - | - |
| Favicon (ICO and SVG from the kit), apple-touch-icon 180, PWA icons 192 and 512 from the kit | pass (served and linked) | - | - |
| Maskable 512 icon and 1200x630 social image | built by `scripts/brand-assets.mjs` from the kit's SVGs (placed, not changed) | the kit has neither | - |
| Web app manifest with name and theme colours; theme-color for light and dark | pass | - | - |
| 404 and 500 pages: kit logo and the new colours | pass | still purple and the old text logo | updated |
| Sign-in email template with the kit's PNG logo (light and dark) | pass (not sent: sending is off) | first draft said codes last 10 minutes | they last 5 (server/account-auth.ts); text fixed |
| One icon per meaning | pass | "Review context" and "Search the web" shared the magnifier; Deep research and Research shared the globe; Conversation files and Projects the folder; Incognito and Security the shield; Shortcuts and Help the question mark | new icons in the same style: layers, globe, book, compass, files, incognito, sliders, drive, sparkle, keyboard |

## 17 November 2026: charts

Details: `docs/charts-20261117.md`. Tests: `tests/answer-chart.test.ts`, `tests/redesign-ui.test.ts` (chart case), `tests/answer-policy.test.ts`.

| Feature | Result | What broke | What was fixed |
| --- | --- | --- | --- |
| One rule in the AI's instructions | pass | the prompt-size limit (3,400 characters) | raised to 3,700 (the rule is 58 tokens, approved up to about 300) |
| Line and bar charts from the answer's numbers, source line under them | pass | - | - |
| Invalid blocks stay code | pass | - | - |
| The model follows the rule (live, 20 questions, EN and DE) | 10 of 10 without a chart correct; 8 of 10 with a chart drawn | 3 answers were empty at 900 tokens (reasoning used them all) | rerun at 2,500: 2 of 3 then drew a chart; the third never answered |
| Live spend | EUR 0.013 | - | - |

## 17 November 2026: voice conversation

Details and the delay report: `docs/voice-conversation-20261117.md`. Tests: `live-voice` (48), `live-voice-ui` (12), `read-aloud`, `redesign-ui` (107 in all, pass).

| Feature | Result | What broke | What was fixed |
| --- | --- | --- | --- |
| Renamed "Voice conversation" / "Sprachgespräch" | pass | - | - |
| Sent at once (no 3 s countdown); "Always ask before sending" still reviews | pass (2nd run) | the old test waited for the countdown | test: sent at once in turn 1, review checked with the setting in turn 2 |
| End of speech after 1 s of silence | pass | - | - |
| Read sentence by sentence while the answer is written | pass | - | - |
| Talk over the answer to interrupt (on by default; button stays) | pass (unit, synthetic levels) | - | - |
| Best local voice first | pass | - | - |
| Delay measured each turn | pass (3rd run) | the test's fake engine never reported a start; the delay was cleared when the next turn began | fake reports a start like real engines (plus a fallback at the end); the last delay stays until the next turn has its own |
| Live spend | about EUR 0.001 | - | one probe: Whisper 405 ms, Voxtral 252 ms on 3.6 s of synthetic speech |

## 17 November 2026: final pass over every feature together

Run on `7468eee` plus the fix below. Results: `.local/ui-redesign/final-pass/`.

| Check | Result | What broke | What was fixed |
| --- | --- | --- | --- |
| Production build | pass | - | - |
| End-to-end, production build (63 tests) | 63 of 63 pass | - | - |
| Full unit suite (2,468 tests) | 2,283 pass, 2 local timeouts, 183 skipped | `context-review` and `source-history-ui` over their 25 s limit on this machine | none; they pass in CI |
| Screen tour, every feature on | 564 screenshots, 0 failed steps, nothing left the machine | - | - |
| Screen tour, every feature off | 378 screenshots, 0 failed steps | - | - |
| CI on `7468eee` (Linux fonts) | 2 failed, then fixed | the German protected-connection chip wrapped to two lines at 768 px (52 px, limit 40); in `context-review` at very large text, the opened connection details ran past the screen edge | the chip stays one line and shows only the status below 1,000 px; the opened details wrap inside the screen |

## 17 November 2026: leftovers

| Feature | Result | What broke | What was fixed |
| --- | --- | --- | --- |
| "Protected connection available · Privacy details" as a small lock chip; it still opens its details | pass (`chat-core-ui`, 14 of 14) | - | - |
| Colours change smoothly when the theme switches | built | - | - |
| "Usage unavailable · No active plan shown" in the menu | not changed | it is what the test build says without a plan; the hosted app shows the remaining requests | none |

## 17 November 2026: errors, dialogs, Secure Max in the menu

Tests: `tests/redesign-ui.test.ts`, "states and dialogs" and the left-menu order check; older files rerun (31 files, then 9 files with 126 checks). Screenshots: `.local/ui-redesign/step-10`, `step-11`.

| Feature | Result | What broke | What was fixed |
| --- | --- | --- | --- |
| A failed answer is a calm rounded note; "What this means" opens | pass | - | - |
| Every dialog: one rounded panel, dimmed backdrop, fade-in | pass (3rd run) | the open animation also scaled dialogs to 99 %; the phone menu drawer is a dialog, so 44 px buttons measured 43.6 px in 6 older test files | fade only, no size change, and not on the menu drawer |
| Secure Max moved from the bottom of the menu to right under Incognito chat (owner, 17 November) | pass | - | - |
| Secure Max section keeps its 4 px band | pass (2nd run) | my dialog pass had removed the band that `modes-ui` checks | band kept |
| Secure Max dialog: button waits for the tick, Cancel closes | pass | - | - |
| CI on the live-voice commit (7c7909e) | fail, then fixed | my code-block test read the Copy button's size while the block re-rendered | the test waits for a stable size |
| A run of older tests while files were being edited | discarded | some tests read the source files live | rerun on the finished code |

## 17 November 2026: live voice ball

Test: `tests/redesign-ui.test.ts`, "live voice" (375 and 1280 px, plus a motion case). Screenshots: `.local/ui-redesign/step-9`.

| Feature | Result | What broke | What was fixed |
| --- | --- | --- | --- |
| Round colour ball at the top of the live-voice panel | pass | - | - |
| It rests until a turn starts; it swirls while listening, transcribing, answering or speaking | pass | - | - |
| Under reduced motion it stands still | pass | - | - |
| Panel: centred, round buttons, quieter intro text; Escape closes | pass | - | - |
| Shorter live-voice texts | waiting for the owner | - | added to `docs/ui-text-shortening-proposal.md` |

Not checked: a real turn with a microphone (the test sets the phase directly), and how smooth the swirl is on a slow phone.

## 17 November 2026: upload screens

Test: `tests/redesign-ui.test.ts`, "upload screens" (375 and 1280 px), plus the older `image-app-ui`, `health-consent-ui` and photo tests (41 of 41 pass). Screenshots: `.local/ui-redesign/step-8`, `step-8b`.

| Feature | Result | What broke | What was fixed |
| --- | --- | --- | --- |
| Photo to text: camera and photo as two tiles side by side, hints small and grey, Escape closes | pass | - | - |
| Ask about a picture: calm dialog, paragraphs closer together, round buttons | built (screenshots) | the note's paragraphs had large gaps | 10 px between paragraphs |
| Shorter texts on these screens | waiting for the owner | - | proposals per text in `docs/ui-text-shortening-proposal.md`, marked Required, Our caution or Instruction; nothing changed |

## 17 November 2026: answers, phone, sign-in, Settings

Tests: `tests/redesign-ui.test.ts` ("answers", "phone", "settings" cases, 375 and 1280 px) and `tests/browser/redesign-sign-in.spec.ts` (real production build). Screenshots: `.local/ui-redesign/step-4` (answers), `step-5` (phone), `step-6` (sign-in), `step-7` (Settings).

| Feature | Result | What broke | What was fixed |
| --- | --- | --- | --- |
| Your message: soft bubble, no "You" above it (kept for screen readers) | pass | - | - |
| Answers: headings 19 px, quiet list markers, quote with a left line, inline code chip, citations as small chips | pass | - | - |
| Code: thin header, language left, small Copy (26 px) | pass | - | - |
| Tables: lines only, no grid | pass | - | - |
| Charts: a ```chart block with numbers is drawn as bars, the numbers also in a hidden table for screen readers; an invalid block stays code | pass (first run) | - | - |
| Charts: the instruction that asks the AI to write chart blocks | not added | it would take the product prompt over the 3,400-character limit set on 14 November (`tests/answer-policy.test.ts`) | left as an owner decision; the app draws charts as soon as an answer contains one |
| A new message rises in gently; off under reduced motion | built | - | - |
| Phone "+" menu | changed back | I first built a bottom sheet with Camera/Photos/Files tiles; the owner preferred the small panel above "+" (it covers only what it needs) | small panel kept on phones, 44 px rows; test checks it sits above "+", inside the screen, and closes on a tap outside |
| Phone: tap feedback (short press), box clear of the home bar | built | - | - |
| Sign-in: comet mark and name instead of the "P" square, outlined Google button, 46 px fields | pass | the comet sat on an old blue square | old square style removed |
| Sign-in: email code signs in, nothing leaves the machine | pass | - | - |
| Settings: quiet section rows, clear headings, actions as outlined buttons; texts unchanged | pass | - | - |
| Settings: theme changes at once; Escape closes | pass | - | - |
| Older tests (48 files on answers, 51 on settings and memory) | 4 real faults fixed | Settings buttons 34 px on phones (needs 44); the "Memory used" note under an answer 23.99 px on desktop (needs 24) | Settings buttons 44 px on phones; notes under answers 28 px |
| `chat-recovery` focus check, `invite-browser`, `redesign-ui` sidebar case | pass alone | timed out or lost focus only while 48 files ran at once | none (machine load); watch in CI |
| `source-history-ui`, `optional-calculator-ui`, `context-review` | local timeout only | their own 25 to 30 s limits on this machine | none; they pass in CI |

## 17 November 2026: left menu

Test: `tests/redesign-ui.test.ts`, "left menu at 375/1280 px" (3 cases each). Screenshots: `.local/ui-redesign/step-3/`.

| Feature | Result | What broke | What was fixed |
| --- | --- | --- | --- |
| Comet logo instead of the "C" square; one weight for "CometRow" | pass | - | - |
| Quiet rows (New chat, Incognito, Scheduled, projects, chats), current chat marked | pass (2nd run) | the current chat was not marked | the style looked for `aria-current="true"`, the app sets `"page"` |
| Slim search field with the icon inside; it filters the list, "No matching conversations." | pass | - | - |
| Recent / Archived as two small tabs; the duplicate "Recent conversations" heading is for screen readers only | pass | - | - |
| "Group saved chats by project." removed | pass | - | - |
| Projects: "+" creates a project, it opens its screen | pass (2nd run) | the test looked for the name in the closed phone drawer | the test checks the project screen's heading |
| Account line opens its menu with Settings; phone drawer closes | pass | - | - |
| CI on the left menu (run 44030943426) | 3 failed, then fixed | `context-review`, `source-history-ui` and the end-to-end `chat-design` clicked the message count, which moved into the "+" menu | they open "+" first; locally the two pass with a longer limit (their own 25 s limit is too short on this machine) and all 61 end-to-end tests pass |
| Older tests (17 files that touch the sidebar) | 6 failed, then pass | on phones the Projects "+" was 28 px (needs 44); on desktop a row (38 px) was shorter than its "…" (40 px) | Projects "+" 44 px on phones; rows 40 px on desktop, 44 px on phones |

Still old in the menu: the "Secure Max" row and the "Saved to your account" line keep their look; the account line still says "Usage unavailable · No active plan shown" in the test build.

## 17 November 2026: message box on one line

Test: `tests/redesign-ui.test.ts`, case "message box on one line" (375 and 1280 px).

| Feature | Result | What broke | What was fixed |
| --- | --- | --- | --- |
| "+", text, mode, microphone and end button on one row, in that order | pass | - | - |
| End button: live voice while empty; the arrow in its place with text; Stop (round square) in the same place while answering | pass (2nd run) | the arrow measured 3 px off live voice's place | measured mid appear-animation; the test waits for it |
| Long text grows the box upwards, buttons stay on the bottom row | pass | - | - |
| Message count moved into the "+" menu next to Review context | pass (3rd run) | hidden on phones | an old phone rule hid every text span in the box's footer, which now holds the "+" menu; rule removed (it was for the old "Send" label) |
| Closing Review context returns focus | fixed | focus went to the count, which is no longer a button | focus returns to "+" |
| Without live voice (older tests' builds, Android): the arrow sits there, off until there is text | pass after update | 8 older test files expected Send hidden on an empty box (my 17 November edit) | set to "off" (disabled) as agreed with the owner |
| `context-review` | local timeout only | 25 s limit on this machine, as on 17 November | none; passes in CI |

Not done: "allowance used up" has no signal in the browser today, so live voice stays shown until the server refuses; the arrow then stands in only when live voice is switched off.

## 17 November 2026: step 2, chat screen and message box

Test: `tests/redesign-ui.test.ts` (real app with every feature on, fake AI answers, 375 and 1280 px, plus dark theme).

| Feature | Result | What broke | What was fixed |
| --- | --- | --- | --- |
| Start screen: one greeting, three chips, chip fills the box | pass | - | - |
| Message box: microphone when empty, round Send with text | pass (3rd run) | Send measured 40 px instead of 44 on phones; it was caught mid appear-animation | test waits for the animation; phone size raised from 42 to 44 px |
| Sending: answer arrives, start screen goes, box clears | pass (3rd run) | the Enter check timed out on the phone | not a bug: on a touch phone Enter makes a new line by design; Enter is checked on desktop only |
| Answer mode: small text control, choice remembered after reload | pass | - | - |
| "+" menu: icon rows, Escape closes, Photo to text opens its dialog | pass | - | - |
| Sidebar: New chat is a quiet row and starts a fresh chat | pass | - | - |
| Dark theme: dark colours, send and answer work | pass | - | - |
| Existing tests touched by the change (`composer-ui`, `chat-core-ui`, `i18n-app-ui`, `image-app-ui`, `chat-edit-masking-ui`) | pass after update | they expected Send always visible, the old greeting, the old placeholder and the Enter hint | updated to the new behaviour (Send hidden when empty; greeting and placeholder texts; Enter hint hidden) |
| CI on the test fix (run 43997791816) | fail, then pass on the next run (43999425325) | `chat-recovery` focus check, a timing flake seen before | nothing changed; noted under Next |
| `tests/browser/chat-design.spec.ts` (CI run 43996321415, offline job) | fail, then fixed | I had changed its Send check to "hidden", but the box holds a draft there, so Send is shown and off | check put back to "disabled" |
| `projects-help-ui` at 375 px (CI on the step-1 merge, run 43986832917) | fail, then pass | the project row was 0.2 px shorter than its 44 px "…" after the font change | rows on phones get a 44 px minimum height |

Looked at (screenshots, step-2): start screen EN 1280, "+" menu EN 375, long answer EN 1280. Open points: the "Auto" control is still wider than its text; the comet logo, the sidebar search box and the answer styling are later steps.

## 17 November 2026: step 1, design system and final colours

| Feature | Result | What broke | What was fixed |
| --- | --- | --- | --- |
| Colours, one font, small Copy button, workspace wash, sign-in glow | pass (style tests, 56) | header and the band under the message box covered the wash with a flat colour | both use the same fixed wash |
| CI on the merge (run 43986832917) | fail | `projects-help-ui` at 375 px, see step 2 | fixed in step 2 |
