# PrivateAI — Claude Handoff

Updated: 21 October 2026  
Repository: `gyaneshsahu/Private_AI`  
Branch: `codex/development-handoff`

## Recent work

- `4eb86b1` — restricted Render deployment package and guarded PostgreSQL initialization. Deployed successfully; 12 migrations applied to the new `privateai_accounts` database. Runtime starts with email and inference disabled.
- `1511f1d` — recorded hosted deployment evidence and post-deploy status.
- `8926f86` — recorded owner Google sign-in/workspace journey; corrected inaccurate email-recovery wording locally.
- `9c9be8e` — added explicit `emailEnabled=false` capability for restricted runtime and disabled email-dependent sign-in, recovery, credential removal, and account closure controls when email delivery is unavailable.
- `82115ff` — recorded exact-commit CI evidence and manual deployment instructions.

CI for `9c9be8e12440367bc3755385f4190626e5d921b4` passed: [run 39473918073](https://github.com/gyaneshsahu/Private_AI/actions/runs/39473918073). Offline stage: 499 passed / 148 skipped; browser: 53 passed; durable database: 122 passed, zero skipped across 16 files. Container smoke and packaged encrypted recovery passed. **36 infrastructure checks were not executed in that CI run** (authenticated ingress 16, ingress workspace 12, Render bridge 5, account restore 2, deployment package 1). Do not count these as passes.

## Current status and next steps

- Live Render service: `private-ai-deployment`, Frankfurt; restricted owner-only Google milestone. Custom domain `https://app.cometrow.com` resolves and its TLS certificate was issued. Owner Google sign-in, workspace entry, sign-out and sign-out persistence after reload were observed. Email delivery and inference remain disabled; private chat stays gated.
- **Manual action next:** deploy the exact full SHA `9c9be8e12440367bc3755385f4190626e5d921b4` in Render using Manual Deploy → Deploy a specific commit. Keep Auto-Deploy off and Pre-Deploy Command empty. No secrets or migrations need changing. After deployment, verify Google sign-in, cancellation, logout and the email-disabled interface.
- Hosted second-user denial/isolation, hosted vault save/reopen, Google cancellation, device-level accessibility, and usage display are not yet verified. The account page currently reports usage unavailable/no active plan; no subscription is configured.
- Private-data access and public launch remain blocked pending Tinfoil privacy/retention/usage qualification, answer-quality and safety acceptance, remaining infrastructure and hosted recovery evidence, and owner launch review. Supplier replies and human assessments belong in the existing evidence files; keep all proposed assessments correctly labelled.
- **Supplier status, 21 October:** Tinfoil email sent, no reply; owner waits until 23 October before choosing a solution. Brave is treated as unresponsive. Four of the five Tinfoil questions are already answered as unavailable by the supplier's public docs; see the 21 October entries in `docs/provider-qualification.md` and `docs/search-provider-comparison.md`.
- Continue product work against `docs/ROADMAP.md`, `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/acceptance.md`, and especially `docs/READINESS.md` (status ledger). `docs/development-deployment.md` has the deployment and rollback procedure.

## Architecture and local setup

- React/Vite client with Express/TypeScript server. Local history uses the encrypted browser vault; signing in is separate from unlocking that vault. There is no claim of indefinite memory or cloud vault sync.
- Hosted candidate is packaged by `Dockerfile.render`, launched through `server/render-entry.ts`, and uses a Render HTTPS edge bridge to loopback mTLS inside the container. The app connects to remote PostgreSQL with explicit CA verification. Startup does not run schema migrations.
- Render Secret Files are mounted under `/etc/secrets/`; the runtime config is `/etc/secrets/render-config.json`. Required filenames are `render-config.json`, `auth-secret`, `database-url`, `database-ca.pem`, `server.key`, `server.pem`, `client-ca.pem`, `bridge.key`, `bridge.pem`, and `google-social.json`. Never put their contents in Git, chat, logs, build args, or this handoff. The offline CA private key is not uploaded. Local protected material is under `.local/private-secrets/` and is Git-ignored.
- The database schema is initialized already. Keep Render Pre-Deploy Command empty; never rerun `initialize-empty` as a routine deploy. To inspect the configuration/operation procedure, see `docs/development-deployment.md`.
- Local `.env.example` documents supported development variables: `PORT`, `PRIVATEAI_PUBLIC_FETCH_HOSTS`, `PRIVATEAI_QUALIFICATION_FILE`, `PRIVATEAI_ORIGIN`, `PRIVATEAI_ACCESS_KEY`, `PRIVATEAI_INVITES_FILE`, `TINFOIL_API_KEY`, and `BRAVE_SEARCH_API_KEY`. These are names only. Do not enable keys or private inference without the separate provider gate. Additional test/backup variables are documented with their scripts; use synthetic fixtures only.
- Owner identity is allowlisted as `sahugyan176@gmail.com`. OAuth client secrets and database credentials remain in protected secret storage; never copy them into the handoff.

## Git handoff

At handoff creation, `codex/development-handoff` was at `82115ff` and matched `origin/codex/development-handoff`. The only pre-existing working-tree edit was `docs/provider-outreach-20261020.md`; it contains supplier draft/reply notes and was intentionally preserved, not included in this handoff commit. Check `git status` before further staging. `codex/provider-qualification` is a separate older branch and is not the active deployment branch.
