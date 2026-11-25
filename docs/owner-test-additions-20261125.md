# Owner test additions (25 November 2026)

**What this is:** the new tests for everything built in the run of 25 November. They continue `docs/owner-live-test-list-20261118.md` (same columns, same P / F / S marks, same findings log; write findings as "32.4" and so on). The fixes of that run are already inside the core path of the main list (C.20, C.21, C.35, C.35a, C.35b).

**Which build:** the branch `preview/all-tracks` has everything together. Each feature is off until its switch is on:

| Feature | Switch | Also needs |
| --- | --- | --- |
| Image editing (32, 33) | `inference.imageEditing.enabled`, and `uploads` for your own photos | Image creation on |
| Share links (34.5 onwards) | `inference.shareLinks.enabled` | Migration 0027 and the privileges SQL; sharing without a link (34.1 to 34.4) needs nothing |
| Owner dashboard (36) | `inference.analytics.enabled` with your address in `ownerEmails` | Migration 0028 and the privileges SQL |
| Feedback (37) | `inference.feedback.enabled` with your address in `ownerEmails` | Migration 0029 and the privileges SQL |
| No-training image provider (38) | `imageCreation.provider: "foundry"` and `endpoint` | An Azure Foundry resource (report, "Needs you") |
| Install row (39) | Render variable `VITE_INSTALL_APP=1`, then redeploy | |
| Plans (41) | none on Render: only on your PC, see section 41 | |
| Report card (42) | Render variable `VITE_REPORT_CARD=1`, then redeploy | Deep research on |
| Answer design (43) | Render variable `VITE_ANSWER_DESIGN=1`, then redeploy | |

**Cost:** every edit counts as one image of the day (about EUR 0.01 to 0.03 each). Sections 32 and 33 together use about 12. Raise `dailyImages` for your test day or spread them over two days.

**Made-up content only**, as before: the image provider for your test may train on what is sent.

## 32. Image editing (PC, then 32.1 to 32.4 on the phone)

| # | Do | Expect | P/F |
| --- | --- | --- | --- |
| 32.1 | Create an image ("A calm lake at sunrise, watercolour style") | The card shows **Edit**, **Download** and **Share** under the image | |
| 32.2 | **Edit** | The image opens full screen: "Describe edits" at the bottom, tools, **Download**, **Back**. No pop-up, no notice | |
| 32.3 | Describe edits: "add a small red boat", Apply | "Editing the image…", then the new image; the strip shows "Original" and "Version 2" | |
| 32.4 | Tap "Original", then "Version 2" in the strip | The picture switches; nothing is lost | |
| 32.5 | **Select area**, draw over the sky, describe "a flock of birds", Apply | Only the marked part changes; the rest of the picture is the same, with no visible edge | |
| 32.6 | **Erase**, paint over the boat, "Erase selection" | The boat is gone; the water behind it looks natural | |
| 32.7 | **Resize** > Portrait | A portrait version of the same scene | |
| 32.8 | Zoom in, zoom out, "Fit to screen" | The picture zooms; the tools stay reachable | |
| 32.9 | **Download** in the editor | The version on screen is saved, not the original | |
| 32.10 | "Delete this version" on one version | It leaves the strip; the others stay | |
| 32.11 | **Back**, then reload the page | The chat shows the last version; Edit still lists all versions | |
| 32.12 | The line "N of … images left today" | One less per edit, erase and resize | |
| 32.13 | In the chat, type "make the sky more dramatic" | The last image is edited (a new version in the same card). No new image, no normal answer | |
| 32.14 | In the same chat, type "What is the capital of France?" | A normal answer; the image is not touched | |
| 32.15 | Describe edits: "replace the boat with Angela Merkel" | Refused in one calm line; no count used | |
| 32.16 | Use up the day's images, then try an edit | "You have used … images today, the daily limit. It frees up within 24 hours." | |
| 32.17 | Phone: the editor, upright and turned | Everything fits; buttons are easy to hit; painting with a finger works | |
| 32.18 | Usage page and the image provider's dashboard | Each edit is counted as a created image; the provider shows the same number | |

## 33. Editing your own picture (only with `uploads` on)

