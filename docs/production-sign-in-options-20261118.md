# Sign-in in production: options with email off (18 November 2026)

Question from the owner: how does an invited friend sign in on the hosted app while email is off? What does each other option need from me, with effort, cost and risk? Which one should I pick?

Short answer: **today the only way in is "Continue with Google", and only for an address on the allowlist.** Email codes, Apple, passkeys and invite links do not work on the hosted app. For a few friends, stay with Google. Add email codes (an EU sender) before you go wider than friends.

Method: read the code at the current branch (`codex/development-handoff`, last commit `7598d7b`) and the docs. Prices were read from vendor or third-party pages on 18 November 2026. Nothing was deployed, created or sent. Labels: **verified in code** means read in this repository; **owner-reported** means from earlier owner reports in the docs; **to confirm** means not checked.

## 1. What exists today (verified in code)

### 1.1 How production reads its sign-in settings

| Setting | Where | What it does |
| --- | --- | --- |
| `email` | `server/deployment-config.ts:14` | Accepts only the value `"disabled"`. There is no setting that turns email on. |
| Email sender | `server/deployment-process.ts:87-90` | Hard-coded: `emailEnabled: false`, and `deliverCode` throws "Email delivery disabled." |
| Sender adapter | `server/account-email.ts:7-10`, `server/account-email.ts:20-47` | Only the shape of a sender and a 10-second wrapper. No adapter for any mail service is in the repository (also `docs/scheduled-tasks-design-20261114.md:48`). |
| Email text | `server/email-template.ts:1-3`, `:10` | The code email exists (English and German, "expires in 5 minutes"). Its own comment says it sends nothing. |
| `allowedEmails` | `server/deployment-config.ts:20` | 1 to 10 exact addresses. Required on Render (`:294-298`) and whenever Google or Apple is on (`:290-293`). |
| `socialCredentialsFile` | `server/deployment-config.ts:19`, `:404-412` | A secret JSON file with a `google` and/or an `apple` block (`server/account-social.ts:11-35`). On Render it is `/etc/secrets/google-social.json` (`docs/render-deploy-and-live-checks-20261113.md:61`, `:104`). |
| Passkeys, invites | none | No config key. See 1.5 and 1.6. |

So "email off" is not a switch you can flip. Turning email on needs code: a sender adapter, a config field for it, and a change in `deployment-process.ts`.

### 1.2 Google sign-in (works today)

- The production entry is `server/render-entry.ts:1-2`, then `server/deployment-process.ts:75-91`, then `server/consumer-workspace.ts:109-112`, then `createProductionAccountCandidate` (`server/account-auth.ts:95-129`).
- Google and Apple are read from the social file (`server/account-social.ts:62-100`). Scopes are only `openid` and `email` (`:115`). Authorization-code flow with PKCE (`:113-117`). Provider tokens are thrown away (`server/account-auth.ts:211-222`, `:1006-1013`).
- The account server checks two things on every Google or Apple sign-in: the provider says the email is verified, and the address is on `allowedEmails` (`server/account-auth.ts:160-164`, `:225-235`). Otherwise the sign-in is refused.
- The first successful sign-in creates the account. There is no separate "redeem invite" step.
- Sessions last 1 hour after last use: `expiresIn` 3600 with `updateAge` 300 extends an active session (`server/account-auth.ts:262-266`; also `docs/render-deploy-and-live-checks-20261113.md:412`). After 1 hour idle the friend clicks Google again.
- Redirect URI for the Google console: `https://app.cometrow.com/api/auth/callback/google` (origin `shared/account-design.ts:17-18`, path `:10-13`).
- Owner-reported: Google sign-in, sign-out and "second identity denied" passed on laptop and phone (`docs/READINESS.md:627`, `:633`, `:636`).

### 1.3 Email one-time codes (built, but off in production)

