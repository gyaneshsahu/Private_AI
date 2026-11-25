# Agent run report (started 25 November 2026)

This file is the single record of the autonomous run while the owner is in exams. It lives only on the branch `claude/owner-test-prep-features-1431b6` (so track branches never conflict on it) and is merged into `preview/all-tracks` at the end. "continue" means: read this file, then pick up at **Next**.

## Needs you

**Start here:** the run is finished. Look at `preview/all-tracks`, then do your owner test with `docs/owner-live-test-list-20261118.md` plus the new `docs/owner-test-additions-20261125.md`. Items 16 to 19 are the newest. What you asked and what was done for it, request by request, is in `docs/owner-requests-log.md`.

16. **Database step when you take the new tables:** after merging, run the usual apply-pending step and the privileges SQL once. Test 26.1 then says `"applied":23` with all three new tables (0027 share links, 0028 analytics, 0029 feedback).
17. **Plans: I need three numbers from you.** Free, Plus and Pro are built with a test checkout (no money can move), but every price and limit is a proposal. Prices follow ChatGPT's (EUR 20 and EUR 200); I would not launch Pro at EUR 200, EUR 40 to 60 fits what CometRow offers. The limits are shown and not yet applied per account, and no payment company is connected, so this cannot be switched on at Render. Try it on your PC (section 41 of the new test list), then tell me prices, limits and the payment company.
19. **Watch for one thing in your test:** if after a reload the footer under the message box stays on "Temporary chat · Not saved", or the sidebar stays on "Loading your chats…", for more than a few seconds, write down what you did just before. In the long automated screen tour this happened in about 1 of 150 page loads; I could not make it happen outside the tour in 760 page loads, and the code that opens saved chats is unchanged since your tag. So it is probably the tour on a busy PC, but I have not proven that.
18. **Three things I could not try and you can:** a real phone for the home-screen app (section 39), a real Azure resource for the no-training image provider (section 38), and the visitor-address check on Render (section 40).

Every decision and every manual step only you can do. Nothing here was done by the agent.

