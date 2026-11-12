Status: DRAFT, needs owner approval (12 November 2026)

# Inactivity retention (checklist D12): proposal

Nothing in this document is active, and no code was changed. It builds on `docs/retention-activation-proposal-20261022.md`, which covers deletion after a user *closes* an account. That proposal recommended deferring an inactivity rule (its check 1). No inactivity proposal existed before this one.

**ID clash:** in `docs/owner-decisions.md`, D12 is "scan recall" (row 43). Row 26 lists both "D12 (scan recall)" and "D12 inactivity rule". The checklist row D12 (`docs/pre-alpha-checklist.md:43`) is this inactivity rule. *Owner: renumber one of them.*

## 1. Correction to the checklist row

The row says "`server/inactive-retention.ts` exists, not wired". That file **is not an inactivity rule and does not touch the hosted accounts:**

- It works on the SQLite invitation registry (`invites`, `access_settings`) of the older restricted-trial access model (`server/app.ts`, `server/access-page.ts`). The hosted alpha signs in through PostgreSQL consumer accounts (`server/deployment-process.ts` → `server/account-auth.ts`), with the `allowedEmails` list as its invite (`server/deployment-config.ts:17`).
- It deletes invitation rows that *expired or were revoked* more than seven days ago. It never reads sign-in times.

Wiring it would delete nothing on app.cometrow.com. The closure purge, `server/inactive-consumer-retention.ts`, is also not an inactivity rule: it purges closed accounts and refuses any database but `privateai_synthetic`. **No code anywhere decides by inactivity.** An inactivity rule is new work, not wiring.

## 2. What the server holds per account (hosted PostgreSQL)

From the migrations in `server/migrations/` and `docs/art30-record-draft-20261112.md`. Saved conversations and the health-consent choice are only in the user's browser, so neither a server rule nor closure can reach them.

| Data | Table(s) | Kept today |
| --- | --- | --- |
| Email address, verified flag, created/updated time (name and image are forced empty, `server/account-auth.ts:185-190`) | `"user"` | until closure and purge |
| Google link (provider ID and Google account ID; provider tokens discarded) | `account` | same |
| Passkey public keys | `passkey` | same |
| Sessions (one-hour lifetime; IP address and browser string forced empty, `server/account-auth.ts:192-209`) | `session` | expiry is 1 h; whether expired rows are ever deleted is **unknown** |
| Security notices, credential-change time, email proofs, request counters, search consent | `account_security_event`, `account_credential_change`, `account_email_proof`, `consumer_request_count`, `research_consent` | cascade with the user |
| Closure receipt | `account_closure` | kept as audit trail |
| Request records: account ID, time, model, tokens, cost; no content | `usage_accounts`, `usage_allowances`, `usage_requests`, `usage_metrics` | requests and metrics 90 days (daily purge, `server/request-retention.ts`); `usage_accounts` and `usage_allowances` rows: no end date |
| Billing (test mode only) | `billing_*` | no rule |
| Sign-in codes; delivery log (hashed address) | `verification`; `signin_delivery` | codes expire in 5 min, row deletion **unknown**; delivery log 1 day |
| Rate-limit counters | `rateLimit` | keyed by text; whether the key holds an address is **unknown** |
| Platform logs and backups | Render | log retention **unknown**; backups conflict: three-day PITR (`docs/development-deployment.md:157`) vs "not set up" (art. 30 row 6) |

**No reliable "last sign-in" exists.** `session` rows last one hour and may be removed. `"user"."updatedAt"` is not a sign-in time. Request records are purged at 90 days. Any rule longer than 90 days needs a new timestamp first.

## 3. Options

