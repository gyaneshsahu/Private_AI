# 2026-10-22 — Relay attestation audit (mitigation A, narrowed to block-only)

Ledger fragment for the qualification evidence ledger. Labels: [V] verified by this track, [O] owner-reported or supplier-stated, [D] design decision, [U] unknown until run. Gates stay closed; nothing here is a `freshnessAndRevocation: pass` entry.

## What was built

A relay-side, **partial, block-only** attestation audit, implemented on branch `worktree-agent-a78629d04463947fc` from `codex/development-handoff` commit `7ce181a`, following section 4 of `docs/relay-mitigation-assessment-20261021.md` narrowed as follows: the relay does not publish anything to the browser and the browser compares nothing. The relay runs the supplier's pinned CLI on a timer and can only **refuse** to forward.

Plain statement of scope [D]:

- The relay can only refuse requests. It never supplies, replaces or validates the key the browser uses. The browser's maintained `tinfoil` npm verifier 1.2.2 remains the only source of the encryption key, and every request still requires the browser's own verification exactly as before.
- It guards against stale or revoked supplier evidence (a freshness witness that is no longer renewed, an endorsement the supplier has withdrawn, a release that is no longer witnessed) and against a supplier release the browser would otherwise still accept because 1.2.2 consumes no freshness witness and enforces no maximum release age.
- It does **not** guard against a malicious operator. The operator controls the relay, the binary, the configuration and the timer; a compromised relay can at most cause refusal of a correct enclave, never acceptance of a wrong one, because the browser's verification is unchanged and remains an independent necessary condition.
- The CLI's V3 checks are **beta** on every supplier page read ("CLI commands that use V3 attestation to verify enclave connections are beta while deployment is ongoing"; "Features that depend on V3, including workload release pinning and freshness checks, share that status"). Revocation sources consulted by V3 are not documented by the supplier; "revocation" here means endorsement withdrawal observed through witness expiry.
- Freshness is bounded by the audit cadence plus the seven-day witness: a withdrawn or stale release is refused at the latest at (cadence interval) + (remaining witness validity, at most seven days). With the default six-hour cadence that is up to seven days six hours. The supplier's own page says to "use an SDK's connection-time verification for real-time guarantees"; the audit is not that.

## Pinned supplier CLI [V]