| # | Do | Expect | P/F |
| --- | --- | --- | --- |
| 33.1 | "+" > **Edit a picture**, choose a photo of an object or a place with no person in it | "Checking the picture…", then the editor with "Your picture" as the first version | |
| 33.2 | Describe edits: "make it evening", Apply | An edited version; the original stays in the strip | |
| 33.3 | Choose a photo with a person clearly in it | "Pictures with people cannot be edited yet. Choose a picture of a place or an object." Nothing is sent to the image provider (its dashboard shows no request) | |
| 33.4 | Choose a photo with a small person far in the background | Write down what happens. The check is a judgement by the picture model, so the edge cases matter | |
| 33.5 | Choose a PDF or a GIF | "Choose a JPEG, PNG or WebP picture." | |
| 33.6 | With `uploads` off | "Edit a picture" is not in the "+" menu | |

## 34. Image in the chat, the side panel and sharing

| # | Do | Expect | P/F |
| --- | --- | --- | --- |
| 34.1 | An image card > "Open in side panel" | The image opens in the panel on the right, with "In this chat" listing the chat's images | |
| 34.2 | **Share** on an answer, PC | A dialog with "Copy text" and "Download as text file", and the line "These stay on your device. Nothing is stored on our servers." | |
| 34.3 | **Share** on an image, phone | "Share with…" opens the phone's own share sheet with the picture | |
| 34.4 | Share the whole chat (chat menu > Share) | The same dialog for "This chat" | |
| 34.5 | **Create link** with "7 days" | A link, "Copy link", and "Anyone with the link can see this until (date)." | |
| 34.6 | Open the link in a private window, signed out | The shared answer or image under "Shared from CometRow", with the end date. No sign-in asked | |
| 34.7 | Look at the link itself | The part after `#` is the key. Open the link without that part: "This link is incomplete…" | |
| 34.8 | Shell: `SELECT id, length(cipher), left(cipher, 40), expires_at FROM share_links;` | One row per link; the content is unreadable characters, no text of yours in it | |
| 34.9 | **Delete link**, then open it again | "This link has ended or was deleted." | |
| 34.10 | Settings > Data controls > **Shared links** | Your links with made and end dates only; Delete works here too | |
| 34.11 | In an incognito chat, and in a Secure Max chat: Share | Copy and Download are there; no link, with "Links cannot be made from incognito or Secure Max chats." | |
| 34.12 | Make a link with "1 day"; open it two days later | Ended | |
| 34.13 | Delete account B after B made a link | B's link no longer opens | |

## 35. Projects and the chat menu (beyond C.35 to C.35b)

| # | Do | Expect | P/F |
| --- | --- | --- | --- |
| 35.1 | Hover a chat in the sidebar (phone: the ⋯ is always there) | ⋯ appears; the menu has Rename, Pin, Archive, Add to project, Delete | |
| 35.2 | ⋯ > Add to project > an existing project | The chat moves under the project; its header shows the project name | |
| 35.3 | ⋯ > Add to project > "New project…", type a name, Create | The project is made and the chat is in it, in one step; the menu did not close while typing | |
| 35.4 | ⋯ on a chat that is in a project | "Move to another project" and "Remove from (project)" | |
| 35.5 | "Remove from (project)" | The chat is back in the normal list, with its history | |
| 35.6 | Project ⋯ > "New chat in (project)", send a message | The chat is in the project from the first message and uses its instructions | |
| 35.7 | Open a project | Its chats first, each with its own ⋯; instructions and files beside them (below them on the phone) | |
| 35.8 | Rename the open chat from its header menu | The title changes in the header and the sidebar at once | |
| 35.9 | In a chat header, tap the project name | The project opens | |
| 35.10 | Add project instructions and a file; ask in two different chats of the project | Both chats use them. A chat outside the project does not | |
| 35.11 | Archive a chat from ⋯, find it under archived chats, "Restore chat" | It is back | |

## 36. Owner dashboard (account A is on the owner list, B is not)

