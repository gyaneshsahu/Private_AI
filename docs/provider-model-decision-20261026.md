# Provider and default model for the invite-only alpha (launch plan 8.1, 8.5) — 26 October 2026

**Status.** Provider: decided by the owner (Tinfoil). Default model: **not selected; no model is qualified.** A model screen is proposed below and waits for the owner's spend permit. Nothing here enables private chat, changes configuration or spends money. Provider qualification stays NOT_PASSED.

Sources and labels: **[T]** Tinfoil Terms, AUP and DPA read directly on tinfoil.sh on 25 to 26 October (all three "last updated / published 12 October 2026"); **[D]** the owner's documentation dump `docs/tinfoil-docs.md` (docs.tinfoil.sh as of 23 October); **[C]** public model list `https://api.tinfoil.sh/v1/models` read 26 October, saved as `evaluation/results/model-catalog-20261026.json`; **[R]** Tinfoil's email reply of 22 October (summary in `docs/provider-qualification.md`, verbatim in `docs/private/`); **[V]** verified in this repository.

## 1. Provider (8.1): Tinfoil, decided

Owner decision 25 October: Tinfoil is the inference provider for the invite-only alpha and possibly later. The provider adapter stays swappable (plan 2.7, `server/providers/`), so a later move needs one adapter, not a rewrite [V]. Privatemode is the desk-evaluated Plan B: no spend, no integration. EU region and the professional segment are out of scope for now. **Recommendation: agree**, under the posture in section 4.

What the choice accepts:

| Topic | Fact | Source |
| --- | --- | --- |
| Browser verification | The JS verifier we pin (1.2.2) checks hardware, approved repository and release digest, but has no freshness, revocation or Intel TDX checks; V3 is beta and Go-only; no date for a JS V3 verifier. | [D] JS SDK, feature status; [R] |
| Prompt retention | API prompts and responses "are not retained after the response is returned", except prompt cache in enclave memory, evicted in minutes to hours, no purge control. | [T] Terms §2, DPA Annex II; [D] prompt caching |
| Metadata | 90 days, longer for accounting, per the email; the DPA states no metadata retention period. | [R]; [T] DPA (silent) |
| Spend | Limits are soft: in-flight requests finish and are billed. Our relay already allows one request per account and pins the model. | [T] pricing page; [V] plan 1.1 |
| Model lifetime | Non-experimental models: at least one week's deprecation notice (email); the Terms only say parts "may be discontinued". | [R]; [T] Terms §2 |
| DPA | Applies automatically on accepting the Terms, for a business customer. CometRow is controller, Tinfoil processor. Data goes to the US under EU SCCs (Module 2, Irish law). 72-hour breach notice; 14 days' notice of new sub-processors with 7 days to object. | [T] DPA preamble, §5, §7, §10 |
| Terms | California law, San Francisco arbitration; liability capped at the greater of USD 100 or fees paid; 30 days' notice of price changes. | [T] Terms §6, §14, §16, §17 |

## 2. Conflicts with existing inputs

1. **Partial verification vs earlier gates.** The 20 October decision sequence (`provider-qualification.md`, "Limited working product") required Tinfoil to meet all requirements before private data, and the DPIA draft says private chat waits for the relay attestation audit. The alpha posture below opens chat with partial verification and the audit off: an owner risk acceptance, not a gate passing. Record it as such.
2. **Qualification report requires "pass".** `shared/contracts.ts` accepts a report only when every check has status `pass`, and the rule is never to set `pass` to unlock [V]. Enabling chat for the alpha needs a schema change: an `accepted-by-owner` status with a dated reason, never shown as verified. Engineering item, not started.
3. **Health topics.** The Terms permit "Incidental Special Category Data"; other special category data needs a separate written agreement. The DPA defines incidental as health and similar data "where processing such data is not a purpose of Company's use" [T]. The app's scope text offers "non-graphic sexual-health, consent and relationship advice" [V]. Either take health out of the stated purpose or ask Tinfoil for a written agreement.
4. **Building an app for others.** Terms §10: "You may not copy, modify, distribute, sell, lease … the Services except … by a separate written agreement" [T]. It most likely means reselling Tinfoil's service itself, and Tinfoil's proxy guide documents exactly our relay pattern [D], but no clause says an app may serve its own users. Confirm in one line with Tinfoil.
5. **Privacy policy has no US transfer statement.** The policy does not mention that conversations are processed in the US under SCCs [V]; the DPIA draft lists the transfer assessment as open. Must be added before a friend uses chat.
6. **Metadata retention.** The DPA is silent; only the email states 90 days. The policy's wording on supplier metadata should cite the supplier's statement, not a contract.
7. **Model proposal of 22 October.** Consistent: Gemma 4 31B candidate, GPT-OSS 120B fallback, re-run required. Its "no new paid spend" line is superseded only when the owner issues the permit in section 3.
8. **Relay assessment of 21 October.** B (model header, per-account bound) and C (usage metering) are already built (plan 1.1). A (delegated V3 check) exists only as the block-only attestation audit, which stays off until the pinning decision (A14). No conflict, but no gate closes.

