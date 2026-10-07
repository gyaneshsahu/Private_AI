# Trial backup and metadata-retention policy

7 October 2026. **Proposed operational policy, not implemented retention guarantees.**
Owner: founder/operator. Applies to the existing single-instance Render service.
No off-disk export, new storage purchase or credential copy is authorized by this
document. The current trial remains paused and private-data access gated.

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

Before activation the founder must approve destination, region, access boundary,
cost and retention, and authorize the encrypted authentication-material export.
Confirm supplier deletion/versioning behavior and recovery-key custody. No storage
vendor or new service is selected merely to fill this plan.

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
