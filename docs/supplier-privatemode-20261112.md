# Privatemode: supplier answer and provider decision (12 November 2026)

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
