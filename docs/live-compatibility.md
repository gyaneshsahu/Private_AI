# Smallest revised-adapter live check — authorized, startup failure under diagnosis

Purpose: verify the new bounded SSE parser and existing browser-verification /
EHBP path against Tinfoil once. This is not a quality benchmark, retention test,
worker-chain qualification or permission to submit private data.

## Fixed scope and acceptance, before execution

- One request, one turn, `gpt-oss-120b`, no documents, search or tool options.
- Prompt: `Calculate 2 + 2. Reply with just the number.`
- Existing pinned router digest and repository. No automatic release acceptance.
- At most 2,000 input characters and 512 output tokens, 90-second request deadline.
  Gateway enforces one forward attempt; failures count; consumed approval remains.
- Reply must contain the correct answer 4, finish normally, have a terminal SSE
  marker and valid usage. A brief equivalent answer is acceptable; this tests
  transport rather than rigid wording. Token-limit or partial output fails.
- One matching verification, one encrypted relay attempt, identifiable relay
  response and `requestfinished` event, no unexplained relay failure. Preserve
  all diagnostics and reconcile provider token/billing observations.
- Store commit, dirty flag and adapter/lockfile hash with results. No key, prompt
  or arbitrary URL enters network logs. Synthetic transcript stays local.

At the user's reported rates, an illustrative 1,000 input + 512 output tokens
would cost USD 0.00045720. This is not a guaranteed charge or a monetary limiter.
The existing USD 2 account cap and disabled auto-recharge must remain unchanged;
prior spending counts toward the same total. No deposit, credit purchase or new
monthly service is proposed.

## Current authorization and execution state

The user explicitly approved one additional synthetic request within the existing
USD 2 total cap. The WSL execution at 2026-10-04 21:55 UTC failed during local
module loading with zero relay attempts. Its single-use claim is preserved.
The next action is a nonbillable diagnostic after the cache-path fix; see
[the investigation](network-abort-review.md). Do not repeat the paid commands
below or recreate the existing permit. These commands document initial setup.

No compatibility permit has been generated in the cloud. The CLI requires a
specific confirmation flag to record the added scope, creates a different
single-use ID and refuses to overwrite a permit. It does not itself make a model
request. The operator must not use that flag merely to bypass missing approval.

## Commands after confirmation, in the Git-based WSL checkout

Keep the API key in the local process environment; never paste it in chat. First
use the [Git workflow](git-workflow.md) and a matching browser preflight less than
24 hours old. If the old preflight is stale, `node scripts/local-preflight.mjs`
fetches public attestation only and makes no inference request.

```bash
npm run compatibility:prepare -- --confirm-one-additional-request-within-usd2
npm run compatibility:check
```

Only if the check succeeds, the scope has been confirmed and the existing
account controls remain in place, run **once**:

```bash
npm run compatibility:run
```

The runner prints a compact summary and saves
`.local/experiment-runs/adapter_compatibility_20261004_one_request/result.json`
with its permit. It cannot enable normal app inference or reset billing controls.
Do not delete its run directory or issue a new ID to retry. If the check fails,
share the saved synthetic result for diagnosis before any further request.

A `COMPATIBILITY_RETURNED_REVIEW_REQUIRED` result means a response was recorded;
`compatibilityEvidence: READY_FOR_HUMAN_REVIEW` additionally requires a recorded
normal relay close. Review the actual answer and dashboard next. Neither label
means provider-qualified or production-ready. A rejection of a changed router
release requires review, not an automatic pin update.
