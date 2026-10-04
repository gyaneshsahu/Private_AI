# Validation record — 4 October 2026

Current summary: the earlier WSL adapter completed a real two-turn synthetic
conversation. The current adapter is connected to the app and has passed local
crypto/browser failure tests; a new live check is prepared but not authorized.
Provider qualification remains incomplete. See [qualification ledger](provider-qualification.md),
[chain review](provider-chain-review.md) and [abort investigation](network-abort-review.md).
Git baseline `87d4acb` preserves previous work; source updates now use the
[Git workflow](git-workflow.md). Current batch validation is appended below.

## Historical record — initial foundation before WSL inference

The repository was initially empty. No pre-existing application code was replaced.
The following observations describe that earlier development stage, not current
provider or Git status.

## Passed in this cloud instance

- TypeScript check and production build.
- 33 Vitest assertions/tests across context, decimal calculations, approval ownership/expiry/replay, public-address and proxy-host restrictions, HTTP origin/CSRF checks, provider gates, real WebCrypto encryption/lock/tamper/deletion and evaluation grading.
- 7 Chromium browser tests covering actual PDF extraction with source-page/amount fidelity, explicit malformed-PDF failure, real local screenshot OCR, text editing/context selection, temporary reload behavior, encrypted snapshots across reloads, deletion, calculator reset, dialog keyboard focus, disclosure cancellation and basic desktop/360px layouts.
- Browser network inspection during local text and OCR checks observed no external requests.
- Read-only public documentation fetch through the platform proxy, with the exact host explicitly approved: one actual source returned and expected document content found. A further browser check completed disclosure review → explicit approval → real public retrieval → inspectable source context. No search or inference API was involved.
- `npm audit --omit=dev`: no reported production dependency vulnerabilities at the time of this run. This is an advisory lookup, not security certification.
- Dataset integrity check: 24 development + 24 reserved cases across six families, frozen by SHA-256. **Zero model evaluations executed.**

Tests use synthetic data. Unit tests use fake IndexedDB for database semantics and real WebCrypto for encryption; browser tests use real Chromium IndexedDB, WebCrypto, PDF.js and Tesseract. Provider qualification fixture objects are explicitly test-only. No test result is evidence of a live confidential processing deployment.

## Issues found and repaired

- PDF.js needed an explicit nested worker port in the document worker. Its incidental protocol messages must not be treated as completed extraction results. The synthetic PDF and malformed-PDF browser tests now pass.
- The cloud platform delegates networking/DNS to an HTTP(S) proxy. Arbitrary direct DNS resolution failed. Proxy fetch mode now allows only exact operator-reviewed public hosts instead of silently dropping the SSRF boundary.
- Clearing a workspace now also clears calculator inputs/results and edit drafts.
- Deletion uses an atomic opaque-ID tombstone so a stale save cannot recreate deleted content. It removes the encrypted record and wrapped key; this does not guarantee device-level forensic erasure.

## Not established at the initial foundation stage

- Live confidential inference, full router/worker/CPU/GPU protection, provider retention and freshness/revocation behavior.
- Actual model quality, grounded model citations, follow-up quality, repeated-task reliability, comparative ChatGPT/Gemini performance, latency distribution and complete billed task cost.
- Live Brave Search integration. No API key is configured.
- Arbitrary-host page retrieval in this proxy-controlled cloud instance. Host approval and network policy remain prerequisites.
- Real phone hardware, Safari/Firefox support, accessibility audit, third-party security review, customer demand or production readiness.

The candidate verifier has a browser-capability-dependent gzip path; Vite reports its Node-only `zlib` fallback as externalized. Native DecompressionStream is present in the tested browser, but live browser attestation remains untested. Do not suppress that qualification requirement.

No paid resources were used. Stage A remains blocked; later local components are implemented but their presence does not bypass the live qualification gate.
# Isolated synthetic runner — 4 October 2026

