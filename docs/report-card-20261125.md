# Deep research as a report card (25 November 2026)

**Status:** built on the branch `feat/report-card` (on top of `feat/image-share`). Behind a switch, off by default. Nothing deployed.

**Your request (25 November):** deep research should appear in the chat as a file, and the real report should open in the editable side panel, not in the chat, as in Claude and ChatGPT.

## What it is

**In the chat**, a finished deep research is now a document card (the form you preferred from ChatGPT, 25 November):
- **a line above it:** "Research report · 6 sources · 4 min read";
- **the card's head:** the report's title, **Download** and **Open**;
- **the beginning of the report itself** inside the card, fading out at the bottom. A click on it opens the report. Source codes are left out of this preview; the sources open in the report;
- **"In this report"** under the card: its sections as numbered links. A tap opens the report at that section.

**In the side panel**, the whole report:
- drawn as the chat would draw it, with tables, lists and **source buttons that open the source**;
- **Edit in canvas** puts the text into the canvas, where it can be edited and changed with "Ask for changes";
- **Copy** (as Markdown), **Download** (a `.md` file), **Share** (the same dialog as for any answer);
- at the end, the line that says what was searched and read.

**When the panel opens:**
- On a wide screen (1,100 pixels and more) it opens by itself when the research starts writing, so the report is written where it is read.
- On a phone or a narrow window it never opens by itself. The card says "Writing the report…" and opens on a tap.

## What did not change

- **The report is still the answer's text.** Follow-up questions, saving, sync, search in chats, PDF export, read aloud and sharing work as before. Only what the chat draws is different.
- **A stopped or failed research** stays in the chat as text.
- **With the switch off** everything is as today.

## Decisions taken

1. **A reading panel first, the canvas one tap away.** Your words were "open in canvas". The canvas edits raw Markdown, has an 18,000-character limit and asks before replacing what is in it. A report opened straight into it would show pipes and stars instead of a table. So the report opens in a panel made for reading, and "Edit in canvas" is its first button. When the canvas gets a real editor, the report can open there directly.
2. **The card shows the report's own beginning,** not a summary from a second request to the model: no extra cost, and it cannot say something the report does not. Claude writes a separate summary into the chat; that costs one more request per research. Say if you want it.
3. **A report too long for the canvas** has no "Edit in canvas" button; Copy and Download remain.
4. **This changes one older decision in placement only:** "deep research in the chat" (16 to 18 November) said the run and the result are in the chat. The run still is; the finished report is now a card there. `docs/owner-decisions.md` was not edited.

## Switch

Render environment variable `VITE_REPORT_CARD` = `1`, then redeploy (a build switch).

## Tests

- `tests/report-card.test.ts` (5): the title, summary, sections and reading time read from a report; the saved field; the switch.
- `tests/report-card-ui.test.ts` (4): a real browser at 375 and 1,280 pixels, English and German, **light and dark**: the card and what it shows, nothing of the report in the chat, the panel by itself on a wide screen and on a tap on a phone, a section link, Copy, Edit in canvas, the card again after a reload.
- The older deep-research tests run with the switch off and still expect the report in the chat: that is the proof for "off is as today".

## For your owner test

- C.22 and section 6 of the test list describe the report in the chat. With the switch on, expect the card instead; the new tests are in `docs/owner-test-additions-20261125.md`, section 42.
