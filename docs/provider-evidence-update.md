# Provider evidence update and production relay verification

5 October 2026. Full provider qualification remains **NOT_PASSED**.

## Newly accessible primary evidence

The official documentation index and four Markdown pages were retrieved over
normal TLS. Public source snapshots and SHA-256 hashes are in ignored
`.local/provider-docs-20261005/`. These are supplier statements, not independently
verified deployed settings. Historical access failures remain historical.

- [Backend architecture](https://docs.tinfoil.sh/verification/attestation-architecture)
  describes boot-time NVIDIA local GPU verification and aborting boot on failure,
  plus router verification of the next enclave. This clarifies the intended chain;
  it does not bind our observed router digest to a particular worker/build/TCB.
- [Verification](https://docs.tinfoil.sh/verification/verification-in-tinfoil)
  describes code/platform freshness witnesses, with a seven-day default maximum,
  in its Go-verifier/CLI release-pinning section. It also distinguishes signed
  provenance from independent reproducible-source verification. Do not assume
  these statements establish equivalent behavior in our browser SDK.
- [Prompt caching](https://docs.tinfoil.sh/sdk/prompt-caching) explains cache
  partitioning by API identity and `user_cache_secret`; raw HTTP clients must
  supply the field themselves. A distinct opaque secret isolates a namespace but
  does not encrypt cache entries or establish their eviction time.
- [Attestation formats](https://docs.tinfoil.sh/verification/predicate) documents
  SEV-SNP/TDX formats and the attested TLS/HPKE key bindings. A supported format
  description is not evidence that our selected verifier accepts every format.

## Pinned JavaScript implementation

Installed `@tinfoilsh/verifier` 1.2.2 `dist/client.js` verifies hardware evidence,
Sigstore provenance, measurement equality and certificate binding. Its returned
`verifiedAt` is generated locally; the installed README explicitly calls it local
completion time, not evidence freshness. The inspected `verifyBundle` path does
not consume a code/platform freshness-witness field. This is a scoped source
finding, not a claim that all certificate or TUF validity checks are absent.
`dist/attestation.js` accepts SEV-SNP Guest V2 and rejects unsupported formats.
The selected router can delegate worker verification; the browser does not thereby
independently review each GPU worker. Need version-specific freshness/revocation
and worker-admission evidence before closing Q1. Do not replace this gap with a
recent local timestamp, repeated successful calls or a fabricated review report.

## Existing cache boundary verified

`src/verified-chat.ts` already generates `crypto.randomUUID()` for
`user_cache_secret` inside each encrypted request. It is request-scoped, not stored
in conversation state, and does not intentionally reuse another request's cache
namespace. No replacement cache implementation was needed.

The real browser/EHBP synthetic-peer test now checks a nonempty fresh value on
every current-adapter request, uniqueness across requests, absence from returned
conversation/context/evidence, browser local/session storage and captured logs.
The historical legacy replay is excluded from current-adapter guarantees. This
verifies our request handling, not provider cache retention or timing resistance.

## Production relay repair

The experiment gateway previously distinguished a normally finished response from
a client disconnect. The production gateway still aborted its upstream signal on
both. It now aborts on close only when `res.writableFinished` is false, retaining
`Cache-Control: no-store` and cancellation on a genuine disconnect.

Three actual HTTP gateway tests with an injected synthetic upstream verify exact
opaque response bytes and normal completion, cancellation of a stalled upstream,
and rejection after qualification expiry even when the service started qualified.
The upstream is mocked; qualification is an explicit test fixture. These cannot
qualify the live provider. No retry behavior or privacy gate changed.

## Concrete remaining evidence request — draft, not sent

Subject: Deployment-specific evidence for PrivateAI's GPT-OSS and Gemma browser trials

We are evaluating `gpt-oss-120b` and `gemma4-31b` through
`https://inference.tinfoil.sh`, using Tinfoil JavaScript 1.2.2 and EHBP 0.3.3.
Neither candidate is approved for private user data. Please provide independently
inspectable deployment artifacts for each candidate, not only general architecture
statements. The observed router repository is `tinfoilsh/confidential-model-router`.
The public catalog names `tinfoilsh/confidential-gemma4-31b` for the Gemma candidate;
please confirm the actual admitted repository/build for both models.

Requested artifacts for **each** candidate:

1. The deployment artifact/build binding for router digest
   `ad95d02b2e27b3c1d5c327f2ee9616634f841e4b2ed5a48f404e4e9f595a4876`, and admitted
   `gpt-oss-120b` and `gemma4-31b` worker releases, measured configuration and
   GPU/firmware policy. Map model ID → worker repository → build/provenance →
   admitted measurement → hardware/firmware policy; identify shared versus
   model-specific components and how updates invalidate this evidence.
2. A supported public worker-evidence retrieval path; the earlier ATC worker
   lookup returned 501. Include how router admission is bound to those releases.
3. Freshness, revocation and rollback checks available in browser verifier 1.2.2,
   including witness compatibility and failure behavior. If unsupported, identify
   a maintained browser-compatible path without downgrading client verification.
4. API-key-specific content handling: cache eviction/lifetime, diagnostic and
   moderation applicability, downstream recipients and deployed egress policy.
   Confirm whether per-request cache namespaces have any retention implications.
5. Exact account hard-stop behavior for streaming requests and token/cache/reasoning
   billing reconciliation. Dashboard limits remain user-reported controls.

No credentials, transcript, personal data or private source are needed in this
request. A supplier reply would still need review; it is not an automatic pass.
For every answer, include artifact URL/hash, software version, deployment scope,
validity interval, failure behavior and any unsupported guarantee. Please do not
request our API key or private prompts. This request is prepared but **not sent**.
The simplest next step for Q1 is obtaining these version/deployment-specific
artifacts, while continuing ordinary product and quality work.

Validation: 110 unit/integration tests across 25 files, eleven production browser
workflows, TypeScript, production build and fixture integrity passed. Existing
verifier `zlib` browser-build warning remains. Operational qualification was not
created or changed; historical experiment claims/results remain preserved.
