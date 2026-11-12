# Qualification report draft for Tinfoil (P9) — 12 November 2026

**Status: draft by the agent, needs the owner's signature. Not loadable** (`evaluation/qualification-drafts/tinfoil-gpt-oss-120b-20261112.json`; a test checks that it cannot load).

Candidate models: **gpt-oss-120b, low reasoning** (best Tinfoil arm on 11 November: every bar except citation format 2 of 3), fallback **gemma4-31b with thinking** (open question 2 of 3, slower). The model pick is P6; the safety grades for case 07 are P5.

| Check | Draft status | Evidence | What accepting means |
| --- | --- | --- | --- |
| Browser check of the secure server | **needs owner acceptance** | Router digest verified 12 Nov; wrong digest refused live, nothing sent | The browser checks repository, digest and key binding only; freshness, revocation and TDX are not checked there |
| Freshness and revocation | **needs owner acceptance** | Block-only relay audit built 22 Oct (6-hour refresh, 24-hour maximum age) | Not deployed on Render with a configuration yet; a stale or revoked router could be used until the next audit or report expiry (at most 7 days) |
| Full hardware chain to the AI server | **needs owner acceptance** | Router verified; worker versions only from the 7 Oct supplier mail (not current) | Trusting Tinfoil's router to route to attested workers and GPUs |
| Supplier retention and logs | pass | Terms §2, 22 Oct email, disclosed in the approved privacy statement | — |
| No outside tools | pass | No tools or search options in the request; tool calls fail the reply | — |
| Live streaming | pass | T6 live 12 Nov: replies stream and complete | — |
| Failure tests | pass | T6 live 6 of 6; offline protocol, canary, spend and stop tests | Hosted T6 (on Render, chat on) must still run before the first invitee |
| Usage and budget limits | **needs owner acceptance** | Spend guard, stop file, one request per account | Needs the ceiling amount (D5) and the hosted stop-switch test (S5); Tinfoil's limits are soft |

## To sign

1. Pick the models (P6) after grading case 07 (P5).
2. For each of the four "needs owner acceptance" rows: accept in writing (date and reason) or keep chat off.
3. Set the spending ceiling (D5).
4. On the day: the agent re-runs the digest probe, fills `reviewedAt` and `validUntil` (at most 7 days, the supplier's deprecation notice), and switches statuses to `pass` / `accepted-by-owner`.
