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
are retained. Four human grades were subsequently added following clarification.
Both sets imply failed tasks. Current release disposition is
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

## Fresh comparison completed

Executed four fresh writing development fixtures on Gemma thinking and GLM low,
using the same unchanged application policy and 8,000-character/2,048-token bounds.
GLM is a comparison candidate, not an assumed upgrade; its attribution failure
stays open. Current catalog prices and dashboard balance were verified first.
`evaluation/cases/writing-transfer.json` covers undecided studio enquiry, withheld
volunteer reason, library reservation ownership and an authorized bike-repair
commitment control. These are exposed development questions, not held-out cases.
Eight conversations / sixteen replies and matching verifications completed, once
per model/case. Agent assessment: **4/4 narrowly acceptable for each model**;
this is not a human review, broad success rate or repair of the prior failure.
Gemma preserved undecided intent, withheld reasons, reservation ownership and the
intentional commitment; it added an unsupported pronoun for Mira. GLM also passed
mandatory outcomes, but added locality/enthusiasm and a promise to check with Mira;
its casual revision did not explicitly address the library team. These are retained
minor findings, not maximal grades. No evidence here establishes GLM superiority.

Keep **Gemma with thinking enabled as the fixed development candidate**, unchanged
answer policy and bounds. Do not promote it to a trial release or rerun reserved
acceptance to make the known failure disappear. GLM remains an alternative; broader
comparison needs a concrete hypothesis beyond repeatedly rephrasing this defect.

Source commit `a1c87ec`; Gemma configuration
`5ecdbaf658c86c7c985faadd509356b0b44c8153ac0964a699ce06c81f630642`, GLM
`e7e694102845564ff9e905d5fc7d849c572804a65c8e2c93e4d1ec7ca9a4e521`.
Identity changes from the reserved run reflect added harness fixtures, not prompt
repairs. Do not pool the two configurations into one acceptance score.

Batch estimate USD **0.01276740**, cumulative local estimate **0.14590545**.
Post-run dashboard: USD 0.85 balance, USD 0.15 rounded period spend, 328 requests,
USD 2 limit and auto-reload off. Exact per-run actual charges remain unknown.
All runs retain the established scoped Chromium completion assessment and raw
network events. Fresh claims/evidence: `.local/experiment-runs/windows_20261006_fresh_writing_*`.
Unscored human packet: `.local/review-batches/fresh-writing-20261006/review.html`;
eight exact transcript/source bindings, navigation and 1280/360 layouts passed
with zero external requests. Review is useful but does not block independent work.

Do not re-run the exposed reserved tasks as acceptance evidence. If these findings
guide a model/policy change, retain them as regression examples and establish a
fresh, predeclared held-out set before the next acceptance assessment. Finish
adjudicating the preserved assessment separately; do not lower its threshold,
pool configurations or remove writing from the general-assistant goal.

Provider chain,
search eligibility, actual-host validation and real-device usability remain
independent blockers. No new privacy promise or automatic corrective inference
step has been introduced.
