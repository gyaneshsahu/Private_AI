# Owner live test list (18 November 2026)

**What this is:** every test for the owner-only live test on the real site, grouped by area. Run it after the setup in `docs/owner-live-test-setup-20261118.md` is done and chat is on for you and your test account.

**How to use it:**
- Go section by section. Tick each test with **P** (pass), **F** (fail) or **S** (skipped, with the reason).
- For every F, and for anything you want changed, add a line to the **findings log** at the end. Use the test number, for example "4.3".
- Send the agent the findings log after each section, or at the end of a day. The agent fixes the problems; you then rerun the failed tests (section 31).
- Use made-up content only: no real names, addresses or documents. The image provider for your test may train on prompts (setup doc, D1).

**Words used:**
- **A** is your account; **B** is the test Google account.
- **PC** is Windows Chrome unless the test says otherwise. **Phone** is your Android or iPhone. **Tablet** is any tablet.
- **Shell** is the Render dashboard, service `private-ai-deployment`, then **Shell**.
- "Units": Fast 1, Thinking 5, picture question 2, deep research 15, voice 1 per 30-second part. The rest is in section 20.

**Before the first test:**
- **Allowance.** Your friends will get the alpha plan: 150 units a week and 40 a day. A full pass of this list uses more than 40 in a day. So for your test, set `"metering": { "enabled": true, "plan": "premium" }` in `render-config.json` (150 a day, 600 a week, more pictures, voice and research), and set it back to `"alpha"` before friends come. The limit tests in section 20 use account B and a database edit, so they work with either plan.
- **Cost.** One full pass costs well under EUR 10: Privatemode tokens, about 60 Brave searches (about USD 0.30) and about 10 created images (about EUR 0.15 to 0.30). Check the Privatemode portal at the end of each day (test 25.6).

## Core path (do these 46 first)

**What this is:** the shortest pass that touches everything a friend will use. About 2 hours on the PC plus 20 minutes on the phone. If all 46 pass, the build is good enough to go on with the full list below; if one fails, write it in the findings log as "C.n" and carry on. The number in brackets is the full test it comes from. C.20, C.21 and C.35 are new (fixes of 25 November).

| # | Do | Expect | P/F |
| --- | --- | --- | --- |
| C.1 | Open `https://app.cometrow.com/readyz`, then sign in with A and open `/api/status` (0.1, 0.2) | `200`; the status lists the features and `inference` shows `"ready": true` | |
| C.2 | Signed out, open the app (2.1) | Sign-in page with "Continue with Google" and the one line about Terms and Privacy Policy | |
| C.3 | Sign in with A (2.2) | The app opens. No popup, notice, card or consent anywhere | |
| C.4 | Sign in with a Google account that is not on the list (2.5) | Refused; no app opens | |
| C.5 | Sign in with B in another browser; A writes a chat (2.4, 3.1) | B's app is empty and stays empty | |
| C.6 | **Fast**: "Write two sentences about autumn." (4.1) | The answer streams within a few seconds | |
| C.7 | **Thinking**: "A train leaves at 09:17 and arrives at 11:52. How long is the trip in minutes? Show the steps." (4.2) | 155 minutes, with steps | |
| C.8 | A long answer, press **Stop** halfway (4.4) | Stops at once with "Stopped by you."; the partial answer can be copied | |
| C.9 | **Copy** an answer, then **Retry** it, then **Edit** your message and send (4.5 to 4.8) | Copy pastes the full text; Retry and Edit make branches you can switch between | |
| C.10 | Ask for a markdown table, a Python code block and a formula (4.9) | All render cleanly; "Copy code" says "Copied" | |
| C.11 | Sidebar: rename a chat, pin it, archive another, delete a third (4.12, 4.13) | Each works; delete asks first | |
| C.12 | Ctrl+K, search for a word in a chat title (4.14) | The chat is found | |
| C.13 | **New incognito chat**, one message, reload (4.16) | "Incognito chat · Not saved"; gone after reload | |
| C.14 | Ask in German: "Was ist die Hauptstadt von Frankreich?" (4.20) | The answer is in German | |
| C.15 | Ask "What is the current ticket price for the Hamburg Elbphilharmonie plaza?" (5.1) | It searches by itself, answers with numbered sources, and shows "Searched the web" | |
| C.16 | Tap "Searched the web" (5.2) | The exact searched text and the sources; each source opens | |
| C.17 | Ask "Explain how photosynthesis works" (5.3) | No search, no "Searched the web" line | |
| C.18 | A question with "pia@example.test" that needs a search (5.6) | The searched text shows the address replaced | |
| C.19 | Settings > General: turn "Look things up online" off, ask C.15 again, turn it on (5.7) | Off: no search. On by default | |
| C.20 | **New.** Account > Your usage, the "Web searches" line | The daily number is 60 on the premium plan | |
| C.21 | **New, B only, optional.** Use up B's searches for the day, then ask C.15 as B | B gets a normal answer without a search, and one calm line: "Today's web searches are used up, so this answer does not use web results. Searching works again within 24 hours." No error | |
| C.22 | "+" > **Deep research**: "Compare heat pumps and gas heating for a German flat in 2026" (6.1, 6.2) | It starts at once, shows one progress line with "Stop the research", and ends with numbered sources | |
| C.23 | Attach a PDF of 50 to 100 pages and ask about a fact on a late page (7.2) | The right answer and page; the note says which passages were sent | |
| C.24 | **Photo to text** on printed text (7.6) | The text is read on the device and editable before sending | |
| C.25 | "+" > **Ask about a picture** with a photo of a shopping list; cover a part, attach, ask "What does this picture show?" (8.1 to 8.3) | Boxes work; a sensible answer; the chat keeps "[Picture: not kept]" | |
| C.26 | "+" > **Create image**: "A calm lake at sunrise, watercolour style", then Download (9.1, 9.2) | An image within about 30 s; the file saves and opens | |
| C.27 | "A realistic photo of Angela Merkel" (9.4) | Refused; no count used | |
| C.28 | Tap the microphone, say a sentence, tap again (10.1) | The text lands in the box; nothing is sent | |
| C.29 | "What is 19 % of 6,420 EUR?" (11.1) | 1,219.80 with "Calculated with code on this device" | |
| C.30 | "Show Germany's population for 2018 to 2024 as a chart" (12.1) | A line chart with a title and units | |
| C.31 | **Read aloud** on an answer, then "Export as PDF" (13.1, 13.4) | A voice reads it; the PDF is clean black on white | |
| C.32 | **Open in canvas**, edit, "Ask for changes": "make it shorter", Apply (14.1 to 14.3) | The panel opens on the right; nothing changes until Apply | |
| C.33 | "Remember that I am vegetarian", Save; in a new chat ask for a dinner idea (15.1, 15.2) | Not sent as a message; the new answer respects it and says 1 memory was sent | |
| C.34 | Create a project with instructions and a PDF; "New chat in this project", ask about the file (16.1 to 16.3) | Uses the file and the instructions | |
| C.35 | **New.** Open the project, press the pencil beside a chat, type a new name, Enter. Then again and press Esc | Enter saves and the new name shows in the project and the sidebar; Esc keeps the old name | |
| C.36 | Left menu > **Whiteboard**: draw, write "Kitchen", ask "What is on my whiteboard?" (17.1, 17.2, 17.4) | A sensible answer with a "Whiteboard" card on the question | |
| C.37 | **Scheduled** > a template, time 2 minutes ahead, Manual; wait; Run now (18.1 to 18.3) | The due strip appears; Run now makes a new chat | |
| C.38 | Chat on the PC, then sign in on the phone (19.2, 19.3) | The chat is there; continue it on the phone and both devices show both parts | |
| C.39 | Account menu, then Account > **Your usage** (20.1, 20.2) | The compact line and the page with week, today and daily limits; rows line up; no euros | |
| C.40 | **Secure Max** the first time; turn on sync and save the recovery key (21.1 to 21.3) | The one consent dialog; the key is shown once; "Sync is on." | |
| C.41 | Settings: open every tab; Security on the phone too (22.1) | Each opens; the Security rows line up, one under the other | |
| C.42 | Data controls > "Export my chats" > Markdown (22.3) | The file holds your test chats; no incognito chat | |
| C.43 | `/terms`, `/privacy` and the footer (23.1, 23.5) | Both open; the footer says "No advertising. No training on your data." | |
| C.44 | `https://app.cometrow.com/no-such-page`; then go offline during a streaming answer (24.1, 24.3) | The CometRow "Page not found" page; a plain sentence with Retry, no blank page | |
| C.45 | Shell: `touch /tmp/cometrow-chat-stop`, send; `rm` it, send (25.1, 25.2) | Refused at once, then works again | |
| C.46 | Phone: sign in, C.6, C.15, C.26, and "Add to Home screen" (4.1, 5.1, 9.1, 1.6) | All work; nothing is cut off; the CometRow icon opens the app | |

