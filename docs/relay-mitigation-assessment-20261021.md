# Relay mitigation assessment — 21 October 2026

Status: **ASSESSMENT ONLY — provider qualification remains NOT_PASSED; every gate in [provider-qualification.md](provider-qualification.md) stays closed.** No production code was changed, no provider request was made, no credential was used and no supplier was contacted. This is decision input for the provider-direction choice the founder makes after the Tinfoil reply deadline of 23 October. None of the three mitigations below is approved, implemented or a qualification claim.

Labels used throughout: **[S]** supplier statement from public documentation re-read on 21 October (not verified against the deployment serving our account); **[V]** verified locally from this repository's code and tests or from a loopback proof-of-concept; **[U]** unknown, needs evidence before any design decision; **[D]** design inference drawn from [S] and [V], not itself evidence.

## 1. Scope and method

Read: `docs/provider-qualification.md` (21 October entry, evidence ledger, "What prevents enabling private-user inference"), `docs/provider-evidence-update.md`, `server/app.ts`, `src/verified-chat.ts`, `shared/contracts.ts`, `server/usage-contract.ts`, `server/usage-ledger.ts`, `server/usage-postgres.ts`, `server/deployment-process.ts`, `server/deployment-config.ts`, `server/consumer-workspace.ts`, `server/network.ts`, `Dockerfile.render`, `server/render-entry.ts`, `tests/production-relay.test.ts`, `tests/relay-browser.test.ts`, `tests/usage-ledger.test.ts`, `tests/account-usage-http.test.ts`, `evaluation/experiment-gateway.ts`. Fetched over normal TLS: the seven Tinfoil pages named in the brief plus the CLI, Tinfoil Proxy CLI, attestation architecture, EHBP, admin API and pricing pages and the public `freshness-witness` and `tinfoil-go` repositories (section 10). One throwaway loopback proof-of-concept was run outside the repository with synthetic header values and no network beyond 127.0.0.1 (section 7.1); nothing from it enters the repository.

## 2. Baseline: what the relay and browser do today [V]

- Relay (`server/app.ts`, route `/api/inference/v1/chat/completions`): refuses unless a currently valid qualification and an API key are configured; accepts only `X-Tinfoil-Enclave-Url` equal to the qualified origin, a 64-hex `Ehbp-Encapsulated-Key`, and a raw body of 16 bytes to 1 MB; caps concurrency at **three for the whole process** (`active`), not per account; generates its own `requestId` (`randomUUID`), then `usage.reserve` → `usage.dispatch` → forwards the opaque body with `undici.fetch` (adds `Authorization`, `Content-Type`, `Accept: text/event-stream`, the encapsulated key; 90 s deadline); rejects upstream replies that lack `Ehbp-Response-Nonce`; never reflects upstream errors; aborts upstream when the client closes before `writableFinished`; settles `finish(accountId, requestId, "transport_complete" | "uncertain")`; a failed settlement leaves the reservation counted.
- The relay sees only headers and ciphertext. EHBP leaves HTTP headers "in the clear for routing" and encrypts the body in AES-256-GCM chunks [S, EHBP page]. The `model`, `max_completion_tokens`, `messages`, `stream` and `user_cache_secret` fields are all inside the encrypted body built by `src/verified-chat.ts`, so the relay cannot read or enforce them.
- Ledger (`server/usage-ledger.ts`, `server/usage-postgres.ts`, `server/migrations/0004-usage-ledger.sql`): request counts only ("Durable request counts, not token billing or proof of completed answers"); states `reserved → dispatched → transport_complete | uncertain`; replayed IDs never reserve twice; `finish` is idempotent for the same outcome and rejects any other transition; no automatic refunds (`tests/usage-ledger.test.ts`). `summary` exposes `used`, `pending`, `uncertain`.
- Browser (`src/verified-chat.ts`): per request fetches the attestation bundle through `atc.tinfoil.sh` (CSP `connect-src` in `server/app.ts` allows ATC, the GitHub and KDS proxies, the Sigstore TUF CDN and the qualified origin), verifies with pinned `tinfoil` 1.2.2, and `assertVerification` requires `securityVerified`, an HPKE key, the approved repository, a `releaseDigest` contained in `releaseDigests`, and the expected host; the calculator continuation re-verifies and refuses if the digest changed mid-conversation.
- Status route (`/api/status`): `inference.ready = !!qualification && !!apiKey`; publishes the qualification report only when ready. `shared/contracts.ts` types this as `AppStatus.inference`.
- Hosted candidate: `createApp` in `production-candidate` mode **throws if an API key, qualification, search key, dev flag or billing router is configured** (`server/app.ts` lines 49–64); `server/deployment-config.ts` has no inference fields; `server/deployment-process.ts` prints "email and inference disabled". Every mitigation below therefore changes code that the Render candidate cannot reach until a separate, explicit composition decision.
- Container: `Dockerfile.render` builds and runs on `node:24-bookworm-slim` pinned by digest, single stage lineage, no Go toolchain, `USER node`, entrypoint `node --import tsx server/render-entry.ts /etc/secrets/render-config.json`; `render-entry.ts` calls `startDeployment(true)`, which runs the mTLS application on loopback and the Render bridge on `PORT`.
- Egress: `server/network.ts` uses `EnvHttpProxyAgent` only when `HTTPS_PROXY`/`HTTP_PROXY` is set; `publicFetchHosts` is an allowlist for research fetches only, not for the relay.
- No code in `server/`, `src/`, `shared/` or `tests/` mentions `X-Tinfoil-Model`, `X-Tinfoil-Request-Usage-Metrics`, `X-Tinfoil-Usage-Metrics` or trailers (repository grep on 21 October); only the two provider docs mention them.
- Existing relay tests: `tests/production-relay.test.ts` covers normal completion without aborting upstream, aborting a stalled upstream on client disconnect, refusing after qualification expiry, and the three-slot bound without leaking upstream details; `tests/relay-browser.test.ts` drives real Chromium against the experiment gateway for complete, truncated and cancelled streams and records `FAILED_COST_UNKNOWN` for the last two.