- 8 digits, valid 300 seconds (5 minutes), 3 tries, stored as a keyed hash, a new code replaces the old one (`server/account-auth.ts:458-470`).
- Limits: 3 code requests per minute per client (`:470`), 5 codes per address per hour across all clients (`:59`, `:387-400`). The delivery log stores only a keyed hash of the address (`:153-158`, `:474-482`).
- Only sign-in codes; other code types are refused (`:295-300`, `:472-473`).
- With email off, the server reports `emailEnabled: false` (`server/account-auth.ts:616-628`) and the page greys out the email box and button (`src/AccountLab.tsx:571`, `:591`) and shows "Email sign-in and recovery are not available yet. Use Google to sign in." (`src/AccountLab.tsx:602-606`, `src/text/account.ts:82`).
- **Impossible with email off:** signing in with a code.

### 1.4 Apple sign-in (half built, not usable in production)

- Server side is ready: the `apple` block needs `clientId` (Services ID), `teamId`, `keyId` and an ES256 `privateKey` (`server/account-social.ts:22-33`, `:67-96`). Apple's callback is a cross-site `form_post` (`:117`), which the account server accepts from `https://appleid.apple.com` (`server/account-auth.ts:546-549`).
- **Blocker 1, the page:** production renders only the Google button. Apple is shown only in the test lab (`src/AccountLab.tsx:540-543`).
- **Blocker 2, the Render bridge:** the bridge in front of the app refuses any POST whose `Origin` is not `https://app.cometrow.com` (`server/render-bridge.ts:60`, `:73-91`). Apple's callback POST comes with `Origin: https://appleid.apple.com`, so it would get "Request not admitted." before it reaches the account server. (Reading of the code; not tested live.)
- **Blocker 3, Hide My Email:** if the friend chooses to hide their email, Apple gives a random relay address. It is not on `allowedEmails`, so the allowlist check refuses it (`server/account-auth.ts:160-164`, `:225-235`). You cannot add the relay address in advance because it is made at first sign-in.
- Redirect URI for Apple would be `https://app.cometrow.com/api/auth/callback/apple` (`shared/account-design.ts:13`).
- **Impossible today:** Apple sign-in on the hosted app, even with a key.

### 1.5 Passkeys (not a first sign-in, and hidden in production)

- Adding a passkey needs a signed-in session (`registration.requireSession: true`, `server/account-auth.ts:500-501`). So **a passkey can never be the first sign-in.** Someone must first get in with Google or email.
- The production page hides both "Add passkey" (`src/AccountLab.tsx:437-455`, comment: owner decision of 20 October) and "Sign in with a passkey" (`src/AccountLab.tsx:646-662`, shown only when `synthetic`).
- The server routes exist (`server/account-auth.ts:1022-1025`). Allowing passkeys is open owner decision 44 (`docs/owner-walkthrough.md:547-555`).

### 1.6 Invitations and invite links

- There is an older access-ID and invitation registry (`server/invite-registry.ts:13-72`, page text `server/access-page.ts:26`). It is wired only in the local entry `server/index.ts:63-64` (`PRIVATEAI_INVITES_FILE`) and mounted only when that is set (`server/app.ts:314`). The production path passes no `invites` (`server/consumer-workspace.ts:109-128`). **It is not on the hosted app.**
- No magic link, access code or invite-link sign-in exists for the hosted app.
- **On the hosted app, an "invitation" is just an address in `allowedEmails` plus a redeploy** (`docs/owner-walkthrough.md:583`). The app sends nothing. You tell the friend yourself.
- Limit: 10 addresses, and your own address and the test account count (`server/deployment-config.ts:20`, `docs/render-deploy-and-live-checks-20261113.md` section 2.3 "Rules for this file").

### 1.7 What needs email even after sign-in

Closing an account and removing a method need a fresh "email proof", which only an email-code sign-in creates (`server/account-access.ts:84-90`). "Finish recovery" needs only a sign-in less than 5 minutes old on the server (`server/account-recovery.ts:25-35`), but the page disables its button while email is off (`src/AccountLab.tsx:388-389`).