1. **Image creation would have failed in your test.** The app asked the image provider for `flux-2-klein`; that address does not exist there (one live request on 25 November answered 404; `flux-2-klein-4b` answered 200). Fixed on `fix/before-owner-test`. Nothing for you to do except deploy a build that contains the fix. Your config keeps `"model": "flux-2-klein"`.
2. **Visitor address for sign-in limits (one command after your next deploy).** Run `node scripts/check-client-ip.mjs https://app.cometrow.com`. If it prints `CLIENT IP CHECK PASSED`, add the line it names to `renderBridge` in `render-config.json` and redeploy. If not, change nothing and send me the output. Details: `docs/render-client-ip-20261125.md` (on the fix branch).
3. **Legal read, one question:** with item 2 on, a visitor's address is held in memory for a moment to compute a keyed stand-in; no address is stored. Does the Privacy Policy need a sentence for that?
4. **Your config for the owner test:** the example `deployment/render-config.owner-test.example.json` now says `"plan": "premium"` and 60 searches a day. Your real `render-config.json` on Render is yours to edit: set `"metering": { "enabled": true, "plan": "premium" }` there (premium gives 60 searches a day). Back to `"alpha"` before friends (24 a day).
5. **Black Forest Labs trains on what is sent** (their EU API terms, 26 August 2026, section 2(b)); you knew this for prompts (D1). It also covers **input images** once image editing is on. An opt-out exists by email to privacy@blackforestlabs.ai, subject "Training Opt Out". Only you can send it. Until a no-training provider is live (Track 4), editing uploaded photos should stay off for friends.
6. **Wording choice:** the Terms still say "invite-only test phase (alpha)". It is a legal text under the legal read, so I left it. Say if you want "trial" there too.
12. **Owner dashboard and feedback:** to switch them on you put your Google address into `ownerEmails` (in `inference.analytics` and `inference.feedback`), run the database step once (migrations 0028 and 0029, then the privileges SQL), and have the lawyer read the two Privacy Policy lines in `docs/analytics-20261125.md` and `docs/feedback-20261125.md`.
13. **Feedback entries stay until you delete them.** The drafted policy line says "until we have dealt with it". Either delete entries as you go, or tell me a fixed period to delete them automatically.
14. **The no-training image provider needs you:** an Azure subscription, a Foundry resource in Sweden Central or Germany West Central, FLUX.2-pro deployed as **Data Zone Standard** (if only "Global" is offered, stop: the EU promise would not hold), a spending limit, the key in a Render secret file, and Microsoft's written word that the "preview" address is covered by their no-training statement. Steps in `docs/image-provider-eu-20261125.md`. Until then the image provider stays Black Forest Labs, which may train on what is sent.
15. **Home-screen app: only a real phone can confirm it.** Install on your Android and on an iPhone, and above all sign in with Google from the installed app (list in `docs/pwa-20261125.md`).
10. **Share links need three things from you before they can be switched on:** your yes (they were on your "not built" list of 16 November), one database step on Render (`apply-pending`, then the privileges SQL: the app's database role needs the new table), and the lawyer's read of the Privacy Policy line in `docs/sharing-20261125.md`. The plain Share button (device menu, Copy, Download) needs none of this.
11. **After merging any branch that adds a table,** test 26.1 in your list no longer says `"applied":20`. Each new table adds one: share links 0027, analytics 0028, feedback 0029.
8. **Images per day in your test:** your config has `"imageCreation": { ..., "dailyImages": 3 }`, and the plan does not change that number. With editing on, every edit counts as an image, so three edits end the day. Raise it for your test (for example 20; the config allows up to 50). Each image or edit costs about USD 0.015 at the provider.
9. **Projects and the chat menu (your message of 25 November):** being redesigned on its own branch, `feat/projects-ux`. Project-level memory is not built: see that track's notes for what it would take.
7. **Two older decisions the new work touches** (I did not edit `docs/owner-decisions.md`): item 17 of 16 November lists shared links as "not built because of your rules", and the 13 November constraint says images are never stored after the answer. Share links (Track 1b, step 2) and image versions (Track 1) are built behind off-switches because you asked for them on 25 November; confirm before switching them on.

### UI references I need

Screens where seeing ChatGPT, Claude or Gemini would make ours better (rule 1 in `docs/working-rules.md`). I build my best version meanwhile; send screenshots when you can, any of the three apps is fine.

1. **Received on 25 November for desktop (Claude); the phone view is still wanted.** **A finished deep research in the chat** (filled; desktop and phone): how the result sits in the chat (card or file), and what the opened report looks like beside or over the chat. To compare: our report card and report panel.
2. **A long normal answer** with headings, a list and a table (filled; light and dark; phone and desktop). To compare: spacing, heading sizes, how a table looks on a phone, the row of buttons under the answer.
3. **An answer that used web search** (filled; phone): how sources are shown inside the text and as a list. To compare: our source chips and the "Searched the web" line.
4. **The opened document from a file card**, as in your Claude screenshot (filled; desktop and phone): the panel or page that opens when you tap "NetEcon Question Bank". To compare: our report panel and canvas.
5. **Editing a text document in ChatGPT's canvas** (filled; desktop): the toolbar, and what happens when you select a sentence. To compare: our canvas, which edits raw Markdown today.
6. **The three-dot menu on a chat and an open project page** (filled; desktop and phone), ChatGPT or Claude. To compare: the menu and project page built on 25 November.

## Next

**The run is finished: tracks 0 to 6 and the projects work are built.** Everything is on GitHub; nothing is merged into your branch, nothing is deployed.

- **To look at everything together:** branch `preview/all-tracks` (worktree `C:\Gyanesh\Startups\Private_AI-tracks\preview`). It combines the fix branch and every track. CI green on `f4c2185` (run 45646292812), database suite included; a later commit on it only adds this report.
- **Your new tests:** `docs/owner-test-additions-20261125.md` on `preview/all-tracks` (sections 32 to 43, same format as your list).
- **To take the work into your branch,** merge in this order, or simply merge `preview/all-tracks`, where the conflicts are already resolved: `fix/before-owner-test`, `feat/projects-ux`, `feat/image-editing`, `feat/image-share`, `feat/image-provider-eu`, `feat/analytics`, `feat/feedback`, `feat/pwa`, `feat/plans-checkout`. **Merging `preview/all-tracks` is the easy way.** One by one, you meet the conflicts again that are listed under "The combined build".
- **If you say "continue":** the open work is the answer design (`feat/answer-design`, list "Still to do" in its doc `docs/answer-design-20261125.md`), Both `feat/report-card` and `feat/answer-design` are in `preview/all-tracks`, and the full check there was clean (unit 2,490 passed, browser tests 64 of 64, tour 396 screens with no failed step, accessibility 0 findings). `docs/owner-requests-log.md` has the state of every request.
- Rule learned: run one heavy test job at a time on this machine. Two at once caused page-load timeouts.
- Worktrees share `node_modules` through a folder link to `Private_AI-tracks\fix\node_modules`; a track that adds a dependency needs its own `npm ci`.

## How your build is protected

- Tag `owner-test-candidate` = `cebdb05` (the commit `codex/development-handoff` was on, 25 November). The tag is local, not pushed.
- Your main folder `C:\Gyanesh\Startups\Private_AI` was only read, never written: no branch switch, your uncommitted files (`package.json`, `docs/search-provider-comparison.md`, `docs/media/`, `docs/privatemode-master-notes.md`, `docs/ui-reference/`, three scripts) untouched, port 4317 untouched.
- Each track has its own branch from the tag and its own worktree folder under `C:\Gyanesh\Startups\Private_AI-tracks\` (a plain path: tests fail from a `.claude` dot-folder, READINESS note of 11 November).
- Nothing is merged into `codex/development-handoff`. Nothing deployed. No file deleted.

## Rules the run follows

- Mocks and fake answers only. Keys: the first instruction says none; the closing line allows up to EUR 3 to 5. The run treats a key as an exception for a question a mock cannot answer; every such use is listed under **Spend** with its cost.
- Unclear decision: the option closest to ChatGPT, written down under the track.
- `docs/owner-decisions.md` is not edited.

## Spend

| Date | Service | What for | Cost |
| --- | --- | --- | --- |
| 25 Nov | Black Forest Labs | One request to learn which model address exists (512 x 512, made-up prompt "A calm lake at sunrise"); the result was not downloaded | USD 0.014 |
| 25 Nov | Black Forest Labs | Image editing live check: 1 created image, 5 edits (described edit, resize, erase twice, one area), made-up content (an apple and a cup on a table) | about USD 0.10 |
| 25 Nov | Privatemode | 12 made-up questions to the live model, once, to judge the answer design on real answers (`evaluation/answer-design/`) | EUR 0.04 (list price) |
| | | **Total so far** | **about EUR 0.14** of the EUR 3 to 5 you allowed |

## Baseline (the tag, before any change)

Full unit suite on the tag `owner-test-candidate`, run from `C:\Gyanesh\Startups\Private_AI-tracks\fix`: **299 files passed, 24 skipped; 2,362 tests passed, 185 skipped; 0 failed; 24 minutes.** The skipped ones need a database or Docker and run in CI.

## Tracks

| Track | Branch | State | CI |
| --- | --- | --- | --- |
| 0 Fixes | `fix/before-owner-test` | done, CI green. Local full run on `9679d94`: build green, unit 2,367 passed and 1 page-load timeout (the same test passed 3 of 3 alone), browser tests 63 of 64 (the one failure was real and is fixed in `e6193da`; then 64 of 64), evaluation checks and secret scan green. After that only the touched tests were rerun locally; CI is the full run | green on `7bb1478` (run 45591198070) and, with the source-link fix and two repairs to the screen tour itself, on `6f348f7` (run 45645941695) |
| 1 Image editing | `feat/image-editing` | done. Local full run on `d4a74f9`: build green, unit 2,393 passed and 1 failed (`invite-browser`, a 5-second wait; alone it passed 5 of 6 here and 4 of 4 on the fix branch: timing, not this change, but unproven), browser tests 64 of 64, evaluation checks and secret scan green | green on `d4a74f9` (run 45590689598), which includes that test |
| P Projects and chat menu | `feat/projects-ux` (from the fix branch) | done. Local full run: build green, unit 2,381 passed, browser tests 64 of 64 after one test was updated for the new menu, evaluation checks and secret scan green; accessibility check clean on the changed screens. CI's database suite then found two steps of an older journey test that still used the old project picker; both updated | green on `697eafb` (run 45612666847) |
| 1b Placement and sharing | `feat/image-share` (from `feat/image-editing`) | done. Local full run: build green, unit all passed after one older check ("no Share button") was updated for the working Share, browser tests 64 of 64, evaluation checks and secret scan green; accessibility clean. CI's database suite found one migration count I had missed; fixed | green on `dcb3946` (run 45610107261) |
| 2 Analytics | `feat/analytics` | done. Local full run: build, unit, browser tests 64 of 64, evaluation checks and secret scan green; accessibility clean | green on `88c3506` (run 45610114451) |
| 3 Feedback | `feat/feedback` (from `feat/analytics`) | done. Local full run: build green, unit 2,377 passed and 1 failed (a German sign-in heading not found within 5 seconds while another job was running on this machine; the same test passed in CI), browser tests 64 of 64, evaluation checks and secret scan green; accessibility clean | green on `b34bc47` (run 45613752559) |
| 4 No-training image provider | `feat/image-provider-eu` (from `feat/image-editing`) | done. Local full run: build green, unit 2,400 passed and none failed, browser tests 64 of 64, evaluation checks and secret scan green. No live request (no Microsoft account) | green on `da9b712` (run 45617889804) |
| 5 PWA | `feat/pwa` | done. **Its browser test found a real bug before you could:** the Install row never appeared when the browser's offer arrived while Settings was still loading, and the "CometRow was added" line was never shown. Both fixed. CI also found that the two build files must carry the switch identically; fixed. Local full run on the earlier commit: build, browser tests 64 of 64, evaluation checks, secret scan green; unit: the install test failed (the bug above) and one image test timed out while I was running other tests beside it. Not tried on a real phone | green on `b344983` (run 45617883708), which has the fixes |
| 6 Plans and checkout | `feat/plans-checkout` | done, in its small form: the three plans with proposal values, a checkout that knows no payment company, a fake provider for tests. 11 new tests green (7 server, 4 browser); accessibility clean. Its browser test found one bug before you could (coming back from the checkout showed no result line); fixed. The full local run was done on the combined build, which contains it | green on `b2fa63a` (run 45637009640) |
| All | `preview/all-tracks` | done. Local full run with all eight branches in: build green, unit 2,474 passed and 2 failed (an older invite test that needs a 5-second wait, 3 of 3 passed alone; the new plans test, where the test tool's own relay of the first status request timed out, passed alone and the relay now tries twice), browser tests 64 of 64, evaluation checks and secret scan green. **Screen tour with all features on** (phone and desktop, English and German), last run: 392 screens, no request left the machine, **accessibility check clean (0 findings)**. The check had found source links under "Searched the web" smaller than 24 px, a fault older than this run; fixed. A second finding was the tour measuring citation chips while a new message fades in; the tour now waits for the fade. **One step in each full tour still times out, a different one each time, and each passes when run alone** (last run: the "chat unavailable" screen in German at desktop width). Twice the page was still on "Loading your chats…" after 8 seconds. I could not make that happen outside the tour in 760 page loads, and the code that opens saved chats is unchanged since your tag; it also happened once on the plans branch, which has none of the other tracks. One real cause was found and fixed on the way: the deep-research step waited for a progress line that the fake research passes in a split second (Needs you, 19) | green on `f4c2185` (run 45646292812): unit, database suite, offline job |

## Research notes the tracks build on (looked up 25 November 2026, official docs; no live call made)

**Render and the visitor IP (Track 0).** Render's docs name no header for the visitor's address, do not say whether `X-Forwarded-For` is appended or replaced, and say that other services in the same workspace and region can reach a web service over the private network. Cloudflare's docs describe `CF-Connecting-IP`, but Render only says it uses Cloudflare for DDoS protection. So no header can be trusted from the docs alone. The fix is built as a setting that is off until one check on the live site shows the header cannot be forged.

**Image providers (Tracks 1 and 4).**
- **Black Forest Labs, direct.** Editing is the same endpoint as creation with `input_image` added (`POST /v1/flux-2-pro`; up to 8 input images). FLUX.2 has no mask field. Masks exist on separate endpoints: `POST /v1/flux-pro-1.0-fill` (image, mask, prompt; white = change) and `POST /v1/flux-tools/erase-v1` (image, mask; white = remove). Outpainting: `/v1/flux-tools/outpainting-v1`. No background-removal endpoint. Whether the EU address `api.eu.bfl.ai` serves Fill and Erase is not documented. Prices: FLUX.2 pro USD 0.03 for the first megapixel plus 0.015 per input megapixel; Fill 0.05; Erase 0.03.
- **Black Forest Labs' terms (EU API Service Terms, 26 August 2026, section 2(b)):** they may use inputs and outputs to train. An opt-out exists only as an email to privacy@blackforestlabs.ai, subject "Training Opt Out"; whether it narrows the licence is not stated.
- **The docs list no `/v1/flux-2-klein`** (only `flux-2-klein-9b` and `flux-2-klein-4b`). The app's default model name is `flux-2-klein`. To check before the owner test (Needs you).
- **Microsoft Foundry.** `FLUX.2-pro` is listed under Data Zone Standard for EU regions (Sweden Central, Germany West Central and others). Request: `POST https://<resource>.api.cognitive.microsoft.com/providers/blackforestlabs/v1/flux-2-pro?api-version=preview`, `Authorization: Bearer <key>`, the same body fields as BFL, edits by `input_image` as base64. No mask documented. Microsoft states prompts and outputs are not given to the model's provider and not used for training. Open: the exact response shape, the price (the page shows none), and one Microsoft page still says FLUX is "global standard" only.
- **Google Vertex Imagen** was retired on 30 June 2026, including its mask-editing model. Its replacement (Gemini image models) has no mask, lists only an `eu` multi-region for one model, and that family retires yearly.
- **Choice for Track 4: Microsoft Foundry FLUX.2-pro.** Same model family and request fields as today's provider, an EU data zone, a written no-training statement, one key.

## Track 0: fixes before the owner test (`fix/before-owner-test`)

**Done (5 commits on top of the tag):**
- **Search when Brave has no credit:** Brave's "payment required" and "quota reached" answers are told apart from an outage. The app then answers without a search, with no note and no error. The hourly log line counts it as `search.no_credit`, so you can see it happened.
- **Daily search cap:** 60 a day on the premium plan (it already was 60 there; the example config now uses premium, as decision D6 says). Alpha stays at 24. When the cap is reached the answer still comes, with one calm line: "Today's web searches are used up, so this answer does not use web results. Searching works again within 24 hours." (German too.) Before, the user saw the generic "search did not complete" line.
- **Render visitor address:** see Needs you, item 2. Off until you run the check.
- **Words:** a new test reads every user-visible text (English, German, server messages, legal texts) and fails on "synthetic", "audit" or "test". Lab-only and rehearsal-only texts are named in the test, and the test checks the two gates that keep them out of production. Changed: Scheduled said "test phase", now "trial".
- **UI polish** (looked at before-and-after screenshots at 375 and 1,280 px): the project screen's Save, Add file, Rename and Delete are now proper buttons in aligned rows; a pencil beside each chat in a project renames it (Enter saves, Esc cancels, as in the sidebar); Settings > Security is four equal rows; usage limits are rows instead of bullets; the account page's two buttons are pills.
- **Core path:** 46 tests at the top of `docs/owner-live-test-list-20261118.md`, three of them new (C.20, C.21, C.35).
- **Found on the way:** the image model address (Needs you, item 1).

**Decisions taken:**
- A search outage that is not about money keeps its existing quiet line ("The web search did not complete..."). Only "no credit" is fully silent, as you asked.
- Deep research and background tasks still end with their own message when Brave has no credit: they cannot do their job without a search.
- The search cap is still kept in memory (a restart forgets the day's count) and applies only while deep research is configured. Both are as before; not changed.
- The plan screen with "Subscription rehearsal" wording shows only when the server offers the billing rehearsal, which production refuses. Left as is; Track 6 replaces it.

**Not verified:**
- Anything on Render (no deploy).
- **The visitor-address change at the app's front door.** The rule that admits requests (`server/authenticated-ingress.ts`) was rewritten as one function and has direct unit tests for all three modes. CI's database job runs the Render bridge tests against the real code in the mode you use today (no address) and they pass. The Docker-based ingress suites (28 checks) were not run against this code: they use pre-built local images from older commits, and rebuilding them would overwrite your local images. Nobody has run the new "address" mode end to end; it stays off until you switch it on.
- The account-menu line reads "Usage unavailable · No active plan shown" only when the server sends no allowance. With your config it shows the counts. Seen only in a test fixture, so left unchanged.

**Screens looked at after the polish:** project screen, Settings > Security (rows checked equal by a test; the "Sign out everywhere" question keeps its own buttons), usage with real numbers (week, today, limits, by feature, latest), each at phone and desktop size.

## Track 1: image editing (`feat/image-editing`)

Everything is in `docs/image-editing-20261125.md` on the branch: what a user gets, the switches, what leaves the device, ten decisions, the live check, what is not verified. In short:

- **Built:** Edit on every image, full-screen editor (phones too), Describe edits, a version strip where earlier versions stay, Download and Delete per version, Select area, Erase, Resize (three shapes), Zoom, follow-up requests in the chat ("make the background white"), uploaded photos behind their own switch with a people check. An edit counts as one image of the day, checked at the start.
- **Off by default:** `inference.imageEditing` in the config; `uploads` and `providerMasks` are separate switches inside it.
- **Masks:** the provider's model has no mask. The browser cuts out a box around the painted part, sends only that, and pastes the answer back through the painted part. A test checks pixel by pixel that nothing outside changes. Tried live once: it works (an apple erased, a cup replaced by a plant).
- **Not built, and why:** Remove background (the provider has no such function); comments on images (you said none).
- **Limits you should know:** about 8 to 12 versions fit in one chat (the 4 MB limit of a synced chat); painting needs a mouse, finger or pen.
- **Tests:** 32 new (6 server, 10 logic, 16 real-browser at 375 and 1,280 px in English and German). The accessibility check is clean on the card and the editor. Re-run and green: images, chat, Canvas, Whiteboard, limits, Secure and Secure Max, sign-in-free areas (245 tests in 30 files).

## Track 1b: image placement and sharing (`feat/image-share`)

Everything is in `docs/sharing-20261125.md` on the branch. In short:

- **Images:** Edit, Download and Share on every image; a click opens it full screen; on a computer "Open in side panel" shows it where the canvas and the whiteboard go, one thing at a time, switched through "In this chat".
- **Share, step 1 (no switch):** a Share button on answers, in the chat's menu, on images, in the editor and in the side panel. One dialog: the device's own share menu, Copy, Download. A test checks that none of them sends anything to a server.
- **Share, step 2 (switch off):** an encrypted link. The snapshot is encrypted in the browser, the key is only in the link after `#`, the server stores bytes it cannot read. "Anyone with the link can see this.", an end date (1, 7 or 30 days), Delete in the dialog and in Settings > Data controls. No links from Incognito or Secure Max. A test opens a link in a second, signed-out browser and checks that the key is in no request.
- **Database:** migration `0027-share-links.sql`. Needs `apply-pending` and the privileges SQL once before the switch goes on (Needs you).
- **Privacy Policy line:** drafted in English and German in the doc, for the lawyer.
- **Starts from `feat/image-editing`, not from the tag,** because it builds on the image card and the editor. Merging it brings image editing with it.
- **Not verified:** the hosted setup (that `/s/…` is reachable signed out on Render), a real phone's share menu, the reader's page in Safari and Firefox.

## Track 2: analytics and the owner's dashboard (`feat/analytics`)

Details: `docs/analytics-20261125.md` on the branch. In short:
- **An "Owner dashboard" in the account menu**, only for addresses on your owner list: active accounts per day and week, returning accounts, messages per mode, feature use, errors, limits reached, cost per day.
- **Counts only.** People and cost are counted from the usage records the app already keeps; errors, limits and feature use are day totals with no account in them (one new small table, migration 0028). No content, no third party, no cookie. Day totals are kept 90 days by default.
- **Off by default** (`inference.analytics`). With it off the browser makes no counting request (tested).
- **Privacy Policy line** drafted in English and German in the doc.

## Track 3: feedback from testers (`feat/feedback`, on top of analytics)

Details: `docs/feedback-20261125.md` on the branch. In short:
- **"Send feedback" in the account menu:** what it is about, a text, a rating from 1 to 5 if wanted, a screenshot only if the tester attaches one. The form says what is sent along (the account, the language, the window size).
- **In the owner's dashboard:** every entry with sender, time, rating, text, the screenshot to open, and Delete (asked first).
- **Off by default** (`inference.feedback`), migration 0029. Nothing deletes entries by time: you delete them once dealt with (say if you want a fixed period).

## Track 4: a no-training image provider (`feat/image-provider-eu`, on top of image editing)

Details: `docs/image-provider-eu-20261125.md` on the branch. In short:
- **Chosen: Microsoft Foundry, FLUX.2 [pro], EU Data Zone.** The same model family as today, the same request fields, a written no-training statement. Google's Imagen was retired on 30 June 2026, so it was ruled out.
- **Editing: yes. Masks: the provider has none;** the app's own crop-and-paste does the job for any provider (tried live on the same model at Black Forest Labs).
- **Behind a config choice** (`imageCreation.provider: "foundry"` with the resource's address); the default is unchanged.
- **No live request was made** (no Microsoft account). Three things are unknown until the first one: the exact shape of the answer (the adapter reads every known shape), the price, and whether the EU Data Zone can really be chosen for this model.

## Track 5: CometRow on the home screen (`feat/pwa`)

Details: `docs/pwa-20261125.md` on the branch. In short:
- The manifest and icons already existed. **New:** the iPhone tags so it opens in its own window with its name, **a start screen** (the mark on the page colour until the app has loaded), and **"Install CometRow" in Settings** behind `VITE_INSTALL_APP`.
- **No offline mode and no background worker:** not needed to install, and a stale cached copy after a deploy is a known trap.
- **Not tried on a real phone.** The doc lists what to look at, above all sign-in from the installed app on an iPhone.

## Projects and the chat menu (`feat/projects-ux`, your message of 25 November)

Everything is in `docs/projects-ux-20261125.md` on the branch: what was there before, what it is now, five decisions, what is not built and what it would take. In short:

- **Honest starting point:** a "⋯" on each chat already existed, with Rename, Pin, Archive and Delete. What was weak: it opened as a block inside the list, moving to a project was a plain drop-down box, there was no "New project" there and no "Remove from project", the open chat's own menu could not organise the chat, and the project screen had its chats at the very bottom.
- **Now:** one menu, the same on a chat in the sidebar, on a chat inside a project and at the top right of the open chat: Rename, Pin, Add to project (with New project…), Remove from its project, Archive, Delete. It floats under the "⋯". The project's name under a chat's title opens the project. The project screen is a wide sheet with the chats first. A project's own "⋯" can start a chat in it.
- **Found and fixed:** renaming the chat that is open did not change its title on screen.
- **Not built:** memory per project (about two to three days, and one decision from you first: should a project chat still see your general memories?); dragging a chat onto a project; the project as a page of its own instead of a sheet.
- **This branch starts from the fix branch, not from the tag,** because it changes the same project screen. Merging it brings the fixes with it.

## Track 6: plans and checkout (`feat/plans-checkout`)

Details: `docs/plans-20261125.md` on the branch. In short:
- **"Plans" in the account menu:** Free, Plus and Pro side by side, yours marked, a button to choose another. English and German, phone and desktop.
- **A checkout that knows no payment company:** one small interface (start a checkout; say what became of it). A plan changes only after the provider says "paid", only for the account that started it, and one checkout counts once.
- **A fake provider for tests only:** a plain page that says no money moves, with "Pay (test)" and "Cancel". Production cannot build it (a test checks this).
- **Deliberately left out, and why:** the limits per account (one plan still applies to the whole deployment; changing that touches the metering in many places), the database table (migration 0030 stays reserved for the first real provider), a switch in the Render config (the screen would promise what production does not keep yet).
- **I first skipped this track** because the plan values are yours to decide. That was wrong by your own rule (pick the option closest to ChatGPT, write it down, continue), so I built it with proposals instead. The older Stripe-shaped "Subscription rehearsal" is untouched.

## The combined build (`preview/all-tracks`)

- Made from the tag by merging `fix/before-owner-test`, `feat/projects-ux`, `feat/image-share` (contains image editing), `feat/image-provider-eu`, `feat/feedback` (contains analytics), `feat/pwa` and `feat/plans-checkout`. Almost every conflict was "both sides added a line at the same place", and both were kept. Three needed more: the migration test's counts were set to 23 (and 22 for the incomplete-history check), two screen-tour steps that ended on the same lines each got their own ending, and one type line that both image branches had changed kept the newer form. The migration list is 0027, 0028, 0029 in that order.
- Files that conflict if you merge the branches one by one instead: `server/app.ts`, `server/index.ts`, `server/consumer-workspace.ts`, `shared/contracts.ts`, `src/App.tsx`, `src/WorkspaceNavigation.tsx`, `src/SettingsBody.tsx`, `evaluation/audit-harness.ts`, `evaluation/audit-tour.ts`, the five migration files, `tests/deployment-inference-config.test.ts`. The table at the end of this file was written before the last four tracks and does not list all of these.
- The all-features test build now switches the Install row on too.
- `docs/owner-test-additions-20261125.md` lives here.
- Never merged into your branch, never deployed.

## Files touched by more than one branch

| File | Branches | Risk when combined |
| --- | --- | --- |
| `server/app.ts` | fix (search answer), image-editing (config field, status field, route mount) | low: different places |
| `src/App.tsx` | fix (search outcome, project rename, account buttons), image-editing (one hook, four call sites) | low: different places |
| `server/render-bridge.ts` | fix (visitor address, `/edge-check`), image-editing (body size and quiet time for one path) | low |
| `server/deployment-config.ts` | fix (`clientIpHeader`), image-editing (`imageEditing`) | low |
| `server/image-creation.ts` (fix) and `server/image-edit.ts` (image-editing) | both map `flux-2-klein` to the provider's `flux-2-klein-4b` | none: separate files; fold together after merging |
| `src/chat-design.css` | fix (appended at the end); projects-ux changes three of those appended lines (it contains the fix branch, so no conflict). Tracks keep their styles in their own files | none so far |
| `src/App.tsx`, `src/ProjectPanel.tsx`, `src/WorkspaceNavigation.tsx`, `src/SettingsBody.tsx` | projects-ux (on top of fix); image-editing touches `src/App.tsx` in other places | low; check the "+" menu and the send function after combining |
| `evaluation/audit-tour.ts` | image-editing (one new step), image-share (one more step beside it), projects-ux (one renamed entry) | low |
| `server/account-migrations.ts`, `server/account-privileges.ts`, `scripts/account-operator.ts`, `scripts/test-durable.mjs`, `tests/account-migrations.test.ts` | every branch that adds a table appends at the same place (image-share 0027; analytics 0028 and feedback 0029 to come) | **certain conflict when combined**, simple to resolve: keep all lines in number order and set the count in the test to 20 plus the number of new tables |
| `src/CreateImage.tsx`, `src/ChatMessage.tsx`, `src/OutputsPanel.tsx`, `src/SettingsBody.tsx`, `src/main.tsx` | image-share (on top of image-editing); `src/SettingsBody.tsx` also fix and projects-ux (Security rows) | low: different sections |
| `tests/deployment-inference-config.test.ts`, `deployment/render-config.owner-test.example.json` | fix only so far | later tracks that add a switch to the example will touch the same line |

*(filled in per track)*