## Index

| Section | Area | Tests |
| --- | --- | --- |
| C | Core path (above; do it first) | C.1 to C.46 |
| 0 | Set-up check | 0.1 to 0.6 |
| 1 | Website to app | 1.1 to 1.6 |
| 2 | Sign-in, consent and sessions | 2.1 to 2.9 |
| 3 | Permissions and account isolation | 3.1 to 3.8 |
| 4 | Chat basics | 4.1 to 4.22 |
| 5 | Web search (automatic) | 5.1 to 5.11 |
| 6 | Deep research | 6.1 to 6.8 (no 6.5) |
| 7 | Files and documents | 7.1 to 7.10 |
| 8 | Ask about a picture | 8.1 to 8.8 |
| 9 | Image creation | 9.1 to 9.8 |
| 10 | Voice: dictation and voice conversation | 10.1 to 10.11 |
| 11 | Calculations with code | 11.1 to 11.6 |
| 12 | Charts | 12.1 to 12.4 |
| 13 | Read aloud and PDF export | 13.1 to 13.6 |
| 14 | Canvas | 14.1 to 14.8 |
| 15 | Memory | 15.1 to 15.8 |
| 16 | Projects | 16.1 to 16.8 |
| 17 | Whiteboard | 17.1 to 17.8 |
| 18 | Scheduled tasks and background tasks | 18.1 to 18.10 |
| 19 | Secure mode: saving and a second device | 19.1 to 19.7 |
| 20 | Usage, allowance and limits | 20.1 to 20.9 |
| 21 | Secure Max, sync and recovery key | 21.1 to 21.11 |
| 22 | Settings, data controls, export and delete | 22.1 to 22.9 |
| 23 | Legal pages, Help and footer | 23.1 to 23.6 |
| 24 | Errors, offline and recovery | 24.1 to 24.8 |
| 25 | Your operator controls | 25.1 to 25.8 |
| 26 | Database, server and logs | 26.1 to 26.7 |
| 27 | Devices and browsers | 27.1 to 27.8 |
| 28 | Accessibility | 28.1 to 28.6 |
| 29 | Speed | 29.1 to 29.5 |
| 30 | German interface (only if switched on) | 30.1 to 30.5 |
| 31 | Retest round and sign-off | 31.1 to 31.3 |
| | Findings log (you fill it in) | |

**Suggested order over several days:**
- **Day 1:** sections 0 to 7 on the PC.
- **Day 2:** sections 8 to 18 on the PC.
- **Day 3:** sections 19 to 26, with the phone as the second device.
- **Day 4:** sections 27 to 30 on the phone and tablet.

Stop and send the findings log whenever something blocks you.

---

## 0. Set-up check (PC, account A)

