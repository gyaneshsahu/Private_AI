# Bounded Gemma evaluation and first human review

5 October 2026 · E1/G1–G6 · No change to acceptance thresholds or general-assistant scope.

## Human work available now

**Collection complete, 6 October:** all 72 reserved conversations returned both
answers: **144 attempts, 144 completed replies and 144 matching verifications**,
12 conversations per family on one frozen configuration. All have accounted
usage and the existing scoped Chromium completion assessment; raw observations
and consumed permits/slots remain preserved. No retries or tuning. Estimated
batch usage **USD 0.07035160**, cumulative local estimate **USD 0.13313805**.
Post-run dashboard shows USD 0.87 balance, USD 0.13 rounded period spend,
312 requests (144 more), USD 2 limit and auto-reload off. This corroborates the
batch within dashboard precision; exact per-run charges remain unreconciled.
Observed turn durations were 1.39–29.77 seconds, not a production latency SLA.

**Review four conversations first:**
`.local/review-batches/reserved-priority-20261006/review.html` contains writing-01
repetitions 1–2 and writing-02 repetitions 1–2. The full 72-conversation packet is
`.local/review-batches/reserved-full-20261006/review.html`. Both keep human grades
blank and agent scores hidden. Source/transcript binding, navigation and 1280/360
pixel layouts passed with zero external requests. Human reserved grades: **zero**;
the quality gate is **NOT_PASSED / human adjudication required**, not an execution
success converted into answer-quality success.

Inventory: 161 runs, zero invalid/conflicting active records, 54 agent reviews,
24 human development reviews and 83 pending records (15 historical, 68 reserved).
The other four reserved records have agent triage only. Local plan, progress and
summary are `.local/reserved-{plan,progress,summary}-20261006.json`.

**Reserved assessment:** frozen configuration
`7e7c7d8d1d18f389d80d4400e9ce8b46f8a2ae51d279b12a5e097701356e48e5`
at validated commit `bbb802e`, with unchanged model/prompt/output policy. The
predeclared plan uses 24 cases × three repetitions, each with a fresh consumed
permit and reserved slot. Allocation USD 0.40 within the existing USD 2 cumulative
cap; fresh pre-run dashboard showed USD 0.94 balance, USD 0.06 rounded spend,
168 requests and auto-reload off. Before every conversation, the sequential
controller reserves USD 0.029696 plus recorded spend against that allocation.
The theoretical full-batch maximum is USD 2.138112, so completion is conditional
on actual accounted usage fitting the smaller allocation. It never preauthorizes
that theoretical maximum, runs concurrent requests or retries failed slots.

Targeted agent triage finds material failures in writing-01 repetitions 1–2
(unrequested purchase commitment) and writing-02 repetitions 1–2 (invented
personal circumstances). Later corrections do not erase initial failures.
These four have source-bound agent sidecars; human adjudication is pending.
If confirmed, writing can reach at most 8/12, below the approved 10/12 floor,
regardless of results elsewhere. Do not claim a pass, tune these reserved cases,
or silently narrow writing out of the general-assistant scope. If failures drive
model/prompt changes, treat exposed cases as regression evidence and establish
fresh held-out evaluation for subsequent release claims.

**Latest:** the founder explicitly confirmed the twelve fixed-profile scores as
their own review after initially withholding confirmation. All twelve are
acceptable, with five minor findings and original agent disagreements retained.
See [confirmed scores](human-development-review.md). Do not repeat this packet.

Select `gemma4-31b` with explicit thinking, the unchanged answer policy and
8,000-character/2,048-token bounds for reserved assessment. It has consistent
six-family development evidence and confirmed human review; GLM failed the same
meeting attribution case without demonstrating broader advantage, and GPT-OSS
has unresolved task-critical findings. This is a bounded trial-candidate choice,
not competitive superiority or provider qualification. Attribution remains an
isolated material development finding; it is not silently repaired or excused.
Apply the approved recurrence/severity rules to reserved results, and escalate
any recurring/serious failure rather than tuning reserved examples.

The newly required reserved harness changes implementation identity, but not
the prompt, model, thinking mode or production reply path. Freeze its validated
hash before execution; do not pool prior hashes into the reserved score.

**Adjudication received, 6 October:** the founder confirmed meeting Case 1
**2/2/2** and Case 2 **1/2/2**, retaining material-failure findings for both.
Reservation Cases 3–4 are **3/3/3**. Original submission (including Case 2's
initial `12`), explicit clarification and all agent sidecars are preserved locally.
Human grades differ from agent grades: agent meetings were 1/2/1 and reservations
2/2/2. Task dispositions agree: material meeting failures and acceptable reservation
answers. A 2/2/2 score does not override a failed assertion or material finding.
The founder calls these assessments, not objective facts. Source-bound human
sidecars record exactly that distinction; none contributes to the reserved gate.

