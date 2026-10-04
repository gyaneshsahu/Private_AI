# Git handoff for Windows / WSL2

Repository: `https://github.com/gyaneshsahu/Private_AI.git`.
The repository was empty. Existing development work is preserved in baseline
commit `87d4acb` on `main`. The current batch uses `codex/provider-qualification`.
Native HTTPS Git read and push succeeded with existing platform authentication.
GitHub's separate API returned Forbidden; no PR could be created through that
API, and no additional credential is needed for this branch-based handoff.

## One-time WSL setup without overwriting the ZIP-based project

Leave `~/projects/Private_AI` intact, including its `.local` results and any
uncommitted edits. Clone into a new sibling folder; Git refuses an occupied
nonempty destination. Use Ubuntu-24.04 and the existing Linux Node 24 install.

```bash
cd ~/projects
git clone --branch codex/provider-qualification https://github.com/gyaneshsahu/Private_AI.git Private_AI-git
cd Private_AI-git
npm ci
```

If GitHub asks for authentication, use your normal secure GitHub sign-in locally;
do not paste tokens into chat or embed one in the remote URL. The existing
Playwright browser in your WSL home can be reused. Install it with
`npx playwright install chromium` only if the offline browser check says missing.

Preserve the original experiment claim records and public preflight evidence in
the new ignored `.local` folder. This copies only selected evidence, without
removing the old copies or importing credentials/dependency caches:

```bash
mkdir -p .local
if [ -d ../Private_AI/.local/experiment-runs ]; then
  cp -an ../Private_AI/.local/experiment-runs .local/
fi
for file in ../Private_AI/.local/browser-preflight-*.json; do
  [ ! -f "$file" ] || cp -n "$file" .local/
done
```

Keep any custom source changes in the old folder for comparison; do not copy
its source files wholesale over this checkout. The source branch already
contains the integrated, tested batches. The API key stays in your open WSL
terminal environment; it is not transferred by Git. Saved browser history is
origin/browser-profile scoped and is not migrated by this Git operation.

## Subsequent batches

In `~/projects/Private_AI-git`:

```bash
git status --short
git pull --ff-only
npm ci
npm run check
```

`git pull --ff-only` never creates a merge automatically. If Git reports local
changes that conflict or a non-fast-forward history, stop and report it; do not
reset, clean or overwrite work. Routine updates stay on the named development
branch until an explicit branch transition is documented. No repeated ZIP import
is needed. Build/test and live inference remain separate actions.

## Repository hygiene

`.local/`, `.env*` (except the blank example), dependencies, generated assets,
logs and test outputs are ignored. Source-only files were scanned before the
initial commit; no private keys or token-pattern candidates were found. This
scan is a precaution, not a complete secret audit. Do not force-add ignored
files. Publication of source is not deployment of the app or provider approval.
