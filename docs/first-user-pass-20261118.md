# First-time-user pass (18 November 2026)

After the scripted final pass, the agent went through CometRow as a new user with a real browser and cursor (the in-app browser): the full-feature local app (`npx tsx evaluation/audit-harness.ts --config on --serve --port 4317`, fake answers from the server, signed in as the synthetic test account through `/__audit/sign-in`), at desktop width (1,280 x 800) and phone width (375 x 812, Android emulation), in English and German, light and dark. Flows: sign-in page, first chat, "+" menu, file upload, voice, web search, whiteboard, settings and theme, deleting a chat, Secure Max intro.

Screenshots: `.local/ui-redesign/first-user-pass/` (numbered; `-before` and `-after`).

## Fixed in this pass

| # | Where | What felt wrong | What changed |
| --- | --- | --- | --- |
| 1 | Sign-in page | The status line under the email field was a bare grey bar, no padding or corners (01) | Calm note: padding, rounded corners, border |
| 2 | First message | The health question opened while the first-start notice was still on screen: two blocks of legal text at once; wide gaps between paragraphs, a small square "I agree" in the middle and "Not now" far right (02) | One decision at a time (the notice waits); compact text; both buttons together on the right, "I agree" as a pill |
| 3 | Empty chat | An unlabelled icon at the top right ("In this chat") with nothing to show | Shown once the chat has messages or a whiteboard |
| 4 | Chat title | A chat begun from a starter chip was named after the chip ("Help me write a clear, friendly message…"), so such chats all looked alike (04) | Named after the user's own words; unit test |
| 5 | Added files | Files appeared as plain rows below the message box (03) | Small chips just above the message box (also the reading order for screen readers); one line, the name shortens; on phones "included" is left out but "excluded" always shows |
| 6 | Voice panel | "Options" sat alone at the bottom left with no sign that it opens (05) | Centred, with a chevron that turns when open |
| 7 | Web search card | Heading and field label ran together; "Search and answer" in the middle and "Answer without searching" far right (06) | Heading on its own line over a small label; both buttons together on the right; texts unchanged |
| 8 | Whiteboard on desktop | With the left menu open the chat was about 440 px wide next to the board; titles wrapped over three lines (07) | The left menu folds away while the board is open and comes back after (unless the user had folded it) |
| 9 | Whiteboard question | The question showed "[Picture: not kept]" although the board is kept and opens from its card (08) | The label is left out for board questions |
| 10 | Chat menu in the left menu | The menu opened inside the scrolling chat list: "Manage history" and "Delete" were hidden below its edge (09) | Opening it scrolls the list so all of it shows |
| 11 | Chat menu icons | "Archive" and "Manage history" used the same box icon (15) | "Manage history" (opens Saved) uses the Saved icon, as in the account menu |
| 12 | Phone start screen | The starter chips ran off the right edge, cut hard ("Etwas plane…") (10) | A soft fade at the edge shows there is more to swipe |
| 13 | Phone message box | A longer message wrapped in a narrow column between "+" and "Auto"/microphone (11) | Once something is typed, the text takes the full width and the controls move to a row underneath (Auto next to the microphone) |
| 14 | Phone "+" menu | "Kontext prüfen" wrapped and its count was cut off ("2 Nachrichten einbezoge…") (12) | The count goes under the label |
| 15 | Phone whiteboard | In the chat view the Chat \| Whiteboard switch floated over the chat; text showed through around it (13, 14) | A solid band behind the switch; the header sits under it |
| 16 | Settings, language | The chosen language looked unselected and the other one selected (16) | The chosen language is the filled one |
| 17 | Language change | A notice shown before switching stayed in the old language (17) | Changing the language closes an open notice |
| 18 | File import list | Its status said "added", "reading" or "failed" in English in the German app (12) | Translated statuses in English and German |

## Not changed: suggestions for the owner

- **Three similar "+" entries:** "Search the web", "Deep research" and "Research" are hard to tell apart for a new user. Proposal: rename "Research" (the manual search and page panel) to something like "Search and read pages", or fold it into "Search the web". Product and text decision.
- **Texts to shorten** (waiting for the owner's text approvals in `docs/ui-text-shortening-proposal.md`): the delete notice ("Verschlüsselte Einträge und der zugehörige Schlüssel wurden gelöscht…" — "Chat deleted." would do); "mit allen Zweigen" ("with all branches") in the delete question is jargon; "Search the web first? Search the web for:" says it twice; the Secure Max intro needs scrolling on a laptop screen.
- **File import box:** after a successful upload the "File import results" box stays at the top although the chip shows the file. It is also the screen-reader announcement and many tests read it, so it stays; it could close by itself a few seconds after every file was added.
- **Voice conversation on Android:** not offered at all, because read aloud does not speak on Android (`src/LiveVoice.tsx`). iPhone and desktop have it. Worth a decision before Android users are invited.
- **Keyboard shortcuts on phones:** the account menu lists them on a touch phone, where they do little.
- **Whiteboard on phones:** the board keeps its 16:10 shape, so it is small with empty space above and below; pinch-zoom is on the build-later list.
- **Sign-in page in the local app:** shows "The synthetic account service is not running here" because the local app has no account backend; the real page is the same component (see `docs/production-sign-in-options-20261118.md`).

## Checked and fine

First answer streaming and following the answer; the "+" menu on both widths; the first-start notice (new text, EN and DE); Settings (sections, theme applies at once, language); the delete question (desktop and phone); the Secure Max intro (EN and DE, scrolls inside its dialog on a phone); the whiteboard: drawing, chip, sending once, card; the phone drawer.

## Not covered by this pass

A real file picker (the browser pane cannot drive it; files were handed to the upload field directly), real microphone input (voice was opened, not spoken to), Safari and iPhone (owner's T-158 to T-161), the real sign-in backend.
