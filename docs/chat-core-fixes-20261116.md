# Chat core fixes, App.tsx side (16 November 2026)

Fixes from the chat core audit (`.local/findings-chat-core.md`, base da864bf) that live in `src/App.tsx`. Pure improvements to existing behaviour, so no switch. Tested offline in Chromium at 375, 768 and 1280 px, English and German (`tests/chat-core-ui.test.ts`, `tests/chat-core.test.ts`).

## What changed

- **Failed answers (CC-06).** The kind of failure is stored on the message: stopped, timed out, busy (rate limited or verification busy), not available, connection dropped, no answer, or something went wrong. The message shows one plain sentence for it (`src/chat-failures.ts`, words in `src/text/chat-core.ts`). Saved messages may now carry the two new kinds `busy` and `error` (`src/saved-conversation.ts`, `shared/contracts.ts`): an older app version cannot read a chat saved with them. "Check provider verification and service access" is gone; users read "Try again in a minute. If it keeps happening, see Help."
- **Notices you can see (CC-26).** On the conversation screen, the app's notice, the offline line and "Private chat isn't available yet" sit just above the message box. At the top they scrolled away under the sticky header. Other screens keep them at the top. An empty chat no longer jumps to the end.
- **Offline.** Send is off while the browser is offline, Enter sends nothing, and Send points at the offline line as the reason. The draft stays. Back online, Send works again.
- **One Stop (CC-13).** While an answer streams, only the message box has Stop. The progress line's Stop shows only on other screens (for example while a file is read in Context).
- **New chat during an answer (CC-24).** Asks first: "Stop the current answer and start a new chat?", one question that also covers unsaved changes.
- **Pasted or dropped picture (CC-02).** With picture questions on and chat ready, one PNG or JPEG goes to "Ask about a picture": the same notice, health consent and covering steps as from "+", starting at turn and crop. Everything else goes to the text reader as before. A picture the reader finds no text in offers "Ask about a picture". No second send path: the picture still goes with one typed message through `send()`.
- **Less clutter.** No disabled "Coming later" microphone, voice icon or "+" rows, no fine print about future features (CC-03). The token and dollar line shows only in development builds or with `?developmentTools` (CC-04). An empty chat shows no context count and no visible "Conversation" heading (it stays for screen readers); the protection status is one small line, and "Privacy details" still opens it. Starter cards lose the "↗" (CC-29).
- **Counts (CC-12).** "1 message included · 1 file", "1 Nachricht einbezogen · 1 Datei"; the header says "2 messages" with no trailing dot. The count stays on one line on phones.
- **Titles (CC-16).** A new chat's title is its first line, cut at a word at or before 60 characters, then "…" (`src/title-from.ts`).
- **Menus (CC-20, CC-21).** The "+" and "…" menus move focus to the first item when opened; ArrowUp, ArrowDown, Home and End move; Escape closes and returns focus (`src/use-menu-keys.ts`). Every "+" item has the same class and an icon. The "…" menu has no "Conversation" item while you are on the conversation.
- **Sidebar.** "New chat" takes the full width on one line; Incognito sits below it as a smaller secondary button (CSS only).

## Not done here

- CC-01 (streaming prop), the in-message Retry as the primary action and the explanation in a `<details>`: they need `src/ChatMessage.tsx`, which another agent owns. The exact wiring is in the agent report.
- `conversationTitle()` in `src/conversation-library.ts` still cuts a draft at 60 characters mid-word; it should call `titleFrom()`.
