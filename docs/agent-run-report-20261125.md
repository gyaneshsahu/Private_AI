# Agent run report (started 25 November 2026)

This file is the single record of the autonomous run while the owner is in exams. It lives only on the branch `claude/owner-test-prep-features-1431b6` (so track branches never conflict on it) and is merged into `preview/all-tracks` at the end. "continue" means: read this file, then pick up at **Next**.

## Needs you

Every decision and every manual step only you can do. Nothing here was done by the agent.

1. *(filled in as the run goes)*

## Next

- Track 0 (`fix/before-owner-test`): start. Nothing built yet.

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
| | | none so far | 0 |

## Baseline (the tag, before any change)

*(filled in after the first full run)*

## Tracks

| Track | Branch | State | CI |
| --- | --- | --- | --- |
| 0 Fixes | `fix/before-owner-test` | not started | |
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

## Files touched by more than one branch

*(filled in per track)*
