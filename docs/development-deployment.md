# Restricted development deployment

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
