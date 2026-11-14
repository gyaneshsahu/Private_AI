# Large documents: questions about a long PDF or Word file (14 November 2026)

Owner's request: a user should be able to upload, for example, a 100-page PDF or a long Word file and ask questions about it, without the whole text going out with every question and without many requests. The owner suggested summaries, for big files only.

## What the app did before

It sent the whole text. Each PDF page became one "source passage", every other file one. With each question, every source of every selected attachment went to the model in one block. Nothing chose among passages. Three limits applied: 10 MB per file, 20 PDF pages, 60,000 characters per file. A file over a limit was refused, never cut short.

One thing was found on the way. The request itself is limited to 32,000 characters (`maxInputCharacters` in the report), and the instructions use about 4,000 of them. So a file between about 27,000 and 60,000 characters was accepted and then could not be sent: the user saw "Selected context is too large". This is still so (see "Decisions for the owner", point 2).

## The three options

(a) Passage search on the device. The whole text stays on the device, cut into passages. For each question the device picks the passages that share the most telling words with the question and sends only those. No model, no network, no new dependency. One question is one request.

(b) Summaries. The model summarises each part once, the summaries stay on the device, and answers come from the summaries. A 400,000-character document needs about 17 requests to read once (at about 24,000 characters each), plus one more to combine them. That is about 100,000 to 130,000 Privatemode tokens for one document, 2 to 3 percent of the whole 5 million free budget, and 18 allowance units in Fast or 90 in Thinking, before the first answer. It takes minutes. And a summary loses exactly what people ask a long document about: one figure, one deadline, one clause.

(c) A hybrid. (a) by default, and a separate "Summarise the whole document" button that says first how many requests it will use and asks for a yes.

## Decision

(a) is built and is the default. (c)'s button is not built; it is the right next step if invitees ask for whole-document summaries. (b) as the default is rejected for cost, time and lost detail.

Why (a) fits this code: a "source" with an id, a title, a page and a text already exists, the model is already told to cite `[source-id]` with pages, each answer already keeps a copy of the sources it was given, and the context review already lists "source passages" per attachment. A large document is the same thing with more, smaller sources and one extra step that chooses among them. No server change was needed and none was made.

## How it works

1. Reading. A PDF, Word (`.docx`) or plain text file (`.txt`, `.md`, `.markdown`) with more than 60,000 characters is no longer refused, up to 500,000 characters. Spreadsheets, CSV, JSON and code keep the 60,000 limit: they are not prose, and word search over rows without their headers gives poor answers.
2. Passages. The text is cut into passages of at most 1,200 characters, at a paragraph break if there is one, else at a line break, a sentence end or a space. A PDF passage keeps its page number. Nothing but white space is dropped. The attachment is marked `large`.
3. Choosing. For each question the device ranks all passages of the selected large documents with BM25, a standard word-overlap formula from search engines. German and English are treated alike: case, umlauts and ß are folded ("Kuendigung" finds "Kündigung", "Verträge" finds "Vertrag"), one common ending is removed, common words are ignored, and a word of five letters or more also finds compounds that contain it ("Frist" finds "Kündigungsfrist"), at half strength. Words of the question before count half, so a short follow-up keeps its topic.
4. Budget. At most 14,000 characters of passages are sent with one question, over all large documents together (about 12 to 20 passages). The number is fixed, so the cost of a question does not grow with the document. Passages much weaker than the best one are left out even when there is room.
5. Sending. Only the chosen passages are masked for identifiers and put into the request. The rest of the document is not touched at that step and never leaves the device.
6. Telling the user. Before sending, the context review shows, for the draft as typed: "For this question, 9 of 412 passages from "X" are sent (pages 3, 17, 42-43), chosen on this device to match the question. The other 403 passages are not sent." Under each answer the same sentence is kept in the past tense. If no passage shares a word with the question, the first passages of the document are sent and the note says so and suggests asking with words that occur in the document. The attachment itself carries a note that it is a large document and how it is used.

Small files work as before: at or under 60,000 characters nothing is cut into passages and everything selected is sent. One side effect: a PDF with 21 to 150 pages and little text (60,000 characters or less) is now accepted as an ordinary attachment.

## Limits and why

| Limit | Before | Now | Why |
| --- | --- | --- | --- |
| File size | 10 MB | 10 MB | Unchanged; see "Decisions for the owner", point 3 |
| PDF pages | 20 | 150 | Covers a 100-page document with room; reading time is the bound, not memory |
| Characters, PDF, Word, plain text | 60,000 | 500,000 | About 150 dense pages. 500,000 characters are about 1 MB in memory and about 1 MB in the encrypted vault per document |
| Characters, spreadsheets, CSV, data, code | 60,000 | 60,000 | Unchanged |
| Scanned PDF read by OCR | first 5 pages | first 5 pages | Unchanged |
| Sent with one question from large documents | does not apply | 14,000 characters | Leaves about 12,000 of the 32,000 for earlier messages |

