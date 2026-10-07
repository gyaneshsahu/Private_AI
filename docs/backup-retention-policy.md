# Trial backup and metadata-retention policy

7 October 2026. **Approved destination; local encryption verified; hosted transfer and operational retention not yet verified.**
Owner: founder/operator. Applies to the existing single-instance Render service.
The founder authorized encrypted registry transfer to `C:\PrivateAI-backups`,
Windows-account-protected keys, seven-day retention and an independently secured
recovery-key copy. No additional storage purchase is authorized. The current trial
remains paused and private-data access gated.

## Current evidence and gaps

`server/registry-backup.ts` takes a consistent SQLite backup, validates its schema
and integrity, uses restrictive permissions and stages recovery paused. Hosted
same-disk staging has evidence in `docs/development-deployment.md`. Those copies on
`/var/data` cannot protect against loss of that disk or account.

The registry contains account IDs, credential/invitation hashes and salts, expiry,
revocation, credential versions and request counters. It is sensitive authentication
material, not a harmless metadata export. File permissions do not encrypt it.
There is no implemented automatic registry deletion/retention job. Revocation or
expiry denies access but does not delete the row (`server/invite-registry.ts`).
Sessions are process-local with a one-hour cookie lifetime; restart invalidates
them (`server/invite-access.ts`). Browser workspaces are separate, encrypted local
snapshots; a registry backup does not recover their contents or forgotten passwords.

## Proposed off-disk arrangement

- Target a 24-hour recovery point and four-hour recovery time for the small trial;
  these are targets until a timed restore demonstrates them, not service promises.
- Use the existing consistent-backup primitive, then a maintained authenticated
  encryption tool before transfer to private storage outside the live disk and
  preferably a separately controlled failure domain. Do not build custom crypto.
- Keep the decryption key outside the host and backup destination, in approved
  protected operator storage with a separately recoverable offline copy. Never
  put keys, raw registries or credentials in Git, chat, build artifacts or logs.
- Daily encrypted copies and one before a migration; expire every copy after
  seven days, including object versions and migration copies. Longer preservation
  requires a documented reason and decision. Verify lifecycle deletion rather than
  assuming deleting a visible object deletes retained versions.
- Receipts contain release/schema identity, backup time, integrity outcome and
  encrypted-object checksum, without account IDs, credentials or transcript data.
  Alert the operator when the latest verified backup exceeds 24 hours.

The founder approved the Windows destination, account access boundary, encrypted
authentication-material export and seven-day retention without a new subscription.
Before activation verify recovery-key custody and the actual transfer/lifecycle.
No storage vendor or new service is selected merely to fill this plan.

## Recovery acceptance

Restore into an isolated, paused instance using the recorded compatible release;
verify integrity, then reconcile expiry, revocations, password changes and quota
state since the snapshot. A stale backup can resurrect revoked credentials.
If independent current revocation/credential state is unavailable, revoke all
restored accounts and issue fresh invitations before resuming; do not trust old
passwords or restart request allowances silently. Keep all old sessions invalid.
Test with two synthetic accounts, including one revoked after backup. Demonstrate
both recovery from complete original-disk loss and retained access isolation.
Only then record off-disk recovery as passed. Do not replace the live database as
part of a rehearsal or delete existing evidence without authorization.

## Retention matrix

| Data | Current behavior / evidence | Proposed trial rule and missing work |
| --- | --- | --- |
| Private prompts, documents, outputs | Browser state and optional encrypted local snapshots; confidential provider path gated | No plaintext application telemetry or automatic feedback upload. Verify deployed logs and supplier handling; encryption does not prove supplier non-retention. |
| Local encrypted history | Persists until user deletes; device/browser backups outside application control | Explain local deletion limits; do not promise registry recovery restores history. |
| Registry rows and credential hashes | Persist on disk after expiry/revocation; no purge job | Remove within seven days after account expiry/revocation unless documented incident hold. Implement/test purge and ensure outstanding restore copies expire within seven more days; deletion can therefore take up to 14 days across backups. |
| Active sessions / login throttles | Process-local sessions; one-hour cookie, in-memory throttles | Do not add durable session or raw sign-in logging by default. Validate memory expiry and restart behavior. |
| Request counters | Stored per account in registry | Retain only while its row is required; report aggregate costs without publishing account IDs. |
| Hosting edge/access/security logs | Exact fields, retention and operator access not yet established | Inspect provider settings/terms and deployed behavior; aim for minimal fields and at most seven days where configurable. Do not claim this is already enforced. |
| Backup objects and versions | Same-disk recovery evidence only | Seven-day expiry after creation, tested on the selected off-disk destination. |
| Synthetic evaluation evidence | Local ignored evidence; historical permits preserved | Preserve current historical results/consumed permits. Keep synthetic-only; no automatic purge of existing evidence under this proposal. |
| Incident metadata | No approved retention schedule yet | Minimize and restrict access; document purpose, owner and expiry before extending retention. Never enable transcript capture as an implicit incident response. |

