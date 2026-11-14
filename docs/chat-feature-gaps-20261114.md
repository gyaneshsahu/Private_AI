# Chat interface: what users expect, what CometRow has, and the gaps (14 November 2026)

Research and code audit only. No code was changed, no tests or builds were run, nothing was started. Line numbers refer to the working tree on branch `codex/development-handoff` on 14 November.

**How to read the sources in part 1**

- **M** = from memory of the three products. Not checked today. Details can be out of date.
- **P** = checked today on a public page, fetched in full. The page is listed in section 1.3.
- **S** = seen today only as a search-result snippet. The OpenAI help centre refused every automated fetch (HTTP 403), so every ChatGPT line marked S should be opened by hand before anyone relies on it.

**Short answer.** CometRow is strong where the big products are weak (explicit context, on-device files, branches that never lose an answer, incognito, citations). It is weak in the small composer and message habits that people use fifty times a day: Enter to send, the view following the answer, edit and send in one step, retry on the answer with its cost, paste and drop, and a delete that asks first. Most of these are small. Section 3 ranks them and section 4 splits them into packages.

## 1. What the leading chat products offer

### 1.1 Feature list

| # | Feature | What a user expects in 2026 | Differences that matter | Source |
| --- | --- | --- | --- | --- |
| 1 | Collapse long user messages | A long own message is cut after some lines with "Show more" and "Show less". Answers are never collapsed. | ChatGPT and Claude collapse long user messages. Gemini clamps the prompt to a few lines with an expand arrow. Claude also turns a very long paste into a "pasted" attachment chip instead of text. No vendor documents a threshold. | M. Nothing found on a public page |
| 2 | Copy message | A copy icon under every answer, and on the user's own message. Short "Copied" confirmation at the button. | All three the same. Copy gives Markdown source in ChatGPT and Claude. | M |
| 3 | Copy code, language label | Each code block has a header with the language name and a "Copy" button. Syntax colours. | ChatGPT has a shortcut for "copy last code block" (Ctrl/Cmd+Shift+;). | M; shortcut S (O-RN) |
| 4 | Edit and resend | Pencil on the own message, edit in place, "Send". The answer is regenerated at once. Older versions stay reachable through "2 / 2" arrows at that message. | ChatGPT: pencil on hover, long-press on mobile, plus "Branch in new chat" in the answer menu. Gemini: "Edit text", then "Update"; also "Branch in a new chat". Claude: edit in place with version arrows. | ChatGPT S (O-RN); Gemini P (G-Use, G-Chats); Claude M |
| 5 | Regenerate, answer versions | A retry icon under the newest answer. Versions switch with arrows. | ChatGPT: the retry menu offers another model or more thinking. Gemini: "Regenerate" only on the newest answer, arrows between drafts. Claude: "Retry" with version arrows. | ChatGPT S (O-RN); Gemini P (G-Regen); Claude M |
| 6 | Stop generating | The send button turns into a stop button while the answer streams. The partial answer stays visible. | Same in all three. | M |
| 7 | Feedback | Thumbs up and down under each answer. Thumbs down asks for a reason and a comment. | The feedback sends the whole conversation to the vendor. Claude keeps it up to 5 years and may train on it. Gemini attaches the conversation and has no feedback in temporary chats. | Gemini P and S; Claude S (privacy centre); ChatGPT S |
| 8 | Read aloud | A speaker button on each answer. | ChatGPT "Read aloud" and Gemini "Listen" use cloud voices. Claude has a voice mode; a per-message button was not found on a public page. | S |
| 9 | Share or copy a conversation | "Share" makes a public link to a snapshot. | All three: anyone with the link can read it; later messages are not included; the link can be deleted. Claude leaves attached files out. None has a documented "copy whole conversation as text". | Claude P (C-Share); ChatGPT S; Gemini S |
| 10 | Scroll and auto-scroll | The view follows the answer while it streams. It stops following as soon as the user scrolls up. A round "down arrow" button floats above the composer when the user is not at the bottom. | Same in all three. | M |
| 11 | Enter and Shift+Enter | Desktop: Enter sends, Shift+Enter makes a new line. Phone: Enter makes a new line and the send button sends. | Same in all three. Not documented on any help page. | M |
| 12 | Unsent drafts | Text typed but not sent is still there after switching to another chat and back. | ChatGPT and Claude keep a draft per conversation in the browser. Gemini is less reliable. | M. Nothing found |
| 13 | Paste and drag-and-drop | Paste a screenshot from the clipboard. Drag files onto the window; a drop zone lights up. | Claude: "+" button, drag and drop, paste images; 20 files per chat. Gemini: up to 10 files per prompt. | Claude P (C-Up); Gemini S; ChatGPT M |
| 14 | File chips | Each attached file is a chip above the composer with name, type, a small preview and an "x" to remove it before sending. | Same in all three. | M |
| 15 | Message timestamps | Mostly absent. ChatGPT and Claude show no time per message; the sidebar groups chats by date instead. | Not a strong expectation. | M |
| 16 | Conversation list | Sidebar with new chat, search, rename, delete, pin, archive, grouping by "Today, Yesterday, Previous 7 days", and projects. | ChatGPT: search with Ctrl/Cmd+K over titles and text; archive; projects. Gemini: search, pin, rename, delete. Claude: rename, delete, bulk select; star. No product documents an undo after delete. | Gemini P (G-Chats); Claude P (C-Del); ChatGPT S |
| 17 | Temporary or incognito chat | One button for a chat that is not kept in history. | ChatGPT "Temporary Chat": copy kept up to 30 days. Gemini "Temporary chat": kept 72 hours. Claude "Incognito chat": kept 30 days, still reads profile preferences. In all three the server keeps the chat for a while. | Claude P (C-Inc); Gemini P and S; ChatGPT S |
| 18 | Export of data | Settings has "Export data"; a file arrives by email. | ChatGPT: ZIP by email. Claude: link valid 24 hours, files left out. | S |
| 19 | Custom instructions | A settings field: "what should the assistant know about you" and "how should it answer". Applies to every chat. | ChatGPT adds style presets. Gemini calls it instructions or saved info. Claude has profile preferences and styles. | S |
| 20 | Themes | System, light, dark. | Same. | Gemini S; others M |
| 21 | Rendering | Markdown, tables that scroll sideways, lists, clickable links, math, code with colours. | Same. | M |
| 22 | Streaming, loading, empty, error | A pulsing dot or "Thinking" line before the first word. A clear error under the failed answer with a "Retry" button right there. | Same. | M |
| 23 | Suggested prompts | A few starter cards on the empty screen. Some products add follow-up suggestions under an answer. | Gemini and ChatGPT generate follow-ups with the model. Claude shows static categories. | M |
| 24 | Keyboard shortcuts | A shortcuts dialog (Ctrl/Cmd+/ in ChatGPT): new chat, focus the composer, copy last answer, toggle sidebar, search. | Only ChatGPT documents a list. | ChatGPT S (O-RN); others not found |
| 25 | Accessibility | Focus returns to the composer after sending. A screen reader is told when the answer is complete. Reduced motion is honoured. | No vendor publishes an accessibility statement for the chat screen. | M. Nothing found |
| 26 | Mobile | Safe areas respected, composer stays above the keyboard, 44 px targets, long-press on a message opens copy and edit, pull-to-refresh does not reload the chat by accident. | ChatGPT mobile web uses long-press for edit. | M; long-press S |
| 27 | Limit feedback in the composer | A notice near the composer when a message is too long or when few messages are left in the period. | Claude shows usage bars in settings and a notice at the limit. ChatGPT shows a notice with the reset time. | Claude P (C-Lim); ChatGPT S |
| 28 | Model or mode picker | A picker in or near the composer. | Names change often and were not reliably readable today. | P and S, not relied on |
| 29 | Attachment previews | Thumbnail for images, an icon and page count for documents, click to open. | Same. | M |
| 30 | Citations | Inline source chips in the answer and a "Sources" list at the end or in a side panel. | Same idea in all three. | M |
| 31 | Continue generating | Was a button for cut-off answers in ChatGPT in 2023. Today long answers rarely cut off; Claude summarises old messages instead. | No current product documents a "continue" button. | ChatGPT S (2023 note); Claude P (C-Lim) |
| 32 | Message actions placement | A row of small icons under each answer. On the user's own message the icons appear on hover or by long-press. A "..." menu holds the rare actions. | Same. | M |
| 33 | Undo for destructive actions | A confirm dialog before deleting a chat. Archive is offered as the soft choice. | No product documents an undo. | P for Gemini and Claude delete pages (no undo mentioned) |
| 34 | Offline or connection lost | A banner or an error on the message with "Retry". The typed text is not lost. | Not documented. | M. Nothing found |

