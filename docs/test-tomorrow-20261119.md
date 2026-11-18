# Testing as a real user, 19 November 2026

**For:** the owner. **Written:** 18 November, overnight. Work through it one test at a time; tell me the test number and what you saw when something is off.

## Start the app on your computer (no keys, nothing leaves the machine)

```
npx tsx evaluation/audit-harness.ts --config on --serve --port 4317
```

Wait for "CometRow audit server (on) at http://localhost:4317" (the first build takes about a minute). Then open:

- http://localhost:4317/__audit/sign-in signs you in as the synthetic test account.
- http://localhost:4317 is the app. Every feature is switched on; answers, search, pictures and dictation are fakes from this server.
- Type `audit:<name>` in a message to pick an answer: `markdown code math table citations long slow error-429 error-500 error-503 dropped stop python image plain chart limit`.
- Ctrl+C in the terminal stops it.

In the Claude app you can also start it from the Browser pane: the launch entry is called "cometrow-full-features".

## The tests

Phone width and desktop width, English and German, as you like. Use made-up text only.

| # | Do | Expect |
|---|---|---|
| 1 | The sign-in page: http://localhost:4317/?account-lab=1 | One line under the buttons: "By continuing, you agree to our Terms and Privacy Policy", both links open. No other prompt or popup anywhere after sign-in. |
| 2 | Send a normal message, then `audit:markdown`, `audit:table`, `audit:code`. | Answers render cleanly; code blocks keep their formatting; Copy works. |
| 3 | Send `audit:long` and press Stop halfway. | The answer stops at once and says "Stopped by you." |
| 4 | Send `audit:limit`. | The message goes back into the message box, the conversation is as before, and one calm line says "Limit reached. It resets at HH:MM." No unit counts. |
| 5 | "+" > Deep research, then type a question and Send. | It starts at once: no plan card, no approval. One line in the chat ("Planning", "Searching 1 of 4", "Reading 2 of 6 pages") with "Stop the research". Then the answer appears in the conversation with numbered sources. |
| 6 | Same as 5, press "Stop the research" while it searches. | It stops at once; nothing more is searched. |
| 7 | Tools > Research > Deep research panel, type a question, "Start research". | Same progress line with Stop, then "The research is finished." and "Show the answer". |
| 8 | Microphone button (dictation): talk, stop. | The text lands in the message box. A long recording is never cut off for allowance halfway. |
| 9 | `audit:python` (a calculation). | The code runs on the device, the answer shows the result; "Show the code and its output" opens it. |
| 10 | Whiteboard, picture question (`audit:image`), chart (`audit:chart`). | Each works as before. |
| 11 | Settings, Account, Privacy Policy, Terms. | The documents open; nothing asks for consent again. |

## What changed today (deep research and usage rules)

- Deep research starts straight away; the plan card and the approval step are gone. One progress line and Stop.
- All 15 units of a run are charged at its start. Its answer never costs more and is never refused for allowance.
- Every feature: the allowance is checked only at the start. A start needs 1 unit left; it is charged its cost or what is left, so the balance stops at 0. At 0 the next start shows the one calm "Limit reached. It resets at X." message.
- A recording is checked at its first part only; its later parts, and in a voice conversation its answer, always go through.
- A calculation's code follow-ups (up to 3 per message, within 5 minutes) are never refused or charged.
- Background tasks: a run starts with 1 unit left; once it has searched it is never skipped for allowance.

## What the local app cannot show you

The fake server has no allowance ledger, so the "1 unit left" and "resets at" rules are proven by the automated tests, not by this app (test 4 only shows the message). They need the real deployment with a test account to see end to end.

## Still open for you

- The legal read of the sign-in line, Terms and Privacy (docs/legal-read-consent-20261118.md).
- Whether the AI line under the message box stays.
- The image provider for image creation.
- Text approvals and the whiteboard device tests T-158 to T-161 (docs/owner-test-list.md).
- The money decisions in docs/deep-research-20261114.md and the cut-off report (see the next section of the running log).
