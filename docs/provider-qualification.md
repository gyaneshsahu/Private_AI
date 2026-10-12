# Provider qualification — NOT_PASSED

Current state, 5 October 2026: **the inference path is implemented and connected
to the web app**. Production use is intentionally gated by a complete provider
review. The isolated WSL experiment completed two real turns on the earlier
adapter. The revised streaming parser completed the Windows compatibility and two-turn
invoice checks; see [transport impact review](transport-impact-review.md). Do not describe chat wiring as missing or claim the
full confidential processing chain is qualified.

Candidate: Tinfoil, fixed `gpt-oss-120b`, `https://inference.tinfoil.sh`, locked
Tinfoil JS 1.2.2 and EHBP 0.3.3. Privatemode remains an unintegrated fallback.
Tinfoil is not approved for private user data. Cloud browser certificate changes
remain paused; WSL browser verification already worked without weakening TLS.

Latest [documentation and pinned-SDK review](provider-evidence-update.md) narrows
the remaining freshness/worker-evidence questions and verifies existing per-request
cache isolation in our adapter. It does not close Q1.

## Evidence ledger

| Qualification dimension | Established evidence | Remaining gate |
| --- | --- | --- |
| Browser verification | Node probe and user-supplied WSL Chromium preflight passed; both live turns recorded the approved router digest | Actual policy for freshness, revocation, rollback and supported devices |
| Live streaming | Earlier adapter returned two encrypted, complete, numerically correct answers with usage | Current Windows adapter completed compatibility and invoice checks; broad reliability and full-chain qualification remain open |
| Protected worker chain | Reviewed router source verifies measurements and pins downstream TLS; worker source/configuration was inspected | Bind source/build to router digest; identify admitted worker/GPU evidence and delegated release policy. The attempted public worker bundle lookup returned HTTP 501; [chain review](provider-chain-review.md) |
| Retention and logs | Supplier API no-content-retention/no-training statements; local malformed-stream logging removed; metadata billing source inspected | Deployed cache/diagnostic/moderation applicability, subprocessors and deletion/retention corroboration |
| External tools/disclosure | Local grants enforce research approval. Our fixed inference request includes no tool options; router source supports plain dispatch in that case | Bind reviewed code/settings to deployment. Router network egress is open; no hardware no-egress promise |
| Failure handling | Local real-crypto/browser negative tests cover verification rejection, tampering, cancellation and malformed/truncated replies | Windows no-store abort impact is reproduced and scoped in the transport review; live failure/revocation/rotation assurance remains incomplete |
| Usage and spending | Prior run: 846 input + 1,070 output tokens; estimated USD 0.00076890. Dashboard showed two requests and matching rounded tokens | Actual charge and full-task billing reconciliation; hard account-limit semantics remain user-reported |
| Answer quality | One synthetic invoice conversation met correctness, completeness and context criteria | Frozen evaluation, broader fresh tasks and named ChatGPT/Gemini comparisons remain outstanding |

Reference evidence: [first live review](first-live-experiment-review.md),
[privacy/failure tests](privacy-failure-review.md), [abort investigation](network-abort-review.md),
[source history](provider-source-review.md), [validation record](validation.md).

## Authorization

Current founder authorization is **USD 2 cumulative account spending**, including
prior usage, with auto-recharge disabled and the key confirmed for that account.
This supersedes the historical USD 10 handoff. Necessary bounded synthetic
development tests are authorized with fresh permits, preserved consumed claims
and no automatic retries. No cap increase, deposit, subscription or real-private-
data transfer is authorized. Reported token estimates are not reconciled charges.

## What prevents enabling private-user inference

1. Establish the full verified router/CPU/GPU/worker path and release bindings.
   Router pinning delegates worker release admission to reviewed router code;
   it does not independently pin every worker build in the browser.
2. Establish freshness/revocation/rollback and minimum firmware/TCB behavior.
3. Corroborate retention, cache, moderation, metadata and egress boundaries.
4. Extend beyond the completed scoped compatibility evidence and reconcile actual charges.
5. Record honest, linked evidence in the qualification report only when these
   gates pass; never copy test fixtures or set `pass` to unlock the app.

The schema validates an operator report, not security truth. The gateway is
single-operator loopback infrastructure; no internet-facing multiuser assurance.
Browser-delivered code, dependencies, OS and device remain trusted. Provider and
network operators still see metadata; anonymity is deferred. Technical readiness,
security assurance and customer demand require separate evidence.

## Supplier reply received 12 October 2026 — qualification remains open

Founder supplied Sacha Servan-Schreiber's 7 October reply. This is supplier testimony, not independent deployment verification. It identifies router v0.0.155 / cvmimage v0.11.0, compiled model-to-repository mapping, Gemma worker v0.0.25 and GPT-OSS worker v0.0.28; describes GPU boot appraisal and nonce-bound v3 evidence; provides the admitted-worker inspection endpoint and direct CLI verification route. GLM worker evidence is not covered by the named releases.

Crucially, the reply confirms the JavaScript verifier lacks freshness witnesses, AMD CRL checks, minimum-release enforcement and TDX verification at that checkpoint. Local verifiedAt is not freshness evidence. CLI audit-time verification and release pinning do not independently establish ongoing browser-request freshness/revocation. Investigate a supported end-to-end browser solution before any private-data qualification; do not silently move plaintext into our ordinary backend.

Supplier states cache resides in enclave GPU memory, with no fixed TTL and eviction by memory pressure/restart. Per-request cache secrets prevent reuse, not retention. Do not claim immediate deletion or a guaranteed maximum cache lifetime. Supplier also states metadata-only router logs, no API moderation, restricted model egress and optional Exa query disclosure. Corroborate against exact deployed artifacts and applicable terms; clarify metadata retention and any required cache control.

Billing clarification: limits are soft; completed usage is recorded after requests, so in-flight work can overshoot. Reasoning counts as output; disconnects can be billed for generated tokens. Continue sequential bounded permits and outstanding-risk accounting. No paid request or account/privacy change performed while reading this reply.

Next focused supplier follow-up: supported browser freshness/revocation/TDX route with exact released versions; whether cache retention can be bounded/disabled rather than only isolated; metadata retention duration. Inspect linked artifacts first where possible to avoid repeating answered questions. Brave follow-up has been sent by founder; rights approval remains pending.