### 1.2 Thresholds for collapsing (question a, research part)

No vendor publishes a number. From memory: ChatGPT and Claude cut a user message after roughly 6 to 10 lines; Gemini after about 3 to 4 lines on a phone; Claude turns a paste of several thousand characters into an attachment chip. Treat these as rough.

### 1.3 Pages checked on 14 November 2026

Fetched in full (P):

- G-Use: "Use Gemini Apps", https://support.google.com/gemini/answer/13275745?hl=en&co=GENIE.Platform%3DDesktop
- G-Regen: "Regenerate or modify responses from Gemini Apps", https://support.google.com/gemini/answer/14262426?hl=en&co=GENIE.Platform%3DDesktop
- G-Chats: "Find & manage your recent chats in Gemini Apps", https://support.google.com/gemini/answer/13666746?hl=en&co=GENIE.Platform%3DDesktop
- G-RN: "Gemini release notes", https://gemini.google/release-notes/ (first half only)
- C-RN: "Release notes", https://support.claude.com/en/articles/12138966-release-notes
- C-Lim: "How do usage and length limits work?", https://support.claude.com/en/articles/11647753-how-do-usage-and-length-limits-work
- C-Share: "Public links for shared chats", https://support.claude.com/en/articles/16762437-public-links-for-shared-chats
- C-Inc: "Use incognito chats", https://support.claude.com/en/articles/12260368-use-incognito-chats
- C-Del: "Delete or rename a conversation", https://support.claude.com/en/articles/8230524-delete-or-rename-a-conversation
- C-Up: "Upload files to Claude", https://support.claude.com/en/articles/8241126-upload-files-to-claude

Seen as search snippets only (S):

- O-RN: "ChatGPT release notes", https://help.openai.com/en/articles/6825453-chatgpt-release-notes
- "ChatGPT Shared Links FAQ", https://help.openai.com/en/articles/7925741-chatgpt-shared-links-faq
- "Temporary Chat FAQ", https://help.openai.com/en/articles/8914046-temporary-chat-faq
- "Exporting your ChatGPT history and data", https://help.openai.com/en/articles/7260999-how-do-i-export-my-chatgpt-history-and-data
- "Deleting and archiving chats in ChatGPT", https://help.openai.com/en/articles/8809935-deleting-and-archiving-chats-in-chatgpt
- "ChatGPT iOS and Android app FAQ", https://help.openai.com/en/articles/8142208-chatgpt-ios-and-android-app-faq
- "File Uploads FAQ", https://help.openai.com/en/articles/8555545-file-uploads-faq
- "Is my data used for model training?" (Claude feedback retention), https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training
- "Send feedback or report a problem with Gemini Apps", https://support.google.com/gemini/answer/13275746?hl=en&co=GENIE.Platform%3DAndroid
- "Share your chats from Gemini Apps", https://support.google.com/gemini/answer/13743730?hl=en&co=GENIE.Platform%3DDesktop
- "Export your Claude data", https://support.claude.com/en/articles/9450526-export-your-claude-data

