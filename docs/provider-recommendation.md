# Provider recommendation for the first synthetic conversation

Review report · 4 October 2026 · No SDK change or spending authorized by this report

## Recommendation

**Keep Tinfoil as the first candidate for a small, isolated local test; keep Privatemode as the next alternative. Do not adopt a provider for user data yet.** This is a recommendation about the next experiment, not a security ranking or final purchasing decision.

Tinfoil's maintained JavaScript SDK explicitly supports browser verification and encrypted request bodies through a gateway that holds the API credential. That matches PrivateAI's intended boundary: the browser and verified runtime see inference content, while the gateway relays ciphertext. We also have a real successful Node SDK router-attestation check. The existing adapter is reusable, although its manual composition of maintained libraries still needs live compatibility testing. Prior implementation effort alone is not a reason to qualify it.

Do not integrate another SDK before reviewing this report. Stop work on the Codex Cloud browser trust-store change, as requested. Test on an ordinary local machine with its normal trusted HTTPS connection; do not disable TLS checks, attestation, or release checks to obtain a successful response. No local machine has been connected or tested in this session.

## Comparison against our requirements

Evidence is uneven: Tinfoil has had more investigation. Unknowns below mean unverified, not that the other provider lacks the capability. None has demonstrated everyday answer quality in PrivateAI.

| Requirement | Tinfoil hosted inference | Privatemode hosted inference | Phala Cloud / dstack infrastructure option |
| --- | --- | --- | --- |
| Browser-to-protected-runtime confidentiality | Official SDK documents browser attestation and body encryption through a credential-adding proxy. Real Node verification passed; browser/live inference still unverified. | Official JS SDK documents browser support, deployment verification and encrypted requests/responses using a WASM client. Not installed or exercised here. | dstack provides attested confidential VMs, key management and TLS gateway/passthrough options. This does not by itself qualify a hosted model API or its downstream processing. |
| Fit with a thin PrivateAI gateway | Explicit proxy pattern keeps provider API key off the browser. Current custom adapter must still prove compatibility and preserve reviewed-release checks. | Browser credentials require explicit design: SDK supports API keys and rotating auth, but a secure gateway/short-lived credential path suitable for our app is not verified. A browser-shipped master API key is unacceptable. | Requires choosing/deploying a workload and securing gateway, runtime, logs and model dependencies. More responsibility than consuming a qualified inference service. |
| Verification policy | Returned router bundle verified with installed SDK. Approved release, freshness/revocation, firmware policy and protected model-worker chain remain open. | Source exposes manifests, minimum TCB fields and an optional expected WASM hash. Initialization can refresh the manifest automatically; we must examine compatibility with our approved-release policy. No deployment verification run. | Source explains TDX quotes, KMS, guest images and TLS modes. Quick-start configuration is explicitly not production-secure; full deployment policy needs engineering and review. |
| Retention and other recipients | Current API terms/privacy policy state no prompt/response retention after completion and no API-content training. Separate billing/security metadata remains. Tools, moderation applicability and cache lifecycle still need source/deployment corroboration. | Current retention terms, metadata recipients, caching and tool behavior not verified in this review; blocked documentation limits conclusions. Source availability is not a retention commitment. | Depends on workload, host service terms, logging configuration and any downstream APIs. A confidential VM forwarding plaintext to an ordinary model API would not meet our promise. |
| Failure/retry behavior | PrivateAI currently disables inference auto-retry and checks reviewed host/release. SDK default re-attestation behavior requires care if changing adapters. | README describes OpenAI retries plus one independent expired-secret refresh/retry. `maxRetries: 0` alone does not establish our explicit-retry behavior; inspect before adoption. | Application responsibility; no managed inference behavior verified here. |
| Models and usefulness | Public inventory lists general-purpose models, including `gpt-oss-120b` and `llama3-3-70b`. Inventory is not a quality test or guarantee of account availability. | Source configuration and SDK example include `gpt-oss-120b`; current account availability and task quality are unverified. | Model serving, protected GPU support and quality depend on the selected service/deployment. No turnkey model offering qualified in this comparison. |
| Cost and spending controls | API usage-based billing documented; exact rates and enforceable account cap remain inaccessible/unverified. $20/month consumer Chat is not API pricing. | Current rates, minimum purchase and spending controls unverified. | No quote verified; deployment/operations work adds cost and complexity. Do not assume confidential infrastructure is cheaper. |
| Licensing/integration | Existing locked SDK is available; selected SDK/model licenses still require final qualification review. | SDK package declares MIT, but the repository's top-level license restricts most source to auditing; do not assume the whole service can be copied or self-hosted. Distribution/license consistency remains to review. | Container infrastructure, not a substitute for checking model licenses and service terms. |
| Decision | First test candidate, conditional on access, price and budget evidence. | Credible fallback if Tinfoil fails a material qualification requirement or cannot provide practical access. | Defer for this stage; it would expand infrastructure scope. This is not a finding that all Phala offerings are unsuitable. |

