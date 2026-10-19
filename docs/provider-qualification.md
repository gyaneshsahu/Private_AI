# Provider qualification — NOT_PASSED

**20October result:**42fresh replies completed across DeepSeek low/Gemma off/GLM low. Provisional synthetic-development recommendation DeepSeek low; experimental support prevents release-default qualification. No Thorough/automatic routing earned. Gemma has arithmetic/omission defects; Gemma/GLM violate urgent one-action request. See READINESS and model-selection-20261020 evidence for full limits/cost; human safety grades blank. All deployment privacy gates remain closed.

## Model/deployment shortlist — 20 October 2026

**No currently inspected deployment is release-qualified for private data.** The following are eligible only for existing synthetic development under the pinned encrypted browser path. Model capabilities are supplier claims, not verified quality; listed context limits are not PrivateAI integration limits. Current public catalog snapshot: evaluation/results/model-catalog-20261020.json ([Tinfoil catalog/API](https://inference.tinfoil.sh/v1/models)); [reasoning controls](https://docs.tinfoil.sh/guides/reasoning); [status](https://status.tinfoil.sh/). A status page/catalog listing does not prove request availability or an SLA.

| Candidate | Advertised scope/context | USD input/output per million | Support/decision |
| --- | --- | --- | --- |
| DeepSeek V4.1 Flash thinking/low | Text/images/tools,1M |0.65/1.45| Explicitly experimental; may be deprecated with minimal notice. Fast recent local sample, but no dependable release-default commitment. Test as default candidate. |
| Gemma4 31B thinking off | Text/images/tools,262144 |0.40/1.00| No experimental flag in current catalog; this is not an SLA. Cheaper default challenger; current matched quality/latency unknown. |
| GLM5.3 low | Text/tools,1M |1.80/5.75| Coding/long-task positioning; no experimental flag. Test potential default/Thorough specialist, not assumed superior. Catalog explicitly says no image input. |
| GPT-OSS120B high | Text/tools,131072 |0.15/0.60| Existing reference:22.9–74s recent matched replies, instruction/source-silence failures and prior503. No fresh arm in this study; prior cases are not matched comparison results for new questions. |
| KimiK3 | Text/images/tools,262144 |4.00/20.00| Plausible multimodal/hard-task specialist; much higher output tariff, no evidence of advantage yet. Defer this stage, not permanently reject. |
| Llama3.3 70B | Text/tools,131072 |1.75/2.75| Older dialogue-oriented option; cost exceeds Gemma/DeepSeek without local comparative advantage. Not shortlisted for this first screen. |

Alternative deployment: Privatemode lists GLM5.3, GLM5.3Flash and GPT-OSS120B. Flash supports image input; others text. Prices EUR1.55/5.74 for GLM,0.20/0.65 Flash/GPTOSS plus applicableVAT. [Models](https://docs.privatemode.ai/models/overview/), [prices](https://docs.privatemode.ai/pricing/). Browser SDK feasibility and unresolved strict pinning/revocation/cache/opaque-usage gaps are documented below. No account/credential activation or paid alternative-provider tests authorized by Tinfoil budget. Catalog/model marketing does not override those gaps.

Fresh screen: seven authored two-turn conversations across everyday chat, writing, reasoning, coding, document synthesis, research synthesis and urgent safety. DeepSeek low/Gemma off/GLM low, rotating order,42maximum requests, no tools/calculator/retries/automatic routing. Five cases use actual ordinary-chat UI with no fake source; two use fixed authored source attachments through the research UI. No document extraction, live retrieval, image, extended-memory or broad safety qualification claim. Context8000characters is sufficient for deliberately compact cases; explicit rejection rather than truncation; output4096tokens, existing95sdeadline. Reserve1.7470208; actual0.76+genuineuncertainty/rounding/timing0.2894736 gives2.7964944 under actualaccount3/key5/owner5. Meaningful scope retained without account change. Freeze before live calls; preserve all failures and human grades blank. Raw output, delivered answer, task cost and latency evaluated together. Default/specialist recommendation must follow results; no automatic routing implementation.

## Structured-output compatibility finding — 19 October

Read the official [structured outputs](https://docs.tinfoil.sh/guides/structured-outputs) and [tool calling](https://docs.tinfoil.sh/guides/tool-calling) guides. The former documents constrained JSON through response_format/json_schema and choice/regex controls; the latter demonstrates ordinary tools and a result-follow-up round. It does not establish strict function-argument enforcement for our exact model/schema/streaming combination. JSON-response constraints are not evidence that auto-selected tools have the same enforcement. No runtime flag or provider gate changed. Even enforced syntax cannot verify input provenance, method, units or answer truth.

Append to the existing consolidated supplier questions if needed, not a new email: which exact models/versions support constrained function arguments with tools+streaming, what schema subset is supported, and are unsupported constraints rejected rather than ignored? No request sent. Ordinary-answer comparison can proceed independently; keep calculator continuation experimental rather than repeating the unchanged high-reasoning timeout or increasing the deadline without evidence.

## Consolidated owner follow-up — prepared 19 October, NOT SENT

Owner asked which release blockers require manual help. This is one consolidated follow-up for the existing Tinfoil conversation, not a request for repeated emails per finding. Forward any newer reply first; omit questions already answered by that evidence. No account setting or provider switch is requested. Tinfoil testing remains capped at the existing USD5 authorization and actual account/key controls; older USD3 text below is historical.

**Suggested message to Sacha:**

Hi Sacha,

Thanks again. We are preparing the production architecture for PrivateAI at app.cometrow.com. Prompts and responses must remain encrypted between the browser and the approved inference deployment; our application backend must not receive plaintext. Your last reply said released browser freshness/TDX support and cache-disable/enforced maximum retention were not yet available. We are keeping private-data access disabled.

Could you share any released update, exact SDK/version and supported example that now covers deployment/worker/GPU binding, freshness, revocation/rollback and TDX in the browser? If nothing has shipped, please confirm that rather than treating the earlier estimate as a release date.

For the exact API deployment, is there now a supported way to disable prompt caching or enforce its maximum lifetime? We understand cache isolation alone does not establish deletion. We have retained your answer that most billing-related metadata is kept for90days; no need to repeat that answer unless it has changed.

One additional production requirement: our relay cannot inspect encrypted model selection or token limits, and we cannot trust browser-reported usage to grant paid allowances. What supported provider-side controls can enforce allowed models, maximum output and a per-request/account cost ceiling despite a malicious client? What authenticated request-level usage/settlement information can our backend obtain without prompts/responses, including interrupted streams, cancellation and duplicate requests? Please distinguish hard enforcement from dashboard estimates or browser-supplied fields, and share exact API documentation or an example.

If a different supported architecture is necessary, please describe its trust boundary and whether our backend still never receives plaintext.

Thanks.

**Engineering responsibility:** inspect any linked implementation, test negative cases and verify deployed behavior. A supplier statement alone does not pass qualification. Do not activate a provider or send sensitive data upon receiving a reply. A negative answer triggers a concrete researched architecture/provider decision, not silent weakening of requirements.

## Pinned alternative SDK source review — 19 October 2026

Inspected public tag v1.59.0 at commit17ad265a79a39f30596ae2f12ec64ccbd9127275, corresponding to npm's current privatemode-ai1.59.0 metadata. npm points to the continuum repository while documentation points to the public mirror; the source package.json uses a0.0.1 build placeholder. This review did not reproduce the published binary or execute/install the SDK. Source hashes and scope are preserved in [audit metadata](../evaluation/results/provider-sdk-source-20261019.json).

- Positive scoped finding: [GetAttestedMeshCA](https://github.com/edgelesssys/privatemode-public/blob/17ad265a79a39f30596ae2f12ec64ccbd9127275/internal/oss/attest/attest.go) generates a32-byte nonce, validates Coordinator evidence with it and compares the expected manifest. This is initialization evidence, not continuous worker/GPU revocation qualification.
- [JavaScript core](https://github.com/edgelesssys/privatemode-public/blob/17ad265a79a39f30596ae2f12ec64ccbd9127275/sdk/js/src/privatemode-ai.ts): manifest mismatch triggers fetching and initializing against a replacement manifest. Supplying manifestBytes alone therefore does not prove strict deployment pinning. It also retries once on a secret-ID-expiry error. Need a supported no-auto-upgrade/no-implicit-retry policy or an audited wrapper/patch with negative tests; no such behavior is approved here.
- Inspected JS options and [Wasm initialize](https://github.com/edgelesssys/privatemode-public/blob/17ad265a79a39f30596ae2f12ec64ccbd9127275/sdk/wasm/main.go) expose no strict OCSP/grace argument. Do not assume proxy CLI options apply to the SDK. An absence in this inspected surface does not establish that the full backend never checks revocation.
- [Go client](https://github.com/edgelesssys/privatemode-public/blob/17ad265a79a39f30596ae2f12ec64ccbd9127275/internal/oss/privatemode/privatemode.go) creates a client-lifetime prompt-cache salt; [chat preparation](https://github.com/edgelesssys/privatemode-public/blob/17ad265a79a39f30596ae2f12ec64ccbd9127275/internal/oss/privatemode/chatcompletions.go) injects it. No enforced cache expiry was established. API base URL controls both inference and attestation host; attestation constructs an HTTPS root path, so an arbitrary same-origin path relay is not proven compatible.

Decision remains NO-GO for real private data and no provider migration. Next evidence: exact published-binary/source match, strict manifest rejection and retry controls, SDK worker/GPU freshness/revocation, credential-safe relay and endpoint mapping, enforced retention, and authenticated model/output/usage limits. Keep this in the single supplier queue; no extra email requested or sent. Independent account/workspace development continues.

## Production alternative assessment — 19 October 2026

Public launch is the active target; privacy gates remain unchanged. ARCHITECTURE records the recommended browser/private-content boundary and researched alternative. Privatemode's current JavaScript SDK now documents browser support, verification, Wasm hash and manifest controls. This warrants a source/relay feasibility investigation, not provider selection. Open: strict browser revocation settings, fresh/liveness evidence beyond startup mesh certificates, safe handling of provider credentials, rollback rejection, enforced cache lifetime, authenticated metering and contractual metadata retention. Their proxy defaults (unknown OCSP accepted,48-hour revoked grace) must not silently become our policy. Sources: [SDK](https://docs.privatemode.ai/reference/sdk/client/), [attestation](https://docs.privatemode.ai/security/attestation/overview/), [revocation](https://docs.privatemode.ai/security/attestation/certificate-revocation/).

Cost/capability snapshot inspected19October: Privatemode lists GPT-OSS120B and GLM5.3Flash at EUR0.20 input/EUR0.65 output per million tokens, GLM5.3 at1.55/5.74; Voxtral transcription EUR0.004/minute and Whisper EUR0.014/minute, plus applicable VAT. These are advertised prices, not account-specific entitlement or quality evidence. GLMFlash lists image input; transcription exists; the inspected catalog lists no image-generation/editing endpoint. Catalog absence is not proof none exists elsewhere. [Prices](https://docs.privatemode.ai/pricing/), [models](https://docs.privatemode.ai/models/overview/). No account, purchase, credential or paid test created. Tinfoil development authority does not authorize a new provider's charges.

Cache documentation calls caching inactive by default for a self-run proxy but describes salt-based isolation. Need exact SDK/worker no-retention or expiry behavior; preventing reuse is not proof of deletion. [Cache documentation](https://docs.privatemode.ai/api/prompt-caching/). Add the above and authenticated model/output-cost enforcement to the existing evidence queue; batch questions rather than asking the founder to send individual emails. Both Tinfoil and alternative remain NOT_QUALIFIED for real private data.

## 19 October — synthetic release check and batched protocol question

Read-only pinned SDK verification reports router v0.0.159, SEV-SNPv2, digest `1ffc1cde7acd5134367cb9f430024203ed4455a51ee4473f7b3e75bd556d0a6b`. Scoped public routing/admission changes and exact tag configs were reviewed before the separate synthetic permits. The compare API reported diverged history, so exact configs were checked: CVM0.14.13 and safeguards0.1.1 unchanged, router image changed. This is not a full audit, continuous freshness/revocation evidence or production qualification.

The [structured-output guide](https://docs.tinfoil.sh/guides/structured-outputs), inspected19October, describes JSON-schema constrained generation. The [tool-calling guide](https://docs.tinfoil.sh/guides/tool-calling) documents tool-result continuation. Neither establishes that GPT-OSS automatic tool arguments on our exact deployment are schema-constrained. Latest synthetic run timed out with unfinished arguments containing invalid evidence enum values; no explanation request was reached.

Add to the existing supplier evidence queue, without sending another email now: which deployed GPT-OSS configurations support enforced JSON Schema for native tool arguments versus response_format; supported schema subset/limits; whether constraints apply during automatic tool selection; and a released browser-compatible example. Constrained syntax would not prove correct operands, method or factual support. Freshness/revocation/TDX, worker binding and retention blockers below remain open.

## Supplier reply received — 15 October 2026

Founder supplied a reply signed Sacha on15October; the original email timestamp/headers were not supplied. Record the receipt date here, not an inferred send date. Supplier answers:

> Not yet. We’re still working on rolling out TDX support and freshness. V3 attestation is a big migration we’re working on right now and hope to complete in the next two weeks.
>
> Not yet. We’re also working on this but I don’t have an ETA for when it will be available yet :)
>
> Our privacy policy should document this. Most billing-related metadata is retained for 90 days.

The first answer addresses the requested released browser verifier/continuous architecture; no version or supported example is provided. The two-week estimate is an aspiration relative to the email, not a release commitment or qualification date. Revocation is not separately resolved. The second confirms no cache-disable/enforced maximum-retention control yet, with no ETA. These remain substantive blockers, not merely missing paperwork.

Checked [privacy policy](https://tinfoil.sh/privacy) on15October (effective12October2026), sections2and9: security/operational logs have a90-day limit; API usage metrics persist while the account is active before aggregation/anonymization; billing records may persist up to7years, with stated exceptions. Cache eviction is described as typically minutes/generally hours, not an enforced maximum. Thus the policy does not establish a blanket90-day per-request billing-retention limit. This is an unresolved category/scope ambiguity, not proof the supplier statement is false.

**Decision: normal private-data chat remains NO-GO / NOT_QUALIFIED.** A later v3 release must be inspected and tested for browser verification, worker/GPU binding, freshness/revocation/TDX and negative paths; a version announcement or periodic CLI check is insufficient. Cache control has no promised delivery date, so v3 alone would not close retention qualification. Synthetic/public-only development continues under existing permits/cap; no production gate, account or retention change.

### Focused clarification for founder to send if desired — not sent by agent

Thanks, Sacha. Section9 distinguishes usage metrics retained while the account is active, security/operational logs up to90days, and billing records retained for accounting requirements. Which per-request fields fall into each category (request IDs, timestamps, model, token counts, account/key linkage and IP address), and when are they deleted or irreversibly anonymized? Does your90-day statement cover every identifiable per-request billing record, including backups and exceptions? Please point to the applicable policy clause or API-specific schedule. When v3 ships, please also share the released browser package/version and verification example, including revocation behavior.

Continue independent quality and recovery work; retain Privatemode as an unqualified alternative requiring its own browser/retention evidence. Do not wait on an assumed two-week completion or migrate based only on this email.


## Founder follow-up sent — 12 October 2026

Status: **SENT_BY_FOUNDER / REPLY_PENDING**. Founder supplied this outgoing message to Sacha; it is not a supplier answer:

> Hi Sacha, thanks for the detailed answers. Our application encrypts requests in the browser; our backend must not receive plaintext.
> 1. Is a released JavaScript/browser verifier now available that enforces freshness and revocation and supports TDX? If not, what supported architecture provides these checks continuously while preserving browser-to-enclave encryption? Please share exact versions and an example.
> 2. Can API prompt caching be disabled or given an enforced maximum retention time, rather than merely preventing cache hits?
> 3. How long is per-request billing metadata retained, and which policy documents that retention?

Historical status superseded by the15October reply above; do not request another send. Existing worker/GPU binding and other unresolved evidence remain required. Private-data qualification stays NOT_PASSED.


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

## Privatemode source feasibility follow-up — 12 October 2026

Reviewed public source at immutable revision `753fa3fe1f2321c71743dda54f2ebbb160f89e14`, not an installed or verified published binary. Source package declares `privatemode-ai` 0.0.1; this alone does not identify the current npm release. Downloaded files remain inert in `.local/provider-audit`; no SDK was installed or executed, no supplier credentials were used, and no inference calls were made.

Findings narrow the migration decision:

- **Manifest override is not a strict pin.** [initializeWithManifestRetry](https://github.com/edgelesssys/privatemode-public/blob/753fa3fe1f2321c71743dda54f2ebbb160f89e14/sdk/js/src/privatemode-ai.ts#L798) catches a manifest mismatch, fetches another manifest and initializes with it before calling `onManifestUpdate`. The callback is notification after initialization, not a documented pre-acceptance veto. A wrapper must not assume constructor `manifestBytes` prevents deployment drift. Post-verification comparison could prevent a subsequent inference, but must also cover internal refresh/retry and concurrent calls; this is not yet implemented or proven.
- **Automatic retries need explicit reconciliation.** The same core retries once after a missing-secret error, refreshing the secret first. This is narrower than arbitrary network retries, but our permits and no-blind-retry rule still require observable request accounting and a supported way to control it. Setting OpenAI retries to zero alone cannot remove this inner retry.
- **Default readiness is session-based.** [lazyInitialization](https://github.com/edgelesssys/privatemode-public/blob/753fa3fe1f2321c71743dda54f2ebbb160f89e14/sdk/js/src/openai.ts#L234) returns immediately once ready for inference. Explicit `verify()` is available, but callers must design an enforced revalidation policy. Default readiness is not continuous per-request attestation.
- **Browser policy controls remain incomplete.** The [Wasm initializer](https://github.com/edgelesssys/privatemode-public/blob/753fa3fe1f2321c71743dda54f2ebbb160f89e14/sdk/wasm/main.go#L69) passes manifest, credential, API base URL and logging configuration into the Go client. No OCSP strictness option is exposed in this inspected initializer or JavaScript options. This does not prove revocation is absent throughout the delegated infrastructure; it means browser-enforced strict policy has not been established.
- **An opaque relay is plausible, not demonstrated.** [Go request handling](https://github.com/edgelesssys/privatemode-public/blob/753fa3fe1f2321c71743dda54f2ebbb160f89e14/internal/oss/privatemode/privatemode.go#L380) encrypts the request before authenticated HTTP sending and decrypts the response locally. Initialization derives the attestation/secret-service host from `apiBaseURL`; therefore relaying chat completions alone is insufficient. We need the complete attestation and encrypted secret-exchange route contract, authentication injection rules, browser CORS/CSP requirements and proof that no secret or plaintext crosses our backend. Do not use offline initialization or expose a provider key to shortcut that proof.

**Decision unchanged:** no migration or private-data qualification. A supported strict-policy browser release is preferable to maintaining a security-critical fork. Static review has now identified concrete integration hazards; further speculative adapter work should wait for answers below. Existing Tinfoil development and independent quality/recovery/device work can continue.

### Ready-to-send provider questions (owner sends; not sent by Codex)

**Tinfoil — reply to existing thread:**

Our browser currently uses tinfoil/verifier 1.2.2 with EHBP 0.3.3 and an approved router digest. Is there now a released browser SDK/example that enforces evidence freshness, revocation and rollback policy and covers the deployed TDX worker/GPU chain bound to our encrypted session? Please provide exact version/source/build references, the delegated trust boundary, revalidation/rotation behavior, and failing examples for stale/revoked/mismatched evidence. If unavailable, please confirm which checks remain unavailable and the supported interim architecture. We cannot substitute periodic CLI checks for browser enforcement. Please also confirm applicable API cache eviction, diagnostic/content logging and billing-metadata retention periods.

**Privatemode — feasibility inquiry:**

We are evaluating browser-encrypted inference through our own ciphertext-only backend relay, with provider credentials retained server-side. At public revision 753fa3fe, the JS SDK automatically replaces a mismatched manifest and retries on missing secrets; the Wasm initializer exposes no OCSP policy option. Which released SDK supports strict approved-manifest enforcement, bounded revalidation, fail-closed GPU revocation policy and controllable/accountable retries? Can you provide a supported example covering all attestation, secret-exchange and inference relay routes, with no plaintext or encryption secrets reaching our backend? Please identify the exact published SDK/Wasm build, worker/GPU delegation and applicable prompt/cache/log/metadata retention terms. We have not opened an account or authorized paid integration.

## 12 October — observed router rotation during public research evaluation

Public attestation now identifies router v0.0.157 / cvm0.14.13, digest `ec99fa87cbde94786fdc80000d7f4a790bbde5f8581e60741cccd6a882dc6227`. The old exact-digest permit failed closed before inference. Supplier's October7v0.0.155deployment mapping is historical, not current deployment evidence. The [release](https://github.com/tinfoilsh/confidential-model-router/releases/tag/v0.0.157) and [comparison](https://github.com/tinfoilsh/confidential-model-router/compare/v0.0.155...v0.0.157) include worker verification renewal changes and Go0.17.0-rc.2; these warrant a full follow-up audit and do not repair missing browser freshness/revocation/TDX support by themselves. Fresh permits allowed only public research evaluation against this exact cryptographically verified release; production gate and allowlist remain unchanged. Twelve live replies completed; this is not provider qualification. See search-provider-comparison.md for retained failure findings and accounting.

## Router release review for synthetic development — 15 October 2026

Public [v0.0.158 release](https://github.com/tinfoilsh/confidential-model-router/releases/tag/v0.0.158), published15October00:40:32Z, reports digest `8daaecd40cd29b45d508d7250feadf5e3eff555cb6fadd58131c996598007e97`. Pinned Node SDK with existing Windows system CA trust verified that exact router identity at14:17:47Z, zero inference requests; subsequent evaluation browser checks must enforce that exact pin. This is a new development permit pin only, not a production qualification change.

Reviewed release metadata and relevant public compare patches: quota/priority separation, reserved-pool queue policies, observation-only routing metrics, safeguards long-conversation capture and sidecar0.1.1, optional provider web-search controls. CVM image remains0.14.13. The GitHub compare reports diverged history; this focused review is not a complete security audit. Our synthetic experiment does not request provider web-search tools. Public compare/deployment files retained inert under `.local/provider-audit/router-20261015` and copied into the experiment batch archive.

The release listing TDX measurements does NOT establish released browser TDX/freshness/revocation enforcement. The supplier's outstanding verification and enforced cache-retention blockers remain open; no private data or normal-chat release is approved.

## Batched evidence questions — 15 October workspace comparison (not sent)

Keep these with the existing unresolved questions; no separate founder email is requested for each finding.

- For the exact DeepSeek deployment and released browser SDK, is constrained JSON-schema decoding enforced? Supply the supported `response_format` or equivalent request shape, schema subset, model/version, and streaming/truncation behavior. OpenAI compatibility and successful JSON samples are not evidence of enforcement. The current candidate uses local validation of prompt-requested JSON only.
- Confirm whether prompt/cache retention applies to public research inputs and generated outputs, and the supported cache-disable or enforceable retention control. A per-request random cache secret isolates reuse; it does not prove deletion or disablement. Browser no-store and an empty local vault do not resolve provider storage.
- Preserve the existing worker/GPU binding, browser freshness/revocation/TDX and category-level billing-retention questions. No qualification status changes arise from this batch.

16 October read-only public package recheck: `https://registry.npmjs.org/tinfoil/latest` reports1.2.2, depending on `@tinfoilsh/verifier`1.2.2; `https://registry.npmjs.org/@tinfoilsh%2fverifier/latest` also reports1.2.2. No install or pin change. Same versions do not provide new evidence clearing the existing browser freshness/revocation/TDX, worker/GPU or caching-retention blockers. Supplier statements remain unresolved, not presumed satisfied by elapsed time.

## Batched evidence question — 19 October 2026

No new email requested. For the existing DeepSeek deployment, establish the exact supported thinking-mode tool-result protocol: whether reasoning_content must be returned for the active tool call and prior assistant turns, which JavaScript streaming field supplies it, and whether a tool_choice:none continuation with the same model/settings is supported. Upstream [DeepSeek documentation](https://api-docs.deepseek.com/guides/thinking_mode/) requires reasoning replay; this is not confirmed for Tinfoil. Until reproduced with synthetic data and reviewed context/history handling, the new continuation rejects DeepSeek thinking mode before sending. This does not alter provider privacy qualification or attribute old local validation failures to a new hypothesis.
