# Owner requests log

**What this is:** every request you gave since the first message of 25 November 2026, newest first. Each entry says what you asked, what I did and how, where it is (branch and commit), the test results, and the status. Kept current as requests come (rule 2 in `docs/working-rules.md`).

**Where things are:** nothing is merged into your branch and nothing is deployed. Each piece is on its own branch on GitHub. `preview/all-tracks` has the finished pieces together. The technical detail is in `docs/agent-run-report-20261125.md`.

**Status words:** done (built, tested, pushed), partly (some of it; the entry says what is missing), open (not started or in work).

---

## 11. Deep research: side panel, not the canvas (a correction, with a Claude screenshot)

- **Date:** 25 November 2026, evening.
- **You asked:** you had said "canvas" but meant the side panel, as in the Claude screenshot you sent (research status and a written summary in the chat, the document in a panel on the right). Do what is best for our platform.
- **What I did:** this is what entry 6 had built: the report opens in a side panel, and the canvas is one button away. From your screenshot I took one thing ours lacked: **the report's main points in the chat**, each with its bold opening, under the card. They are read from the report's own first list (its "Short answer" or summary section), so there is no second request to the model and no extra cost. The report text in the panel now also stays a readable column, as a document does.
- **What I did not copy:** Claude writes a separate, longer summary for the chat with a second model request. That costs a request per research; say if you want it.
- **Where:** branch `feat/report-card`.
- **Tests:** 6 logic tests green; the browser test is extended and runs after the long check that was going on.
- **Status:** partly: built; browser test, push and merge into the preview follow. Your screenshot also answers "UI references I need" number 1.

## 10. Two standing rules: UI references and this log

- **Date:** 25 November 2026, evening.
- **You asked:** write two rules into `docs/working-rules.md` and follow them. (1) When a screen would gain from seeing how ChatGPT, Claude or Gemini do it, ask for it in a numbered "UI references I need" list in the report, and build my best version meanwhile. (2) Keep `docs/owner-requests-log.md` with an entry for every request.
- **What I did:** wrote `docs/working-rules.md` (with the earlier standing rules of the day in the same file). Moved the first version of this record to `docs/owner-requests-log.md` and rewrote it in the format you asked for. Added the section "UI references I need" to the top of the run report, with the first five requests.
- **Where:** branch `claude/owner-test-prep-features-1431b6`; also copied into `preview/all-tracks`.
- **Tests:** none needed (documents only).
- **Status:** done. Both rules run from now on.

## 9. Keep a record of what you asked and what I did

- **Date:** 25 November 2026, evening.
- **You asked:** keep a file with every extra task after the first one and what I did for it.
- **What I did:** started the record as `docs/owner-requests-log-20261125.md`; entry 10 gave it its final name and format.
- **Where:** this file.
- **Status:** done (continued by entry 10).

## 8. How CometRow shows its answers

- **Date:** 25 November 2026, evening.
- **You asked:** how answers are shown is very important: normal chat, search, deep research. More interactive and graphical where needed, organised and beautiful. We may not beat ChatGPT or Gemini on features, but we control how our platform answers. Example: a Claude answer with a file card, a short summary and bold-led points, and the 33-page question bank PDF it made. Can we reach that level or better. Give it real time and effort.
- **What I did so far:** read your example (the PDF is a structured document: title, a "how to use" box, a tracker table, tagged questions, a formula sheet, answers). Looked at how our answers are drawn today: clean but plain Markdown; the canvas edits raw Markdown; the screen tour has only one dark screenshot, of an empty chat. Plan: (a) the report card of entry 6 first, as the general "document card"; (b) capture about 12 real answers from the live model as fixed examples, so every style change is judged on real text; (c) restyle what the model already writes (headings, lists, tables, quotes, bold lead-ins, code, charts) in light and dark; (d) at most one or two new answer blocks; (e) send you a before/after sheet early.
- **Done since:** (a) the report card (entry 6). (b) 12 real answers captured from the live model for about EUR 0.04. (c) a first design pass that draws what the model already writes: the opening as a lead, "Total / Average" lines as tiles, a bold line before a list as its label, check-lists you can tick, tables with banded rows and "Copy table", clearer titles and sections, quoted lines as notes. No new instruction to the model. A before/after sample was sent to you.
- **Where:** branch `feat/answer-design` (on top of `feat/report-card`), commit `04a733a`. Doc `docs/answer-design-20261125.md`, with the list "Still to do".
- **Tests:** 5 browser tests green on the real answers (phone and desktop, light and dark; with the design off, none of it). The full local suite and CI for this branch had not finished when this was written.
- **Status:** partly. **Open:** long document-like answers as a card (built for deep research only so far); the search answer block; a full before/after sheet; one or two new answer blocks; merging into `preview/all-tracks`. I would like your reaction to the two samples before going further in one direction.