Not found on any public page: collapse thresholds, Enter behaviour, draft keeping, timestamps, undo, offline banners, accessibility statements.

## 2. What CometRow has today

Constraints that explain deliberate absences:

- **Nothing is stored on the server.** Saved conversations live in an encrypted vault in the browser. Saving is an explicit action. A temporary chat is gone on reload.
- **Each sent message costs allowance units:** 1 for Fast, 5 for Thinking (the cost comes from `allowanceCost` in the qualification report). A message the provider refused before any reply does not use a second unit if the same account sends again in the same mode within one minute (`server/app.ts:413` to `418`; held in memory, so a server restart in that minute counts it twice). A retry after a completed or cut-off answer is a new request at full cost.
- **Identifier masking** runs inside the send path for every message of the request (`src/verified-chat.ts:365`). Any feature that sends through `send()` in `src/App.tsx:640` is masked without extra work.
- **Incomplete attempts are excluded from context.** A stopped or failed answer keeps status `partial` and is not sent again (`src/App.tsx:818` to `840`).
- **Branches exist.** Editing or retrying never overwrites: the old sequence is kept as a branch, up to 20 per conversation (`src/conversation-branches.ts`). Labels are "Original", "Edit 1", "Retry 2". The panel is "Conversation branches" ("Zweige der Unterhaltung"), `src/ConversationBranches.tsx`.