## 3. Default model (8.5): proposal and screen (waits for permit)

Non-experimental chat models today [C], USD per million tokens, unchanged since 20 October:

| Model | Input / output | Our evidence | Role |
| --- | --- | --- | --- |
| `gemma4-31b` | 0.40 / 1.00 | 20 Oct screen: fastest, cheapest, but one material arithmetic error | **Default candidate** |
| `gpt-oss-120b` | 0.15 / 0.60 | Arithmetic gates v2 and v3: 0 silent wrong in 90, but only 40 of 90 verified | **Fallback candidate** |
| `glm-5-3` | 1.80 / 5.75 | 20 Oct screen: correct arithmetic, about 5x Gemma's cost | Quality challenger |
| `kimi-k3` | 4.00 / 20.00 | 12 of 12 ceiling probe | Too expensive for default |
| `llama3-3-70b` | 1.75 / 2.75 | none | Not screened |

`deepseek-v4-1-flash` is experimental and excluded.

**Recommendation:** default Gemma 4 31B and fallback GPT-OSS 120B, if the screen passes; GLM-5.3 only if Gemma fails and the margin justifies the cost.

**Proposed screen** (synthetic data only, frozen before running):
- Cases: the frozen 7 selection cases of 20 October plus the 2 checks of 22 October (placeholder copying, citation delimiter), 9 cases, 3 repetitions, no automatic retries.
- Arms: Gemma thinking off; Gemma thinking on (does thinking fix the arithmetic error); GPT-OSS reasoning low; GLM-5.3 reasoning low.
- Size: about 216 requests.
- Cost estimate: about USD 0.20, scaled from the 20 October actuals (Gemma USD 0.006 and GLM USD 0.032 per 14 requests; GPT-OSS by price ratio). **Cap USD 0.60**, enforced in the harness.
- Budget: the arithmetic work spent USD 2.36 by reported usage; if your USD 5 total is the same allowance, USD 2.64 remains. The cap fits inside the USD 3 first run either way.
- Key: `TINFOIL_API_KEY` from Windows Credential Manager through `scripts/WindowsSecrets.psm1`, as in earlier runs (owner direction 26 October: no `.env`). The full two-provider screen is in `docs/provider-qualification-20261026.md`.
- Pass rule: the arithmetic case correct in all repetitions, both checks pass, no safety failure; the owner grades the reasoning, document and safety answers by hand. The cheapest passing arm is the default; on a tie, Gemma.
- Before the run: add the Gemma-thinking and GPT-OSS arms to `evaluation/selection-policy.ts` with tests (small change), then wait for the permit.

## 4. Alpha launch posture

- Partial verification. The browser verifies the enclave with the pinned verifier (hardware, approved repository, release digest) before every send; freshness, revocation and TDX are not checked. The relay never sees plaintext.
- The block-only relay attestation audit stays disabled (no configuration) until the pinning policy, A14, is decided.
- No "verified" claim anywhere: app, privacy copy, website or messages. Existing tests already forbid absolute claims; any new copy says what is checked and what is not.
- Provider qualification stays NOT_PASSED; the alpha runs on a dated owner acceptance, not on a pass (conflict 2).
- No arithmetic "recomputed and matches" claim (track closed 24 October).