## Fixed-configuration broader development assessment

Selected for assessment: `gemma4-31b`, `gemmaThinking=true`, unchanged simplified
answer policy, 8,000 input characters and 2,048 output tokens. Configuration hash
`8cf9070e4303942f9e3792fc7414d1dccfdc71a0b6e9741582019255ab0ea65c`.
This is an assessment freeze, not a release selection. GLM's two selected cases
do not demonstrate an advantage sufficient to replace the better-covered Gemma.

Predeclared set: `development-<family>-01` and `development-<family>-04` in each
of writing, planning, personal, bills, documents and research: **12 conversations /
24 requests**, one execution each. This evaluates one configuration across six
families; earlier omitted-thinking runs are not pooled into its score. Retain
the adjudicated meeting failure as an outstanding limitation. No prompt repairs
or repeated meeting probe during this assessment. Reserved fixtures stay untouched.
Research cases use supplied excerpts/query drafting, not a live research integration.

Fresh dashboard: USD 0.95 available, USD 0.05 rounded period spend, USD 2 limit,
auto-reload off, 144 prior requests. Current official catalog confirms input
USD 0.40/output USD 1 per million tokens and zero request fee. Conservative input
bound of four bytes per character plus maximum output gives USD 0.356352 for 24
requests; allocation **USD 0.40 within the existing cumulative USD 2 cap**. The
initial USD 0.15 preparation allocation was corrected before execution. Billing
can lag and in-flight requests can exceed the dashboard limit; run sequentially.
Stop on incomplete/unknown accounting, verification/transport failure or a new
serious quality finding. Fresh claims only, no automatic retries. Local manifest:
`.local/fixed-profile-batch-20261006.json`.

Release selection and the reserved batch require this broader evidence to support
the same configuration and the retained material findings to be adjudicated under
the approved gate. Provider/privacy, live research and actual-host/device checks
remain independent requirements.

**Execution complete:** all twelve conversations / 24 replies completed. Agent
review finds 12/12 narrowly acceptable with five minor findings. This is not human
acceptance or broad quality evidence; the adjudicated meeting failure remains.
[Per-family findings](development-family-review.md) record USD 0.01181480 estimated
batch usage; actual billing is unreconciled. Reserved evaluation remains unrun.

Next human packet: `.local/review-batches/fixed-profile-20261006/review.html`.
Review four conversations at a time, all on the same configuration, with agent
scores hidden. Preserve disagreements, including the implicit ten-minute planning
excess and uneven personal wording. This is the useful next human action before
release selection. Do not repeat the completed attribution review or tune examples.

## Previous review preparation (historical, completed)

**Attribution packet preparation, 6 October:** four retained conversations were prepared in the
Windows-local ignored folder
`.local/review-batches/attribution-20261006-653a930a-3185-4d9a-8846-82ab2322d29f/review.html`.
Cases 1–2 are the meeting-reference task with explicit-thinking Gemma and GLM low
effort; cases 3–4 are the reservation transfer with those models. Read both turns,
score correctness/completeness/context 0–3 and identify any error/severity. Reply
with case numbers in chat; no JSON editing is needed. Scores remain blank and
human adjudication was pending at preparation and is now recorded above. This selected, unblinded development packet
does not establish model ranking or replace the reserved quality gate.

All four exact transcripts and source SHA-256 bindings were verified. Browser
checks passed at 1280 and 360 pixels, with working case navigation and no external
requests. Original results, permits and active reviews remain unchanged.

Repeated observations of one fixture across model/configuration changes do not
count as two distinct conversations under the approved recurrence rule. Human
adjudication must distinguish an isolated ordinary material miss from a serious
task-critical error; do not redefine thresholds or erase historical failures.
Use the resulting decision to justify the next bounded development assessment,
instead of another prompt-tweak loop. The founder has completed this review;
its procedure is retained here, separate from later real-device testing.

**6 October update:** the founder completed this packet. Eight human development
reviews are recorded, with Case 7 failed for material arithmetic error. See
[scores, provenance and supplemental coverage](human-development-review.md).
The preparation instructions below remain as the packet's historical procedure;
the founder does not need to repeat this review.

An ignored local packet at
`.local/review-batches/first-human-review-20261005-a9d4560a-94ed-4c19-b792-ced3849037b9/`
contains `review.html`, `worksheet.md`, a source-hash/configuration manifest and
eight deliberately unscored JSON drafts. These files are Windows-local; a fresh
clone will not contain them. Original experiment results and permits are unchanged.

