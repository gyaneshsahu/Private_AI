# Privatemode: supplier answer and provider decision (12 November 2026)

## Update, 16 November 2026: billing on, key cap, limits and prices (owner-reported)

Source: the owner's report of 16 November 2026 after working in the Privatemode portal. The agent has not seen the portal; nothing here is verified independently, except the attestation test in the last row.

| Point | What the owner reported | Label |
| --- | --- | --- |
| Billing path | Pay-As-You-Go is enabled on an "An individual (private use)" account. After CometRow is registered: switch to "A business or organization" and add the VAT ID. The VAT question is resolved (support answer of 16 November). | owner-reported, 16 November 2026 |
| Spend cap | A monthly cost cap of EUR 50 on the CometRow API key. | owner-reported, 16 November 2026 |
| Limits shown for the key | 100 requests per minute, 400K prompt tokens, 20K completion tokens. The owner gave no time window for the token figures. | owner-reported, 16 November 2026 |
| Price list | The owner has the list: input, cached input and output per 1M tokens for each model, and audio per minute. The figures themselves were not passed to the agent. | owner-reported, 16 November 2026 |
| Earlier attestation refusals | The owner's correction: most likely a general request limit, not an attestation limit. The attestation queue and the cap per session stay as built. | owner, 16 November 2026 |
| Attestation test after billing | 12 verify-only attestations, 2 s apart, all passed in 23 s, no HTTP 429, no tokens used (`evaluation/privatemode/attest-only-probe.mts`). | measured by the agent, 16 November 2026 |

Prices on file (EUR per 1M tokens, before VAT), from the owner's notes of 11 November (`docs/privatemode-master-notes.md`, section 6). They are **not** confirmed against the list the owner holds today; confirming them is step 1 of `docs/owner-walkthrough.md`:

| Model | Input | Cached input | Output |
| --- | ---: | ---: | ---: |
| `glm-5.3` (Thinking) | 1.55 | 0.15 | 5.74 |
| `glm-5.3-flash` (Fast) | 0.20 | 0.05 | 0.65 |
| `gpt-oss-120b` (not used) | 0.20 | 0.04 | 0.65 |

Speech-to-text, EUR per audio minute: `whisper-large-v3` 0.014, `voxtral-mini-3b` 0.004.

What this means:

- **The EUR 50 cap will be reached before the app's own ceiling.** The earlier plan was EUR 200 per month, and the worst case for 10 invitees was about EUR 180 net per month (`docs/owner-decisions.md`). At the worst-case price of a Thinking request (about EUR 0.11 to 0.14) EUR 50 is about 360 to 450 such requests a month; normal use is far cheaper. Fine for the first 2 to 4 invitees; to be raised before 10.
- **When the cap or a rate limit is reached,** the app now says "CometRow has reached its capacity for now. Please try again later." and makes no retry on the backup model (built 16 November). The app treats HTTP 429 and 402 from Privatemode as this case; which status Privatemode really sends for a cap is not verified.
- **Open differences, recorded and not resolved:** the rate-limit page read on 11 November gives the Standard tier 200,000 prompt tokens a minute, the owner reports 400K for the key; the window of the token limits is not stated. 20K completion tokens (if per minute) is the tightest limit: a few long Thinking answers at the same time can reach it.
- **Start rate of the attestation queue raised from 6 to 30 a minute** after the test above. It still halves and pauses by itself on any refusal (`docs/privatemode-attestation-limit-20261112.md`).
- **Prices are now versioned configuration** (`shared/usage-weights.json`, `prices`, version 1 = the figures above). A changed price becomes version 2 with its date (`docs/cost-weights-20261114.md`).
- For the signed report: `privatemode.portalKeyLimit` should carry `requestsPerMinute: 100` and `spendLimit: { amount: 50, currency: "EUR" }` with `source: "owner-reported"`. The owner signs the report, so this is a walkthrough step, not an edit by the agent.

## Update, 13 November 2026: deprecation notice and version pinning (owner-reported)

Source: an email from Edgeless / Privatemode support to the owner, 13 November 2026, in reply to question P8. It is summarised here as the owner reported it. The agent has not seen the email and has not verified it independently.

