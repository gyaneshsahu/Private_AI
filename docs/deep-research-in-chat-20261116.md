# Deep research in the chat, and a shorter failure notice (16 November 2026)

Two changes on the App.tsx side. Built and tested offline in Chromium at 375, 768 and 1280 px, in English and German. Nothing verified on real phones, Safari, Firefox, hosted or live.

## Deep research from the chat (FE-07)

Before: deep research ran only on the Research page. The answer was written into the chat while the page was shown, and "Show the answer" took the user back.

Now:

- "+" > "Deep research" shows only when deep research is on (`inference.research`), search is on, chat is ready and the health consent (when asked) is settled. It arms the next Send, as "Search the web" does. The two exclude each other.
- A note above the message box says what the next Send does and what one run counts ("One run counts as 15 requests"). Its button undoes it.
- Send opens the deep research card in the conversation for exactly the typed text. The card shows the cost text, the question and "Plan the research". Nothing is sent before that button.
- Then the same steps as on the Research page: the plan, the approval of each search text (edit, remove; masked on the device), the step list with Stop. Nothing is searched before "Search for these texts".
- When the answer is requested the card steps aside. The answer streams into the conversation like any message, with Stop in the message box. The draft that became the question is cleared.
- Every ending closes the card. A line above the message box says how it ended and what was counted ("The research is finished. Requests counted for this run: 15 of 15."). Sources of a run that stopped early stay in the chat, as on the page.
- Cancel and Escape (before the plan, or at the approval) return to the message box with the draft kept. After a plan the line says the plan's count.
- While the card is open, Send does nothing more. It is one-shot: the next message is normal again.
- A question longer than 1,000 characters is refused at "Plan the research" with the reason; nothing is sent.

How: `DeepResearch` has an `inline` mode. The app mounts a second instance next to the page's one and draws it into a slot at the end of the message list (a React portal). So a run keeps going while another tab is shown, and leaving the chat (another conversation) stops it. The research client, the pipeline, the approval and the send are the same code; no second send path.

Rule 7 holds: one send path, the exact approved texts only, allowance, masking and the stop switch unchanged.

The Research page stays for its other uses (page reads, settings, deep research with its own question box).

## Shorter failure notice (CC-06 follow-up)

Before: a failed answer showed its plain sentence with Retry in the message, and a longer notice above the message box said much the same ("Response timed out. Partial answers are excluded from future context. This request's cost remains unknown. No automatic retry was made.").

Now the notice says only what the message does not:

- Stopped by the user: no notice. The message says "Stopped by you."
- Timeout, busy, unavailable, cut off, and failures without a reason of their own: the message's sentence is repeated for screen readers only (a hidden status line), not shown twice.
- Kept as before: the verification limit with its countdown, a changed deployment, a reason the message has no sentence for (for example "Research answer withheld: ..."), and the backup model line ("One automatic retry with the backup model was made.").
- Dropped: "Partial answers are excluded from future context" (the folded explanation in the message says it), "Reported usage was retained" and "This request's cost remains unknown" (provider cost is shown in development builds only).

Unused keys left in `src/text/app.ts` (another agent owns it): `responseStopped`, `usageRetained`, `costUnknown`, `timedOut`, `protectedUnavailable`.

## Tests

- `tests/deep-research-chat-ui.test.ts`: 3 widths x 2 languages; the armed note with the cost, the card, Escape before and at the approval with the draft kept and focus in the message box, no search before the approval, the masked texts, the progress in the card, the answer in the conversation without a click, no "Show the answer", the cleared draft, one-shot; no item without the switch; nothing outside the machine.
- `tests/chat-recovery.test.ts` and `tests/chat-core-ui.test.ts` check the sentence in the message, the hidden status line and that the long text is gone. The placement check of the notice above the message box now uses the "new chat" notice.