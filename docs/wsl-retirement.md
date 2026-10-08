# PrivateAI workspace consolidation — 5 October 2026

Only `C:\Gyanesh\Startups\Private_AI` is active for development. Windows fixes
were committed as `8d944dd` and verified locally before WSL inventory.
[Validate](https://github.com/gyaneshsahu/Private_AI/actions/runs/37302429888)
and [hosted no-inference smoke](https://github.com/gyaneshsahu/Private_AI/actions/runs/37302430037)
both passed that commit with the updated pinned actions and Ubuntu 24.04 runner.

| Retired folder in Ubuntu-24.04 | Inventory |
| --- | --- |
| `/home/dressfit/projects/Private_AI` | Older non-Git copy; 11 source/document versions not present in Windows Git were preserved, plus nine experiment-evidence files |
| `/home/dressfit/projects/Private_AI-git` | Clean Git checkout before retirement notice, correct origin and branch, commit `2b636d7`; all source content already in Windows Git; 14 experiment-evidence files preserved |

No running process had a current working directory in either folder at inventory.
Each now contains `RETIRED_PRIVATEAI.md` pointing to Windows. No source, permit,
claim, credential, cache or Git history was deleted or moved. Ubuntu/WSL remains
installed; no other project was changed.

## Private evidence archive

Location under the Windows user's local application data:
`%LOCALAPPDATA%\PrivateAI\retired-wsl\2026-10-05\privateai-evidence.dpapi`.
The adjacent `inventory.json` records paths, SHA-256 hashes and exclusions.

The archive contains 34 original file entries (23 evidence + 11 unique source),
deduplicated to 26 byte payloads. It includes the successful earlier two-turn
synthetic result, failed startup attempts, diagnostic results, public preflights
and consumed permits. Duplicate copies of the successful two-turn result are one
experiment, not four billable requests. The historical compatibility claim
records zero relay attempts and remains consumed.

Files were selected by explicit source/evidence scope and screened for secret
fields/token patterns. Secret filenames, symlinks, Git internals and dependency /
build caches were excluded. No secret file was copied. The archive is encrypted
with Windows DPAPI CurrentUser and has an ACL restricted to the Windows user and
SYSTEM. It was decrypted in memory and every original-file SHA-256 verified.
It is outside Git and was not uploaded.

Recovery requires the same Windows user's DPAPI credentials. Decrypt the binary
with `System.Security.Cryptography.ProtectedData.Unprotect` using CurrentUser;
the UTF-8 JSON contains `entries` (source path, hash, byte count, kind) and
`objects` (SHA-256 to base64 original bytes). Verify the decoded bytes against
each hash before restoring to a new private directory. Do not restore consumed
permits into the active runner or treat old results as new qualification.

## What can be removed later

The inventoried source files and allowlisted `.local` evidence are recoverable
from Windows Git or the verified private archive. Dependencies/build outputs
are reproducible, but excluded caches and `.git` internals were not audited for
credentials; there is no blanket claim that deleting either whole folder cannot
delete a secret. Review excluded contents before a future exact-path deletion.
For this request both folders are retired in place and preserved. No deletion
was performed, and no WSL uninstall is needed.
