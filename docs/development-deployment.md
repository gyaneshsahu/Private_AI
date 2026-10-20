# Restricted development deployment

## Restricted Google-only hosted test: exact preflight and rollout boundary

20 October read-only lookup: `app.cometrow.com` has no DNS answer. Credential-file structure is valid, but neither credentials nor registered console callback have been verified by Google. No request containing credentials has been sent.

The smallest next milestone is **owner Google sign-in → cancel/retry → sign-out → denied unauthenticated access**, with private inference and public registration closed. This is deliberately narrower than the later email-recovery/complete product milestone. Email remains fail-closed; do not count it as working because the UI accepts an address.

Before any live change, review these exact elements together:

1. **Target and deployment:** PostgreSQL plus a gateway capable of the tested authenticated mTLS ingress, serving the production-candidate entrypoint. Existing old Render runtime is not that target; do not change only DNS or set raw forwarded-header trust. Retain it for rollback. No new host purchase is approved.
2. **Private runtime configuration:** use the reviewed deployment config, adding `socialCredentialsFile: "/run/privateai/google-social.json"` and `allowedEmails: ["OWNER_EXACT_GOOGLE_EMAIL"]` with an actual operator-provided identity, never the placeholder. File is mounted read-only server-side. Without a nonempty valid allowlist the packaged configuration now fails closed. No unrestricted production enrollment is authorized. Allowed-email changes require review/restart; this admission list does not revoke existing sessions, so use a fresh isolated test database and retain explicit session revocation procedures.
3. **DNS/TLS:** only once that target exists, owner sets `app` to its exact hostname/IP and verifies a valid certificate for app.cometrow.com. Earlier Render CNAME values are conditional reference material, not instructions to point the new flow at the old runtime.
4. **Google console:** owner verifies exact Web-client redirect `https://app.cometrow.com/api/auth/callback/google`; no wildcard or temporary-host callback. Real monitored support identity and accurate public privacy/branding pages remain required for production release.
5. **Acceptance:** owner-listed Google account succeeds; another synthetic approved test identity not on the allowlist is rejected without an account; cancellation does not retry; logout denies old session; no callback code/token appears in app/edge logs; restart preserves account/session policy and private-chat gate. Owner performs real consent; never automate consent with their session. Rollback: remove provider secret reference/restore prior reviewed runtime, revoke test sessions, preserve audit evidence. Do not restore a database over newer revocations.

No monthly service cost is added by this local preflight. A live hosting change still needs one concrete target/cost decision; the previous VM/email/monitoring bundle is not reactivated by Google credential availability.


## Current owner credential step — Google client created, 20 October

The owner created a Google Web OAuth client. Production login now offers Google and email only; Apple backend support remains inactive/preserved and its earlier setup is not an immediate action item.

Open `.local/private-secrets/google-social.json` in Windows Notepad. It is already Git-ignored and its parent ACL is restricted to the current Windows user and SYSTEM. Replace `REPLACE_WITH_GOOGLE_CLIENT_ID` and `REPLACE_WITH_GOOGLE_CLIENT_SECRET` with values from Google Auth Platform → Clients → the Web client. Preserve the JSON structure, save UTF-8, and tell Codex only “Google credentials saved”. Never paste or screenshot the values in chat. Confirm the registered callback is exactly `https://app.cometrow.com/api/auth/callback/google` and authorized JavaScript origin (if used) is `https://app.cometrow.com`.

Saving does not enable a service: no active deployment references this file. Next is redacted configuration validation and a separately reviewed restricted hosting/callback test. This file must not be copied into browser assets, source control, images or general backups. For hosted rollout, provision a separate read-only server-secret mount and set `socialCredentialsFile` to its absolute path only after owner review. Local Windows path is not a hosting mount path. Email supports Gmail addresses but currently configured fail-closed deployment sender must be reviewed before real email-code delivery.


## Google and Apple sign-in setup — current, 20 October

Owner has neither a Google OAuth client nor Apple Developer membership/Services ID. No purchase, console change, live credential activation, account migration or public access is authorized. Phone sign-in has been removed, not deferred in the login UI. Prior account-adapter descriptions below are historical: a production adapter and packaged secret-file wiring now exist, but live interoperability is not verified.

### Costs and recommended sequence

Prepare Google first. Standard OAuth client registration does not require purchasing a paid authentication platform; do not enable Identity Platform, Firebase billing or unrelated paid APIs for this integration. Hosting, PostgreSQL, domain and email delivery remain separate existing/planned costs. Google's cited setup documentation does not give a per-login tariff; no new Google paid service is proposed.