| # | Do | Expect | P/F |
| --- | --- | --- | --- |
| 0.1 | Open `https://app.cometrow.com/readyz` | `200` (a short page) | |
| 0.2 | Sign in, then open `https://app.cometrow.com/api/status` | It lists `voice`, `images`, `imageCreation`, `code`, `research`, `secureStore`, `vaultSync`, `backgroundTasks`, `metering`; `inference` shows `"ready": true` | |
| 0.3 | Look at the left menu | "Whiteboard" and "Scheduled" are there, which proves the build switches reached Render | |
| 0.4 | Render **Logs** at start | `CometRow restricted deployment listening; email disabled, chat enabled for allowlisted accounts.` and `CometRow manifest check: ... is approved and served.`; no `startup failed` | |
| 0.5 | On your laptop: `node scripts/check-headers.mjs https://app.cometrow.com` | `HEADER CHECK PASSED` | |
| 0.6 | Privatemode portal: write down the token and cost figures now | A starting number for 25.6 | |

## 1. Website to app (PC, then phone)

| # | Do | Expect | P/F |
| --- | --- | --- | --- |
| 1.1 | Open `https://cometrow.com` | The website loads over https with no browser warning, on PC and phone | |
| 1.2 | Click the website's sign-in or "open app" link | Lands on `https://app.cometrow.com` sign-in, not a 404 | |
| 1.3 | Compare the website's Privacy, Terms and Imprint links with the app's | The same documents, or clearly the same content; no contradiction (for example about training or storage) | |
| 1.4 | What the website promises (privacy, features, price) | Every promise is true in the app today; note any feature promised but missing | |
| 1.5 | Share `https://app.cometrow.com` in a chat app (WhatsApp, Signal) | A preview with the CometRow name and image | |
| 1.6 | Phone: "Add to Home screen" from the app | The CometRow icon; it opens the app | |

## 2. Sign-in, consent and sessions

| # | Do | Expect | P/F |
| --- | --- | --- | --- |
| 2.1 | Signed out, open the app | Sign-in page with "Continue with Google" and one line: "By continuing, you agree to our Terms and Privacy Policy." Both links open the documents | |
| 2.2 | Sign in with A | The app opens. No popup, notice, card or consent anywhere after sign-in | |
| 2.3 | Sign out (account menu), then sign in again | Works both ways; after sign-out you are on the sign-in page | |
| 2.4 | Sign in with B in another browser or profile | Works; B's app is empty | |
| 2.5 | Sign in with a Google account that is **not** on the list | Refused; no app opens | |
| 2.6 | Close the browser, come back the next day | Still signed in (a session lasts 14 days without use and at most 90 days after sign-in) | |
| 2.6a | Signed in on PC and phone: Settings > Security > **Sign out everywhere** on the PC | It asks first. Then the PC is on the sign-in page, and the phone asks you to sign in on its next action. B stays signed in | |
| 2.7 | Account page: the sign-in methods and active sessions | Your sessions are listed; no "Add passkey" button | |
| 2.8 | Two tabs signed in; sign out in one, use the other | The other tab also asks you to sign in on its next action | |
| 2.9 | Sign in on the phone while the PC stays signed in | Both stay signed in | |

## 3. Permissions and account isolation (A on PC, B in another browser)

| # | Do | Expect | P/F |
| --- | --- | --- | --- |
| 3.1 | A writes a chat. B looks at the sidebar and search | B sees nothing of A's | |
| 3.2 | `/api/status` in A's and B's browser | A different `accountId` for each | |
| 3.3 | In A's browser, press F12, open Console and run `fetch('/api/status', {headers: {'X-Account-ID': '<B accountId>'}}).then(r => r.json()).then(j => j.accountId)` | It prints **A's** id, never B's | |
| 3.4 | Sign out A, then open `/api/status` in the same tab | 401 or 403, no account data | |
| 3.5 | In a private window that is not signed in, open `https://app.cometrow.com/api/status` | Refused, no data | |
| 3.6 | B uses up a feature limit (section 20); A sends a message | A is not affected | |
| 3.7 | Open `https://app.cometrow.com/terms` and `/privacy` signed out | Both open without sign-in | |
| 3.8 | Microphone and camera permission | The browser asks only after you tap the microphone or camera button, never at page load | |

## 4. Chat basics (PC, then repeat 4.1 to 4.8 on the phone)

| # | Do | Expect | P/F |
| --- | --- | --- | --- |
| 4.1 | **Fast**: "Write two sentences about autumn." | The answer streams within a few seconds, with three moving dots before the first word | |
| 4.2 | **Thinking**: "A train leaves at 09:17 and arrives at 11:52. How long is the trip in minutes? Show the steps." | 155 minutes, with steps; the first word within 2 minutes | |
| 4.3 | **Auto**: a simple question, then a hard one | Auto picks a mode and says which | |
| 4.4 | A long answer ("Explain the history of trains in 1,500 words"), press **Stop** halfway | Stops at once with "Stopped by you."; the partial answer can be copied | |
| 4.5 | Under an answer: **Copy**, then paste into Notepad | The full answer text | |
| 4.6 | **Retry** menu: "Retry last response", then "Answer again with Thinking" | Each label shows its cost; new answers appear as branches ("Retry 1") | |
| 4.7 | **Edit** your own message and send | The box grows; Send shows the cost; the old version stays as the branch "Original" | |
| 4.8 | Switch between branches | The text switches; nothing is lost | |
| 4.9 | Formatting: ask for a markdown table, a numbered list, a code block in Python and a formula (for example "the quadratic formula in LaTeX") | All render cleanly; the code block has "Copy code", which says "Copied" | |
| 4.10 | A very long message of your own (paste about 40 lines) | Shown cut with "Show more"; nothing jumps | |
| 4.11 | Start "New chat" while an answer is streaming | It asks "Stop the current answer and start a new chat?" | |
| 4.12 | Sidebar: rename a chat (Enter saves, Esc cancels) | Works; the order is by last activity | |
| 4.13 | Sidebar: pin, archive, delete a chat | Each works; delete asks first; an archived chat appears in Settings, Archived chats | |
| 4.14 | Sidebar search (Ctrl+K) for a word in a chat title | The chat is found | |
| 4.15 | Chat title | The first line of your first message, cut at a whole word, with "…" | |
| 4.16 | **New incognito chat** | The banner "Incognito chat." and the caption "Incognito chat · Not saved"; after reload the chat is gone; it never appears on the phone. Note the banner's exact second sentence in the findings log (two docs disagree about it) | |
| 4.17 | "Report a problem" under More | Help opens with "An answer was incorrect or misleading" preselected | |
| 4.18 | Three chats at once: start answers in three tabs, then a fourth | The fourth waits or says three are running; none breaks | |
| 4.19 | Reload during a streaming answer | No blank page; the chat is still there (the partial answer may be lost, and is labelled if so) | |
| 4.20 | Ask in German: "Was ist die Hauptstadt von Frankreich?" | The answer is in German | |
| 4.21 | Phone: Enter on the on-screen keyboard | Makes a new line; only the Send button sends | |
| 4.22 | PC: Enter sends, Shift+Enter makes a new line | As described | |

