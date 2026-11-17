// CI's dependency audit (threat model A18): no known high or critical vulnerability in production
// dependencies, except the advisories listed here, each by its exact ID, with the reason it does not
// reach the shipped app and a date to check it again. Exceptions: docs/dependency-exceptions.md.
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const ALLOWED = [
  {
    id: "GHSA-fc5q-39xc-vjpf",
    package: "picomatch",
    added: "2026-11-17",
    reviewBy: "2026-11-24",
    // `npm audit --omit=dev` reports it only because better-auth lists vitest as an optional peer
    // (used by better-auth/test, which we never import). The production server (server/render-entry.ts)
    // imports no vite, vitest or picomatch and the client bundle has no picomatch code (checked
    // 17 November). The files are on disk in the Render image (built from the full install), never loaded.
    reason: "build and test tools only (vite, vitest); not loaded by the production server or the client bundle",
  },
];

/** The high or critical advisories in an `npm audit --json` report that are not allowed, by advisory URL. */
export function blockingAdvisories(report, allowed = ALLOWED) {
  const ids = new Set(allowed.map((a) => a.id));
  const found = new Map();
  for (const vulnerability of Object.values(report.vulnerabilities ?? {}))
    for (const via of vulnerability.via ?? [])
      if (typeof via === "object" && ["high", "critical"].includes(via.severity)) found.set(via.url, via);
  const all = [...found.values()];
  return {
    blocking: all.filter((a) => !ids.has(String(a.url).split("/").pop())),
    allowedSeen: allowed.filter((a) => all.some((v) => String(v.url).endsWith(a.id))),
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  let out;
  try {
    out = execFileSync("npm", ["audit", "--omit=dev", "--json"], { encoding: "utf8", shell: process.platform === "win32" });
  } catch (error) {
    out = error.stdout; // npm audit exits non-zero when it finds anything; the report is still on stdout.
  }
  const { blocking, allowedSeen } = blockingAdvisories(JSON.parse(out));
  for (const a of blocking) console.log(`BLOCKING ${a.severity}: ${a.name} ${a.title} ${a.url}`);
  const today = new Date().toISOString().slice(0, 10);
  for (const a of allowedSeen)
    console.log(`${a.reviewBy < today ? "::warning::" : ""}Allowed ${a.id} (${a.package}) since ${a.added}: ${a.reason}. Check again by ${a.reviewBy}.`);
  for (const a of ALLOWED.filter((x) => !allowedSeen.includes(x)))
    console.log(`::warning::${a.id} (${a.package}) is no longer reported: remove it from scripts/audit-check.mjs and docs/dependency-exceptions.md.`);
  process.exit(blocking.length ? 1 : 0);
}