## 5. Before the first real friend

| Item | Owner |
| --- | --- |
| Model screen run, owner grades, default and fallback picked | Agent runs after permit; owner grades and picks |
| Qualification schema gets an owner-accepted status; report issued for the picked model | Agent builds; owner signs the acceptance |
| Health scope decided (out of purpose, or written agreement with Tinfoil) | Owner |
| One-line confirmation from Tinfoil that an app may serve its own users (Terms §10) | Owner sends; agent drafts |
| Privacy policy states the US processing under SCCs and the supplier's metadata statement | Agent drafts; owner approves |
| DPA accepted as a business customer; transfer assessment noted in the DPIA | Owner |
| Production composition allows inference for the allowlisted accounts only, with the spend cap | Agent builds; owner deploys and sets the Tinfoil key in Render |
| Invitee added to the allowlist; second-account isolation test on the live site | Owner adds; agent walks through the test |
| Backup destination and liveness alert in place (7.2, 7.3), recovery rehearsal (7.1) | Owner decides and sets up; agent supports |
| Safe Browsing warning explained (Search Console) | Owner |
| Support contact and pause or revoke rule for the alpha (8.4) | Owner names; agent records |

## Stage 5 scorecard — interim, 11 November 2026

**Status: INTERIM. No provider decision.** Built from the stage 1 screen and the stage 2 spike (`docs/provider-qualification-20261026.md`, results on branch `privatemode-eval`). Stage 0 (legal answers; emails on hold) and stage 3 (full integration) have not run. Under the fixed rule, Privatemode wins only if it passes every gate. Until then **Tinfoil stays the provider on `main`.**

| Area | Tinfoil | Privatemode | Edge today |
| --- | --- | --- | --- |
| **Legal fit** | US company; California law and arbitration; DPA automatic; processing in the US under SCCs; health only as incidental data without a written agreement; Terms §10 unclear for apps serving their own users; SOC 2 on request; no EU option known. Breach notice 72 hours; sub-processor changes 14 days, objection 7 days. Read directly 25 to 26 October. | Edgeless Systems GmbH, Bochum; **German law, Bochum courts**, no arbitration. DPA automatic for any account holder (Art. 28(9)) and **processing exclusively in the EU/EEA** (DPA §10); sub-processors Scaleway (Paris) and Lyceum (Berlin) only. **Special-category data, including health, allowed** as long as the controller has an Art. 9(2) legal basis (DPA §2(5)). Breach notice 48 hours; sub-processor changes 30 days, objection 30 days; ISO 27001, no SOC 2. Metadata visible to authorised staff (Terms §6.3). Terms §2.4 forbids sharing or distributing API keys; nothing says an app may serve its own users. No §203 StGB clause. Read directly 11 November (Terms of 24 April, DPA of 24 July 2026). | **Privatemode**; P4 (apps serving own users) still open |
| **Trust and verification** | Browser verifier checks hardware, approved repository and release digest; no freshness, revocation or TDX checks; the enclave enforces the model header; block-only audit stays off until A14. | SDK verifies AMD SEV-SNP and Intel TDX against a manifest we pin by SHA-256, plus a pinned Wasm hash; a changed deployment is refused (CSP blocks the refetch, our adapter closes the client); GPU attestation happens server-side, not in the client; revocation policy is client-set with strict defaults. Tested in a real browser on 11 November. | Comparable; each has gaps. **Edgeless to confirm GPU scope** |
| **Architecture fit** | Built, deployed and tested end to end: relay with admission, per-account allowances, one in-flight request, model pin, token metering per request. | Fits our relay pattern (browser holds a placeholder, relay injects the key, relay never sees plaintext; tested). Differences: three paths at the site root; **no token metering** (usage is encrypted, so requests are counted only); Wasm needs `'wasm-unsafe-eval'`; not yet wired into the app (stage 3). | Tinfoil (done); Privatemode workable |
| **Quality (stage 1 bars)** | GPT-OSS: all automatic bars except citation format (2/3). Gemma, thinking off: fails open question (0/3) and coding (1/3). Gemma, thinking on: fails open question (2/3). | GLM-5.3-Flash: **every automatic bar passes**. GPT-OSS: fails open question (1/3), citation format (2/3) and time to first token (one 60 s reply). | Privatemode (GLM-5.3-Flash); **safety grades pending** |
| **Cost** | Per 1,000 conversations at the screen mix: GPT-OSS USD 0.47, Gemma USD 0.84, Gemma thinking USD 1.55. Soft spend limits; relay meters tokens. | GLM-5.3-Flash EUR 0.52, GPT-OSS EUR 0.59 per 1,000 conversations; 5M free tokens once; spend bounded by request counts plus per-key limits in the portal. | Even (both negligible); Tinfoil has better cost control |
| **Operations** | At least one week's deprecation notice for non-experimental models (email of 22 October); exact model IDs; models removed with a changelog entry (GLM-5.3 Flash, 9 October); catalog churn observed. | Documented rate limits (100 requests per minute, standard tier); status page; aliases such as `glm-latest` move to the newest model, and the deprecated `glm-5.2` is silently routed to GLM-5.3; **no deprecation notice period documented**. | Tinfoil |