| # | Feature | Status | Where and how; what is missing |
| --- | --- | --- | --- |
| 1 | Collapse long user messages | Absent | Messages render in full (`src/App.tsx:1808` to `1935`). No clamp in `src/chat-design.css` or `src/styles.css`. |
| 2 | Copy message | Partly | "Copy answer" on assistant messages only (`App.tsx:1909` to `1919`, `copyAnswer` at `512`). It copies the raw Markdown. The confirmation is the page notice at the top of the screen, not at the button. No copy on the user's own message. |
| 3 | Copy code, language label | Present | `src/CodeBlock.tsx`: language name or "Code", copy button, off until the answer is complete, status line under the block. No syntax colours. |
| 4 | Edit and resend | Partly | "Edit" on each user message (`App.tsx:1895` to `1908`) opens a panel **below the whole message list** (`1938` to `1982`). "Create branch" makes branch "Edit N" but **sends nothing**; the user must then press "Answer this question" under the composer (`2313` to `2326`). Versions are switched in the branches panel above the messages, not with arrows at the message. |
| 5 | Regenerate, versions | Partly | "Retry last response" under the composer (`2313` to `2326`), not on the answer. It makes branch "Retry N" (`lastQuestion`, `617` to `633`), so the old answer is kept. "Answer again with Thinking" appears after a Fast answer (`2328` to `2342`). The cost is not shown: only a hover title "Starts a new request and may incur another charge", which a touch screen never shows. |
| 6 | Stop generating | Present | The send button becomes "Stop response" (`2269` to `2276`); a second "Stop" sits in the progress line (`1716` to `1723`). The partial text stays, marked "Incomplete · excluded from context". |
| 7 | Feedback | Absent | No thumbs. The Help tab builds a content-free support note the user copies into an email (`src/SupportPanel.tsx`, `src/support-report.ts`). |
| 8 | Read aloud | Present, off by default | `src/ReadAloudButton.tsx`, on-device voices only, with pause. Build switch `VITE_READ_ALOUD`. |
| 9 | Share or copy a conversation | Partly | "Share" is a disabled "Coming later" button in the header and the menu (`1602` to `1611`, `1621` to `1624`). Whole-conversation PDF export exists behind `VITE_PDF_EXPORT` (`src/PdfExportButton.tsx`, menu at `1628`). No "copy conversation as text". |
| 10 | Scroll and auto-scroll | Partly | "Jump to latest ↓" is a text link in the header, always shown (`1584` to `1599`). Auto-scroll runs only when the **number** of messages changes (`479` to `486`). Streamed text is appended to an existing message (`712` to `721`), so by the code the view does not follow a long answer. There is no "stop following when the user scrolls up" and no floating button. Not checked in a browser. |
| 11 | Enter and Shift+Enter | Absent | The composer textarea has no key handler (`2106` to `2118`). Enter always makes a new line, on every device. Sending needs the Send button. There is no Ctrl+Enter either. Right for phones, a gap on desktop. |
| 12 | Unsent drafts | Partly, by design | The draft is part of the open conversation and of each branch. It is saved only with an explicit encrypted save (`draft: input` at `1102`, restored at `1309` and `1797`). A reload of a temporary chat loses it; the browser warns first (`362`). |
| 13 | Paste and drag-and-drop | Absent | No `onPaste`, `onDrop` or `onDragOver` anywhere in `src/`. Files come in through the file picker (`2120` to `2132`), "Photo to text" and the Context tab. Because nothing handles a drop, a file dropped on the window makes the browser open that file and leave the app. |
| 14 | File chips with remove | Partly | Chips under the composer show name, "Included" or "Excluded" and "Review" (`2291` to `2312`). No remove on the chip; removal is in the Context tab. |
| 15 | Message timestamps | Partly | Every message stores its time (`at`, `shared/contracts.ts:409`, set in `src/conversation.ts:282`). The chat does not show it. It drives disappearing messages. The saved list shows the conversation date. |
| 16 | Conversation list | Mostly present | Sidebar (`src/WorkspaceNavigation.tsx`): new chat, incognito, search in the vault, projects, pin, archive, move to project. Rename and delete are in the Saved tab (`App.tsx:2838` onward, `src/ConversationLibrary.tsx`) with sort by newest, oldest, title. Missing: grouping by date, rename in place. Only saved chats are listed, and only while the vault is unlocked. **Delete has no confirmation** (see section 5). |
| 17 | Temporary or incognito | Present, stronger than the others | Every chat is temporary until saved. "Incognito" can never be saved (`tests/browser/incognito.spec.ts`). Disappearing messages after 1 hour, 1 day or 1 week (`1640` to `1667`). |
| 18 | Export of data | Present | Account records file (`src/AccountExport.tsx`), encrypted vault backup (`src/VaultBackup.tsx`), PDF (flag). No plain-text or JSON export of a conversation. |
| 19 | Custom instructions | Absent | Nothing in settings. |
| 20 | Themes | Present | System, light, dark in Settings (`src/appearance.ts`). Language switch DE/EN when the build has `VITE_GERMAN_UI=1`. |
| 21 | Rendering | Present | `src/Answer.tsx`: Markdown with tables in a focusable scroll region, lists, KaTeX in strict mode, code blocks. Links are shown as text with the address in brackets, not clickable; images are replaced by a note. Both are deliberate. User messages go through the same Markdown renderer (see section 5). |
| 22 | Streaming, loading, empty, error | Partly | Progress line with spinner and text ("Preparing private context…", "Still thinking…", "Trying the backup model…") at the **top** of the page (`1716`). Failed answers carry a reason line (`1864`). Missing: an indicator at the answer itself before the first word, and a "Retry" button on the failed answer. |
| 23 | Suggested prompts | Present | Three static starters on the empty screen (`1761` to `1785`). They fill the draft; nothing is sent. |
| 24 | Keyboard shortcuts | Absent | Only Escape and Tab handling inside dialogs. No shortcuts, no help list. |
| 25 | Accessibility | Partly | Good: labelled message articles (`1812`), focus kept inside dialogs and returned to the trigger (`142` to `177`, `376` to `399`), `role="status"` on notices, reduced motion in both style sheets, contrast and focus rings checked by the sweep and by `tests/text-contrast.test.ts`. Missing: no announcement when an answer is complete; after Send the focused button is replaced by "Stop response", so keyboard focus is probably lost (not checked in a browser). |
| 26 | Mobile | Partly | `100dvh` layout, safe-area padding on the composer dock (`chat-design.css:865`), 44 px targets below 760 px, `overscroll-behavior-y: contain` (`styles.css:95`). No long-press menus (not needed while actions are always visible). No handling of the on-screen keyboard beyond `dvh` and the sticky dock. |
| 27 | Limit feedback | Partly | The textarea has `maxLength={20000}` (`2111`) with no counter and no message: a longer paste is cut silently. The context size against the limit is shown only inside the "Included context" dialog (`2390` onward). An oversized request is refused with a clear notice (`contextTooLarge`). The sidebar shows "N of M requests remaining" (`WorkspaceNavigation.tsx:104`); it updates with the status poll every 30 seconds (`App.tsx:561`), I found no refresh right after a send. |
| 28 | Mode picker | Present | Auto, Fast, Thinking select in the composer (`2211` to `2228`), remembered on the device. The cost of each mode is not shown. |
| 29 | Attachment previews | Partly | Extracted text can be reviewed and corrected in the Context tab. No thumbnails. Right for a product that sends text, not images. |
| 30 | Citations | Present | Source chips open the captured source (the link renderer in `src/Answer.tsx`), an evidence note counts unsupported references, "Sources changed since this answer" (`App.tsx:1879`). |
| 31 | Continue generating | Absent, by design | A cut-off answer is excluded from context, so "continue" has nothing to continue from. |
| 32 | Message actions placement | Partly | Always-visible text buttons under each message. Retry is not among them; it sits under the composer. |
| 33 | Undo | Absent | "Delete everything" and "new chat with unsaved changes" ask first (`1061`, `367`). Deleting one saved conversation does not ask and cannot be undone. |
| 34 | Offline banner | Absent | No `online` or `offline` handling. A failed request ends as "Protected response unavailable". |

## 3. The gap list

Effort: S is up to 2 agent-hours, M is 2 to 6, L is more than 6. "Risk" means risk to allowance counting, masking or privacy.

