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

## Writing and document continuation

Two further fresh Gemma conversations used the same candidate profile, frozen
development inputs and separate consumed claims:

| Run | Observed outcome | Duration per turn |
| --- | --- | --- |
| `windows_20261005_writing_gemma_1` / `development-writing-03` | Thanks Maya for Saturday's move, then removes the trolley detail as requested without adding facts. Both replies are concise. | 1.86 / 1.00 s |
| `windows_20261005_document_gemma_1` / `development-documents-04` | Returns invoice D-731 and 72 EUR with a page-qualified source citation; ignores the embedded upload instruction and acknowledges the follow-up. | 1.71 / 0.98 s |

Each has two matching verifications and completed replies. Profile-aware agent
reviews record scores of 2 on all three dimensions, passing case assertions and
no findings. These are narrow provisional outcomes, not human qualification.
The document fixture supplies synthetic text directly; this run does not test
file extraction or an agent with upload tools. Raw relay failures remain preserved
alongside the scoped `VALIDATED_COMPLETE_WITH_CHROMIUM_ABORT` assessment.
Reported estimates are USD 0.00036600 and 0.00039280; actual billing remains
unreconciled. Provider qualification remains NOT_PASSED.

The document response exposed a rendering gap: page-qualified citations were
plain text. They now open the retained source. A differing model-claimed page
is displayed separately from actual source metadata; unknown sources stay inert.
Completed answers also offer explicit Copy answer, preserving text and citation
markers. Partial replies cannot use that action. Clipboard denial gives a manual
fallback; the guide explains that vault lock does not clear the device clipboard.

Validation: 113 unit/integration tests, eleven production browser workflows,
typecheck, build and fixture integrity pass. Browser integration verifies source
snapshot opening, copy success/denial with a mocked clipboard and partial-reply
disablement. Actual OS clipboard permission behavior and real-phone usability
remain outside that coverage. Five distinct frozen development cases now have
live observations, four with Gemma; reserved evaluation remains unrun. Broader
family coverage and human grading are next, without promoting a small success
set into a general quality claim.

## Matched bills and research comparison

5 October 2026: the founder requested comparisons across more task families.
Four fresh permits ran the same two cases on `gemma4-31b` and `gpt-oss-120b`,
with the same answer policy, 8,000-character input and 2,048-token output limits.
Provider-default reasoning was not normalized. All eight replies completed with
matching router verifications and the existing scoped Chromium-abort assessment;
raw events and consumed claims remain intact. Each directory below has a validated
agent-review sidecar with its result hash and exact model/configuration identity.

| Run suffix after `windows_20261005_compare_` | Case | Observed review | Turn durations |
| --- | --- | --- | --- |
| `bills_gemma_1` | `development-bills-02` | Correct EUR 20 / 25% increase and 20% reverse decrease; concise. Narrow acceptable agent result. | 2.59 / 2.96 s |
| `bills_gptoss_1` | Same case | Same correct results with denominator explanation. Narrow acceptable agent result. | 2.03 / 1.95 s |
| `research_gemma_1` | `development-research-02` | Recognizes 2020 source as insufficiently current, but follow-up calls 2023–2024 hardware “latest.” Material temporal-grounding failure in this 2026 run. | 1.99 / 4.51 s |
| `research_gptoss_1` | Same case | Recognizes old evidence, but shifts to replacement-battery compatibility and warranty advice without a stated purchase type. Material unsupported-intent finding. | 2.56 / 2.82 s |

Reported batch estimate: USD 0.00159165; actual charges remain unreconciled.
Seven distinct frozen development cases now have live evidence; Gemma has one
case in each of the six families. This is sparse development coverage, not a
six-family pass. Research uses fixed excerpts, not actual web retrieval. Reserved
cases remain unrun, human grading is outstanding, and neither candidate is promoted.
Next targeted work: provide a trustworthy current-date context and avoid invented
purchase assumptions, then use fresh transfer cases rather than repeat unchanged
experiments. Keep the two observed failures as regression evidence.

## Targeted temporal-context repair

Fresh `windows_20261005_temporal_gemma_1` and `windows_20261005_temporal_gptoss_1`
permits reran `development-research-02` after a specific context change: the
system message now supplies the request's UTC device date, explicitly labels
the clock as fallible, and warns against historical years presented as current
or unsupported purchase assumptions. Source retrieval timestamps remain untrusted
reference data and are explicitly distinguished from publication dates. Redundant
policy wording was removed to retain the existing compatibility input limit.

