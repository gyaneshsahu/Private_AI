# Provider qualification — NOT_PASSED

Historical implementation checkpoint, 5 October 2026 (current decision below): **the inference path is implemented and connected
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

Current founder authorization is **USD 3 cumulative account spending**, including
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

## Browser privacy decision — 12 October 2026

**Normal chat with private data: NO-GO. Bounded synthetic development: GO under existing permits.** No provider gate is passed by this investigation. No inference requests, account changes or dependency upgrades were needed. Recommendation: retain the existing Tinfoil adapter while requesting a released browser verification path; evaluate Privatemode's browser SDK as a qualification candidate, not an approved migration. Do not build our own cryptographic verifier merely to unblock a trial.

### What our browser actually verifies

Pinned `tinfoil` and transitive `@tinfoilsh/verifier` are 1.2.2; `ehbp` is 0.3.3. `src/verified-chat.ts` fetches a bundle and creates a verifier for each request, checks the domain, verifies the bundle, then requires a successful result, HPKE key, approved repository, exact release digest and host. EHBP encrypts to that attested key before our backend relay receives the request. The backend holds the provider credential and forwards ciphertext; it must not terminate this encryption. Responses return through the same protected transport.

The installed verifier checks SEV-SNP hardware evidence, signed code provenance, measurement equality and certificate/HPKE binding. It has hardware policy and minimum TCB checks; it is incorrect to describe it as having no firmware checks. Its attestation entry point accepts only SEV-SNP Guest V2. A multiplatform *reference measurement* can be compared to the SNP register; this does not implement TDX quote verification. `verifiedAt` is generated locally: it proves when verification ran, not when evidence was created. Fetching each request and pinning a release do not prove freshness, revocation or absence of rollback.

