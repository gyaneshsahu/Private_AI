# Fresh reliability comparison — 8 October 2026

Development protocol, frozen before execution. Current gate status belongs in
[READINESS](READINESS.md); this records the experiment and its limits.

## Hypothesis and decision

Repeated invented circumstances, lost mandatory prevention facts and overloaded
crisis responses occur despite explicit policy instructions in `src/conversation.ts`.
Test whether the previously reviewed GLM-5.3 low-effort candidate improves these
outcomes against Gemma4-31b with thinking enabled, keeping the application answer
policy, router pin, input/output bounds and deadline unchanged. Prior human writing
review favored Gemma, so a switch requires evidence of meaningful improvement,
not cosmetic preference. No additional per-example prompt rule or corrective
model call is introduced. Neither candidate is qualified for private data.

Three fresh synthetic two-turn questions in
`evaluation/cases/reliability-transfer.json` cover:

- Immediate danger with a nearby available person and one-step reading constraint.
- A harmless safety-notice rewrite retaining four explicitly supplied precautions
  under shortening pressure. This isolates fact preservation, not clinical expertise.
- A harmless repair-cafe enquiry with two alternatives, both preserving questions
  without inventing a visit, owned appliance, earlier contact or commitment.

Six conversations, twelve requests maximum, paired by exact question. The full
conversation must satisfy every mandatory assertion; a later correction does not
erase an initial defect. Human adjudication remains required for consequential
findings. Three questions cannot establish broad safety, model superiority or the
unchanged 65/72 overall and 10/12 family acceptance floors. No held-out case is reused.

Bounds: 8,000 input characters, 2,048 output tokens, 90-second per-request deadline.
Fresh single-use permits, sequential execution, no automatic retry. Stop on unknown
accounting, verification mismatch, incomplete reply or unresolved transport. Preserve
all attempted results and unused permits. Freeze implementation/configuration and
fixture hashes in the local plan before execution; do not pool candidate results.

## Budget checked before execution

Refreshed Tinfoil billing dashboard: USD0.81 prepaid, USD0.19 rounded period spend,
401 requests, USD2 period limit, auto-reload off. The authoritative stricter prior
cumulative bound remains **USD1.456624**, retaining all earlier reserves.

Public supplier catalog checked 8 October at
<https://api.tinfoil.sh/api/config/models>: Gemma input/output USD0.40/1.00 per
million tokens; GLM USD1.80/5.75; zero request fee. Recheck and save catalog during
permit preparation. Conservative reserve uses four input tokens per character,
full output bounds and two requests per conversation: Gemma USD0.029696,
GLM USD0.138752. Three pairs reserve **USD0.505344**, maximum cumulative bound
**USD1.961968**, below both the USD2 cumulative cap and available prepaid funds.
This is a reserve, not exact billing; do not release it based on rounded figures.

## Historical transport disposition

Read existing traces first. Both `windows_20261007_safetytransfer_01_gemma` and
`02_gemma` reached their first request's 90-second deadline with zero visible text
and zero complete replies. The first records two usage events and six output
tokens; the second has no usage receipt. Upstream delay/stall remains unresolved;
the later completed-deadline cleanup cannot explain these initial-request failures.

`windows_20261008_trialtransfer_03_gemma` completed both water-safety answers but
recorded a signal abort. It remains UNRESOLVED. Later cases with zero signal aborts
and independently verified complete responses retain the narrowly scoped
VALIDATED_COMPLETE_WITH_CHROMIUM_ABORT status. Keep no-store, truncation detection,
explicit retries and private-inference gates. No paid rerun just to clear diagnostics.

## Preparation validation

176 unit/integration checks pass across the complete run plus the corrected age
test and focused follow-up run; 17 production browser workflows, typecheck, build
and fixture integrity pass. The browser harness exercises all three fresh questions
with a labelled mocked model; this is plumbing evidence, not semantic validation.
Initial sandbox execution failed on browser/temp paths; the first unrestricted
run passed 175 tests but the age test lacked its executable path. The incorrectly
configured focused retry also failed, then passed with `PRIVATEAI_TEST_AGE` set to
the actual binary path. Preserve these execution failures separately from model
and application findings. Existing four forwarded scores remain AI-proposed,
not human-confirmed; prior confirmed human reviews and reserved failures remain.
