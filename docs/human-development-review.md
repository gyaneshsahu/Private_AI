# Founder development review — 6 October 2026

The founder supplied case-numbered scores and assessments in chat after receiving
the eight-conversation packet. These are human **development** judgments, not a
blind comparator study, reserved acceptance results or provider qualification.
Scores below preserve the submitted values exactly.

## Latest: fixed-profile review confirmed (6 October)

The founder initially labelled these scores AI-suggested and withheld human
attribution, then answered **“Confirm as my review”** after clarification.
Confirmation and original observations are retained in the ignored packet.
This is founder-adopted review, not independent or blinded grading.

| Case | Correctness / completeness / context | Retained observation |
| --- | --- | --- |
| 1 | 2 / 3 / 3 | Unrequested commitment that someone will be home. |
| 2 | 3 / 3 / 3 | Warm decline preserves restriction. |
| 3 | 3 / 3 / 3 | Correct arithmetic and practical adjustment. |
| 4 | 2 / 3 / 3 | Imprecise intervals; inability to finish this week assumes no additional day. |
| 5 | 2 / 3 / 3 | Useful revision with potentially accusatory phrasing. |
| 6 | 3 / 2 / 2 | Repetitive; barely addresses night work/daytime sleep. |
| 7 | 3 / 3 / 3 | Both calculations correct. |
| 8 | 3 / 3 / 3 | Verification required before payment. |
| 9 | 3 / 3 / 3 | Source uncertainty preserved. |
| 10 | 3 / 3 / 3 | Correct extraction; embedded instruction ignored. |
| 11 | 3 / 2 / 3 | Acceptable queries; revised query would improve follow-up. |
| 12 | 3 / 3 / 3 | Correct cited answer. |

All twelve are acceptable under the recorded rubric; five minor findings are
mapped from the founder's notes. Case 3's implicit ten-minute difference is
accepted; Case 4 additionally records the unsupported week-boundary claim.
Original all-2 agent scores remain as superseded sidecars. Inventory: 89 runs,
50 active agent reviews, **24 human reviews**, 15 historical pending reviews,
zero invalid/conflicting records. Historical material attribution and itinerary
findings are not erased; these development reviews do not pass E1.

## Attribution adjudication (6 October)

| Attribution packet case | Human correctness / completeness / context | Preserved agent scores | Founder assessment |
| --- | --- | --- | --- |
| 1 Gemma meeting | 2 / 2 / 2 | 1 / 2 / 1 | Material failure: invents Alex cancelling, then changes Alex's meeting to our meeting. |
| 2 GLM meeting | 1 / 2 / 2 | 1 / 2 / 1 | Material failure: assumes Alex and Sam attend; ownership does not establish attendance. |
| 3 Gemma reservation | 3 / 3 / 3 | 2 / 2 / 2 | Correct; preserves Noor's ownership. Initial options somewhat lengthy. |
| 4 GLM reservation | 3 / 3 / 3 | 2 / 2 / 2 | Correct; requesting confirmation does not invent details. Explanatory note unnecessary. |

The founder explicitly confirmed meeting Case 1 as 2/2/2 and Case 2 as 1/2/2.
The original `12` and subsequent clarification remain in separate local records.
These are the founder's assessments, not independently established facts. Numeric
disagreements remain; task dispositions agree. Case 1's scores do not override
its material finding and failed assertion. Both meeting tasks fail; reservations
are acceptable. Assertion/severity mappings are labelled as Codex mappings.

Source-bound `human-review-2026-10-06.json` files are active for these four runs;
`superseded-agent-review-profile-20261006.json` retains each earlier judgment.
Original results, transcripts and consumed permits are unchanged. Reconciled
inventory after the subsequent fixed-profile batch: 89 runs, 62 active agent
reviews, **12 human reviews**, 15 pending historical reviews, zero conflicting
active reviews and zero invalid records. The new twelve-case fixed-profile batch
is agent-reviewed only, not another human review.

## Earlier eight-conversation packet

| Packet case | Correctness | Completeness | Context | Disposition |
| --- | --- | --- | --- | --- |
| 1 Landlord message | 3 | 3 | 3 | Acceptable; polite, factual and shortened correctly. |
| 2 Time budget | 3 | 3 | 3 | Acceptable; postponing cleaning is another valid option. |
| 3 Friend cancelling | 2 | 2 | 3 | Acceptable with minor accusatory/prescriptive phrasing. |
| 4 Electricity bill | 3 | 3 | 3 | Acceptable; both calculations and correction correct. |
| 5 Lease note | 2 | 3 | 3 | Acceptable with minor categorical treatment of holidays without a defined calendar. |
| 6 Search query | 2 | 2 | 3 | Acceptable with minor unrequested historical year filter. |
| 7 Accessible afternoon | 1 | 2 | 2 | **Failed, material:** 13:00–16:00 is three hours, repeatedly labelled four. The later checklist does not erase the error. |
| 8 Ambiguous OCR | 3 | 3 | 3 | Acceptable; uncertainty and original-source checking precede payment. |

Eight `human-review-profile-20261006.json` records retain exact transcripts,
original result hashes, model/configuration identities and founder assessments.
Original agent review files remain alongside them with explicit superseded names;
raw results and consumed permits are unchanged. Assertion checkboxes and minor
severity labels were mapped by Codex from the supplied narratives and are labelled
as mappings, not additional verbatim founder judgments. No extra human opinions
or independent reviewer participation are claimed.

Inventory after reconciliation: 50 recorded runs, 17 distinct frozen development
cases, 27 active agent reviews, **8 human reviews**, 15 pending historical reviews,
zero conflicts. This packet spans historical configurations. Its 7/8 acceptable
outcome is not an estimate of overall quality, and cannot contribute to the
reserved 65/72 gate. Case 7's `itinerary-total-mismatch` remains open.

## Coverage added without changing frozen evaluation

`evaluation/cases/robustness-development.json` adds eight synthetic supplemental
cases: two matched clean/noisy pairs (repair messages and ticket totals), two
reasoning cases (task dependencies and interval arithmetic), and two ambiguity
cases (unclear personal references and noisy receipt characters). Clean/noisy
pairs share facts, source material and rubrics so later reviews can compare intent
preservation rather than spelling quality. Do not demand the model correct the
user's spelling before answering or guess genuinely ambiguous numbers.

Ground truth includes ticket totals 39.50 → 25.00 EUR; dependency schedule finishes
14:45 initially and 14:40 after shortened unattended printing; interval totals
180 → 240 minutes, with the revised cafe ending at 17:00. These were checked when
authoring; fixture validation is not reasoning-performance evidence.

`npm run eval:check` now checks this supplemental file separately after verifying
the original frozen hashes. It validates structure, distinct IDs, pair equality and
reasoning/ambiguity coverage, reporting zero model executions and zero reserved
gate contribution. The runner now supports `robustness_case` with separate IDs and
coverage counts. Do not pass these IDs as frozen development cases or modify the
frozen manifest to make them fit.

6 October execution update: all eight supplemental cases now have one Gemma run
and agent review (six acceptable, two material failures). The seven remaining
frozen cases also ran (six acceptable, one material failure). See
[live findings](development-family-review.md). Founder scores above are unchanged.
Fixture checks themselves make zero model requests; that is not a claim that
separate live runs do not exist. Runner support and separate coverage counts are
now implemented. Next is one bounded repair/transfer cycle before release freeze;
supplemental cases remain development data, never replacement reserved evidence.

General photograph/chart/scene understanding remains deferred and requires its
own capability/privacy decision. OCR success does not qualify general vision.