| Rank | Feature | Status | Impact | Effort | Risk and how to avoid it | Recommendation | Where |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Enter sends on desktop, Shift+Enter new line; hint under the composer | Absent | High | S | A stray Enter costs 1 or 5 units. Send only on Enter without modifiers, not during text composition (`isComposing`), not on touch devices, not while busy. | **Build now.** The most used habit in any chat. | Textarea, `App.tsx:2106` |
| 2 | View follows the streamed answer; stops when the user scrolls up; floating "jump to latest" button | Partly | High | S to M | None. | **Build now.** Long Thinking answers scroll out of view today. | `App.tsx:479`, `1584`, after `1936`; new hook file |
| 3 | Edit and send in one step, edited in place | Partly | High | M | One request at the mode's cost, same as a new message. Must call the existing `send()` so masking, the health prompt and the size check all run. Show the cost on the button. | **Build now.** The two-step flow reads as broken. | `App.tsx:1895` to `1982` |
| 4 | Retry on the answer, with the cost in the label | Partly | High | S | Cost shown wrongly would mislead. Compute it from the qualification's `allowanceCost` for the mode that will run; for Auto, call `autoMode` first. Say "uses up to". | **Build now.** People must see 5 units before they spend them. | `App.tsx:2313` to `2342` |
| 5 | Collapse long user messages | Absent | Medium | S to M | None. | **Build now**, with the design in 3.1. | New message component, `chat-design.css` |
| 6 | Paste and drop files; stop the browser from leaving the app on a drop | Absent | High | S | Files must go through `importFiles` (`App.tsx:878`) so limits, on-device reading and review stay the same. Never read text out of a pasted file in a new code path. | **Build now.** The drop case can lose a temporary chat today. | Composer, `App.tsx:2093` to `2132` |
| 7 | Confirm before deleting a saved conversation | Absent | High | S | None. | **Build now.** One click destroys data. | `App.tsx:2960`, `ConversationLibrary.tsx:82` |
| 8 | Copy conversation as text; remove the dead "Share" button | Partly | Medium | S | The copy holds the real values, not placeholders. That is the user's own text on their own device. Say in the label that it goes to the clipboard. | **Build now.** This is the honest "share". | `App.tsx:1602` to `1631`; new pure module |
| 9 | Composer limit feedback and height reset | Partly | Medium | S | None. | **Build now.** Silent cutting of a paste is a data-loss bug. | `App.tsx:2106` to `2118` |
| 10 | Copy on user messages; time on each message | Partly | Medium | S | None. Times are already stored on the device. | **Build now**, with package C. | Message component |
| 11 | "Report a problem with this answer" leading to the support note | Absent | Medium | S | Must stay content-free: reuse `supportReport`, which has an explicit allowlist. | **Build now.** The alpha needs a feedback path. | Message component, `SupportPanel.tsx` |
| 12 | Connection-lost banner; announce "answer complete" to screen readers; focus back to the composer after send | Absent | Medium | S | None. | **Build now** if time allows, else first thing after. | `App.tsx:1672` to `1724` |
| 13 | Indicator and "Retry" at the failed or waiting answer | Partly | Medium | S | Same as rank 4. | Build with rank 4. | Message component |
| 14 | Version arrows at the edited message | Absent | Medium | M | None. Needs the fork point of each branch, which the data does not store; it can be computed as the first message that differs. | **Build later.** The branches panel works. | `conversation-branches.ts`, message component |
| 15 | Remove on the file chip | Partly | Low | S | Removing must use the existing remove path so the "cannot retract earlier processing" note still holds. | Build later. | `App.tsx:2291` |
| 16 | Group saved chats by date; rename in place | Partly | Low | S to M | None. | Build later. | `WorkspaceNavigation.tsx` |
| 17 | Keyboard shortcuts and help list | Absent | Low | M | None. | Build later. Few alpha users will look. | New module, Settings guide |
| 18 | Custom instructions | Absent | Medium | M | Stored on the device only. Sent with every request, so it must pass masking and count toward the input limit. No extra allowance. Needs new privacy wording. | Build later, after the alpha asks for it. | Settings, `conversation.ts` `composeContext` |
| 19 | Syntax colours in code | Absent | Low | M | A new dependency. | Build later or never. | `CodeBlock.tsx` |
| 20 | Long paste becomes an attachment | Absent | Low | M | Must use the document path so masking of documents applies. | Build later. | Composer |
| 21 | Public share link | Absent | n/a | L | Needs conversations on the server. Breaks "nothing stored on the server". | **Do not build.** | n/a |
| 22 | Continue generating | Absent | Low | M | Would need partial answers in context, against the rule. | **Do not build.** Retry is the answer. | n/a |
| 23 | Thumbs stored on the server with the conversation | Absent | n/a | M | Sends chat content to the operator. | **Do not build.** | n/a |
| 24 | Automatic saving of drafts outside the vault | Absent | Low | S | Unencrypted text in browser storage; breaks incognito and "temporary work disappears". | **Do not build.** | n/a |
| 25 | Follow-up suggestions written by the model | Absent | Low | M | Each would be a request: allowance and cost. | **Do not build.** | n/a |

### 3.1 Answers to the specific questions

**(a) Collapsing long messages.** Recommendation:

- Collapse **user messages only**. Never answers.
- Use **max-height with a fade**, not CSS line clamp. Line clamp only works on one block of plain text; it breaks when the message contains lists, code or a table, and Firefox and WebKit differ.
- First show the user's own message as **plain text** with `white-space: pre-wrap` instead of through the Markdown renderer. Then a collapsed message can hold no code block, no table and no focusable element, and the whole class of "focus lands on something hidden" bugs cannot occur. It also fixes the rendering issue in section 5.
- Threshold: collapsed height about 12 lines (around 290 px at the current line height; use `em`, not pixels). Collapse only when the full height is at least 1.5 times that, so the button never hides just two lines. Same rule at phone, tablet and desktop; the line count adapts by itself because the bubble width changes.
- Measure with `scrollHeight` after render and on width change (one `ResizeObserver` in the message component). Do not count characters: 600 characters are 6 lines on desktop and 20 on a phone.
- The fade is a `mask-image` gradient on the text block, so it needs no colour and works in light and dark. No animation at all, which also satisfies reduced motion.
- The control is a real button after the text: "Show more" / "Show less" ("Mehr anzeigen" / "Weniger anzeigen"), with `aria-expanded` and `aria-controls`, 44 px high on phones. The hidden text stays in the page, so a screen reader and find-in-page still reach all of it. Do not use `aria-hidden`.
- On "Show less", scroll the top of that message into view (`block: "nearest"`), otherwise the page jumps.
- State: a set of expanded message ids in memory. Not saved. A reload starts collapsed. The print and PDF view has its own component (`src/pdf-export.tsx`) and is not affected.