Prepared a two-turn browser experiment reusing the real extraction/context/verification/encryption/stream code. Production `streamReply` still requires the full qualification report; the experiment has its own strict, expiring permit and cannot enable the product gateway. No valid permit or API key was created.

53 tests passed, including permit rejection, product qualification separation, real HTTP relay authorization and two-request limits, failure redaction/stop, expiry, and atomic approval consumption across concurrent starts and restarts. A Chromium test exercises real text extraction and follow-up state with an explicitly labelled model mock; it also verifies missing usage prevents a second request. All its network requests stay local. This establishes local workflow behavior only, not encryption/live-provider success.

Type checking and production build passed; seven existing Chromium browser checks passed. `experiment:check` correctly refused the absent permit with zero network requests. Frozen evaluation integrity remained 24 development + 24 reserved cases, zero model runs. No Cloud certificate, new SDK, paid service, commit or push was used. Local user-machine preflight and price review remain prerequisites.

# Provider access follow-up — 4 October 2026

Published network revision 13 is enforced. Direct router attestation and the Trust Center application shell returned HTTP 200. Pricing API access remains HTTP 403 with provider-side Cloudflare error 1010, not a missing hostname. No current API rates, subprocessor inventory or spending controls were validated.

An isolated Chromium browser-SDK probe failed on the environment proxy CA (`ERR_CERT_AUTHORITY_INVALID`). A request to import the already system-trusted CA into Chromium's NSS store was rejected by automatic approval review as an unapproved persistent trust expansion. No TLS bypass or trust modification occurred. This was a Cloud browser prerequisite. The later WSL preflight succeeded without that trust change; the Cloud setup remains paused. Application code was unchanged; no model inference or paid test ran. Details: [provider source review](provider-source-review.md).

# Stream completion validation — 4 October 2026

Fixed a false-completion path: transport EOF or token-limit termination previously could mark a partial answer complete. The stream consumer now requires an explicit normal text completion, rejects missing completion, tool requests, malformed usage and content after completion, and retains partial output outside future context. Normally completed refusal text is preserved. Reported usage received before a failure is retained; missing usage remains unknown and this is not a complete billing ledger.

Nine synthetic protocol tests cover these conditions, cancellation and transport failure; they are not live provider evidence. `npm run check` passed type checking, **45 unit tests**, and production build. **Seven Chromium browser tests** passed. No model requests or paid tests ran. The existing SDK browser-fallback warning remains pending supported-browser qualification.

Pricing access probes to `tinfoil.sh` and `www.tinfoil.sh` were denied by the proxy tunnel; the documentation catalog still returned HTTP 403. A network draft adds these two exact public website hosts while retaining all three existing custom hosts. The draft save succeeded and requires user review/save and publication; neither access restoration nor publication has been verified. Credentials and spending authorization remain absent.

# Follow-up validation — 4 October 2026

Public-source fidelity fix: plain-text responses now retain literal markup, entities and line breaks rather than being parsed as HTML. HTML extraction separates paragraph/table-cell boundaries so adjacent values do not merge. Rejected HTTP response bodies are explicitly cancelled to release connections. Three synthetic regression tests cover literal text, separated HTML facts/active-content removal, and unsupported media types; they do not establish live inference or general table accuracy.

A real `fetchPage` request through the configured proxy retrieved the router `v0.0.155` README from the explicitly allowed `raw.githubusercontent.com` host and preserved Markdown heading/list line breaks. This exercises the server retrieval function, not a new browser consent test or a model request.

After the fix, `npm run check` passed type checking, all **36 unit tests**, and the production build. `npm run test:e2e` passed **7 Chromium browser tests**. `npm run eval:check` confirmed the frozen 24 development/24 reserved datasets; **model runs remain zero**. The existing SDK `zlib` browser-fallback build warning remains and must be resolved through supported-browser qualification, not by bypassing verification.

Read-only provider discovery/source review progressed; see [provider source review](provider-source-review.md). No paid service, credentials, commits or push were used in this follow-up. Earlier validation below remains a historical record.

