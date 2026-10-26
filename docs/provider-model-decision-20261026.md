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