Router verification delegates worker admission to the measured router implementation. Supplier testimony describes TDX workers, GPU appraisal and v3 nonce-bound evidence, but the browser does not independently verify those worker/GPU quotes. The supplier explicitly reports missing JavaScript freshness-witness, AMD CRL, minimum-release-version and TDX support. The reviewed [JavaScript release page](https://github.com/tinfoilsh/tinfoil-js/releases) still lists 1.2.2; no supported newer browser route was established. A CLI check can corroborate deployment evidence but cannot replace enforcement on the browser's actual session.

Trust remains in delivered application JavaScript, dependencies, device/OS, vendor roots, build provenance, approved release policy and any measured delegation. An attested router's worker map must be bound to the authenticated channel and admission policy; an ordinary HTTPS snapshot alone does not prove that a particular encrypted request used an approved GPU worker. The qualification JSON is an operator evidence record, not a cryptographic substitute.

### Supported paths and remaining gaps

| Path | Trust boundary and browser evidence | Retention and cost | Work and decision |
| --- | --- | --- | --- |
| Existing Tinfoil / future supported browser upgrade | Browser → ciphertext backend relay → attested SNP router → delegated worker/GPU. Current browser verifies router identity and key, not full fresh worker/TDX evidence. | Supplier says no content logging/training; volatile GPU cache has pressure eviction, no fixed TTL. A fresh cache secret isolates reuse, not immediate erasure. Metadata retention still needs exact terms. Existing account/cap unchanged. | Lowest integration disruption **if** a supported verifier closes the gaps. No verified release presently does. Keep adapter; do not promote. |
| Privatemode JavaScript/Wasm SDK | Browser verifies coordinator/expected manifest and trusts its admitted mesh/worker/GPU chain; backend must relay encrypted traffic without receiving the session secret. This is delegated verification, not direct browser verification of each GPU quote. | Published metadata can remain up to 90 days; per-key billing usage retained permanently. Transient GPU/encrypted CPU prompt caches remain until eviction. GPT-OSS120B published EUR0.20 input / 0.65 output per million tokens, plus VAT. | Credible browser-native candidate. Must prove strict revocation settings, manifest approval/rollback, bounded session freshness and server-held authentication through a ciphertext-only relay. No account or integration acceptance yet. |
| Narrow synthetic/public-only development | Existing encrypted route, existing gate remains closed for ordinary private chat. Uses no sensitive data and makes no full-chain privacy claim. | Current bounded permits and USD3 cumulative authorization apply. Public search remains explicitly disclosed and temporary. | Available now for engineering and quality work. It is not a qualified private invited trial; any changed trial scope needs owner agreement. |
| Local native proxy using a stronger verifier | Browser → trusted process on user's device → provider. Local process can see plaintext; our backend need not. Browser delegates verification to that process. | Provider-specific retention still applies; installation/support cost increases. | Changes the requested browser-only trust model and is awkward for Galaxy/TalkBack. Not the recommended shortcut and not implemented. |

Privatemode's [SDK](https://docs.privatemode.ai/reference/sdk/) documents browser/Wasm support. Its [client API](https://docs.privatemode.ai/reference/sdk/client/) exposes explicit verification, expected manifest and Wasm hash options; offline initialization skips attestation and is unsuitable here. Refreshing a secret must not be assumed to redo attestation. Browser API-key exposure is explicitly dangerous; our relay/authentication design needs proof before live use.

Its [attestation architecture](https://docs.privatemode.ai/security/attestation/overview/) uses a coordinator and pinned mesh trust. The [revocation policy](https://docs.privatemode.ai/security/attestation/certificate-revocation/) allows unknown NVIDIA OCSP status and a 48-hour revoked-certificate grace period by default, with stricter proxy flags documented. Equivalent supported JavaScript enforcement has not been established. Do not assume proxy flags apply to the browser SDK. [Caching](https://docs.privatemode.ai/security/prompt-caching/) isolation does not erase existing blocks. [Trust/retention terms](https://docs.privatemode.ai/security/trust-and-compliance/) and [pricing](https://docs.privatemode.ai/pricing/) need to be accepted as an explicit policy, not interpreted as zero metadata retention. The proxyless API is not a substitute for client attestation.

Illustrative inference cost for 100 requests at 2,000 input and 500 output tokens each: Privatemode GPT-OSS EUR0.0725 before VAT; Tinfoil GPT-OSS USD0.06 using the previously checked October8 rates of USD0.15/0.60 per million. These exclude retries/reasoning growth and are not fresh Tinfoil billing quotes or new spending permits. Privatemode would need separate account/spending authorization. Engineering estimate, not a commitment: 1–3 working days for a bounded SDK/relay feasibility spike once requirements are answerable; production qualification, browser/device testing and supplier response time are additional and cannot presently be estimated credibly.

### Exact evidence needed and next dependency

1. **Tinfoil:** released browser SDK/version and runnable example that authenticates a fresh challenge or bounded-age witness, enforces revocation and approved minimum release/TCB policy, supports deployed TDX workers, and binds router admission plus worker/GPU evidence to the encrypted session. Include negative cases for stale, revoked, rolled-back and mismatched evidence; explain refresh/rotation during long sessions. Supply the deployed cache/log/metadata retention policy and worker egress mapping. A planned v3 release is not present evidence.
2. **Privatemode:** demonstrate strict NVIDIA OCSP policy in the browser SDK, what happens on unknown/revoked/unavailable status, manifest approval and rollback protection, and when established sessions reverify. Demonstrate a supported server-held-credential relay that never sees plaintext or session secrets; identify all browser network endpoints and whether automatic manifest changes can be rejected. Supply exact released SDK/Wasm hashes and reproducible-build instructions, worker/GPU delegation policy and current retention terms.
3. After one path satisfies the design on paper, use synthetic data to test wrong deployment, stale evidence, revocation failure, rotation, tampering and reconnect behavior through our actual browser/relay. Record network/body boundaries without content logging. Only then consider changing implementation or qualification status. “Continuous” means an explicit, enforced freshness/session policy, not necessarily a new hardware quote for every token.

Offline regression `tests/provider-verifier-boundary.test.ts` exercises the installed verifier's unsupported-format rejection and SNP-only multiplatform comparison, including mismatched/missing registers. These tests detect capability drift; they do not simulate a successful attestation or establish provider qualification. Existing browser transport and relay tests remain the evidence for application behavior. No custom crypto or privacy-gate changes were introduced.
