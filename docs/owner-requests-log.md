# Owner requests log

**What this is:** every request you gave since the first message of 25 November 2026, newest first. Each entry says what you asked, what I did and how, where it is (branch and commit), the test results, and the status. Kept current as requests come (rule 2 in `docs/working-rules.md`).

**Where things are:** nothing is merged into your branch and nothing is deployed. Each piece is on its own branch on GitHub. `preview/all-tracks` has the finished pieces together. The technical detail is in `docs/agent-run-report-20261125.md`.

**Status words:** done (built, tested, pushed), partly (some of it; the entry says what is missing), open (not started or in work).

---

## 20. Where your screenshots are kept

- **Date:** 26 November 2026.
- **You asked:** whether the screenshots you upload are saved somewhere, and where you can put more instead of pasting them into the chat.
- **What I did:** they were only in the app's own upload folder of this session. I made `C:\Gyanesh\Startups\Private_AI-tracks\ui-references` with a `README.txt`, copied everything you had sent into `received-20261126` under names that say what each shows, and made `new` for the next ones. **It is outside the repository on purpose:** the screenshots show private chat titles and a photo of you, and the repository is public. Two desktop screenshots of 25 November were no longer in the upload folder and could not be copied.
- **Status:** done. Put new ones into `ui-references\new` and tell me.

## 19. Reference screenshots, and how a long answer should look

- **Date:** 26 November 2026.
- **You sent:** phone screenshots (a finished deep research in ChatGPT and its opened report; the opened document from a Claude file card; sources as a bottom sheet; a project page with its menu; the projects list) and the text of a long ChatGPT answer ("explain AGI in detail"). You said: a long answer can stay in the chat like this, or go to the side panel with a short note in the chat, whichever is better; and that ChatGPT's answer was multicolour, with images and diagrams.
- **What I decided:** long answers stay in the chat, as you said on the same day (entry 13) and as your ChatGPT example does. A report-style card stays for deep research and canvas documents only.
- **What ChatGPT's long answer has, and where ours stands:**

| In ChatGPT's answer | In CometRow |
| --- | --- |
| Clear sections, tables, lists, quoted notes | Yes, with the answer design (entry 13) |
| Coloured cards with a small tag ("Stage 1 · Current era", "Hypothetical") | **Not yet.** Needs a new answer block and one sentence in the model's instructions |
| A drawn diagram (a flow chart from a text description) | **Not yet.** Needs a diagram drawer in the app and one sentence in the instructions. Charts with numbers are already drawn |
| Pictures from the web | **Not possible under your rules:** the app loads nothing from other sites (no third party sees the user). It would need pictures fetched through our own server, which is a decision for you |

- **My proposal, not built (your list for this round ends at item 6):** two new answer blocks, "cards" and "diagram", each behind the answer-design switch, with a measured cost per request, tried on the real sample answers first. Say yes and it is the next piece of work.
- **What I took from the screenshots already:** the research card in ChatGPT's form (entry 12) matches your phone screenshots too. The rest is noted against "UI references I need" in the report: numbers 1, 3, 4 and 6 are answered; number 2 partly (I have the text and the end of the answer, not a table on the phone); number 5 (ChatGPT's canvas while editing) is still wanted.
- **Status:** partly. Recorded and decided; the two new blocks wait for your yes.

## 18. Loading hang: a test and more investigation

- **Date:** 26 November 2026.
- **You asked:** add a test that fails if the chat list takes longer than 8 seconds, and keep investigating.
- **Status:** open.

## 17. Memory per project

- **Date:** 26 November 2026.
- **You asked:** yes, like ChatGPT projects, as its own module behind an off-switch. Project memories stay inside that project.
- **Status:** open.

## 16. Dark mode: the full pass

- **Date:** 26 November 2026.
- **You asked:** the full screen-by-screen pass over all earlier screens.
- **Status:** open.

## 15. Error states, like ChatGPT

- **Date:** 26 November 2026.
- **You asked:** when an answer fails or stops, one short friendly line with a soft red accent where the answer would be, with Retry; plain words, no codes; keep the partial answer and the message and say what was lost; "You're offline" until the connection is back; the same for a failed image; a failed search does not fail the answer; the usage limit stays the calm line, not red.
- **Status:** open.

## 14. Loading and progress states: one shared "activity" component

- **Date:** 26 November 2026.
- **You asked:** behind an off-switch: "Thinking…" with a softly pulsing dot in the brand gradient, collapsing to "Thought for N s", with the model's reasoning shown collapsed if Privatemode returns it, otherwise the steps (and tell you which it is); steps in the same line (searching, reading N sources, reading a file, calculating, deep research); an image placeholder in the final size with a soft shimmer, then a fade-in; skeleton rows for the chat list and app start.
- **Status:** open.

## 13. Answers stay inline; finish the inline answer design

- **Date:** 26 November 2026.
- **You asked:** answers stay inline, like ChatGPT. Document cards only for deep research reports and canvas documents. Finish the answer design for inline answers: the "Searched the web" block, and a before/after sheet of the sample answers to judge after your exams.
- **Status:** open, in work. Decision recorded: no document cards for normal answers.

