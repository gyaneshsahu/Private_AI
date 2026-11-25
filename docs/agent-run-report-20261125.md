# Agent run report (started 25 November 2026)

This file is the single record of the autonomous run while the owner is in exams. It lives only on the branch `claude/owner-test-prep-features-1431b6` (so track branches never conflict on it) and is merged into `preview/all-tracks` at the end. "continue" means: read this file, then pick up at **Next**.

## Needs you

Every decision and every manual step only you can do. Nothing here was done by the agent.

1. **Image creation would have failed in your test.** The app asked the image provider for `flux-2-klein`; that address does not exist there (one live request on 25 November answered 404; `flux-2-klein-4b` answered 200). Fixed on `fix/before-owner-test`. Nothing for you to do except deploy a build that contains the fix. Your config keeps `"model": "flux-2-klein"`.
2. **Visitor address for sign-in limits (one command after your next deploy).** Run `node scripts/check-client-ip.mjs https://app.cometrow.com`. If it prints `CLIENT IP CHECK PASSED`, add the line it names to `renderBridge` in `render-config.json` and redeploy. If not, change nothing and send me the output. Details: `docs/render-client-ip-20261125.md` (on the fix branch).
3. **Legal read, one question:** with item 2 on, a visitor's address is held in memory for a moment to compute a keyed stand-in; no address is stored. Does the Privacy Policy need a sentence for that?
4. **Your config for the owner test:** the example `deployment/render-config.owner-test.example.json` now says `"plan": "premium"` and 60 searches a day. Your real `render-config.json` on Render is yours to edit: set `"metering": { "enabled": true, "plan": "premium" }` there (premium gives 60 searches a day). Back to `"alpha"` before friends (24 a day).
5. **Black Forest Labs trains on what is sent** (their EU API terms, 26 August 2026, section 2(b)); you knew this for prompts (D1). It also covers **input images** once image editing is on. An opt-out exists by email to privacy@blackforestlabs.ai, subject "Training Opt Out". Only you can send it. Until a no-training provider is live (Track 4), editing uploaded photos should stay off for friends.
6. **Wording choice:** the Terms still say "invite-only test phase (alpha)". It is a legal text under the legal read, so I left it. Say if you want "trial" there too.
7. **Two older decisions the new work touches** (I did not edit `docs/owner-decisions.md`): item 17 of 16 November lists shared links as "not built because of your rules", and the 13 November constraint says images are never stored after the answer. Share links (Track 1b, step 2) and image versions (Track 1) are built behind off-switches because you asked for them on 25 November; confirm before switching them on.

## Next

- Track 0 (`fix/before-owner-test`): code done and committed (`9679d94`); the full local check is running; then push for CI.
- Then Track 1 (`feat/image-editing`), worktree `C:\Gyanesh\Startups\Private_AI-tracks\image-editing`.

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

## Baseline (the tag, before any change)

Full unit suite on the tag `owner-test-candidate`, run from `C:\Gyanesh\Startups\Private_AI-tracks\fix`: **299 files passed, 24 skipped; 2,362 tests passed, 185 skipped; 0 failed; 24 minutes.** The skipped ones need a database or Docker and run in CI.

## Tracks

| Track | Branch | State | CI |
| --- | --- | --- | --- |
| 0 Fixes | `fix/before-owner-test` | built, local check running | not pushed yet |
| 1 Image editing | `feat/image-editing` | not started | |
| 1b Placement and sharing | `feat/image-share` | not started | |
| 2 Analytics | `feat/analytics` | not started | |
| 3 Feedback | `feat/feedback` | not started | |
| 4 No-training image provider | `feat/image-provider-eu` | not started | |
| 5 PWA | `feat/pwa` | not started | |
| 6 Plans and checkout | `feat/plans-checkout` | not started | |
| All | `preview/all-tracks` | not started | |

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

**Not verified:** anything on Render (no deploy). The account-menu line "Usage unavailable" appears only when no allowance is configured; with your premium config it shows the counts.

## Files touched by more than one branch

*(filled in per track)*