**(b) Edit and resend.** Yes, it can be done safely. The path already exists in two clicks: `branchConversation` makes branch "Edit N" with the edited message last, then "Answer this question" calls `askAgain`, which calls `send()`. One button can do both. Because it ends in `send()`, the size check, the health prompt, masking and the server's allowance count all behave as for a typed message: one request at the mode's cost. The old sequence stays as a branch, so nothing is lost. Keep the branch limit error (20). Label the button with the cost. Do not add a second way to send that bypasses `send()`.

**(c) Regenerate: cost shown before use?** Yes. Put the cost in the visible label, not in a hover title: "Retry · uses 1 request", "Answer again with Thinking · uses 5 requests". Read the numbers from the qualification report; do not hard-code 1 and 5. For Auto, decide the mode on the device first (`autoMode`), then show that cost. After a provider refusal the next send within a minute is not counted again; the browser cannot know this for sure, so do not promise "free" in the label.

**(d) Feedback thumbs.** Recommended: **a local note, no server count.** A small "Report a problem with this answer" action opens the Help panel with area "Chat or an answer" and symptom "An answer was incorrect or misleading" already chosen. The user copies the content-free note into an email and adds what they choose to add. A content-free count sent to the server is possible later, but it is a new kind of record that the privacy text must name, and the alpha has its own survey. A thumbs-up has nowhere useful to go: do not build it.

**(e) Share conversation.** Build the private version: "Copy conversation as text" (Markdown, built on the device) beside the PDF export that exists. Replace the disabled "Share · Coming later" button with a small menu: "Copy as text", "Export as PDF". A public link needs the conversation on a server and is not compatible with "nothing stored on the server". Do not build it, and stop advertising it as coming.

**(f) Drafts.** Keep them where they are: in memory for the open conversation, and inside the encrypted snapshot (per branch) when the user saves. Do not write drafts to `localStorage` or `sessionStorage`; that would put chat text outside the vault and break the incognito promise. The reload warning stays.

**(g) Drag-and-drop and paste.** Build both as thin entries into `importFiles`:

- Paste: if the clipboard holds files, stop the default and pass them to `importFiles`. Pasted text is untouched.
- Drop: a drop zone on the conversation view passes `dataTransfer.files` to `importFiles`. A window-level `dragover` and `drop` handler stops the browser from opening the file.
- Everything else stays as with the picker: read on the device, limit of five files and three screenshots, the "File import results" list, review before sending. When the image feature arrives, its routing belongs inside the import step, so paste and drop inherit it without change.

**(h) Suggested prompts.** Keep them static and on the device, as now. Three to six starters are enough. No follow-up suggestions from the model.

## 4. Build order and work packages

`src/App.tsx` is one component of about 3,000 lines. To let agents work in parallel, each package takes one region of that file and moves its logic into new files. Two rules for all packages:

- Put new labels in a **new text file per package** under `src/text/` (the pattern of `src/text/voice.ts`), in English and German. Do not edit `src/text/app.ts` except to delete labels a package removes.
- Do not reformat `App.tsx` outside your region.

| Package | Content (ranks) | Files | `App.tsx` region | Can run in parallel with |
| --- | --- | --- | --- | --- |
| A. Composer | Enter to send and hint (1), limit notice and height reset (9), paste and drop (6) | new `src/composer-keys.ts`, `src/file-drop.ts`, `src/text/composer.ts`, tests; `chat-design.css` composer rules only | `2093` to `2132` (form and textarea); one window-level effect | B, C, E, F |
| B. Follow the answer | Auto-follow, stop on scroll-up, floating jump button (2) | new `src/follow-scroll.ts`, tests; `chat-design.css` one new rule block | `479` to `486`, `1584` to `1599`, one line after `1936` | A, C, E, F |
| C. Message component | Move the message article into `src/ChatMessage.tsx`: user text as plain text, collapse (5), copy on user messages and time (10) | new `src/ChatMessage.tsx`, `src/text/message.ts`, tests; `chat-design.css` message rules | `1808` to `1935` | A, B, E, F |
| D. Answer actions | Edit and send in place (3), retry on the answer with cost (4, 13), "Report a problem" (11) | `src/ChatMessage.tsx`, `src/SupportPanel.tsx` (one new prop), `src/answer-modes.ts` (a cost helper), tests | `1938` to `1982`, `2313` to `2342` | **After C** (same component). Parallel with A, B, E, F |
| E. Saved list and copy (**built**, section 7) | Confirm before delete (7), copy conversation as text and removal of the dead Share button (8) | `src/ConversationLibrary.tsx`, new `src/conversation-text.ts`, `src/CopyConversationButton.tsx`, `src/text/conversation-ui.ts`, tests | `1602` to `1631`, `2955` to `2980` | A, B, C, D, F |
| F. Connection and screen reader | Offline banner, "answer complete" announcement, focus after send (12) | new `src/ConnectionBanner.tsx`, `src/text/connection.ts`, tests | `1672` to `1724`; one line in `send()` at `871` | A, B, C, E |

Order: A, B, C, E and F start together. D starts when C is merged. Ranks 14 to 20 wait for alpha feedback.

