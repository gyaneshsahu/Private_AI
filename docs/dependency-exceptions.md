# Dependency audit exceptions

CI runs `node scripts/audit-check.mjs` (`.github/workflows/validate.yml`): `npm audit --omit=dev`, failing on every high or critical advisory except those listed in `ALLOWED` in that script, each by its exact advisory ID. Nothing else is allowed. Owner decision, 17 November 2026: allow only this one advisory, on the conditions below.

**Check every listed exception again every week and at each dependency update** (`npm audit --omit=dev`, and `npm view <package> version` against the advisory's fixed version). Remove the exception, here and in the script, as soon as a fixed version ships and is installed. CI prints a warning once the review date has passed, and another once the advisory is no longer reported.

## GHSA-fc5q-39xc-vjpf (picomatch, ReDoS through repeated extglobs)

- **Added:** 17 November 2026. **Review by:** 24 November 2026, then weekly. **Remove when:** a picomatch version outside the affected range (`<= 4.0.7`) is available to vite and vitest, or the advisory is withdrawn.
- **Why CI flagged it:** severity high, no fixed version published (GitHub advisory: affected `<= 4.0.7`, first patched version none). It reaches us through vite 8.3.3, vitest 5.0.3, tinyglobby and fdir: build and test tools.
- **Production-only audit (`npm audit --omit=dev`, 17 November):** reports it anyway, only because better-auth 1.7.11 lists vitest as an optional peer dependency. better-auth uses vitest only in its test helpers (`better-auth/test`, `dist/test-utils`), which CometRow never imports (the server imports `better-auth`, `/api`, `/node`, `/oauth2`, `/plugins` and `/social-providers`).
- **Not in the shipped app's running code (checked 17 November):** the import graph from the production entry `server/render-entry.ts` loads no vite, vitest, tinyglobby, fdir or picomatch (vite is loaded only by the local development server, `server/index.ts` in dev mode). The built client bundle (`dist/assets`) contains no picomatch code. The risk is a slow regular expression on a crafted glob pattern; the shipped app never takes glob patterns from anyone.
- **Separate finding for the owner:** the Render image (`Dockerfile.render`) is built from the full install, so development tools, these packages included, are on disk in the production image although never loaded. Pruning development dependencies after the build (for example `npm prune --omit=dev` in a final stage) would make the image smaller and keep such packages out entirely. Not changed today.