Two sittings of four conversations, approximately 15–20 minutes each (take longer
if needed). The first six are the Gemma `coverage_<family>_gemma_1` runs, in writing,
planning, personal, bills, documents and research order. The final two are
`planning_conditions_gemma_1` and `ocr_guard_gemma_1`, all with the original
`windows_20261005_` prefix. This is an intentionally selected development sample,
not a random, blinded or held-out comparative evaluation. Historical configurations
are recorded separately and must not be pooled as one release configuration.

Read both turns and any source excerpt. Score correctness, completeness and context
0–3; 2 means acceptable. Mark each mandatory assertion yes/no with evidence. Quote
any failure and classify minor/material/critical, with serious errors separate.
The packet hides agent judgments but retains exact transcript/source/configuration
identity. A later correction does not erase an earlier bad answer. The founder can
return case-numbered notes in chat rather than editing JSON; record their actual
judgments and validate the resulting grades without inventing missing decisions.

This was the first useful human action and is complete. Real-device observation follows a validated
hosted synthetic workflow; neither replaces full provider qualification. Eight
development reviews cannot pass the 72-execution reserved gate.

Packet verification passed: all eight source SHA-256 bindings and exact transcripts
match original results; reviewer names/scores remain blank. Chromium checks at
desktop and 360-pixel width found no horizontal overflow, confirmed case navigation,
and observed no active embedded content or outbound requests. Fixture integrity
and the evidence inventory remain unchanged (17 distinct cases, zero human grades).

## Completed development batch (6 October)

Candidate: `gemma4-31b`, current fixed answer policy, 8,000 input characters and
2,048 output tokens per request. No repeated prompt tuning during the batch.
The following seven previously uncovered cases are now executed and agent-reviewed:
six acceptable, personal-03 failed for invented personal reasons after an explicit
privacy preference. Supplemental coverage also completed: six of eight acceptable.
See [results](development-family-review.md). Do not rerun this table unchanged; it
remains the original batch definition.

Cases:

| Family | IDs |
| --- | --- |
| Writing | `development-writing-02`, `development-writing-04` |
| Personal | `development-personal-03`, `development-personal-04` |
| Bills | `development-bills-03` |
| Documents | `development-documents-02` |
| Research | `development-research-04` |

At most seven conversations / 14 inference requests, each with a fresh consumed
permit and separate result. Working allocation **USD 0.10**, within—not added to—
the existing USD 2 cumulative account cap. Recheck current pricing and dashboard
remaining balance before minting permits; account cap/autorecharge controls remain
mandatory. Local record estimate USD 0.02658425 is not authoritative billing.
Validate each fixed fixture's actual composed input against the bound beforehand.

Stop the batch on incomplete/unknown accounting, verification/transport failure,
an unexpected charge, or a serious new quality failure discovered during review.
Do not retry blindly or continue spending simply to fill a table. Existing serious
GPT-OSS findings remove it from this next batch, without asserting broad Gemma
superiority. No operational model is promoted.

## Planning and release freeze

**6 October disposition:** the one prompt-repair cycle has now run. It did not
resolve planning contradictions or ambiguous personal roles. A separate explicit
thinking configuration comparison returned acceptable answers on two planning
cases, but still failed attribution. See [exact outcomes](development-family-review.md).
No further prompt-rule iteration is planned. Candidate freeze remains blocked;
the subsequent GLM-5.3 low-effort comparison also failed attribution. Both candidates
handled a new reservation transfer; explicit-thinking Gemma produced one acceptable
itinerary regression. Adjudicate the retained attribution findings and justify any
broader candidate assessment before release selection. The earlier itinerary
failure and human review obligations remain recorded and open.
The instructions below preserve the original repair bounds, not a renewed retry.

Gemma's itinerary arithmetic is unresolved. Review the full conversation and
requirements first. If evidence identifies a concrete repair, allow one focused
repair cycle followed by the affected development regression and one independently
specified synthetic transfer case (at most four requests, separately budgeted up
to USD 0.03). Do not change the frozen held-out set or keep adding prompt rules
after another failure. Continued task-critical planning failure blocks a release
freeze; escalate candidate/scope options rather than claim the family passed.

Freeze an exact candidate/configuration only after development failures and human
adjudication support doing so. Then prepare the existing 24 held-out cases × three
repetitions (72 conversations) as a separate execution/review batch with a fresh
cost forecast against actual remaining funds. **Do not execute the reserved batch
in this preparation step.** Preserve the approved 65/72 overall, 10/12 per-family,
critical/serious and recurring-material-failure rules. Never spend beyond USD 2 or
use private data to fill an evaluation gap. Competitive ChatGPT/Gemini claims still
need the later named-comparator and broader evaluation work in the roadmap.
