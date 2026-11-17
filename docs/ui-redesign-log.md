# UI redesign: running log

One line per check, newest first. "Test" names the Playwright file that keeps the check. Screenshots: `.local/ui-redesign/<step>/`. Plan: `docs/ui-redesign-plan-20261116.md`.

## Next (kept current, so work can resume after a break)

State at the end of 17 November: steps 1 and 2 are in the app; CI green on `2596726` (run 43999425325). Nothing is half done.

1. **Done 18 November** (see below). Message box on one line, as agreed on 17 November: "+", "Ask anything", the answer mode (Auto, Fast, Thinking) where ChatGPT has "Think", the microphone, and one round button at the end. That end button is live voice while the box is empty and turns into the arrow (↑, a symbol, never the word "Send") once there is text. If live voice is off or its allowance is used up, the arrow sits there greyed until there is text, and live voice comes back when the allowance does. Long text grows the box upwards with the buttons on the bottom row. The "N messages included · N files" count moves into the "+" menu next to "Review context". Update `tests/redesign-ui.test.ts` and this log.
2. **Left menu** (owner asked for it next after the message box): comet logo, New chat, Search, Projects, Scheduled, Recent list, small account line, as in `evaluation/ui-redesign/mock.html`.
3. Then answers, phone layout, sign-in layout, settings, upload screens, live voice ball, Secure Max and states (plan, section 5), each with its browser test and a section here; at the end one full pass over every feature.

Known flaky test: `tests/chat-recovery.test.ts` line 429 (focus on a code block) failed twice in CI on unrelated changes and passed on a rerun. Look into it if it fails again.

## 18 November 2026: message box on one line

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
