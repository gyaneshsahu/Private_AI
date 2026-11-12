# Privatemode: supplier answer and provider decision (12 November 2026)

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