| Item | Value |
| --- | --- |
| Project | `tinfoilsh/tinfoil-cli` (GitHub) |
| Release | `v0.19.10`, published 2026-10-22T01:13:49Z (latest at the time of pinning; releases v0.19.6 to v0.19.10 were cut between 15 and 22 October) |
| Asset | `tinfoil-cli_0.19.10_linux_amd64.tar.gz` (11,335,788 bytes; contains `LICENSE`, `README.md`, `tinfoil`) |
| URL | `https://github.com/tinfoilsh/tinfoil-cli/releases/download/v0.19.10/tinfoil-cli_0.19.10_linux_amd64.tar.gz` |
| SHA-256 (from the release's `tinfoil-cli_0.19.10_checksums.txt`) | `331c9598792289909757335044751344e1933a1c67f4640d40831dfb00746704` |
| SHA-256 recomputed locally on the downloaded asset | `331c9598792289909757335044751344e1933a1c67f4640d40831dfb00746704` (match) |
| Source commit named by the tag | `0186df0a07cce6d415eafe2c722c192cfe60dd67` |
| Build | goreleaser v2, `CGO_ENABLED=0`, `-s -w -X main.version=0.19.10` (`.goreleaser.yaml` at the tag) |

Attestation [V]: the release carries a GitHub artifact attestation (Sigstore bundle v0.3, SLSA v1 provenance). Verified on 2026-10-22 with `gh attestation verify tinfoil-cli_0.19.10_linux_amd64.tar.gz --repo tinfoilsh/tinfoil-cli` (gh 2.102.0), exit 0. The provenance names workflow `.github/workflows/release.yml` at `refs/tags/v0.19.10` in `https://github.com/tinfoilsh/tinfoil-cli`, resolved dependency `git+https://github.com/tinfoilsh/tinfoil-cli@refs/tags/v0.19.10` at commit `0186df0a07cce6d415eafe2c722c192cfe60dd67`, run `https://github.com/tinfoilsh/tinfoil-cli/actions/runs/39703939337/attempts/1`, Rekor log index 3370606982. The subject list contains the linux_amd64 asset with the SHA-256 above, so the checksum constant in the Dockerfile and the attested subject are the same digest.

Why the attestation is verified outside the build rather than inside it [D]: in-image verification would need a second pinned third-party binary (`gh` or `cosign`) plus the Sigstore trust root, moving the same trust question one step back. The build therefore enforces the SHA-256 constant (BuildKit `ADD --checksum` before the layer exists, and `sha256sum -c` again inside the stage), and this ledger records the attestation check that binds that constant to the supplier's release workflow. Re-run `gh attestation verify` whenever the pin changes.

Container shape [V by build]: new stage `tinfoil-verifier` in `Dockerfile.render` (and identically in `Dockerfile`, which the existing `tests/render-packaging.test.ts` requires to stay aligned) on the same pinned `node:24-bookworm-slim` digest as the build stage; it downloads the pinned asset, checks the checksum twice, extracts only `tinfoil`, installs it `0555 root:root` and asserts `tinfoil --version` prints `tinfoil version 0.19.10`. The `deployment-candidate` stage (inherited by `render-candidate`) copies only `/out/tinfoil` to `/usr/local/bin/tinfoil` with `--chmod=0555` and sets `ENV TINFOIL_NO_UPDATE_CHECK=1`. The runtime user is `node`, so the binary cannot be modified or self-updated at runtime; the relay never invokes `tinfoil update`; the passive update check is disabled by the variable and would in any case not run without a terminal on stderr (`update.go`). Nothing else from the verifier stage reaches the runtime image. The optional `proxy_ca` build secret does not apply to the `ADD` fetch (BuildKit performs it outside the stage); a managed build proxy that intercepts GitHub would fail the checksum, which is the intended outcome.

## Code [V by unit tests]

- `server/attestation-audit.ts`: `runAttestationAudit({ binary, target: { origin, repository, releaseDigests }, timeoutMs })` spawns `tinfoil attestation verify -e <host> -r tinfoilsh/<repo>[@sha256:<digest>] -j` (the digest is pinned on the command line when the qualification names exactly one; otherwise containment is checked), `shell: false`, stdin ignored, stderr discarded, stdout capped at 64 KiB, environment limited to `TINFOIL_NO_UPDATE_CHECK=1`, `PATH`, `HOME`, the proxy/CA variables mirrored from `server/network.ts`, and (Windows test double only) `SystemRoot`/`TEMP`. No API key or other secret is ever passed. It parses only the exit code and the documented JSON record fields `status`, `enclave`, `digest`, `keys.enclave`, `keys.connection`, `freshness_expires_at` (field names confirmed against `attestation.go` at the tag) and returns `{ ok, checkedAt, releaseDigest?, keyFingerprint?, freshnessExpiresAt?, reason? }`. It never throws: invalid options, spawn failure, timeout, non-zero exit, malformed or oversized output, host mismatch, digest outside `releaseDigests`, missing or past `freshness_expires_at`, and endorsed-vs-connection key disagreement all yield `ok: false` with a fixed reason. `attestationAuditGuard(state?)` is the Express middleware factory; `createDeploymentAttestationAudit(config)` builds the state from deployment configuration.
- `server/attestation-audit-state.ts`: in-memory state refreshed by an unref'd timer; defaults interval 360 minutes, maximum age 1440 minutes, timeout 120 seconds, binary `/usr/local/bin/tinfoil`. `shouldBlock()` is `{ block: true }` only when auditing is enabled AND (the last audit failed, or no audit has ever succeeded, or the last success is older than the maximum age, or the last success's witnessed `freshness_expires_at` has passed). Disabled state never blocks. A process-wide state is installed by the deployment entrypoint and is disabled until then, so local development and the existing test suites are unaffected.
- `server/deployment-config.ts`: optional `attestationAudit` block `{ enabled, origin, repository, releaseDigests[1..4], binary?, intervalMinutes? (15..1440), maxAgeMinutes? (15..10080, >= interval), timeoutSeconds? (5..300) }`, strict, defaults applied on load. The restricted deployment carries no qualification report today, so the audit target is named here with the same validation rules as `shared/contracts.ts`.
- `server/deployment-process.ts`: when the block is present, creates the state, installs it process-wide, starts the timer and first audit without delaying `listen` (the guard refuses until the first success), and stops the timer on shutdown.
- `tests/attestation-audit.test.ts` (15 tests) with `tests/fixtures/fake-tinfoil-cli.mjs` standing in for the binary: pass, pinned-digest pass, non-zero exit with and without a record, timeout, malformed and oversized output, expired witness, unqualified digest, host mismatch, key mismatch, missing binary and invalid options, disabled state, blocking before first success / after failure / past maximum age / after witness expiry, throwing runner, shared in-flight run, timer refresh, guard 503 body and pass-through, process-wide installation, fail-closed guard, deployment-config acceptance and rejections, and the Dockerfile pin (version `0.19.10`, 64-hex checksum, `ADD --checksum`, `sha256sum -c`, single read-only `COPY --from=tinfoil-verifier`, `TINFOIL_NO_UPDATE_CHECK=1`, pinned base digest, no installer script or `tinfoil update` instruction). The fixture exits non-zero if an API key is present in its environment or `TINFOIL_NO_UPDATE_CHECK` is missing, so the environment discipline is tested, not asserted.

