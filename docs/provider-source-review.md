# Provider source review — 4 October 2026

Current status: Node and WSL browser router verification passed; an earlier adapter completed two live synthetic turns. Full provider qualification remains incomplete. The new [immutable-source chain review](provider-chain-review.md) and [qualification ledger](provider-qualification.md) supersede the historical access observations below. The revised adapter still needs its [minimal live check](live-compatibility.md).

## Historical access review — before the successful WSL test

### Subsequent access and browser checks

After the next publication, runtime revision 13 reported all eight requested hosts enforced. Direct `https://inference.tinfoil.sh/.well-known/tinfoil-attestation` returned HTTP 200; this fetch alone is not cryptographic verification. The Trust Center subprocessor URL returned HTTP 200 with an application shell; the subprocessor inventory itself has not been validated.

`https://api.tinfoil.sh/api/config/models` still returns HTTP 403. Its JSON error identifies Cloudflare error 1010, `browser_signature_banned`, `retryable: false`, and owner action required. This is no longer a missing environment allowlist entry. Do not continue unchanged retries or claim rates are available. At that time, rates and account controls were unavailable and no paid budget had been approved. The later user-supplied rates, USD 2 approval and completed experiment are recorded in the current ledger.

A Chromium check imported the installed browser SDK through local Vite. The unqualified application's CSP correctly blocked external verification requests. An isolated blank probe page allowed only the public ATC destination and local modules, without loading private content or an operational qualification report. The real browser request then failed with `net::ERR_CERT_AUTHORITY_INVALID` before attestation verification. No HTTPS-error bypass was enabled. The environment proxy CA is already valid under the system CA bundle but absent from Chromium's NSS trust database.

Automatic approval review rejected importing that environment CA into Chromium's persistent trust store, citing that it broadens TLS trust beyond the specific task and requires explicit user authorization. No trust-store modification occurred. Cloud browser use remained blocked then. The user subsequently chose WSL, where browser verification succeeded; no further Cloud trust-setting decision is being requested. No application security policy or verification requirement was weakened.

After environment publication, the five configured website/discovery hosts were reported enforced. The [pricing page](https://tinfoil.sh/pricing), [privacy policy](https://tinfoil.sh/privacy), [terms](https://tinfoil.sh/terms), [DPA](https://tinfoil.sh/terms/dpa) and [security/privacy FAQ](https://tinfoil.sh/security-and-privacy-faq) returned HTTP 200. The documentation site still returns HTTP 403.

The privacy policy (effective 22 September 2026) and terms (updated 25 September 2026) state that API prompt/response content is not retained after the response. The policy states API content is not used to train models. Account, billing, usage and security metadata have separate retention, including billing records typically up to seven years; this is not anonymity. First-party Chat moderation and encrypted backups have distinct handling. These are supplier commitments to corroborate against deployed behavior, not independent security certification. Regulated uses require appropriate written agreements; synthetic qualification remains the immediate scope.

The visible $20/month offer is consumer Chat, not an API budget. Official pricing-page JavaScript identifies API billing as usage-based and loads model configuration from `https://api.tinfoil.sh/api/config/models`; access to that host is currently denied by the proxy. Model input/output prices, possible request charges, cached-token rates and provider-enforced spending limits remain unverified. Do not infer these prices from the Chat plan or choose an operational model yet.

`node scripts/probe-provider.mjs` succeeded at `2026-10-04T12:28:51.764Z`. The installed SDK verified a real bundle for `inference.tinfoil.sh`, repository `tinfoilsh/confidential-model-router`, release digest `ad95d02b2e27b3c1d5c327f2ee9616634f841e4b2ed5a48f404e4e9f595a4876`. Its only observed fetch was an HTTP 200 response from ATC `/attestation`. The SDK uses POST for this read-only lookup, containing only the public enclave URL and repository. The probe permits that exact payload, rejects credentials and other mutations, and has a 45-second request deadline. An initial GET-only guard rejected the SDK lookup; the corrected guard explicitly allows only this public metadata lookup.

This establishes successful Node SDK cryptographic verification of the returned bundle, not independent release approval or evidence freshness/revocation, browser compatibility, downstream GPU/model verification, confidential streaming or retention enforcement. No qualification JSON was created, and the observed digest was not added to any operational allowlist. The probe cannot send inference requests.

The SDK's normal selected-deployment path gets a complete bundle from ATC; its lower-level direct assembler references separate GitHub/certificate proxies. Those extra proxies are unnecessary for the successful probe and are not included in the final network draft. The saved draft retains existing hosts and adds `api.tinfoil.sh` (published rates), `trust.tinfoil.sh` (subprocessor evidence) and `inference.tinfoil.sh` (selected router's direct evidence and eventual authorized inference). It requires review/save and publication before access can be retested; saving does not activate it.

## Public deployment observations

