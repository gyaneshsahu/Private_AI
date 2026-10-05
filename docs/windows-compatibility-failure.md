# Windows compatibility failure — 5 October 2026

## Subsequent authorized development batch

The user subsequently renewed authorization for bounded synthetic API testing
and routine debugging within the existing cumulative USD 2 cap. This supersedes
the earlier no-new-request instruction recorded below; original consumed claims
and results remain unchanged. Each new execution used a separate exclusive claim.

Four new single-request experiments were attempted:

| Approval suffix | Result | Reported token estimate USD |
| --- | --- | --- |
| `stream_diagnostic_1` | Local Node TLS failure; no provider usage returned | Unknown |
| `stream_diagnostic_2` | `DUPLICATE_USAGE`, two usage events before any answer | 0.00002535 |
| `stream_fixed_1` | Complete answer `4`, 169 input / 41 output tokens, 1.81 s | 0.00004995 |
| `stream_closure_1` | Complete answer `4`, 169 input / 32 output tokens, 1.77 s | 0.00004455 |

Full IDs start with `windows_20261005_`; ignored evidence is under
`.local/experiment-runs/<approvalId>/result.json`. New reported estimates total
USD 0.00011985; these exclude unknown/unreported charges and are not a dashboard
reconciliation. The original Windows request estimate is separately USD 0.00002535.

The live diagnostic establishes repeated initial usage as a current incompatibility,
although it cannot retroactively prove the original run's exact failure. The parser
now replaces cumulative usage snapshots instead of rejecting or adding them. It
still rejects changing input counts, decreasing output counts, invalid totals,
missing final usage, incomplete answers, missing DONE and truncated streams.
Fixed diagnostic codes and counters expose failures without recording raw errors.

Node's default CA configuration also failed an unauthenticated endpoint probe
with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. Using Node 24's `--use-system-ca` passed
that probe and enabled the subsequent encrypted requests; TLS verification remains
enabled. The Windows launcher now uses this option.

**Remaining blocker:** both complete replies still have a correlated Chromium
`net::ERR_ABORTED`. The gateway recorded successful encrypted relay delivery.
Additional phase telemetry places the event during client execution, before browser
teardown. Fragmented encrypted multi-frame loopback tests close normally, so they
do not reproduce this discrepancy. Compatibility remains NOT_PASSED; the conditional
two-turn invoice run has not proceeded. Do not suppress the event to pass the gate.

Validation: 96 tests across 20 files, TypeScript, production build, all seven
browser workflows and integrity checks for 24 development plus 24 reserved
fixtures passed. The existing verifier `zlib` browser externalization warning
remains. Persistent Windows Credential Manager support and actual browser-launch
readiness checks are included in this batch. Provider privacy qualification remains
separate and NOT_PASSED.

## Earlier investigation (before renewed authorization)

The user prohibited all new inference and retries after the one consumed
`windows_20261005_compat_usd2` request. This investigation loaded no provider key,
made no provider request, and did not run the experiment runner, preflight or
credential launcher. Existing uncommitted Windows fixes were preserved.

## Findings from the original saved result

- Run observed at 12:15:42.570 UTC (14:15:42.570 Berlin), code commit `dbccbe0`
  with local changes; recorded adapter/lockfile SHA-256
  `fd51a7078c682ce1a443ffdcc2bc4e0006b5eb7b767af656d265bd3dee2d1fa5`.
- One matching router verification, using the already approved digest; one
  encrypted forwarding attempt. Browser/module startup and verification passed.
- ATC response at elapsed 2080 ms; local inference relay HTTP 200 at 3090 ms;
  the same relay request ID 2 failed at 3111 ms with `net::ERR_ABORTED`.
- The client decoded usage of 169 input / 0 output tokens, so at least part of
  the encrypted response reached the browser and was decrypted/parsed. No answer
  text was recorded; assistant state remained partial and no reply completed.
- Client duration was about 2.67 seconds, far below the 90-second request deadline.
  The error is in response consumption, not a missing browser or readiness failure.
- The gateway recorded `FAILED_COST_UNKNOWN`; the client recorded only
  `OTHER_ERROR_REDACTED` during protected response reception. Neither establishes
  which side initiated the failure. The thrown PowerShell exception reports the
  runner's failed result; it is not the initial cause.

## What the code and offline diagnostics establish

`consumeReply` retains valid usage, but rejects duplicate usage, invalid choices,
incomplete answers and stream errors. Its catch replaces the specific reason
with `IncompleteReplyError`. The local client retains its usage while collapsing
the reason into `OTHER_ERROR_REDACTED`. `completionEvents` cancels its reader when
its consumer exits before EOF. That cancellation can abort the local HTTP request
and cause the gateway to cancel upstream work and report a failed relay.

`tests/compatibility-failure-diagnostic.test.ts` uses synthetic data only:

1. Five distinct constructed cases (duplicate usage, malformed JSON, provider
   error frame, truncated stream and empty completed stream) all produce retained
   usage 169/0 with no answer. The original counters cannot distinguish them.
2. A real Chromium browser calls a loopback-only synthetic SSE endpoint, with
   external browser requests blocked. Duplicate initial usage triggers the actual
   application's parser rejection and reproduces HTTP 200, no text, usage 169/0
   and `net::ERR_ABORTED`. This fixture is plaintext SSE, not a captured encrypted
   provider replay or live provider evidence. It isolates client cancellation.

The six diagnostic cases and existing parser/reply tests passed: 26 tests total,
plus typecheck. A new, exclusive-write synthetic record was saved under ignored
`.local/diagnostics/windows-compatibility-offline-<timestamp>.json`; original
experiment evidence was not overwritten.

## Conclusion and unresolved cause

The request failed during response-stream consumption after successful initial
verification and decryption. Local fail-closed rejection is a demonstrated cause
of this abort signature; duplicate usage is one plausible trigger, not a proven
observation of the live provider. An upstream interruption or another protocol
failure remains possible. The exact triggering frame/error cannot be recovered
from this result because raw frames and the specific sanitized failure reason
were not recorded. Do not label this a provider outage, token-limit exhaustion,
browser setup defect or proven duplicate-usage incompatibility.

No parser rules, privacy gates or provider pins were relaxed. A future diagnostic
change should retain fixed failure codes and event counts (without raw frames,
prompts, headers or keys) to distinguish these cases. It would not retroactively
identify this failure and does not authorize another request.

The recorded USD 0.00002535 is an estimate from retained usage, not actual billing.
Zero recorded output tokens does not prove that the provider did no further work
after the client stopped. Billing reconciliation remains outstanding. Approval
is consumed; no new permit, retry or conditional invoice run is authorized now.

## Preserved evidence SHA-256

- Original result: `5bf05668dcd2b3ab272c304f67ea29556971232ae5c00f9e08484f7447f46e49`.
- Consumed run permit: `967843ae90014c30280e1d56c483551139b74be919994ff92d62053f76341318`.
- Top-level prepared permit: `da17f68e14dcbdc3f778cbd04e1bba3fcf8a25ed66fdcb16dd04fd20eb9a939c`.

The two permit files are separately serialized records; their different byte
hashes alone do not imply differing authorization. All three files remain intact.
