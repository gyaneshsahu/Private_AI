# Invited-trial preparation

Status: local onboarding implemented; invited-user release **NOT READY**.
5 October 2026. This runbook records prerequisites, not permission to invite users.

## Current experience

Conversation is the main workspace. Getting started opens a dismissible guide
without sending the draft, changing context or storing a consent receipt. It
explains supported files, extraction review, explicit encrypted snapshots,
reload/lock behavior, deletion scope, research approval and interrupted replies.
Privacy boundaries remain separately accessible. The guide is not legal consent
or evidence that users understand the product.

Browsers now warn before reload/navigation when workspace changes are unsaved;
cancelling keeps the draft. Saving an encrypted snapshot removes the warning until
another change. Sign-out and access-invalidating navigation bypass it so it cannot
retain an expired session's screen. Browser warnings are best-effort (especially
on mobile, forced termination or crashes); they do not autosave or guarantee recovery.

Existing hosted Basic access is a shared development credential. It cannot revoke
one person, attribute service limits to an invite, or separate customer accounts.
Do not distribute it as an invited-user account system. Browser-local encrypted
vaults do not substitute for service access control.

## Individual access implementation (local validation)

The founder selected PrivateAI-only, operator-issued invitations. No external
identity service is involved. This is **not anonymous access**: PrivateAI and the
host still receive identity/network metadata. External identity integration can
be reconsidered for public launch.

Opt-in configuration `PRIVATEAI_INVITES_FILE` enables individual access and
disables shared-key access as an alternative. The registry is a private SQLite
file containing opaque IDs, hashed one-use invitation codes, scrypt password
hashes/salts, expiry/revocation and request counters. It contains no conversations.
Use a private persistent path with operator-only filesystem access; keep the file
and any SQLite sidecars out of Git, shared folders and diagnostic uploads.

Hosted startup requires an absolute path to an already initialized regular SQLite
registry; missing, empty, unrelated or corrupt files stop startup. No fallback
registry is created. Before enabling `PRIVATEAI_INVITES_FILE` on the hosted service,
verify the persistent mount/permissions and initialize it in the interactive
operator shell with `PRIVATEAI_INVITES_FILE=/var/data/privateai/invites.sqlite node
--import tsx scripts/invites.ts list`. This creates an empty registry without issuing
an invitation. The parent directory must already exist with private permissions.
Then configure the same absolute path on the service. Do not run initialization
automatically at every startup: that would hide a lost mount. The path/schema check
does not establish disk durability; use the hosted restart/redeploy rehearsal in
the [storage decision](trial-hosting-decision.md). Local Windows setup below retains
its existing explicit operator initialization behavior.

Storage-guard batch validation: 140 unit/integration tests across 38 files, 15
production browser workflows, typecheck/build and fixture integrity passed. New
tests reject missing/relative/empty/unrelated/corrupt storage without creating or
rewriting it and verify reopened identity, credential versions, revocation and
exhausted request limits. Docker packaging smoke is updated but unrun locally
because the Docker engine is unavailable; hosted mount/restore evidence is pending.

Example Windows operator setup, for local synthetic rehearsal only:

```powershell
$env:PRIVATEAI_INVITES_FILE = 'C:\Gyanesh\Startups\Private_AI\.local\trial-access.sqlite'
node --import tsx scripts/invites.ts issue 24
npm start
```

The issue command requires an interactive terminal and shows the invitation once.
Do not redirect it, paste it into chat, or capture it in evidence. Deliver the ID
and code privately through the approved invitation channel. No real invitation
was issued during implementation. Users enter the code at `/auth`, choose a
password of at least 12 characters and retain their access ID for later sign-in.
Invitation redemption is one-use; the configured expiry also ends account access.
The sign-in password and local vault passphrase are separate. Users can change
their sign-in password using their current password, as described below. Lost
password recovery/reset and account migration are not implemented.

### Change a known sign-in password

Choose **Change sign-in password** in the signed-in workspace. Unsaved changes
require confirmation before leaving; save an encrypted snapshot first if needed.
Navigation locks and clears the current workspace. The account page requires the
current password, a different new password of 12–256 characters and confirmation.
It uses same-origin POST forms, no external assets/scripts, no-store responses and
cleared fields on failure. It shares the existing 30 attempts/minute and two
concurrent password-check bounds with sign-in and invitation redemption.

Successful change signs out every existing session for that identity. Persisted
credential versions make old cookies unusable on their next protected request;
active responses close within approximately one second. Other open screens clear
on the existing focus/visibility or 30-second access check. This is not instant
remote erasure of an offline browser's memory. Sign in again with the same access
ID and new password, then unlock saved history with the unchanged vault passphrase.
Access expiry, revocation, per-account quota and stored encrypted records do not
change. Other accounts remain unaffected. Interrupted requests never restart.