| # | Do | Expect | P/F |
| --- | --- | --- | --- |
| 36.1 | A: account menu | "Owner dashboard" is there | |
| 36.2 | B: account menu, then open `/api/owner/analytics` as B | No entry; the address answers 404 | |
| 36.3 | A: open the dashboard after a day of testing | Active today, active this week, came back, messages per mode, errors, limits reached, cost per day | |
| 36.4 | Compare "Cost in this period" with the Privatemode portal | The same order of size (the dashboard uses list prices before VAT) | |
| 36.5 | Reach a limit as B (for example C.21), open a canvas, save a memory | The matching rows under "Limits reached" and "Feature use" go up by one | |
| 36.6 | Read every row of the dashboard | Counts and fixed names only: no message, title, file name, search text or e-mail address | |
| 36.7 | Shell: `SELECT * FROM analytics_daily ORDER BY day DESC LIMIT 20;` | Day, a fixed name, a number. No account column | |
| 36.8 | With `analytics` off: browser developer tools > Network while using the app | No request to `/api/analytics/event` | |

## 37. Feedback

| # | Do | Expect | P/F |
| --- | --- | --- | --- |
| 37.1 | B: account menu > **Send feedback** | The form: what it is about, the text, a rating from 1 to 5, "Add a screenshot (optional)", and the line saying what is sent with it | |
| 37.2 | Send with a text only | "Thank you. Your feedback was sent." | |
| 37.3 | Send with a rating and a PNG screenshot | Sent | |
| 37.4 | Try to send with an empty text | Send is not possible | |
| 37.5 | A: Owner dashboard > "Feedback from testers" | Both entries with sender, time, rating and text; "Open screenshot" shows the picture | |
| 37.6 | A: Delete on one entry | Asked first; then it is gone, also after reload | |
| 37.7 | B: open `/api/owner/feedback` | 404 | |
| 37.8 | Phone, and the German interface | The form fits and is in German | |

## 38. The no-training image provider (only once the Azure resource exists)

| # | Do | Expect | P/F |
| --- | --- | --- | --- |
| 38.1 | Set `provider: "foundry"` and the endpoint, deploy, open `/api/status` | Image creation is listed as before | |
| 38.2 | Create an image (9.1) | An image within about 30 s. **This is the first real request to this provider:** if it fails, send the agent the error line from the Render log | |
| 38.3 | Edit it (32.3), then Select area (32.5) and Erase (32.6) | The same behaviour as with the old provider | |
| 38.4 | "A realistic photo of Angela Merkel" | Refused by the app before anything is sent | |
| 38.5 | Azure portal: the deployment's type and region | "Data Zone Standard" in an EU region. If it says "Global", switch back and tell the agent | |
| 38.6 | Azure cost view after 10 images | Write down the price per image; the usage page's cost needs it | |
| 38.7 | Set `provider` back to the old value, deploy | Images work as before | |

## 39. CometRow on the home screen (real phones only)

| # | Do | Expect | P/F |
| --- | --- | --- | --- |
| 39.1 | Any browser: open the app on a slow connection | The CometRow mark on the page colour until the app is there, not a blank white page | |
| 39.2 | Android Chrome: Settings > General > **Install CometRow** | Chrome's own install question; afterwards the icon is on the home screen | |
| 39.3 | Android: open it from the home screen | Its own window without the address bar; the start screen, then the app; the Install row is gone | |
| 39.4 | Android: the icon on a round and on a square launcher | The mark is whole, not cut | |
| 39.5 | iPhone Safari: Settings > General | One line: tap Share, then "Add to Home Screen" | |
| 39.6 | iPhone: add it, open it from the home screen | No Safari bars; nothing of the app under the notch or the home bar | |
| 39.7 | **Sign in with Google from the installed app**, on both phones | You come back into the app, signed in. If the iPhone lands in Safari instead, write it down | |
| 39.8 | After a deploy: close and reopen the installed app | The new version shows | |
| 39.9 | With `VITE_INSTALL_APP` not set | No Install row in Settings; the browser's own "Add to Home screen" still works | |

## 40. Sign-in limits behind Render (after the client-address check)

| # | Do | Expect | P/F |
| --- | --- | --- | --- |
| 40.1 | Run `node scripts/check-client-ip.mjs https://app.cometrow.com` from home, then from the phone's hotspot | It names the header that carries your address, and the address differs between the two networks (steps in `docs/render-client-ip-20261125.md`) | |
| 40.2 | Set `renderBridge.clientIpHeader` to that header, deploy, sign in with A | Sign-in works as before | |
| 40.3 | From one network, ask for many sign-ins in a row with B until refused; then sign in with A from the hotspot | B's network is slowed down; A on the other network is not | |
| 40.4 | Shell: look at the rate-limit rows | No real address is stored, only a stand-in | |

