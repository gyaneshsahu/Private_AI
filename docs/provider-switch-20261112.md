# Switching the AI provider: manual and announced — 12 November 2026

**Status: procedure prepared by the agent, not run.** Owner decision of 12 November: Privatemode is the primary provider for the alpha; Tinfoil is the business-continuity backup (if Privatemode closes or changes its terms). Switching is **manual and announced, never an automatic fallback**.

## What decides the provider

- Only the deployed qualification report's `provider` (`tinfoil` or `privatemode`). Nothing at runtime changes it: the relay resolves its adapter from the report (`server/app.ts`, `inferenceRelayFor(q.provider)`), and the browser does the same (`src/verified-chat.ts`).
- A Privatemode failure (refused, unavailable, timed out, expired key, rotated manifest) never reaches Tinfoil. The one retry the app offers uses the mode's `backupModel`, which is in the same report and therefore at the same provider (`tests/privatemode-relay.test.ts`, "a Privatemode failure stays at Privatemode"; `tests/answer-modes-relay.test.ts` for Tinfoil).
- The server reads only the active provider's key (`PRIVATEMODE_API_KEY` or `TINFOIL_API_KEY`; in production `inference.apiKeyFile`). The other key is not loaded, so an accidental cross-provider call is impossible, not merely unlikely.
- Privacy text, the policy page and the provider section follow the report's provider (`privacyCopy(provider)`, `privacyPolicyText(disclosedProvider(status))`), so the text shown always names the provider in use.

## What to prepare before any switch (both directions)

| Item | Privatemode as target | Tinfoil as target |
| --- | --- | --- |
| Signed report | `evaluation/qualification-drafts/privatemode-20261112.json` completed and signed | `evaluation/qualification-drafts/tinfoil-gpt-oss-120b-20261112.json` completed and signed; `reviewedAt` within 7 days |
| Key (Render secret file) | Dedicated alpha key with rate limit and expiry (`docs/development-deployment.md`, Privatemode section) | `TINFOIL_API_KEY` value, checked live the same day (it expired once, 11 November) |
| Provider files | `inference.manifestFile` (approved manifest, digest in the report) | none; optionally `attestationAudit` (Tinfoil only) |
| Privacy text approved | D17 (Privatemode variant) and D8 | approved statement (unchanged) and D8 Tinfoil entry |
| Live check on the day | `scripts/privatemode-manifest.ts --check` and `evaluation/live-failure-check.ts --privatemode` | `scripts/probe-provider.mjs` digest and `evaluation/live-failure-check.ts <digest>` |
| Contract | DPA with Edgeless (`docs/dpa-record-privatemode-20261112.md`) | Tinfoil DPA of 12 October 2026 (SCCs; US transfer, D10) |

## Procedure (owner; about 30 minutes plus Render deploy time)

1. **Announce first (at least 24 hours ahead unless the old provider has already stopped).** Send the announcement below to every alpha user through the usual channel. Users' saved conversations stay on their devices; nothing moves between providers.
2. **Stop chat.** From the service shell: `touch <stopFile>`. The app shows "Private chat is paused by the operator." Check `/api/status` reports paused.
3. **Swap the report and key.** Replace the Render secret files for `inference.qualificationFile` and `inference.apiKeyFile` with the target provider's; add or remove `inference.manifestFile` (required exactly for Privatemode; the config refuses otherwise) and `attestationAudit` (Tinfoil only). Save only.
4. **Deploy** the same commit (the code carries both adapters). A config that does not match the report's provider refuses to start: that is the safety, not a fault.
5. **Verify with chat still stopped.** `/readyz` 200; `node scripts/check-headers.mjs https://app.cometrow.com`; `/api/status` shows the paused reason. Open Settings, Privacy & data: the privacy text and "Who processes your messages" name the target provider.
6. **Resume.** `rm <stopFile>`. Send one synthetic message from the owner account; confirm the answer arrives, the connection notice names the accepted checks of the new report, and nothing is reported as an error in the service log.
7. **Record** the switch in `docs/READINESS.md` (time, report, key name, who was told when).

**Announcement text (draft, for the owner to edit):**

> CometRow will change the company that runs its secure AI server on [date, time]. From then on your questions are answered by [Privatemode (Edgeless Systems GmbH, Germany; processing in the EU) / Tinfoil (Tinfoil, Inc., USA; processing in the United States under the EU Standard Contractual Clauses)]. Your saved conversations stay on your device and are not moved. Chat will pause for about [30] minutes during the change. The privacy statement in the app is updated at the same moment; please read "What the secure server keeps" and "Who processes your messages" again. Questions: [privacy contact].

The bracketed provider facts must match the approved texts in `shared/provider-disclosure.ts` on the day.

## Rollback drill to Tinfoil (prepared, not run)

Goal: prove that with Privatemode live, the service can go back to Tinfoil within one working session, with chat paused, no data loss and the right privacy text, and then return.

Preconditions: Privatemode is the live provider; a signed, unexpired Tinfoil report and a working Tinfoil key exist (if the Tinfoil report has expired, the drill stops at step 3: that is a finding, not a failure of the drill). Tinfoil spend for the drill: one synthetic message, about USD 0.001.

| Step | Action | Expected | Record |
| --- | --- | --- | --- |
| D1 | Baseline on Privatemode: `/readyz`, headers, one synthetic message | 200, headers ok, answer arrives; privacy text names Privatemode | ⏱ T0 |
| D2 | `touch <stopFile>` | status paused | ⏱ T1 |
| D3 | Swap secret files to the Tinfoil report and key; remove `inference.manifestFile`; deploy | Live; start-up log shows chat enabled | ⏱ T2 |
| D4 | Verify while paused | privacy text and provider section name Tinfoil; CSP `connect-src` lists the Tinfoil verification hosts | |
| D5 | `rm <stopFile>`; one synthetic message | answer arrives from Tinfoil; Tinfoil dashboard shows one request | ⏱ T3 |
| D6 | Negative check: put the Privatemode manifest file back while the Tinfoil report is live, deploy | the service refuses to start ("Deployment configuration unavailable or invalid"); then remove it again and redeploy | |
| D7 | Return to Privatemode (steps 2 to 6 of the procedure) | answer arrives from Privatemode; privacy text names Privatemode | ⏱ T4 |

Pass: T3 − T1 under 30 minutes of owner time (Render build time noted separately), no step needed a code change, every privacy text check matched the live provider. Offline rehearsal of the same mechanics: `tests/privatemode-relay.test.ts` ("with a Tinfoil report, the root paths and Privatemode endpoints are not served") and `tests/deployment-inference-config.test.ts` (manifest only with a Privatemode report; release audit only with Tinfoil).
