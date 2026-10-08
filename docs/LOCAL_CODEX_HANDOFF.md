# PrivateAI — local Codex handoff (2026-10-05)

## Working location and instructions

Continue in `C:\Gyanesh\Startups\Private_AI`. The user reports local Codex
verified this checkout is clean, on `codex/provider-qualification`, and matches
GitHub at `4476f6e` before this handoff. Origin:
`https://github.com/gyaneshsahu/Private_AI.git`. Pull this handoff with
`git pull --ff-only`; preserve any subsequent local changes. Do not reset or
switch to main (main holds an older baseline). Leave the separate Ubuntu-24.04
WSL checkout `/home/dressfit/projects/Private_AI-git` untouched.

The user authorizes ongoing implementation, debugging and appropriate tests in
local Codex. Work in coherent batches, make routine reversible decisions, and
report concise outcomes. Involve the user only for necessary access, spending
beyond approval, material product/privacy decisions or unresolved blockers.
Do not turn the user into a command-copying bridge. No further Cloud development
or paid tests are requested. This handoff itself changes documentation only.

## Product and current implementation

General personal assistance with strong everyday answers, real follow-up chat,
local bounded text/PDF/screenshot extraction, citations, a calculator, explicit
approval of public research queries/URLs, temporary sessions and optional encrypted
local history. Anonymous access is deferred. Reuse the existing React app,
Express gateway and state; do not rebuild, substitute canned answers or introduce
subscriptions/large databases before evaluation evidence warrants them.

Browser verification and EHBP encryption are implemented in `src/verified-chat.ts`.
The revised bounded SSE parser replaces the OpenAI runtime parser to avoid raw
error-content logging. Timeouts, cancellation and fail-closed handling are tested.
The production app deliberately leaves inference disabled without valid provider
qualification and service access. Do not invent a qualification report or weaken
this gate to enable a demo. Synthetic fixtures/mocked peers are labelled tests,
not live capability evidence.

Read [PRD](PRD.md), [architecture](ARCHITECTURE.md),
[acceptance](acceptance.md), [provider qualification](provider-qualification.md),
[provider chain review](provider-chain-review.md) and
[deployment](development-deployment.md) for details. Newer dated evidence in this
handoff supersedes older pending status in those documents where explicitly noted.

## Live evidence and remaining provider/privacy gates

Tinfoil is the first candidate, NOT qualified for private user data.
The original two-turn synthetic invoice test returned correct arithmetic,
follow-up context and citations: 95/19/114 EUR, then 90/18/108 EUR, reduction 6 EUR.
Reported usage: 846 input + 1,070 output tokens; estimated USD 0.00076890.
Dashboard screenshot corroborated two requests and rounded token totals; actual
charged dollars remain unreconciled. This was an older adapter and one smoke case,
not broad model-quality evidence.

Router verification passed in WSL against `inference.tinfoil.sh`, repository
`tinfoilsh/confidential-model-router`, release digest
`ad95d02b2e27b3c1d5c327f2ee9616634f841e4b2ed5a48f404e4e9f595a4876`.
Do not accept a changed digest automatically. Full router-to-worker/GPU proof,
source/build/release binding, freshness/revocation/rollback policy, retention,
cache/diagnostic/moderation handling, egress and provider billing-limit semantics
remain unresolved. Source review supports delegated worker verification, but does
not independently establish every deployed worker's identity or privacy behavior.
A public worker attestation probe returned HTTP 501; this is unresolved, not proof
of an unprotected worker. Do not repeat unchanged failing probes.

Historical LOCAL ERR_ABORTED events lack enough identity/timing evidence to
establish their cause. Offline replay did not reproduce them. The revised adapter
still needs a successful live compatibility check with normal relay completion.
The one-request WSL run at 2026-10-04 21:55 UTC failed before inference: zero relay
attempts, local module blocked. Fixed in `2b636d7`: Vite dependency cache moved
from blocked `.local` to permitted `node_modules`; regression reproduced the old
failure and passed the fix. Existing consumed permits/run directories must remain
intact. Do not delete/reissue them merely to retry; account for previous attempts
and authorization explicitly when preparing a new bounded run.

## Deployment and testing status

Render Free service: `https://private-ai-deployment.onrender.com`, development
branch `codex/provider-qualification`. User reports NO Tinfoil key there.
Docker clean-checkout bug fixed in `26514fb`: generated `public` must not be copied
from Git; the build creates OCR assets. CI now builds a clean Git archive.

Single persistent instance/process only: sessions, request counts and one-use
research approvals are in memory. Restart invalidates sessions; reload. Scaling
or serverless migration needs atomic shared state first. Hosted access requires
HTTPS origin and a separate strong `PRIVATEAI_ACCESS_KEY` (Basic Auth username
`evaluator`), secure cookies, origin/CSRF checks; `/healthz` reveals liveness only.
Hosting serves browser code and sees metadata/access credentials, so it remains
a trust boundary. No private-data or production-readiness claim is established.