## 5. Web search (automatic, like ChatGPT)

Search is automatic (decision of 19 November, `docs/owner-decisions.md`). You never choose or approve a search. The app looks things up when a question needs current information; you see the answer, a small "Searched the web" line and the sources.

| # | Do | Expect | P/F |
| --- | --- | --- | --- |
| 5.1 | Ask "What is the current ticket price for the Hamburg Elbphilharmonie plaza?" | It searches by itself (no card, no button), then answers with numbered sources. Under the answer: one quiet line, "Searched the web" | |
| 5.2 | Tap "Searched the web" | It opens: "Searched for: “…”" with the exact text that was searched, and the list of sources. Each source opens in a new tab | |
| 5.3 | Ask "Explain how photosynthesis works" | No search, no "Searched the web" line: a timeless question is answered directly | |
| 5.4 | Ask "Wie hoch ist die Gebühr für einen neuen Personalausweis?" | It searches by itself and answers from the results, preferring an official site | |
| 5.5 | Ask "Search the web for heat pump subsidies 2026", then "Recherchiere die Öffnungszeiten des Bürgeramts Münster" | Both search: asking in words is enough | |
| 5.6 | A question with a made-up email address: "What is the current fee for transfers to pia@example.test?" | It searches; tapping "Searched the web" shows the email address replaced, never the real one | |
| 5.7 | Settings > General: **"Look things up online"** | The switch is ON by default, with one line explaining it. Turn it OFF, ask 5.1 again: no search, no "Searched the web" line. Turn it back ON | |
| 5.8 | Open the "+" menu | No "Search the web" item and no "Research" item. Only things you choose yourself (files, pictures, deep research, …) | |
| 5.9 | Reload the chat from 5.1, then open "Searched the web" | The searched text is still there; the results were not kept, so it says so. "Search again" on the chat searches at once and answers again | |
| 5.10 | Account usage page | "Web searches" went up by one for each search above | |
| 5.11 | Look at the line on a phone, in light and dark theme | Small, quiet, not cut off, easy to tap | |

## 6. Deep research

| # | Do | Expect | P/F |
| --- | --- | --- | --- |
| 6.1 | "+" > **Deep research**, type "Compare heat pumps and gas heating for a German flat in 2026: costs, subsidies, pros and cons", then Send | It starts at once: no plan card, no approval. One line in the chat ("Planning", "Searching 1 of 4", "Reading 2 of 6 pages") with "Stop the research" | |
| 6.2 | Wait for it to finish (up to 8 minutes) | The answer appears in the conversation with numbered sources that open | |
| 6.3 | Usage page | 15 units counted once, at the start. "Deep research runs" went up by 1 | |
| 6.4 | Start another run and press **Stop the research** while it searches | It stops at once; nothing more is searched | |
| 6.6 | A question containing a made-up email address (for example "pia@example.test") | The email address never appears in a search text (the agent can check the counts); the answer still works | |
| 6.7 | Export the research answer as PDF | The answer and its sources are in the PDF | |
| 6.8 | Use up the daily research runs (premium 5, alpha 3), then start one more | The calm limit message; the question goes back into the box; no units counted | |

## 7. Files and documents

| # | Do | Expect | P/F |
| --- | --- | --- | --- |
| 7.1 | Attach a small `.txt` with three made-up lines including "pia@example.test", then ask "Who is the customer?" | Correct answer; the email address is masked before sending | |
| 7.2 | Attach a PDF of 50 to 100 pages (a public report) and ask about a fact on a late page | The right answer and the right page; the note says which passages were sent, for example "9 of 412 passages" | |
| 7.3 | A Word `.docx` with a made-up table | A value from the table is found | |
| 7.4 | An Excel `.xlsx` with made-up numbers | Found (dates may show as numbers: a known limit) | |
| 7.5 | A scanned PDF (a photo of a printed page saved as PDF) | The text is read on the device (first 5 pages only); umlauts, ß and € correct | |
| 7.6 | **Photo to text**: take a photo of printed text | The text is read on the device and editable before sending | |
| 7.7 | Drag a file onto the chat (PC) | A "Drop files here" frame; the file attaches | |
| 7.8 | A file over 10 MB | Refused with a clear reason | |
| 7.9 | Attach a file but do not send, then leave the chat | The file is not stored as a chat | |
| 7.10 | Context review before sending (the line above the box) | Shows what goes with the question | |

## 8. Ask about a picture