## 7. Light and dark mode

- **Date:** 25 November 2026, evening.
- **You asked:** be careful about both dark and light mode in whatever I do.
- **What I did:** taken as a standing rule (`docs/working-rules.md`). New screens use only the theme's colour variables, so both modes follow. The report card and the answer design are tested and looked at in both. **Not done yet:** a dark pass over the screens built earlier on 25 November. Already found: the main buttons in the share, feedback and plans screens use white text on the accent colour, which is too pale in dark mode.
- **Status:** partly. Rule in force; the dark pass over the earlier screens is open.

## 6. Deep research as a file in the chat, opening in the side panel

- **Date:** 25 November 2026, evening.
- **You asked:** deep research should appear in the chat just as a file, and the actual report should open in the canvas, the editable side panel, instead of in the chat. Like Claude and ChatGPT.
- **What I did:** a report card in the chat (title, "Research report · sources · reading time", the report's own first paragraph, its sections as links). The report opens in the side panel with its source buttons working, and from there: **Edit in canvas**, Copy, Download, Share. On a wide screen the panel opens by itself while the report is written; on a phone only on a tap. Behind the switch `VITE_REPORT_CARD`; with it off everything is as today. A stopped or failed research stays as text in the chat.
- **Note on an older decision:** your decision of 16 to 18 November put deep research "in the chat". This changes only where the finished report is shown. I did not edit `docs/owner-decisions.md`.
- **Where:** branch `feat/report-card` (on top of `feat/image-share`), commit `84ce261`. Doc `docs/report-card-20261125.md`. Two screenshots sent to you on 25 November.
- **Tests:** 5 logic tests and 4 browser tests green (phone and desktop, English and German, light and dark); accessibility check clean on the deep research screens; CI green (run 45651028776), database suite included. The full local run was still going when this was written.
- **Status:** partly. Built and pushed. **Not yet in `preview/all-tracks`**, and the owner tests for it (a section 42) are not written. One thing differs from your words: the report opens in a reading panel with "Edit in canvas" as its first button, not straight in the canvas, because the canvas shows raw Markdown today (reason in the doc).

## 5. Projects and the chat menu

- **Date:** 25 November 2026.
- **You asked:** projects and chats must feel professional like Claude or ChatGPT: a new chat into a project, an existing chat into a project, create a project and open chats in it, instructions and files per project, "memory" per project. Three dots on every chat on hover: rename, archive, delete, add to project, and "take it out" when it is in one. Research what else was missing.
- **What I did:** the three-dot menu on every chat (sidebar, inside a project, and in the open chat's header) with Rename, Pin, Archive, Add to project (with "New project…" in the same menu), Move to another project, Remove from project, Delete. "New chat in this project". The project page shows its chats first, instructions and files beside them. Renaming the open chat changes its title at once.
- **Where:** branch `feat/projects-ux`, commit `697eafb`. Doc `docs/projects-ux-20261125.md`. Your tests C.35 to C.35b and section 35.
- **Tests:** unit suite and 64 browser tests green locally; CI green (run 45612666847), database suite included.
- **Status:** partly. **Memory per project is not built**; the doc says what it would take. Say if you want it.

## 4. A brief is a suggestion

- **Date:** 25 November 2026.
- **You asked:** what you said is a suggestion; a better idea or approach may be used.
- **What I did:** taken as a standing rule and saved for later sessions. I read it as freedom in how things are built, not in the protective rules. Used so far: image editing by crop-and-paste instead of provider masks; a home-screen app without an offline mode; plans built with proposals instead of waiting for numbers; the report opening in a reading panel with "Edit in canvas" instead of straight into the raw canvas editor.
- **Status:** done (standing rule).

## 3. Keys and a spending limit

- **Date:** 25 November 2026 (end of the first message).
- **You asked:** the worktree box is ticked; keys in the credential manager may be used if needed; not more than EUR 3 to 5.
- **What I did:** spent about USD 0.11 in total, on made-up pictures only: it showed that the image address in the app was wrong (your test would have failed) and that edits and erase work live. Entry 8 added about EUR 0.04 for 12 live model answers. Total so far about EUR 0.14.
- **Status:** done so far; the limit stays in force.

## 2. The combined branch, the new tests and the report

- **Date:** 25 November 2026 (first message).
- **You asked:** a `preview/all-tracks` branch with everything combined and green (unit, browser tests, accessibility, screen tour); new owner tests in the format of the test list; a report with "Needs you" at the top.
- **What I did:** `preview/all-tracks` made from the tag by merging all nine branches; conflicts resolved there. `docs/owner-test-additions-20261125.md` (sections 32 to 41). `docs/agent-run-report-20261125.md` with 19 "Needs you" items.
- **Where:** branch `preview/all-tracks`, commit `3163a08`.
- **Tests:** unit 2,474 passed, 2 failed under load and passed alone; browser tests 64 of 64; accessibility check 0 findings; screen tour 392 screens, one step timing out per run (a different one each time, each passes alone). CI green (run 45646292812).
- **Status:** done, with one thing not explained: the tour's occasional stall ("Needs you" item 19).

## 1. The first brief: tracks 0 to 6

- **Date:** 25 November 2026.
- **You asked:** while you are in exams, build each track on its own branch behind an off-switch, with tests at phone and desktop size in English and German, CI green, no deploying, no spending, nothing merged into your branch.
- **What I did, per track:**

| Track | What | Branch and commit | CI |
| --- | --- | --- | --- |
| 0 Fixes | Search without credit answers without an error; daily search cap 60 with a clear line; visitor address behind Render (off until you run one check); no test words in production; UI polish; image address bug; 48 core-path tests | `fix/before-owner-test` `6f348f7` | green |
| 1 Image editing | Edit button, full-screen editor, describe edits, versions, select area, erase, resize, zoom, follow-up edits from the chat, own photos of things (people refused) | `feat/image-editing` `d4a74f9` | green |
| 1b Placement and sharing | Edit/Download/Share on the image, side panel, sharing from the device, encrypted links | `feat/image-share` `dcb3946` | green |
| 2 Analytics | Counts-only owner dashboard, no content, no third party | `feat/analytics` `88c3506` | green |
| 3 Feedback | Feedback form, shown in the owner dashboard, deletable | `feat/feedback` `b34bc47` | green |
| 4 No-training image provider | Microsoft Foundry FLUX.2 EU adapter behind a config choice; no live request (no account) | `feat/image-provider-eu` `da9b712` | green |
| 5 Home-screen app | Installable, own window, start screen, Install row in Settings | `feat/pwa` `b344983` | green |
| 6 Plans and checkout | Free, Plus, Pro with proposal values; a checkout that knows no payment company; a fake provider for tests | `feat/plans-checkout` `b2fa63a` | green |

- **Tests:** each branch: unit suite, 64 browser tests, evaluation checks, secret scan locally; CI with the database suite. Details per track in the run report.
- **Status:** done. What only you can do is in "Needs you" in the run report (19 items).
