# Whiteboard study (run 17 November 2026, for the owner's request of 18 November)

Owner's goal: a drawing board opened from the "+" menu, called "Whiteboard". Pen with thickness and colour, eraser, shapes, arrows, text, sticky notes, undo. Sending to the AI: a picture of the board at about 1,500 px on the long side, plus the typed text as plain text. Stored in the encrypted vault per conversation, never on the server.

This is a study only. Nothing in the app was changed. The machine clock said 17 November when the runs were made; the file name keeps the date the owner gave.

Labels used below: **measured** = a live call or a local run on 17 November; **estimated** = my judgement, not measured.

**Lead agent's note (18 November):** the study agent wrote both the ground truth and the scores, and every arm scored 100 %. That means these synthetic boards were too easy to separate "image only" from "image plus text", not that the model is perfect. Treat the accuracy as an upper bound; the real check is real handwriting from alpha users (open decision 1). The 13 "Connection error." calls in the main run happened while the lead agent ran a large local test suite on the same PC; whether they were billed is unknown and is not in the EUR 0.0449 total.

## Summary

- The Fast model (`glm-5.3-flash`) answered every whiteboard question correctly. 22 boards, 96 answered calls, 96 correct (measured).
- Image only (a) and image plus typed text (b) scored the same: 15 of 15 and 15 of 15 on the main set, 7 of 7 and 7 of 7 on the stress set (measured). On this set the typed text added nothing measurable.
- A board shrunk to 1,000 px also scored 15 of 15 and 7 of 7, as PNG and as JPEG. It uses 864 picture tokens instead of 1,944 (measured). The one small-text board showed the first sign of blur at 1,000 px (a comma read as a dot, then corrected).
- One question costs about EUR 0.0006 at 1,500 px and EUR 0.00035 at 1,000 px, before the app's own instructions (measured, owner-reported prices).
- Whole study: EUR 0.0449 for answered calls (measured). Budget was EUR 0.20.
- Typical answer time about 2 to 2.5 seconds, slowest 7.1 seconds (measured from this PC, not through the relay).
- On-device handwriting OCR (tesseract.js) was poor and should not be sent (measured).
- Recommendation: send the picture (JPEG through the existing image path) plus the typed text. Keep 1,500 px as the owner asked, or 1,000 px to save about 45 % per question; see open decisions.
- Main limit: the handwriting is computer fonts with a little jitter, not real strokes. Real handwriting must be checked in the alpha.

## What was tested

- 15 synthetic boards (the main set), then 7 harder boards (the stress set), all made on this PC. Nothing personal; made-up content only.
- Each board was drawn from a scene list: pen strokes, shapes, arrows, handwriting and typed text. That is the data a real whiteboard keeps, so the typed text and a structured description come from it directly.
- Handwriting: "Ink Free", "Segoe Print" and "Segoe Script" with each letter turned and lifted a little. Shapes and arrows have wobbly, overshooting lines. Typed text: "Segoe UI". The script checks the hand fonts are really installed before drawing.
- Rendered with headless Chromium at device scale 1. PNG, 1,500 px on the long side (1,100 x 1,500 for the two portrait boards). 16 KB to 98 KB each, far below the app's image limit of 280,000 bytes.
- One question per board, with a written ground truth in each board's JSON.
- Arms (each one call, `max_tokens` 700, no system prompt):
  - **a**: picture only, PNG 1,500 px.
  - **b**: picture plus "Typed text on the whiteboard (made with the text tool, in the order it was added; handwriting is not included)" and the list.
  - **c**: as b, plus a structured description from the scene: shapes with their label and position in %, and "A -> B" for each arrow. Only on the diagram boards (05, 06, 08, 09, 11, 12, 15, s3).
  - **a1000**: picture only, PNG shrunk by a browser canvas to 1,000 px.
  - **j1000**: as a1000 but JPEG quality 0.85. This is the format and first quality step of the app's image path (`src/image-upload.ts`).
