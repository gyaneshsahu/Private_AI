# Qualification report draft for Privatemode — 12 November 2026

**Status: draft by the agent, needs the model mapping and the owner's signature. Not loadable** (`evaluation/qualification-drafts/privatemode-20261112.json`; `tests/privatemode-qualification.test.ts` checks that it cannot load, that both Fast candidates and both Thinking candidates validate as tiers, and that its Wasm hash and SDK version match the client and `package.json`).

Owner decision of 12 November: Privatemode is the primary provider for the alpha; Tinfoil is the business-continuity backup, kept working behind the interface with no new tuning or spend. This settles the Stage 3 plan's precondition about the qualifying arm.

## Models: `PENDING_MODEL_MAPPING`

The parent session fills `modes` from the model-mapping evidence (another agent is comparing them). Exact model IDs only; the schema refuses family aliases such as `glm-latest` (Privatemode email of 12 November).

| Tier | Candidates in the draft | Output limit | Allowance cost | Evidence so far |
| --- | --- | --- | --- | --- |
| Fast | `glm-5.3` at `low` (backup `glm-5.3-flash`), or `glm-5.3-flash` at `low` (backup `glm-5.3`) | 2,048 | 1 | Flash passed every automatic stage 1 bar (11 Nov); arithmetic v3: flash 43/90 with 22 silent errors, GLM-5.3 max 81/90 with 3 silent |
| Thinking | `glm-5.3` at `max` or at `high` (backup `glm-5.3-flash`) | 16,384 | 3 | Wide screen (12 Nov): max reasons at length but is slow (median first text 5.5 s; a 13,989-token answer took 6.6 minutes); high barely reasons |

A tier's reasoning setting also applies to its backup model (`policyForTier`). Every model is at Privatemode, so the one retry never crosses providers. `pricing` must be the highest rate among the report's models: GLM-5.3 at EUR 1.55 input and 5.74 output per 1M tokens plus VAT, converted to USD by the owner (`privatemode.priceConversion`).

## Checks

| Check | Draft status | Evidence | What accepting means |
| --- | --- | --- | --- |
| Browser check of the secure server | **needs owner acceptance** | Live through the real app (12 Nov): Wasm verified against the approved manifest `5fa927e3…40c1`, CSRF on every SDK call, placeholder key only, no plaintext at the relay, no CSP violation; wrong digest and outdated manifest sent nothing | The browser checks AMD SEV-SNP and Intel TDX against the manifest; the NVIDIA GPU is not in the client's reference values |
| Freshness and revocation | **needs owner acceptance** | Manifest digest pinned and checked before the SDK runs; SDK manifest swaps stop the client; NVIDIA OCSP set explicitly (unknown refused, no grace); one verified client per browser session (owner decision, 12 Nov): verified when chat starts and again at least every 10 minutes, at once after any failure or digest change, fail closed, pins applied on every verification (`tests/privatemode-client.test.ts` (a) to (g)) | Whether the Wasm checks AMD/Intel revocation and evidence age is unknown; no relay-side audit exists for Privatemode; exposure up to the report's 7-day validity; a verified client is reused for up to 10 minutes, so a deployment change the SDK does not report is caught only by the next verification |
| Full hardware chain to the AI server | **needs owner acceptance** | Privatemode docs: GPU attestation checked by their service before keys are released | Trusting Privatemode's server-side GPU check |
| Supplier retention and logs | **open: needs D17** | FAQ Q5 (prompts not stored; metadata up to 90 days; token counts per key permanently), FAQ Q7 (salted cache), per-account `cache_salt` built and tested | Passes once the owner approves the Privatemode privacy wording (D17) and provider section (D8) |
| No outside tools | pass | Provider-neutral request code; tool calls fail the reply | — |
| Live streaming | pass | `evaluation/live-failure-check.ts --privatemode` (12 Nov): baseline and 200-word replies complete, streaming visible before Stop | — |
| Failure tests | pass | Same run, 7 of 7 (stop during verification, stop mid-stream then next admitted, output limit shown incomplete, wrong digest, outdated manifest); offline `tests/privatemode-relay.test.ts` (14), `tests/privatemode-client.test.ts` (4) | Hosted T6 (on Render, chat on) must still run before the first invitee |
| Usage and budget limits | **needs owner acceptance** | Spend guard counts every Privatemode request at worst case (usage is encrypted); stop file; one request per account, three per instance | No per-request metering; needs D5 amount, the alpha key's limits and expiry, and a hosted stop-switch test |

## To sign

1. Parent session: fill `modes` and `model` from the mapping evidence; owner grades safety case 07 for the chosen arms (P5).
2. Owner: create the dedicated alpha key (rate limit, expiry, spend limit if offered) and record it in `privatemode.portalKeyLimit` (`docs/development-deployment.md`).
3. Owner: approve the privacy wording (D17, `docs/privacy-wording-privatemode-20261112.md`) and the provider section (D8).
4. Owner: accept or refuse in writing each "needs owner acceptance" row; set the EUR→USD rate, `pricing` and `approvedSpendUSD` (D5).
5. Owner: sign the DPA with Edgeless or record the acceptance of the standard DPA (`docs/dpa-record-privatemode-20261112.md`).
6. On the day: the agent re-reads the manifest (`scripts/privatemode-manifest.ts`), puts its digest in `releaseDigests`, fills `reviewedAt` and `validUntil` (at most 7 days) and turns statuses into `pass` / `accepted-by-owner`.
