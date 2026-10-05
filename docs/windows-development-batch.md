# Windows development batch — 5 October 2026

Working checkout: `C:\Gyanesh\Startups\Private_AI`, branch
`codex/provider-qualification`, starting commit `46a03e2`. The checkout was clean;
`git pull --ff-only` reported already up to date. WSL was not accessed or changed.

## Changes and validation

- Node 24.21.0 and npm 11.19.0; locked dependencies and Playwright Chromium installed.
  Installation required `NODE_USE_SYSTEM_CA=1` for the existing Windows trust store.
  No certificate was imported and TLS verification stayed enabled.
- Playwright webServer now passes PORT through its environment, supporting both
  Windows and POSIX shells. All seven browser workflows passed on Windows.
- Typecheck, all 82 tests across 16 files, and production build passed. The build
  reports the verifier dependency's existing browser `zlib` externalization warning;
  live inference compatibility remains a separate gate.
- Frozen fixture validation initially failed because `core.autocrlf=true` changed
  checkout bytes. `.gitattributes` now requires LF for frozen JSON. Existing files
  were converted only after their LF bytes matched the original manifest hashes.
  Manifest and case content are unchanged; 24 development + 24 reserved integrity
  validation passed. No model evaluation or tuning on held-out cases occurred.
- CI pins Ubuntu 24.04 and immutable Node-24-runtime action commits resolved from
  official v5 tags: checkout `fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09`, setup-node
  `a0853c24544627f65ddf259abe73b1d18a591444`. These workflow edits have not run in
  GitHub yet. Runtime reference: [checkout](https://github.com/actions/checkout),
  [setup-node](https://github.com/actions/setup-node).
- Docker was unavailable locally. Existing successful GitHub container checks
  below are prior evidence, not a Windows container rerun.

## Authenticated GitHub evidence

Read via GitHub API using the existing Git credential in memory; no credential
was printed, saved or copied into the application.

| Run | Commit | Observed result |
| --- | --- | --- |
| [Hosted smoke 37296239780](https://github.com/gyaneshsahu/Private_AI/actions/runs/37296239780) | `4476f6e` | Smoke job executed successfully, 10:23:12–10:24:00 UTC |
| [Hosted smoke 37300058147](https://github.com/gyaneshsahu/Private_AI/actions/runs/37300058147) | `46a03e2` | Smoke job and hosted script succeeded |
| [Validate 37300063329](https://github.com/gyaneshsahu/Private_AI/actions/runs/37300063329) | `46a03e2` | Check, browser workflows, fixture integrity, clean archive Docker build and container smoke succeeded |
| [Validate 37300058149](https://github.com/gyaneshsahu/Private_AI/actions/runs/37300058149) | `46a03e2` | Earlier run failed: mocked experiment-client test exceeded 30 seconds; 81 other tests passed |

The later success does not explain the earlier timeout. It did not reproduce in
the Windows suite; no timeout increase or automatic retry was added to hide it.
Hosted smoke confirms restricted foundation behavior, not inference capability.

## Windows provider route preparation

The public preflight initially failed at browser launch, with no external request.
Forcing `chromium.executablePath()` selected the full browser, which failed to
spawn on this Windows host. Preflight and the synthetic runner now use Playwright's
default headless selection unless CHROMIUM_PATH or system Chromium is configured,
matching the passing browser tests. Fixed diagnostic stages and an allowlisted
error class identify failure location without arbitrary error text.

At `2026-10-05T11:10:26.789Z`, the corrected public browser preflight passed:

- Host: `inference.tinfoil.sh`; repository: `tinfoilsh/confidential-model-router`.
- Release digest: `ad95d02b2e27b3c1d5c327f2ee9616634f841e4b2ed5a48f404e4e9f595a4876`,
  exactly matching the approved pin. No release was automatically accepted.
- Public ATC attestation response HTTP 200; security verification passed.
- Zero inference requests. Private evidence remains in ignored `.local`; failed
  and successful preflight records were preserved.

The route for the next compatibility check remains the isolated Windows loopback
harness → encrypted fixed-destination relay → pinned router. The production gate
is unchanged; no hosted harness or fake qualification report was introduced.

## Required inputs before paid execution

The Windows process has no TINFOIL_API_KEY and no new compatibility permit. The
historical permit preparer still encodes the earlier USD 2 approval and consumed
ID. Do not run it to recreate an approval, or copy/delete WSL claims.

Before preparing a fresh bounded permit, confirm actual cumulative charges,
remaining balance/account cap, disabled auto-recharge and key/account scope.
Configure the provider key in a secure Windows server-side process environment,
never chat. Record prior attempted/consumed runs and a newly reviewed approval ID;
the USD 10 ceiling includes all prior spending and does not increase provider caps.
Refresh pricing and browser evidence if stale. No deposit or subscription is approved.

Then one compatibility request: fixed 2+2 prompt, at most 2,000 input characters,
512 output tokens, 90-second deadline and one forward attempt. Require correct
answer, normal terminal stream/relay completion and usage; reconcile billing.
Only after success, at most one two-turn synthetic invoice workflow (three total
requests in the batch). No retries, private data, research or paid extraction.
The gateway cannot inspect encrypted token settings; provider account controls
remain essential. No runnable permit was fabricated in this batch.

Router-to-worker/GPU evidence, release/build binding, freshness/revocation,
retention/cache/moderation/egress and billing-limit semantics remain unresolved
as listed in [provider chain review](provider-chain-review.md). The successful
router preflight closes none of those gates. Provider qualification: NOT_PASSED.
