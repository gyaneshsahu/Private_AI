Status: DRAFT, needs owner approval (12 November 2026)

# CometRow personal-data breach plan (one page)

Invite-only alpha, up to 10 friends. Controller: Ganesh Sahu, Germany, security@cometrow.com. Authority: LDI NRW, Düsseldorf. Suppliers: Privatemode by Edgeless Systems (AI, primary; tells us within 48 hours under its DPA), Tinfoil (AI backup only, not in use; 72 hours), Render (hosting), Google (sign-in), Brave (search, if on). Not legal advice: get a legal read before relying on it. Longer draft: `docs/breach-plan-draft-20261112.md`.

> **First 15 minutes**
> - **Contain.** Render shell: `touch <stopFile>` (chat stops on the next request). Then set `"enabled": false` in the deployment config and redeploy, because a restart clears the stop file. If sign-in is affected, remove the email from the allowlist or suspend the service. Do not roll back past `8a26a30` without first removing the `inference` key.
> - **Preserve.** Write down the time you found out and who told you. Save Render events and logs. Screenshot supplier notices and dashboards. Delete no database rows.

## The 72-hour clock (Art. 33)

The clock starts when we become aware, not when a supplier does. Within 72 hours, notify LDI NRW through its online breach form, unless the breach is unlikely to risk people's rights. Send: what happened, which data and roughly how many people, contact (security@cometrow.com), likely consequences, what we did. If facts are missing, send what is known and follow up in stages. Late notice needs the reason for the delay. Where data lives: `docs/art30-record-draft-20261112.md`.

## Telling people (Art. 34)

If the risk to them is high, email them without undue delay from security@cometrow.com:

> Subject: CometRow security problem affecting your account
> On [date] we found [what happened]. It affected [which data].
> This could mean [plain consequence for you].
> We have [stopped chat / changed keys / other step].
> You can [change your Google password / watch for odd emails]; questions to security@cometrow.com.

## Rotate secrets (if exposed)

- Privatemode API key: new key in the Privatemode portal (with rate limit, expiry and spend limit), update the Render secret file and `privatemode.portalKeyLimit` in the report, restart, then revoke the old key.
- Tinfoil API key (only if Tinfoil is ever switched on): new key in the dashboard, update the Render secret file, revoke the old one.
- Database password: change the owner role, then the `database-url` secret file.
- Auth secret: replace and redeploy (signs everyone out).
- Google OAuth client secret: rotate in Google Cloud, update the secret file.
- Brave API key (if search is on): rotate in the dashboard.
- Bridge and application TLS material: reissue and replace the secret files.

## Breach log (Art. 33(5))

Every breach, notified or not, goes in the private log under `docs/private/`: facts, effects, actions, and why we did or did not notify. A dated, content-free line goes in `docs/READINESS.md`.

## Optional trusted deputy (decision D15)

A deputy **may**: press the stop switch, start the 72-hour clock (note the time, open the log), and keep contacting the owner.
A deputy **never gets**: secrets or keys, database access, or user data. They do not notify the authority or users.
Open point: the Render shell can read the secret files, so shell access alone would break the "never gets keys" rule. Find a narrower stop (for example a suspend-only Render role) before naming anyone.

Authorisation: "I, Ganesh Sahu, authorise ______ to stop CometRow chat and start the breach log, from ______ until revoked. Signed ______ Date ______"

**Or, no deputy:** accepted risk for the alpha; the owner is reachable within ___ hours. Signed ______ Date ______