| Point | What Edgeless said | Label |
| --- | --- | --- |
| Deprecation notice | The usual notice is about two weeks. It is guaranteed only with an Enterprise agreement. | owner-reported, 13 November 2026 |
| Exact-version pinning | An Enterprise feature, with an annual commitment. | owner-reported, 13 November 2026 |
| Old model IDs | During the deprecation window an old ID can silently route to a successor. | owner-reported, 13 November 2026 |
| `glm-5.2` | Routes to GLM-5.3. | Privatemode docs, as recorded in `docs/provider-model-decision-20261026.md`; not re-read on 13 November |
| `glm-latest`, `glm-flash-latest` | Moving aliases: they follow the newest model. | Privatemode docs, same record; also the email of 12 November below (owner-reported) |

What this means for us, on the standard plan:

- We have no guaranteed notice period and no pinned version. `glm-5.3` and `glm-5.3-flash` name a version today, but the same ID can answer with a successor during a deprecation window.
- For the tie-break of 11 November (pinned version and longer notice): Privatemode's usual notice is longer than Tinfoil's one week but is not guaranteed, and pinning needs Enterprise. This is recorded for the Enterprise decision. It does not change the owner decision of 12 November.
- Built on 13 November, not yet run live: a daily check of Privatemode's model list with alerts in the service log (`server/model-watch.ts`), a "model not found" failure that stops instead of using another model, and `docs/model-deprecation-runbook.md`. The baseline for the check is not recorded yet, and the plain HTTPS call to `/v1/models` is unverified.

## Owner decision (12 November 2026, verbatim)

> "Privatemode is the primary provider for the alpha; Tinfoil is only a backup for business continuity (if Privatemode closes or changes terms)."
>
> "Keep Tinfoil working and tested behind the interface, with no new tuning or spend. Switching providers is manual and announced, never an automatic fallback."

## Supplier answer (owner-reported)

The owner received this email from the Privatemode team (Moritz Eckert), in reply to the owner's questions. It is summarised here, owner-reported and not independently verified.

1. **Serving our users with our key.**
   - Permitted. §2.4 of the terms prevents passing keys to third parties.
   - Using the organisation's key on our own server to serve CometRow users is covered by the standard terms. The users never receive the key or a Privatemode account.
   - Rate limits and quotas apply to the whole organisation, so all CometRow users share them.
   - Individual API keys can have **rate limits and an expiration date**, which makes a dedicated alpha key possible.
   - With prompt caching, each user's cache can be isolated with a **per-user `cache_salt`**.
2. **Plans.** For apps that serve their own end users, Privatemode recommends the **Enterprise plan** (custom rate limits and support), with a call offered at https://www.privatemode.ai/book-a-meeting.
3. **Model versions.**
   - **Exact IDs** (`glm-5.3`, `glm-5.3-flash`) select one specific version.
   - **Family aliases** (`glm-latest`, `glm-flash-latest`) move to new versions automatically. Use exact IDs for predictable behaviour.
   - **Deprecations** are announced in the changelog (https://docs.privatemode.ai/changelog/) and marked on the models page with migration guidance.
   - **During the deprecation window**, a deprecated exact ID can route to its successor: `glm-5.2` currently routes to GLM-5.3.
   - **Once removed**, requests fail with "model not found" instead of being rerouted.

## Consequences for the build

| Item | Where |
| --- | --- |
| Exact model IDs only; family aliases rejected in the qualification report | Stage 3 (`privatemode-stage3` branch) |
| Per-user `cache_salt` | Stage 3 |
| Dedicated alpha key with rate limit and expiry: the owner creates it in the Privatemode portal | Owner action; steps in `docs/development-deployment.md` (Stage 3) |
| A deprecated ID may silently route to a successor during the window: watch the changelog weekly, and re-run the model checks when a model we use is marked deprecated | `docs/owner-decisions.md` |
| Enterprise plan before growing beyond the alpha | Owner decision |
| No guaranteed notice and no pinning without Enterprise (13 November): daily model list check, "model not found" stops without another model, runbook | `server/model-watch.ts`, `docs/model-deprecation-runbook.md`; owner records the baseline with `scripts/privatemode-models-check.ts --record` |
