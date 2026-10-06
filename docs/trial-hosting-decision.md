# Durable hosting decision for individual trial access

7 October 2026 · U1/R1 · **Synthetic hosted access, persistence and staged recovery passed; trial access paused.**

## Current deployment

Read-only Render dashboard inspection on 6 October confirms Docker **0.5c-512mb**,
0.5 CPU / 512 MB, selected compute price **USD 7/month**, and a **1 GB disk at
`/var/data`**. The founder reports completing the upgrade. The displayed compute
price is not an independently verified combined invoice total; the separately
published disk rate remains USD 0.25/GB/month before taxes/overages.

The founder explicitly approved branch publication and deployment for synthetic
hosted testing. The application at `b7e5ea7cd4c3cba82347e8c0810a643969d4e39f`
was deployed from `codex/provider-qualification` and configured with
`PRIVATEAI_INVITES_FILE=/var/data/privateai/invites.sqlite`. The private directory
is owned by runtime user `node` with mode 2700 (setgid plus owner-only access);
the registry is mode 600. There are no provider/search keys or qualification file
configured. Existing shared Basic access is superseded by individual access.

### Actual-host evidence, 7 October (6 October UTC)

- GitHub [Validate run 37537411000](https://github.com/gyaneshsahu/Private_AI/actions/runs/37537411000)
  passed all 163 tests, 16 browser workflows, build/fixture checks and fresh-image
  smoke, persistence and individual-access container checks. The preceding CI
  attempt failed because it selected system Chromium; CI now explicitly selects
  its installed Playwright Chromium. No application behavior changed for that fix.
- Render configuration deployment `dep-db2n0g5g1s2s73fnvaqg` succeeded. The
  public HTTPS origin passed anonymous API/private-file denial, sign-in rendering,
  secure/HttpOnly/SameSite cookies and cross-origin rejection.
- At `2026-10-06T22:05:20Z`, the packaged individual-access and two-identity
  checks passed over public HTTPS. Crossed sessions and CSRF were rejected in
  both directions; each own session remained usable; logout affected only its
  own session. Two one-use invitations were redeemed and replay was denied.
- Password replacement invalidated the old session without affecting the peer.
  Revocation denied the peer's existing session. A Render restart replaced
  instance `hxkpb` with `sq9sh`; at `22:06:31Z`, the new password and revocation
  persisted, old sessions/old password were denied, and inference stayed disabled.
- SQLite's backup API captured the live synthetic registry under the persistent
  mount. A separate staged recovery copy began paused; isolated credential checks
  verified its password/revocation state before leaving it paused again. The live
  database was not overwritten. This is same-disk backup/recovery evidence, not
  an off-host disaster restore or permission to restore stale real-account state.
- Both synthetic accounts were revoked and the live registry left paused. Generated
  fixture passwords/cookies never appeared in logs, chat or Git and were removed
  from the temporary state document. Credential-free JSONL results and the diagnostic
  source remain private under `/var/data/privateai/hosted-check*`; backup/recovery
  copies remain under `/var/data/privateai/recovery-checks`. Do not publish them.

The lifecycle checks made 45 bounded HTTP requests (8 access, 16 isolation,
14 preparation and 7 restart/recovery), in addition to anonymous readiness/browser
checks. This is functional access evidence, not capacity, model quality, general
device usability or provider qualification. Two browser vaults on the actual host,
real-device observation, off-disk backup policy and metadata-log retention remain
separate trial prerequisites. No extra hosting resources were purchased.

Final navigation follow-up: opening the public sign-in link from a browser exposed
the blanket cross-site rejection. The access middleware now serves only the public
sign-in page (or redirects `/` to it) for top-level cross-site GET navigation,
before session processing. Origin/HTTPS checks remain required; cross-site POST,
API/assets, password-page requests and frames remain denied. Local HTTP and actual
browser link-navigation regressions cover this narrow change. The 163-test suite,
typecheck and build passed; deployment verification follows the new commit.

Render's default filesystem is ephemeral. A local SQLite reopen test proves
database behavior, not survival of a hosting restart/redeploy. Never configure
the invitation registry on a Free instance as durable trial storage.
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

The founder has completed the service/disk purchase. Do not purchase additional
capacity or infer a higher spending ceiling. Publication, registry initialization,
and the bounded hosted checks above are now complete. Private-data trial readiness
still depends on the remaining privacy, quality and usability gates.

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

## Earlier container evidence and remaining release checks

**Additional packaged access evidence, 6 October:**
`scripts/container-invite-access.mjs` now exercises the actual application HTTP
routes inside a network-disabled container with a synthetic persistent volume,
512 MiB memory, no swap and 0.5 CPU. It passes anonymous denial, forwarded-HTTPS
enforcement, secure/HttpOnly/SameSite cookies, password replacement, unaffected
second-user access, revocation, old-cookie invalidation after restart, persistent
new password/revocation and denied login after a paused restart. The container
remained running without an OOM kill. This is bounded functional evidence, not
concurrent capacity qualification or actual TLS/proxy-host validation.

Tested image is the `bbb802e` image below. `git diff bbb802e HEAD` showed no changes
in `src`, `server`, `shared`, Dockerfile, package files or the invitation CLI before
this rehearsal, so rebuilding unchanged application components was unnecessary.
CI now runs this additional check on its freshly built committed image. Only the
test's uniquely named container/volume are removed; no real registry is used.

The published pricing was rechecked on 6 October: the proposed base remains
USD 7/month compute plus USD 0.25/month for 1 GB disk. Account-specific taxes and
metered overages require checking before purchase; a spending target is not a
provider-enforced hard cap. The founder subsequently bought the existing service
and disk and approved synthetic deployment; no further capacity is authorized. Keep inference
and search credentials absent for the first synthetic hosted access rehearsal.

**6 October local container evidence:** Docker Desktop engine 29.8.0 became
available. Clean Git export of `bbb802e` built successfully; image identity
`sha256:10e5f9b74b962c76f7a57d38c210e8017d515ab655f0a70a2fba767d25cfd257`.
The packaged smoke passed protected pages/assets/API, secure cookie configuration,
non-root/read-only operation and invitation backup/paused recovery commands.
A separate network-disabled synthetic named-volume rehearsal passed across three
fresh non-root containers: password replacement, revocation, credential version
and pause survived, and hosted registry validation accepted the mounted database.
Its initial test caller omitted the password-version argument; correcting that
caller produced the passing run without application changes. The test-created
volume was removed afterward; no real registry or WSL checkout was touched.
Local evidence: `.local/container-volume-evidence-20261006.json`.
The reusable `scripts/container-persistence.mjs` now runs after the image smoke
in CI, using a unique synthetic volume and removing only that test volume.
This resolves the local image-build blocker, not actual hosted TLS/proxy/storage,
backup operations, capacity or device validation. No paid hosting was activated.

1. The Dockerfile now packages `scripts/invites.ts`; the container smoke check
   exercises its `list` command against an isolated synthetic database as non-root.
   Actual local image build/smoke passed as recorded above. Validate the eventual
   deployed image identity and host separately before inviting users.
2. Hosted startup now requires an absolute existing regular registry file with a
   recognized schema and successful SQLite integrity check before writable opening.
   Missing/invalid storage stops startup instead of initializing an empty registry.
   Mount presence/ownership and actual persistence still need host validation.
   The guard also requires credential versions and exactly one valid pause setting;
   missing security metadata is not silently recreated as enabled access.
   Confirm that redeploying with the same mount preserves identity and revocation.
3. Keep provider/search keys and operational qualification absent for the first
   hosted access rehearsal. Check auth cookies, origin/proxy headers and anonymous
   denial on the actual HTTPS origin; bind evidence to commit and image digest.
4. Use only dedicated synthetic accounts: redeem two invitations, save separate
   browser workspaces, change a password, revoke one account, restart/redeploy and
   verify IDs/password changes/revocations/counters remain while old sessions fail.
   The local suite now tests the actual application process across two restarts,
   including paused access and credential versions. `npm run trial:isolation`
   provides the repeatable two-identity API/session check for the future approved
   HTTPS origin; local success does not replace this actual-host step.
5. Local synthetic SQLite-consistent backup and paused recovery staging now pass,
   including committed WAL state, password version, revocation and quota retention.
   Repeat the [recovery procedure](invited-trial-runbook.md#registry-backup-and-paused-recovery)
   against the selected host's storage before deployment approval. Keep backups outside Git and public artifacts.
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

The earlier read-only review made no host changes. The explicitly approved hosted
batch above subsequently deployed the branch, initialized the synthetic registry,
configured its path and tested restart/recovery. Published disk/snapshot promises
remain distinct from our bounded functional evidence.