The SQLite schema adds a credential-version column when an older registry opens.
Existing invitation IDs, password hashes and expiry are preserved. Keep the normal
private operator backup before a deployment migration; local tests cover migration
and reopen, but no deployed registry was migrated by this development batch.
The server still uses one process and restart-invalidated in-memory sessions.

This workflow cannot recover a forgotten current password or vault passphrase.
An operator reset would need a reviewed identity-verification and delivery process;
do not introduce one silently or claim that a new invitation recovers old history.

Local validation: 138 unit/integration tests across 37 files and 15 production
browser workflows passed, with typecheck, build and fixture integrity. Password
tests cover concurrent changes, legacy schema migration/reopen, unchanged quotas,
old-session rejection, active-response cancellation, cross-account isolation,
cleared error forms and encrypted history reopening at the same identity. Browser
checks cover 360-pixel and desktop password-page layouts. Hosted validation remains
pending.

```powershell
node --import tsx scripts/invites.ts revoke <access-id>
```

Operator controls now also support:

```powershell
node --import tsx scripts/invites.ts list
node --import tsx scripts/invites.ts pause
node --import tsx scripts/invites.ts resume
```

`list` displays only access IDs, expiration and pending/registered/expired/revoked
state, plus the global pause state. It never returns password hashes, salts or
invitation codes. Keep this identity metadata in operator-only records.
`pause` persists in the registry across restarts, denies access/redemption/sign-in
and closes active responses within approximately one second. `resume` restores
eligible access without resetting expiry, revocation or per-invite request limits;
interrupted requests are not restarted. Existing unexpired login cookies may
become usable again after resume. Use revocation for compromised identities.
An unknown access ID now produces an error rather than claiming revocation.

For a lost **unredeemed** invitation, inspect its status, revoke it and issue a
new invitation. This is not registered-account password recovery or vault recovery;
neither is implemented. Do not replace registered users silently with new IDs,
because encrypted workspaces are scoped to the original identity.

## Repeatable local rehearsal

### Individual-access deployment check

`npm run trial:access` checks the individual-invitation deployment. The older
`scripts/hosted-smoke.mjs` checks shared Basic development access and cannot stand
in for this check. Use a dedicated, already registered synthetic account, never a
real user's password or an unredeemed invitation. The check creates and signs out
its own session; it does not alter the account or existing sessions.

Set `PRIVATEAI_TRIAL_ORIGIN` to the exact approved HTTPS origin (no trailing slash)
and `PRIVATEAI_TRIAL_ID` to that synthetic account's ID. Supply
`PRIVATEAI_TRIAL_PASSWORD` through a trusted process secret. On Windows, the
existing credential store supports a separate name:

```powershell
pwsh -NoProfile -File .\scripts\windows-secret.ps1 -Action Set -Name PRIVATEAI_TRIAL_PASSWORD
# In PowerShell 7, after configuring the approved origin and synthetic access ID:
Import-Module .\scripts\WindowsSecrets.psm1
Invoke-WithPrivateAiSecret -Name PRIVATEAI_TRIAL_PASSWORD -Action { npm run trial:access }
```

The Set command uses masked input. Replace/remove this credential with the same
script and name; do not put the password into command arguments, repository files
or evidence. The origin/account ID are operator metadata and are not printed by
the checker. Keep their mapping in private operator records.

The bounded check verifies anonymous denial, the protected sign-in page, a
host-only HttpOnly/SameSite=Strict access cookie (Secure on HTTPS), cross-origin
logout rejection, the expected individual identity and login marker, disabled
inference, explicit logout and rejection of the old session afterward. It makes
eight requests on success to fixed auth/status/root paths, follows no redirects,
uses normal TLS verification and has a ten-second timeout per request. It does
not call inference/research or retry failures. After a failure before logout it
attempts one cleanup logout if a session cookie was received. `logout: FAILED`
means the synthetic session may remain active: revoke that dedicated account or
investigate before rerunning. No password, ID, cookie, raw server response or raw
exception enters the printed JSON evidence.

`npm run trial:access -- --local` explicitly permits only HTTP `127.0.0.1` for
synthetic local rehearsal and labels its evidence `LOCAL_HTTP`. It does not prove
TLS, proxy or deployed security. The automated suite exercises this local mode,
failure cleanup and no-retry behavior. Actual hosted execution remains pending.