Cloud observed HTTPS `/healthz` = 200/`ok`; anonymous `/` and `/api/status` = 401.
User configured GitHub Actions variable `PRIVATEAI_DEV_ORIGIN` and secret
`PRIVATEAI_DEV_ACCESS_KEY`. User's screenshot shows **Hosted foundation smoke
(no inference), run #2 at commit 4476f6e, SUCCESS**, smoke job executed, total 52s:
https://github.com/gyaneshsahu/Private_AI/actions/runs/37296239780
This is user-supplied successful hosted-test evidence; Cloud could not read the
GitHub Actions API (Forbidden). It supersedes earlier documents saying the hosted
smoke result was pending. The test checks real TLS, anonymous denial, authenticated
browser rendering and secure cookies, requires inference disabled and blocks
browser POSTs/external requests. It does not test live inference.

Latest local Cloud validation: 82 tests across 16 files, typecheck/build, seven
browser workflows, fixture integrity, and non-root/read-only container smoke passed.
Clean-export container build/smoke passed again after the Docker fix. Dataset
integrity is not model evaluation: 24 development + 24 reserved held-out cases,
six task families; held-out model runs remain unrun. Broad expansion requires fresh
coverage (planned >=120 cases), named ChatGPT/Gemini comparisons and actual user
tasks. Grading covers correctness/completeness/context and severity; privacy leaks,
verification bypasses and fabricated critical facts block expansion. Repeating
24 cases does not broaden coverage. Technical readiness, security assurance and
customer demand are separate gates.

Nonblocking screenshot warnings: checkout/setup-node v4 action runtimes use a
deprecated Node runtime; ubuntu-latest is scheduled to migrate. Update/pin those
as routine maintenance with checks, not by changing application Node 24 support.
Cloud proxy/browser trust issues are not product defects. Do not import a
persistent interception certificate or disable TLS verification to pass tests.

## Budget and secrets

User raised the total inference ceiling from USD 2 to **USD 10 cumulative**, not
USD 10 per run and not an approval for hosting/subscriptions. Previous USD 2
approval covered the original two-turn test, followed by one explicitly approved
additional synthetic request. Auto-recharge was disabled and an account cap of
USD 2 was reported; raising the approved budget does NOT prove the dashboard cap
has been changed. Confirm actual remaining usage/cap and key/account scope before
paid execution. Ask before deposits, new paid services or exceeding approval.
No paid inference ran during the deployment batches.

No key is in this repository or handoff. The Tinfoil key was set in the user's WSL
terminal; do not assume the Windows process inherits it. Do not inspect/copy WSL
secret files or ask for keys in chat. Keep provider keys server-side. GitHub has
the development access secret per user report; it is not a provider key. Never
include keys, private transcripts or .local evidence in Git/CI artifacts.

## Next recommended coherent batch

1. Inspect the Windows checkout, instructions, Node 24 and available browser/runtime
   without discarding changes. Pull fast-forward. Use existing setup/tests; adapt
   Windows command syntax where needed (the existing Playwright webServer command
   uses POSIX `PORT=4173 npm start`). Do not manage a second checkout or assume
   Docker is installed. Resolve routine platform issues locally.
2. Read the successful hosted job and CI results with available local GitHub
   authentication; record evidence without exposing secrets. Keep the deployment
   restricted and inference disabled. Correct stale docs and action-runtime
   warnings as part of this batch, with relevant checks.
3. Prepare the smallest genuine live check for the revised adapter using a suitable
   local environment, or carefully adapt the synthetic-only harness to restricted
   hosting. The current production app cannot bypass qualification; the old local
   runner is not automatically a hosted harness. Preserve client verification,
   encryption, exact destination/release checks, one-use accounting and generic
   error logging. Establish the route and bounds before enabling provider access.
4. Once access and actual cap are confirmed, planned next live batch: ONE short
   synthetic compatibility request; only if successful, one two-turn synthetic
   invoice workflow (at most three requests total). Existing authorization covers
   bounded tests within USD 10 cumulative; no automatic retries, private data,
   external research or paid document service. Retain request/token/time limits.
   Gateway cannot inspect encrypted plaintext token settings. Reconcile billing
   and record code identity, attestation, normal stream termination and usage.
5. Continue provider-chain qualification and reusable chat/document improvements
   without pretending unresolved privacy gates passed. Report a single clear batch
   result and any necessary user action. Do not tune on reserved held-out cases.

The hosted foundation now works; avoid spending another batch rebuilding it or
making the user repeat Cloud proxy/ZIP handoffs. Git remains the source of truth.