| # | Do | Expect | P/F |
| --- | --- | --- | --- |
| 8.1 | "+" > **Ask about a picture**, choose a photo of a shopping list you wrote | Turn and crop, then "Next: cover private parts"; no health question, no first-use notice | |
| 8.2 | Draw a box, "Suggest boxes", "Undo" | Boxes work; "Suggest boxes" finds text on the device | |
| 8.3 | "Next: check the picture", then "Attach to my message", then ask "What does this picture show?" | A sensible answer. The label says the Fast model read it. The chat keeps "[Picture: not kept]" | |
| 8.4 | Thinking selected, then attach a picture | It says pictures are read by the Fast model | |
| 8.5 | Paste a screenshot into the message box (Ctrl+V) | It opens "Ask about a picture" | |
| 8.6 | A HEIC or WebP picture | Refused with a clear reason | |
| 8.7 | A follow-up question without a picture | The picture is not sent again | |
| 8.8 | Usage page | Picture questions up by 1; 2 units | |

## 9. Image creation

| # | Do | Expect | P/F |
| --- | --- | --- | --- |
| 9.1 | "+" > **Create image**: "A calm lake at sunrise, watercolour style" | "Creating the image…", then an image card with "Download" and "Regenerate", within about 30 s (no cut-off: this checks the Render fix) | |
| 9.2 | Download | The image file saves and opens | |
| 9.3 | Regenerate | A new image | |
| 9.4 | "A realistic photo of Angela Merkel" | Refused: "Images of real, named people cannot be created…"; no count used | |
| 9.5 | Reload, then open the chat on the phone | The image is still in the chat on both devices | |
| 9.6 | The line "N of 3 images left today" (or the plan's number) | Goes down by one per image | |
| 9.7 | After a short visual answer: "Create an image from this answer" | Works | |
| 9.8 | Usage page and the image provider's dashboard | "Created image" counted; the provider shows the same number of images | |

## 10. Voice: dictation and voice conversation

| # | Do | Expect | P/F |
| --- | --- | --- | --- |
| 10.1 | Tap the microphone, allow it, say "Please remind me to water the plants on Tuesday", tap again | "Turning speech into text…", then the text in the box. **Nothing is sent** | |
| 10.2 | The browser's permission prompt | It appears only after the tap | |
| 10.3 | Dictate for about 70 seconds (count slowly) | All parts arrive; the 30-second boundaries lose no words | |
| 10.4 | "Voice today" line | Shows used and left; matches your speaking time within seconds | |
| 10.5 | Dictate past 2:40 | "Stops in 0:19", then it stops at 3:00 and keeps the text | |
| 10.6 | Deny the microphone in the browser, then tap | "Microphone access was refused…" | |
| 10.7 | **Voice conversation** (PC Chrome or iPhone): "Start talking", ask a question, stop talking | Sent about 1 second after you stop; the answer is read aloud sentence by sentence | |
| 10.7a | In a voice conversation ask "What's the weather in Hamburg tomorrow?" | It searches by itself and reads the answer; it never stops to ask about searching | |
| 10.8 | Talk over the answer | It stops reading and listens | |
| 10.9 | Pause and Resume, then End | The microphone turns off at End and Pause | |
| 10.10 | Switch to another tab during a voice conversation | "Paused because the page went to the background. The microphone is off." | |
| 10.11 | Android phone | No voice-conversation button (decided); dictation works | |

## 11. Calculations with code

| # | Do | Expect | P/F |
| --- | --- | --- | --- |
| 11.1 | "What is 19 % of 6,420 EUR?" | "Calculating on your device…", then 1,219.80 with "Calculated with code on this device" | |
| 11.2 | "Show the code and its output" | Python code and output, each with Copy | |
| 11.3 | "Calculate exactly: 123456789 × 987654321, and the sum of 1 to 10000" | 121932631112635269 and 50005000 | |
| 11.4 | The first calculation on the phone | A one-time download (about 13.5 MB); the second is fast | |
| 11.5 | "What is the capital of France?" | No code mark | |
| 11.6 | Usage page | The calculation counts 1 unit; its follow-up steps cost nothing | |

## 12. Charts

| # | Do | Expect | P/F |
| --- | --- | --- | --- |
| 12.1 | "Show Germany's population for 2018 to 2024 as a chart" | A line chart with a title and units | |
| 12.2 | "Compare average rent per m² in Berlin, Munich, Hamburg and Cologne" | A bar chart | |
| 12.3 | "What is the capital of Spain?" | No chart | |
| 12.4 | The chart on the phone, light and dark theme | Readable in both | |

## 13. Read aloud and PDF export

| # | Do | Expect | P/F |
| --- | --- | --- | --- |
| 13.1 | **Read aloud** on an English answer (PC) | A local voice reads it; code is skipped ("Code block omitted.") | |
| 13.2 | Read aloud on a German answer | A German voice, or a clear message that none is installed | |
| 13.3 | Read aloud on Android | It does not speak and says why (on purpose) | |
| 13.4 | "Export as PDF" on an answer | The print dialog; "Save as PDF" gives a clean black-on-white page with question, answer, sources and the footer | |
| 13.5 | "Export conversation as PDF" (conversation menu) | The whole conversation | |
| 13.6 | Masked text in the PDF | Stays masked | |

## 14. Canvas

| # | Do | Expect | P/F |
| --- | --- | --- | --- |
| 14.1 | Under an answer: **Open in canvas** | A "Canvas" panel on the right on PC; full screen with "Back to chat" on the phone | |
| 14.2 | Edit the text, then Preview | Your edit shows | |
| 14.3 | "Ask for changes": "make it shorter" | The button shows its cost; "Proposed changes" with Apply or Discard; nothing changes until Apply | |
| 14.4 | Undo last change | "Canvas restored to the version before." | |
| 14.5 | A table answer: Table view, add a row, paste cells from Excel | The table grows | |
| 14.6 | Download .md and .csv | Both open correctly; umlauts right | |
| 14.7 | Export canvas as PDF | The canvas alone | |
| 14.8 | Reload | The canvas is kept; the undo list is gone | |

## 15. Memory

| # | Do | Expect | P/F |
| --- | --- | --- | --- |
| 15.1 | "Remember that I am vegetarian" | **Not sent**. The card "Save as a memory?" with Save memory, "Send as a message instead" and Cancel | |
| 15.2 | Save, then in a new chat ask "Suggest a dinner, keeping my diet in mind" | The answer respects it; the note "1 memory was sent with this question" | |
| 15.3 | Settings > Memory: add, edit, "Always include", delete | Each works; delete asks first | |
| 15.4 | Incognito chat: the same question | No memory used, no note | |
| 15.5 | Chat menu: untick "Use memory in this chat" | No memory is sent | |
| 15.6 | "Forget all" | Asks first; the list is empty | |
| 15.7 | On the phone after sign-in | The same memories | |
| 15.8 | A memory saved in Secure Max | Used only in Secure Max chats | |

## 16. Projects

| # | Do | Expect | P/F |
| --- | --- | --- | --- |
| 16.1 | Create a project, write instructions ("Always answer in bullet points"), Save | "Instructions saved." | |
| 16.2 | Add a PDF file to the project | Read on the device, then listed | |
| 16.3 | "New chat in this project", ask about the file | Uses the file and the instructions; the note "Project instructions were sent…" with the file and pages | |
| 16.4 | Move the chat out of the project ("Move to project" > "No project"), then ask again | No project data is used | |
| 16.5 | Remove the file | Asks first; old answers keep their notes | |
| 16.6 | Rename the project | Works | |
| 16.7 | Delete the project, "Keep its chats as ordinary chats" | The chats stay | |
| 16.8 | Open the project on the phone | The same instructions and files (the files download when opened) | |

## 17. Whiteboard

| # | Do | Expect | P/F |
| --- | --- | --- | --- |
| 17.1 | Left menu > **Whiteboard** | The board beside the chat on PC; a "Chat \| Whiteboard" switch on the phone | |
| 17.2 | Draw with pen, box, arrow, text "Kitchen", a note; change colours | Each works | |
| 17.3 | Undo three times, then "Clear the board" (asks first), then undo | Each Undo removes one item; Clear can be undone | |
| 17.4 | Ask "What is on my whiteboard?" | The chip "Whiteboard goes with your question"; a sensible answer; a "Whiteboard" card on the question | |
| 17.5 | Ask "Thanks" without changing the board | No chip, no card | |
| 17.6 | "In this chat" (top right) | Lists the whiteboard with Open and Download | |
| 17.7 | Phone: draw with a finger | The page does not scroll or zoom while drawing | |
| 17.8 | Open the chat on the other device | The board is there | |

## 18. Scheduled tasks and background tasks

| # | Do | Expect | P/F |
| --- | --- | --- | --- |
| 18.1 | Left menu > **Scheduled** > Templates > "A new German word every day", set the time 2 minutes ahead, **Manual** | Created; shows "Next: …" | |
| 18.2 | Wait until it is due | The strip "1 scheduled task is due" with "Run now" and "Skip this time" | |
| 18.3 | Run now | A new chat with one message; "Next" moves to tomorrow | |
| 18.4 | In chat: "can you give me a new German word to learn every 2 days" | The card "Create a scheduled task?" (it asks for a time); Create sends nothing | |
| 18.5 | "what is a weekly schedule?" | No card; a normal answer | |
| 18.6 | "Export to calendar" and import into your phone calendar | The entry says "CometRow task" and holds no instruction text | |
| 18.7 | New task, **Auto: background task**, daily, 10 minutes ahead, instruction "Tell me today's top news in Germany" | No search checkbox in the form. Created with "Background task", "Stored on our server and readable by it…" and its cost per run (it includes the search, decided from the instruction) | |
| 18.7a | Manual task "What is the weather in Berlin today?", then Run now | It searches by itself like a chat message; the answer has "Searched the web" | |
| 18.8 | After the due time (keep the app closed) | The result arrives as a new chat "<name> (background task)" when you open the app | |
| 18.9 | Delete the Auto task | It asks first and says the server copy is deleted | |
| 18.10 | Pause and Resume a task | Works; a paused task does not run | |

## 19. Secure mode: saving and a second device

| # | Do | Expect | P/F |
| --- | --- | --- | --- |
| 19.1 | The caption under the chat | "Secure · Saved to your account automatically" | |
| 19.2 | Chat on the PC, then sign in on the phone | The chat is there right after sign-in, with its sources (no raw ids like `[synthetic-0002]`) | |
| 19.3 | Continue the chat on the phone, then reload on the PC | Both devices show both parts | |
| 19.4 | Delete a chat on the phone | Gone on the PC after reload | |
| 19.5 | Make a change, go offline at once, then sign out | It warns: "Some changes have not reached your account yet…" | |
| 19.6 | After sign-out, look in the browser (sign in as B on the same browser) | Nothing of A's is visible | |
| 19.7 | Settings and Help texts in Secure | They never say "we never can" read it or "only on this device". Help, "Your privacy boundaries", section "What we can see": four short lines; saved chats are readable by CometRow, Secure Max chats are not | |

## 20. Usage, allowance and limits

| # | Do | Expect | P/F |
| --- | --- | --- | --- |
| 20.1 | Account menu | A compact line such as "138 of 150 requests left this week · 32 left today" | |
| 20.2 | Account > **Your usage** | Week and today counts, daily limits (pictures, research, searches, voice), "This week by feature", "Latest requests"; no euros | |
| 20.3 | Send one Fast and one Thinking message; watch the counts | Down by 1 and 5 | |
| 20.4 | **Limit, B only.** Run this as the owner role (Render database shell): `UPDATE usage_allowances SET request_limit = <B used + 1> WHERE account_id = '<B accountId>' AND ends_at > (extract(epoch FROM now()) * 1000);` Then B sends two Fast messages | The first works. The second shows "Limit reached. It resets at HH:MM."; the message goes back into the box; no unit counts shown | |
| 20.5 | With 1 unit left, B sends a **Thinking** message (cost 5) | It is allowed; the balance stops at 0, never below | |
| 20.6 | B at 0 starts deep research, a picture question and dictation | Each refused at the start with the same calm message; none starts | |
| 20.7 | B with 1 unit left starts a long dictation | It is never cut off midway for allowance | |
| 20.8 | Afterwards, set B's limit back (the same UPDATE with the plan's number) | B can chat again | |
| 20.9 | Daily cap (optional): the same for the day count | The day limit refuses with the same calm message | |

