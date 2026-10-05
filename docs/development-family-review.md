# Everyday development fixture review

5 October 2026. Agent-reviewed synthetic development evidence; not human grading,
held-out evaluation, provider qualification or comparative quality evidence.

## Working evaluation workflow

The bounded experiment runner now supports `development_case` plus an exact ID
from the frozen 24-case development set. It loads the original two turns and
synthetic reference material, records case/family/assertions/forbidden conclusions,
and includes the fixture file and manifest in implementation identity hashing.
It rejects missing/unknown/reserved IDs, mismatched scenarios and custom prompt
fields. Every conversation still needs a separate unconsumed permit and stops
on failure or unknown usage; maximum two inference attempts.

The actual browser harness exercises all 24 cases against an explicitly mocked
model offline, checking source content and follow-up state. That is harness
coverage, not 24 model-quality passes. Research cases use fixture references;
this harness does not perform live web research or certify its disclosure flow.

## Live observations

All run IDs below have prefix `windows_20261005_`; original results and claims
remain in ignored `.local/experiment-runs/`. Validated `agent-review-20261005.json`
sidecars provide the transcript, rubric scores, assertion evidence and findings.
Their reviewer kind is `agent`, so they cannot pass the human quality gate.

| Run / case | Result | Agent finding |
| --- | --- | --- |
| `explanation_1` / `development-planning-02` | Two complete answers, 6.65/5.14 seconds | Explains gross/net and declines exact net from gross alone. But unnecessary detail introduces confusing deduction categories and an employer-share label in a subtraction template. Placeholder rates are explicitly examples, not actual rates. Correctness needs repair; no broad explanation pass. |
| `personal_1` / `development-personal-02` | Two complete answers, 9.26/6.48 seconds | Revises to one incident after correction; avoids legal claims. Invented project, contribution, document and commit details appear in the ready-to-use template. Material factuality failure plus excessive guide/script/checklist duplication. |
| `personal_concise_1` / same development case after targeted policy change | Two complete answers, 7.12/5.32 seconds | Output tokens fall from 2,301 to 1,179 across the two replies, but unsupported data-analysis and slide details remain. Single-incident correction retained. Still a material failure, not a repaired capability. |

Reported estimates: USD 0.00116310, 0.00163305 and 0.00091560 respectively;
actual billing remains unreconciled. Existing cumulative account cap remains USD 2.
Each attempt used a new permit, with no automatic retries. Completed/no-store
transport evidence does not imply answer correctness.

## Disposition and next useful step

The general policy now asks for a direct short answer, avoids duplicate sections,
uses Markdown and requires bracketed unknown facts in personal/workplace drafts.
The observed reduction in output is partial progress; it did not solve factuality.
This case has informed tuning and remains development/regression evidence only.
Reserved cases and their manifest were not changed.

G2 and G3 remain in progress. Before adding more prompt rules or expanding live
volume, compare maintained model/configuration options on the observed failures
using matched synthetic inputs and preserved evidence. Do not relax privacy,
correctness or human-review gates to accommodate a weak baseline. Do not infer
market competitiveness from request completion or a small curated success set.

## Matched candidate comparison and transfer check

The supplier's [public model catalog](https://api.tinfoil.sh/api/config/models)
returned HTTP 200 from Windows; its timestamped public receipt is preserved at
`.local/provider-model-catalog-20261005.json`. The [official model documentation](https://docs.tinfoil.sh/models/chat)
lists Gemma 4 31B. The catalog reported USD 0.40/M input, USD 1/M output and zero
request fee. This enabled a bounded candidate comparison without a new payment.
No model was promoted into operational qualification.

- `windows_20261005_personal_gemma_1`: same workplace prompts, answer policy and
  explicit limits as `personal_concise_1`, changed model/pricing only. Two replies
  completed in 4.49/2.97 seconds, 553 output tokens total. Uses bracketed unknown
  project/evidence details and preserves the single-incident correction. Some
  advice predicts interpersonal outcomes too confidently. Provisional acceptable
  outcome with a minor finding, pending human review.
- `windows_20261005_schedule_gemma_1`: new `development-planning-04` transfer
  case, not a matched repeat of the earlier presentation plan. Completes in
  2.43/1.59 seconds, 164 output tokens. Correctly identifies 60 remaining minutes
  after Wednesday is cancelled and asks for another 30-minute session. Initial
  self-check timing is not separately allocated; retain that review point.

One matched case and one transfer case do not prove superiority, stable latency
or competitive quality. Provider-default reasoning behavior was not normalized;
these compare the actual bounded configurations, not controlled model internals.
Combined candidate estimate is USD 0.00147220, actual charges unreconciled. Both
used fresh consumed claims and preserved full original results.

Reviewed profiles now have `agent-review-profile-20261005.json` sidecars linking
the original result hash, exact model settings and a configuration identity that
includes code, model, limits, prices and reviewed release pins. Earlier review
sidecars are preserved; profile-aware versions supersede their configuration field.
Future runner results record these settings/identity directly. This prevents
combining different models as if they were one evaluated configuration.

Validation: full suite of 111 unit/integration tests, eleven production browser
workflows, typecheck, build and fixture integrity passed. The subsequent profile-
identity change passed its new regression test, review-result tests and typecheck.
All 24 development cases were exercised offline; three distinct development cases
have live evidence in this batch. The 24 reserved cases remain untouched/unrun.