- One text-only call (no picture) as a baseline. It answered "I don't see any image attached" (27 prompt tokens).
- Free local check: tesseract.js (the app's photo-to-text engine, English data from `public/vendor/ocr`) on all 22 boards.
- Scored by hand from the saved answers: correct, partly, wrong.

## The samples

Main set:

1. `01-equation-linear`: handwritten 2x + 5 = 17, x = ?. Truth: x = 6. No typed text.
2. `02-equation-fraction`: handwritten stacked fractions 3/4 + 2/3 = ?. Truth: 17/12. No typed text.
3. `03-equation-quadratic`: handwritten x² − 5x + 6 = 0, typed title "Solve for x". Truth: x = 2 and 3.
4. `04-right-triangle`: right triangle with angle mark, typed "a = 6 cm", "b = 8 cm", handwritten "c = ?". Truth: 10 cm.
5. `05-flowchart`: Start, Read temperature, decision diamond "Temp > 30?", fan, wait loop; handwritten yes/no on the branches. Question at 25. Truth: no branch, wait 5 min, loop back; fan stays off.
6. `06-architecture`: Browser -> API server -> Database and Cache boxes; handwritten HTTPS, SQL, sessions on the arrows. Truth: browser talks only to the API server.
7. `07-messy-notes`: handwritten to-do list, two items struck through. Truth: call plumber, fix bike tyre are open. No typed text.
8. `08-bar-sketch`: hand-drawn bars, typed days, handwritten values 12, 7, 15, 9. Truth: Wednesday, total 43.
9. `09-mind-map`: Trip planning with Transport, Food, Budget and their items. Truth: Train and Bike under Transport.
10. `10-hand-table`: hand-drawn grid, typed headers, handwritten items, quantities and prices. Truth: 9.90.
11. `11-timeline`: arrow with handwritten years 2019 to 2025, typed events. Truth: First users (2021).
12. `12-sticky-notes`: To do, Doing, Done columns with five sticky notes. Truth: Set up repo, Draft budget.
13. `13-equation-system`: handwritten x + y = 10 and x − y = 4 with a brace. Truth: x = 7, y = 3. No typed text.
14. `14-circle-area`: circle with radius line, handwritten r = 5 cm, typed "Area?". Truth: 25π ≈ 78.5 cm².
15. `15-venn`: two circles, typed Cats and Dogs, handwritten 8, 3, 5. Truth: 8 like dogs.

Stress set (added after the main set all came back correct):

- `s1-cursive-note`: cursive meeting note with time, room and a revenue figure, a stray strike line.
- `s2-faint-marker`: pale yellow equation 7x − 4 = 3x + 20 (x = 6).
- `s3-crossing-arrows`: four boxes, two diagonal arrows crossing; direction matters.
- `s4-small-table`: cursive table, sum of five hours (101).
- `s5-long-list`: ten handwritten items in two styles, one struck through.
- `s6-angles`: right triangle with 35° and "?" (55°).
- `s7-dense-small`: 12 boxes with 18 px typed labels, small handwriting (26 to 28 px), three questions in one.

## Results (measured)

Accuracy (correct of asked):

| Set | a: picture | b: picture + typed text | c: + structure | a1000: PNG 1,000 px | j1000: JPEG 1,000 px |
| --- | --- | --- | --- | --- | --- |
| Main (15) | 15 / 15 | 15 / 15 | 7 / 7 | 15 / 15 | 15 / 15 |
| Stress (7) | 7 / 7 | 7 / 7 | 1 / 1 | 7 / 7 | 7 / 7 |

Per category, every arm: equations 6 of 6 boards (01, 02, 03, 13, s2, and the equation in s7), geometry 3 of 3 (04, 14, s6), diagrams 7 of 7 (05, 06, 09, 11, 15, s3, s7), handwriting notes 3 of 3 (07, s1, s5), chart 1 of 1, tables 2 of 2 (10, s4), sticky notes 1 of 1. No partly, no wrong.

Read this with care:

- Arm b only differs from a where a board has typed text: 11 of 15 main boards and 2 of 7 stress boards. On 03 and 14 the typed text ("Solve for x", "Area?") carries nothing useful. So b was a real second condition on 9 main boards and 2 stress boards. On the rest it was a repeat of a, which shows the answers are stable between runs.
- 22 boards, one run per arm. With every arm at 100 %, the study shows the model is good at this, not which arm is better. A one-board difference would be noise anyway.
- Every typed label was clear in the picture. Typed text should matter more when labels are tiny or the board is crowded. s7 has 18 px labels and b still did not beat a.
- Ground truth and scores were written by the same agent that made the boards.

Small mistakes outside the asked answer (measured): on `15-venn` arm a the answer also claimed cats and dogs were "tied" and invented "your class". Arm a1000 said the cat total was 8 (it is 11). The asked answer (8) was right both times. On `s7` both 1,000 px arms read "3,450" as "3.450" and then explained it as 3,450.

No empty answers. No answer stopped at the token limit. The longest answer used 583 of 700 tokens; the model's reasoning used 30 to 455 tokens (455 on the three-part board s7).

## Cost and size (measured)

Picture tokens are reported by Privatemode as `multimodal_tokens.image`. They fit a tile of 28 x 28 px: 1,500 x 1,000 = 54 x 36 = 1,944 tokens. This rule is fitted to these runs; it is not from Privatemode's documentation.

| Picture | Picture tokens | Prompt tokens (median) | Answer tokens (median) | EUR per question (mean) | EUR per question (max) |
| --- | --- | --- | --- | --- | --- |
| 1,500 x 1,000 PNG (a, main set) | 1,944 | 1,978 | 215 | 0.00056 | 0.00073 |
| 1,500 x 1,000 + typed text (b, main set) | 1,944 | 2,020 | 210 | 0.00057 | 0.00072 |
| 1,500 x 1,500 (board 14 only) | 2,916 | 2,942 | 215 | 0.00073 | 0.00073 |
| 1,000 px PNG (a1000, main set) | 864 | 898 | 188 | 0.00033 | 0.00042 |
| 1,000 px JPEG (j1000, main set) | 864 | 940 | 224 | 0.00034 | 0.00051 |

- Typed text adds about 40 prompt tokens. The structured description adds about 150 to 250.
- Prices from `shared/usage-weights.json` version 1 (owner-reported): EUR 0.20 per 1M input, 0.65 per 1M output for `glm-5.3-flash`. No cached tokens.
- Not included: the app's own instructions and the earlier chat, which the app sends with every message. Those cost the same as a normal Fast message.
- Total spend: EUR 0.0449 over 96 answered calls and 1 baseline (measured). 13 more calls failed with "Connection error." and returned no usage. Whether they were billed is unknown.
- The app's current image weight is 2 allowance units. A whiteboard question at 1,500 px costs about the same as a photo question at 1,568 px, so 2 units fits (estimated).

## Latency (measured)

- From this PC straight to Privatemode with the SDK, not through the relay or the Render bridge.
- Median per arm 1.9 to 2.9 seconds. Fastest 0.9 seconds, slowest 7.1 seconds. 83 of 96 answers came within 4 seconds.
- 1,000 px pictures were not clearly faster: the answer length decides most of the time.
- Verification: each of the six script runs did one `verify()` and `refreshSecret()` (about 1 second each), then all its questions. Six runs, six verifications, not one for the whole study.

## Failure patterns

- **Connection errors (measured).** In the main run, 13 calls in a row failed after about 2 minutes, each with exactly "Connection error." and no status. The first took 5 seconds, the rest under 0.2 seconds. A new run 2 minutes later answered all 13. The app should show a clear retry, and keep the board as drawn.
- **Extra remarks.** The model likes to add a "fun fact" or a side note. Twice the side note was wrong while the asked answer was right.
- **Small writing at 1,000 px.** At 28 px handwriting the 1,000 px picture blurred a comma into a dot. The model still got it right, but this is where errors will start.
- **On-device OCR is not good enough (measured, free).** tesseract.js read "2x + 5 = 17" as "xx 5=11 X =7", "room 2B" as "room 23", "48,250" as "£8,250", and found nothing in two boards. It read typed text well. Sending OCR text next to the picture would give the model wrong hints.
- **Structured description.** Arm c was correct on all 8 diagram boards, like a and b. It was not needed here; it may help on very crowded diagrams. Not proven.

## Recommended approach

1. Send one picture of the board plus the typed text as plain text (owner's design). The typed text costs about 40 tokens and gives exact spelling of labels. It did not raise accuracy here, but it is nearly free.
2. Use the existing image path: JPEG through `encodeForSending` and the relay's image admission. `src/verified-chat.ts` accepts only `data:image/jpeg`. JPEG at 1,000 px was as good as PNG. JPEG at 1,500 px was not measured but should be at least as good (estimated).
3. Size: 1,500 px as the owner asked, or 1,000 px to cut the picture cost by 55 % (about 45 % of the question). The small-text board suggests 1,500 px is safer for crowded boards. Proposal: export the area that has content (crop the empty margins) at up to 1,500 px. Cropping makes small writing bigger for free.
4. White background, dark strokes. Do not send the on-device OCR of handwriting.
5. Skip the structured description in the first version. Add it later only if real crowded diagrams fail.
6. Use `max_tokens` of at least 1,200 for whiteboard questions. The longest answer here used 583 tokens with the reasoning, and three-part questions get longer.
7. Add one line to the whiteboard prompt: answer what was asked and do not add side facts. That targets the two wrong side remarks (estimated benefit, not measured).

## Design (estimated)

### Tools

- Pen: three thicknesses (thin, medium, thick), six colours (black, blue, red, green, orange, purple).
- Eraser: removes whole strokes or shapes it touches (simple, undoable). Not a pixel eraser.
- Shapes: rectangle, ellipse, diamond, line, arrow. Drag to draw. A shape can hold a typed label.
- Text: click, type, Enter to finish. Typed text is what the AI gets as plain text.
- Sticky notes: four colours, typed text inside.
- Select and move, delete, clear board (with confirmation).
- Undo and redo, kept in memory for the open board (up to 50 steps), like the canvas panel.
- Pointer events, so mouse, touch and pen work. Keyboard: tool shortcuts, Ctrl+Z / Ctrl+Y, Delete. Screen readers get the list of typed text and shapes.
- Drawn on an SVG or canvas layer with our own code. No new library: tldraw needs a commercial licence, Excalidraw is about 1 MB more to load (both from memory, not checked today).

### Data model (vault, per conversation)

- New optional field on the conversation, beside `canvas`: `whiteboard?: { version: 1; width: number; height: number; elements: Element[] }`.
- Element kinds: `stroke` (points, colour, width), `rect`, `ellipse`, `diamond`, `line`, `arrow` (from and to points or shape ids), `text`, `sticky`. Each has an id and a creation order.
- Stored as data, never as a picture. The vault already refuses any conversation with a `data:image` URL (`containsImageData` in `src/saved-conversation.ts`). Storing the scene keeps that rule.
- Limits so a board stays small: for example 2,000 elements, 50,000 points, 200 KB of JSON (to be set). Strokes are thinned before saving.
- Saved and synced with the conversation, encrypted like the rest of the vault. Deleting the conversation deletes the board.

### Export and sending

- On "Ask about this board": draw the scene on a white canvas, crop to the content plus a margin, scale to 1,500 px (or 1,000) on the long side, encode JPEG with the existing steps (under 280,000 bytes; these boards were 8 to 36 KB as JPEG at 1,000 px).
- The user sees the exact picture and the typed text before sending, as with a photo question.
- The message carries the user's question, then "Typed text on the whiteboard: ..." and the picture. Counted as an image request (2 units today).
- After sending, the chat keeps the question, the answer and a line such as "[Whiteboard picture: sent once]". The board itself stays in the conversation and can be edited and sent again.
- Download as PNG for the user, made on the device.

### Privacy

- The board never goes to CometRow's server in readable form. It lives in the encrypted vault on the device and, with sync on, as encrypted vault data.
- The picture is made on the device and sent once inside the same sealed request as any chat message: encrypted to the attested Privatemode service; the relay only passes encrypted bytes on.
- Same rules as photo questions: Fast model only, picture not kept by the app after sending. What Privatemode keeps of a picture is still not confirmed (open in `docs/images-20261114.md`).

## Effort (estimated)

| Part | Days |
| --- | --- |
| Board, tools, select and move, undo, touch and keyboard | 3 to 4 |
| Data model, vault save and sync, size limits, schema tests | 1 |
| Export, preview, sending through the image path, allowance | 1 |
| Texts in English and German, privacy wording, accessibility, unit and browser tests | 1.5 to 2 |
| Live check with real boards drawn by hand, doc | 0.5 |
| **Total** | **7 to 8.5** |

## Open decisions for the owner

1. Picture size: 1,500 px (your spec, safer for small writing) or 1,000 px (about 45 % cheaper per question, same accuracy here). Cropping to the content applies either way.
2. Picture format: JPEG through the existing image path (no relay change), or PNG as you wrote (needs a change to the browser check and the relay). JPEG is recommended.
3. Typed text with every board question: yes (recommended, about 40 tokens), or picture only.
4. Allowance: count a board question as an image question (2 units), or its own weight.
5. One board per conversation, or several.
6. Pen colours and sizes, and whether a pixel eraser is wanted.
7. A real handwriting check in the alpha: you draw about 10 boards with finger, mouse and pen, and we compare. This is the main thing this study could not test.

## Files

- `evaluation/whiteboard/render-samples.mjs`: draws the boards (`node evaluation/whiteboard/render-samples.mjs`).
- `evaluation/whiteboard/samples/`: 22 PNGs and their JSON (question, typed text, ground truth, scene). `samples/small/`: 1,000 px PNG and JPEG copies.
- `evaluation/whiteboard/whiteboard-probe.mts`: the live run (one verification per run, results saved as they arrive, running euro stop at EUR 0.15).
- `evaluation/whiteboard/results.jsonl`: every call, including the failed ones.
- `evaluation/whiteboard/scores.json`: the hand scores with reasons. `summarise.mjs` and `summary.json`: the totals above.
- `evaluation/whiteboard/ocr-check.mjs` and `ocr-results.jsonl`: the local OCR check.
