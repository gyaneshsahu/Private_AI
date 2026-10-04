# Restricted development deployment

Status: portable service built and tested locally; not deployed. No hosting or
provider credentials are present in Codex. Existing application and gateway are
reused. This is a synthetic evaluation foundation, not public launch readiness.

## Hosting decision

Use one persistent Node 24 service with the existing app and gateway on the same
HTTPS origin. Docker packaging is included. Sessions, request counters and one-use
research approvals are intentionally in-memory: deploy exactly one process and
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
price and constraints are reviewed; the USD 10 inference budget does not cover
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
CI is committed; execution on GitHub has not been observed. Workflow-dispatch UI
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
The hosted check is prepared but NOT RUN. Cloud Chromium proxy trust remains a
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

The user's latest approval raises the total inference ceiling to USD 10, including
prior usage, not USD 10 per run. Auto-recharge remains off. Provider limit behavior
and key/account scope need confirmation at setup. No live or paid inference ran
in this deployment batch. Existing consumed WSL claims remain untouched.

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