Before real invitations: resolve host/provider metadata retention, implement and
test the chosen lifecycle, rehearse off-disk recovery, and publish disclosures
matching actual settings. Do not advertise these proposed durations before that.

## Synthetic recovery evidence — 7 October

`tests/registry-backup.test.ts` now demonstrates the dangerous stale state explicitly:
a snapshot contains an older password version and one request, while the source
later contains a changed password, exhausted quota, revoked invitation and elapsed
expiry. Recovery remains paused and denies login, registration and requests. With
no independent reconciliation record, revoking every restored row before resuming
keeps old passwords and invitation tokens unusable. The live synthetic registry
retains its current password, quota and revocation state unchanged.

All four backup tests pass. The first sandboxed attempt could not create the
required temporary directory outside Git; the approved run passed without weakening
path checks. This tests the documented operator fallback, not an automatic recovery
command, encryption, off-disk storage, RPO/RTO or production restore. No live registry
or historical experiment evidence was used or changed.

## Concrete destination recommendation and fallback — 7 October

The approved destination is `C:\PrivateAI-backups`. The original home-directory recommendation was rejected after finding a Git repository at `C:\Users\sahug`; do not use that location. The approved directory is initialized with inheritance disabled and only the current Windows account granted FullControl. The private age identity is stored in Windows Credential Manager, outside the archive directory; no private identity was printed or written to a plaintext file. Independent recovery-key custody remains unresolved. No additional subscription is needed. This protects against Render disk loss, not simultaneous loss of the host and operator computer.

The CLI now offers `stage-recovery-revoke-all <private-directory>`: creates a new paused copy, atomically revokes every restored identity and clears pending invitation hashes, leaves the source untouched, and emits a content-free receipt. Use when current credential/revocation state cannot be reconciled. Installing the copy, reissuing access and resuming remain separate operator decisions. The packaged synthetic CLI test proves old invitations remain denied after explicit resume. This is not off-disk backup or reconciliation of quotas for replacement identities.

## Encrypted backup implementation and remaining activation work

`server/encrypted-registry.ts` serializes a committed SQLite snapshot in memory,
passes it to maintained age encryption through stdin, and emits ciphertext only.
There is no plaintext export file. Runtime support for SQLite serialize/deserialize
is checked and fails closed. Authenticated decryption and schema validation happen
in memory. Restore creates a separate operational database with access paused and
all identities revoked; it never replaces the live registry. That restored database
is sensitive and remains within the protected destination.

`tests/encrypted-registry.test.ts` exercises actual age encryption, WAL snapshots,
wrong keys, tampering, source preservation and revoked paused recovery. CI explicitly
installs distribution age and enables this test; ordinary runs without
`PRIVATEAI_TEST_AGE` report it skipped and are not encryption evidence. Windows
verification uses official age 1.3.2, downloaded with its release SHA-256 verified.
The container uses Debian's maintained age package; hosted validation remains pending.

`scripts/windows-backup.ps1` provides Initialize, Configure, Backup, Verify,
Restore, Status and Schedule. Transfer uses SSH with strict host-key checking,
batch authentication, a total 90-second stream deadline and a 16 MiB bound.
Only ciphertext is written during transfer. Configure requires the exact Render
SSH target; verification must succeed before a partial archive becomes complete.
Retention removes only strictly named archives older than seven days inside the
approved directory, not historical experiment evidence or restored databases.
Restore copies need deliberate disposal after review; they are not silently purged.

Scheduling is prepared but **not activated**: daily at 09:00 Windows local time,
current-user interactive logon, no overlapping tasks, five-minute execution limit,
start when available. A successful real transfer and independently verified key
copy are prerequisites. The PC must be awake, connected and signed in; seven-day
expiry cannot run while it is unavailable. Therefore neither a 24-hour recovery
point nor strict continuous expiry is guaranteed by this arrangement.

