# Local experiments — current state

**4 October 2026:** WSL browser attestation and the first two-turn synthetic
conversation completed. The app's inference path is implemented; production
private-user use remains qualification-gated. See the [first live review](first-live-experiment-review.md).
The revised adapter is locally tested and its next live step is the
[one-request compatibility check](live-compatibility.md), awaiting additional-scope
confirmation within the existing USD 2 total cap. Do not rerun the old test.

## Setup and source updates

Use the [Git workflow](git-workflow.md), not repeated ZIP extraction. Windows
Ubuntu-24.04 WSL with Linux Node 24 and Linux Playwright Chromium is the supported
local environment. Keep dependencies in the Linux filesystem, not a Windows
`node_modules` directory. Keys remain in the local terminal environment.

```bash
node --version
node -p "process.platform"
node scripts/local-preflight.mjs --check
```

Expect Node v24 and platform linux. `--check` is offline and requires no key.
If Chromium is missing, use `npx playwright install chromium`. Dependency/browser
installation downloads packages but does not call inference. If OS libraries
are missing, use the supported Playwright dependency installer; do not modify
certificate trust or disable TLS to make a test pass. Cloud trust-store work
remains paused.

## Public attestation preflight, no inference

`node scripts/local-preflight.mjs` verifies the public router using the browser
SDK, allows only the fixed public lookup and local modules, writes a result to
ignored `.local/`, then shuts down. It does not use an API key, send a model
request or approve the router for private-user inference. A new release needs
review; do not automatically replace the pin. Proxy-configured environments
are rejected rather than bypassed.

## Review existing results without another request

```bash
npm run experiment:review -- /path/to/run/result.json
```

Keep the run's original `permit.json` beside it. This command makes no network
calls and does not refresh an approval. It prints request counts, verification
matches, token estimates, durations and network failures, omitting transcript
and raw error content. Inspect the synthetic reply separately for quality.

For a still-valid permit, `npx tsx evaluation/run-local.ts --diagnose` loads the
real browser path but blocks all model requests at browser and server layers.
An intentional stop is labelled `DIAGNOSTIC_REACHED_INFERENCE_BOUNDARY` only
when verification matches and no forwarding attempt occurred. This is not a
paid conversation or provider qualification.

## Historical records and spending

The original run `synthetic_20261004_two_turns_usd2` stopped before any recorded
inference forward. Its diagnostic reached verification and the blocked request
boundary. The separately reviewed retry `synthetic_20261004_two_turns_usd2_retry1`
completed two turns on the earlier adapter. Preserve both records. The original
`experiment:prepare` command now refuses to reissue that completed approval.

The user reported a USD 2 account limit, disabled auto-recharge and local key
entry. Dashboard evidence showed two requests and matching tokens; the exact
charged amount is still unconfirmed. Unspent budget does not authorize more
requests beyond that test. See the new check's explicit scope before using its
confirmation flag. No new payment, credits or cap reset is requested.

The [network investigation](network-abort-review.md) preserves unresolved events.
Source, mocked, local-crypto and live observations remain distinct in the
[qualification ledger](provider-qualification.md). No operational qualification
file is supplied by this repository.
