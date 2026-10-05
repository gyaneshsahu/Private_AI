# Everyday capability and readable-answer batch — 5 October 2026

These fixed synthetic development conversations are separate from the 24 reserved
cases. Results are agent-reviewed observations, not final human grades, comparative
evaluation or provider qualification. Failed attempts remain in the evidence ledger.

## Live observations

All IDs below begin `windows_20261005_`. Each has a separate consumed permit and
result in ignored `.local/experiment-runs/`. No original record was overwritten.

| Case | Profile and result | Quality finding |
| --- | --- | --- |
| `writing_1` | Two complete replies at a 1,024-output-token limit; 3.45/1.73 seconds | Required workshop dates, times, deadline, free admission and notebook preserved. Revision replaces the old details; 92 → 63 whitespace-delimited words. No invented venue/link. Added pen, practical-skills/hands-on descriptions and supply-planning rationale were not supplied: unsupported embellishments, assessed as minor here, not ignored. |
| `planning_1` | First reply ended with `finish=length` at 1,024 tokens; second turn did not run | Incomplete answer and ambiguous extra self-check time; material failure. Partial output excluded from future context. |
| `planning_2` | Fresh attempt after general instructions changed; same task and 1,024-token cap. Again ended with `finish=length`; second turn did not run | Concision instruction alone did not repair the profile. Preserve as a second failure, not a successful retry. |
| `planning_3` | Separate 2,048-token profile, unchanged task and monetary cap; two complete replies at 7.15/6.73 seconds | Tuesday/Friday/Saturday correction, 19:00 starts and Saturday rehearsal retained. But original Tuesday activities total 31 minutes (3+5+8+10+5), not 30. The corrected plan's closing sentence places self-checks after the session, conflicting with the budget. Excess detail remains. Material planning-quality issue: not a task pass. |

The complete replies satisfy the independently verified no-store transport
assessment documented in [transport impact review](transport-impact-review.md).
The length-limited replies do not. Completion is not correctness, and increasing
the output limit did not fix scheduling accuracy or concision.

General instructions now emphasize concise answers, explicit length/time/budget
constraints and not inventing details in factual drafts. They remain guidance, not
a security boundary or a proven quality fix. Writing needs a fresh regression on
the updated policy; planning needs a new hypothesis and constraint-validation
approach before more paid probes. Do not repeat these unchanged cases indefinitely.

Reported token estimates for these four executions: USD 0.00037815, 0.00064665,
0.00065490 and 0.00136905. Actual billing remains unreconciled. The cumulative
account cap stays USD 2, including prior usage, with auto-recharge disabled.

## Product changes

- Conversation-first starters prepare editable writing/planning drafts without
  sending or overwriting existing input. Documents remain an entry workflow;
  research is accessible beside the composer and still requires disclosure review.
- Answers now render Markdown headings, emphasis, tables, lists, code and local
  display math using maintained `react-markdown`, GFM and KaTeX integrations.
  The renderer and math assets load when messages are displayed, rather than adding
  them to the initial workspace bundle. No CDN assets are used.
- Supplied-source citations still open the retained source snapshot. Unknown
  references remain text. External links stay inert; images are replaced by their
  labels. Raw HTML is escaped; only an exact inline `<br>` becomes a line break.
  Math trust is disabled and expansion/size bounded. Currency is not interpreted
  as single-dollar math; code fences remain literal.
- Automated checks cover malformed/untrusted content, citations, code/math/table
  rendering, and no external requests. The actual conversation UI is checked at
  desktop and 360-pixel widths, with long code scrolling inside its container.
  A local synthetic phone screenshot was visually inspected; it is not a real
  device study or a live privacy-qualified session.

## Next evidence

Planning remains an ordinary-quality blocker for that capability, not grounds to
weaken privacy checks or halt unrelated UI/reliability work. Broader everyday
quality, named comparators, real-phone observation and human review remain open.
The founder approved the [trial-quality floors](trial-quality-gate-proposal.md) on
5 October 2026. Reserved evaluation and human grading remain outstanding.

Validation: 102 unit/integration tests, ten production-build browser workflows, TypeScript, production build and fixture integrity passed. Dependency audit reported zero vulnerabilities at installation; this is not independent security assurance.

Follow-up: the [allocation-first planning batch](planning-intervals-review.md)
completed four additional bounded live turns. Interval arithmetic improved on the
original and transfer tasks; semantic self-check timing and concision remain open.
