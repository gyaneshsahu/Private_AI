# Image editing (25 November 2026)

**Status:** built on the branch `feat/image-editing`, behind a switch that is off. The image provider is mocked in every test; no live edit was made. Nothing is deployed.

## What a user gets

- Every image in the chat has an **Edit** button; a click on the picture does the same. The picture opens full screen, on phones too, with **Back**.
- At the bottom: the **Describe edits** box. Each edit makes a **new version**. The **version strip** shows all versions; earlier ones stay, any of them can be shown again, downloaded or edited further. A new version always goes to the end.
- **Select area:** draw over a part; the description then changes only that part.
- **Erase:** paint over an object, then **Erase selection**. No text is needed.
- **Resize:** Square, Portrait or Landscape. The picture is extended to the new frame.
- **Zoom:** minus and plus; the picture scrolls when it is larger than the screen.
- **Download** any version. **Delete this version** removes the shown version (never the last one).
- **In the chat:** right after an image, a request like "make the background white" edits that image. The result is a new image in the chat. A question ("What is in this picture?") goes to the chat as before.
- **Your own photo** (its own switch): "+" > **Edit a picture**. A photo with people is refused for now.
- An edit counts as **one image of the day**, the same count as created images. The count is checked once, at the start, and given back if the provider fails.

## Switches

| Where | Switch | Default |
| --- | --- | --- |
| `render-config.json` | `"imageEditing": { "enabled": true }` inside `inference` (needs `imageCreation`) | off |
| | `"uploads": true` in the same object: the user's own photos | off |
| | `"providerMasks": true`: use the provider's own mask addresses (see below) | off |
| Local development | `PRIVATEAI_IMAGE_EDITING=1` (with `PRIVATEAI_IMAGE_CREATION=1`), `PRIVATEAI_IMAGE_UPLOAD_EDITING=1` | off |

`/api/status` then has `imageEditing: { masks, uploads }`. Without the switch there is no Edit button, no menu item and no route.

## What leaves the device, and what is stored

- **To the image provider:** the picture being edited (scaled to at most 1,024 pixels a side, as a JPEG) and the edit's words. For Select area and Erase, only a box around the painted part (see the workaround). Never the chat, never other versions.
- **On our server:** nothing. The picture passes through in memory and the answer goes straight back. One usage record per edit says "image, complete or refused, model"; it holds no picture and no words.
- **In the chat:** every version, as part of the saved chat (encrypted in the vault, or kept with the account in Secure, like created images today).
- **An uploaded photo** is drawn again on the device before anything else happens, which drops its metadata (place, device, time). The people check asks CometRow's own picture model (the confidential model behind "Ask about a picture"), not the image provider.

## Decisions taken (closest to ChatGPT where unclear)

1. **Where versions live:** inside the saved chat, with the image. The shown version is stored once; the others sit beside it. An image keeps at most **12 versions**. A chat's images, versions included, still have to fit the existing limit of 2,000,000 characters of image data (a synced chat is at most 4 MB). In practice that is about 8 to 12 versions per chat. When the room is used up the editor says: "This chat has no room for more images. Delete a version, or start a new chat." Lifting this needs images stored as separate encrypted files, like project files: an owner decision already noted in the code.
2. **Kept versions are JPEGs of at most 1,024 pixels a side.** The original created image is kept exactly as the provider sent it.
3. **A follow-up request makes a new image in the chat**, as in ChatGPT; the chat is the history. The editor's strip shows the versions made inside the editor for that image.
4. **Which chat messages are edits** is decided on the device by a short list of rules (English and German), only when the last message is an image. In doubt it is a normal message. ChatGPT lets its model decide; a second model request per message would cost allowance.
5. **Masks (the provider question).** FLUX.2, the model in use, has no mask field. Black Forest Labs offers masks only on two other addresses (`flux-pro-1.0-fill`, `flux-tools/erase-v1`), and it is not documented whether the EU address serves them. So:
   - **Default, the workaround:** the browser cuts a box around the painted area (the area plus about a third on each side, at least 384 pixels), sends only that box with the words, and pastes the answer back **through the painted area** with a soft edge. Every pixel outside the painted area stays exactly as it was; a browser test checks this pixel by pixel. For Erase the painted area is filled with flat magenta in the box and the instruction is "remove the solid magenta shape".
   - **`providerMasks: true`:** the whole picture and a mask (white = may change) go to the provider's two mask addresses. Built and tested against a fake API; to be switched on only after one live check on the EU address.
