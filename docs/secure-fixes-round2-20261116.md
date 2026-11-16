# Secure fixes, round 2 (16 November 2026, agent B5)

What changed on the App.tsx side so that `inference.secureStore` can be switched on, and which merged components are now wired. No new switch: these are fixes to existing behaviour. Tested offline in Chromium only.

## Secure correctness

- Web search results stay in the open chat (FE-01). A save strips live search results (owner decision of 22 October), so the stored copy always differs from the open chat. Before, the list refresh after every automatic save, a pull from another device and the conflict merge replaced the open chat with the stripped copy: the next answer got no sources, showed raw ids and "Original sources unavailable". Now the open chat is replaced only when the stored copy differs from what this tab last saved or opened (a change from elsewhere). Then `keepLiveSearch` (src/saved-conversation.ts) puts this session's search results back: search attachments by id, each answer's sources by message id, the session flag. Results are still never stored.
- A chat saves by itself only once it has a message (FE-12). Attaching a file alone saves nothing.
- Searches do not count toward the five files (FE-06, src/attachment-limits.ts). A chat keeps its newest five searches; a new one replaces the oldest. Old answers keep their own sources. When "Attach file" or "Photo to text" is off because of the limit, the menu says why under it.
- Conversation files takes dropped files and has the app's own "Choose files" button in the page's language (FE-10). The browser's file field is hidden; its label is unchanged.
- Every `window.confirm` in App.tsx is now the app's own question (FE-14, SS-16, CC-24): discard unsaved changes, stop the answer for a new chat, replace the canvas text, sign out with unsent Secure changes, delete everything on this device. One question at a time; focus starts on Cancel and returns to the opener, or to the message box when the opener is gone. Labels: src/text/questions.ts.
- An ended session (SS-14) goes to `/auth?reason=expired`; the server passes only that value on to the sign-in page, which says "You were signed out. Sign in again to continue." The unsent message is kept in sessionStorage for this tab and the same account, restored once after sign-in, then removed. Never for an incognito chat or a Secure Max chat, because sessionStorage is not encrypted.
- Developer screens (the calculator panel, the token and dollar line) open only in a development build with `?developmentTools` (SS-22, the rule of src/developer-view.ts).
- Settings > Privacy & data shows the Secure summary from src/text/mode-copy.ts while Secure is on (SS-01). The binding summary ("we never can") shows only without Secure. shared/privacy-copy.ts is not edited.

## Wiring

- The answer request loads through `loadInference` (src/LoadBoundary.tsx).
- Storage texts: `storageOf(mode)` gives "local" without Secure, else "secure" or "max". Passed to ScheduledPanel, RememberDialog, ProjectPanel, MemorySettings, SyncSettings, ScheduleCard, both chat lists and CanvasPanel. App texts (project created, changes saved, incognito banner, projects note, appearance note, Saved intro, title note) resolve through `forStorage`. The footer now says "No advertising. No training on your data." in every mode.
- Data controls (src/DataControls.tsx) sit in Settings > Privacy & data while Secure is open: export of the Secure chats, and Delete all chats, which deletes each Secure chat so the deletion reaches every device. Secure Max and the device vault keep their own controls.
- The usage page gets `chatReady` at both places.

## Tests

`tests/secure-store-e2e-ui.test.ts` (search in Secure, sources reach the answer, no raw ids, also after another device changed the chat; Delete all reaching the other device; session expiry; the Secure privacy summary), `tests/files-page-ui.test.ts` (375, 768, 1280 px, English and German), `tests/account-pages-ui.test.ts` (the expiry line), unit tests `tests/live-search-save.test.ts` and `tests/attachment-limits.test.ts`. Tests that answered every browser question with yes use `tests/fixtures/app-questions.ts`, which answers the app's questions the same way.

## Not done

- Not verified on real phones, Safari, Firefox or hosted.
- Playwright specs under tests/browser and the evaluation tours still answer the browser's questions (`page.on("dialog")`) and open `?developmentTools` against a production build: the lead updates them.
- Remove project in the sidebar (WorkspaceNavigation.tsx) still uses the browser's question: that file belongs to another agent.
