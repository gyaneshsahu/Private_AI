// Weekly provider terms check (checklist B19/B20). Read-only GETs to the suppliers' public
// legal pages; compares each page's "last updated" date and a fingerprint of its text with
// docs/provider-terms-baseline.json and exits 1 if anything changed, so the owner re-reads
// the page and our copy. No credentials, no account data.
//   node scripts/provider-terms-check.mjs            compare with the baseline
//   node scripts/provider-terms-check.mjs --record   write a new baseline (after re-reading)
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const PAGES = [
  { provider: "tinfoil", page: "terms", url: "https://tinfoil.sh/terms" },
  { provider: "tinfoil", page: "acceptable-use", url: "https://tinfoil.sh/terms/aup" },
  { provider: "tinfoil", page: "dpa", url: "https://tinfoil.sh/terms/dpa" },
  { provider: "tinfoil", page: "privacy", url: "https://tinfoil.sh/privacy" },
  { provider: "privatemode", page: "terms", url: "https://www.privatemode.ai/terms-of-service" },
  { provider: "privatemode", page: "dpa", url: "https://www.privatemode.ai/dpa" },
  { provider: "privatemode", page: "privacy", url: "https://www.privatemode.ai/privacy-policy" },
];
const BASELINE = "docs/provider-terms-baseline.json";

function text(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}
function dated(body) {
  const match = /(Last updated|Published|Updated|Effective)[:\s]+([A-Z][a-z]{2,8}\.? \d{1,2}, \d{4})/.exec(body);
  return match ? match[2] : null;
}

const results = [];
for (const entry of PAGES) {
  try {
    const response = await fetch(entry.url, { redirect: "follow", signal: AbortSignal.timeout(20000) });
    const body = text(await response.text());
    // Fingerprint the legal text only: from the date line on, so menus and footers matter less.
    const start = Math.max(0, body.search(/Last updated|Published/));
    results.push({
      ...entry,
      status: response.status,
      lastUpdated: dated(body),
      sha256: createHash("sha256").update(body.slice(start)).digest("hex"),
    });
  } catch (error) {
    results.push({ ...entry, status: 0, lastUpdated: null, sha256: null, error: String(error?.message ?? error) });
  }
}

if (process.argv.includes("--record")) {
  writeFileSync(BASELINE, JSON.stringify({ recordedAt: new Date().toISOString(), pages: results }, null, 2) + "\n");
  console.log(`baseline written: ${results.length} pages`);
  process.exit(results.some((r) => r.status !== 200) ? 1 : 0);
}

const baseline = JSON.parse(readFileSync(BASELINE, "utf8"));
let changed = 0;
for (const now of results) {
  const before = baseline.pages.find((p) => p.url === now.url);
  const dateChanged = before?.lastUpdated !== now.lastUpdated;
  const textChanged = before?.sha256 !== now.sha256;
  const verdict =
    now.status !== 200 ? "UNREACHABLE" : dateChanged ? "CHANGED (date)" : textChanged ? "CHANGED (text)" : "same";
  if (verdict !== "same") changed++;
  console.log(`${verdict.padEnd(15)} ${now.provider.padEnd(12)} ${now.page.padEnd(15)} ${now.lastUpdated ?? "no date"}  ${now.url}`);
}
console.log(changed ? `\n${changed} page(s) to re-read; then compare docs/provider-promises-20261112.md and re-record.` : "\nno change since the baseline");
process.exit(changed ? 1 : 0);