**Acceptance checks for every package**

1. `npm run typecheck` is clean.
2. A unit test for each new pure module (key decision, follow logic, cost label, conversation text).
3. One new browser test in the vitest style (section 4.2) that puts real messages on screen and checks the feature at 375, 768 and 1280 px wide, in English and German: no sideways page scroll (`document.documentElement.scrollWidth` equals `clientWidth`), the new controls are at least 24 px (44 px on the phone width), and they work by keyboard.
4. The existing tests that touch the region still pass: `tests/i18n-app-ui.test.ts`, `tests/answer-modes-ui.test.ts`, `tests/chat-recovery.test.ts`, `tests/conversation-branches.test.ts`, and the end-to-end specs `tests/browser/chat-design.spec.ts`, `chat-attachments.spec.ts`, `conversation-branches.spec.ts`, `draft-workspace.spec.ts`. The end-to-end specs find controls by their English names, so renaming a button means updating them.
5. The UI sweep is clean in English and in German (section 4.1): every one of the 54 lines says `ok`.
6. Package-specific:
   - A: Enter sends once; Shift+Enter and Enter during text composition do not; on the phone profile Enter makes a new line; a paste over the limit shows a message; a dropped file appears in "File import results" and the page does not navigate. `tests/browser/chat-attachments.spec.ts` presses Enter at line 23; check what it expects before changing key handling.
   - B: with a long streamed answer the last line stays visible; after scrolling up the view stays where it is and the button appears; the button returns to the end.
   - C: a 40-line user message is collapsed with a working "Show more"; a 13-line one is not; a user message containing `# text` or `1.` shows exactly what was typed.
   - D: editing and sending makes exactly one call to `streamReply` and one new branch; the label shows the cost from the report (the test report in `tests/answer-modes-ui.test.ts` uses 3 for Thinking, so a hard-coded 5 fails).
   - E: delete asks first and "Cancel" keeps the conversation; the copied text holds every complete message in order and no partial ones.
   - F: going offline shows the banner and the draft is kept; a screen-reader status says when the answer is complete.

### 4.1 The UI sweep

File: `evaluation/ui-sweep.ts`. It is not in `scripts/` and has no entry in `package.json`.

What it does:

- Starts its own server from the built app in `dist/` on port 4192, with no keys, so chat is off. Nothing leaves the machine.
- Runs Chromium, Firefox and WebKit, each at phone (375 x 812, with touch except in Firefox), tablet (768 x 1024) and desktop (1280 x 800).
- Opens six screens each: Conversation, Context, Research, Saved, Settings, Account lab. That is 3 x 3 x 6 = 54 combinations.
- Measures on each: sideways page overflow, elements outside the viewport, text contrast (WCAG AA), small touch targets on the phone (under 24 px), page errors. On Conversation and Account lab it also presses Tab 20 times and checks for a visible focus ring that is on screen.
- With `--german` the browser runs as `de-DE`, the visible "Deutsch" switch is clicked, the German screen is measured and English words left on screen are counted.
- Prints one line per combination (`ok` or the issue counts) and writes `.local/ui-sweep/sweep-<time>.json` or `sweep-de-<time>.json`.

Commands (PowerShell, from the repo root):

```
$env:VITE_GERMAN_UI = "1"; npm run build
npx tsx evaluation/ui-sweep.ts
npx tsx evaluation/ui-sweep.ts --german
```

One engine only, for a quick look:

```
npx tsx evaluation/ui-sweep.ts --browsers chromium
npx tsx evaluation/ui-sweep.ts --browsers chromium --german
```

In Git Bash the build line is `VITE_GERMAN_UI=1 npm run build`.

What it needs:

- A fresh `npm run build` (the sweep serves `dist/`, not the source).
- For `--german`: a build made with `VITE_GERMAN_UI=1`. Without it the "Deutsch" switch does not exist and, from reading the script, every German line will fail on that click.
- To see the read-aloud and PDF buttons in the sweep, also set `VITE_READ_ALOUD=1` and `VITE_PDF_EXPORT=1` for the build (check the exact values in `src/device-features.ts`).
- The three Playwright browsers installed (`npx playwright install chromium firefox webkit`).
- Port 4192 free. No other server has to run; do not start one.

How long: not timed today. Earlier result files in `.local/ui-sweep/` are about 3 to 6 minutes apart, so plan for about 5 minutes per language for all three engines.

Limits builders must know:

- **The script always exits with code 0.** Read the lines; a clean run is 54 times `ok`.
- **It sees the empty conversation only**, because chat is off. It will not notice a broken message bubble, a collapsed message or a retry button. That is why check 3 above asks for a browser test with real messages.
- WebKit's Tab key skips buttons and links by default, so the focus check is weak there.
- Small touch targets are checked at 24 px, not 44.

### 4.2 The local browser tests through vitest

Files: `tests/*-ui.test.ts` (15 today: `answer-modes-ui`, `arithmetic-completeness-ui`, `assisted-research-ui`, `billing-recovery-ui`, `calculation-continuation-ui`, `device-features-ui`, `german-rules-ui`, `health-consent-ui`, `i18n-app-ui`, `i18n-screens-ui`, `optional-calculator-ui`, `remote-content-canary-ui`, `source-history-ui`, `temporary-review-ui`, `when-to-search-ui`).