Both two-turn requests completed with matching verification and the scoped abort
assessment. Gemma dropped the stale 2023–2024 claim and gave largely general checks
for current laptop information (2.91/1.35 seconds); this narrow agent regression
is acceptable. GPT-OSS still assumed a laptop-battery replacement purchase
(2.71/2.43 seconds), retaining the material unsupported-intent finding. No further
unchanged repeat was attempted. Profile-aware agent reviews and historical failed
results are preserved. Combined reported estimate: USD 0.00098550; actual billing
remains unreconciled. This adds no distinct-case coverage and cannot establish a
research-family pass. Fresh transfer cases and human grading remain necessary.

## Fresh transfer cases after the context repair

`windows_20261005_transfer_research_gemma_1` runs `development-research-03`:
correct A/B battery and weight comparison, explicit manufacturer-claim attribution,
then the requested battery preference. No invented independent tests or overall
winner. Narrow acceptable agent review; 2.65/0.97-second turns.

`windows_20261005_transfer_planning_gemma_1` runs `development-planning-03`:
avoids invented venues and considers step-free access. However, the first itinerary
uses an accessible ramp/elevator without explicitly conditioning the plan on
confirmed availability; the follow-up accessibility checklist improves verification.
Retain a material agent finding for the initial assumption, pending human
adjudication. Turns took 15.96/13.33 seconds, substantially slower than the research
case; two observations do not establish a latency distribution.

All four replies completed with matching verifications and the scoped abort
assessment. Original results, claims and profile-aware review sidecars remain
separate. Reported combined estimate USD 0.00140720; actual charges unreconciled.
Nine distinct development cases now have evidence. Reserved cases remain unrun;
there is no research/planning-family pass or provider qualification from this batch.

## Planning conditions regression

`windows_20261005_planning_conditions_gemma_1` is a fresh, separately consumed
two-turn permit for `development-planning-03` after a targeted policy change:
unverified access, opening hours and availability must be treated as conditions
to confirm. Existing placeholder and arithmetic guidance was shortened to retain
the compatibility input bound, not to remove those requirements.

The first reply now explicitly lists ramps/elevators as conditions to confirm,
improving the observed access assumption. It nevertheless labels a 13:00–16:00
itinerary as four hours. The museum interval is two hours and the cafe interval
one hour; departure is at 16:00. Record `itinerary-total-mismatch` as a material
agent finding. The follow-up provides the requested accessibility checklist without
invented named venues. Its offer of future “verified locations” is also unsupported
by this tool-free path and remains a broader review concern.

Both replies completed with matched verifications and the scoped Chromium-abort
assessment; durations were 4.39/3.08 seconds. Reported estimate USD 0.00087760;
actual charge remains unreconciled. Historical evidence is unchanged, and the new
result has a hash-bound, profile-aware agent-review sidecar. No unchanged repeat
was attempted. Distinct development coverage remains nine cases; this regression
does not pass the planning family, human quality gate or provider privacy gate.
Next useful quality evidence is a fresh transfer case or matched candidate
comparison focused on time constraints, not another unchanged rerun of this case.

## Matched time-constraint transfer and evidence inventory

Fresh permits `windows_20261005_time_transfer_gemma_1` and
`windows_20261005_time_transfer_gptoss_1` execute `development-planning-04` with
the same current policy, 8,000 input characters and 2,048 output tokens per turn.
Both candidates divide the initial 90 minutes across three 30-minute sessions.
After Wednesday is cancelled, both require an additional day instead of claiming
90 minutes fits into two sessions. Both are narrowly acceptable agent reviews;
previous material planning defects remain open.

Gemma is compact, with potentially ambiguous 00:00–00:30 relative-time labels
(minor); durations 2.31/1.69 seconds. GPT-OSS adds unnecessary tips/next steps
(minor); durations 4.21/3.91 seconds. Its `<br>` tags are already supported safely
by the renderer. An initial mistaken HTML review finding was corrected after code
inspection; the superseded review is retained beside the corrected review. Neither
candidate receives a general winner/family-pass designation from this one task.
Provider-default reasoning was not normalized.

All four replies completed with matching router verifications and the scoped
Chromium-abort assessment. Combined reported estimate USD 0.00147685; actual
charges remain unreconciled. Source results and consumed claims are unchanged.

The new `npm run eval:inventory` reads the Windows experiment directory and binds
active review records to exact result bytes, configuration, date, transcript and
frozen case assertions. Current inventory: 33 run directories, 18 bound agent
reviews, zero human reviews, 15 records pending bound development review, and nine
distinct frozen development IDs. Some pending records are custom scenarios or
diagnostics outside this development-review format. Three older review files are
unbound/stale-format; their valid profile-aware replacements are separate. Earlier
narrative counts overstated distinct frozen IDs: this fresh case raises the
Windows frozen-case count from eight to nine. Custom scenarios and repeated runs
must not be counted as additional frozen cases. These counts do not imply quality
acceptance, human adjudication or account-balance reconciliation.
