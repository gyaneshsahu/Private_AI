# Stage 3 plan for Privatemode — documents only, no build (12 November 2026)

**Status: PLAN.** Nothing was built, run, sent or spent for it. It was written from `docs/provider-qualification-20261026.md`, `docs/READINESS.md` (entries of 11 and 12 November), `docs/provider-promises-20261112.md`, `docs/owner-decisions.md` (D17), the current code on `codex/development-handoff`, and the spike on `privatemode-eval` (`ccd33a2`, read only). "Unknown" means not checked in code, docs or a test.

## What Stage 3 means

Stage 3 runs only if Privatemode wins the provider choice (owner decision P7). It turns the stage 2 spike into the real product path, behind the existing provider switch (the qualification report's `provider`):
- Privatemode chat goes through the same admission as Tinfoil: session, CSRF, invite gate, allowance, spend guard, concurrency, stop switch.
- Tinfoil stays registered and working, as the swappable second provider and the rollback target.
- The final tests in the stage 3 list of the qualification plan pass: full suites, Safari, Firefox and a phone, second-account isolation, cost of a cancelled request, a truncated response, an attestation failure, rate limits, and a rollback drill to Tinfoil.

**A precondition the owner must settle first.** By the bar fixed on 26 October, "Privatemode passes if its GPT-OSS arm meets every bar", and that arm **failed** stage 1: open question 1/3, citation format 2/3, and one 60 s time to first token (READINESS, 11 November). Only the GLM-5.3-Flash arm passed every automatic bar, and its safety grade (selection-07) is still open. The plan does not allow bars to change silently after results are seen. So a Privatemode win needs a dated owner entry that GLM-5.3-Flash is the qualifying arm, with the reason. This plan assumes **GLM-5.3-Flash (`glm-5.3-flash`, reasoning low)** as the Privatemode model.

## What the spike leaves undone (found while reading)

1. **Root paths bypass all controls.** The browser SDK ignores the path in its base URL, so the spike relay answers `/v1/chat/completions`, `/privatemode/v1/attest` and `/privatemode/v1/secret` at the site root. Session, CSRF and account middleware are mounted on `/api` only (`server/app.ts`, around lines 167-232), and the chat admission route is `/api/inference/v1/chat/completions`. As wired in the spike, Privatemode chat would skip the allowance, the spend guard, the one-request-per-account rule and the stop switch. Stage 3 must fix this first.
2. **CSRF and continuation headers are dropped.** The spike's `transport.request(_url, init)` ignores `init.headers`, so `X-PrivateAI-CSRF` and `X-PrivateAI-Continuation-Approval` never leave the browser (`src/verified-chat.ts` lines 362-370 and 437-446). The SDK has `openAIOptions.defaultHeaders`, which it turns into `extraHTTPHeaders` for its core (`privatemode-ai/dist/openai.js`). Whether the core sends them on the attest and secret calls is **unknown**.
3. **The model setting fails validation.** `MODEL_SETTINGS.glmReasoningEffort` is tied to `"glm-5-3"`, Tinfoil's ID (`shared/contracts.ts`). A Privatemode report with `model: "glm-5.3-flash"` and `glmReasoningEffort: "low"` is refused by `validateQualification` ("A model setting names a model the report does not qualify"). If the setting is dropped instead, GLM runs on the supplier's default: the same bug class as the T6 finding of 12 November.
4. **Tinfoil-only fields in the shared code.** `RelayAdmission` carries `encapsulatedKey` (EHBP). `repository` must match `^tinfoilsh/` in both `shared/contracts.ts` and `server/deployment-config.ts`. The shared request body always sends `user_cache_secret` (`src/verified-chat.ts` lines 352 and 451); what Privatemode does with it, and how its per-salt cache is set from our side, is **unknown**. `server/index.ts` reads only `TINFOIL_API_KEY`.
5. **Prices are in EUR, the report in USD.** Privatemode lists `glm-5.3-flash` at EUR 0.20 input and 0.65 output per 1M tokens, plus VAT (`docs/privatemode-master-notes.md` §6). `pricing.currency` is `z.literal("USD")`.
6. **The Wasm is 28.8 MB** (`node_modules/privatemode-ai/dist/privatemode.wasm`, 28,777,337 bytes). The app sets `Cache-Control: no-store` on every response, and the adapter verifies once per request. Without a cache exception, each message could download about 29 MB. The compressed size and the SDK's own caching are **unknown**.
7. **A fifth privacy sentence is wrong for Privatemode, beyond D17's four.** "What we can see" says we see "how long the question and answer were and what they cost at published rates". Privatemode's token usage is encrypted, so the relay counts requests only (READINESS, 11 November). For Privatemode, that sentence is false.

## Files to change or add

| Path | Change | Why | Size |
| --- | --- | --- | --- |
| `shared/contracts.ts` | `provider: z.enum(["tinfoil","privatemode"])` (as on the spike). Per-provider rules in a `superRefine`: `repository` is `tinfoilsh/*` for Tinfoil and `edgelesssys/*` for Privatemode (repository name **unknown**, likely `privatemode-public`); `origin` is `https://api.privatemode.ai/` for Privatemode. An optional `privatemode` evidence block (see next section). `MODEL_SETTINGS` values become arrays of model IDs (`glmReasoningEffort: ["glm-5-3","glm-5.3-flash"]`, `gptOssReasoningEffort: ["gpt-oss-120b"]`). | Points 3 and 4; the report must describe the provider it qualifies | M |
| `src/providers/inference-client.ts` | `verify()` gets the CSRF token (new argument or a `ClientPolicy` field), so the adapter can set `defaultHeaders` before the attest and secret calls | Point 2 | S |
| `src/providers/privatemode-client.ts` (new on this line, port from the spike) | Forward `init.headers` on every request (`create(body, { headers, signal })`, or `defaultHeaders`); CSRF on attest and secret; keep the manifest SHA-256 check, the pinned Wasm hash and close-on-update; `modelOptions` sends `reasoning_effort` only for the report's model | Points 2 and 3 | M |
| `src/verified-chat.ts` | `import "./providers/privatemode-client"` (the SDK stays a dynamic import, so the Tinfoil path does not load it); move `user_cache_secret` into the adapter's `modelOptions` (Tinfoil keeps it as it is) | Point 4 | S |
| `server/providers/inference-relay.ts` | Generalise `RelayAdmission`: `encapsulatedKey` becomes `upstreamHeaders: Record<string,string>`; add optional `rootPaths: string[]` (paths the SDK calls at the root) and `routes(q): Router` for extra endpoints (attest, secret, manifest, Wasm) | Points 1 and 4 | M |
| `server/providers/tinfoil-relay.ts` | Mechanical only: return `upstreamHeaders: { "Ehbp-Encapsulated-Key": … }`. No behaviour change, checked by the unchanged Tinfoil tests | Keeps Tinfoil intact | S |
| `server/providers/privatemode-relay.ts` (port from the spike) | Rewrite the spike's Express router as an `InferenceRelayAdapter`. `admit` checks `privatemode-target-model` against model and fallback; `upstream` uses `https://api.privatemode.ai/v1/chat/completions` with `Bearer` and the routing headers only; `accept` requires 200 and `privatemode-oae-response-header` (whether that header is always present on a stream is **unknown**, so test it); `classifyFailure` is 4xx → rejected; `usage` is always `undefined` (unmetered); `guard` is pass-through; `verificationHosts` is `[]`. Attest and secret are forwarded through `routes()` with the same header filters. Manifest and Wasm are served from config | Point 1; one admission path | M |
| `server/app.ts` | `import "./providers/privatemode-relay"`. An early middleware maps the adapter's `rootPaths` into `/api/inference/…` before the session middleware, so session, CSRF, the invite gate and the 200-POST limit apply. Chat goes through the existing admission handler; `routes()` is mounted under `/api` after the session. Add `Cache-Control: public, max-age=31536000, immutable` only for the hash-named Wasm path | Points 1 and 6 | M |
| `server/index.ts` | Key from `PRIVATEMODE_API_KEY` when the report's provider is `privatemode`, otherwise `TINFOIL_API_KEY` | Point 4 | S |
| `server/deployment-config.ts` | `inference.manifestFile` (the approved manifest bytes), required exactly when the report names Privatemode; `attestationAudit` refused unless the provider is Tinfoil | The relay needs the approved manifest in production | S |
| `server/spend-guard.ts` | No logic change: every Privatemode request is counted at worst case, as today for unmetered requests. Update the header comment | See "Relay and spend guard" | S |
| `shared/privacy-copy.ts` + `docs/privacy-copy-20261022.md` | `privacyCopy(provider)`: Tinfoil text byte-for-byte unchanged; a Privatemode variant for the five sentences (D17's four plus point 7). The website copy follows the provider in use | D17; the rollback needs the Tinfoil text intact | M |
| `shared/provider-disclosure.ts` | None in code (both entries exist). Remove DRAFT only after the owner approves (D8) | Already prepared | S |
| `src/account-usage-format.ts` | Check the wording when every request is unmetered (no token counts, no cost) | The usage panel would show zeros | S |
| `package.json`, `package-lock.json` | `privatemode-ai` exact `1.63.0` (spike pin); peer `openai` 6.46.0 is already present (`<8` required) | SDK | S |
| `Dockerfile`, `Dockerfile.render` | Probably no change (`npm ci` installs the SDK and its Wasm); confirm the Wasm is in the runtime image and the Vite build handles the SDK's `node:*` imports (the spike used esbuild with `external: ["node:*"]`; the Vite result is **unknown**) | Build | S |
| `scripts/privatemode-manifest-check.mjs` (new, optional) | Read-only weekly check: the current Privatemode manifest SHA-256 against the report's `releaseDigests`; exits 1 on change, like `scripts/provider-terms-check.mjs` | A manifest rotation stops chat; finding it early beats users finding it | S |
| `evaluation/live-failure-check.ts` | A Privatemode mode for the T6 cases (Stop during verification, Stop mid-stream, output limit, wrong manifest digest) | Stage 3 live tests | M |
| Docs (after the work, not now) | `docs/READINESS.md` entry; `docs/development-deployment.md` (key, manifest file, portal key limit); `docs/provider-promises-20261112.md` (Privatemode column); `docs/rollback-drill-20261025.md` (drill to Tinfoil) | Evidence conventions | S |

## Qualification report changes

- **`provider`**: `"tinfoil" | "privatemode"`.
- **`origin`**: `https://api.privatemode.ai/`. **`repository`**: the Edgeless repository the manifest comes from (name **unknown**). **`releaseDigests`**: SHA-256 of the approved manifest bytes, the value the spike client checks.
- **New optional `privatemode` block**, required when `provider` is `privatemode`:
  - `sdkVersion: "1.63.0"`
  - `wasmSha256` (today `71b9bf76…7bd2`, a constant in the client; the report records the same value, and a test keeps them equal)
  - `manifestReferenceValues: ["snp","tdx"]` (what the live manifest carried on 11 November)
  - `nvidiaOCSPPolicy` as set in the client (SDK default: only good statuses, no grace period)
  - `portalKeyLimit` (amount, currency, date set, `owner-reported`)
- **`model`** `glm-5.3-flash`, `glmReasoningEffort: "low"`; `fallbackModel` optional (the GPT-OSS arm failed stage 1, so none is assumed).
- **`pricing`**: stays USD. The owner converts the EUR list prices plus VAT at a stated rate with a margin and records the conversion in the evidence. This needs no schema or ledger change (`cost_usd` columns, `approvedSpendUSD`).
- **How attestation evidence differs, per check:**
  - `browserVerification`: the browser Wasm checks AMD SEV-SNP and Intel TDX reports against the pinned manifest. Tinfoil's gap (no freshness or revocation check in the browser) is replaced by a different one: the GPU is not in the client's reference values.
  - `protectedWorkerChain`: the NVIDIA GPU report is checked **server-side** by Privatemode's own service before keys are released (their docs, attestation overview). The browser cannot confirm it, so it is likely `accepted-by-owner`, not `pass`.
  - `freshnessAndRevocation`: NVIDIA OCSP is client-set and strict. AMD and Intel revocation and freshness in the Wasm are **unknown**.
  - `usageAndBudget`: no per-request metering at the relay. The ceiling is the relay's worst-case count plus the portal's hard per-key limit, likely `accepted-by-owner`.
  - `retentionAndLogs`: Privatemode FAQ, metadata up to 90 days, token counts per key kept permanently.
  - `verificationSummary()` already says "not verified" for accepted checks, so it needs no change.

## Relay and spend guard

- **One admission path.** The root paths are mapped into `/api/inference/…`; attest and secret need a session and CSRF and count toward the session's 200-POST limit. Whether attest or secret calls cost quota is **unknown**; check it in the portal after the live tests.
- **Spend.** The relay never sees Privatemode token counts, so `spendAllows()` counts every request at `worstCaseUSD(q)`. Example, assuming `maxInputCharacters` 100,000 and `maxOutputTokens` 4,096 at USD equivalents of 0.20 and 0.65: about USD 0.023 per request, so a USD 5 approval admits about 220 requests per review window, however small the messages. Ways to change that, for the owner (proposed new decision, not in the D-list yet):
  - (a) Lower `maxInputCharacters` for the alpha.
  - (b) Accept the portal's **hard** per-key limit as the real ceiling and set `approvedSpendUSD` to match it.
  - (c) Keep both, so the relay stops first.
  
  Default in this plan: (c), with the portal key limit at or below `approvedSpendUSD`. The guard stays as it is: Privatemode's own limit is a second wall, not a reason to remove ours.
- **Concurrency.** Unchanged: three requests per process, one per account. Privatemode rate limits are 100 requests/min on Standard and 40/min on Free (notes §8). These are org and key limits, so a 429 from upstream is classified `rejected`, and the fallback offer must not loop.
- **Metadata.** Privatemode keeps token counts per key **permanently**. One key is shared by all users, so these records are per CometRow, not per user. That holds as long as we never use per-user keys.

## Privacy copy changes

D17's four sentences (`docs/provider-promises-20261112.md`), plus one this plan found:
1. Cache: "usually within minutes … the company has said it does not plan to add one" is Tinfoil's email. Privatemode documents a per-salt prompt cache.
2. Metadata: "90 days, longer for accounting records" becomes up to 90 days, and token counts per key permanently for billing.
3. Limits: "Spending limits on the secure server are soft" is false. Privatemode per-key limits are hard limits set in its portal.
4. Browser check: Tinfoil's "partial … no date for a fuller browser check" changes to the Privatemode gap: the processors are checked in the browser, the graphics processor only on the provider's side.
5. "What we can see" (new, point 7): we see requests, times and the model, not lengths or cost.

The agent drafts these; the owner approves them (D17, with D8 for the provider section). Chat stays off until both are approved.

## CSP changes

- None to `script-src`: `'wasm-unsafe-eval'` is already in `server/app.ts` line 110.
- `connect-src` stays `'self'` only: the Privatemode adapter's `verificationHosts` returns `[]`. That is a safety property. The spike showed the CSP blocking the SDK's silent manifest refetch from the CDN, a second wall behind close-on-update. A test must assert that no `privatemode.ai` host ever appears in the policy.
- `worker-src 'self' blob:` is unchanged. Whether the SDK starts a worker is **unknown**; the Chromium run showed no CSP violations, but Safari and Firefox are untested.

## Tests to rerun or add

**Port from the spike:**
- `tests/privatemode-relay.test.ts`: rewrite it against the adapter and `server/app.ts`, not a standalone router.
- `tests/privatemode-browser.test.ts` and `tests/fixtures/privatemode-page.ts`: live, `PRIVATEMODE_LIVE=1`, through the real app.

**New:**
- `tests/privatemode-client.test.ts` (offline): manifest digest refusal, close-on-update refusal, headers forwarded, Wasm hash equals the report.
- A root-path admission test: `/v1/chat/completions` without a session or CSRF gets 401 or 403; with the stop switch it gets 503; past the allowance, 429.

**Privatemode twins of existing Tinfoil tests:**
- `tests/provider-interfaces.test.ts`: "registers exactly one adapter today" becomes two; plus a twin of "keeps every supplier header … inside the adapter".
- `tests/production-relay.test.ts`, `tests/relay-spend-stop.test.ts`, `tests/spend-guard.test.ts` (all unmetered).
- `tests/relay-browser.test.ts`, `tests/browser-transport.test.ts`.
- `tests/assisted-structured-transport.test.ts`, `tests/calculation-continuation-transport.test.ts` (continuation header through the SDK).
- `tests/deployment-inference-config.test.ts` (`manifestFile`, key by provider).
- `tests/security-headers.test.ts` (CSP with a Privatemode report).
- `tests/qualification-fallback.test.ts`, `tests/qualification-acceptance.test.ts` (Privatemode fixture, GLM setting accepted).
- `tests/tenant-isolation.test.ts`, `tests/account-usage-http.test.ts`, `tests/cost-exposure.test.ts`, `tests/network-observation.test.ts`.

**Rerun unchanged:**
- `tests/provider-disclosure.test.ts`, `tests/privacy-copy.test.ts` (extended for the per-provider copy), `tests/remote-content-canary-ui.test.ts`, `tests/attestation-audit.test.ts`, `tests/provider-verifier-boundary.test.ts`.
- Full suites: `npm test`, `npm run test:e2e`, `npm run test:durable`. Run them from a plain-path checkout, not `.claude/worktrees/` (the dot-folder problem of 11 November).

**Live stage 3 list:**
- T6 cases on Privatemode (`evaluation/live-failure-check.ts`).
- Cost of a cancelled request, compared with the portal usage.
- A truncated response: GLM reasoning cannot be switched off, so check the output limit at `maxOutputTokens`.
- An attestation failure (wrong digest).
- An upstream 429.
- Owner: Safari, Firefox, phone (Galaxy A52 with a 29 MB Wasm), and second-account isolation.
- Rollback drill to Tinfoil.

## Open dependencies

- **P4 (Edgeless reply, knockout):** whether Terms §2.4 allows an app serving its own users. A no ends the shift. Status: asked, no reply recorded.
- **P8 (Edgeless reply, tie-break):** deprecation notice period and exact-version pinning. Also ask how often the manifest rotates and with what notice (**unknown**); each rotation stops chat until the owner approves a new digest.
- **P7 (owner):** the provider choice. It depends on P4, P8, the safety grades (P5) and the default model (P6), plus the dated bar entry for GLM-5.3-Flash above.
- **D17 and D8 (owner):** privacy copy and the provider section, before chat goes on.
- **Owner actions:** the portal key limit, `PRIVATEMODE_API_KEY` and the manifest as Render secret files, the deploy, the device checks.

## Estimate

| Work | Agent-hours |
| --- | --- |
| Schema, config, key selection, fixtures | 2-3 |
| Relay adapter, interface change, root-path admission in `server/app.ts` | 5-7 |
| Client adapter (headers, CSRF, cache field, Wasm caching, Vite build) | 3-5 |
| Privacy copy variant and doc mirror (draft) | 1-2 |
| Offline and browser tests, full suites twice | 7-10 |
| Live stage 3 checks and rollback drill (with the owner) | 3-5 |
| READINESS and runbook docs | 1 |
| **Total** | **22-33** |

**Calendar:** 4-6 working days of agent time. The owner steps add at least 2-3 days: copy approval, Render secrets and deploy, device checks. That gives **6-9 calendar days after P7**, if the owner is available.

**Critical path:** P4 reply → P7 decision (with the GLM bar entry) → root-path admission and relay adapter → twin tests green → D17/D8 approval → live checks on the deployed site → owner device checks → rollback drill → switch. The code can be prepared on `privatemode-eval` before P7 to shorten the path, but nothing merges before P7. The P4 reply date is **unknown** and is the longest pole.

## Risks

- **Bypass of controls if the root paths are wired naively** (point 1): this is the highest-impact defect, and it has a test above.
- **Manifest rotation:** chat stops until a new digest is approved. The notice period is **unknown**. Mitigation: the optional weekly manifest check plus a quick re-approval runbook.
- **29 MB Wasm:** load time and memory on phones, and hosting egress. The compressed size is **unknown**.
- **Worst-case spend accounting** stops chat after about 220 requests per USD 5 (example above), so a small budget will look like an outage.
- **No per-request metering:** cost is visible only in the Privatemode portal, so reconciliation is manual (`docs/week-one-monitoring.md` already notes this).
- **Weaker browser verification of the GPU:** the browser trusts Privatemode's server-side NVIDIA check. Disclosed in the copy and accepted by the owner, or the provider choice changes.
- **Single SDK supplier:** Wasm, transport and attestation are all inside `privatemode-ai`. Exact pin and hash; upgrades are deliberate.
- **Stage 1 bar:** only GLM-5.3-Flash passed, with safety ungraded. If its grade fails, Privatemode has no qualifying model.
- **Tinfoil regression from the shared-interface change:** mitigated by running the existing Tinfoil tests unchanged and diffing `server/providers/tinfoil-relay.ts`.
