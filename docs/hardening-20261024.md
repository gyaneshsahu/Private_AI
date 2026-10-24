# Hosted candidate hardening (plan 7.8, D16) — pointer, 24 October 2026

The hardening record (secrets-file inventory, rate-limit bounds with source lines, logging pointer, Render rollback drill) is kept outside the public repository in `docs/private/hardening-20261024.md` (git-ignored). What is public: `scripts/check-headers.mjs` (read-only header check), the checklist test in `tests/deployment-review-checklist.test.ts`, which verifies the private document against the code when it is present and is skipped otherwise, and the deployment review checklist.