Record an actual hosted result alongside the operator-verified deployed commit
and configuration identity. The checker does not attest the release identity,
render browser UI, test two-user isolation or qualify provider privacy. Those
retain their separate release checks; a passing report is not trial approval.

### Full local workflow suite

With the local preview on port 4173 stopped, run `npm run trial:check`. It performs
typecheck, the complete unit/integration suite, production build, browser workflows
and frozen evaluation-fixture integrity, stopping on the first failure. Browser
test startup explicitly clears provider/search keys, qualification, shared access
and invitation-database configuration and fixes the loopback origin; it cannot
inherit a real trial registry from the operator shell. Other tests use synthetic
identities and isolated registries. This command does not run live model experiments.

Additional coverage now verifies pause/revocation and per-user counters survive
registry reopen, credential-free status listings, HTTP request limits independent
between users, resume without quota reset and expiry during an active response.
Passing this rehearsal is local evidence, not hosted deployment approval.

Revocation is checked on every protected request and closes active responses
within approximately one second. Login sessions expire after one hour and rotate
on sign-in. `express-session` plus bounded TTL-cleaned `memorystore` provide cookie
session handling; hosted cookies are Secure, HttpOnly and SameSite=Strict.
Same-origin POST checks protect login/logout and API actions; API CSRF/grants are
bound to both account and login session. Login attempts are capped at 30/minute
per instance; application POSTs at 200/hour per invite and 2,000/hour per instance.
These are request limits, not a substitute for provider spending controls.

Sign-in and invitation redemption share a two-check concurrency bound per process.
Excess work receives a recoverable busy page (503, five-second Retry-After), without
queueing passwords or consuming an invitation. There is no automatic retry.
The 30-per-minute attempt limit runs before form parsing, so oversized submissions
also count. Invalid/oversized forms and unavailable authentication storage retain
cleared sign-in forms; raw exceptions, submitted secrets and storage paths are not
reflected. Failed password checks release their slot. These local controls do not
replace hosting-edge abuse protection or a multi-instance shared limiter.

Signing out also closes active responses belonging to that login session within
approximately one second. A separate login by the same account and other invited
users remain active. The periodic check verifies the session still exists as well
as account expiry/revocation; session-store errors or registry-check errors close
the affected response. A failed server-side session deletion returns an error,
not a successful sign-out confirmation. The client locks its workspace before
attempting sign-out and tells the user to retry if server sign-out fails.

Encrypted vault databases are scoped to opaque account IDs. Sign out locks and
clears current work; other tabs receive the lock signal. Account expiry/change is
checked on focus and every 30 seconds while the page is active. Server access is
denied immediately on the next request even if a suspended tab has not updated.
Same-origin storage remains accessible to that browser/device and application
code; this is logical account separation plus encryption, not an OS-user boundary.
Saved ciphertext is retained on logout/revocation. Private-data inference remains
gated independently; access acceptance cannot qualify the provider.

