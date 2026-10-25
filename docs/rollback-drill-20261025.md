# Rollback drill checklist (launch plan 7.8) — prepared 25 October 2026

Status: PREPARED, not run. The owner performs every step at the Render dashboard and on their own laptop; the agent only prepared this list and records the result in `docs/READINESS.md` as owner-reported. The written procedure is section 5 of the private hardening record (`docs/private/hardening-20261024.md`); this file is the run sheet for it.

## What the drill does

Roll the live service back one release and forward again, measuring how long each direction takes and that the service is usable after each. There is no database step: migrations 0013 and 0020 only add tables, so both releases run on the current schema. Do not touch secret files, the Pre-Deploy Command (stays empty), Auto-Deploy (stays Off) or the Dockerfile Path (`Dockerfile.render`).

| Role | Commit | Full SHA | Note |
|---|---|---|---|
| Live now (A) | `7e30333` | `7e30333fba4cc645c51ba527e00f96bb7ac86d3d` | probe headers in the app; `/healthz` still without the fixed headers (bridge fix is `dac6cd5`, not yet deployed) |
| Rollback target (B) | `f0cc0ba` | `f0cc0bab6ffc76a2675faa24d42612678fa4b777` | identity filled; neither probe endpoint carries the fixed headers |

If `dac6cd5` has been deployed before the drill runs, A is `dac6cd5a173f62598d8224a3fad4ae1a8ddda024` and B is `7e30333…`; the checks below then expect every header row `ok` on A.

## Expected readings per release

| Check | Command (laptop, read-only) | On B (`f0cc0ba`) | On A (`7e30333`) |
|---|---|---|---|
| readyz | `curl -sS -o /dev/null -w "%{http_code}\n" https://app.cometrow.com/readyz` | 200 | 200 |
| healthz | `curl -sS -o /dev/null -w "%{http_code}\n" https://app.cometrow.com/healthz` | 200 | 200 |
| headers | `node scripts/check-headers.mjs https://app.cometrow.com` | `/readyz` and `/healthz` rows not ok, every other row ok | `/readyz` rows ok, `/healthz` rows not ok, every other row ok |
| sign-in | browser: Google sign-in with the allowlisted owner identity, workspace opens, sign out | works | works |
| account page | browser: open the account page while signed in | loads; usage shows unavailable or no active plan (no subscription configured) | same |

A 503 on readyz means the schema or the database role does not match that release: stop, read the service log, do not roll back further than `4eb86b1`, do not reset the database.

## Steps (owner)

Record a clock time (UTC, to the second if the dashboard shows it) at every line marked ⏱.

1. **Before.** Events page of service `private-ai-deployment`: confirm the live deploy shows SHA A. Run the five checks above once and note the readings (baseline). ⏱ T0 = time you click Deploy in step 2.
2. **Roll back.** Manual Deploy → Deploy a specific commit → paste full SHA B → Deploy. (Alternative with the same effect: Events → the earlier successful deploy of B → Rollback to this deploy.) Copy the deploy ID from the event.
3. **Wait for "Live".** ⏱ T1 = time the deploy event turns Live. If the build runs instead of reusing the image, note that too.
4. **Verify B.** Run the five checks; every reading must match the "On B" column. ⏱ T2 = time the last check passed. Copy the `check-headers` output and the two curl lines into the report.
5. **Roll forward.** Manual Deploy → Deploy a specific commit → paste full SHA A → Deploy. ⏱ T3 = time you click Deploy.
6. **Wait for "Live".** ⏱ T4.
7. **Verify A.** Run the five checks; every reading must match the "On A" column. ⏱ T5. Copy the outputs.
8. **After.** Events page shows SHA A live, no failed events in between. Service log: no line mentioning `migration`, `pending` or `privileges` during the drill (the log is content-free; any such line is the failure signal).

## Timing table (fill in)

| Mark | Meaning | Time (UTC) |
|---|---|---|
| T0 | rollback deploy clicked | |
| T1 | rollback deploy Live | |
| T2 | B verified (last check passed) | |
| T3 | forward deploy clicked | |
| T4 | forward deploy Live | |
| T5 | A verified | |
| T1−T0 | rollback deploy duration | |
| T2−T0 | rollback to verified service | |
| T4−T3 | forward deploy duration | |
| T5−T3 | forward to verified service | |

Also report: deploy IDs of both events, whether the image was reused or rebuilt, any interruption seen during the overlap (a failed curl or a browser error), and anything unexpected on the account page.

## What to paste back to the agent

The filled timing table, both `check-headers` outputs, the four curl lines, the two deploy IDs, and one line each for the sign-in and account page results. The agent records them in `docs/READINESS.md` (owner-reported), sets the 7.8 row in `docs/launch-plan-20261022.md` and commits locally.
