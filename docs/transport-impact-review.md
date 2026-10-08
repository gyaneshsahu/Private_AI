# Transport impact and conversation recovery — 5 October 2026

## Decision

The time-boxed abort investigation reproduced the live symptom through the actual
experiment gateway with a controlled local peer. Chromium reported `ERR_ABORTED`
after the browser read all 64 expected bytes of a `Cache-Control: no-store` response.
Changing only that header to `no-cache` in the test produced `REQUEST_FINISHED`.
The comparison also exercised truncated responses and browser cancellation: both
still fail, and cancelling a stalled upstream propagates the abort signal.

This isolates a browser terminal-event discrepancy for complete no-store responses.
It does not establish that every abort is harmless. Production and experiment
responses retain **no-store**. The comparison header override exists only in the
test server. The encrypted-browser fixture separately checks decryption, fragmented
frames, DONE/EOF, tampering, truncation and partial-answer rejection.

`reviewResult` now distinguishes raw relay events from assessed completion. It keeps
`relayClosure: FAILED` and the failure count in evidence, and accepts the scoped
`VALIDATED_COMPLETE_WITH_CHROMIUM_ABORT` assessment only when:

- Every expected reply passed client stream completion and final accounting, with
  matching verification evidence and successful gateway delivery.
- Every gateway response emitted `finish`; browser request signals and stream
  readers recorded zero cancellation.
- Every expected request ID has one terminal event, a matching HTTP 200/no-store
  response, and either normal finish or exactly `net::ERR_ABORTED`.
- There are no failures on other routes.

Missing evidence, other errors, duplicate terminal events, cancellation or incomplete
client replies remain unresolved and return a failing launcher exit code. Negative
review tests cover these conditions. Old records are not rewritten or retroactively
promoted. A gateway finish alone does not prove receipt; client protocol validation
is also required. Full supplier qualification remains NOT_PASSED.

Normal response completion no longer aborts an already finished upstream signal.
This cleanup correction alone did not explain the browser event; the controlled
header comparison did. No change was made to production provider authorization.

## New live evidence

All inputs were fixed synthetic fixtures. Each execution has a distinct consumed
claim in ignored `.local/experiment-runs/`; no previous claim was reused.

| Claim | Observation |
| --- | --- |
| `windows_20261005_nostore_compat_1` | Correct complete `4`, 1.76 s, 169 input / 29 output tokens; scoped completion assessment met |
| `windows_20261005_invoice_1` | Local module HTTP 504 before forwarding; zero gateway attempts; preserved as failed startup evidence |
| `windows_20261005_invoice_2` | Two complete replies, 4.39/4.20 s, 882 input / 1,081 output tokens; scoped completion assessment met for both |

The startup failure exposed Vite discovering extraction dependencies and invalidating
optimized modules during the run. The harness explicitly prebundles Tinfoil, EHBP,
PDF.js and Tesseract and disables late dependency discovery. A diagnostic with
inference blocked verified extraction and attestation reached the request boundary
before the fresh invoice execution. This is not an automatic retry.

Agent inspection of the invoice transcript found the required original subtotal,
VAT and total (95/19/114 EUR), then the corrected figures (90/18/108 EUR) and 6 EUR
reduction. Both answers cite the actual supplied source ID; the correction is
explicitly attributed to the user, not falsely to the original invoice. The first
answer's wording that all figures are taken from the source is imprecise for derived
totals, but the arithmetic is shown and no task-critical number is wrong. This is
narrow agent review; the harness continues to label human quality review pending.

Reported estimates for the compatibility and invoice runs are USD 0.00004275 and
USD 0.00078090. They are not actual-charge reconciliation. The cumulative account
cap remains USD 2; no new payment or cap increase was made.

## Product recovery and remaining evidence

The actual React UI, with a clearly labelled synthetic transport and all external
requests blocked, now exercises stop, explicit retry, follow-up correction, old
citation snapshots, edit-to-branch, new conversation and lock during a pending reply.
Late callbacks cannot restore output or status after cancellation or clearing.
Partial replies are excluded from follow-up context, and no automatic retry occurs.
These fixtures establish UI behavior, not live model quality.

Remaining trial work: full protected worker-chain/retention/freshness evidence,
approved severity/family quality thresholds and evaluation, broader cancellation/
load/browser evidence, actual billing reconciliation and trial access/onboarding.
The simplest supplier action is to obtain the missing chain/freshness/retention
evidence listed in `provider-chain-review.md`; repeating the same attestation or
2+2 probe cannot supply it. Independent product work continues in the roadmap.

Validation for this batch: 99 tests across 22 files, nine production-build browser workflows, TypeScript, build and frozen fixture integrity passed. Unbounded concurrent browser tests initially timed out; concurrency is now bounded to two workers. Cold-cache extraction dependencies are explicitly prebundled in the fixture as in the harness. No timeout increase or test retry was added.