| Action | Code | With email off |
| --- | --- | --- |
| Close my account | `server/account-closure.ts:22-34`, button `src/AccountDeletion.tsx:82-87` | Impossible. Support closes it with `scripts/account-operator.ts` (`docs/invited-trial-runbook.md:405-430`) |
| Remove a sign-in method | `server/account-access.ts:121-134`, `src/AccountAccess.tsx:163-189` | Impossible |
| Finish sign-in recovery | `src/AccountLab.tsx:388-414` (button disabled); server `server/account-recovery.ts:7-35` | Not offered on the page |
| Security notices by email | `server/security-notices.ts:19` ("no scheduler, provider credentials or network implementation") | Queued, never sent |

This is open decision R2 (`docs/pre-alpha-checklist.md:177`) and step 41 (`docs/owner-walkthrough.md:517-527`).

## 2. What an invited friend sees and does today (email off)

Before: you add their Google address, lower case, to `allowedEmails` in the Render secret file `render-config.json`, choose **Save only**, and deploy the same commit (`docs/owner-walkthrough.md:583`). If the Google project is still in "Testing", also add them as a test user to be safe (see 3.1).

1. You send the friend `https://app.cometrow.com` yourself (chat, SMS). The app sends no invite.
2. Signed out, the app gets 401 from `/api/status` and goes to `/auth` (`src/App.tsx:767-774`), which redirects to `/account` (`server/consumer-workspace.ts:190`), the sign-in page (`src/main.tsx:25`, `:43`). So the plain address is enough.
3. They see "Log in or sign up" (`src/text/account.ts:36`), one active button "Continue with Google", a greyed-out email box and "Email sign-in and recovery are not available yet. Use Google to sign in." (`src/AccountLab.tsx:540-606`). No Apple button, no passkey button.
4. They click Google, pick the Google account with the invited address and agree to share their email address.
5. Google sends them back to `/account` (`src/AccountLab.tsx:298`), now signed in, showing "Signed in as" their address and an "Open workspace" link (`src/AccountLab.tsx:366-375`, `src/text/account.ts:41`). They click it. The first sign-in creates their account.
6. Wrong Google account, or address not on the list: they land back on the sign-in page with "Provider sign-in or linking did not complete. Your existing sign-in methods are unchanged." (`src/text/account.ts:12-13`; owner-reported `docs/READINESS.md:633`).
7. After 1 hour without use they are signed out and click Google again (`server/account-auth.ts:262-266`).

What they cannot do: use any address that is not a Google account, sign in without Google, close their account themselves, or recover access if they lose their Google account. All of that goes through you.

## 3. The options

### 3.1 Option A: Google only (what runs today)

**What you must do**
1. T-16: Google Cloud console, Google Auth Platform, Audience: read the publishing status (`docs/owner-test-list.md:119-122`).
2. Branding: app name CometRow, home page, privacy policy link (checklist L12, `docs/pre-alpha-checklist.md:142`).
3. Per friend: add the address to `allowedEmails`, Save only, deploy. If the status is "Testing", add them as a test user.
4. Clear the Safe Browsing warning first (R4, `docs/pre-alpha-checklist.md:179`): it can show right at sign-in.

