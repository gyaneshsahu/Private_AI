# Provider qualification — NOT_PASSED

Current state, 5 October 2026: **the inference path is implemented and connected
to the web app**. Production use is intentionally gated by a complete provider
review. The isolated WSL experiment completed two real turns on the earlier
adapter. The revised streaming parser is locally validated and awaits one small
live compatibility check. Do not describe chat wiring as missing or claim the
full confidential processing chain is qualified.

Candidate: Tinfoil, fixed `gpt-oss-120b`, `https://inference.tinfoil.sh`, locked
Tinfoil JS 1.2.2 and EHBP 0.3.3. Privatemode remains an unintegrated fallback.
Tinfoil is not approved for private user data. Cloud browser certificate changes
remain paused; WSL browser verification already worked without weakening TLS.

## Evidence ledger

| Qualification dimension | Established evidence | Remaining gate |
| --- | --- | --- |
| Browser verification | Node probe and user-supplied WSL Chromium preflight passed; both live turns recorded the approved router digest | Actual policy for freshness, revocation, rollback and supported devices |
| Live streaming | Earlier adapter returned two encrypted, complete, numerically correct answers with usage | Revised parser/adapter needs the [one-request check](live-compatibility.md); old success does not automatically validate new code |
| Protected worker chain | Reviewed router source verifies measurements and pins downstream TLS; worker source/configuration was inspected | Bind source/build to router digest; identify admitted worker/GPU evidence and delegated release policy. The attempted public worker bundle lookup returned HTTP 501; [chain review](provider-chain-review.md) |
| Retention and logs | Supplier API no-content-retention/no-training statements; local malformed-stream logging removed; metadata billing source inspected | Deployed cache/diagnostic/moderation applicability, subprocessors and deletion/retention corroboration |
| External tools/disclosure | Local grants enforce research approval. Our fixed inference request includes no tool options; router source supports plain dispatch in that case | Bind reviewed code/settings to deployment. Router network egress is open; no hardware no-egress promise |
| Failure handling | Local real-crypto/browser negative tests cover verification rejection, tampering, cancellation and malformed/truncated replies | Historical network aborts remain unidentified; live failure/revocation/rotation assurance is incomplete |
| Usage and spending | Prior run: 846 input + 1,070 output tokens; estimated USD 0.00076890. Dashboard showed two requests and matching rounded tokens | Actual charge and full-task billing reconciliation; hard account-limit semantics remain user-reported |
| Answer quality | One synthetic invoice conversation met correctness, completeness and context criteria | Frozen evaluation, broader fresh tasks and named ChatGPT/Gemini comparisons remain outstanding |

Reference evidence: [first live review](first-live-experiment-review.md),
[privacy/failure tests](privacy-failure-review.md), [abort investigation](network-abort-review.md),
[source history](provider-source-review.md), [validation record](validation.md).

## Authorization

The latest [handoff](LOCAL_CODEX_HANDOFF.md) authorizes USD 10 cumulative
inference spending, including prior usage. The planned batch is one synthetic
compatibility request, then one two-turn synthetic invoice only if it succeeds
(three requests maximum, no retries). Actual remaining usage, account cap and
key/account scope must be confirmed first. The last reported provider cap was
USD 2 with auto-recharge disabled; the higher authorization does not change it.
No deposit, subscription or private-data transfer is authorized. Historical
permits and consumed claims remain intact; do not reuse their IDs in Windows.
No additional inference ran in this local development batch.

## What prevents enabling private-user inference

1. Establish the full verified router/CPU/GPU/worker path and release bindings.
   Router pinning delegates worker release admission to reviewed router code;
   it does not independently pin every worker build in the browser.
2. Establish freshness/revocation/rollback and minimum firmware/TCB behavior.
3. Corroborate retention, cache, moderation, metadata and egress boundaries.
4. Complete current-adapter live compatibility and reconcile actual charges.
5. Record honest, linked evidence in the qualification report only when these
   gates pass; never copy test fixtures or set `pass` to unlock the app.

The schema validates an operator report, not security truth. The gateway is
single-operator loopback infrastructure; no internet-facing multiuser assurance.
Browser-delivered code, dependencies, OS and device remain trusted. Provider and
network operators still see metadata; anonymity is deferred. Technical readiness,
security assurance and customer demand require separate evidence.
