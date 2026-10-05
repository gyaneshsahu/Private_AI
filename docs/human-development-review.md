# Founder development review — 6 October 2026

The founder supplied case-numbered scores and assessments in chat after receiving
the eight-conversation packet. These are human **development** judgments, not a
blind comparator study, reserved acceptance results or provider qualification.
Scores below preserve the submitted values exactly.

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
gate contribution. **Supplemental live execution is not yet wired into the permit
runner.** Do not pass these IDs as frozen development cases or modify the frozen
manifest to make them fit. The next harness extension must preserve set-specific
identity and separate coverage counts before a bounded live batch.

Next quality sequence: extend supplemental execution without touching held-out
cases; run the approved bounded uncovered Gemma development batch after current
price/balance checks; use one focused evidence-based planning repair cycle rather
than repeated prompt tweaking. Supplemental cases remain development/tuning data,
never replacement held-out evidence without an explicit separately frozen set.

General photograph/chart/scene understanding remains deferred and requires its
own capability/privacy decision. OCR success does not qualify general vision.
