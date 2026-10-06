# Unsupported additions in drafting

6 October 2026 · E1/G1 · Development diagnosis; no acceptance threshold change.

The four reserved priority answers contain material unsupported additions. The
purchase drafts add commitments; the extension drafts add a reason. Follow-up
corrections do not erase the original failures. These are answer-quality failures,
not observed privacy leaks. Preserve the original evaluation and consumed permits.

**Founder clarification received:** the four scores were the founder's own review,
expressed through an AI prompt. They are now source-bound human sidecars; original
proposed records and differing agent grades remain preserved. All four tasks fail,
so writing can score at most **8/12** and **fails the 10/12 requirement**. The
remaining 68 reviews cannot reverse that family failure. No fresh acceptance run
may reuse this exposed set after it informs configuration changes.

Historical provenance: initially recorded as **AI-proposed**, unconfirmed scores: 1/3/2, 1/3/2, 1/3/1,
1/3/1. They are recorded with original findings and result hashes in
`.local/review-batches/reserved-priority-20261006/user-proposed-ai-scores.json`.
Original agent grades remain 1/2/1 for each; the completeness/context disagreements
are retained. No human grades were added. Both sets imply failed tasks. If human
adjudication confirms these four failures, writing can score at most **8/12**,
below the unchanged **10/12** requirement. Current release disposition is
**NOT_PASSED**, independently of whether the remaining answers are acceptable.

## Diagnosis using existing development evidence

`windows_20261006_fixed_writing_01_gemma_1` adds a promise that someone will be
home when arranging a heater repair. The user only asked for an appointment.
Its human-confirmed 2/3/3 and minor disposition remain unchanged; the recurrence
is informative without retroactively rewriting the grading contract.
`windows_20261006_fixed_writing_04_gemma_1` preserves the supplied dinner-decline
reason and restriction on offering another date. Therefore the failure is not
universal drafting corruption. Meeting attribution evidence also shows unsupported
relationship assumptions; both Gemma and the limited GLM comparison had failures.

Offline reconstruction checked these two development cases plus the four exposed
reserved failures. For each, historical `src/conversation.ts` bytes match current
policy after newline normalization; the first user prompt is retained exactly,
the context fits its configured bound, and anti-invention instructions are present.
The shared client passes `composeContext` messages into the inference request;
the harness accumulates streamed answer text without adding drafting commitments.
Evidence: `.local/writing-context-audit-20261006.json` (six contexts).

This reconstruction is not a captured historical wire payload. The strongest
supported diagnosis is **model instruction-following weakness**, with no identified
application insertion/truncation defect explaining these sentences. Do not label
it conclusively isolated or fixed. Adding another near-duplicate policy sentence
would not demonstrate general improvement; regex deletion risks altering legitimate
user commitments and is not an appropriate semantic repair.

## Bounded next decision

Compare four fresh writing development fixtures on Gemma and one justified alternative
configuration, using the same application policy and input/output bounds. GLM is
available through the existing provider but is a comparison candidate, not an
assumed upgrade: its attribution failure stays open. Inspect its current price,
remaining account budget and worst-case token bound before allocating fresh permits.
Use `evaluation/cases/writing-transfer.json`: undecided studio enquiry, withheld
volunteer reason, library reservation ownership and an authorized bike-repair
commitment control. These are exposed development questions, not held-out cases.
Use one execution per model/conversation, no automatic retries, and judge both
turns for supplied facts, intent, commitments and invented reasons. A writing gain
must subsequently survive broader family coverage on the same configuration.

Do not re-run the exposed reserved tasks as acceptance evidence. If these findings
guide a model/policy change, retain them as regression examples and establish a
fresh, predeclared held-out set before the next acceptance assessment. Finish
adjudicating the preserved assessment separately; do not lower its threshold,
pool configurations or remove writing from the general-assistant goal.

This batch performed offline diagnosis, not a new live comparison. Provider chain,
search eligibility, actual-host validation and real-device usability remain
independent blockers. No new privacy promise or automatic corrective inference
step has been introduced.