**Google's rules (official page, read 18 November 2026: https://support.google.com/cloud/answer/15549945)**
- "Testing" allows up to 100 test users. Their consent normally expires after 7 days and they see an unverified-app warning.
- Exception: apps that request only name, email and profile (`openid`, `email`, `profile`) get no warning and no 7-day expiry. CometRow asks only for `openid` and `email` (`server/account-social.ts:115`).
- **To confirm:** whether a Google account *not* on the test-user list can get through while in "Testing" with only these scopes. The page is not explicit. Adding each friend as a test user avoids the question.
- "In production" lets any Google account through Google; the CometRow allowlist is then the only gate. Showing your app name and logo on the consent screen may need brand verification (https://support.google.com/cloud/answer/13464321, which does not say how long it takes).

| | |
| --- | --- |
| Effort | Already done. About 15 minutes once (T-16, branding), then about 10 minutes per friend (edit, deploy, check). |
| Money | None found for Google sign-in itself (to confirm; no price page lists a charge). |
| Privacy | Google learns each sign-in time and that the person uses CometRow. The record of processing lists Google as a recipient for sign-in with transfer basis "unknown" (`docs/art30-record-draft-20261112.md:9`, `:20`). Whether Google acts as a separate controller (no DPA) or needs one is a question for the legal reader. The privacy policy does not yet name Google sign-in as a recipient (D14, `docs/owner-decisions.md:273`). |
| Risks | Friends without a Google account cannot join. Losing the Google account means losing CometRow access, with only you to fix it. Google is a single point of failure for sign-in. Google sign-in is a US company. No self-service closure (1.7). 10 addresses at most. |

### 3.2 Option B: email one-time codes with an EU sender

**What must be built (agent, not you):** an adapter that sends `server/email-template.ts` through the sender's API, a config field for "enabled" plus a key file and the From address (today `server/deployment-config.ts:14` refuses anything but `"disabled"`), wiring in `server/deployment-process.ts:87-90`, tests, and a check that the cap and messages work live. About 1 working day, as `docs/pre-alpha-checklist.md:177` estimates ("1–2 days if email").

**What you must do**
1. Choose a sender and open an account. Accept its data processing agreement (DPA, GDPR Art. 28) and file it.
2. Add a sending domain. A subdomain such as `mail.cometrow.com` keeps your support mailbox safe.
3. Add the DNS records the sender gives you, at your DNS host (Cloudflare per `docs/render-deploy-and-live-checks-20261113.md:449`, to confirm):
   - SPF: one TXT record. If the domain already has an SPF record for the support mailbox, merge the sender's `include:` into it. Two SPF records break both.
   - DKIM: usually one or more TXT or CNAME records from the sender.
   - DMARC: TXT at `_dmarc.cometrow.com`, start with `v=DMARC1; p=none; rua=mailto:<a mailbox you read>`, tighten later.
   - Return-Path or MX record if the sender asks for one.
4. Create an API key with "send only" rights. Upload it as a new Render secret file. Never paste it in chat.
5. Decide R2 and step 41 (closure by email code).
6. Update the privacy policy: the sender as a processor.
7. Test: send yourself a code to Gmail, Outlook and GMX or Web.de, and check it arrives in under 1 minute and not in spam.

**Senders compared (prices read 18 November 2026)**

| Sender | Where | Free | Paid | Source | Notes |
| --- | --- | --- | --- | --- | --- |
| Scaleway Transactional Email | France (Scaleway's own servers) | 300 emails a month | EUR 0.25 per 1,000 after that, no monthly fee ("Essential"). "Scale" plan: 100,000 included plus a dedicated IP; its price (EUR 80 a month) is from a search summary only | 300 free and EUR 0.25: https://european-alternatives.eu/product/scaleway-transactional-email (third-party page, opened). 300 free and the Scale plan: Scaleway's docs source, https://raw.githubusercontent.com/scaleway/docs-content/main/pages/transactional-email/how-to/manage-tem-plans.mdx (opened). Scaleway's own web pages refused automated reading (HTTP 403): **confirm** on https://www.scaleway.com/en/transactional-email-tem/ | EU cloud provider. Pay-as-you-go needs a card (to confirm). |
| Lettermint | EU; company country to confirm | 300 emails a month | EUR 10 a month for 10,000, then EUR 1.50 per 1,000 | https://lettermint.co/pricing (vendor page, opened) | Says it "processes and stores your email data only in the EU". |
| Brevo | France | 300 emails a day | Paid prices to confirm | Search summary only, page not opened (https://www.brevo.com/features/email-api/ and https://www.brevo.com/pricing/ did not load for automated reading) | Review sites say free sends carry a Brevo logo and new accounts wait for approval (to confirm). Marketing-heavy product. |

Alpha volume: a few friends, at most 5 codes per person per hour (`server/account-auth.ts:59`). Expect well under 300 emails a month, so **EUR 0 with any of the three**.

| | |
| --- | --- |
| Effort | You: 2 to 3 hours (account, DPA, DNS, key file, tests), plus DNS wait. Agent: about 1 day. |
| Money | EUR 0 at alpha volume (see table). |
| Privacy | The sender is your processor: it sees the address, the time and the code. The friend's mailbox provider also sees it (Google for Gmail users). Choose a sender with an EU location and a DPA. The code expires after 5 minutes, so an old email is useless. |
| Risks | Deliverability: a new domain can land in spam at first; codes expire in 5 minutes (`server/account-auth.ts:460`). Sender outage means no email sign-in; Google still works. A wrong SPF merge can break the support mailbox. The 5-per-hour cap lets someone block a friend's codes for an hour by spamming requests (`docs/pre-alpha-checklist.md:169`). Little lock-in: the adapter is one small file. |
| Gain | Anyone with an email address can join. Self-service closure, method removal and recovery start working (1.7). It removes the single dependency on Google. |

### 3.3 Option C: Sign in with Apple

**What you must do**
1. Join the Apple Developer Program. **99 USD per membership year, shown in local currency at enrolment** (https://developer.apple.com/programs/enroll/, read 18 November 2026). As an individual you need your legal name, 2-factor Apple account, phone and address; no D-U-N-S number. As an organisation you need a legal entity and a D-U-N-S number, which you do not have yet.
2. In Certificates, Identifiers & Profiles: create an App ID with Sign in with Apple, a Services ID (this becomes `clientId`), add the domain `app.cometrow.com` and the return URL `https://app.cometrow.com/api/auth/callback/apple`, and create a Sign in with Apple key (.p8). Note the Team ID and Key ID.
3. Add an `apple` block with `clientId`, `teamId`, `keyId`, `privateKey` to the social secret file (`server/account-social.ts:22-33`).
4. If you ever send email to relay addresses: register your sending domain with Apple and pass SPF and/or DKIM, or the mail bounces. Individuals can register up to 32 sources (https://developer.apple.com/help/account/capabilities/configure-private-email-relay-service, read 18 November 2026).

**What must be built (agent):** show the Apple button in production (`src/AccountLab.tsx:540-543`); let Apple's callback POST through the Render bridge (`server/render-bridge.ts:85-86`); check the sign-in state survives Apple's cross-site POST with `SameSite=Lax` cookies (`server/account-auth.ts:274`; not checked); live test with a real Apple account and with Hide My Email. About half a day to a day.

| | |
| --- | --- |
| Effort | You: 2 to 4 hours plus Apple's enrolment review (time to confirm). Agent: 0.5 to 1 day. |
| Money | 99 USD a year (price in EUR to confirm at enrolment). |
| Privacy | Apple learns each sign-in. With Hide My Email, you never learn the real address, which fits the privacy pitch. |
| Risks | Hide My Email clashes with the allowlist (1.4): friends must choose "Share My Email" during the alpha. A yearly fee that must not lapse (what happens to sign-in if the membership lapses: to confirm). As an individual your legal name is on the account. Apple sends the email reliably only at first authorisation (to confirm). Most of your friends with an iPhone can also use Google or email. |

### 3.4 Option D: passkeys

Not a first sign-in (1.5). A passkey can only be a second method after Google or email.

| | |
| --- | --- |
| What you must do | Decide step 44 "allow passkeys" (`docs/owner-walkthrough.md:547-555`), ideally after T-126 (PRF support on your devices). |
| Effort | Agent: about half a day to unhide "Add passkey" and add "Sign in with a passkey" in production, plus device tests. You: 1 hour of device tests. |
| Money | None. |
| Privacy | Best of all options: no third party sees the sign-in. |
| Risks | Does not solve the first sign-in. Losing every device with the passkey still needs another method; removing a passkey needs an email code (1.7). |

### 3.5 Option E: invite links or access codes

Not on the hosted app (1.6). Building one would be new sign-in code with its own threat model, link leaks and expiry handling. Email codes give the same result with code that already exists and is tested. **Do not build this.**

## 4. Side by side

| Option | Works on hosted today? | Your effort | Agent effort | Money | Main risk |
| --- | --- | --- | --- | --- | --- |
| A. Google only | **Yes** | 15 min once, 10 min per friend | none | 0 | Friends without Google; Google is the only way in |
| B. Email codes, EU sender | No (code needed) | 2-3 h | about 1 day | EUR 0 at alpha volume | Deliverability, a new processor |
| C. Apple | No (2 code blockers) | 2-4 h plus review | 0.5-1 day | 99 USD a year | Hide My Email vs allowlist; yearly fee |
| D. Passkeys | No (hidden, never first) | 1 h tests | about 0.5 day | 0 | Does not solve first sign-in |
| E. Invite links | No (not built) | n/a | several days | 0 | New sign-in code to secure |

## 5. Recommendation

**For the invite-only alpha of a few friends: Option A, Google only, as it runs today.** It is live, tested by you on laptop and phone, costs nothing, and matches your recorded decision (`docs/ARCHITECTURE.md:55`, `docs/owner-decisions.md:191`).

Do these before the first friend:
1. T-16: read the Google publishing status. Add each friend as a test user if it says "Testing".
2. Set the Google branding to CometRow (L12).
3. Clear the Safe Browsing warning (R4).
4. Pick only friends who have a Google account, and ask them which Google address they use.
5. Decide step 41 as "(b) support closes on request" for now, and tell friends to write to support to close their account.

**Add next, during the alpha: Option B, email codes with an EU sender.** You decided on 13 November that there is no beta and the alpha must use everything launch needs. Launch needs email (self-service closure, people without Google), so build it while the alpha runs and let the later invitees sign in by email. Scaleway Transactional Email first (French EU cloud, about EUR 0.25 per 1,000 after 300 free a month; confirm on its own page), Lettermint as the fallback. It is the only option that opens CometRow to people without Google and that makes closure, method removal and recovery self-service. Use a subdomain and do SPF, DKIM and DMARC.

**After email: passkeys (D)** as a second method, because they are the most private way to sign in again.

**Skip Apple (C) for now.** It costs 99 USD a year, needs two code changes, and Hide My Email fights the allowlist. Revisit it when there is an iPhone app or friends ask for it.

**Never build invite links (E).**

## 6. Not verified

- Google: whether a Google account not on the test-user list gets through in "Testing" with only `openid` and `email`. The official page is not explicit.
- Google: current publishing status of the CometRow project (T-16 not reported yet).
- Google: whether brand verification is needed for the CometRow name on the consent screen, and how long it takes.
- Scaleway prices: from a third-party page and Scaleway's docs source; Scaleway's own web pages refused automated reading. The EUR 80 Scale price is from a search summary only.
- Brevo: everything in its row is from search summaries; no Brevo page was opened.
- Apple: that Sign in with Apple needs the paid program. No page read here says it outright; it is the common understanding (Certificates, Identifiers & Profiles is a program feature).
- Google: whether it is a separate controller for sign-in or needs a DPA (legal reader).
- Lettermint: company country and DPA terms.
- Apple: the price in EUR, the enrolment review time, what happens if the membership lapses, and whether the email is sent on every sign-in.
- Apple: that the Render bridge blocks Apple's callback is a reading of `server/render-bridge.ts:85-86`, not a live test. Same for the `SameSite=Lax` cookie question.
- DNS host (Cloudflare per the deploy doc) and the support mailbox's existing SPF record.
- No live test of the hosted app was made for this document.