**For entries 13 to 18 you also asked:** calm, not flashy; light and dark; respect "reduce motion"; no layout jumps; test at desktop and phone size in English and German; add rows to the owner-test additions; log each item here. At the end: full unit suite, all browser tests and the screen tour on `preview/all-tracks`, CI green there, the report updated; then stop and wait; no new features beyond the list.

## 12. Which in-chat research result you prefer (ChatGPT and Claude screenshots)

- **Date:** 25 November 2026, evening.
- **You asked:** you sent how ChatGPT and Claude show a finished research, and said you like ChatGPT's better, mainly the result inside the chat; I should go with whatever is better.
- **What I did:** rebuilt the card in that form: one line above it ("Research report · sources · reading time"), then a document card whose head has the title, **Download** and **Open**, and whose body is the beginning of the report itself, fading out. A click opens the report in the side panel. Kept from my first version, because neither of them has it: the report's sections as links under the card. Dropped: the summary lines of entry 11, which the preview replaces.
- **Where:** branch `feat/report-card`, commit `83269b2`; merged into `feat/answer-design` and `preview/all-tracks`. A screenshot was sent to you.
- **Tests:** 5 logic tests and 4 browser tests green (phone and desktop, English and German, light and dark); on the combined preview the same plus the accessibility check on the research screens: clean.
- **Status:** done. Your screenshots answer "UI references I need" number 1 for desktop.

## 11. Deep research: side panel, not the canvas (a correction, with a Claude screenshot)

- **Date:** 25 November 2026, evening.
- **You asked:** you had said "canvas" but meant the side panel, as in the Claude screenshot you sent (research status and a written summary in the chat, the document in a panel on the right). Do what is best for our platform.
- **What I did:** this is what entry 6 had built: the report opens in a side panel, and the canvas is one button away. From your screenshot I took one thing ours lacked: **the report's main points in the chat**, each with its bold opening, under the card. They are read from the report's own first list (its "Short answer" or summary section), so there is no second request to the model and no extra cost. The report text in the panel now also stays a readable column, as a document does.
- **What I did not copy:** Claude writes a separate, longer summary for the chat with a second model request. That costs a request per research; say if you want it.
- **Where:** branch `feat/report-card`.
- **Status:** done, and changed again by entry 12: the main points were replaced by the report's own beginning inside the card. The readable column in the panel stayed.

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
- **Tests:** 5 browser tests green on the real answers (phone and desktop, light and dark; with the design off, none of it). Merged into `preview/all-tracks`, where the full run was clean: unit 2,490 passed and none failed, browser tests 64 of 64, screen tour 396 screens with no failed step, accessibility check 0 findings. Your tests are section 43.
- **Status:** partly. **Open:** long document-like answers as a card (built for deep research only so far); the search answer block; a full before/after sheet; one or two new answer blocks. I would like your reaction to the two samples before going further in one direction.

## 7. Light and dark mode

- **Date:** 25 November 2026, evening.
- **You asked:** be careful about both dark and light mode in whatever I do.
- **What I did:** taken as a standing rule (`docs/working-rules.md`). New screens use only the theme's colour variables, so both modes follow. The report card and the answer design are tested and looked at in both. **Not done yet:** a dark pass over the screens built earlier on 25 November. Found and fixed on their branches: the main buttons in the share, feedback and plans screens used white text on the accent colour, which is too pale in dark mode. Still open: looking at every earlier screen in dark, one by one.
- **Status:** partly. Rule in force; the dark pass over the earlier screens is open.

## 6. Deep research as a file in the chat, opening in the side panel

- **Date:** 25 November 2026, evening.
- **You asked:** deep research should appear in the chat just as a file, and the actual report should open in the canvas, the editable side panel, instead of in the chat. Like Claude and ChatGPT.
- **What I did:** a report card in the chat (title, "Research report · sources · reading time", the report's own first paragraph, its sections as links). The report opens in the side panel with its source buttons working, and from there: **Edit in canvas**, Copy, Download, Share. On a wide screen the panel opens by itself while the report is written; on a phone only on a tap. Behind the switch `VITE_REPORT_CARD`; with it off everything is as today. A stopped or failed research stays as text in the chat.
- **Note on an older decision:** your decision of 16 to 18 November put deep research "in the chat". This changes only where the finished report is shown. I did not edit `docs/owner-decisions.md`.
- **Where:** branch `feat/report-card` (on top of `feat/image-share`), commit `84ce261`. Doc `docs/report-card-20261125.md`. Two screenshots sent to you on 25 November.
- **Tests:** 5 logic tests and 4 browser tests green (phone and desktop, English and German, light and dark); accessibility check clean on the deep research screens; CI green (run 45651028776), database suite included. The full local run was still going when this was written.
- **Status:** done, in the form of entry 12. In `preview/all-tracks`; your tests are section 42 of `docs/owner-test-additions-20261125.md`. One thing differs from your words: the report opens in a reading panel with "Edit in canvas" as its first button, not straight in the canvas, because the canvas shows raw Markdown today (reason in the doc).

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
