# Answer blocks: notes, steps, diagrams, quick checks, tabs (26 November 2026)

**Status:** built on the branch `feat/answer-blocks` (on top of `feat/error-states`). Behind a switch, off by default. Nothing deployed.

**Your request (26 November):** you approved all five blocks of `docs/answer-design-next-20261126.md`, with one condition: not too many colours, and it must look professional.

## The five blocks

| Block | What the reader sees | When the model may use it |
| --- | --- | --- |
| **Note** | A quiet box with a small label: Key idea, Watch out, Conclusion | Key idea: the one idea of an explanation. Watch out: a risk that must not be missed. Conclusion: the verdict when a judgement was asked for. At most three in an answer |
| **Steps** | Numbered cards on one line down the page, each with a title, one line of text and an optional small tag | Three to seven stages, phases or levels. Not for instructions, which stay a numbered list |
| **Diagram** | Boxes and arrows drawn by the app: a flow (with decisions and loops) or layers (the parts of a system) | A process with a decision or a loop, or a system made of parts |
| **Quick check** | Questions; each answer opens on a tap | Only when the user asks to be tested, quizzed or given exercises |
| **Tabs** | A row of tabs; one case at a time | Several cases of one idea that are best looked at one at a time |

**No pictures from the web**, as proposed. The model is told never to use images.

## How it looks: restraint on purpose

- **One accent colour and the theme's greys.** Structure comes from shape and position, not from colour.
- **Only the three notes have their own tint**, and only as a thin edge, a small label and a faint background: blue for the key idea, amber for "watch out", green for the conclusion.
- Diagrams are outlined boxes with grey arrows; a decision has a dashed, rounded outline; a loop runs along the nearer edge of the drawing.
- Light and dark follow the theme. On a phone a diagram keeps a readable size and scrolls sideways inside its own frame; the page never scrolls sideways.
- For screen readers a diagram is also written out in words ("Goal reached? leads to Adjust the plan (no)").

## How the platform knows when to do what

1. **Rules for the model**, added to its instructions only while the switch is on (`src/answer/rules.ts`, about 1,400 characters, roughly 300 tokens). Each block has its "only when"; the first sentence says: only where it makes the answer easier to understand than text would, never in a short answer, never for decoration.
2. **The app keeps the limits** whatever the model writes: a block must fit its shape and its sizes (2 to 8 steps, at most 14 boxes, and so on); a label a little too long is cut; a block that does not fit is shown as it was written, never as an error.
3. **Measured on the live model before shipping** (below).

## The measurement (26 November, live model, made-up questions)

24 questions in English and German, with the settings the project's documents name for the two modes (Fast: `glm-5.3-flash` with little reasoning; Thinking: `glm-5.3` reasoning at length). I did not read them from the deployed configuration, which only you can see; if yours differ, the measurement should be run again. 8 should get no block; 16 should get a fitting one.

| | Result |
| --- | --- |
| Short or simple questions that should get **no** block (a capital city, a percentage, a thank-you note, a translation, an e-mail, …) | **8 of 8 stayed plain** |
| Questions that should get a fitting block | **14 of 16** |
| All | **22 of 24** (my bar was 9 in 10) |
| Blocks the app could not read | 1 (a tabs block with a slip in it; it is shown as written) |

- The two misses: one tabs block the model wrote with an error, and one explanation ("kinds of computer memory") that got a note but no steps or diagram. Neither is wrong, only plainer than it could be.
- **A first run taught something:** without a reasoning setting, the model spent its whole output allowance thinking and five answers came back empty. With the real setting (Fast reasons little) that did not happen. Worth knowing if the setting is ever changed.
- **What I changed after the first run:** "quiz" only when the user asks to be tested or for exercises (it had added one to a plain explanation), and the app now cuts a label that is a little too long instead of refusing the whole diagram.
- The answers are kept in `evaluation/answer-design/blocks-probe-20261126.json`; `blocks-rescore.mts` scores them again without asking the model.

## What it costs

- **Per message:** about 300 more input tokens. On the Fast model about EUR 0.00006 per message at list price (less when cached, and the rules sit in the part of the instructions that is cached); on Thinking about EUR 0.0005.
- **Answers get a little longer** where a block is used (the block's data is output too).
- **This measurement:** EUR 0.25 for three runs.

## Decisions taken

1. **The rules are part of the instructions only while the switch is on.** With it off the instructions are the same to the character as before (a test checks this), so the earlier measurements and the frozen wording tests stay valid.
2. **Blocks work with the answer design off as well**, and in the PDF export.
3. **While an answer is being written, a block shows the quiet line "Preparing a figure…"** instead of its data arriving letter by letter; when the answer is finished the block is drawn. An answer that was stopped or cut off in the middle of a block shows that block as it was written, never a line that waits forever.
4. **Read aloud** reads a diagram from its words for screen readers, not from the labels in the drawing; the source check of a search answer ignores the data of blocks and charts.
5. **Ticks, opened quiz answers and the chosen tab are not saved**; they last while the chat is open.
6. **The same rules for Fast and Thinking.** Both followed them; a separate, larger rule set for Thinking can come later if you want more from it.
7. **A live try-out** (a slider that changes a result) is not built. It was the possible sixth block of the proposal.

## Switch

Render environment variable `VITE_ANSWER_BLOCKS` = `1`, then redeploy. Best together with `VITE_ANSWER_DESIGN`.

## Tests

- `tests/answer-blocks.test.ts` (5): what counts as each block and what stays code; long labels cut, far too long refused; the layout of a flow and its loop; which labels make a note, English and German; the instructions with the switch on, and unchanged to the character with it off.
- `tests/answer-blocks-ui.test.ts` (5): a real browser at 375 and 1,280 pixels, light and dark, on one answer that uses every block: the three notes, the flow with its seven boxes and arrows and its words for screen readers, the layers, the steps, the tabs by click and by arrow key, the quick check opening, a malformed block left as code, nothing wider than the screen; and with the switch off, no block at all.
- `tests/answer-blocks-stream-ui.test.ts` (2): the real app, phone in English and desktop in German: while the answer arrives, the quiet line and no raw data; at the end the blocks drawn; after Stop no line left waiting.
- The screen tour has the step `answer-blocks` (with the accessibility check).