Measured in Node on the development machine:

- Reading a 150-page text PDF (474,433 characters, made by a script, one standard font, no images) with the same pdfjs calls: 0.16 to 0.24 seconds.
- Choosing passages among 420 passages (366,867 characters): 15 milliseconds for the first question (the words are counted once), under 1 millisecond for each later one.

Not measured: a phone, a real browser, and real PDFs. Real PDFs with embedded fonts, columns and many small text pieces are much slower per page than the synthetic one. The 90-second limit still applies and ends the reading with the existing "took too long" message. If a real 100-page PDF on a mid-range phone comes near it, lower the page limit; that is one constant.

## Cost

One question is one request and the same allowance units as today (Fast 1, Thinking 5). No request is made when a file is added. A question about a large document sends at most 14,000 characters of passages, about 4,000 to 5,000 tokens, less than a 25,000-character file sends today with every question.

## Privacy

Nothing new goes to the server. The file is read on the device, kept on the device (in memory, and in the encrypted vault when the user saves the conversation), ranked on the device. The request is encrypted as before; the server does not see the question, the passages or which were chosen. Identifier masking runs on the chosen passages exactly as on any attachment text.

## Built, and the switch

Built end to end and switched on: `LARGE_DOCUMENTS` in `src/document-formats.ts`. Setting it to `false` brings back the old limits (60,000 characters for every file, 20 PDF pages); the limits text in `src/text/app.ts` must then be changed back by hand. Large documents saved while it was on keep working.

- `src/passage-retrieval.ts`: cutting into passages, the word rules, the ranking.
- `src/conversation.ts`: `selectedSources` returns only the chosen passages of a large document; `withChosenPassages`; `passageNotes`.
- `src/documents.ts`, `src/extraction.worker.ts`, `src/docx.ts`, `src/document-formats.ts`: the higher limits for this path.
- `src/verified-chat.ts` (one line): reduce to the chosen passages before masking.
- `src/App.tsx` (three small places), `src/ContextReview.tsx`: the notes.
- `shared/contracts.ts`, `src/saved-conversation.ts`: the `large` mark and the note under an answer are saved.

## Not built

- "Summarise the whole document" (option c). Until then, "summarise this document" on a large document gets the passages that share words with the request, or the first passages, and the note says which. The answer is then a summary of those passages only.
- Neighbouring passages are not added around a hit. A fact that needs the paragraph before it can be missed.
- No synonyms and no meaning search. "Wie viel Miete" does not find a passage that says only "Mietzins" because no word matches (with its ending removed, "Miete" is "Miet", four letters, and the compound rule needs five). An embedding model on the device would fix this and would be a new dependency and a download; not proposed for the alpha.
- Spreadsheets and CSV as large documents.
- Scanned PDFs beyond 5 pages.
- A switch the owner can set without a code change (the checklist asks for "own switch" per feature).

## Not verified

- No real browser and no phone. The automated browser tests were not run (they start the development server, which was not allowed in this session).
- No real-world PDF or Word file. All tests use text made by the tests.
- No live model call: whether the model answers well from the chosen passages is not tested. The tests show that the right passage is chosen and sent.
- Reading time and memory for a 100-page PDF on a phone.
- The attachment panel lists every passage (up to about 500 lines); how that feels on a phone is not checked.
- The vault backup is limited to 16 MB in total. A few saved conversations with large documents (about 1 MB each) bring it closer; not tested.

## Decisions for the owner

1. Leave the switch on for the alpha, or turn it off until one real 100-page PDF has been tried on a phone.
2. Where the passage path starts. It starts above 60,000 characters, as asked ("only above the current limits"). But files between about 27,000 and 60,000 characters are accepted today and then cannot be sent within the 32,000-character input limit. Lowering the start to about 20,000 characters would make those files usable; it changes behaviour for files that fit today only in a report with a larger input limit. Recommended: lower it, after point 1.
3. The 10 MB file limit. A 100-page PDF with pictures is often larger. Raising it is one constant in two places, but memory on a phone is not measured.
4. Whether to build the "Summarise the whole document" button, with its stated cost (about 18 requests for a 400,000-character document).
5. K3 proposes weight 2 for a file question. A question about a large document sends less text than a mid-sized file does today, so weight 1 is defensible; the owner sets it.
