# Name change: PrivateAI is now CometRow (25 October 2026)

The product was developed as **PrivateAI** until 25 October 2026. On that day the owner renamed it to **CometRow** everywhere people read the name. PrivateAI and CometRow are the same service, the same operator and the same code base. The public domain was already `app.cometrow.com` before the rename.

## What changed

- **The app:** header marks, browser tab title, the "Message CometRow" composer label, reply labels, help and safety dialogs, the support note, the passkey name and the sign-in library's app name, security-notice email subjects, the invite access page, and the assistant's self-name in the system prompt (commit `cd7daa7`).
- **Server and operator text:** startup and failure log lines ("CometRow restricted deployment listening ..."), the development sign-in realm, the research fetcher's user agent (`CometRow-Evaluation/0.1`), and the synthetic account lab labels.
- **Current documents:** README, architecture, PRD, roadmap, acceptance, deployment, runbook, device test plan, service setup, backup policy and the provider comparisons now say CometRow.
- **Imprint names note:** "CometRow is the name of the service. Until 25 October 2026 it was called PrivateAI, and some technical identifiers in the source code still use that name."

## What still says PrivateAI, on purpose

Each of these is stored somewhere outside the code or checked byte for byte; renaming it would break something real.

| Identifier | Where | Why it stays |
|---|---|---|
| `privateai-vault`, `privateai-vault-<id>`, `privateai-v1`, `privateai.appearance` | browser IndexedDB names, vault encryption label, local preference key (`src/vault.ts`, `src/appearance.ts`) | Renaming makes every saved conversation already in a browser unreadable and resets preferences. |
| `privateai_schema_migrations`, `privateai_accounts`, `privateai_app`, `privateai_synthetic`, other `privateai_*` names | PostgreSQL migration table, hosted database and owner role, test database | The live database uses these names; renaming needs a migration and would stop every earlier release (rollback). |
| `X-PrivateAI-*`, `x-privateai-*` | internal HTTP headers between the app, the server and the Render bridge | Never shown to users; renaming needs client, server and bridge changed in one release for no visible gain. |
| `PRIVATEAI_*` | environment variable names in CI, scripts and `.env.example` | Used by CI and the owner's local setup; not user-facing. |
| `C:\PrivateAI-backups`, `PrivateAI/Local/...`, the scheduled task names | Windows backup scripts and credential store on the owner's PC (`scripts/windows-backup*.ps1`, `scripts/WindowsSecrets.psm1`) | Existing backups, tasks and stored credentials are registered under these names. |
| `system: "PrivateAI"` and review titles in `evaluation/` and its results | evaluation records and graders | Graded results match on this label; the files are historical measurements. |
| `Private_AI` (repository), `private-ai-deployment` (Render service), branch and folder names | GitHub, Render, the owner's disk | Renaming changes URLs and settings in the owner's accounts; owner's decision. |
| Dated documents (`*-2026MMDD.md`), `docs/READINESS.md` entries before this date, git history | records | They record what happened under the old name and stay as written. |

## Still for the owner to check

- The Google OAuth consent screen (Google Auth Platform, Branding) shows the app name that people see when they sign in with Google; set it to CometRow if it still says PrivateAI.
- Any external account or listing created under the old name (supplier contacts, Render, GitHub) keeps it until changed there.