Read-only HTTPS GETs to [inventory](https://atc.tinfoil.sh/inventory) and [status](https://atc.tinfoil.sh/status) succeeded. The observed status timestamp was `2026-10-04T11:39:45.686365363Z`. The inventory reported router version `0.0.155`, including `inference.tinfoil.sh` and `router-0.tinfoil.sh`. Model entries included `gpt-oss-120b` and `llama3-3-70b`, among others. These are provider-published observations, not independently verified attestations, pricing evidence or model recommendations.

The official SDK [README](https://github.com/tinfoilsh/tinfoil-js/blob/main/README.md) remains accessible through GitHub and describes browser body encryption through a credential-adding proxy. This moving branch is supplementary documentation; qualification must use the installed/pinned SDK and verified deployment artifacts.

## Router release inspected

Sources below were read at tag `v0.0.155`. A tag/source review is not proof that the live service runs those bytes; qualification still needs a verified release digest and build/measurement binding.

| Source | Observation | Qualification consequence |
| --- | --- | --- |
| [README](https://github.com/tinfoilsh/confidential-model-router/blob/v0.0.155/README.md) | Router authenticates through a control plane, resolves models and supports server-side tool loops. | Review admission/billing metadata and every active processing recipient. An encrypted first hop is insufficient. |
| [main.go](https://github.com/tinfoilsh/confidential-model-router/blob/v0.0.155/main.go) | Detects tool profiles and auto-continue tools; zero active profiles and no auto-continue tools takes the plain model proxy path. Also invokes safeguards capture with a first-party chat credential classifier. | Confirm our exact API credential and request shape take the intended path. PrivateAI sends a fixed model and no tool options, but source observation alone does not demonstrate live behavior. |
| [toolruntime/options.go](https://github.com/tinfoilsh/confidential-model-router/blob/v0.0.155/toolruntime/options.go) | Router recognizes `web_search_options`, `code_execution_options` and `pii_check_options`. | Keep these options out of the request builder; finish reviewing profile detection and deployed policy before marking provider-side tools disabled. |
| [safeguards/capture.go](https://github.com/tinfoilsh/confidential-model-router/blob/v0.0.155/safeguards/capture.go) | Capture requires an eligible first-party chat credential; comments explicitly exclude API keys. Captured messages and completed answers can be submitted to a sidecar. | Do not generalize first-party chat privacy behavior to API inference. Review the credential classifier and bind this code to the deployed release; no live exclusion test has run. |
| [safeguards/submitter.go](https://github.com/tinfoilsh/confidential-model-router/blob/v0.0.155/safeguards/submitter.go) | Sidecar submissions contain the credential, conversation identifier and messages; queues and size limits are present. | Any applicable capture path expands plaintext recipients and retention questions. Do not infer zero retention from absence of application logs. |
| [tinfoil-config.yml](https://github.com/tinfoilsh/confidential-model-router/blob/v0.0.155/tinfoil-config.yml) | Pins router and safeguards container images, configures control-plane endpoints and sets enclave network egress to `open`. | No claim of hardware-enforced external-network isolation. Protection depends on reviewed attested software behavior and configuration; any activated sidecar/downstream model must be included in the trust boundary. |

The findings are not evidence of an observed leak. They identify paths that a rigorous privacy claim must account for, including the distinction between API credentials and first-party chat tokens. Do not disable verification or choose unprotected inference to avoid this review.

## Historical pre-test assessment

### User-run WSL evidence and reported prices — before inference

The user supplied the local preflight result dated `2026-10-04T17:54:22.564Z`: `LIVE_BROWSER_PREFLIGHT`, `ROUTER_VERIFICATION_PASSED`, zero inference requests, HTTP 200 from ATC `/attestation`, and verified host `inference.tinfoil.sh` / repository `tinfoilsh/confidential-model-router`. The reported release digest is `ad95d02b2e27b3c1d5c327f2ee9616634f841e4b2ed5a48f404e4e9f595a4876`, matching the earlier Node observation. Their evidence file is `/home/dressfit/projects/Private_AI/.local/browser-preflight-1791136464818.json`. This is user-supplied execution evidence; the assistant has not independently read that local file. It resolves the initial local-browser compatibility obstacle, not downstream inference, freshness/revocation or full qualification.

The user also transcribed Tinfoil's USD API price table. For the proposed first test, `gpt-oss-120b` is listed at $0.15 per million input tokens and $0.60 per million output tokens, with no cached-input or per-request price shown. These are user-reported current dashboard rates, not an independently fetched rate sheet. Select this as the experimental baseline because it is listed, general-purpose and inexpensive, without asserting competitive answer quality. Do not substitute `gpt-oss-safeguard-120b`.

Illustrative two-turn cost at 10,000 total input tokens and 2,048 total output tokens: $0.0027288. This is not a token-count measurement or guaranteed charge; billable reasoning, failures, taxes, activation/deposit requirements and account controls must be checked. No hosted document upload, search or other per-request service is needed for the local text invoice experiment.

Historical proposal (superseded): at this stage a USD 1 activation/test allowance was being considered. The user later approved USD 2 for one two-turn test, now completed. This paragraph grants no current spending authority. If activation requires a larger payment, deposit or authorization hold, pause before accepting it. If controls are only visible after activation, inspect and set them before inference; an alert or soft threshold is not a verified hard cap. Keep API credentials out of chat. The historical blockers below should be read with this update: browser preflight and user-reported rates have progressed, but Stage A remains blocked.

- Documentation roots and `/llms.txt` still return HTTP 403; current prices, terms, retention commitments and spending controls are unverified.
- Complete source/deployment review of credential classification, model admission, downstream CPU/GPU verification, caches, logging and release freshness/revocation is pending.
- No API credential or paid-test approval exists. Do not select or purchase a model based only on public inventory.
- Browser-to-gateway-to-provider encryption, failures, cancellation and billing require synthetic live tests after access and spending approval.

Stage A remains blocked. This evidence supplements, and does not replace, the [qualification checklist](provider-qualification.md).