6. **Remove background is not built.** The provider has no background-removal address, and a described edit ("plain white background") is not the same thing; the user can type that into Describe edits.
7. **"No comments"** is read as: no commenting feature on images. None is built.
8. **People in uploaded photos.** Two checks before anything reaches the image provider: the browser's own face finder where it exists (most browsers have none), then one YES or NO question to CometRow's own picture model. "YES" and "no clear answer" both refuse the photo. Where picture questions are switched off, uploaded photos cannot be edited at all. The check counts as one picture question (2 units). It can miss a person; it is a filter, not proof.
9. **Our own refusals** (real, named people; minors with harmful content) run on every edit's words, as for created images.
10. **`uploads: false` is a screen switch first.** It removes "Edit a picture" and the server refuses a request marked as an upload. The server cannot tell a photo from a created image by looking at it, so a changed browser could send a photo marked as created. The same is true of the people check: it runs in the browser. Both are filters for honest use, not barriers.
11. **Regenerate** shows only on an image that was created from a description, not on an uploaded photo, a follow-up edit or a later version.
12. **Painting needs a pointer** (mouse, finger or pen). With the keyboard alone every other function works, but an area cannot be painted. Not solved in this pass.

## For the owner before switching on

- **Black Forest Labs may train on what is sent** (their EU API terms, 26 August 2026). With editing on, that includes the pictures being edited. For created images that is the model's own output. For **uploaded photos it is the user's own picture**: keep `uploads` off until a no-training provider is live (the branch `feat/image-provider-eu`) or their opt-out is confirmed in writing.
- **Older decision touched:** "Images are never stored after the answer" (13 November) was written for picture questions. An uploaded photo that is edited is kept in the chat as its first version, like every created image. Confirm before switching uploads on.
- **Privacy Policy:** the image section needs one more sentence. Draft for the lawyer, English: "When you edit an image, the picture you edit and your description are sent to our image provider to make the new version. We do not keep either on our servers; the versions are saved with your chat." German: „Wenn Sie ein Bild bearbeiten, werden das bearbeitete Bild und Ihre Beschreibung an unseren Bilddienst gesendet, um die neue Version zu erstellen. Wir speichern beides nicht auf unseren Servern; die Versionen werden mit Ihrem Chat gespeichert.“
- **Saved format:** a chat that holds versions cannot be read by an app build from before this feature (the same accepted limit as in decision 19 of 16 November).

## Files

New: `shared/image-edit.ts`, `server/image-edit.ts`, `src/image-edit/` (editor, versions, geometry, pixels, request, follow-up, people, host, styles), `src/text/image-edit.ts`, three test files.
Changed, a few lines each: `server/app.ts` (config field, status field, route mount), `server/deployment-config.ts`, `server/consumer-workspace.ts`, `server/index.ts`, `server/render-bridge.ts` (body size and quiet time for the route), `shared/contracts.ts`, `src/saved-conversation.ts`, `src/CreateImage.tsx` (Edit button, versions counted), `src/ChatMessage.tsx` (one prop), `src/App.tsx` (one hook, four call sites), `evaluation/audit-harness.ts` and `evaluation/audit-fakes.ts` (the feature in the all-on tour).

## Tests

- `tests/image-edit.test.ts` (6): the switch, the route, the day's count, refusals, masks honoured or refused, uploads, the Black Forest Labs editor against a fake API.
- `tests/image-edit-logic.test.ts` (10): versions, the saved format, follow-up detection in English and German, the box arithmetic, the people verdict.
- `tests/image-edit-ui.test.ts` (16): the real app at 375 and 1,280 pixels, English and German.

## Live check (25 November 2026, made-up content, about USD 0.10 in total)

Six paid requests at Black Forest Labs' EU address with the 4B model, through this branch's adapter:
- **Create, then a described edit** ("Make the wall behind the table dark green"): accepted; the picture went as base64 in `input_image`, which their pages do not document. Only the wall changed.
- **Resize to Portrait:** the picture was extended above and below; the objects stayed as they were.
- **Erase, in the real editor in a real browser** (an apple painted over): the box with the magenta area went out, the apple was gone in the result, and everything outside the painted area was untouched (its reflection on the table stayed, because it was not painted over).
- **Select area** (a cup painted over, "a small green plant in a terracotta pot"): the plant replaced the cup inside the area only.
- Seen: a faint lighter box on the plain wall at the edge of the painted area. It is a small difference in brightness, which a soft edge can hide only in part. The edge is now 8 pixels on a 1,024-pixel picture.
- Not tried live: `providerMasks` (the provider's own mask addresses), and the 4B model's limits on large or busy pictures.

## Not verified

- A real phone: painting with a finger, pinch gestures, the on-screen keyboard over the Describe edits box.
- Screen readers in the editor (the automated accessibility check passes on the card and the editor, phone and desktop, English and German).
- The people check with the real picture model (tests use fixed YES and NO answers).