**Tie-break (owner, 11 November): pinned model version and longer deprecation notice.** Today this favours Tinfoil: a documented one-week notice, and exact model IDs that are removed rather than rerouted. Privatemode's silent rerouting of a deprecated ID weakens version pinning until Edgeless states a policy. It applies only if both providers pass every gate.

**Reading.** Privatemode is technically usable for CometRow. Its stage 2 knockouts (browser-safe key, pinning, manifest update) all pass with our relay and adapter, and its best model beat every Tinfoil arm on the stage 1 bars. What it has not passed yet is stage 0: the Terms, DPA, health scope and §203 answers. It also costs more integration work, and it gives up token metering at the relay.

### Open before a decision

| Item | Owner |
| --- | --- |
| Safety grades for selection-07, all five arms (`.local/provider-screen-20261111/*-safety.md` in the `privatemode-eval` worktree) | Owner |
| Stage 0 emails. P1 is answered technically (relay pattern); P2 is answered technically (our wrapper and CSP refuse a changed deployment); still to ask: P8 deprecation and alias policy (new: notice period, and whether deprecated IDs reroute), P3 GPU attestation scope, P4 Terms for apps serving their own users, P5 general-purpose health question, P6 §203, P7 audit reports; Tinfoil T1 to T4 | Owner sends; agent drafts |
| ~~Read Privatemode's Terms, AUP and DPA directly~~ done 11 November: P5 (health) answered by DPA §2(5), but CometRow must have an Art. 9(2) basis (explicit consent) whichever provider is used; P6 (§203) not in the documents; P7: ISO 27001, no SOC 2 | Agent |

### What stage 3 would add (only after stage 0 passes)

1. Wire the relay into `server/app.ts`: session check, CSRF through the SDK's `extraHTTPHeaders`, per-account allowances, one in-flight request, request counting and settlement without token figures (usage page shows counts, not cost).
2. Qualification report fields for the manifest digest and Wasm hash, with validation; provider selected by the report.
3. Vite build: ship `privatemode.wasm` as an asset and keep the SDK's Node-only branch out of the browser bundle; content security policy with `'wasm-unsafe-eval'`.
4. Deployment: Privatemode key as a Render secret, per-key limits set in the Privatemode portal, owner accepts the DPA.
5. Privacy copy and policy: EU processing by Edgeless, metadata and permanent per-key usage records.
6. Final tests: full suites; Safari, Firefox and a phone; second-account isolation on the live site; cost of a cancelled request; truncated response; attestation failure; rate limits; rollback drill back to Tinfoil.

Estimate: about 4 to 6 working days for items 1 to 5, then 2 to 3 days for the tests (about 1.5 to 2 weeks). Owner time: secrets, portal limits, DPA, and the test journeys on phone and laptop.
