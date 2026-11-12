Status: DRAFT, needs owner approval (12 November 2026)

# 18+ age rule — alpha

**Not legally reviewed.** Checklist rows B15/C6. Existing coverage:

- `docs/terms-draft-20261023.md` section 2 has one sentence: "You must be at least 18 years old."
- The in-app "Trial scope and safety" note says the trial is for adults aged 18 and over (`src/App.tsx:1344`).
- The sign-in screen has no age line and no confirmation.
- Nothing says how age is checked or what happens if a minor is found.

This file fills those gaps. It changes no code.

## The rule

CometRow's alpha is for people aged 18 or over only. No exceptions, and no parental consent route.

## Wording

**Terms, section 2 (replaces the current sentence):**
> You must be 18 or older to use CometRow. By accepting your invitation and signing in, you confirm that you are. If we learn that an account belongs to someone under 18, we close it and delete its data.

**Invitation message (sent by the owner personally, before the address goes on the allowlist):**
> CometRow's alpha is for adults only. Please reply to confirm you are 18 or older. I will add your email address once you do.

**Sign-in screen (one line above the sign-in buttons, plus a required tick box):**
> CometRow is for adults. [ ] I am 18 or older.

The tick box must be ticked before "Continue with Google" or "Continue with email" works. Wording on the button stays as it is.

## How it is checked

- **Self-declaration, twice:** once in reply to the personal invitation, and once with the tick box at sign-in.
- **No ID check**, no date of birth and no age-estimation service. For up to 10 invited friends known to the owner, collecting ID would be more data than the risk justifies (data minimisation, GDPR Art. 5(1)(c)).
- **Record:** the owner keeps the invitee's "yes" reply, with the date, in the private invite notes (not in the repository). The tick box is not stored on the server, because that would need a new database column and a migration (see "Code" below). If the owner wants a server record, that is a separate decision.

## Why 18 and not 16

- **GDPR Art. 8:** where a service relies on consent, a child's consent counts only from age 16. Germany did not lower that age (member states may go down to 13). CometRow relies on consent for health and other special-category details (Art. 9(2)(a), `docs/health-consent-draft-20261112.md`), and for each web search. Under 16, that consent would not be valid without a parent.
- **Health consent:** explicit consent to process health data requires a person able to give it on their own. An 18 limit removes any doubt about 16- and 17-year-olds.
- **Contracts:** in Germany, people under 18 have only limited capacity to contract (BGB sections 106 to 108). Paid plans would need a parent's approval. 18 keeps the terms valid without that.
- **Supplier and safety:** Tinfoil's AUP has no age rule (read 12 November 2026). The assistant's safety instructions were evaluated for adults (`src/App.tsx:1344`). Neither covers minors.

## If a minor is discovered

1. **Same day:** remove the address from `allowedEmails` in the deployment config and redeploy (this stops new sign-ins). Sessions are configured for one hour (`server/account-auth.ts:263`).
2. **Tell the person** briefly that the alpha is adults-only and their account is being deleted. Ask them to use "Delete everything on this device" in Saved, since their saved history and health-consent choice live only in their browser. We cannot delete those for them.
3. **Delete server data for that account:** the `"user"` row, which cascades to sign-in methods, passkeys, sessions, security events, email proofs, counters and consent rows (`docs/retention-activation-proposal-20261022.md` section 2). Also delete their `usage_*` rows, which are keyed by the account ID with no foreign key, and any test-mode `billing_*` rows. Do not wait for the seven-day closure delay. Their consent was never valid.
4. **Gap:** no hosted-capable deletion exists today. The only purge (`server/inactive-consumer-retention.ts`) refuses any database but the synthetic one. Until one exists, step 3 is a manual SQL deletion by the owner as schema owner, done in a transaction with a count check first. This is **unknown** as a tested procedure.
5. **Backups:** Render's paid PostgreSQL keeps a three-day point-in-time window (`docs/development-deployment.md:157`). The art. 30 draft (row 6) says backups are "not set up". These records conflict, so whether copies outlive the deletion, and for how long, is **unknown**. Tell the person the honest figure once it is known.
6. **Record** the date, the reason ("under 18") and the row counts deleted in the private log, without name or email. If the person had given health consent, note that it was treated as void.

## Code: where a confirmation would go (not changed)

- **Hosted sign-in screen:** `src/AccountLab.tsx`. `src/main.tsx:17-34` renders it at `/account` with `synthetic=false`. The "Log in or sign up" heading is at about line 304 and the intro paragraph at line 307. The "Continue with Google" button is at about lines 495-512 (`onClick={() => action(() => social(provider))}`). The email field (line 515) and "Continue with email" (about line 556) follow. The tick box belongs between the intro paragraph and the social buttons. Its state should be added to each button's existing `disabled` condition.
- **On-device storage, if wanted:** follow the health-consent pattern (`src/health-consent.ts`, `shared/health-consent.ts`, `src/HealthConsent.tsx`), which stores a versioned choice in the browser only.
- **Server-side record, if wanted:** a column or table next to `"user"` (`server/migrations/0001-consumer-auth.sql`) would need a new migration. A new migration makes older releases refuse to start (`server/account-migrations.ts:61-69`, "Migration history is unknown..."), so it limits rollback. Not recommended for the alpha.
- **Older invitation page:** `server/access-page.ts` ("Accept your invitation", used by the SQLite invite registry in `server/app.ts`) is the older trial access model. If it is ever served again, the same line and tick box belong above its register form.
- **Allowlist (the "invite"):** `server/deployment-config.ts:17` (`allowedEmails`, at most 10) and `server/account-auth.ts:160-164`. There is no invite record in the database to attach a declaration to.
- `src/AccountPreview.tsx` is a design preview. It is not the live sign-in.
