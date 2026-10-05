# Restricted development deployment

Status, 5 October 2026: deployed on the reported Render Free service at
https://private-ai-deployment.onrender.com. Authenticated GitHub API inspection
confirmed successful hosted smoke and full validation at `46a03e2`; see
[Windows batch evidence](windows-development-batch.md). Inference remains disabled
and the user reports no provider key on Render. This is a restricted synthetic
evaluation foundation, not public launch readiness.

## Hosting decision

**Current individual-access decision:** the existing Render Free filesystem is
not durable registry storage. See the [paid single-instance/disk proposal and
release checklist](trial-hosting-decision.md). Read-only dashboard inspection on
5 October shows live commit `dbccbe0`, older than the local invitation/password
implementation. Do not deploy that access system onto ephemeral storage.

Use one persistent Node 24 service with the existing app and gateway on the same
HTTPS origin. Docker packaging is included. Sessions, instance-wide counters and
one-use research approvals are intentionally in-memory; individual account state
and per-account counters now use SQLite. Deploy exactly one process and
one instance. Restart invalidates sessions and approvals; reload to continue.
Do not use horizontal scaling, Node cluster or serverless functions with this
state design. Future scaling requires an atomic shared session/approval store.

Vercel functions would require that state redesign before moving the current
gateway. GitHub Pages cannot run it. A container web-service host such as Render
is the candidate for the smallest change. Current hosting prices, terms, idle
sleep, streaming timeouts and proxy behavior remain unverified: Vercel's official
documentation request was rejected by the Cloud network proxy. No claim of a
free, always-on plan is made and no hosting subscription is authorized.

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
- `PRIVATEAI_ACCESS_KEY`: random base64url secret, 32–128 characters. Generate with
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

`Validate` runs type checking, 82 tests, build, seven browser workflows, fixture
integrity and Docker build/smoke with NO provider secrets. Configure the selected
host's Git integration to deploy only after checks pass. If the host cannot gate
on CI, keep automatic deployment disabled until a gated mechanism is installed.
CI execution on GitHub is confirmed successful at `46a03e2`. Workflow-dispatch UI
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
real TLS, anonymous denial, authenticated browser rendering and secure cookies;
it blocks browser POSTs and external requests and requires inference disabled.
The hosted check passed at `4476f6e` and `46a03e2`. Cloud Chromium proxy trust remains a
separate constraint; do not import a persistent proxy certificate to force it.

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
historical deployment plan. Hosting is a separate, unapproved recurring expense.
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