## 2026-10-04 — post-live-run local regression

The live WSL transcript and dashboard are reviewed in
[first live experiment review](first-live-experiment-review.md). Local changes
accept the observed citation delimiter while retaining text escaping and exact
source lookup. Diagnostic records now correlate requests without retaining
arbitrary URLs or content. The historical abort cause remains unknown.

`npm run check`: typecheck, 59 tests across 12 files and production build passed.
New tests cover citation source lookup/HTML escaping, restricted network labels,
and actual locked-SDK cryptography with a synthetic peer: valid response,
altered ciphertext, truncation, wrong nonce and wrong request context. These
are offline regressions, not additional live provider evidence. The existing
browser-zlib-fallback build warning remains. No provider calls or spending were
made for this batch.

`npm run test:e2e`: all 7 Chromium product tests passed, including real PDF/OCR extraction, encrypted local history, research consent and desktop/phone layouts.

## 2026-10-04 — privacy and failure-handling batch

`npm run check` passed typechecking, 74 tests across 15 files and the production
build. This includes a real Chromium/EHBP local-peer regression with 15 scenarios,
explicitly mocked attestation, no allowed external requests and no paid service.
The browser transport regression also passed after strengthening its successful
closure assertion to await `requestfinished`. `npm run test:e2e` passed all 7
product browser tests. The known SDK browser `zlib` fallback build warning and
Node's test-only experimental Web Crypto warning remain.

The revised SSE parser removes raw SDK parse-error logging from the inference
path, bounds frames, requires completion, preserves reported usage on later
failure, and supports cancellation. New summaries distinguish intentional
nonbillable diagnostic stops from failed/completed paid experiments and never
promote qualification or quality. Historical cost can be reviewed offline with
`experiment:review`; full billing is still unknown. See
[privacy/failure review](privacy-failure-review.md) for exact scope and remaining
gates. Live compatibility of this revised adapter is pending; no additional
provider call, private data transfer or spending occurred during this batch.

## 2026-10-04 — qualification, reliability and Git handoff batch

- `npm run check`: typecheck, **78 tests across 15 files**, production build passed.
- `npm run test:e2e`: **7 Chromium product tests passed**.
- `npm run eval:check`: frozen 24 development + 24 reserved cases unchanged;
  dataset-model evaluation remains unrun. The earlier two-turn smoke test is
  separate evidence, not part of this dataset evaluation.
- Offline legacy SDK/EHBP replay: complete synthetic answer and usage, identified
  relay `FINISHED`; no historical abort reproduced. The concurrent Vite fixture
  cache collision was reproduced, isolated and fixed; combined suites passed.
- One-request compatibility scope, 512-output-token limit, explicit confirmation,
  different single-use ID, one-request gateway cap and zero-document client
  workflow are tested. `compatibility:check` correctly exited 1 for the absent
  confirmation permit with `networkRequests: 0`; this is an expected refusal.
- Read-only provider work: fresh public inventory succeeded; pinned router and
  worker source reviewed. The attempted public worker bundle lookup failed with
  HTTP 501 before verification. No inference or API credential was involved,
  and it was not retried unchanged. Worker/GPU evidence remains incomplete.
- Git read/write access to `gyaneshsahu/Private_AI` succeeded. Existing source
  preserved in baseline `87d4acb` on `main`; current work uses the review branch
  `codex/provider-qualification`. GitHub's separate API returned Forbidden;
  branch publication works without requesting another credential or using ZIPs.
- Local document links and `git diff --check` passed. Known browser `zlib`
  fallback and test-only experimental WebCrypto warnings remain documented.

See [qualification ledger](provider-qualification.md), [chain review](provider-chain-review.md),
[abort investigation](network-abort-review.md), [minimal check](live-compatibility.md)
and [Git workflow](git-workflow.md). No further paid inference was run. The
current adapter remains unqualified for private data and awaits confirmed scope
plus WSL execution for its smallest live compatibility check.
