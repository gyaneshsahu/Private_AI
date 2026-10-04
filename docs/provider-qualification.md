# Provider qualification — BLOCKED

Current decision report: [provider recommendation](provider-recommendation.md). Tinfoil is the provisional first local-test candidate, Privatemode the fallback. The Cloud certificate work is paused by user instruction; no SDK switch or paid test is authorized by the recommendation.

Next actionable workflow: [local experiment](local-experiment.md), including a no-credential browser verification command. This preflight does not enable paid conversations or mark qualification as passed.

Candidate: Tinfoil JS SDK 1.2.2, EHBP 0.3.3. Alternative: Privatemode, not integrated or qualified. Tinfoil remains a synthetic-test candidate, not approved for private user data.

Latest progress: the user supplied a successful two-turn live WSL experiment on 4 October 2026, under the approved USD 2 cap. Both answers, the correction, router verification and encrypted response relay are recorded. See [first live experiment review](first-live-experiment-review.md) for grading, token cost estimates, citation UI limitations and unresolved network events. Full downstream processing, retention, freshness/revocation and actual billing remain unqualified. Earlier access and no-inference observations below are historical.

## Verified from source, not from a live deployment

- The official JS SDK exposes browser-compatible attestation verification and encrypted bodies. The SDK default router represents another trust boundary before the model worker.
- EHBP encrypts bodies, not HTTP headers, paths or query strings. The gateway forwards only explicitly constructed authentication/protocol headers. It does not forward browser cookies or CSRF tokens upstream.
- The normal SDK may re-attest on a key mismatch. PrivateAI instead composes the maintained verifier and EHBP transport directly, checks the approved release and host, and disables automatic retries. A rotated key requires a new explicit request and verification. This adapter still needs live compatibility tests.
- The verifier's `verifiedAt` is a local timestamp, not replay resistance. Calling it again does not itself establish evidence freshness or revocation. Default hardware policy and minimum firmware/TCB assumptions require review.
- The SDK verifier's browser gzip branch uses native DecompressionStream. The build warns that its Node-only `zlib` fallback is externalized. Unsupported browser capabilities must fail, not disable verification.

Primary sources inspected:

- https://github.com/tinfoilsh/tinfoil-js/tree/eac102f50ad3c1bfc3fd3cefe8a615671d86fa52
- https://github.com/tinfoilsh/encrypted-http-body-protocol
- https://github.com/tinfoilsh/confidential-model-router
- https://github.com/edgelesssys/privatemode-public

Further read-only deployment discovery and router review are recorded in [provider source review](provider-source-review.md). Public inventory/status are reachable. The observed router supports tool execution and conditional first-party chat moderation; their applicability must be established for the chosen API path. No qualification gate has passed as a result of this source review.

## Required work before enabling user inference

1. Obtain current documentation and deployment evidence for the full router/CPU/GPU/worker chain. Identify plaintext recipients, admission/billing metadata, moderation, diagnostics, caches, retention and external tool behavior.
2. Verify browser evidence freshness, certificate validity, revocation, trust-root updates and approved release policy. Confirm what an adversarial infrastructure operator can and cannot substitute.
3. Identify one actual supported model and exact enclave origin. Verify terms, SDK licenses, context limits, output/reasoning billing and current pricing. Do not select `auto` routing.
4. Present a concrete live-test service and spending cap for user approval. Have credentials supplied securely in environment settings. Do not put them in a qualification file or chat.
5. Run isolated synthetic live probes first: browser verification, encrypted relay, actual streaming, cancellation, usage accounting and failures. Inspect the whole network path, including verification-service requests, which can reveal the browser IP. Establish provider-enforced spend/quota controls; browser token limits and session request counts alone cannot enforce a monetary budget.
6. Exercise wrong keys, altered ciphertext, unapproved releases, expiry/revocation, outages and rotation. Label injected faults versus actual provider events. Retention claims need source/configuration/contract evidence beyond traffic captures.
7. Record the resulting review and measured evidence in the qualification schema, with reviewed digests, origin, model, pricing, validity period and links to each check's artifacts. Only then load it as `.local/qualification.json` and supply `TINFOIL_API_KEY`.

No passing qualification file ships in the repository. Test fixtures are synthetic and must never be copied into operational configuration. The report is an operator review artifact, not a cryptographic attestation, and cannot create assurance by setting fields to `pass`.

## Environment access still needed

Read-only recheck on 4 October 2026: runtime configuration lists `docs.tinfoil.sh`, `docs.privatemode.ai` and `atc.tinfoil.sh`; network enforcement status is reported as unknown. Both documentation roots and their `/llms.txt` endpoints returned HTTP 403; root responses contained `error code: 1010`. This does not establish that the configured allowlist is missing or identify which intermediary rejected the request. `https://atc.tinfoil.sh/` returned HTTP 200 with the Air Traffic Control landing page. That establishes landing-page reachability only, not attestation validity, model availability or protected inference.

No provider credentials are configured: `TINFOIL_API_KEY` and `BRAVE_SEARCH_API_KEY` were checked for presence only and are absent. Current documentation, terms/prices and deployment evidence still need an accessible authoritative source before selecting the live service and proposing a spending cap. Add exact additional inference/verification destinations only after discovering the selected deployment; do not open a wildcard to make it pass. No inference or paid request was made during this recheck.

Search remains unqualified and disabled without `BRAVE_SEARCH_API_KEY`. Current public documentation retrieval through an explicitly approved public host was tested without credentials or spend. That does not validate live search, comprehensive research quality or arbitrary-host fetches.

## Explicit limits

- Inference gateway is for one trusted local operator, not internet-facing multiuser use.
- Browser-delivered code, dependencies, operating system and device are trusted. A malicious site update can capture plaintext.
- Provider review must establish that model-side tool/external egress is disabled. Prompt instructions alone are insufficient.
- HTTP metadata, timing and IP remain visible. Anonymous access is not implemented.
- HTTPS proxy fetch mode trusts operator-approved public hosts and the platform proxy. It cannot establish DNS pinning through an opaque proxy. Other hosts fail closed.
- Request limits are operational protections, not billing enforcement. Pricing estimates are not reconciled invoices.

## Post-live adapter revision

The response parser was revised after the successful two-turn WSL test to avoid
SDK error paths logging decrypted frames. Its local browser/crypto/fault checks
are recorded in [privacy/failure review](privacy-failure-review.md). The previous
live test remains historical evidence for the previous adapter; compatibility of
the current revision with live provider streaming is pending. All other provider
qualification gates remain unchanged. No new paid run was made.