## 3. Supplier documentation relevant to the three mitigations [S]

Quotes are exact fragments; sentences longer than the fetch tool returns are cut at the fragment boundary.

Verification and freshness:

- JavaScript SDK ([javascript-sdk.md](https://docs.tinfoil.sh/sdk/javascript-sdk.md)): "The JavaScript verifier does not implement the freshness witness, revocation, or Intel TDX checks"; "`verifiedAt` in the verification document is the local clock reading when verification completed."; "Release selection comes from the attestation bundle proxy, which serves the router's current release."; "it does not enforce a maximum release age or a minimum version."; "Compare `releaseDigest` in the verification document against the release you expect if you need rollback resistance."; "The attestation bundle proxy only supports AMD SEV-SNP routers."; "A request for a TDX enclave returns `501 Not Implemented`, which surfaces as a FetchError."; "or run the CLI as an audit-time check alongside a JavaScript client." The same page lists what 1.2.2 does check, including "with minimum firmware and TCB versions and debug mode disabled."
- Verification page ([verification-in-tinfoil.md](https://docs.tinfoil.sh/verification/verification-in-tinfoil.md)): "V3 attestation is beta while deployment is ongoing."; "Features that depend on V3, including workload release pinning and freshness checks, share that status."; "The Go V3 verifier and Tinfoil CLI support beta workload release pinning."; pin grammar `owner/repo@sha256:<DIGEST>` means "The signed deployment artifact must have this exact digest"; "A repository reference without a tag accepts currently witnessed releases from that repository;" "it does not require the latest GitHub release."; "Every form retains the normal hardware, provenance, and freshness checks."; "Code and platform freshness witnesses have a maximum age of seven days by default."; "An enclave reboot can change its connection keys while the workload release stays the same." The page contains no occurrence of "revocation", "CRL", "minimum version" or "rollback".
- Feature status ([feature-status.md](https://docs.tinfoil.sh/resources/feature-status.md)): every listed feature is "Beta", including V3 verification in the Go SDK, Swift SDK and Tinfoil Proxy, CLI attestation verification, and "V3 workload release pinning and freshness checks". The page does not mention revocation, TDX, usage metrics, model headers or the JavaScript SDK.
- Go SDK ([go-sdk.md](https://docs.tinfoil.sh/sdk/go-sdk.md)): V3 verification "including the installation below, is [beta]"; `client.Verify()` returns a value with `CodeTag`; "`HTTPClient()` only sends requests to the verified enclave and encrypts request bodies to it."; TLS pinning via `tinfoil.WithTransport(tinfoil.TransportTLS)`. The `enclave` package README ([tinfoil-go/enclave](https://raw.githubusercontent.com/tinfoilsh/tinfoil-go/main/enclave/README.md)): `handle.Verify()` "returns the verified measurements and keys"; every request checks a `FreshnessExpiresAt` deadline "before admitting each request"; "There is no background refresh."; `enclave.Options.PinnedRegisters` can require specific measurement registers; a local `verify.EmbeddedConfig` still leaves "Runtime and platform endorsements and freshness remain required."
- CLI ([cli-sdk.md](https://docs.tinfoil.sh/sdk/cli-sdk.md)): `tinfoil attestation verify` with `-e/--enclave`, `-r/--repo` ("Expected config as `owner/repo[@tag][@sha256:digest]`"), `-j/--json`, `-l/--log-file`; the audit record "includes the timestamp, enclave host, repository reference, verified deployment artifact `digest`," "code and enclave measurements, endorsed `crypto_material`, `freshness_expires_at`, and verification status."; "The CLI uses the default seven-day maximum age for freshness witnesses."; "It does not expose flags for changing that window or supplying arbitrary measurement-register pins."; install options are release binaries, `curl ... | sh` (uses `sudo`), `go build -o tinfoil` from source, or `ghcr.io/tinfoilsh/tinfoil-cli`; `TINFOIL_NO_UPDATE_CHECK=1` disables the passive update check; `tinfoil trust set --mode frozen` exists for connection pins.
- Freshness witness ([freshness-witness README](https://github.com/tinfoilsh/freshness-witness)): "Publishes a small, independently-signed fresh endorsement for the exact repository version"; "The trusted control plane makes the endorsement decision; clients independently verify the complete source"; lookup is "GET https://api.github.com/repos/tinfoilsh/freshness-witness/attestations/sha256:<digest>"; "`MaxFreshnessAge`, currently seven days)"; "There are deliberately no publisher-controlled time fields."; "GitHub auto-disables schedule-triggered workflows after 60 days of repository inactivity" (hence a control-plane trigger). The README contains no "revocation", "revoked", "CRL" or "TCB" text.
- Attestation architecture ([attestation-architecture.md](https://docs.tinfoil.sh/verification/attestation-architecture.md)): "The router only forwards to enclaves it has verified against a fixed model-to-repository mapping."; "verifies the hardware quote (AMD SEV-SNP or Intel TDX) against the vendor's certificate chain"; "The router repeats this check periodically and whenever an enclave's TLS key changes"; the admitted-set endpoint "returns the router's current view of every model it serves" with "the attestation predicate type, TLS key fingerprint, and HPKE public key"; "This endpoint is served from inside the attested router enclave."; "To audit a specific model release independently of the router, verify its repository directly:"; "Token usage is collected inside the confidential model router"; "To enforce usage and rate limits, the router also sends the API key and requested model to the Tinfoil Backend."

Model header and usage metrics ([proxy-server.md](https://docs.tinfoil.sh/guides/proxy-server.md)):

- "Your proxy must forward `X-Tinfoil-Model` unchanged when forwarding requests to the enclave"; the enclave checks it against the body's `model` field; a mismatch returns `400` before inference runs; with no header, no check happens; the check covers OpenAI-compatible JSON endpoints and requires an exact, case-sensitive match (fetch tool paraphrase of the "Enforcing the Model" section).
- "To enable this, add the `X-Tinfoil-Request-Usage-Metrics: true` header when forwarding requests to the enclave."; "Tinfoil returns token counts in the `X-Tinfoil-Usage-Metrics` response header for non-streaming requests" "or as an HTTP trailer after the body completes for streaming requests"; example value "prompt=67,completion=42,total=109,model=gpt-oss-120b,cost_usd=0.000042"; optional fields include cached/uncached prompt tokens, `web_search_calls`, `other_cost_usd`; parse as a map because new fields may appear; figures use published rates before account-specific exemptions.
- "Go verifies the enclave directly, then sends encrypted inference requests through the proxy."; "it does not use the proxy's `/attestation` endpoint"; "Treat `X-Tinfoil-Enclave-Url` as untrusted input and only forward to approved HTTPS Tinfoil enclave origins."; custom request headers such as `X-Request-ID` are for the proxy's own use (auth, logging, rate limits) and may be stripped before forwarding.
- Direct API access ([direct-api-access.md](https://docs.tinfoil.sh/sdk/direct-api-access.md)) documents only plain cURL access and the caveat that it "skips the automatic attestation verification our SDKs perform"; it contains nothing about these headers.

Limits, errors and admin API:

- Pricing ([tinfoil.sh/pricing](https://tinfoil.sh/pricing)): "Spending limits and per-key caps are soft."; "a request only produces a usage record once its response completes."; "Requests that are in flight when the limit is reached finish and are billed,"; "An interrupted stream is billed for the tokens generated up to the interruption;"; "requests the model rejects or that fail before a response starts are not billed."; "If you need a hard ceiling, bound your concurrency and per-request output length."
- Error handling ([error-handling.md](https://docs.tinfoil.sh/sdk/error-handling.md)): quota errors use `insufficient_quota` with `429` for per-key `max_cost`, `max_input_tokens`, `max_output_tokens` caps and `402` for an exhausted account; "Requests still in flight when a limit is reached complete and are billed,". The page contains nothing about model mismatch, disconnects, cancellation, idempotency or request IDs.
- Admin API ([admin-api.md](https://docs.tinfoil.sh/admin/admin-api.md)): keys carry `max_cost`, `max_input_tokens`, `max_output_tokens`, `expires_at`; "The three caps are independent lifetime totals."; "Usage limits are not a reservation system."; `GET /api/billing/requests` "Lists individual inference requests ... newest first, 100 per page."; "The server-side record does not carry a client-supplied identifier"; "`id` is the server-side record identifier; it is not returned on the inference response."; costs are "reported in nanodollars"; a raw CSV export exists, "capped at 100,000 rows." No allowed-model field is documented on keys.
- Tinfoil Proxy CLI ([local-proxy/cli.md](https://docs.tinfoil.sh/local-proxy/cli.md)): a Go binary that "verifies enclave attestations and forwards OpenAI-compatible traffic to a Tinfoil enclave" on a plain-HTTP loopback endpoint; "Proxy versions that use V3 attestation have beta verification while V3 deployment is ongoing." It accepts plaintext OpenAI traffic locally, so it is **not** usable on our ciphertext relay path [D].

## 4. Mitigation A — delegated freshness and revocation through a relay-side Go V3 verifier

Design as stated in the 21 October entry: the relay runs the beta Go V3 verifier against the approved enclave, publishes the verified release digest and the attested key fingerprint to the browser over the authenticated session; the browser keeps verifying independently with 1.2.2 and refuses to send unless both agree; the relay never receives plaintext.

### 4.1 What it establishes against gate 2 (freshness, revocation, rollback, minimum versions)

| Gate 2 element | What A would establish | Label | What it would not establish |
| --- | --- | --- | --- |
| Freshness | At the relay's last verification time, a Sigstore-logged freshness witness no older than seven days existed for the exact pinned digest, and `freshness_expires_at` bounds how long that holds. Staleness is bounded by seven days plus the relay cadence. | [S] mechanism, [D] bound | Real-time liveness of the enclave the browser's bundle describes; the JS verifier still consumes no witness, so the browser's own evidence remains replayable within the window. |
| Revocation | A release whose endorsement the control plane stops renewing fails verification within at most seven days (witness expiry). The JS page's phrasing implies the Go V3 verifier also has a "revocation" check that 1.2.2 lacks. | [S] for the witness; [U] for any separate certificate/CRL revocation | Which revocation sources V3 consults (AMD CRL, NVIDIA, Sigstore, Tinfoil endorsements) is not described on any page read; the 7 October supplier reply named missing "AMD CRL checks" in JavaScript. Treat "revocation" as endorsement withdrawal with up to seven days latency until the supplier documents more. |
| Rollback | Our `releaseDigests` pin already refuses other releases in the browser. A adds relay-side refusal of a pinned release that is no longer witnessed, which the browser cannot do ("does not enforce a maximum release age"). | [V] pin, [S] witness | Tinfoil's own policy accepts any "currently witnessed" release, not only the latest, so rollback to an older still-endorsed release is prevented only by our pin, not by the supplier. |
| Minimum firmware/TCB versions | Nothing new. 1.2.2 already checks "minimum firmware and TCB versions"; the CLI exposes no flag to raise them; the Go `enclave.Options` can pin registers but no page documents a minimum-version policy knob. | [S] | Any independent floor on TCB versions. |
| TDX | The router is SEV-SNP; workers are TDX. The Go verifier could verify a worker repository directly, which the browser cannot (ATC returns 501). | [S], reachability [U] | Whether worker hosts are reachable from the relay, whether their predicate type and digests can be bound to the request path, and whether this is more than an audit of "some admitted worker". Our 4 October probe through ATC received 501. |

Conclusion for gate 2: A converts "no freshness, no withdrawal detection" into "bounded-age, relay-observed freshness and withdrawal detection, plus browser agreement on digest and key". That is a material improvement and the supplier's own suggested interim pattern ("run the CLI as an audit-time check alongside a JavaScript client"), but it is **audit-time delegation**, not browser-enforced per-request verification. Gate 2 asks for established behaviour; A would supply evidence lines and a tested mechanism, and the gate would still need the supplier's V3 to leave beta and a written description of the revocation sources before any `freshnessAndRevocation: pass` entry could be honest.

### 4.2 What "both agree" can compare [U until run]

- Digest: the browser's `releaseDigest` (JS verification document) versus the CLI's "verified deployment artifact `digest`". Whether these are the same quantity must be confirmed by running both against the same host under a permit (attestation only, no inference, no API key); the brief forbade provider requests for this assessment, so it is recorded as unknown.
- Key: the browser's `hpkePublicKey` versus the CLI's "endorsed `crypto_material`" or the Go handle's "verified measurements and keys"; field names and encodings are unknown until run.
- Instance identity: `inference.tinfoil.sh` may be served by more than one router instance and "An enclave reboot can change its connection keys while the workload release stays the same". If the browser's bundle (served by ATC) and the relay's direct verification observe different instances, keys disagree although both are genuine. Agreement must therefore be defined as: digest equal and contained in `releaseDigests`, and the browser's key contained in the set of keys the relay verified within its freshness window; disagreement always fails closed.

### 4.3 Trust added to the relay [D]

- The relay gains a second role: verification oracle. If the browser treats the relay's result only as an additional necessary condition (AND with its own 1.2.2 verification and the qualification pin), a compromised or buggy relay can only cause refusal, never acceptance of a wrong enclave. This monotonic property must be enforced by tests (section 4.6) and must never be weakened into "trust the relay's digest instead of the pin".
- A third-party Go binary executes inside the relay container. Supply-chain trust moves to that binary's build. The verifier needs no API key; it must run with a minimal environment that excludes `TINFOIL_API_KEY`, with `TINFOIL_NO_UPDATE_CHECK=1`, self-update never invoked, and the binary's SHA-256 pinned in deployment configuration and checked at startup.
- New outbound dependencies for availability: `api.github.com` (witness attestations) or Tinfoil's GitHub proxy, the Sigstore TUF CDN, the KDS proxy, ATC and the enclave itself. Unauthenticated GitHub API rate limits on shared Render egress addresses are a plausible outage source [U]. Go honours `HTTPS_PROXY`/`NO_PROXY`, so the managed-proxy setup in `server/network.ts` can be mirrored, but that is to be verified in the container.
- Metadata: the relay already knows the qualified origin and model; A adds nothing the relay can learn about users. The relay's verification log (`-l`) contains host, digest, measurements, key material and timestamps only.

### 4.4 Running a Go verifier in the Render container [D]

- Build: add a `FROM golang:<pinned digest> AS verifier` stage to `Dockerfile.render` that fetches `tinfoilsh/tinfoil-cli` at a pinned commit and builds `tinfoil` with `-trimpath` and `GOFLAGS=-mod=readonly` (module checksums enforced by `go.sum`), then `COPY --from=verifier /out/tinfoil /usr/local/bin/tinfoil` into the runtime stage. A statically linked Go binary runs on `node:24-bookworm-slim` without extra packages. Alternatives: `COPY --from=ghcr.io/tinfoilsh/tinfoil-cli@sha256:<digest>` (trusts the supplier's image build) or downloading a release binary (rejected: the install script uses `curl | sh` and `sudo`, and the repository already pins a third-party binary by image digest plus enforced binary SHA-256 for the ingress test fixture, Caddy 2.11.7 in docs/development-deployment.md, rather than fetching at runtime; that precedent is a test fixture, not yet a production container binary).
- Run: a supervisor in `server/deployment-process.ts` (or a new `server/relay-verifier.ts`) spawns `tinfoil attestation verify -e <qualified host> -r tinfoilsh/confidential-model-router@sha256:<pinned digest> -j -l <path>` on an interval, with a bounded timeout, no retry loop on failure, and parses the JSON log. Only the JSON result is retained in memory; the relay refuses to forward while no current result exists or `freshness_expires_at` has passed. For multi-instance Render deployments the result would also need to be shared (database) or each instance verifies independently.
- Publish: `/api/status` gains `inference.relayVerification = { digest, keyFingerprints, verifiedAt, freshnessExpiresAt, verifier: { name, version, binaryDigest } }`, typed in `shared/contracts.ts`, served only on the authenticated session like the rest of the status block.
- Never run `tinfoil-proxy` on this path: it exposes a plaintext loopback endpoint and would move decryption into our backend.
- Render shape: one container, no sidecar; `USER node` already; the binary needs no privileges; the mTLS loopback application and the Render bridge are unaffected.

### 4.5 Failure modes [D]

1. Benign key disagreement after an enclave reboot or across router instances → refusal until the relay re-verifies; user-visible outage; must never be "fixed" by accepting either side alone.
2. Release rotation (observed 12 October) → both sides fail closed on the pin, as today.
3. Relay result expired or missing (verifier crash, timeout, GitHub rate limit, proxy misconfiguration) → relay refuses to forward; outage, not weakened security.
4. Clock skew: the browser must not evaluate `freshnessExpiresAt` with its own clock alone; publish remaining validity computed by the relay and treat any negative or absent value as refusal.
5. Downgrade bug: a browser build that passes when the relay block is absent (`undefined === undefined`) silently removes the mitigation.
6. Binary drift: a CLI self-update or an unpinned image changes verification semantics while V3 is beta.
7. Host binding: a relay result for one host must not be accepted for another; bind to `X-Tinfoil-Enclave-Url` and the qualified origin.
8. Beta semantics change: V3 output fields or policy may change; parsing must be strict and any unknown status must refuse.

### 4.6 Files that would change and tests required

Files: `Dockerfile.render` (verifier build stage, pinned digests); `server/deployment-config.ts` (binary path, expected binary digest, cadence, enclave host, pinned digest); `server/deployment-process.ts` and new `server/relay-verifier.ts` (spawn, parse, hold, expire); `server/app.ts` (status block; relay admission requires a current result whose digest is in `releaseDigests`); `shared/contracts.ts` (`AppStatus.inference.relayVerification`); `src/App.tsx` (pass the block into `streamReply`); `src/verified-chat.ts` (`VerifiedChatPolicy` and `assertVerification` require agreement); `docs/ARCHITECTURE.md` and the qualification evidence ledger.

Negative tests required before any private-data admission:

- `tests/relay-verifier.test.ts` with a fixture verifier (a Node script standing in for the binary): malformed JSON, non-zero exit, hang past the timeout, status not "verified", `freshness_expires_at` in the past, digest outside `releaseDigests`, binary digest mismatch at startup → in every case `/api/status` reports not ready and the relay returns 503 without forwarding (`upstream` mock never called).
- `tests/production-relay.test.ts`: a valid upstream request is refused while the relay result is absent or expired; the result is bound to the qualified origin.
- Browser-side unit tests with a mocked `tinfoil` module: relay digest ≠ browser digest → refusal; relay key set does not contain the browser's HPKE key → refusal; relay block absent → refusal; relay block valid but browser `verifyBundle` fails → refusal (the oracle must never substitute for the browser's own verification); relay block valid but digest not in `releaseDigests` → refusal; agreement → send.
- `tests/relay-browser.test.ts` extension: real Chromium path shows no plaintext reaches the relay with the new status fields present.
- Attestation-only live runs (no inference, no API key, under a permit) to settle section 4.2 before implementation is judged.

### 4.7 Residual risks and supplier action

Residual: V3 is beta on every supplier page; revocation sources are undocumented; freshness is bounded at seven days rather than real-time; delegation is audit-time, so a request in flight between relay verifications relies on the browser's 1.2.2 evidence as today; a new third-party executable and new egress dependencies enter the relay; worker/GPU binding to a specific request remains unproven (gate 1 unchanged). Supplier action needed: none to prototype (public beta tools), but a written statement of V3 revocation sources and beta exit, and confirmation that ATC bundles and direct verification describe the same instance set, are required before any gate-2 evidence entry.

### 4.8 Recommendation

**Implement after a Tinfoil decision, as an audit-time delegated check, only if Tinfoil remains the provider direction; do not treat it as closing gate 2.** Reasons: it is the supplier's own documented interim pattern; it only adds refusals when built as an AND condition; it adds the only freshness and endorsement-withdrawal signal available to a browser client today; but it depends on beta tooling, undocumented revocation semantics and empirical confirmation of what the two verifiers compare. Sequence: pinned-binary build, attestation-only runs, negative tests, then owner review. If the decision moves to Privatemode, A is moot.

## 5. Mitigation B — relay-enforced model allowlist via `X-Tinfoil-Model` plus a per-user concurrency bound

### 5.1 What it does

- The relay cannot see `model` inside the encrypted body [V]. The supplier's enclave compares a clear-text `X-Tinfoil-Model` header with the encrypted body's `model` and returns `400` before inference on mismatch; with no header, no check happens [S]. The relay would therefore **set** the header itself to the qualified `model` on every forwarded request (never trusting a client-supplied value), which turns the qualification report's single model into a supplier-enforced ceiling without plaintext. A malicious client that encrypts a different model gets a 400 that our relay reports as 502, and "requests the model rejects or that fail before a response starts are not billed" [S].
- Per-user concurrency: today's `active` counter is process-wide (three). A per-account bound of one in-flight request (the browser already sends sequentially; the continuation is a second, separately approved request) stops one account from occupying all three slots and is half of the supplier's advice "bound your concurrency and per-request output length".
- Optional companion [D]: cap the raw body at a size derived from `maxInputCharacters` instead of the generic 1 MB, since EHBP ciphertext length tracks plaintext length plus small per-chunk overhead; this bounds input tokens per request at the relay without plaintext and must be set with margin and tested against real EHBP output.

### 5.2 What it does not do

- Output length: `max_completion_tokens` is encrypted; the relay cannot enforce it. The second half of the supplier's hard-ceiling advice is only available as the browser's own setting (not trustworthy against a malicious client) and as provider-side per-key lifetime caps (`max_output_tokens`, `max_cost`), which are soft [S]. The practical per-request bound is the relay's 90 s deadline times the model's generation rate, and interrupted streams are billed for generated tokens [S].
- It does not change any privacy property; the relay already knows the qualified model, and the header carries no user data.
- Multi-process correctness: an in-memory per-account map is per process. A shared bound would use the ledger's `pending` count, which introduces a new failure mode: rows left `dispatched` by a crashed process never finish (no automatic refunds), so a per-account pending bound would block that account until the period rotates unless pending rows older than the deadline are excluded from the concurrency count while still counting toward the allowance.

### 5.3 Files, tests, residual risks, supplier action

Files: `server/app.ts` (header set from `q.model`; per-account in-flight map keyed by `res.locals.accountId`; optional body cap); if the shared variant is chosen, `server/usage-contract.ts`, `server/usage-ledger.ts`, `server/usage-postgres.ts` (reserve refuses when live pending ≥ bound); `shared/contracts.ts` only if a `maxRequestBytes` field is added to the qualification schema; docs.

Tests: `tests/production-relay.test.ts` — upstream mock asserts `X-Tinfoil-Model` equals the qualified model on every call and that a client-supplied different header is overwritten, not forwarded; an upstream `400` yields 502 with no body reflection and a ledger outcome of `uncertain` (or a new explicit `rejected_before_inference` outcome if the owner wants that distinction; it must not refund automatically); `tests/account-usage-http.test.ts` — two accounts: the second in-flight request of one account gets 429 while the other account is admitted; slots release on completion, failure and disconnect; the global three-slot bound still holds; `tests/usage-ledger.test.ts`/`tests/usage-postgres.test.ts` — if ledger-based, crashed `dispatched` rows do not block forever. Audit task, not a test: inspect the pinned router release source for the header comparison before relying on it (the check is supplier-enforced inside the measured router workload [S]).

Residual: the enclave check is a supplier statement until exercised; "exact, case-sensitive match" means any model rename in the catalog (churn is documented) fails closed, which is the desired direction; output-length and total-cost ceilings remain provider-soft. Supplier action: none.

### 5.4 Recommendation

**Implement after a Tinfoil decision.** Reasons: smallest change, no new trust, no plaintext, supplier-documented, directly answers the "malicious encrypted client chooses an expensive model" risk in question 3 of the outreach, and the per-account bound is needed regardless of provider. It does not close gate 4 because output length and monetary ceilings stay soft.

## 6. Mitigation C — settlement from the usage header or trailer

### 6.1 Proof-of-concept result [V]

A loopback Node 24.22.0 server emitted a chunked response with `Trailer: X-Tinfoil-Usage-Metrics` and a synthetic value. Results: WHATWG `fetch` from the repository's pinned `undici` 8.11.2 (the API `server/app.ts` uses) exposes **no trailer accessor at all** on the `Response`; `undici.request` exposes `trailers` as an empty object before the body is consumed and populated only after the body ends; a server that dies mid-stream yields `UND_ERR_SOCKET` and empty trailers; a client abort yields an abort error and empty trailers; `node:http` exposes `res.trailers` only at the `end` event. So C requires replacing `fetch` with `undici.request` (or `node:http`) in the relay, and the trailer is available exactly once, after the stream ends normally, never for interrupted streams.

### 6.2 What the relay can reconcile per request ID [D from S and V]

| Outcome | Trailer or header present? | Ledger today | With C | Reconcilable against the provider per request? |
| --- | --- | --- | --- | --- |
| Streamed reply completes normally | Yes, trailer after body end | `transport_complete` | `transport_complete` plus parsed `prompt`, `completion`, `total`, `model`, `cost_usd` at published rates | Only by our own record; the provider record "does not carry a client-supplied identifier" and its `id` "is not returned on the inference response" [S]. |
| Non-streaming reply (not used by our browser) | Yes, response header | same | same | same |
| Reply completes but trailer missing or malformed | No | `transport_complete` | must become an explicit "completed, unmetered" record, not silently equal to metered | No |
| Client disconnect or cancel (relay aborts upstream) | No | `uncertain` | `uncertain`, cost unknown; the provider bills generated tokens [S] | No per-request key; only aggregate per API key per time window through the admin API |
| 90 s relay deadline | No | `uncertain` | `uncertain` | No |
| Upstream error or missing nonce before body | No | `uncertain` (never dispatched to a reply) | `uncertain`; provider says pre-response failures are not billed [S] | No |
| Settlement write fails | n/a | reservation stays counted | same | n/a |

Keeping the upstream open after a client disconnect merely to collect the trailer would let generation continue and be billed; it contradicts cancellation semantics and is rejected.

### 6.3 Comparison with the existing reserve/dispatch/finish flow

The current flow is authoritative for admission and counts requests, not money; it is conservative (no refunds, uncertain stays counted). C does not replace it: the trailer arrives too late to influence admission and never arrives for the failure cases that matter most for cost. C adds a metering record to completed requests and nothing to the others. Monetary allowances derived from `cost_usd` would therefore under-count exactly the interrupted requests that the supplier says are billed, so request counts must remain the admission unit until aggregate reconciliation against the provider's billing (`GET /api/billing/requests`, transactions, invoices) shows how large the unmetered share is. `cost_usd` is at published rates "before account-specific exemptions", so it is an estimate of the charge, not the invoice.

### 6.4 Trust and privacy boundary [D]

- The metrics are produced inside the router enclave [S] but reach the relay over ordinary WebPKI TLS to the hostname; the relay does not pin the attested key. They are supplier-reported values with transport integrity, not attested evidence. Relay-side TLS pinning to the fingerprint verified under A would upgrade that; this is a dependency between A and C, not a requirement.
- The relay would, for the first time, learn per-request token counts and the model per account. That is new metadata at our backend; it must be recorded in the privacy copy and `docs/backup-retention-policy.md` and approved by the owner before any user sees the product. The trailer should not be forwarded to the browser: the browser already receives usage inside the decrypted stream (`stream_options.include_usage`).

### 6.5 Files, tests, residual risks, supplier action

Files: `server/app.ts` (`undici.request` with the existing dispatcher and abort signal; `X-Tinfoil-Request-Usage-Metrics: true`; strict map parser; `finish` with metrics after `res.end()`); `server/usage-contract.ts` (metrics schema; `finish` signature); `server/usage-ledger.ts`, `server/usage-postgres.ts`, new `server/migrations/0005-usage-metrics.sql` (nullable columns: prompt, completion, total, model, cost in nanodollars, metered-at); `shared/contracts.ts` (`RequestAllowance` metered totals, optional); `docs/backup-retention-policy.md`, privacy copy, `docs/ARCHITECTURE.md`.

Tests: `tests/production-relay.test.ts` — upstream mock asserts the request header; trailer present → metrics persisted with `transport_complete`; trailer malformed, unknown keys, duplicate keys, oversized value → metrics rejected, outcome recorded as completed-unmetered; non-streaming header path; truncated upstream and client cancel → `uncertain` with no metrics (extend the existing stalled-upstream test); the browser response carries no usage header or trailer; metrics are never written before the response finished. `tests/usage-ledger.test.ts`/`tests/usage-postgres.test.ts` — SQLite and Postgres parity, idempotent re-finish with identical metrics, rejection of metrics on a non-dispatched row. `tests/relay-browser.test.ts` — unchanged plaintext boundary with the new upstream API.

Residual: no per-request join to provider records after interruptions; metrics are unauthenticated beyond TLS; the boundary change adds metadata at our backend; the duplicate-request question is unchanged (our relay never retries, the browser's explicit retry is a new request and a new charge). Supplier action: none for metering; **yes** for settlement after disconnects — a client-supplied request or idempotency identifier recorded on usage records, or an authenticated per-request usage lookup. Add that to the existing consolidated question queue rather than a new email.

### 6.6 Recommendation

**Implement after a Tinfoil decision, narrowed to metering of completed requests; reject the "settlement" framing for disconnects, cancellations and uncertain outcomes.** Reasons: it is the only way to obtain enclave-reported token counts at the relay without plaintext and it feeds gate 4's charge reconciliation; but it cannot reconcile the interrupted requests the supplier bills, it requires swapping the relay's HTTP API, and it changes the metadata boundary, which needs owner approval. The request-count ledger remains the admission unit.

## 7. Mitigations against the five gates in "What prevents enabling private-user inference"

| Gate (provider-qualification.md) | A — delegated freshness/revocation | B — model header + per-user concurrency | C — usage trailer metering |
| --- | --- | --- | --- |
| 1. Full verified router/CPU/GPU/worker path and release bindings | Partial, audit-level: the Go verifier could verify a worker repository and read the admitted set from inside the attested router; no binding of a specific request to a specific worker. | None. | None. |
| 2. Freshness/revocation/rollback and minimum firmware/TCB behaviour | Partial: bounded-age freshness and endorsement withdrawal observed at the relay with browser agreement; revocation sources undocumented; minimum-version policy unchanged; audit-time, beta. Gate stays closed. | None. | None. |
| 3. Retention, cache, moderation, metadata and egress boundaries | Neutral; adds relay egress to GitHub/Sigstore/KDS/ATC. | Neutral. | Negative unless documented: the relay newly holds per-request token counts and model per account. |
| 4. Beyond scoped compatibility evidence; reconcile actual charges | None. | Partial: supplier-enforced model ceiling; per-account concurrency; optional input-size bound. Output length and monetary ceilings remain soft. | Partial: completed requests metered at published rates; interrupted requests remain unreconcilable per request; aggregate reconciliation still needs the admin API or invoices. |
| 5. Honest linked evidence only when gates pass; never set `pass` to unlock | Produces evidence lines for `freshnessAndRevocation` and `negativeTests` only after live attestation-only runs; no pass. | Produces evidence lines for `usageAndBudget`; no pass. | Produces evidence lines for `usageAndBudget`; no pass. |

No combination of the three closes any gate. Gate 3 is entirely contractual/supplier evidence; gate 1 needs worker binding evidence that none of these provides.

## 8. Recommendations summary

1. **B — implement after a Tinfoil decision** (first; smallest, no new trust, supplier-documented, provider-independent value in the per-account bound).
2. **C — implement after a Tinfoil decision, as metering of completed requests only**; keep `uncertain` semantics; owner approval for the metadata boundary; add the per-request identifier question to the supplier queue.
3. **A — implement after a Tinfoil decision, as an audit-time delegated check with the AND rule and negative tests, only if Tinfoil remains the direction**; explicitly not a gate-2 pass while V3 is beta and revocation sources are undocumented.

Nothing is to be built before 23 October; the Render candidate's composition refuses inference credentials today and must stay that way until the owner decides.

## 9. Open points carried into the supplier queue (no new email requested)

- What exactly the Go V3 "revocation" check consults, and V3 beta exit.
- Whether the ATC bundle and direct verification observe the same router instances and keys.
- Whether a client-supplied identifier can be recorded on usage records, or an authenticated per-request usage lookup exists, for interrupted requests.
- Whether per-key `max_output_tokens` or any allowed-model restriction can be set per key as a provider-side, non-soft bound.

## 10. Sources read on 21 October 2026

- https://docs.tinfoil.sh/guides/proxy-server.md
- https://docs.tinfoil.sh/sdk/javascript-sdk.md
- https://docs.tinfoil.sh/sdk/go-sdk.md
- https://docs.tinfoil.sh/verification/verification-in-tinfoil.md
- https://docs.tinfoil.sh/resources/feature-status.md
- https://docs.tinfoil.sh/sdk/direct-api-access.md
- https://docs.tinfoil.sh/sdk/error-handling.md
- https://docs.tinfoil.sh/sdk/cli-sdk.md
- https://docs.tinfoil.sh/local-proxy/cli.md
- https://docs.tinfoil.sh/verification/attestation-architecture.md
- https://docs.tinfoil.sh/resources/ehbp.md
- https://docs.tinfoil.sh/admin/admin-api.md
- https://tinfoil.sh/pricing
- https://github.com/tinfoilsh/freshness-witness
- https://github.com/tinfoilsh/tinfoil-go and https://raw.githubusercontent.com/tinfoilsh/tinfoil-go/main/enclave/README.md
- https://docs.tinfoil.sh/llms.txt (index; no page on freshness, revocation, usage metrics or pricing exists under docs.tinfoil.sh)
- Repository files listed in section 1; proof-of-concept run outside the repository on 21 October (loopback only, synthetic values).
