# Branch merge plan — 12 November 2026 (checklist O6)

**Status: plan, trial-tested, nothing pushed or merged on a shared branch.**

## Where things are

| Branch | State |
| --- | --- |
| `codex/development-handoff` | The working line. On origin, deployed to Render (`ae439fa` live). |
| `alpha-provider-neutral` | Local only, in the worktree `C:\Gyanesh\Startups\Private_AI-alpha`. Steps 2 to 6 and S1, L4, T3, O5: the owner-accepted report status, health consent and provider text behind flags, the dormant production chat switch with spend cap and stop switch, the A5 masking fix, the German held-out set, the expired-session test, the in-app policy naming the provider, the masking limits in the app, the week-one routine. |
| `privatemode-eval` | Local only. The Privatemode spike (stages 1 and 2). Not for merging unless Privatemode wins. |
| `main` | 391 commits behind `codex/development-handoff`, none ahead; last commit 4 October. |

## Trial (verified 12 November)

`alpha-provider-neutral` merged into a throwaway checkout of `codex/development-handoff` without conflicts. On the merged tree: typecheck clean; Vitest 871 passed, 166 skipped; durable 130 passed across 17 files; build passes; Playwright 61 passed. The trial checkout was removed afterwards.

## Plan

1. **Merge** `alpha-provider-neutral` into `codex/development-handoff` (no fast-forward, one merge commit). Agent, after owner approval.
2. **Push** `codex/development-handoff`; wait for Validate (offline and durable jobs) to be green. Owner approves the push.
3. **Deploy is optional and safe.** Everything new is dormant in production: the consent and provider-text flags are not set, the production composition has no `inference` section, so chat stays off, the policy and log lines are unchanged, and the masking fix only matters once chat runs. Deploying keeps Render on the tested line; the header check follows.
4. **Bring `main` up to date** by fast-forwarding it to `codex/development-handoff` (`main` has nothing of its own, so no merge is needed). Owner decision: from then on, either `main` follows releases or work moves to `main`. Recommendation: release from `main`, develop on short branches.
5. **`privatemode-eval`:** leave it unmerged. If Privatemode wins, rebase it onto the merged line as the start of Stage 3; if not, keep it as the swappable second adapter for later.
6. **Clean up** the `alpha-provider-neutral` worktree after the merge; the branch can be deleted once merged.

Owner decisions needed: approve steps 1, 2 and 4, and choose the branch policy in step 4.
