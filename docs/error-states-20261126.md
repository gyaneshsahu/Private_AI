# Error states (26 November 2026)

**Status:** built on the branch `feat/error-states` (on top of `feat/activity-states`). Behind a switch, off by default. Nothing deployed.

**Your request (26 November):** when an answer fails or stops, one short, friendly line with a soft red accent where the answer would be, with Retry. Plain words, no codes. Keep the partial answer and the message and say what was lost. Offline says so. The same for a failed image. A failed search does not fail the answer. The usage limit stays calm.

## What the user sees

| What happened | The line (where the answer would be) | Retry |
| --- | --- | --- |
| Server error, provider down, anything unexpected | **Something went wrong. Your message is safe.** No part of the answer arrived. | Yes |
| Timeout | **This took too long. Your message is safe.** | Yes |
| The service is busy | **CometRow is busy right now. Your message is safe.** | Yes |
| The answer broke off | The part that arrived stays; under it: **Something went wrong. Your message is safe.** The part that arrived is kept above. The rest was lost. | Yes |
| No connection | **You're offline. Your message is safe.** Retry works once you are back online. | Waits; works when the connection is back |
| You pressed Stop | **Stopped by you.** The same line **without red**; the part that arrived stays. | Yes |
| An image could not be made | In the Create image window, where the image would be: **The image could not be made. Your description is kept.** | Yes |

- The red is an accent: a thin coloured edge and a faint tint, in the theme's own danger colour, in light and dark.
- No codes, no "HTTP", no technical words. The test checks the line for digits and the word "error".
- **One line only.** With the switch on, the second, technical notice above the message box ("Partial replies are excluded from future context…") is no longer shown, and the folded "What happened?" explanation is gone.

## What stays as it is

- **The usage limit** keeps its own calm line ("Limit reached. It resets at …"); it is not an error and not red.
- **A refused image** (a real person, the provider declining) and **the daily image limit** keep their own sentences: they are answers, not failures.
- **A failed web search does not fail the answer.** That was already so: the answer is written without search results (tests `tests/browser/workspace.spec.ts` and the fix branch's search tests cover it). Nothing was changed here.
- **A part that arrived is still not sent back to the model** as context in later messages, as before. The line no longer explains that; say if you want it mentioned.

## Decisions taken

1. **"Stopped by you" is calm, not red.** You stopped it; nothing went wrong.
2. **Retry is the same Retry as under an answer** (same mode, same cost). It is offered on the newest message only, as before.
3. **Offline is read from the browser.** A device that is "online" but has no working internet gets the general line; Retry is available.

## Switch

Render environment variable `VITE_ERROR_STATES` = `1`, then redeploy. With it off everything is as before.

## Tests

- `tests/error-states-ui.test.ts` (4): a real browser at 375 and 1,280 pixels, English and German, light and dark: a failed answer (one line, plain words, the question kept, no second notice); offline and back; Retry answering; a cut-off answer with its part kept; a stopped answer, calm; the limit without a red line; a failed image with Retry in the dialog.
