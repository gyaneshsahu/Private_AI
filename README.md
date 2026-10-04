# PrivateAI

A local web evaluation of private personal assistance. **The web chat inference path is implemented.** A two-turn synthetic WSL conversation succeeded on the earlier adapter; the revised streaming adapter is locally tested and awaits its small live compatibility check. Full provider qualification and production readiness remain incomplete.

Review the [product requirements](docs/PRD.md) and [architecture and trust boundaries](docs/ARCHITECTURE.md) before continuing development. Both are consolidated review drafts; the [acceptance contract](docs/acceptance.md) defines the evidence gates.

Use the [Git-based WSL workflow](docs/git-workflow.md) for source updates and the [local experiment guide](docs/local-experiment.md) to review existing evidence. The original two-turn test is complete. The [one-request compatibility check](docs/live-compatibility.md) is prepared but needs confirmation of added scope within the existing USD 2 total cap. No command creates provider qualification.

## Run

Requires Node 24 (tested with 24.19.0) and npm. From this repository:

```sh
npm ci
npm run build
npm start
```

The server binds only to `127.0.0.1`, port 4173 by default. Use `PORT` to change it. `npm run dev` runs the same gateway with Vite middleware; run `npm run assets` first. Environment variables are read from the process, not automatically from `.env` files. See `.env.example` for supported names.

Real local functionality includes text-PDF extraction, printed-English screenshot OCR, text correction, context selection, exact decimal calculations and encrypted browser snapshots. All parser/OCR assets come from lockfile-installed dependencies and are served locally. No OCR CDN is contacted. Temporary conversations are memory-only at the application layer.

The wired production chat path remains intentionally disabled until provider qualification passes and access is supplied. The UI never substitutes canned responses. Search requires separate service access. Public-page retrieval works without a search key, after explicit disclosure approval, within the environment's network restrictions.

When `HTTPS_PROXY`/`HTTP_PROXY` is present, set `PRIVATEAI_PUBLIC_FETCH_HOSTS` to a comma-separated list of **operator-reviewed public hosts**, for example `raw.githubusercontent.com` for documentation testing. No arbitrary proxy destinations are accepted. A proxy resolves DNS remotely, so this mode cannot use local DNS pinning; broadening this list to attacker-controlled or private hosts would invalidate the boundary. Without a proxy, the fetcher validates all DNS results and pins the chosen addresses in the TLS connector. Both paths refuse redirects and private URL forms, do not execute scripts, and limit response size and time.

## Validation

```sh
npm run check
npm run test:e2e
npm run eval:check
```

Browser checks use system Chromium when present, or `CHROMIUM_PATH`; otherwise install the browser using the supported Playwright installation instructions in your environment. Browser tests use synthetic local files and do not call inference/search services. They do not establish confidential inference, anonymity or model answer quality.

The fixture check verifies frozen dataset integrity only: **24 development + 24 reserved cases, no model runs**. See [acceptance criteria](docs/acceptance.md) and [evaluation instructions](evaluation/README.md). Do not count repeated conversations as distinct coverage.

## Architecture

- `src/App.tsx`: responsive workspace and explicit conversation lifecycle.
- `src/conversation.ts`: context composition and edited-message branches.
- `src/extraction.worker.ts`: bounded PDF/text/OCR processing off the UI thread.
- `src/vault.ts`: WebCrypto encrypted IndexedDB snapshots; keys remain in memory when unlocked.
- `src/inference.ts`: candidate browser attestation, approved-release checks, maintained EHBP encryption and streaming. No implicit retry or unprotected fallback.
- `server/app.ts`: loopback session/CSRF boundary, opaque inference gateway and scoped research grants.
- `server/research.ts`: permission-bound, limited search/page retrieval.
- `shared/contracts.ts`: typed contracts and strict provider-qualification schema.

Provider secrets stay on the server. Only user-approved queries/URLs enter the research service. Model output is rendered as text; references open local source views, never automatic remote resources. Each assistant answer keeps its source snapshot so later source edits do not rewrite the evidence behind an older answer.

The vault uses standard WebCrypto PBKDF2-SHA256 (600,000 iterations) and AES-256-GCM, randomized salts/nonces, authenticated record identities, and a separate encrypted data key per saved conversation. PBKDF2 was chosen for native browser support; this is not a claim of independent cryptographic review. Use a strong passphrase. There is no password recovery, sync or automatic saving. Auto-lock occurs after 15 minutes without keyboard/pointer activity. Deletion retains an opaque random-ID marker to prevent stale tabs from recreating the deleted record; it retains no content or key. Application deletion cannot guarantee forensic erasure from storage/backups.

## Current gates

Read the current [qualification ledger](docs/provider-qualification.md), [router/worker chain review](docs/provider-chain-review.md) and [validation evidence](docs/validation.md). Stage A remains blocked by the incomplete full-path evidence, even though the earlier synthetic live exchange worked. A hand-written report claiming `pass` is not qualification.

For a non-billable router-attestation check, run `node scripts/probe-provider.mjs`. It uses public deployment metadata only and never sends inference content or credentials. Success verifies the returned bundle with the installed Node SDK; it does not approve that release, qualify the full provider or test browser encryption. See the [source review](docs/provider-source-review.md).

This version has no public-account authentication, billing system or anonymous access. Do not expose its loopback gateway through a public tunnel. A malicious client update or compromised device can capture content before encryption. Current browser coverage is Chromium desktop and responsive viewport tests; real phone/Safari/Firefox validation remains outstanding.

Source updates are now delivered through Git: baseline `87d4acb` on `main`, with the current batch on `codex/provider-qualification`. See the [non-destructive WSL migration and update instructions](docs/git-workflow.md). Local evidence, credentials and generated files stay ignored.

Offline review of a saved experiment: `npm run experiment:review -- /path/to/result.json`
(with its original `permit.json` alongside it). This reports recorded evidence
without another inference request. See [privacy/failure review](docs/privacy-failure-review.md)
for the current adapter's tests and remaining live qualification work.

Restricted hosting preparation and remaining access requirements:
[development deployment](docs/development-deployment.md). The Docker package
reuses the current app and gateway; it does not enable unqualified inference.
