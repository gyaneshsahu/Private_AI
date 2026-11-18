# Whiteboard next to the chat (17 November 2026)

Owner's brief, 17 November: "Whiteboard" in the left menu with Incognito and Secure Max, also in "+" and during a chat; the chat stays on the left, the board on the right; light and dark. After the mock (`evaluation/ui-redesign/whiteboard-side-mock.html`): no send button on the board, the user asks about it in the chat; the board stays in the chat as a card that opens it again; a button at the top right opens a panel with everything in the chat (whiteboard, canvas, created images, files) to open or download again.

Status: **built behind the build switch `VITE_WHITEBOARD` (off unless set), tested with fake answers only. No live model call.**

## How it works

- **One board per chat**, stored in the chat itself (`Conversation.board`, `shared/whiteboard.ts`) as a small vector scene: pen strokes, boxes, arrows, text and notes, colours as theme indexes so it reads in light and dark. It is saved and synced with the chat, encrypted exactly like the rest of that chat: in Secure mode (the default) with the key CometRow holds for the account, in Secure Max end-to-end with a key only the user's devices have. No new server route or table. Limits: 2,000 items, 4,000 numbers per stroke, 500 characters per text, 1 MB for the whole board.
- **Asking about it:** when the board has changed since it last went with a question, a chip in the message box says "Whiteboard goes with your question" (its "x" skips it for this version). On Send, the board is drawn as a JPEG (dark on white, 1568 x 980 at most, under the picture size limit) and goes through the existing picture path, like a photo question: Secure mode, the same model, the same picture allowance (2 units). Its typed words go with it as text. The picture itself is not kept; later turns know only that the board was attached and its typed words.
- **In the chat:** the question shows a "Whiteboard" card; clicking it opens the board.
- **Layout:** from 1,100 px the board takes about 56 % of the space beside the menu; below that it covers the chat and a Chat | Whiteboard switch at the top shows one or the other while the board stays open.
- **"In this chat"** (button at the top right of a chat): whiteboard (open, download as a picture), canvas (open, download as `.md`), created images (show in chat, download), files (open the files screen). Files keep only their text and photos asked about are not kept, so those cannot be downloaded again; the panel says so.

## Tests

`tests/whiteboard.test.ts` (scene, limits, typed words, saving, sync merge), `tests/whiteboard-render.test.ts`, `tests/whiteboard-ui.test.ts` (drawing surface alone in Chromium: every tool, undo, clear, touch at 375 px, light and dark), `tests/outputs.test.ts`, `tests/outputs-panel-ui.test.ts`, and in the real app `tests/redesign-ui.test.ts` "whiteboard next to the chat" (left menu, "+", the board goes once as a picture, the chip's "x", the card, "In this chat", phone switch, dark).

## Not verified / later

- Safari and iPhone not tested (typing into text and notes on the board, drawing the board into a picture). Only Chromium.
- No zoom or pan: on a phone, board text is small. Pinch-zoom is on the build-later list (`docs/ui-redesign-plan-20261116.md`, "Build later"); real-device checks are T-158 to T-161 in `docs/owner-test-list.md`. The board keeps its 16:10 shape, so a tall panel has empty space above and below.
- If the board was changed on two devices at the same time, the later sync wins whole (as with the canvas).
- Created images still live inside the chat (a budget of about 4 to 10 images per chat keeps it under the 4 MiB sync limit); storing them as encrypted blobs like project files would lift that (owner decision).
