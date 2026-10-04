# Router/worker chain review — 4 October 2026

**Source evidence, not live qualification.** Public source was read without
running the provider's code. No model request or credential was used. Router
`v0.0.155` resolves to commit `4b4957b77ed0517d872202d2c1b9bee9e072b341`.
The earlier verified router digest remains
`ad95d02b2e27b3c1d5c327f2ee9616634f841e4b2ed5a48f404e4e9f595a4876`.
This review has not independently bound that digest to this tag's build and
all its runtime configuration. Do not equate a tag, container digest and
attested release digest.

A fresh unauthenticated GET of `https://atc.tinfoil.sh/inventory` succeeded in
this batch. It lists router version 0.0.155 and maps `gpt-oss-120b` to
`tinfoilsh/confidential-gpt-oss-120b`, with three worker hosts. This is public
inventory, not proof which worker handled the user's earlier requests.

## Findings at the pinned router source

All links below use the immutable router commit.

| Component | Observed behavior | Consequence / remaining evidence |
| --- | --- | --- |
| [Worker admission](https://github.com/tinfoilsh/confidential-model-router/blob/4b4957b77ed0517d872202d2c1b9bee9e072b341/manager/manager.go) | `addEnclave` verifies remote attestation, applies hardware-measurement checks for TDX Guest V2, requires a source measurement, compares measurements and records the attested TLS public-key fingerprint. | This supports a protected-hop design. Need the selected worker's actual attestation, GPU/TCB policy and release/build binding. |
| [Plain model proxy](https://github.com/tinfoilsh/confidential-model-router/blob/4b4957b77ed0517d872202d2c1b9bee9e072b341/manager/proxy.go) | `newProxy` installs `TLSBoundRoundTripper` using the recorded public-key fingerprint. | Router-to-worker protection is TLS pinned to verified identity, not simply ordinary HTTPS. This is reviewed source, not a captured live worker path. |
| [Worker updates](https://github.com/tinfoilsh/confidential-model-router/blob/4b4957b77ed0517d872202d2c1b9bee9e072b341/manager/manager.go) | `updateModelMeasurements` follows the latest repository tag, fetches its digest, verifies its Sigstore bundle and clears old worker entries when measurement changes. `sync` refuses a model repository change without a router release. Runtime host/settings refresh uses HTTPS configuration without requiring a configuration digest. | A browser-pinned router can admit newer signed worker releases within its configured repository. **Browser pinning of the router is not browser approval of each worker build.** Document delegated release trust, verify its controls, and identify the actual worker release before supporting the full claim. |
| [Moderation eligibility](https://github.com/tinfoilsh/confidential-model-router/blob/4b4957b77ed0517d872202d2c1b9bee9e072b341/manager/delegated_auth.go) and [capture](https://github.com/tinfoilsh/confidential-model-router/blob/4b4957b77ed0517d872202d2c1b9bee9e072b341/safeguards/capture.go) | Classifier requires a three-part token with `typ=at+jwt`, `client_id=tinfoil-chat`, `product=chat`. Ineligible tokens bypass capture. The classifier inspects token structure/claims; it is not itself a signature validator. | Source supports the documented API-key/first-party-chat distinction. Actual credential classification and deployed code still need binding. No API key was read to test its shape. This does not prove the absence of every other content capture path. |
| [Tools](https://github.com/tinfoilsh/confidential-model-router/blob/4b4957b77ed0517d872202d2c1b9bee9e072b341/toolruntime/profile.go) and [auto-continue](https://github.com/tinfoilsh/confidential-model-router/blob/4b4957b77ed0517d872202d2c1b9bee9e072b341/toolruntime/auto_continue.go) | Chat tool profiles depend on explicit options; auto-continue depends on tool definitions. PrivateAI sends neither. | Source supports plain model dispatch for our request shape. Router egress is open, so this is a software-policy boundary, not hardware-enforced lack of egress. |
| [Billing](https://github.com/tinfoilsh/confidential-model-router/blob/4b4957b77ed0517d872202d2c1b9bee9e072b341/billing/events.go) | Usage reports send account credential, request ID, token counts and model/route/worker/streaming attributes to the control plane. The local billing log masks the credential but includes usage metadata. The reviewed event structure has no prompt/answer fields. | Provider control plane sees identity and usage metadata. This is not anonymity or proof that all logs are content-free. Retention and other logging paths remain to be reviewed. |
| [Local test harness](https://github.com/tinfoilsh/confidential-model-router/blob/4b4957b77ed0517d872202d2c1b9bee9e072b341/manager/localharness.go) | A test helper uses `InsecureSkipVerify` but is build-tagged `localharness`. | Do not report this as an observed production bypass. Release build flags and debug overrides remain part of deployment review. |

## Worker source observation

The worker repository was read at commit
[`ac69e7ae6e827dd4ab08bd743adda68deabc8b0b`](https://github.com/tinfoilsh/confidential-gpt-oss-120b/tree/ac69e7ae6e827dd4ab08bd743adda68deabc8b0b).
Its config names one GPU, vLLM serving, a specific model revision, tmpfs mounts,
and network allowlisting for NVIDIA and model-download hosts. Its container
image digest is an all-zero placeholder at that source commit. **It is not a
usable deployed-release manifest.** Obtain the actual measured release artifact,
container build/dependencies, GPU verification policy and cache/log behavior;
do not fill those gaps using the README's confidentiality description.

## Next qualification evidence, not more generic chat tests

1. Bind the verified router digest to release configuration/build; establish the
   actual admitted model-worker release and GPU/firmware verification policy.
2. Establish replay/freshness, revocation and rollback handling for the router
   and admitted worker. Repeating verification is not itself replay resistance.
3. Corroborate API-content retention, cache lifetime, credential classification,
   subprocessors and egress behavior against deployed settings and current terms.
4. Reconcile actual charged cost and reasoning/cache billing against reported
   tokens. A rounded dashboard screenshot is not an exact invoice.

Provider evidence requests can be prepared from this list. No message was sent
to the provider. A single live compatibility request can validate our revised
adapter's transport, but cannot close these security gates.

## Additional live public-metadata check

At `2026-10-04T20:03:41.658Z`, the fixed `--worker` mode of
`scripts/probe-provider.mjs` requested the public bundle for
`gpt-oss-120b-inf12-0.tinfoil.containers.tinfoil.dev` and repository
`tinfoilsh/confidential-gpt-oss-120b` through ATC `/attestation`. ATC returned
HTTP 501 and the probe failed before worker verification. No inference, API key
or direct worker request was used. The unchanged request was not retried. This
is an unsupported/failed lookup observation, not proof that the worker is
unprotected or evidence of a passing GPU attestation. A supported worker-evidence
path is still needed; do not substitute the inventory or source config for it.
