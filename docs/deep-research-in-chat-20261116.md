# Deep research in the chat, and a shorter failure notice (16 November 2026)

Two changes on the App.tsx side. Built and tested offline in Chromium at 375, 768 and 1280 px, in English and German. Nothing verified on real phones, Safari, Firefox, hosted or live.

## Deep research from the chat (FE-07)

Before: deep research ran only on the Research page. The answer was written into the chat while the page was shown, and "Show the answer" took the user back.

Now:

- "+" > "Deep research" shows only when deep research is on (`inference.research`), search is on, chat is ready and the health consent (when asked) is settled. It arms the next Send.
- A note above the message box says what the next Send does and what one run counts ("One run counts as 15 requests"). Its button undoes it.
- Send starts the run in the conversation for exactly the typed text (since 18 November, `docs/deep-research-20261114.md`: no "Plan the research" button and no approval of the search texts). Each search text is masked on the device. The card shows one progress line with "Stop the research".
- When the answer is requested the card steps aside. The answer streams into the conversation like any message, with Stop in the message box. The draft that became the question is cleared.
- Every ending closes the card. A line above the message box says how it ended (the "counted N of 15" wording was removed on 18 November; all 15 units are counted at the start). Sources of a run that stopped early stay in the chat, as on the page.
- The plan and approval steps, with their Cancel and Escape, were removed on 18 November; Stop ends a run.
- While the card is open, Send does nothing more. It is one-shot: the next message is normal again.
- A question longer than 1,000 characters is refused with the reason; nothing is sent.

How: `DeepResearch` has an `inline` mode. The app mounts a second instance next to the page's one and draws it into a slot at the end of the message list (a React portal). So a run keeps going while another tab is shown, and leaving the chat (another conversation) stops it. The research client, the pipeline and the send are the same code; no second send path.

Rule 7 holds: one send path, masked search texts only, allowance, masking and the stop switch unchanged.

The Research page was removed on 19 November 2026 (`docs/owner-decisions.md`); deep research stays in "+" > Deep research.

## Shorter failure notice (CC-06 follow-up)

Before: a failed answer showed its plain sentence with Retry in the message, and a longer notice above the message box said much the same ("Response timed out. Partial answers are excluded from future context. This request's cost remains unknown. No automatic retry was made.").

Now the notice says only what the message does not:

- Stopped by the user: no notice. The message says "Stopped by you."
- Timeout, busy, unavailable, cut off, and failures without a reason of their own: the message's sentence is repeated for screen readers only (a hidden status line), not shown twice.
- Kept as before: the verification limit with its countdown, a changed deployment, a reason the message has no sentence for (for example "Research answer withheld: ..."), and the backup model line ("One automatic retry with the backup model was made.").
- Dropped: "Partial answers are excluded from future context" (the folded explanation in the message says it), "Reported usage was retained" and "This request's cost remains unknown" (provider cost is shown in development builds only).

Unused keys left in `src/text/app.ts` (another agent owns it): `responseStopped`, `usageRetained`, `costUnknown`, `timedOut`, `protectedUnavailable`.

## Tests

- `tests/deep-research-chat-ui.test.ts` (as written on 16 November; the plan card and approval were removed on 18 November): 3 widths x 2 languages; the armed note with the cost, the card, Escape before and at the approval with the draft kept and focus in the message box, no search before the approval, the masked texts, the progress in the card, the answer in the conversation without a click, no "Show the answer", the cleared draft, the chat named by the question, one-shot, another tab and back at the approval; a new chat during the searches stops the run and gets nothing of it; a question over 1,000 characters refused; no item without the switch; nothing outside the machine.
- `tests/chat-recovery.test.ts` and `tests/chat-core-ui.test.ts` check the sentence in the message, the hidden status line and that the long text is gone. The placement check of the notice above the message box now uses the "new chat" notice.