Apple lists **USD 99 per membership year**, charged in local currency where available; verify the actual German checkout total/tax before paying. Enroll as an **individual**, not an incorporated company. Do not purchase yet solely for this integration: membership/primary App ID eligibility, relay-email recovery and token-revocation lifecycle remain prerequisites. [Apple membership](https://developer.apple.com/help/account/membership/program-enrollment/).

### Google: owner setup fields (prepare; do not publish/activate yet)

1. Open Google Cloud Console → create/select a dedicated project, suggested name `PrivateAI`. Open Google Auth Platform → Branding / Get started.
2. App name `PrivateAI`; user support email and developer contact: your real monitored CometRow mailbox (not an uncreated placeholder). Describe the operator as the founder in Germany. Audience: External. Keep a restricted testing rollout until review; add your own test account where the console offers test users.
3. Authorized domain `cometrow.com`. Homepage, privacy and terms URLs must be real, public, accurate pages you own; do not submit invented `/privacy` or `/terms` paths before those pages exist. Complete domain ownership/branding verification requested by Google. Request only `openid` and `email`; no Drive, Gmail or extra scopes.
4. Clients → Create client → **Web application**, name `PrivateAI web`. Authorized redirect URI exactly `https://app.cometrow.com/api/auth/callback/google`. If an authorized JavaScript origin is requested, `https://app.cometrow.com`. No wildcard, localhost or temporary Render production callback.
5. Save the console-generated client ID and client secret in a password manager/server secret store. Do not paste secrets into chat, commit them, or put them in frontend/VITE variables. Tell Codex only that the client exists and where the protected secret file is configured.

[Google setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid), [production policy](https://developers.google.com/identity/protocols/oauth2/production-readiness/policy-compliance), [basic identity scope publishing distinctions](https://developers.google.com/identity/protocols/oauth2/production-readiness/overview).

### Apple: owner fields after the prerequisites are reviewed

1. Apple Developer → Certificates, Identifiers & Profiles. Enable Sign in with Apple on an eligible primary App ID. Suggested explicit identifier `com.cometrow.privateai` subject to availability; Apple's web configuration requires an associated primary Apple-platform App ID, not just domain ownership. Confirm eligibility before membership purchase.
2. Create Services ID, suggested `com.cometrow.privateai.web` (actual registered value is the client ID). Enable Sign in with Apple and associate it with the primary App ID. Website domain `app.cometrow.com`; return URL exactly `https://app.cometrow.com/api/auth/callback/apple`.
3. Create a Sign in with Apple key linked to that primary App ID. Download the `.p8` once to protected storage; record its Key ID and your Team ID. Never send the key in chat. The server signs a fresh ES256 client secret with five-minute lifetime; the `.p8` still requires operator rotation/revocation controls.
4. Before recovery-email tests, register the actual outgoing email sources with Apple's Private Email Relay and configure the selected sender's SPF/DKIM. Test both real and Hide My Email identities. The sender is not activated by this work.

[Apple web setup](https://developer.apple.com/help/account/capabilities/configure-sign-in-with-apple-for-the-web/), [private key](https://developer.apple.com/help/account/capabilities/create-a-sign-in-with-apple-private-key/), [relay setup](https://developer.apple.com/help/account/capabilities/configure-private-email-relay-service/).

### Server preparation — no secrets in the deployment manifest

`loadDeploymentConfig` now accepts optional absolute `socialCredentialsFile`. Omit it to keep both providers disabled. The file is bounded, strictly parsed and read only server-side; malformed/empty configurations fail startup with redacted diagnostics. Runtime passes validated credentials to the existing production adapter. Example **shape only**, not working credentials:

```json
{
  "google": { "clientId": "CONSOLE_VALUE.apps.googleusercontent.com", "clientSecret": "SERVER_SECRET" },
  "apple": { "clientId": "ACTUAL_SERVICES_ID", "teamId": "ACTUAL_TEAM_ID", "keyId": "ACTUAL_KEY_ID", "privateKey": "PEM_CONTENT_WITH_ESCAPED_NEWLINES" }
}
```

Include only reviewed providers. Mount this file read-only outside browser assets/repository (for example `/run/secrets/privateai-social.json`) and reference that absolute path in the reviewed restricted deployment configuration. Merely adding it to an active deployment would activate configured methods: **owner rollout review is required before mounting/changing the live configuration**. Email remains disabled in this packaged configuration; that prevents email recovery and is a launch blocker even if OAuth sign-in works. No existing deployment file has been changed.

### Acceptance still required before production approval

Local tests cover fixed endpoints, bounded token exchange/discovery, minimal scopes, PKCE/state/nonce/signature/issuer/audience/expiry, Apple form-post, cancellation, replay rejection, PostgreSQL sessions, explicit linking without same-email merging, sign-out and no stored provider tokens. Real provider responses are simulated; no Google/Apple credentials were used.

Remaining: hosted intended-domain HTTPS/mTLS callback checks, real provider consent/cancel/return in desktop and mobile browsers, email recovery including Apple relay, secret rotation/restart, production branding/domain review and live account lifecycle. Keep inference/private data gated during restricted owner testing.

**Apple lifecycle gap:** provider access/refresh/ID tokens are deliberately discarded. Local account closure is not equivalent to revoking the Apple grant. Apple's token-revocation endpoint needs a user token, and signed server notifications for consent revocation/deletion are not implemented here. Before Apple production approval, implement and test a reviewed lifecycle: prefer obtaining a fresh token during explicit Apple reauthentication for grant revocation; evaluate the lost-access path and signed notification handling. Do not start storing long-lived provider tokens without a specific retention/privacy decision. [Apple deletion/revocation guidance](https://developer.apple.com/documentation/technotes/tn3194-handling-account-deletions-and-revoking-tokens-for-sign-in-with-apple), [signed notifications](https://developer.apple.com/documentation/signinwithapple/processing-changes-for-sign-in-with-apple-accounts).


## Next hosted milestone: prepared, not authorized for activation

The minimum-cost action **now** is no migration: retain the existing restricted Render service ($7.25/month recorded recurring base before tax/overages), incremental spend $0. This does not deliver the production-candidate journey. The earlier VM/email/monitoring proposal below is superseded as an activation plan and remains comparison evidence only.

The named next hosted milestone is one restricted synthetic account completing sign-in/recovery, document draft, encrypted save/reopen, authoritative allowance enforcement and sign-out on desktop and Galaxy A52. Model-backed conversation remains separately blocked on provider qualification and answer acceptance; do not present a disabled Send button as successful inference.

| Prerequisite | Concrete decision/evidence required |
| --- | --- |
| Hosting fit | Existing Render must gain a supported trusted-edge adapter plus reviewed durable PostgreSQL arrangement, or the owner must approve a separately priced host fitting Caddy/mTLS/PostgreSQL. Neither path is currently established at zero incremental cost. Do not weaken authenticated ingress to fit Render. |
| Email | Review actual sender/domain, recipient-only payload, tracking/retention, delivery and recovery behavior. Current package deliberately supports disabled delivery; a real email adapter and its integration tests are required before this milestone. No paid email activation. |
| Package | Current locally tested image: `sha256:f4a39a4d635b9205f23308b373384ad625a96775f432ca41c7159c3c9e3fde9d`. App-only compose still requires reviewed gateway/database networking, private configuration and secrets. |
| Rollout | Review exact target, immutable image, DNS/TLS, database migration and backup/restore plan. Retain old restricted service for rollback; never route live accounts to synthetic fixtures. No automatic migration. |
| Hosted verification | Repeat the relevant31 checks against an isolated hosted fixture, then inspect real gateway/log exclusion, backup custody/restore, monitoring and the phone journey. Local success is prerequisite evidence, not a substitute. |
| Release | Provider privacy/retention/authoritative usage and human quality/safety remain independent gates. No private data, public access or invitation approval. |

On20October all31 existing infrastructure checks passed locally, with no skips/failures. The rebuilt actual container passed database interruption/recovery, forced stop/restart and graceful shutdown. See `evaluation/results/infrastructure-20261020.json`. Stop adding isolated infrastructure scenarios absent a concrete failed journey. Next deployment proposal must supply one feasible target and complete incremental cost after the provider/usage architecture is settled; no service purchase is requested now.


## Current minimum-cost decision — 20 October owner steering

The earlier VM/email/monitoring bill of materials is **comparison evidence only, not the current activation plan**. Do not activate those services. Current choice is to retain the existing restricted Render service at its $7.25/month recurring base, with zero incremental hosting spend while provider and quality decisions are open. It cannot yet host the new production candidate unchanged; do not describe it as completing that milestone.

Bring the owner **one revised deployment choice only when it enables a named milestone**: the same built candidate completing hosted synthetic sign-in/recovery → document conversation → encrypted save/reopen → enforced usage → sign-out on desktop and phone. Before that proposal, settle the provider boundary, choose the minimal supported ingress and sender path, reuse an existing mailbox where possible, identify exact incremental monthly/one-off costs and prepare rollback. Include external monitoring and recoverable backups where that hosted milestone needs them; do not pre-buy an entire launch stack. No isolated account/recovery extension unless the connected journey exposes a concrete defect. Supplier qualification, hosted operations and human quality/safety each retain their own acceptance evidence.

## Connected journey and hosting/email proposal — 20 October

Decision status: **proposal for owner review, no purchase or activation**. Keep existing Render unchanged while preparing one synthetic staging deployment on a German Hetzner CX33 using the reviewed Caddy → mTLS Node → PostgreSQL package. This fits the currently tested transport architecture; a Render migration still needs a supported trusted-edge adapter. A single VM is not highly available and requires a named operator for patching, alerts and recovery. Do not buy infrastructure merely to bypass provider or quality blockers.

### Existing spend, verified read-only

Render dashboard on 20 October: Hobby workspace, one `private-ai-deployment` service, selected 0.5c-512mb **$7/month**, **1 GB** persistent disk at `/var/data`. Recurring base is **$7.25/month** using the documented $0.25/GB disk tariff, before applicable tax/overages. Billing shows **$3.06 month-to-date** and **$5.87 projected October total**, not a new recurring plan price. Displayed component rounding ($2.96 compute, $0.11 disk) differs by one cent from the aggregate. Credit $0, no past invoices displayed. These are dashboard figures, not a paid invoice. Service still points to `codex/provider-qualification`, last successful deployed commit `40f2e33b90b40124c74210fd46aae560978bbd12`; development CI success does not deploy the candidate. [Render disks](https://render.com/docs/disks).

### Proposed bill of materials

Sizing assumption: one low-traffic staging/initial-launch instance, one operator mailbox, at most 5,000 transactional messages/month and ten external monitors. No capacity or delivery SLA has been established. Prices checked 20 October; USD and EUR are deliberately not merged using an invented exchange rate.

| Component | Monthly price | Scope / condition |
| --- | --- | --- |
| Hetzner CX33 Germany | €8.49 net | App, gateway and PostgreSQL on one VM; shared failure domain |
| Primary IPv4 | €0.50 net | Public gateway; no public PostgreSQL port |
| BX11 1 TB Storage Box, separate host | €3.20 net | Application-encrypted database backups; separate credentials/key custody; same supplier is not supplier-diverse disaster recovery |
| Brevo Starter, 5,000 sends | from $9 before applicable tax | Proposed transactional API only; sender, retention, DPA and deliverability review required |
| UptimeRobot Solo, 10 monitors, monthly billing | $10 before applicable tax | 60-second external probes, SSL and cron checks; content-free status only, no prompt/account payload |
| Zoho Mail Lite, one 5 GB support mailbox | $1/month equivalent before tax, **$12 paid annually** | Concrete fallback if existing CometRow mailbox is unsuitable; review EU account region, terms and support-data retention before purchase; avoid duplicate subscription |
| PostgreSQL, Caddy, application runtime | $0 additional licence | Operational labour remains additional |
| DNS and public TLS | $0 incremental assumption | Existing registrar DNS plus ACME; verify registrar does not charge extra |

Sources: [Hetzner current compute prices](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/), [IPv4](https://docs.hetzner.com/cloud/servers/primary-ips/overview/), [BX11 price](https://www.hetzner.com/storage/storage-box/bx11/), [Brevo plans](https://help.brevo.com/hc/en-us/articles/208589409-About-Brevo-s-pricing-plans), [monitoring](https://uptimerobot.com/pricing/), [mailbox](https://www.zoho.com/mail/zohomail-pricing.html?src=ft). BX11's product detail explicitly shows €3.20 excluding VAT; do not use the overview's animated intermediate price.

**Fixed proposed hosting/email/monitoring subtotal: €12.19 net + $20/month before USD-service taxes.** With 19% German VAT on the EUR components this is **€14.51 + $20/month**, subject to checkout taxes and currency conversion. While retaining existing Render, overlap is **€14.51 + $27.25/month**, plus applicable USD taxes. Optional VM backups add €1.698 net (20% of compute), approximately €2.02 gross/month; they do not replace application-aware off-host backups. No optional add-on is included silently.

**Complete operating-cost formula:** the above subtotal + actual domain renewal/12 + inference token charges + search usage + payment-processing fees + overages + applicable taxes/FX fees + operator time. Include Apple Developer membership if Apple sign-in ships: **$99/year, $8.25/month equivalent**, with local checkout/tax confirmation ([Apple enrollment](https://developer.apple.com/programs/enroll/)). Domain renewal and existing CometRow mailbox invoices are not available, and inference/search volume and commercial terms are unresolved; therefore a truthful final all-in monthly number is **not yet quotable**. They are not zero. Illustrative fixed subtotal including Apple and Render overlap is €14.51 + $35.50/month, before those remaining items. This is a cost model, not permission to spend or a guarantee of launch capacity.

### Email decision and exact activation prerequisites

Prefer **Brevo for evaluation**, because its documented database hosting is EU-based ([location](https://help.brevo.com/hc/en-us/articles/360001005510-Data-storage-location)). Free permits 300 sends/day; paid Starter avoids that daily limit. Neither quota is a delivery guarantee. Review the exact transactional-log and email-preview retention settings before approval: event data below its threshold can otherwise remain without a time limit; custom transactional retention is a separate control ([retention](https://help.brevo.com/hc/en-us/articles/19317424653586-FAQs-About-the-data-retention-policy-for-email-events)). Disable tracking where supported and do not create marketing contacts from sign-in. Only recipient address, code/security-notice content and necessary delivery metadata go to this service; never conversations/documents. Retention settings require owner action, not agent changes.

Resend remains a simpler developer-oriented alternative at $20/month for 50,000 messages, but EU sending does **not** mean EU storage: its documented storage is in the US. That is a material privacy tradeoff, not an invisible fallback ([pricing](https://resend.com/pricing/), [storage disclosure](https://resend.com/security/gdpr)). No provider adapter is activated by this proposal. Existing packaged email remains fail-closed.

Before changing hosting: owner reviews host/region and operational responsibility; engineering pins the complete gateway/database/app package and rehearses recovery; owner provisions only the approved services and supplies reviewed credentials through secret files. Before sending real email: review sender `signin@auth.cometrow.com` and Reply-To `support@cometrow.com`, verified mailbox, provider-generated DKIM/domain-verification records, SPF compatibility and DMARC policy. **Do not invent provider-generated DNS values or overwrite existing MX/SPF.** Supply exact values once the selected provider generates them. Owner performs DNS/settings changes; engineering tests delivery, delayed/failed mail, bounce handling and receipt reconciliation with synthetic accounts before real users.

The connected built-app test now exercises desktop1280px and mobile390px recovery → local document correction/draft → encrypted save/lock/reopen after runtime reconstruction → durable exhausted allowance → sign-out/re-sign-in with vault still locked. Eight production-workspace tests pass. Allowance attempts are explicit ledger fixtures; the genuine provider gate remains false and rejects a direct request503. **No completed model conversation is claimed.** A fully live journey still requires approved provider transport and a real reviewed sender; mobile emulation does not replace Galaxy A52/TalkBack testing. Keep Tinfoil qualification and held-out human answer-quality acceptance as independent release gates.

## Durable integration release check — 20 October

`npm run build` followed by `npm run test:durable` exercises 16 selected PostgreSQL account, usage, security-notice, production-workspace and synthetic billing suites. Set `PRIVATEAI_SYNTHETIC_PG` only to the loopback database named `privateai_synthetic`; the runner rejects absent/remote/other-database configuration, checks connectivity without printing the connection string, and requires built assets. It fails if any selected test file is absent or any test is failed/skipped. JSON diagnostics are synthetic-only under `.local/diagnostics`, not release evidence by themselves. No automatic retry or live provider key is used.

The Validate workflow now builds before browser-integrated tests and has a separate disposable PostgreSQL 17 service job running this command. It uses the existing synthetic fixture credentials, not production secrets. This makes durable coverage visible in CI; branch-protection configuration is not changed and remote CI success must be observed separately. Docker dump/restore, authenticated ingress, real email/OAuth/passkeys, hosted recovery and provider qualification remain separate checks. Never use a production database with this runner.

## Hosting decision packet — 19 October, bounded assessment complete

**Recommendation:** keep the existing restricted Render service unchanged. Adopt the direct-public Caddy→mTLS app design for the next **synthetic staging** deployment, with a German x86 VM as the proposed destination. Do not migrate production accounts or purchase a host yet. The package is reviewable and runnable locally; it is not a turnkey hosted stack. Resolve provider qualification and useful-answer evidence alongside the remaining host integration, rather than extending isolated infrastructure tests indefinitely.

### Package and demonstrated behavior

- Explicit process/image: `server/deployment-entry.ts`, Docker target `deployment-candidate`; inactive settings in `deployment/config.example.json` and `deployment/compose.yaml`. Reproduction and verified image IDs below. Only the candidate target changes the entrypoint; old Render/default image behavior stays unchanged.
- Final `npm run test:ingress -- --package`: image-contained process scenario passes, then the **actual candidate container with its default entrypoint** passes readiness200→503 while PostgreSQL is paused→200 after unpause; SIGKILL yields137; explicit restart returns readiness200; Docker stop exits0. Read-only filesystem,1GiB memory,128PIDs, dropped capabilities, no-new-privileges and no retained Docker logs. No live credentials, external network or published ports. This tests bounded failures, not sustained load or resource-exhaustion resistance.
- `npm run test:ingress`:16/16existing gateway tests pass, including two-pin certificate overlap and rejection after retiring a pin. These are synthetic certificate/transport tests, not public ACME renewal or provider-attestation revocation evidence.
- Existing `account-restore.test.ts` evidence remains applicable: actual local dump/restore reproduces stale account/usage state; quarantine blocks resurrected access, notice delivery and normal readiness. Corrupt restore fails. The earlier361ms tiny-fixture observation is NOT a hosted recovery promise. No new off-host backup transfer, retention activation or recovery-key custody test occurred here.
- Readiness detects the tested database outage and recovery; existing content-free counters distinguish HTTP completion/interruption. **Independent monitoring/notification is not implemented or qualified.** A check running inside the dead host cannot detect host loss. Do not represent Docker restart or health status as an alerting service.

### Proposed host and tradeoff

Proposed staging tier: Hetzner CX33 in Germany, subject to availability and final checkout. Existing source-backed price evidence below gives compute+IPv4 approximately€10.70/month including19%VAT, or approximately€12.72 with optional VM backup. These are component estimates, not a spending request or an all-in production budget. Add off-host encrypted application backups, independent monitoring, email, inference, traffic overage and operating time. No substitution of tier/region or purchase is authorized. A single VM has a single failure domain and requires OS/database/security maintenance; cheap compute alone is not a reason to choose it.

Render retains the advantage of managed platform operation. Its standard HTTP upstream needs a separately supported and reviewed trusted-edge adapter for this candidate; no such contract has been established. A German VM fits the proven transport path more directly, but moves operating responsibility to us. **Choose the VM direction only if we can staff maintenance and recovery.** Neither host fixes confidential-inference or model-quality failures.

### Remaining steps and decision boundaries

| Before | Required evidence / action | Owner |
| --- | --- | --- |
| Any hosting purchase | Final available tier/region and complete monthly quote, operator/backup responsibility, provider terms and data custody; reviewed architecture choice | Engineering prepares; owner decides and provisions |
| First synthetic hosted run | Gateway+database networking/firewall, runtime vs migration credentials, host secret/key custody, public TLS staging/renewal and internal-pin rotation procedure; explicit image digest | Engineering prepares exact settings; owner applies consequential settings |
| Real accounts/private data | Reviewed sender and real identity-provider interoperability; measured off-host restore and reconciliation; external missing-probe/certificate/backup alerts and response drill; full-device check | Engineering validates; owner supplies access and device checks |
| Private model traffic | Browser→approved current worker/GPU verification, freshness/revocation/TDX and enforceable cache lifetime; opaque-request cost enforcement and authenticated settlement | Supplier evidence plus engineering negative tests; owner approves material architecture changes |
| Limited/public release | Fresh complete-conversation quality/safety acceptance, resolution of material delivery/constraint/math/source failures, commercial/legal/support setup, final release review | Engineering evidence plus explicit human assessment/owner decision |

DNS preparation for the VM path: an `A` record with name `app`, value the **owner-provisioned public IPv4**, DNS-only/direct to Caddy. Do not invent that value, switch the existing record, add a CDN or publish an untestedAAAA record. Callback values already documented below stay tied to `https://app.cometrow.com`. No DNS change requested now. Rollback must retain the previous image/config and check schema compatibility; database restore is a separately quarantined recovery operation, not an automatic effect of DNS rollback.

**Next milestone switches focus:** keep this packet as the single hosting decision record; move to M3 provider/opaque-usage resolution and a bounded, fresh complete-answer comparison selected from the unresolved quality evidence. Check actual spend before paid work; preserve failed/incomplete results and leave human grades blank. Only reopen infrastructure tests for a concrete host integration, new failure or release requirement—not to inflate the implementation percentage. Approximately75% implemented, NOT_READY.

## Runnable restricted deployment package — 19 October

The new explicit process is `node --import tsx server/deployment-entry.ts /absolute/path/config.json`. It accepts only the strict configuration in `deployment/config.example.json`; the example's invalid peer-pin placeholder deliberately prevents accidental startup. No secret values are read from environment fallbacks. Authentication secret, database URL and TLS material come from bounded files; credentials/errors are not printed. Database URLs cannot carry query options that override reviewed TLS policy. Remote databases require an explicit CA with certificate verification; only loopback permits no database TLS. The configuration directory must be private to the operator, readable by container UID1000, mounted read-only, and never committed with real values.

Email mode is **disabled only**: the injected sender always fails and the existing delivery boundary returns503. No code is delivered or falsely acknowledged. `email: enabled`, extra configuration fields, missing/short secrets, invalid TLS/assets and unavailable/unprepared database fail startup. No inference/search credentials, billing activation or migration capability is added. Existing enrolled accounts may be usable with valid credentials; this is not an invitation to use live account data. Only disposable synthetic databases have been used.

Reproduce from the repository with Docker running and the existing synthetic Caddy/TLS fixture prerequisites:

```powershell
docker build --target deployment-candidate -t privateai-deployment-candidate:local .
npm run test:ingress -- --package
```

The dedicated Docker target uses the lockfile and pinned Node base digest `a5f4366e834695d5f363b920c104953a535d3a9864d1bdf74566a0ebe01daee5`. It runs as node/UID1000, with explicit entrypoint and default `/run/privateai/config.json`. Default Docker build still selects the unchanged older restricted runtime; select the candidate target explicitly. Candidate currently retains build tooling/development packages and is not a minimized public-release image. Base pinning requires deliberate security updates; it does not guarantee byte-identical attestations or continued absence of vulnerabilities.

Tested image config ID: `sha256:921a7de37ad6426520007ad3d2b4d6e780af48289483466fcfc35534e9cad6f3`; image manifest `sha256:0975cfbf01e5fd5da6e3d76ab0f51b0783f00681435495087b2e270072b426e7`. The runner mounts tests/fixtures only, not application server/shared/dist code, and uses the image's real entrypoint as a child process. Its ephemeral PostgreSQL namespace has no outbound network or published ports. Final single sequential integration scenario passes missing-secret, invalid-email-mode, connection-refused database, absent-schema/no-auto-migration, admitted startup/static account page, refused email, database lock failure/readiness recovery, SIGTERM shutdown/closed port and SIGINT after process restart. Logs exclude the synthetic secret/email/database-password canaries. This tests process lifecycle inside a container; not Docker orchestration restart, crash recovery after host loss, real email, public TLS or hosted recovery. No failed assertions in this batch.

`deployment/compose.yaml` provides an **inactive app-only** container configuration: require explicit verified image ID/digest and configuration-directory variables; read-only filesystem, dropped capabilities, no-new-privileges, bounded tmpfs/memory/PIDs,20s stop grace, loopback-only port8443, no automatic restart and no retained Docker logs. It has no database/gateway provisioning. Compose syntax was validated with `config --quiet`; **compose up was not run**. Gateway/client-certificate access is mandatory even on loopback. Network egress/firewall/CA custody and external monitoring must be reviewed before any hosted use. Logging disabled here is not an operations-monitoring solution.

### Exact next steps before any hosting change

1. Engineering: complete gateway/database network package, least-privilege database role and migration procedure, secret/certificate ownership/rotation, full container stop/restart and resource-limit tests. Choose reviewed email adapter; leave disabled until credentials, disclosure and interoperability are approved. Add an explicit preflight for the chosen host rather than assuming Compose establishes a trustworthy network.
2. Engineering: rehearse off-host encrypted database restore, quarantine/release, rollback/schema compatibility, independent failure/backup/certificate alerts and realistic load. Measure recovery objectives; do not claim them from the lock-recovery scenario above.
3. Owner review: final host/region/price, database and backup custody, monitoring/email provider and associated retention. Owner performs provisioning/settings/DNS only after this review. No purchase, transfer or settings change requested yet.
4. Engineering then owner: run bounded synthetic hosted acceptance; provide exact DNS/public TLS and Google/Apple callbacks from the approved origin. No existing-account migration before separate reviewed rollout. Provider privacy/opaque monetary limits, safety/quality/human/device acceptance and commercial policy remain independent gates; no real private data or public launch until those pass.

Older unmounted-runtime notes below are historical: the explicit restricted process now exists; normal email and hosted activation still do not.

## Runtime implementation update — 19 October

`prepareProductionRuntime` in `server/production-runtime.ts` now prepares the candidate with a mandatory authenticated gateway, actual HTTPS listener and browser assets. Caller supplies an absolute built-assets directory, TLS server key/leaf and client CA, approved gateway pins, database, authentication secret and reviewed code sender. TLS/key/asset validation precedes admission; `listen(port, host)` waits for read-only schema/recovery readiness and defaults to loopback. `stop(deadlineMs)` drains once; caller owns pool closure and process signals. No environment loader or implicit credential selection. Port0 is supported for ephemeral local verification.

The existing `npm run test:ingress -- --browser` harness exercises this shared runtime:12tests pass, including actual listener restarts across session/vault recovery and startup/shutdown failures. Tests still use only disposable certificates, synthetic accounts and a no-network test sender. This replaces test-only TLS/static wiring, not the live Docker command. The assessment below remains applicable: a reviewed real sender/configuration/entrypoint and hosted operating evidence are required before migration. No new public or private-data access is enabled.

## Production hosting decision — 19 October 2026, proposed / not activated

**Recommendation:** retain the existing restricted Render service while completing a portable, direct-public Caddy → authenticated mTLS Node → PostgreSQL deployment package. Rehearse that package locally first. A German VM is a credible staging destination, not an approved purchase or a demonstrated production capacity choice. Do not weaken account transport checks simply to fit the current host. This gateway protects account transport; it does not resolve browser-to-enclave verification or provider retention.

| Path | Reuse and advantage | Missing evidence / operating burden | Decision |
| --- | --- | --- | --- |
| Existing Render web service | Existing service; managed public TLS | Standard service terminates TLS then forwards HTTP. Current candidate requires actual TLS and authenticated gateway identity. Need a precise, reviewed edge/client-address contract and a separately tested adapter; ordinary forwarded headers are insufficient. | Keep current restricted deployment; no candidate cutover yet. |
| Direct Caddy on German VM | Matches the real proxy/browser proof; explicit peer identity; portable containers | We own OS patching, firewall, capacity, public certificates, internal CA, database recovery, secret custody and independent outage alerts. Single VM is one failure domain. | Preferred architecture to finish and rehearse; host purchase pending complete package and owner review. |

Render documents its TLS-to-HTTP forwarding in [web services](https://render.com/docs/web-services). This is a compatibility/evidence gap with our candidate, not a claim that managed hosting is inherently unsafe. Caddy documents [automatic certificate issuance and renewal](https://caddyserver.com/docs/automatic-https); those facilities require working domain routing and protected persistent certificate storage and do not automate our internal peer-pin policy.

**Cost evidence, checked 19 October:** Hetzner lists CX33 at €8.49/month excluding VAT/IPv4 for Germany/Finland in its [current price adjustment](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/). [Primary IPv4](https://docs.hetzner.com/cloud/servers/primary-ips/overview/) is €0.50/month excluding VAT. Compute plus IPv4 is therefore €8.99 net, approximately €10.70 at 19% VAT. Optional VM backups add 20% of server price: approximately €12.72 including those two items and 19% VAT. These are component estimates, NOT a total operating quote; checkout, region availability and applicable tax must be verified before approval. The [cost-optimized catalog](https://www.hetzner.com/cloud/cost-optimized/) targets low/medium CPU test workloads and warns of limited availability. Do not substitute another tier or region without review.

Off-host application-aware encrypted backups, monitoring, email, inference, traffic overages and operator work are additional. VM snapshots are not evidence of recoverable PostgreSQL transactions or independently held recovery keys. Hetzner's [billing FAQ](https://docs.hetzner.com/cloud/billing/faq/) confirms backup pricing, charges for stopped-but-existing servers and that usage alerts are not spending caps. No Hetzner spending is authorized by the separate $5 Tinfoil development authorization.

### Ordered implementation and evidence before a hosting purchase

1. **Real runtime composition:** `createProductionConsumerCandidate` is tested but unmounted. `Dockerfile` still starts `server/index.ts`, the older restricted runtime. Add a separate explicit candidate entrypoint/image with validated configuration, read-only startup checks, graceful drain and no automatic migration. Missing sender/secrets/peer trust must fail closed. Do not reuse synthetic email sinks as real delivery or inject inference credentials through this work.
2. **Reproducible host package:** lock reviewed image digests; restrict Node/PostgreSQL to the internal network; expose only the gateway's public listeners and an owner-controlled administration path. No public database or metrics endpoint. Verify restart, stream cancellation, rate-limit identity, resource exhaustion and secret exclusion through the same built app. The current network-disabled fixtures prove a narrower scope.
3. **Two distinct certificate lifecycles:** public ACME certificate storage survives gateway replacement; test issuance/renewal failure with a staging CA before real issuance. Internal CA keys stay outside the app; issue short-lived gateway leaves, validate expiration, overlap two pins, drain old instances, remove the old pin and prove rejection. Monitor expiry independently. Public ACME renewal does not rotate internal pins or qualify enclave freshness.
4. **Application-aware recovery:** choose off-host encrypted backup destination and separately held recovery key with owner approval before any sensitive transfer. Reuse the existing PostgreSQL restore/quarantine tooling; restore onto an isolated replacement host, verify schema/roles/account and usage state, measure actual recovery time/data loss, and keep delivery/inference disabled until explicit release. Existing inactive retention policy remains inactive. A VM disk copy is not this drill.
5. **Independent operations:** external HTTPS/readiness and missing-probe detection must work when the VM is dead; host checks cover disk, database, public/internal certificate expiry and backup freshness. Export only reviewed aggregate counters, never URLs/query strings, prompts, tokens or raw errors. Specify recipient, retention and alert tests before activation; current process-local snapshot alone cannot provide these guarantees.
6. **Reviewed rollout:** owner receives final host/region/all-in estimate, exact DNS and callback values, data custody and operations commitments. Owner provisions/changes settings. Validate synthetic hosted account/recovery workflows first. Keep provider/private-data/public gates closed. Preserve old deployment and application image for rollback; schema compatibility must be checked before an app rollback, and a destructive database restore is a separate recovery decision. DNS reversal alone does not undo writes or invalidate sessions.

**Current go/no-go:** GO for local package engineering; NO-GO for migration, public/private-data opening or a claim of hosted recovery. No infrastructure, DNS, email, account, retention or spending setting changed in this assessment. Next engineering batch is the explicit inactive runtime/package, not more standalone ingress assertions. The owner need not choose or buy a host before that work is concrete.

## Browser-through-proxy rehearsal — 19 October 2026

Build the browser-only test image from the account image described below, then run:

```powershell
docker build -f tests/fixtures/ingress-browser.Dockerfile -t privateai-ingress-browser-test:local .
npm run build
npm run test:ingress -- --browser
```

The Dockerfile installs Chromium using the lockfile's Playwright1.63.0 tooling, only inside a local test image. The runner still uses an isolated network namespace, unprivileged/read-only application container, bounded tmpfs and no host-published ports. It mounts the current `dist` read-only so browser tests exercise current built assets. Chromium's resolver maps app.cometrow.com to the local Caddy listener; only the ephemeral server certificate SPKI is trusted. No global `ignoreHTTPSErrors`, OS trust installation or production certificate claim. Real app requests reach Caddy→mTLS→Node→disposable PostgreSQL.

7/7 integration cases pass, including the combined built-browser email/passkey/document/vault/restart/account-return/sign-out/outage journey. No automatic retry after drain; email input is preserved and explicit retry succeeds after reconstruction. Synthetic document/draft/passphrase canaries are absent from observed request bodies and captured Caddy logs. This does not audit browser internals/all production logs. Virtual passkey, local email sink and no real Google/Apple interaction remain limitations. Production certificate renewal, network/custody/logging/hosted recovery/load and actual-phone evidence remain open. The new Help UI initially exposed an ambiguous label; explicit IDs fixed it and final expanded proxy/browser runs pass.

## Authenticated account composition — 19 October 2026

The proxy alternative is now wired **only into the inactive production candidate**, via explicit `ingress.peerCertificateSha256`. The server entrypoint/live Render service is unchanged. It authenticates every route before admission and uses the verified address for account rate limiting. Direct TLS remains the default. Health checks in this mode must traverse the authenticated gateway; no unauthenticated readiness exception was added.

Reproduce locally after preparing the pinned Caddy binary described below:

```powershell
docker build --target build --tag privateai-account-ingress-test:local .
npm run test:ingress -- --workspace
npm run test:ingress
```

The workspace runner requires cached `postgres:17-bookworm` and the separate build image with current locked dependencies. It starts a uniquely labelled PostgreSQL container with network=none, no published ports and a256MiB ephemeral data tmpfs. The unprivileged/read-only application test container shares only that isolated network namespace, allowing loopback PostgreSQL/Caddy/Node with no outbound network. Source/test mounts are read-only; certificate keys are synthetic and disposable. Both containers are removed by exact generated names after label verification. Existing databases are not used by this runner. Docker must be available; image building downloads locked packages with TLS verification enabled. Test image/binary are development artifacts only.

Observed6/6API/transport tests: built account HTML; email verification/sign-in via a no-network `.test` sink; Secure/HttpOnly cookies; spoofed edge fields overwritten; distinct approved peer address used in rate-limit keys; unapproved direct peers denied on static/health/API routes; durable session after composition reconstruction; workspace status and blocked inference; cross-site sign-out denied; synthetic stream delivery/cancellation; quarantine/readiness/drain. Additional16original ingress and21deployment/direct-TLS/account/browser regressions pass. No provider calls, real email, DNS/hosting change or account migration.

The stream endpoint exists only in the test file and has no model/authentication acceptance claim. Proxy-backed browser interaction, real social/passkey flows, public certificate lifecycle, hosted database/backup recovery, content-free production observability and load are still open. Logging is discarded in the fixture; absence of canaries from these captured logs does not qualify other logging systems. No production host/region/cost has been selected or authorized.

Retained failures: original test image lacked Better Auth; separate Dockerfile build image fixed that. Initial runner referenced absent `postgres:17`; corrected to the existing17-bookworm tag. Initial stream probe returned503 because a non-API fixture called the API-context-dependent session control; corrected the test-only probe, not production authorization. Expanded final6/6 and original16/16pass. Earlier standalone-only statements below describe the preceding batch and are superseded for inactive composition only.

## Authenticated proxy alternative — local proof, 19 October 2026

**Decision: continue this fallback locally; do not migrate or activate it yet.** The existing Render account ingress remains unqualified: its documented TLS termination/private-network behavior alone does not establish which peer/header values the application may trust. A supported alternative is a direct-public Caddy gateway with verified mutual TLS to the Node application. Caddy documents client-certificate authentication, upstream CA/server-name verification and explicit header replacement. This avoids trusting a client-supplied forwarding header or a whole private subnet. Sources: [Render transport](https://render.com/docs/web-services), [private ingress](https://render.com/docs/private-network), [Caddy reverse proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy), [Node TLS authorization](https://nodejs.org/docs/latest-v24.x/api/tls.html).

The bounded prototype uses `server/authenticated-ingress.ts`. It requires a TLS socket that Node has authenticated, an explicitly pinned proxy certificate, validity checked on every request, the exact application Host and exactly one valid edge address/protocol field. Equivalent IP representations normalize to one rate-limit identity. Ordinary forwarded/spoofed address headers are removed. The authenticated address lives in a request-scoped WeakMap; a future account adapter must consume that value rather than header input. One/two certificate pins support a reviewed rotation overlap; removing an old pin requires reconstructing the configured boundary and draining old instances. This is **not wired into the production candidate or server entrypoint**. Existing direct-TLS checks, private-data gates and live behavior remain intact.

Trust boundary: browser → public TLS at Caddy → mutually authenticated TLS → Node. Caddy must receive the actual public connection directly; placing a CDN or another proxy in front requires its own reviewed identity contract. Caddy/Node can see account and explicitly approved research traffic. This does not qualify browser-to-enclave inference, retention or monetary metering; the existing protected payload path would still require independent qualification. The gateway key is a powerful credential; production CA custody, leaf issuance/expiry/rotation, private listener isolation and rollback need operational evidence. Do not use the synthetic CA/key files for deployment.

**Observed evidence:** pinned Caddy2.11.7 actually served loopback HTTPS and proxied through verified mTLS in a network-disabled Linux container.16tests pass: valid pinned peer, same-CA wrong peer, no certificate, unverified socket even with matching pin, HTTP rejection, spoofed/duplicate/invalid headers, IPv4/IPv6 normalization, two-pin rotation/retirement, expiry on an existing keepalive connection, and Caddy upstream outage returning502. Synthetic credential canaries were absent from captured Caddy logs on success and outage. The fixture discards runtime/access logs; this is a conservative test policy, **not** a finished production monitoring policy. Add content-free metrics/alerts and prove production error/streaming logs before deployment. Retries remain disabled; the fixture turns off upstream keepalive and external network proxies, and uses short test timeouts rather than release streaming settings.

No actual account sign-in, OAuth/passkey/email journey, inference streaming, public certificate renewal, provider-private network, hosted recovery or load test went through this prototype. Next implement/test that complete inactive composition before presenting a hosting choice. A Render support answer establishing an enforceable edge peer/header contract could still avoid a move. Keep that question in the existing evidence queue; no new email or dashboard change is needed for this proof. No hosting price/region/provider is selected and no paid hosting is provisioned. Caddy's software is an evaluated gateway option, not a substitute for a managed operations owner.

### Reproduce the isolated test

`npm run test:ingress` creates disposable certificates with local OpenSSL, runs the existing local evaluation image with network disabled/read-only filesystem, then removes only its uniquely named/labelled container and its own certificate files. No OS trust store is modified. The regular suite marks these dedicated TLS tests skipped unless explicitly enabled; that skip is not a pass. The dedicated command ran all16, including real Caddy. Recorded runtime: Node24.21.0, Express5.2.1, ipaddr2.5.0, Vitest5.0.3; host build/typecheck used Node24.22.0. Evaluation image ID: `sha256:09ed0c76bf98e78e4a9b7ca618bf8a56354b853882eada2449f81d8941977963`; rebuilds of its mutable local tag must be revalidated.

The ignored Linux AMD64 Caddy fixture at `.local/ingress-caddy/caddy` came from the official image `caddy:2.11.7-alpine`, repository digest `sha256:d8542f48d34a9cf4e4c11a478865229840e87e4c96ea3f439101f31a5d35f75f`. The runner enforces binary SHA256 `678ade3bfc088749c81a681adc603333ee0bb023b6a6cfe3c0f58bef8ff854e9`. To prepare a fresh checkout: pull that exact digest, create a uniquely named stopped container from it, copy only `/usr/bin/caddy` to the ignored fixture path, remove that created container, then verify the hash before running. No machine-wide installation or running gateway is needed. Source release: [Caddy v2.11.7](https://github.com/caddyserver/caddy/releases/tag/v2.11.7). The tests contain the exact validated synthetic configuration, including disabled ACME/admin/config persistence and dedicated CA/server-name checks; it is not a deployment-ready Caddyfile.

**Failures retained:** Windows initially could not verify its local test certificate chain; verification was not disabled and no root was installed. The first container run lacked a writable Vitest token directory; bounded tmpfs/XDG data fixed it. The next run revealed the test HTTP Host had implicitly changed TLS SNI; explicit `localhost` SNI fixed the fixture while preserving HTTPS verification. Expanded outage coverage initially queried the closed backend's listener before addressing Caddy; corrected the helper. Initial TypeScript test typing/name-shadow errors were repaired. Final16/16 and build/typecheck pass; scoped results do not erase these attempts.

## Production domain preparation — 19 October 2026

**Operations preparation (inactive):** `createProductionConsumerCandidate` now returns `ready: Promise<boolean>` plus `operations`. A future reviewed bootstrap must await `ready === true` before advertising traffic; failed startup requires repair and reconstruction. Exact GET `/healthz` is liveness only; `/readyz` checks current database/migration/recovery readiness with bounded read-only inspection and no diagnostic details. Neither qualifies private chat or release. On shutdown, first withdraw readiness/admission with `beginDrain()`, then call `shutdown(server)` within the host's reviewed termination window. Preserve a false `drained` result as interrupted work; settle uncertain operations before ending the owned pool/process. These helpers do not register process signals, perform migrations, change recovery mode or mount a production server. Test results and limitations are in READINESS/ARCHITECTURE.

**Render transport is not yet qualified for production accounts.** Render documents TLS termination followed by HTTP forwarding, and same-workspace private access to the backend port. The production candidate still requires direct TLS. Before a rollout, establish trusted edge peer identity, forwarded-header/client-IP sanitation and private ingress rejection, or review a direct-TLS/authenticated-proxy deployment. Do not weaken the existing boundary using `trust proxy=true` or a header alone. This batch does not change the existing restricted service, health-check configuration, DNS or account settings. [Web-service transport](https://render.com/docs/web-services), [private network](https://render.com/docs/private-network), [IP-rule limitations](https://render.com/docs/inbound-ip-rules).

**Social implementation update:** the inactive production candidate accepts `social.google.{clientId,clientSecret}` and `social.apple.{clientId,teamId,keyId,privateKey}` from a future reviewed server composition. Apple uses the Services ID as clientId and signs five-minute client secrets in memory; do not paste its private key into chat or put it in browser configuration. No environment activation path has been added. Google/Apple sign-in/linking and account→workspace return are locally tested against signed fixtures; real registration, Apple form-post/private relay, email sender, exact Render edge trust, secret rotation and review remain necessary. The owner-entered callback values below remain unchanged. Do not create or activate providers yet merely because the candidate tests pass.

**Billing implementation is still inactive:** localhost rehearsal now has authenticated customer creation, fixed server-side plan selection, hosted Checkout/Portal navigation and durable uncertain-operation protection. All provider transport/pages in tests are synthetic. Do not mount it or set Stripe keys from this note. Before any owner-reviewed sandbox rollout, prepare approved business jurisdiction/currency/prices/tax/refund/cancellation terms, explicit portal configuration, separate runtime/receipt/reconciliation roles, webhook/signature endpoint, uncertainty recovery and enforceable entitlement/metering. Owner controls all dashboard changes. Intended eventual return URLs are `https://app.cometrow.com/?billing=return` and `https://app.cometrow.com/?billing=cancel`; these are preparation only, not activated endpoints or payment proof. The current production candidate rejects billing injection. No additional manual setup is needed for independent coding now.

**Account implementation update:** the unmounted Google/Apple/email/passkey production-origin candidate composes account controls with the workspace and prepared `/account` screen. It requires direct TLS and an explicitly supplied sender; no environment flag activates it. It is not ready to mount behind Render's TLS-terminating proxy. Reviewed edge trust/client-address policy, real social/sender setup, hosted verification and rollout review remain prerequisites. The existing production entrypoint is unchanged. See ARCHITECTURE for delivery semantics and local test limitations.

**PREPARED / NOT APPLIED.** Founder confirms purchase of `cometrow.com` and approves `https://app.cometrow.com` for PrivateAI's app and sign-in. No DNS, hosting, OAuth, email, billing or account-migration change is authorized by this preparation. The historical deployment instructions below are not a current production rollout command.

### Exact owner-entered settings after rollout review

The existing recorded service hostname is `private-ai-deployment.onrender.com`. Reconfirm that hostname and the selected service in Render immediately before rollout; a different production service needs its own Render target. The CNAME below is exact **if that existing service is retained**, not evidence that its production deployment is ready.

| Console / field | Prepared value |
| --- | --- |
| Render → selected service → Settings → Custom Domains | `app.cometrow.com` |
| DNS zone | `cometrow.com` |
| DNS type | `CNAME` |
| DNS name / host | `app` (full name `app.cometrow.com`) |
| DNS target / value | `private-ai-deployment.onrender.com` — hostname only, no `https://` or path |
| Suggested DNS TTL | `300` seconds, or provider default if unavailable |
| Google OAuth client type | Web application |
| Google authorized redirect URI | `https://app.cometrow.com/api/auth/callback/google` |
| Google authorized JavaScript origin, if needed | `https://app.cometrow.com` |
| Google consent/branding authorized domain | `cometrow.com` — ownership verification and final privacy/support links still required |
| Apple Services ID → Sign in with Apple → Website domain | `app.cometrow.com` |
| Apple return URL | `https://app.cometrow.com/api/auth/callback/apple` |
| Application origin / auth base URL | `https://app.cometrow.com` |
| WebAuthn RP ID | `app.cometrow.com` |
| Allowed WebAuthn origin | Exactly `https://app.cometrow.com` |

Render documents a CNAME to the service hostname for subdomains, followed by domain verification/TLS issuance. Before the owner applies it, inspect existing records **at `app`** for conflicts, and any applicable CAA restrictions; preserve unrelated apex, mail and other subdomain records. Do not add wildcard/apex records for this app. Any provider-specific verification token must come from the actual console, never an invented value. [Render subdomain DNS](https://render.com/docs/configure-other-dns), [domain/TLS setup](https://render.com/docs/custom-domains).

Google callback spelling, scheme and path must match registration exactly; do not register localhost or the temporary Render hostname as production callbacks. Use identity-only permissions and a reviewed production credential adapter, not the fixture's dummy credentials. Google client ID/secret are console-generated, with the secret stored only in deployment secret storage. [Google web-server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server).

Apple web setup additionally needs a Services ID associated with a primary App ID enabled for Sign in with Apple. Membership/App ID availability is not established. Client ID is the actual Services ID, not automatically the domain. Team ID, Key ID and signing private key/client-secret rotation require reviewed secure configuration; do not paste secrets into chat. Apple's form-post return, browser cookie behavior and private email relay need real interoperability tests before activation. [Apple web configuration](https://developer.apple.com/help/account/capabilities/configure-sign-in-with-apple-for-the-web/).

Email sender/service is not selected or activated. SPF/DKIM/return-path values must come from that chosen supplier; no MX or email DNS change is prepared yet. Root-domain marketing, support/privacy pages and their hosting are separate work; the app CNAME does not publish them.

### Reviewed rollout sequence and rollback boundary

1. Finish/review the production account adapter, database/secret/role configuration, sender, retention policy and migration/recovery plan. The current `createSyntheticAccountAuth` refuses production origins and has dummy social fixtures only. Do not remove that protection or set unrelated Better Auth environment variables as a shortcut.
2. Select an exact deployable commit and hosting target; verify backup/recovery evidence. Prepare an access-restricted rollout with private inference still gated. Review the changes with the owner before any console action.
3. Owner adds the approved custom domain and DNS record. Check authoritative DNS, TLS certificate/SAN and HTTPS redirect read-only. A valid CNAME does not establish account or chat readiness.
4. Coordinate the reviewed host-origin switch. Existing `PRIVATEAI_ORIGIN` is an exact-host development access boundary: changing it can reject the old Render hostname, while adding DNS alone can leave the new host rejected. Do not loosen this to wildcard origins or remove access controls. Healthz alone does not verify the authenticated app. Production consumer auth is not enabled by that variable.
5. Owner registers/configures the reviewed Google/Apple clients and sender; separately review activation. Validate callback rejection, state/nonce/signature, same-email non-merging, passkey origin/UV, email recovery, revocation and phone behavior using an approved test account. No old-account migration or public opening is included.
6. On failure, keep the new account path disabled, stop new enrollment and have the owner restore the reviewed previous release/origin/DNS settings as applicable. Database rollback must preserve post-snapshot revocations/closures/usage and stay quarantined until reconciled; never restore blindly.

**Origin-change data limitation:** browser vault storage and cookies are origin-scoped. A new domain does not transfer saved encrypted conversations from the Render origin or recover vault keys. Do not redirect/retire the old origin until its access/history transition is explicitly resolved. Passkeys enrolled under another RP ID likewise do not silently migrate. No production user enrollment is approved yet.

## Historical restricted-deployment record

Status, 7 October 2026: the founder-approved individual-access release is deployed
at https://private-ai-deployment.onrender.com on the existing upgraded Render
service. Application commit `b7e5ea7` passed CI and actual hosted access, isolation,
restart persistence and paused recovery staging; see [exact evidence and limits](trial-hosting-decision.md).
The registry is persistent, both synthetic accounts are revoked, and trial access
is paused. Inference remains disabled. This is not public launch readiness.

## Hosting decision

**Current individual-access decision:** one 0.5 CPU / 512 MB Docker instance and
one 1 GB disk at `/var/data`, purchased by the founder. Registry path:
`/var/data/privateai/invites.sqlite`. The USD 7 displayed compute price excludes
separate disk billing. No additional capacity is approved. Do not move this
registry onto ephemeral storage.

Use one persistent Node 24 service with the existing app and gateway on the same
HTTPS origin. Docker packaging is included. Sessions, instance-wide counters and
one-use research approvals are intentionally in-memory; individual account state
and per-account counters now use SQLite. Deploy exactly one process and
one instance. Restart invalidates sessions and approvals; reload to continue.
Do not use horizontal scaling, Node cluster or serverless functions with this
state design. Future scaling requires an atomic shared session/approval store.

Vercel functions would require that state redesign before moving the current
gateway. GitHub Pages cannot run it. A container web-service host such as Render
is the selected arrangement. Actual hosted access checks cover the current HTTPS
edge; long-running streaming, capacity, metadata-log retention and disaster
recovery still require their own evidence.

## Concrete host setup

Connect `gyaneshsahu/Private_AI`, branch `codex/provider-qualification`, as a
single Docker web service using the root Dockerfile. Select a plan only after its
price and constraints are reviewed; the USD 2 cumulative inference cap does not cover
hosting. Use the host's HTTPS domain, no custom domain required. The edge must
preserve Host, overwrite X-Forwarded-Proto with `https`, redirect public HTTP to
HTTPS, support streaming for at least 90 seconds and prevent direct public access
to the unencrypted backend port. Health check: `GET /healthz` (liveness only).

Set server environment/secrets:

- `PRIVATEAI_ORIGIN`: exact HTTPS origin, no trailing slash.
- `PRIVATEAI_INVITES_FILE`: `/var/data/privateai/invites.sqlite`. Initialize an
  empty registry explicitly with the invitation CLI before setting this variable;
  hosted startup rejects missing/invalid registries. Keep directory owner-only
  and database mode 600. Existing individual access supersedes shared Basic access.
- Historical shared-access mode only, `PRIVATEAI_ACCESS_KEY`: random base64url secret, 32–128 characters. Generate with
  a password manager or `node -e 'console.log(require("node:crypto").randomBytes(32).toString("base64url"))'`
  locally and enter in host secrets, never chat or Git. Browser login username:
  `evaluator`, password: this development access key, NOT the Tinfoil API key.
- `PORT`: host-assigned integer port, default 4173.
- Leave provider/search keys and qualification evidence unset for this first
  deployment. Merely adding a Tinfoil key cannot enable inference.

This shared access secret is for the small controlled evaluation only. It is not
customer accounts, individual revocation, billing identity, or protection from
an authorized malicious tester. Close the browser session to clear cached Basic
credentials; rotate the server secret and redeploy to revoke access. Never put
secrets into VITE-prefixed variables or frontend build settings.

## Deployment and tests

`Validate` runs type checking, 163 tests, build, 16 browser workflows, fixture
integrity and clean-export Docker build/smoke/persistence/access checks with no
provider secrets. Configure the selected
host's Git integration to deploy only after checks pass. If the host cannot gate
on CI, keep automatic deployment disabled until a gated mechanism is installed.
CI execution on GitHub is confirmed successful at `b7e5ea7`. Workflow-dispatch UI
may require the workflow to exist on the repository's default branch; do not
merge or reset branches simply to hide that setup requirement.

The container smoke runs as a non-root user with a read-only filesystem and
checks protected app/assets/API, secure session cookies and disabled inference.
No private source files or `.local` evidence are copied into the runtime image.
Build uses lockfile dependencies. The Node image tag must receive security updates;
record the resolved image digest for every deployment. No private data mounts.

After hosting, configure repository variable `PRIVATEAI_DEV_ORIGIN` and secret
`PRIVATEAI_DEV_ACCESS_KEY` for `Hosted foundation smoke (no inference)`. The same
script can run in a suitable trusted environment with these variables. It checks
real TLS and anonymous denial. In legacy shared-access mode it also checks
authenticated browser rendering and secure cookies;
it blocks browser POSTs and external requests and requires inference disabled.
The hosted check passed at `4476f6e` and `46a03e2`. Cloud Chromium proxy trust remains a
separate constraint; do not import a persistent proxy certificate to force it.

On individual-access deployments, the smoke reports `HOSTED_ACCESS_BOUNDARY_SMOKE`
and explicitly records `authenticatedChecks: NOT_RUN`: it checks the sign-in page
and denied anonymous API/private paths without storing individual credentials in
CI. The packaged `trial:access`/`trial:isolation` checks and lifecycle rehearsal
provide the separate authenticated evidence. On Windows, this batch used the
existing system CA store (`NODE_OPTIONS=--use-system-ca`) after Node's bundled CA
store rejected the certificate chain; certificate verification was never disabled.

## Privacy and observable failures

Browser → hosting edge → Node gateway → Tinfoil router → worker/GPU.
Documents and plaintext conversation stay in the browser until a verified,
explicitly authorized encrypted inference request. Browser verification and EHBP
are unchanged. The hosting provider sees IP addresses, access credentials, timing,
routes and encrypted inference bytes. It also serves the JavaScript, so compromise
of hosting/deployment can replace browser code and expose future input. TLS and
remote attestation do not eliminate that supply-chain trust assumption.

Approved external research queries/URLs are plaintext to the gateway and target;
this first hosted smoke sends none. Tinfoil's full worker chain, retention and
release policy remain NOT_PASSED. Do not populate a fake qualification report to
make hosted chat work. A separately bounded synthetic test harness must be adapted
and reviewed for hosted execution before live model tests there.

Application request/body logging remains off. Do not enable session replay, request
body capture, full headers or console transcript capture. Host access-log retention,
redaction of Authorization/Cookie and infrastructure metadata need checking before
private data. Health probes expose only `ok`; startup messages contain mode and
port. Review CI fixed-result summaries and HTTP statuses; provider dashboard is the
source for actual charges, client token estimates are not invoices. Never upload
`.local` transcripts, permits or provider keys as CI artifacts.

## Budget and next live batch

Current authorization is **USD 2 cumulative inference spending**, including prior
usage, with auto-recharge disabled. This supersedes the older USD 10 text in this
historical deployment plan. The existing service/disk purchase and synthetic
deployment are approved; additional recurring hosting capacity is not.
Current quality work follows the [bounded Gemma plan](gemma-release-evaluation-plan.md);
the compatibility sequence below is historical and is not a reusable permit.
Existing consumed WSL and Windows claims remain untouched.

After hosted foundation smoke and provider-path preparation: first one short
synthetic compatibility request, then at most one two-turn synthetic invoice
workflow if compatibility succeeds (three requests maximum for that batch).
No automatic retries, search, document-upload service, real personal data or
held-out quality claims. Keep per-request input/output and time bounds; encryption
means the gateway cannot independently inspect/enforce plaintext token settings.
Inspect evidence and reconcile dashboard totals before any further batch. This
plan does not fabricate a new runnable permit or override consumed request IDs.

## Reuse and remaining gates

Reusable: application, local extraction/OCR, encrypted vault, verification and
stream parsing, gateway, Docker build and tests. Access control will be replaced
with real accounts later; state storage grows only when multi-instance operation
is needed. Public hosting, real encrypted streaming, provider privacy qualification,
answer-quality competitiveness and customer demand are separate evidence gates.

Local image build evidence: Node 24 base resolved to
`sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6`;
application image `sha256:f3bc6c77078c05d12c4466dfdbcdba53dcc8806a0864b58ef7ff4a1fd6539aea`.
These identify this local build only, not a future host deployment.

## Render build correction — 2026-10-05

The first Render build failed because Docker copied `public`, a directory with
only generated/ignored OCR assets that does not exist in a fresh Git checkout.
Remove that COPY: `npm run build` already generates the directory and its assets.
A clean Git export plus the corrected Dockerfile builds successfully. CI now
builds from `git archive HEAD`, so preceding local asset generation cannot conceal
missing tracked build inputs. Runtime container smoke is rerun against that image.

Reported host: `https://private-ai-deployment.onrender.com`, Free service, no
Tinfoil key. At that earlier build stage, live health was NOT VERIFIED: Cloud proxy rejected the hostname before
TLS/HTTP reached Render. A saved domain allowlist draft requires environment
review/save/publish; saving it alone does not grant current access.

For no-inference browser testing through GitHub (avoiding Cloud browser CA changes),
set Actions variable `PRIVATEAI_DEV_ORIGIN` to the exact host origin and Actions
secret `PRIVATEAI_DEV_ACCESS_KEY` to the same development access key set in Render.
The hosted smoke workflow now also triggers on pushes to the development branch
when that origin variable is configured. It does not need a Tinfoil key. Actual
GitHub workflow execution was subsequently confirmed; see the current status above.

### Public endpoint check after Render recovery — 2026-10-05

Cloud HTTPS checks now reach the host: `/healthz` returns HTTP 200 and `ok`;
unauthenticated `/` and `/api/status` both return HTTP 401. This establishes
service liveness and anonymous denial, not authenticated browser or inference
readiness. The user reports configuring the GitHub Actions origin variable and
access secret. This commit triggers the no-inference hosted workflow on the
development branch. GitHub Actions API inspection from Cloud returns `Forbidden`,
so that Cloud check could not establish a passing result. Subsequent Windows
GitHub API inspection confirmed the smoke job passed (current status above).

### SSH-ready container deployment — 2026-10-07

Render reports commit `12bd405` live after GitHub Validate run
[37643770996](https://github.com/gyaneshsahu/Private_AI/actions/runs/37643770996)
passed. The image includes the non-root SSH directory prerequisite. Render accepts
the registered public key, but the local passphrase-protected identity requires
unlocking; no hosted registry transfer has been verified. Local diagnostics added
subsequently are not included in this deployment. Safety, quality, provider privacy
and recovery readiness remain open; deployment is not trial approval.

### Off-host registry recovery — 2026-10-08

Read-only SSH confirms deployed `12bd405a8355cdbe422e066ea7006486d2901f39`,
paused individual access, two accounts and zero unrevoked accounts. Encrypted
registry export to the approved Windows destination and separate paused/revoked
restore passed. The local backup launcher now uses `/app` explicitly because SSH
starts in `/home/node`; no deployment change was needed. Daily scheduled backup
was exercised successfully. See `backup-retention-policy.md` for archive evidence
and operational gaps; the live registry was not replaced or resumed.

### Validated deadline/recovery release — 2026-10-08

`40f2e33b90b40124c74210fd46aae560978bbd12` passed
[Validate 37764214287](https://github.com/gyaneshsahu/Private_AI/actions/runs/37764214287),
including the newly added packaged encrypted service-recovery drill. Render's
CI-gated auto-deploy completed in 1m07s. Post-deploy read-only SSH confirms that
release, paused access, two persisted accounts and zero unrevoked accounts.
HTTPS health returns 200 and anonymous `/api/status` returns 401. The push-triggered
hosted smoke passed but ran before the new deployment; it is not presented as a
complete authenticated regression of this release. Local validation: 172 tests
with real age enabled, 17 production browser workflows, typecheck and build passed.
Private inference remains gated; no hosted registry replacement or resume occurred.