Phala/dstack is included as a different architectural approach, not presented as an equally investigated turnkey inference API. We have not exhaustively surveyed the confidential-inference market or benchmarked these providers against each other.

## What prevents a final provider decision

For Tinfoil, the unresolved items are:

1. A real browser-to-gateway-to-provider encrypted conversation. The previous browser failure was the Cloud proxy trust setup; it neither proves nor disproves local browser compatibility.
2. Independent review and binding of the approved router release to the actual protected CPU/GPU model-worker chain, model identity, caches, diagnostics and applicable moderation. A router attestation alone does not establish that whole chain.
3. Evidence freshness, revocation/rollback protection and minimum accepted hardware/firmware policy. A fresh local timestamp is insufficient.
4. Current per-model input/output, cached/reasoning/request charges, context limits, minimum purchase, and provider-enforced spending control. The pricing API returns an explicit provider-side access denial. Do not continue Cloud workaround attempts or invent a price.
5. Live output quality, citation accuracy, responsiveness, actual charged usage and failure behavior. No inference benchmark has run for any candidate.

Privatemode additionally needs browser credential architecture, manifest-update policy, retry control, packaged WASM integrity and current legal/retention evidence checked before replacing the adapter. Its documented anonymous auth option does not establish product anonymity and does not change our deferred scope.

A small local synthetic test may explore technical compatibility while other review items remain open. It must stay isolated from ordinary app use and may not create a passing qualification report. Essential protection gaps still block using real private data or advertising verified confidentiality.

## Small local test, after prerequisites

Use the existing project on a connected local machine, loopback gateway and supported browser. Preserve the source and locked dependencies. Keep provider credentials in local process settings and out of browser code, chat and committed files. Do not purchase a consumer Chat subscription for API testing.

Before any charge, obtain current official account-specific API pricing and minimum purchase, choose one concrete model with no automatic routing, verify the supplier spending/quota settings, and present a specific cap for approval. A $5 ceiling could be a proposal if current prices and the provider's minimum permit it; it is neither a quote nor authorization. Disable auto-recharge where offered. If no enforceable cap exists, report that limitation before asking for spending approval. Do not treat client token limits as a monetary guarantee.

Run one two-turn conversation with locally extracted synthetic text:

> Synthetic invoice A: service €80.00, materials €20.00, discount €5.00, then 20% VAT on the discounted subtotal. Calculate subtotal, VAT and total and cite the invoice source.
>
> Correction: the discount is €10.00. Recalculate and explain what changed.

Expected first answer: €95.00 subtotal, €19.00 VAT, €114.00 total. Expected follow-up: €90.00 subtotal, €18.00 VAT, €108.00 total, a €6.00 reduction. Correct source attribution and preservation of the VAT rule are mandatory; wording may vary.

Capture browser verification status, approved release/key binding, redacted network structure, stream completion, source attribution and reported token usage. Inspect the gateway for ciphertext rather than the synthetic prompt in the inference body. Never store credentials in traces; disable or redact authentication-bearing trace capture. Record any unreported cost and reconcile billing once available.

Before/alongside this conversation, use local fault injection to verify an invalid/unapproved key or release prevents outbound inference. Label fault injection separately from live provider behavior. Cancellation or an additional provider-negative request must fit within the explicitly approved request/budget envelope, not be an unbounded automatic retry.

The result answers only whether this narrow interaction and its inspected path work. It does not pass the full security, retention, quality or expansion gates. Continue the existing evaluation stages only when their own evidence is available.

## Sources and review limits

- [Tinfoil SDK](https://github.com/tinfoilsh/tinfoil-js): official current README inspected; installed adapter uses the locked SDK. [Prior source/deployment observations](provider-source-review.md) record the real Node attestation check and router paths inspected.
- [Tinfoil privacy policy](https://tinfoil.sh/privacy), [terms](https://tinfoil.sh/terms), [pricing](https://tinfoil.sh/pricing): retrieved earlier in this review, with policy effective 22 September 2026 and terms updated 25 September 2026. Claims are supplier statements, not independent proofs.
- [Privatemode source at reviewed commit](https://github.com/edgelesssys/privatemode-public/tree/753fa3fe1f2321c71743dda54f2ebbb160f89e14): root README/LICENSE, `sdk/js/README.md`, `package.json`, `src/privatemode-ai.ts`, `src/manifest.ts`, and model configuration inspected. Source reviewed only; nothing installed or integrated into PrivateAI.
- [dstack source](https://github.com/Dstack-TEE/dstack): README retrieved through the Phala-Network repository path; it identifies managed Phala Cloud and documents gateway, key-management and deployment responsibilities. No Phala live deployment, contract review or performance test was performed.

The Cloud certificate change is paused by user instruction. No new SDK, trust-store change, provider credential, paid request or model-selection configuration was introduced for this report.
