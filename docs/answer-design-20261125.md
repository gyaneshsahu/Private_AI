# How answers look: the answer design (25 November 2026)

**Status:** first version built on the branch `feat/answer-design` (on top of `feat/report-card`). Behind a switch, off by default. Nothing deployed. **This is a first pass, not the finished design:** see "Still to do".

**Your request (25 November):** how CometRow shows its answers is where it can win: organised, beautiful, interactive and graphical where it helps, for normal chat, search and deep research. Your example was a Claude answer with a file card, a short summary and bold-led points.

## How I worked

1. **Real answers first.** I asked the live model 12 made-up questions once (a fact, a how-to, a comparison, numbers, a study guide, a decision, code, an email; four in German), through CometRow's own instructions. Cost: about EUR 0.04. They are kept in `evaluation/answer-design/replies-20261125.json`, and every style change is judged on them. One came back empty (the model used its whole allowance thinking) and is not used.
2. **What the model already writes:** an answer sentence first; a bold line ending in a colon before a list; lines like "**Total:** 535 €"; numbered steps; tables; check-lists; a title and sections on long answers.
3. **So the design reads that structure and draws it better.** Nothing new is asked of the model, no instruction was added, no answer text is changed.

## What is new on the screen

| What the model writes | How it is shown now |
| --- | --- |
| The opening sentence or two of a longer answer | Slightly larger: the answer first, the explanation after |
| Two to six short lines of "**Name:** figure" | **Tiles** side by side (Total, Average, …) |
| A bold line ending in a colon, before a list | A quiet label for that list |
| A check-list | **Boxes you can tick;** a ticked line is struck through |
| A table | A calm header, banded rows, rounded; **"Copy table"** puts it on the clipboard so it pastes into a spreadsheet as cells |
| A title and sections | A title with a rule under it, more air above each section |
| A quoted line | A note set apart, with a coloured edge |
| Bullets and numbers | Coloured markers, a little more room |

Charts, code blocks, formulas and source buttons are as before.

**Light and dark:** every colour comes from the theme, and the browser test looks at both.

## Decisions taken

1. **No new instruction to the model in this pass.** It costs tokens on every request, and the frozen wording is tied to tests and measurements. The structure it writes already is enough for a first pass.
2. **Ticks are not saved.** They last while the chat is open. Saving them means changing the saved chat's format; say if you want it.
3. **The PDF export is unchanged** (it prints black on white as before).

## Still to do (in this order)

1. **A before/after sheet for you** with whole answers side by side, in both themes. Two samples were sent on 25 November.
2. **Long, document-like answers as a card** (a title, three or more sections, long): the same card and side panel as deep research, which is what your Claude screenshot shows. Built for deep research; not yet switched on for normal answers, because it changes how every long answer appears and you should see it first.
3. **A dark pass over the screens built earlier on 25 November.** Found already: several new buttons use white text on the accent colour, which is too pale in dark mode (fixed in the report panel; open for share, feedback and plans).
4. **Search answers:** the "Searched the web" block opens as a plain white box; it needs the same care.
5. **One or two new answer blocks** if they earn their place (a comparison block, a "steps" block), following how charts were added.
6. Your screenshots for the "UI references I need" list in the report.

## Switch

Render environment variable `VITE_ANSWER_DESIGN` = `1`, then redeploy. With it off, answers are drawn exactly as before (a test checks this on the same real answers).

## Tests

- `tests/answer-design-ui.test.ts` (5): a real browser on the 11 real answers, at 375 and 1,280 pixels, light and dark: the tiles, the lead, the label, a tick, "Copy table", nothing wider than the screen; and with the design off, none of it.
