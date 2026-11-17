# UI redesign: running log

One line per check, newest first. "Test" names the Playwright file that keeps the check. Screenshots: `.local/ui-redesign/<step>/`. Plan: `docs/ui-redesign-plan-20261116.md`.

## Next (kept current, so work can resume after a break)

1. Finish step 2: read the result of the wide test run (`.local/ui-redesign/step2-tests.log`), fix any test that still expects the old Send button or texts, commit, push, check CI.
2. Step 3: answer rendering (headings, lists, tables, code blocks, quotes, links, chart card, source cards), with its own cases in `tests/redesign-ui.test.ts` and a section here.
3. Then steps 4 to 7 of the plan (`docs/ui-redesign-plan-20261116.md`, section 5), the same way; at the end one full pass over every feature.

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
| `tests/browser/chat-design.spec.ts` (CI run 43996321415, offline job) | fail, then fixed | I had changed its Send check to "hidden", but the box holds a draft there, so Send is shown and off | check put back to "disabled" |
| `projects-help-ui` at 375 px (CI on the step-1 merge, run 43986832917) | fail, then pass | the project row was 0.2 px shorter than its 44 px "…" after the font change | rows on phones get a 44 px minimum height |

Looked at (screenshots, step-2): start screen EN 1280, "+" menu EN 375, long answer EN 1280. Open points: the "Auto" control is still wider than its text; the comet logo, the sidebar search box and the answer styling are later steps.

## 17 November 2026: step 1, design system and final colours

| Feature | Result | What broke | What was fixed |
| --- | --- | --- | --- |
| Colours, one font, small Copy button, workspace wash, sign-in glow | pass (style tests, 56) | header and the band under the message box covered the wash with a flat colour | both use the same fixed wash |
| CI on the merge (run 43986832917) | fail | `projects-help-ui` at 375 px, see step 2 | fixed in step 2 |
