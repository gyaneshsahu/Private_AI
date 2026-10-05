# Durable hosting decision for individual trial access

5 October 2026 · U1/R1 · **Proposal; paid upgrade and deployment not authorized.**

## Current deployment

Read-only Render dashboard inspection shows Docker **Free**, branch
`codex/provider-qualification`, with live commit
`dbccbe0a8605b5d2c2c3f3f72bc965b3e7563f04`. This is older than the locally validated
individual-access release. Earlier hosted smoke evidence does not validate the
current invitation/password/session system.

Render's default filesystem is ephemeral. A local SQLite reopen test proves
database behavior, not survival of a hosting restart/redeploy. Do not configure
the invitation registry on the existing Free instance as durable trial storage.
Only files under an attached persistent mount survive. See
[Render disks](https://render.com/docs/disks) and
[Free limitations](https://render.com/docs/free).

## Recommended small-trial arrangement

One paid Docker web service, one process/instance, with a **1 GB persistent disk**
mounted at `/var/data`. Use `PRIVATEAI_INVITES_FILE=/var/data/privateai/invites.sqlite`.
Keep SQLite and its sidecars together under that mount, with an operator-owned
private directory writable by the runtime `node` user only. Confirm actual mounted
volume ownership; image-directory permissions alone do not prove volume access.

The registry stores access IDs, hashed invitation/password material, expiration,
revocation, credential versions and per-account counters. It stores no conversation
content. Browser vaults remain browser-local encrypted history; a server disk does
not introduce conversation sync or recovery. Render still handles identity/network
metadata and serves the trusted application code.

Current [Render pricing](https://render.com/pricing), checked in the rendered
pricing page on 5 October: 0.5 CPU/512 MB service **USD 7/month**, disk **USD
0.25/GB/month**, Hobby workspace **USD 0 plus compute**. Proposed base total:
**USD 7.25/month**. This excludes tax and metered bandwidth/build overages; it is
not an all-in cap. No Pro workspace upgrade is required by this proposal.
Confirm the account's actual quote and available smallest disk before purchase.
This is a separate recurring hosting expense, not part of the USD 2 Tinfoil cap.

The user decision needed is whether to approve this paid service/disk arrangement
and its recurring base expense, with an explicit acceptable total spending limit
including taxes/overages. Until then, retain the existing restricted foundation and
local rehearsal. Do not buy, attach a billable disk, deploy invitations, or expose
real-user data automatically. Hosting approval would not approve the private-data
trial or pass provider/quality gates.

## Tradeoffs and alternatives

- This preserves the current SQLite design and single-instance session/grant model.
  Disk-backed deploys incur a short interruption; old sessions/grants are invalid
  after restart. Do not enable autoscaling or multiple writers.
- A managed relational database is a reasonable later choice for scaling/recovery,
  but requires an adapter/migration plus shared sessions/grants and separate cost
  review. Do not add that work merely to retain a Free web tier.
- Remaining local-only costs no new hosting money but cannot establish actual-host
  TLS, proxy, persistence or access readiness. It is the fallback while approval is
  pending, not a deployed invited trial.

## Required work before deployment

1. Package the existing invitation CLI in the runtime image. Current Dockerfile
   omits `scripts/invites.ts`, so the runbook command cannot work inside that image.
   Validate the resulting image from a clean Git export and use non-root execution.
2. Validate mount presence/ownership and fail startup on a missing/unwritable
   configured registry path. No silent replacement with an ephemeral empty registry.
   Confirm that redeploying with the same mount preserves identity and revocation.
3. Keep provider/search keys and operational qualification absent for the first
   hosted access rehearsal. Check auth cookies, origin/proxy headers and anonymous
   denial on the actual HTTPS origin; bind evidence to commit and image digest.
4. Use only dedicated synthetic accounts: redeem two invitations, save separate
   browser workspaces, change a password, revoke one account, restart/redeploy and
   verify IDs/password changes/revocations/counters remain while old sessions fail.
5. Validate a SQLite-consistent backup/restore in an isolated private destination
   with synthetic credentials first. Keep backups outside Git and public artifacts.
   Do not copy a live SQLite file casually or treat disk snapshots as a tested
   database backup. Never copy production password hashes into a developer checkout.
6. Keep access paused during recovery. An older registry backup can resurrect
   revoked access, old passwords or invitation codes; restoring it is a security
   rollback. Reconcile against current access decisions before resuming. Recovery
   must be operator-reviewed, not automatic. Define backup retention, access and
   deletion before collecting real accounts.
7. Check small-instance memory during bounded sign-in concurrency and streaming;
   the quoted plan is a candidate, not a measured capacity guarantee. Any larger
   plan or backup service needs separate cost approval.

No host settings, subscriptions, disks, registry contents or deployment were
changed by this review. Source documentation describes encrypted disks/snapshots,
single-instance mounts and deploy interruptions; it is not our restore evidence.