## 41. Plans and the test checkout (on your PC only; it cannot be switched on at Render)

**Start it:** in the folder of `preview/all-tracks` run `npx tsx evaluation/audit-harness.ts --config on --serve`, open the address it prints, then the sign-in address it prints. Everything there is fake: answers, search and the checkout. No money can move. The prices and limits are proposals (`docs/plans-20261125.md`).

| # | Do | Expect | P/F |
| --- | --- | --- | --- |
| 41.1 | Account menu > **Plans** | Free, Plus and Pro side by side; Free is marked "Your plan" | |
| 41.2 | Read the three cards | Decide the prices and limits you want; write them in the findings log | |
| 41.3 | **Choose Plus** | A plain page "Test checkout" that says no money moves, with "Pay (test)" and "Cancel" | |
| 41.4 | Pay (test) | Back in CometRow, the Plans window open: "You are on Plus now."; the address bar shows no id | |
| 41.5 | Reload | The window does not open again; Plans still shows Plus as yours | |
| 41.6 | Choose Pro, then Cancel | "The checkout was cancelled. Nothing changed."; still Plus | |
| 41.7 | Switch to Free | Asks once more ("Yes, switch to Free"); then Free is yours | |
| 41.8 | Phone width (narrow the window) | The three plans one under the other; nothing cut off | |
| 41.9 | Use the app on Plus and on Free | The limits do **not** change with the plan yet. That is expected and written in the doc | |

## 42. Deep research as a report card (with `VITE_REPORT_CARD` on; replaces what C.22 and section 6 say about the report in the chat)

| # | Do | Expect | P/F |
| --- | --- | --- | --- |
| 42.1 | PC, wide window: "+" > **Deep research**: "Compare heat pumps and gas heating for a German flat in 2026" | The progress line as before. When writing starts, the report opens **beside the chat** and is written there; the chat shows a card "Writing the report…" | |
| 42.2 | When it is finished, look at the chat | The line "Research report · N sources · N min read", then a card: the report's title with Download and Open, and the beginning of the report inside it, fading out. Under it "In this report" with the sections. The whole report is not in the chat | |
| 42.3 | Tap a section under "In this report" | The report jumps to that section | |
| 42.4 | In the report, tap a source button | The source opens, as in a normal answer | |
| 42.5 | **Edit in canvas** | The canvas opens with the report's text; "Ask for changes" works on it | |
| 42.6 | **Copy**, **Download**, **Share** | The text on the clipboard; a `.md` file; the share dialog | |
| 42.7 | Close the report, reload, open the chat again | The card is there; a tap opens the report | |
| 42.8 | Ask a normal follow-up question in the same chat | The answer uses the report (it is still part of the conversation) | |
| 42.9 | Phone: the same research | Nothing opens by itself; the card says "Writing the report…", then shows the summary; a tap opens the report over the chat | |
| 42.10 | Stop a research halfway | What was written stays in the chat as text, no card | |
| 42.11 | Dark mode: 42.2 and the open report | Everything readable; the buttons are not pale | |

## 43. How answers look (with `VITE_ANSWER_DESIGN` on; a first pass, see `docs/answer-design-20261125.md`)

| # | Do | Expect | P/F |
| --- | --- | --- | --- |
| 43.1 | "My electricity bills were 82, 91, 77, 95, 88 and 102 euros from January to June. How did they develop, and what is the average?" | The opening sentence slightly larger; total and average as two tiles; a chart | |
| 43.2 | "Should I lease or buy a car if I drive 8,000 km a year?" | The verdict first; bold lines before lists shown as quiet labels | |
| 43.3 | "Make me a 10-day study plan with daily goals and a checklist" | A table with a calm header and banded rows; a check-list whose boxes you can tick (a ticked line is struck through) | |
| 43.4 | **Copy table** over the table, paste into Excel or Google Sheets | The cells land in cells | |
| 43.5 | A long answer with a title and sections ("Explain in detail how a heat pump works") | A title with a line under it, clear sections | |
| 43.6 | All of the above on the phone and in dark mode | Nothing cut off; everything readable | |
| 43.7 | Export one of these answers as PDF | The PDF looks as before (black on white) | |
| 43.8 | Write down what you like and what you do not | This is a first pass; your reaction decides the next one | |