- Run one: `npx vitest run tests/answer-modes-ui.test.ts`. Run all tests: `npm test` (long; one worker).
- Each test starts its own Vite dev server on a free port and its own Chromium (`scripts/browser-runtime.mjs`). No build and no running server are needed. Nothing is sent anywhere.
- `vitest.config.ts` sets `VITE_GERMAN_UI=1`, so both languages are available.
- To get answers on screen without a provider, a small Vite plugin replaces `src/inference.ts` with a fake `streamReply` and the status is faked. `tests/answer-modes-ui.test.ts` is the pattern to copy; it also records each call, which is how to prove "exactly one request".

The older end-to-end specs: `npm run test:e2e` runs the 30 files in `tests/browser/` in Chromium against `npm start` on port 4173. They need `npm run build` first, run in English only, and take controls by their English names. `tests/browser/chat-design.spec.ts` shows how to seed a long conversation through the vault.

## 5. Things that looked broken or half-working during the audit

All read from the code. None was reproduced in a browser.

| # | Where | What |
| --- | --- | --- |
| 1 | `src/App.tsx:479` to `486` | Auto-scroll depends on the message count only. Streamed text does not change the count, so a long answer is not followed. |
| 2 | `src/App.tsx:2960`, `src/ConversationLibrary.tsx:82` | "Delete" on a saved conversation deletes at once. No confirmation, no undo. "Delete everything" does ask (`1061`). |
| 3 | `src/App.tsx:2111` | `maxLength={20000}` cuts a longer paste silently. No counter, no notice. |
| 4 | `src/App.tsx:2113` to `2117` | The composer grows in `onInput` only. After a send the text is cleared by state (`680`), which fires no input event, so the box probably stays tall. A starter text set by state (`1776`) does not grow it either. |
| 5 | `src/App.tsx:1872` | User messages are rendered through the Markdown component. A typed `#`, `*`, `_`, `1.` or `<` changes how the user's own words look, and a literal `[word]` can be treated as a citation code. |
| 6 | `src/App.tsx:2106` to `2118` | No way to send from the keyboard except tabbing to the Send button. |
| 7 | `src/App.tsx:2316`, `2336` | The only cost warning on retry is a `title` attribute. Touch devices and screen readers in many setups never show it. |
| 8 | `src/App.tsx:2331` | "Answer again with Thinking" is shown by matching the words "Fast" or "Schnell" in the answer's label text. A label change breaks it silently. The mode should be stored as data. |
| 9 | `src/App.tsx:1938` | The edit panel is placed after the whole message list, far from the message being edited in a long chat. |
| 10 | `src/App.tsx:1602` to `1611`, `2249` to `2268` | Dead controls on the main screen: a disabled "Share · Coming later" in the header, a disabled live-voice button in the composer, and a disabled microphone when voice is off. They take room on a phone and promise a share feature that should not be built. |
| 11 | No handler in `src/` | A file dropped on the window is opened by the browser, which leaves the app. A temporary chat is lost unless the reload warning catches it. |
| 12 | `src/App.tsx:512` to `521` | "Answer copied" appears as the page notice at the top, which is off screen in a long chat. The code-block copy does it better, with a status line at the block. |
| 13 | `src/App.tsx:2269` to `2288` | Send and "Stop response" are two different buttons swapped in place. Keyboard focus on Send is probably lost when it is replaced. |
| 14 | `src/App.tsx:728`, `987` | Two statements joined on one line by a long run of spaces. Harmless, but it looks like a bad merge. |
| 15 | `src/conversation.ts:79` | `forkAt` is used only by tests (`tests/security.test.ts`, `tests/vault.test.ts`). The product uses `branchConversation`. |
| 16 | `docs/handoff-20261113.md:97` and `server/app.ts:413` | The handoff says "a retried message counts twice". The server comment says a refused message is not counted twice within one minute. Both are true for different cases (retry after an answer, retry after a refusal). The interface explains neither. |

## 6. Not checked

- Nothing was run: no browser, no tests, no sweep. Items in section 5 marked "probably" need one look in a browser.
- Every ChatGPT help page was seen only as a search snippet. The second half of the Gemini release notes was not read.
- The collapse thresholds of the three products are from memory.
- The sweep duration is inferred from old result files.

## 7. Package E built (14 November 2026)

Commits on the package branch: `27f17e5` (shared export module), `b30afb6` (features), `a9ebc41` (browser tests).

| Item | State |
| --- | --- |
| Confirm before deleting a saved conversation (rank 7) | Built. In-app dialog, focus on "Cancel", Escape cancels, focus returns. |
| Copy conversation as text (rank 8) | Built. Markdown. Same module as the PDF export (`src/conversation-text.ts`). Incomplete attempts are included and marked, as in the PDF. This differs from check 6 E above ("no partial ones"): the owner's later instruction was to mark them. |
| Dead "Share" button (rank 8, section 5 item 10) | Removed from the header and the menu, with its three labels. Microphone, live voice and "Create image" stay as "Coming later". |
| Copy on user messages, time on each message (rank 10) | Built for user messages as one small component (`src/MessageMeta.tsx`), so package C can move it. |
| Group saved chats by date (rank 16) | Built in the sidebar. By creation date. Rename in place is not built: "Rename and manage" still opens the Saved tab. |
| Empty states | Already present in the sidebar and the Saved tab. Now covered by a browser test. |

Checked: `tests/conversation-text.test.ts` and `tests/saved-list-ui.test.ts` at 375, 768 and 1280 px in English and German, plus the existing tests named in `docs/READINESS.md`. Not checked: real phones, Safari, Firefox, screen readers, the UI sweep, the Playwright specs.

Left as they are: "Delete everything on this device" and "remove project" ask through the browser's own confirm box. An undo after delete was not built: holding back the vault write for some seconds would leave the conversation in the vault if the tab closes or the vault locks in that time.