## 21. Secure Max, sync and recovery key

| # | Do | Expect | P/F |
| --- | --- | --- | --- |
| 21.1 | Left menu > **Secure Max** the first time | The dialog "Open Secure Max?" with "What is different", the tick "I understand that CometRow cannot recover this data for me." and "Use Secure Max". This is the only consent screen in the app | |
| 21.2 | Turn on sync: device name, Continue | "Your recovery key": 7 groups of 4, Copy, Download, Print; "This key is shown only once." | |
| 21.3 | "I have saved it", type a wrong last group, then the right one | Wrong: "That does not match the last group…". Right: "Sync is on. This device is the first in your list." | |
| 21.4 | A Secure Max chat, then "Lock now" | The section locks; its chats never show outside it | |
| 21.5 | Leave it idle for 15 minutes | It locks by itself | |
| 21.6 | Phone: open Secure Max > "Approve from another device" | An 8-character code (XXXX-XXXX). On the PC a quiet notice "A device asked to join…" > "Review the request" > tick "I am holding this device" > code > Approve | |
| 21.7 | The phone after approval | "This device is approved. Your saved data is arriving."; the chats appear | |
| 21.8 | A third browser: "Use your recovery key", make one typo first | A hint ("This key does not check out…"), then it opens with the right key | |
| 21.9 | Settings > Devices and sync: remove the phone | The phone says it was removed and keeps its data | |
| 21.10 | Settings > Secure Max > "Open CometRow in Secure Max" | Works | |
| 21.11 | Settings > Secure Max > "Reset Secure Max" (test data only; type RESET SECURE MAX) | It asks; then "Secure Max was reset…"; Secure chats unchanged | |

