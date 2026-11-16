# Chat core component fixes (16 November 2026)

Agent B2, from the chat core audit (`.local/findings-chat-core.md`, items CC-01 to CC-30). Pure improvements to existing behaviour: no new switch, nothing new on the server, no new send path. Built and tested offline in Chromium at 375, 768 and 1280 px in English and German. Not tried on a real phone, in Firefox or Safari, or with a screen reader.

## What changed

| Item | Change | Where |
| --- | --- | --- |
| CC-01 | A streaming answer shows no "Incomplete · excluded from context" label and no actions. Before its first text it shows three moving dots (hidden from screen readers) and a hidden sentence "CometRow is writing an answer…". With reduced motion the dots stand still. Needs one prop from App (below). | `src/ChatMessage.tsx` |
| CC-05 | The answer's actions are one row of icon buttons, each with a name and a tooltip: Copy, Read aloud, Export as PDF, Open in canvas, Retry, More. Retry opens a small menu; each item shows its cost as text before it is pressed ("Retry last response (uses 1 request)", "Answer again with Thinking (uses 5 requests)"). "Report a problem" is in More. The user's own message has Edit, Remember, Retry (only when it has no answer) and Copy as icons. The menus work by keyboard: Enter, Space or the arrows open them, the focus moves to the first item, the arrows, Home and End move, Escape closes and returns the focus, Tab or a click outside closes. | `src/MenuButton.tsx`, `src/ChatMessage.tsx`, `src/ReadAloudButton.tsx`, `src/PdfExportButton.tsx`, `src/MessageMeta.tsx` |
| CC-07 | The sidebar row menu: Rename turns the row into a field (Enter saves through the existing `onOrganize`, Escape cancels, the focus returns to the row). Delete asks first in the house confirmation dialog and is shown only when App passes `onDelete`. Pin, Archive and Move to project stay. "Rename & manage" is now "Manage history" (the Saved screen still has export and more). | `src/WorkspaceNavigation.tsx` |
| CC-08 | Chats are sorted and grouped by last activity: the newest message time, else the creation time. Also used by the Saved and Secure Max lists. | `src/conversation-library.ts` |
| CC-10 | Branch names are shown in the interface language ("Edit 3" is "Bearbeitung 3" in German). They are still stored as "Original", "Retry N" and "Edit N": that string already holds the kind and the number, and keeping it means saved and synced chats need no migration and older app versions still read them. Other stored names ("main") are shown as they are. | `src/conversation-branches.ts`, `src/ConversationBranches.tsx` |
| CC-14 | Copy works on a stopped answer that has text. | `src/ChatMessage.tsx` |
| CC-15 | Help now says: if no answer text arrived, CometRow tries once by itself on the backup model and says so; your own Retry is a new request and uses your allowance again. | `src/support-report.ts`, `src/text/support.ts` |
| CC-18, CC-19 | Phone header title on one line with an ellipsis. 44 px targets on phones for the row and project "…", create project, close navigation, DE/EN, "+", microphone and voice. | `src/chat-design.css` |
| CC-23 | "Copy code" says "Copied" for 2 seconds. One announcement for screen readers; no status element is always present. | `src/CodeBlock.tsx` |
| CC-25 | The edit box grows with its text, as the message box does (the shared helper now counts the box's border). | `src/ChatMessage.tsx`, `src/composer-keys.ts` |
| CC-28 | The Send button's name is "Send message" / "Nachricht senden" (no arrow); the visible text and arrow icon are unchanged. Tests, the audit tour and the live probes are updated. | `src/text/app.ts` |
| CC-30 | The brand mark shows "C" (no logo file exists in the repository). | `src/WorkspaceNavigation.tsx` |
| Layout | Closed row and project menus are no longer laid out (they measured wider than their box). Secure Max is a normal sidebar item with its label on one line. Answer tables keep whole words and scroll sideways. The health consent and the in-chat search suggestion stack vertically. The composer toolbar wraps instead of pushing Send or Stop out, and the dictation note sits over the whole composer. The sidebar project row keeps its "…" on the same line. With the canvas open the header no longer sticks out of the chat by 8 px. A space between "Privacy policy ↗" and "Imprint ↗". | `src/chat-design.css` (one block, "chat core component fixes 16 Nov") |

New labels: `src/text/message-actions.ts` (English and German, same keys).

## Wiring for the lead (src/App.tsx)

1. CC-01: in the message list (`<ChatMessage ...>`), pass `streaming={!!busy && !!controller.current && index === conversation.messages.length - 1 && message.role === "assistant" && message.status === "partial"}`. Not run with this line (App.tsx is not mine): after wiring, run `tests/chat-recovery.test.ts` and `tests/chat-message-ui.test.ts`.
2. CC-07: on `<WorkspaceNavigation>`, add `onDelete={(c) => void deleteSnapshot(c)}`. The confirmation is in the sidebar; `deleteSnapshot` must not ask again.

## Tests

- `tests/chat-core-ui.test.ts` (new) with `tests/fixtures/chat-core-entry.tsx`: streaming states, the action row and its menus by keyboard and mouse, sizes, partial copy, the growing edit box, reduced motion, nothing leaves localhost.
- `tests/saved-list-ui.test.ts`: a new case for last-activity order, rename in place and delete with confirmation.
- Updated: `chat-message-ui`, `answer-modes-ui`, `chat-recovery`, `pdf-export`, `conversation-library`, `conversation-branches`, `i18n-screens-ui` and every test that looked up "Send ↑".
- `tests/chat-recovery.test.ts` checks that a streaming answer has no actions: it passes only once App passes `streaming`.
- Audit harness (`evaluation/audit-harness.ts --config on`, Chromium, 375/768/1280, EN and DE) on the affected steps after the fixes: no page overflow and no element wider than its box in any measured screen (before: sidebar menus +23 to +67 px, Secure Max +40 px, health consent +160 px, voice recording +70 to +114 px, canvas +8 px). Two steps timed out once on `page.goto` at 375 px and passed on the next run.