**A. Alpha-only, no code (recommended for now).**
- Rule text: "Alpha accounts are deleted [OWNER: 30] days after the alpha ends, unless you tell us you want to move to the full service. If you stop using CometRow earlier, tell us and we delete your account, or close it yourself on the account page."
- During the alpha, every [OWNER: 3] months, the owner checks the 10 allowlisted people by personal message. Anyone who has left is removed from `allowedEmails` and their data is deleted the same way as in `docs/age-rule-draft-20261112.md`, "If a minor is discovered", step 3.
- This works with email delivery off, because the owner knows each user.
- The alpha's end date is **unknown**. The owner must set one, or the rule has no end.

**B. Full rule for the public service: warn at 11 months, delete at 12 months without a sign-in.**
- One warning by email at 11 months, and a second one 7 days before deletion. Signing in once cancels the deletion.
- Deletion uses the same cascade as closure (retention proposal, section 2). Usage rows already go after 90 days. Billing rows follow the billing-retention decision, which is still open.
- Needs email delivery on in the hosted runtime. Today it is off (`server/deployment-process.ts:110`, "email disabled").

**C. No rule.** Keep data until the user closes the account. This is legal only if the privacy policy says so and the storage-limitation argument (Art. 5(1)(e)) holds. It is weak for a public service, and acceptable only for a small alpha with a defined end. Option A is that.

## 4. What option B would take (not started)

| Step | File(s) | Notes |
| --- | --- | --- |
| Record last sign-in | `server/account-access.ts` `recordSessionAccess` (line 59; runs on every new session) | upsert one timestamp per user |
| Where the timestamp lives | either new migration `server/migrations/0021-…sql`, or an operator-SQL table like the request purge (`server/request-retention.ts`, "Not a migration") | **Migration:** older releases then refuse to start (`server/account-migrations.ts:61-69`), so rollback to a pre-0021 build is blocked. **Operator SQL:** rollback stays possible; the table must exist before the new build starts. Recommendation: operator SQL, same as the 90-day purge. |
| Grants | `server/account-privileges.ts` | runtime role: INSERT/UPDATE on the timestamp only. Deletion through a SECURITY DEFINER function or a separate purge role, never runtime DELETE on `"user"` |
| Hosted-capable purge | new function modelled on `server/inactive-consumer-retention.ts` | database-name allowlist, dry run with counts only, holds respected, one transaction, `physicalErasureVerified: false`. Same as retention proposal check 2 |
| Warnings | `server/account-email.ts` | needs a working sender; record "warned at" so deletion cannot happen without a warning |
| Schedule | `server/deployment-process.ts:114` (next to `scheduleRequestPurge`) | daily; counts-only log lines |
| Disclosure | `shared/privacy-policy.ts` (retention and deletion sections), the terms, `docs/backup-retention-policy.md` | `shared/privacy-copy.ts` is the approved statement and makes no inactivity promise; it needs no change unless the owner wants one |
| Tests | `tests/account-access.test.ts` pattern on the synthetic container | not warned → kept; warned and past 12 months → deleted; signed in after warning → kept; held → kept; second run → no-op; dry run → no writes |

Rough effort: 1 to 2 days of engineering plus owner review. Rollback before the first real run: stop the schedule, and the unused timestamp table can stay. After a run there is no per-account undo: deletion is final apart from a full point-in-time restore, which is a disaster procedure (retention proposal section 4).

**Do not wire `server/inactive-retention.ts` for this.** It targets the wrong store. If the SQLite registry is retired, delete the file and `tests/inactive-retention.test.ts` instead.

## 5. Recommended default

- **Alpha:** option A. No code, no migration, no change to the approved privacy statement, which already promises no inactivity deletion and stays true.
  - The owner sets the alpha end date and the post-alpha deletion period.
  - Add one sentence to the terms draft before sending invitations.
- **Before any public sign-up:** option B, with the timestamp held by operator SQL (no migration). Ship the disclosure in the same release as the code, never before it. First real run done by the owner, after a reviewed dry run.
- **Owner decisions needed:**
  1. Option A for the alpha: yes or no.
  2. Alpha end date and deletion period.
  3. The 11/12-month figures for option B.
  4. Renumber the D12 clash.
  5. Correct the checklist D12 row wording, using section 1 above.