## Wiring for the main track (not done here; `server/app.ts` untouched)

Add exactly one line in `server/app.ts` before the relay route `app.post("/api/inference/v1/chat/completions", ...)`:

```ts
app.use("/api/inference", attestationAuditGuard());
```

with `import { attestationAuditGuard } from "./attestation-audit";`. While `shouldBlock()` is true the guard answers `503 {"error":"Protected inference is temporarily unavailable. No request was forwarded."}` with `Cache-Control: no-store`; the body never names the reason. All other routes, including `/api/status`, are untouched. Without a deployment `attestationAudit` block the guard is a pass-through.

Deployment: add to the render config file (`/etc/secrets/render-config.json`) a block such as `"attestationAudit": { "enabled": true, "origin": "https://<qualified host>/", "repository": "tinfoilsh/<qualified repo>", "releaseDigests": ["<pinned digest>"] }`. The first audit starts with the server; until it succeeds, and after any failure, the relay refuses. A failed audit never stops the process.

## Not verified / open [U]

- No attestation-only run against a real enclave was made (the brief forbids inference requests and any API key; the audit needs neither, but a live run was outside this track). Therefore: whether the CLI's `digest` is the same quantity as the browser's `releaseDigest` and the qualified `releaseDigests` pin remains [U] (section 4.2 of the assessment); whether the relay's egress (GitHub API for witnesses, Sigstore TUF CDN, KDS proxy, the enclave on :443) is reachable from the Render container and survives unauthenticated GitHub rate limits remains [U].
- The Docker image was built locally with `docker build --target render-candidate -t privateai-render-audit:worktree` to prove the stage downloads, checks and installs the binary; the binary was not executed against any host beyond `tinfoil --version`.
- The restricted deployment currently has no qualification or API key wired (`server/deployment-process.ts` advertises "inference disabled"), so until the main track wires both, the audit refuses requests that would have been refused anyway.
- Exit codes: the CLI exits 1 for every error including transient network failures, so a transient failure blocks until the next successful audit; this is the "outage, not weakened security" posture of section 4.5 and is deliberate.
- Multi-instance deployments audit independently per instance; no shared state.
