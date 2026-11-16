# Keyboard shortcuts and their help (16 November 2026)

The ChatGPT set of keyboard shortcuts, plus a dialog that lists them. Built and tested offline. Not wired into `src/App.tsx` yet (the lead or the wiring agent does that). No switch: nothing here talks to the server.

## The keys

| Action | Windows, Linux, ChromeOS | Mac, iPad |
| --- | --- | --- |
| New chat | Ctrl + Shift + O | Cmd + Shift + O |
| Search chats | Ctrl + K | Cmd + K |
| Show or hide the sidebar | Ctrl + Shift + S | Cmd + Shift + S |
| Go to the message box | Shift + Esc | Shift + Esc |
| Copy the last answer | Ctrl + Shift + C | Cmd + Shift + C |
| Copy the last code block | Ctrl + Shift + ; | Cmd + Shift + ; |
| Show keyboard shortcuts | Ctrl + / | Cmd + / |

German labels in the help: Strg and Umschalt (as printed on German keyboards). The Mac key shows as ⌘; screen readers hear "Command" or "Befehl".

## Files

- `src/use-shortcuts.ts`: `useShortcuts(actions)` registers one keydown listener on `window`. `shortcutFor` (pure) decides which shortcut a key press means; `runShortcut` applies the dialog rules and runs the action.
- `src/ShortcutHelp.tsx`: the help dialog. Same lifecycle as `ConfirmDialog`: focus starts on Close, Tab stays inside, Escape closes, focus returns to the opener or to `fallback`.
- `src/shortcut-copy.ts`: `lastAnswer(messages)` and `lastCodeBlock(text)`.
- `src/text/shortcuts.ts`: English and German labels.
- CSS: one block at the end of `src/chat-design.css`.

## Rules

- Exactly the platform's modifier: Cmd on Apple devices (from `navigator.userAgentData.platform` or `navigator.platform`), Ctrl elsewhere. Ctrl on a Mac does nothing (it keeps the system's text-editing keys). Alt never counts, because AltGr on Windows is Ctrl + Alt.
- Ignored: text being composed by an input method, and key presses another handler already took (for example Escape closing a menu). A held key runs its action once; the repeats stay blocked, so holding Ctrl + Shift + C never opens the developer tools.
- Letters match by the character typed, so Dvorak works; on a layout without Latin letters they match by key position.
- Copy code: `;` and `:` both count, because Shift + ; gives ":" on US keyboards and ";" is Shift + , on German ones. Help: "/" with or without Shift, because "/" is Shift + 7 on German keyboards.
- The browser keeps its own use of a key unless an action ran. An action returns `false` when it did nothing. The copy actions should not: with nothing to copy they show a notice ("There is no complete answer to copy yet.") and keep the key, or Ctrl + Shift + C would open the developer tools.
- Another open modal dialog (a confirmation, the source viewer, Settings) blocks every shortcut. Two exceptions: the sidebar drawer (on phones and when the sidebar is collapsed it is a modal dialog; without the exception Ctrl + K and Ctrl + Shift + S could not work there) and the help itself. While the help is open, only Ctrl + / works, to close it; the page behind it cannot take focus.
- Copy the last answer copies what the answer's own Copy button copies (`answerCopyText`: numbered citations and the source list). Nothing is copied while the last answer is incomplete, failed or empty, the same rule that switches its Copy button off.
- Copy the last code block takes the last fenced block (``` or ~~~) of that same answer. Not covered: fences inside lists or quotes, and indented code blocks (noted in the code).
- The "Copied" message is the app's existing notice (`setNotice(t.copied)`); no new status element.

## Browser collisions (not verified in real browsers)

ChatGPT uses the same keys. The browser test shows that Chromium hands these keys to the page and the page blocks their default. It cannot show what the browser's own window does with them. Known meanings elsewhere:

- Ctrl + Shift + O: bookmarks or favorites manager (Chrome, Edge, Firefox).
- Ctrl + Shift + S: screenshot or web capture in some Firefox and Edge versions.
- Ctrl + Shift + C: the developer tools' element picker.
- Shift + Esc: Chrome's and Edge's task manager on Windows and Linux.
- Ctrl + K: the browser's search box.
- Cmd + / in Safari: show or hide the status bar.

If a browser reserves one of these, the browser wins and the shortcut does nothing; nothing breaks. The owner check is to try each key once in Chrome, Edge, Firefox and Safari.

## Tests

- `tests/shortcuts.test.ts` (21): every combination on both platforms, the other platform's modifier, Shift must match, composing, Alt, held keys, the dialog rules, and the copy helpers (several blocks, longer fences, tilde fences, an open fence, CRLF, inline code).
- `tests/shortcuts-ui.test.ts` (10): the help at 375, 768 and 1280 px in English and German (labels, keys, focus, Escape, Close, 44 px Close on phones, no sideways scroll), the keys reaching their actions with the default blocked only then, a held key, a modal sidebar drawer at 375 px (Ctrl + K opens it and focuses its search box, also while it is open; Ctrl + Shift + S closes it), a confirmation blocking every key, and Mac keys. Nothing leaves 127.0.0.1.

Not verified: the wiring in App.tsx, real browsers' own shortcuts, Safari, Firefox, phones with a hardware keyboard.