Content-free status records report last attempt/success and failure; Status exits
nonzero for failure or a backup older than 24 hours. Task failure/status is only a
local signal: proactive operator alerts, release/checksum receipts, retention
rehearsal and timed off-host recovery remain unfinished. Do not call monitoring or
disaster recovery passed until those checks complete.

Render's Connect → SSH currently requires an SSH public key to be registered.
No real registry transfer has occurred. Register operator SSH access, verify the
host key through an authoritative channel, select independent recovery-key custody,
then validate a deployed encrypted export and isolated paused restore before
activating scheduling. Never disable strict SSH checks to make transfer work.

Validation at this checkpoint: 165 tests across 43 files, typecheck and production
build passed with the real Windows age test enabled. PowerShell syntax passes;
Initialize created the approved directory and credential successfully, ACL readback
confirmed current-user-only access, and Status correctly fails without a verified
transfer receipt. Docker build could not start because the local Linux engine is
unavailable. Container/CI changes are prepared, not verified or deployed.

### Subsequent Linux/Windows rehearsal — 7 October

Docker Desktop was started and the container now builds successfully. Node 24.21.0
exposes the required SQLite memory APIs; Debian age 1.1.1 and Windows age 1.3.2
interoperate. Container smoke, persistent invitation state and packaged individual
access checks pass as non-root with synthetic data; the access rehearsal used
512 MiB/0.5 CPU. These do not qualify production capacity or hosted TLS.

The real age integration test passes inside the packaged Linux runtime with
network disabled. Its first attempt exposed a test assumption that `/app` contained
Git metadata; the fixture now creates its own synthetic Git directory, preserving
the negative path check without adding Git metadata to the image. CI now runs this
container test explicitly.

A separate read-only, network-disabled Linux container encrypted a one-account
synthetic registry to the approved Windows public recipient. Only its 16,584-byte
ciphertext crossed to `C:\PrivateAI-backups`. Windows verified authentication/schema
using the Credential Manager key and restored a separate paused registry with all
accounts revoked. The command group completed in approximately three seconds;
this is a local interoperability rehearsal, not a measured production RTO. The
local receipt is `.local/container-encrypted-rehearsal.json`. The isolated source
container was removed; ciphertext and the protected paused restore are retained.

Render still shows SSH unavailable until a public key is registered. Real hosted
transfer, independent recovery-key copy, verified retention scheduling and
proactive failure alerts remain open; this rehearsal does not pass D05.

### SSH access and independent key setup

The founder registered the Windows public SSH key; its fingerprint matches the
local `privateai-render.pub`. The Frankfurt host key was checked against
[Render's published fingerprint](https://render.com/docs/ssh#renders-public-key-fingerprints)
and pinned in the protected backup directory. Configure now records the existing
identity path; transfers explicitly select that key, permit no interactive
authentication, and require the pinned host key. Private SSH key contents are
neither copied nor recorded. The container now creates `/home/node/.ssh` owned by
the non-root runtime user with mode 0700, as required by Render.

Recommended independent custody: a personal Bitwarden free account, which includes
[secure notes and access across devices](https://bitwarden.com/help/password-manager-plans/).
This is a recommendation, not activation or approval to transmit the backup key.
The founder must create the account with a unique master passphrase, enable
two-step login and retain its [recovery code](https://bitwarden.com/help/two-step-recovery-code/)
offline. Ensure the vault can be accessed from another device independently of
this Windows account. Do not save the only master-password/2FA recovery record
inside that same vault.

After account setup and approval of key storage there, transfer the existing age
identity directly in a user-operated local session into a secure note named
`PrivateAI registry recovery`. Include its public recipient, archive location and
the restore instructions; keep the private identity out of terminal transcripts,
screenshots, chat and repository files. Do not create a new identity: existing
archives require the original one. Before marking custody verified, retrieve the
stored identity from the independent vault and authenticate a real archive in
memory, then rehearse paused/revoked restore. Account creation alone, or a second
copy under the same Windows account, does not satisfy this gate. The precise local
transfer command remains pending selection/setup; never print the key to make a
copy through chat.

Current access checkpoint: Render deployed `12bd405` after passing GitHub validation.
The server accepts the registered public key, but batch authentication cannot
unlock its passphrase-protected private key. A local diagnostic discarded public
key output and confirmed passphrase protection without recording the passphrase.
The Windows OpenSSH agent service is unavailable. Hosted transfer is still absent;
do not remove key protection or enable scheduling to work around this blocker.
User-operated local unlocking/agent setup is required before unattended transfer.
