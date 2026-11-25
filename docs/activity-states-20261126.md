# Loading and progress states: one "activity" component (26 November 2026)

**Status:** built on the branch `feat/activity-states` (on top of `feat/answer-design`). Behind a switch, off by default. Nothing deployed.

**Your request (26 November):** loading and progress like ChatGPT and Claude, from one shared component: a live "Thinking…" line that collapses to "Thought for N s", steps in the same line, an image placeholder with a soft shimmer, skeleton rows for the chat list. Calm, light and dark, "reduce motion" respected, no layout jumps.

## Your question: reasoning text or steps?

**Privatemode returns the model's reasoning text.** I asked the live model one made-up question in each mode on 26 November (`evaluation/answer-design/reasoning-probe.mts`, cost under one cent): both Fast and Thinking stream the reasoning beside the answer.

So "Thought for N s" opens to **the model's own reasoning** whenever it was sent. When an answer comes without it (a very short one, or another provider later), the same line opens to **the steps** instead: "Thinking", "Searching the web", "Read 3 sources", "Writing".

## What is new on the screen

| Where | Before | Now |
| --- | --- | --- |
| Waiting for an answer | Three moving dots in the chat, and a grey bar at the top with technical words ("Preparing encrypted transport…") | One line where the answer will be: a softly pulsing dot in the brand gradient (cyan to violet) and "Thinking…". The technical statuses are all "Thinking…" |
| The answer starts | The dots vanish | The line becomes "Thought for 6 s". A click opens the reasoning (or the steps). Nothing moves: the line keeps its height |
| A web search before the answer | "Searching the web…" in the top bar | The same line says "Searching the web…"; afterwards "Searching the web" and "Read N sources" are steps of that answer |
| Reading a file, calculating on the device, the backup model | The top bar | The same line |
| Deep research | Its own progress text | The same line with the same dot inside the research card |
| Creating an image | The sentence "Creating the image…" | A placeholder in the image's shape with a soft shimmer; the image fades in |
| The chat list while saved chats open | The sentence "Loading your chats…" | Skeleton rows in the shape of the list |

## Decisions taken

1. **The reasoning is shown, not kept.** It stays while the chat is open. It is not saved with the chat, not synced, not sent back to the model, and not part of Copy, Share or the PDF. After a reload an older answer has no "Thought" line. Keeping it would grow every saved chat and change its format; say if you want it.
2. **The reasoning is shown as the model wrote it**, as plain text, at most about 20,000 characters, in a box that scrolls. It can be in English even when the answer is German.
3. **Technical statuses are no longer shown to the user** while the switch is on ("Verifying the protected destination…" and the like). The protection line under the chat title is unchanged.
4. **Motion:** one pulsing dot, one slow shimmer. No bouncing, no spinning. Under "reduce motion" nothing moves at all.
5. **The image placeholder is square.** Created images are square today; an edit keeps its own shape and is not covered here.

## Switch

Render environment variable `VITE_ACTIVITY` = `1`, then redeploy. With it off everything is as before.

## Tests

- `tests/activity-ui.test.ts` (4): a real browser at 375 and 1,280 pixels, English and German, light and dark, one of them with "reduce motion": the live line instead of dots and bar; the gradient dot and that it stops under "reduce motion"; "Thought for N s" with the reasoning; the steps when there is none; search steps; the answer not moving when it arrives; the image placeholder (square) and the fade-in; the chat list's skeleton rows.
