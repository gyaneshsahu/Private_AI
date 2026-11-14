# Report while you were away (14 November 2026)

Branch `codex/development-handoff`, newest commit `683e045` (pushed). Nothing deployed, nothing sent to anyone, nothing bought. Your uncommitted files (`package.json`, `docs/search-provider-comparison.md`, `docs/media/`, notes, scripts) are untouched.

## The short version

- **Every feature in the scope list is built**, each behind its own switch that is **off**: voice input, read aloud, PDF export, images, code execution, memory, deep research, Projects, canvas, live voice. Scheduled tasks: design only, waiting for you.
- **Chat basics** (from a comparison with ChatGPT, Gemini and Claude) are built and **on**: Enter sends, the view follows the answer with "jump to latest", paste and drop of files, offline banner, long messages collapse, edit and send in one step, retry shows its cost, delete asks first, copy conversation as text, date groups, editable search text.
- **Checked live on Privatemode** (synthetic data): code execution through the app (Fast 30 of 30, Thinking 16 of 16 arithmetic conversations exact), voice transcription (German and English exact), a picture question, memory (used when relevant, no leaks, masking kept), deep research (relevant plans, correct cited answers).
- **Privatemode rotated its deployment today.** Hosted chat will refuse until you approve the new manifest digest when you sign the report (first item in `docs/owner-decisions.md`). The app now tells users this plainly instead of a vague error.
- **What you must do or decide:** `docs/owner-test-list.md` (110 items in four groups) and the "Decisions waiting for you, 14 November" block at the top of `docs/owner-decisions.md`.

## Done and pushed (newest last)

| Area | What | Switch | Verified |
| --- | --- | --- | --- |
| Owner test list | `docs/owner-test-list.md`: every manual test and decision, steps, expected result, checkbox | n/a | n/a |
| Search text | The suggested search text can be edited; the edit is masked again before it is sent | always on | browser tests |
| Composer | Enter sends (desktop), Shift+Enter new line, limit notice, paste and drop of files | always on | browser tests at 3 widths, 2 languages |
| Scrolling | The view follows a streaming answer; "Jump to latest" | always on | browser tests |
| Connection | Offline banner; "Answer complete" for screen readers | always on | browser tests |
| Saved list | Delete asks first; copy conversation as text; date groups; dead Share button removed | always on | browser tests |
| Messages | Own text shown as typed; long messages collapse; edit and send in one step; retry shows its cost; report a problem | always on | browser tests |
| Images | Metadata stripped, black-box redaction, OCR-suggested boxes, never stored, Fast model only | `inference.images` | live: one picture question |
| Code execution | Pyodide in the browser, streamed tool calls, 2 free follow-ups per paid message | `inference.code` | **live through the app: 30/30 and 16/16** |
| Memory | In the encrypted vault, created only on request, relevant ones sent, Memory screen, forget all | `VITE_MEMORY` | live probe passed |
| Deep research | Plan, approved masked searches, bounded reading, cited answer, caps, stop | `inference.research` | live: 3 questions; citations fixed and rechecked (14 source buttons, no raw codes) |
| Canvas | Editable document or table beside the chat, ask for changes with Apply/Undo, exports | `VITE_CANVAS` | offline only |
| Live voice | Turn by turn: speak, countdown, send, read aloud, listen again | `VITE_LIVE_VOICE` | offline only |
| Projects | Per-project instructions and files, searched on the device | `VITE_PROJECTS` | offline only |
| Fixes | Rules detector froze the page on long unbroken text; a rotated deployment now shows a clear message; Render bridge forwards Privatemode headers (from earlier today) | n/a | tests |

## Half-done or not done

- **Scheduled tasks:** design only (`docs/scheduled-tasks-design-20261114.md`), as you asked. Recommended: reminders in the vault plus a calendar file, nothing on the server.
- **Not built on purpose:** HTML mini pages in the canvas (could not be made safe enough without a separate origin), a public share link, thumbs that send the conversation to the server, image generation and the rest of your "later" list.
- **Not verified anywhere yet:** real phones, Safari, Firefox, screen readers, the hosted path on Render. These are in the owner test list.
- **Not verified live:** canvas, live voice and Projects (they use the normal send path; live checks are written in their docs).

## Spend (my counts from the app; the portal is exact)

- **Privatemode:** about **430,000 tokens** while you were away (code execution through the app about 372,000, memory about 22,000, deep research about 28,000, small checks). Today in total about 750,000. **Estimated balance: about 0.77M** of the free tokens. Not below your 0.5M line yet.
- **Brave:** about 16 searches (deep research checks).
- **Tinfoil:** none.

Cost lesson: a calculation through the app costs about 7,700 tokens per two-turn conversation (the long system message is sent each time, and each calculation is two requests). Keep it in mind for the allowance.

## CI and tests

- Full unit suite: 1,666 passed; one browser test (`invite-browser`) failed once under load and passed alone (known).
- End-to-end: 61 of 61. Layout sweep: 54 of 54 in English and 54 of 54 in German (3 browsers, 3 widths).
- GitHub CI on `683e045` (the newest code commit): **green** (offline and durable jobs).

## Risks to know

1. **The manifest rotation** shows that Privatemode can change its deployment without notice. With the daily model check and the clear error, the app fails safe, but hosted chat stops until you approve the new digest. Expect this to happen again; the runbook is `docs/model-deprecation-runbook.md`.
2. **Token cost per feature** is higher than the first estimates (code execution about 3.5 times the harness figure). Check the weekly reconciliation before switching features on for many invitees.
3. **Merges of parallel work** into the shared stylesheet dropped a closing brace four times. A test now catches it; it is worth keeping.
4. **Older documents** may still name old numbers; the owner test list items were renumbered (T-01 to T-110), so test numbers quoted in older docs may not match.
