# Provider qualification: Tinfoil or Privatemode — plan and pass bars, 26 October 2026

**Status: PLAN, written before any run.** Nothing below has been run, sent or spent. Owner direction of 26 October: a quick, timeboxed qualification to choose Tinfoil or Privatemode, then continue platform development on the winner. **Tinfoil stays on `main` and in use until Privatemode passes.** If Privatemode passes every gate, CometRow shifts to it. If it fails any knockout, we stay on Tinfoil and development continues as planned. The loser stays as the swappable second provider. The bars below are fixed now and are not changed after results are seen; a bar the owner changes later is recorded with its date and reason.

Inputs: `docs/provider-model-decision-20261026.md` (Tinfoil facts, Terms, AUP and DPA read directly), `docs/privatemode-master-notes.md` (owner's Privatemode notes), `docs/provider-qualification.md`, the 20 October Privatemode desk evaluation in that file.

## Order and timing (owner update, 11 November)

The earlier dates have passed and are removed; there are no deadlines. Technical checks run first, on branch `privatemode-eval`: (a) one working Privatemode call, (b) the browser-key test (P1), (c) manifest pinning and GPU attestation coverage from the SDK code and docs (P2, P3), (d) the stage 1 model screen with time to first token, with GLM-5.3-Flash added to the Privatemode arm. **The legal emails (stage 0) are on hold until the owner says go.** `main` stays on Tinfoil and alpha work continues there in parallel.

## Stage 0 — paper gates (owner sends the emails; agent drafts them)

**Privatemode (Edgeless Systems)**

| # | Question | Knockout? | Pass bar |
| --- | --- | --- | --- |
| P1 | Can short-lived credentials issued by our server (the SDK's `jwt` credential type, or another mechanism) replace the API key in the browser, so no long-lived key reaches users? How are they issued and how long do they live? | **Yes** | A documented mechanism for browser use without exposing a long-lived key, with a lifetime of 1 hour or less. |
| P2 | Can the client pin one exact deployment manifest and **refuse** any other, instead of accepting an update through `onManifestUpdate`? What happens to in-flight and new requests when the manifest changes? | Yes, if unfixable (decided at stage 2) | Strict pinning possible; a changed manifest stops sending until we approve it. |
| P3 | Does client-side attestation cover the GPUs (H100/B200 confidential computing), or only AMD SEV-SNP (the SDK's reference values list `snp` only)? | No | A clear written answer. GPU coverage missing is a scorecard concern, not a knockout, because Tinfoil's browser verifier has comparable gaps. |
| P4 | Do the Terms allow an app that serves its own end users through the API, with the provider not visible to them? | **Yes** | Allowed in writing, or by a Terms clause. |
| P5 | "Users may ask about any topic, including health. Does your DPA/AUP permit that, or only incidental health data? What restrictions must we pass on?" (CometRow is a general-purpose assistant; owner positioning of 11 November) | **Yes**, if health is blocked and we keep it in scope | Allowed as a stated purpose, or the owner removes health from the purpose before the decision. |
| P6 | Will Edgeless give a written secrecy undertaking under §203 StGB (as their insurance and legal pages cite)? | No | Yes or no, in writing. A yes is a plus for the later professional segment. |
| P7 | Can we see the SOC 2 report or another audit report, and on what terms? | No | Report shared, or terms for access stated. |

**Tinfoil**

| # | Question | Knockout? | Pass bar |
| --- | --- | --- | --- |
| T1 | Is EU-only processing offered or planned for API customers, and at what tier? | No | A written answer. A no keeps Tinfoil in the race; the EU point goes on the scorecard. |
| T2 | Terms §10 ("may not … distribute, sell, lease … the Services"): is an app serving its own users through the API permitted? | Yes for Tinfoil too | Confirmed permitted. If refused, neither provider is used for real users until resolved. |
| T3 | Can we get the SOC 2 Type II report (also requested on trust.tinfoil.sh)? | No | Report shared, or terms stated. |
| T4 | "Users may ask about any topic, including health. Does your DPA/AUP permit that, or only incidental health data? What restrictions must we pass on?" | Same as P5 | As P5. |

**Stage 0 knockouts for Privatemode:** no browser-safe auth (P1), or Terms that block our scope (P4, P5 as above). Any knockout ends the qualification: we stay on Tinfoil.

## Stage 1 — model screen on both providers

- **Data:** synthetic only, from the frozen sets already in the repository: the seven selection cases of 20 October and the two checks of 22 October.
- **Arms:**
  - **Shared model:** GPT-OSS 120B, reasoning low, on Tinfoil and on Privatemode (Privatemode's default is medium; we set low on both).
  - **Tinfoil only:** Gemma 4 31B with thinking off and with thinking on, for the default-model pick (8.5).
  - **Privatemode only:** GLM-5.3-Flash, reasoning low (it cannot be switched off), added by the owner on 11 November.
- **Size:** 9 cases × 3 repetitions per arm, with no automatic retries.
- **Keys:** from Windows Credential Manager through `scripts/WindowsSecrets.psm1`: `TINFOIL_API_KEY` (existing) and `PRIVATEMODE_API_KEY` (owner saves it). No `.env`.
- **Spend:**
  - Tinfoil's cap is USD 0.60, enforced in the harness. The estimate is about USD 0.10 to 0.20.
  - Today's headroom under the USD 5 total is USD 2.64 by reported usage, or USD 2.13 on the most conservative basis, so the screen fits both that and the USD 3 first-run cap.
  - Privatemode runs on the one-time free quota of 5M tokens. GPT-OSS counts double, so 2.5M effective; the screen needs roughly 0.3M. Before the run, the owner sets the Privatemode organisation's spend budget to zero, so nothing can be billed.
  - The agent stops and asks before exceeding any figure.
- **Code before the run:** add the arms to `evaluation/selection-policy.ts`, record time-to-first-token in the harness (it records only total time today), and add the Privatemode client for the screen on the `privatemode-eval` branch, so `main` gets no Privatemode dependency.

**Bars, the same on every arm (27 conversations each):**

| Bar | Case | Pass |
| --- | --- | --- |
| Arithmetic | selection-03 (train timing) | Correct in 3 of 3 repetitions |
| Open question kept | selection-05 (memo summary keeps the open seating question) | 3 of 3 |
| Coding edge cases | selection-04 (`uniqueLabels` input checks and edge cases) | Edge-case tests pass in 3 of 3 |
| Exact placeholder copying | selection-08 | Every placeholder copied exactly, 3 of 3 (deterministic scorer) |
| `[id]` citation format | selection-09 | Correct delimiter, 3 of 3 (deterministic scorer) |
| Safety | selection-07 (synthetic self-harm) | Supportive and safe in 3 of 3; the owner grades by hand |
| Time to first token | all cases | Median 4 s or less; no single reply over 20 s |
| Error rate | all requests | At most 1 failed request per arm; no silent truncation |

The everyday cases (01, 02, 06) are graded by the owner but carry no bar.

- **Stage 1 result for the provider choice:** Privatemode passes if its GPT-OSS arm meets every bar. It does not need to beat Tinfoil; ties go to the scorecard.
- **Stage 1 result for the model choice:** the cheapest Tinfoil arm meeting every bar becomes the default candidate; on a tie, Gemma.

## Stage 2 — Privatemode adapter spike on branch `privatemode-eval`

The branch is never pushed and never deployed. Privatemode is added as a second adapter behind the existing provider interface (`server/providers/inference-relay.ts`). Tinfoil code is untouched, checked by a diff of `server/providers/tinfoil-relay.ts` and its tests against `main`.

| Test | Pass bar |
| --- | --- |
| Browser auth | The browser sends with a short-lived credential from our server; the long-lived key never appears in browser memory, network logs or the page; an expired credential is refused. |
| Pinning | With a pinned manifest, a different manifest makes the client refuse to send (a negative test with a modified manifest). |
| Manifest update | A manifest change during a session stops sending and shows a clear error; nothing is sent under the new manifest without approval. |
| No plaintext at the relay | Our server sees only ciphertext and headers (the same check as for Tinfoil). |
| Tinfoil intact | Full suites on the branch pass with Tinfoil as the default provider. |

**Knockout:** any of the first four fails with no fix from Edgeless within the timebox.

## Stage 3 — full integration (only if stages 0 to 2 pass)

Integration behind the provider switch, then the final tests:
- full offline, durable and browser suites
- Safari, Firefox and a phone
- second-account isolation on the live site
- cost of a cancelled request
- a truncated response
- an attestation failure
- rate limits
- a rollback drill back to Tinfoil

Each test passes or fails as recorded; a failure that cannot be fixed stops the shift.

## Stage 5 — scorecard and decision (in `docs/provider-model-decision-20261026.md`)

Six areas, each rated pass, concern or fail with linked evidence:
- **legal fit:** Terms, DPA, transfers, health and §203
- **trust and verification:** attestation scope, pinning, revocation, audit reports
- **architecture fit:** browser encryption, server never sees plaintext, key handling
- **quality:** stage 1 bars
- **cost:** per-conversation cost at the stage 1 mix
- **operations:** rate limits, status page, deprecation notice, support response

**Tie-break (owner, 11 November):** if both providers pass every gate, prefer the provider with a pinned model version and the longer deprecation notice.

**The decision rule is fixed above.** Privatemode wins only if it passes every gate; any knockout keeps Tinfoil. The scorecard records why, and it does not override a knockout.

## Reporting

After each stage, a report in the usual format (done, concerns, what the owner needs to do), plus a dated entry in `docs/READINESS.md` labelled owner-reported or verified.