Single instance only: the session store is in memory and restart signs everyone
out. The registry must persist securely across restarts. Do not scale to multiple
processes without shared session/rate state and further validation. The access
page is a functional first version; hosted TLS/proxy validation, security review,
recovery design and usability review remain release work. Session middleware
guidance: [Express session documentation](https://expressjs.com/en/resources/middleware/session/).

Access-page recovery now keeps usable sign-in/invitation forms on rejected input,
rate limiting or temporary session-store failure. Error responses never echo
submitted passwords/codes; a failed invitation attempt does not consume a valid
code. The page uses local, hash-authorized CSS with no scripts or external assets.
Automated checks cover successful redemption after rejection, cleared secret
fields, desktop/360-pixel layout and applied CSP-constrained styling. The mobile
render was inspected locally. This is not a substitute for later real-device or
prospective-user observation before opening the trial.

## Before the first invitation

1. Complete Q1 and quality/canonical-workflow evidence. Publish supported families
   and observed limits. Do not claim ChatGPT/Gemini parity from development cases.
2. Founder approves audience, exact deployed origin and hosting/privacy boundary,
   data scope, and invitation/feedback channel. Synthetic testing remains separate.
3. Validate the implemented PrivateAI-only individual access against the selected
   deployed origin and hosting boundary. Require expiring invitation access,
   explicit logout and revocation checked on every protected request. Never put
   credentials or bearer tokens in URLs, frontend configuration or logs.
4. Validate two independent invited identities: denied without invitation, no
   cross-session grants, revocation prevents new requests, and in-flight cancellation
   behavior is documented. Define per-user and aggregate limits and one operator
   stop control; shared Basic access does not satisfy these requirements.
5. Pin release/qualification evidence, deploy through passing CI, then run hosted
   TLS/access/cookie/streaming checks against that exact release. Current local
   validation does not certify the older hosted deployment.
6. Observe keyboard and real-phone use: compose, attach/correct, save/reopen,
   stop/retry, inspect sources, approve/cancel research, lock and delete. Capture
   consented usability findings without copying private conversation content.

## Operator stop and recovery

For the current single-instance service, stop the service to prevent
new work and terminate active connections. In individual-access mode, revoke
affected IDs before reopening; restart invalidates every login session but does
not revoke registered accounts. In legacy shared-key mode, rotate the deployment
access secret before restarting. Remove provider/search credentials and qualification configuration before
starting a disabled-inference diagnostic deployment. Do not alter provider gates
or populate qualification from test fixtures to restore availability.

Restart invalidates in-memory sessions and disclosure grants. Reloading discards
unsaved workspace state; saved browser snapshots remain encrypted. Explain that
loss before asking anyone to reload. Browser-held Basic credentials can be cached;
closing a window is not a reliable server-side revocation mechanism.

Preserve content-free incident facts: release identity, time, affected route,
status/error category and aggregate counts. Do not collect prompts, documents,
responses, authorization headers, cookies, keys or full request URLs. Feedback
has no automatic upload. If an incident involves personal data, pause and obtain
a reviewed response decision before wider disclosure or changed privacy promises.

## Registry backup and paused recovery

Local synthetic rehearsal passes; actual hosted restore, retention and storage
access are still unvalidated. These commands use Node 24 and operate on an existing
registry. They never replace the live registry or resume access automatically.

1. Choose an existing private absolute destination outside **every Git checkout**,
   public folders and automatic sync. Restrict its OS permissions first; Windows
   requires appropriate directory ACLs, not Unix mode bits. Backups contain sensitive
   password/token hashes and are **not encrypted by this tool**. Define authorized
   access, retention and deletion before backing up real accounts.
2. Set `PRIVATEAI_INVITES_FILE` to the absolute source registry path. Run
   `node --import tsx scripts/invites.ts backup <private-directory>`.
   SQLite's online backup API includes committed WAL state. Output is a fresh
   directory containing `invites.sqlite` and a content-free `receipt.json` written
   after validation. No receipt means incomplete output: preserve it for inspection.
3. For recovery rehearsal, point `PRIVATEAI_INVITES_FILE` at that backup's database
   and run `node --import tsx scripts/invites.ts stage-recovery <private-directory>`.
   This produces another unique copy with access **paused**. It does not modify
   either source or running service. Do not publish database files as evidence.
4. Keep the service stopped or paused during an actual operator-reviewed recovery.
   An older snapshot may revive revoked users, old passwords, invitation codes or
   request allowances. Reconcile against trusted current access decisions before
   any resume; if reconciliation is impossible, keep access disabled or revoke
   affected invitations. Check expiry, credential versions and quotas as well.
5. Switching the service to the reviewed staged database is a separate deployment
   operation, requiring the chosen durable mount and hosted validation. New startup
   invalidates in-memory sessions. Only explicitly resume after reconciliation and
   access checks. Retain the prior registry for incident review under the approved
   retention policy; never silently overwrite it.

Tests exercise synthetic CLI backup/staging, committed WAL data, password changes,
revocation, quota retention and denied login/registration/requests while paused.
They do not prove host disaster recovery, power-loss durability or lost-password
recovery. The container smoke check includes this workflow but remains unrun while
the local Docker engine is unavailable.

## Open evidence

Full provider-chain qualification, human quality grades, realistic planning
reliability, individual access implementation, current hosted validation and
real-device/user observation were the original open items. Individual access now
has local HTTP and browser evidence; deployed operation and review remain open.
The browser test accepts two identities, saves Alice's draft, signs out, verifies
Bob has an empty vault even with the same vault passphrase, revokes Bob and reopens
Alice's draft after fresh sign-in. HTTP tests cover cross-user session rejection,
one-use redemption, expiry, secure hosted cookie flags and active-response revocation.

Tabs check access on focus, return to visibility and every 30 seconds while the
browser runs timers. A fresh sign-in carries a non-authenticating login marker;
older tabs clear their in-memory workspace and reload when that marker or account
changes. Unsaved work in those older tabs is discarded. Saved encrypted snapshots
remain available after unlocking the appropriate account's vault. Background-tab
timer throttling means this is not an instantaneous screen-clearing guarantee;
server authorization and response termination remain independent controls.
Vault lock notifications are scoped to the account. Clearing an obsolete tab
does not lock the newer login's draft. Browser regression coverage verifies a
same-account replacement login, preserved new draft and reopening saved work.