## 22. Settings, data controls, export and delete

| # | Do | Expect | P/F |
| --- | --- | --- | --- |
| 22.1 | Settings tabs: General, Personalization, Data controls, Security, Secure Max, Account | Each opens; full screen on the phone | |
| 22.2 | General: theme light, dark, system | Changes smoothly everywhere | |
| 22.3 | Data controls > "Export my chats" > Markdown, then JSON | Files open and hold your test chats; no incognito chat | |
| 22.4 | "Download account data" (Account) | A file with your account data | |
| 22.5 | Data controls > "Delete all chats" on B (with B signed in on two devices) | It asks first (focus on Cancel); then "All chats were deleted."; both devices are empty | |
| 22.6 | Archived chats | The chat archived in 4.13 is there and can be restored | |
| 22.7 | Account > Close account | **Known:** cannot finish in production (it needs an email code; email is off). Note what it shows | |
| 22.8 | Keyboard shortcuts (Ctrl+/) | The list opens; Ctrl+Shift+O new chat, Ctrl+K search, Ctrl+Shift+S sidebar, Ctrl+Shift+C copy the last answer work, or the browser keeps the key | |
| 22.9 | Account page on the phone | Nothing cut off | |

## 23. Legal pages, Help and footer

| # | Do | Expect | P/F |
| --- | --- | --- | --- |
| 23.1 | `/terms` and `/privacy` | Open in English (and `?lang=de` in German). **Known:** visible "[For the legal read: …]" markers until the legal read | |
| 23.2 | The privacy policy names the partners | Privatemode (AI), Brave (search), the image provider, Render (hosting), Google (sign-in) | |
| 23.3 | Help: Getting started, Trial scope, Your privacy boundaries, Privacy policy, Imprint, Keyboard shortcuts, contact | Each opens; the contact address is correct | |
| 23.4 | Under the message box | "Answers come from an AI, not a person · Check important answers." with Terms and Privacy links | |
| 23.5 | The footer | "No advertising. No training on your data." Note: true only if the image provider does not train (setup doc, D1) | |
| 23.6 | Imprint | Your name, address and contact are correct | |

## 24. Errors, offline and recovery

| # | Do | Expect | P/F |
| --- | --- | --- | --- |
| 24.1 | `https://app.cometrow.com/no-such-page` | The CometRow "Page not found" page with "Go to CometRow" (never "Cannot GET"); in a German browser "Seite nicht gefunden" | |
| 24.2 | Phone: get an answer, then flight mode, type a message | Send is off with the reason shown; the draft stays; back online, Send works | |
| 24.3 | Go offline during a streaming answer | A plain sentence ("The answer was cut off…") with Retry; no blank page | |
| 24.4 | Slow network (DevTools, Network, "Slow 4G"), then send | It works, just slower; no timeout under 2 minutes | |
| 24.5 | Retry after a failed answer | Works | |
| 24.6 | Close the browser fully during an answer, reopen | The app opens; chats are kept | |
| 24.7 | Every error message you see during the whole test | Plain language, no codes or English inside German. Note any odd one in the findings log | |
| 24.8 | Very long chat (30 or more messages) | Still smooth; scrolling and "jump to latest" work | |

## 25. Your operator controls (Render Shell)

| # | Do | Expect | P/F |
| --- | --- | --- | --- |
| 25.1 | `touch /tmp/cometrow-chat-stop`, then send | Refused at once: "Private chat is paused by the operator. No request was forwarded." | |
| 25.2 | `rm /tmp/cometrow-chat-stop`, then send | Works again, no restart | |
| 25.3 | `echo "Test notice: maintenance tonight at 22:00." > /tmp/cometrow-notice.txt`, wait 30 s, reload | "Notice from CometRow: Test notice…" for A and B | |
| 25.4 | `: > /tmp/cometrow-notice.txt`, wait 30 s, reload | The notice is gone | |
| 25.5 | **Quick rollback:** `"enabled": false` in `render-config.json`, deploy the same commit, then set it back and deploy again | Chat off (log `email and inference disabled.`), then on again with the same counts | |
| 25.6 | Privatemode portal at the end of each test day | Tokens and cost match roughly what you did; well under EUR 10 in total | |
| 25.7 | Brave and image provider dashboards | Counts roughly match your searches and images; the spending limits are set | |
| 25.8 | UptimeRobot: pause the Render service briefly at a quiet time, or check the monitor history | An alert reached your phone | |

## 26. Database, server and logs

| # | Do | Expect | P/F |
| --- | --- | --- | --- |
| 26.1 | Shell: `node --import tsx server/deployment-database-entry.ts check /etc/secrets/render-config.json` | `"applied":20,"pending":0` | |
| 26.2 | Shell: `... privileges-check /etc/secrets/render-config.json` | Role `cometrow_runtime`, `"restricted":true` | |
| 26.3 | Send "What is the current news about zebracanary4817?" (it searches by itself), then search Render **Logs** for that word and your email address | No hits for either | |
| 26.4 | Logs: the hourly `CometRow counts (last hour)` line | Counts only, no account or text | |
| 26.5 | Logs: `CometRow model check: ... listed and unchanged` | Present once a day | |
| 26.6 | Restart the service (Manual Deploy, the same commit) | Chats, memories and Secure data are all still there afterwards | |
| 26.7 | Database page: backups or point-in-time window | Known and written down (setup doc, E5) | |

## 27. Devices and browsers

For each device run: sign in; 4.1, 4.2, 4.4; 5.1; 7.6; 10.1; reload; and the device's own row below.

| # | Device | Extra checks | P/F |
| --- | --- | --- | --- |
| 27.1 | Windows Chrome | Everything above | |
| 27.2 | Windows Edge | Tracking prevention at default | |
| 27.3 | Windows Firefox | Saved chats kept after closing Firefox | |
| 27.4 | Brave browser (Shields default, then aggressive) | Google sign-in, photo to text | |
| 27.5 | Android Chrome | Home screen icon; no voice-conversation button; Enter makes a new line | |
| 27.6 | iPhone Safari (if you have one) | No reload or crash while the large file loads; camera; 30-second dictation accepted | |
| 27.7 | Tablet, upright and sideways | Nothing cut off; buttons easy to tap | |
| 27.8 | Mac Safari (if available) | Close and reopen: saved chats are there | |

## 28. Accessibility

| # | Do | Expect | P/F |
| --- | --- | --- | --- |
| 28.1 | Keyboard only (Tab, Shift+Tab, Enter, Esc) through sign-in, chat, send, menus, Settings | Every control reachable; focus always visible | |
| 28.2 | Browser zoom 200 % | Nothing overlaps or disappears | |
| 28.3 | Phone screen reader (TalkBack or VoiceOver) | Buttons have names; answers are read | |
| 28.4 | Dark theme on every screen | All text readable | |
| 28.5 | Dialogs: open one, press Esc | It closes; focus returns to the button | |
| 28.6 | Phone with large text in the system settings | Still usable | |

## 29. Speed

| # | Do | Expect | P/F |
| --- | --- | --- | --- |
| 29.1 | Phone on mobile data, empty cache: time from opening the app to "ready to send" | At most 30 s | |
| 29.2 | Second visit on the same phone | At most 5 s | |
| 29.3 | Fast answer: time to the first word | A few seconds | |
| 29.4 | Thinking answer: time to the first word | Under 2 minutes, usually much less | |
| 29.5 | Switching between chats | Instant | |

## 30. German interface (only if `VITE_GERMAN_UI` is on)

| # | Do | Expect | P/F |
| --- | --- | --- | --- |
| 30.1 | Browser language German, open the app | German everywhere, formal "Sie" | |
| 30.2 | The DE/EN switch | Switches; remembered in this browser | |
| 30.3 | Error and limit messages in German | "Limit erreicht. Es wird um … zurückgesetzt."; no English left | |
| 30.4 | Tablet upright in German | The message box fits; "Senden" fully visible | |
| 30.5 | Every German text you read | Note anything awkward in the findings log, for the native-speaker read | |

## 31. Retest round and sign-off

| # | Do | Expect | P/F |
| --- | --- | --- | --- |
| 31.1 | After the agent's fixes are deployed, rerun every test marked F | All pass | |
| 31.2 | Repeat 0.1 to 0.5 and 4.1 to 4.4 on the new deploy | Nothing that passed before is broken | |
| 31.3 | Two days of normal use, alone, at least 20 messages per mode | No unexplained error. Then the "before friends" list in the setup doc | |

---

## Findings log (you fill this in)

Kinds: **Bug** (something broken or wrong), **Change** (works, but you want it different), **Question** (unclear), **Text** (wording).
Severity: **1** blocks testing or loses data; **2** a feature does not work; **3** works but wrong or ugly; **4** small polish.

| # | Test | Device and browser | What you did | What you saw | What you expected | Kind | Sev |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | | | | | | | |
| 2 | | | | | | | |
| 3 | | | | | | | |

The privacy statement was rewritten for Secure on 18 November (`docs/help-privacy-wording-draft-20261118.md`); test 19.7 checks it.
