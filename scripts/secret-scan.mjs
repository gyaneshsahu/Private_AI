// Secret scan (threat model A9, owner decision D18): fails if a tracked file contains something
// shaped like a live credential. No dependency; runs in CI after `npm ci`.
//   node scripts/secret-scan.mjs
// shortcut: pattern list covers the keys this project uses; add a pattern when a new supplier joins.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

export const PATTERNS = [
  ["Tinfoil key", /\btk_[A-Za-z0-9]{24,}/],
  ["OpenAI-style key", /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}/],
  ["Private key block", /-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/],
  ["Google OAuth client secret", /\bGOCSPX-[A-Za-z0-9_-]{20,}/],
  ["Google API key", /\bAIza[0-9A-Za-z_-]{35}\b/],
  ["GitHub token", /\b(?:ghp|gho|ghs|github_pat)_[A-Za-z0-9_]{30,}/],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
  ["Stripe live key", /\b[rs]k_live_[A-Za-z0-9]{20,}/],
  // A database URL with an inline password, unless it points at a local or throwaway host.
  ["Database URL with password", /postgres(?:ql)?:\/\/[^:\s/"'`]+:[^@\s"'`]{8,}@(?!localhost|127\.0\.0\.1|\[::1\]|postgres[:/]|db[:/]|host[:/]|example)/],
];

// Synthetic values in tests and docs are allowed only when they say so on the same line.
const ALLOW = /synthetic|example|placeholder|dummy|fake|redacted|your[_-]|xxxx/i;

export function findSecrets(text) {
  const hits = [];
  text.split(/\r?\n/).forEach((line, index) => {
    if (ALLOW.test(line)) return;
    for (const [name, pattern] of PATTERNS) if (pattern.test(line)) hits.push({ line: index + 1, name });
  });
  return hits;
}

if (process.argv[1]?.endsWith("secret-scan.mjs")) {
  const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
  let found = 0;
  for (const file of files) {
    let text;
    try {
      const buffer = readFileSync(file);
      if (buffer.includes(0)) continue; // binary
      text = buffer.toString("utf8");
    } catch {
      continue; // deleted in the working tree
    }
    for (const hit of findSecrets(text)) {
      found++;
      console.log(`${file}:${hit.line}  ${hit.name}`); // never print the value
    }
  }
  console.log(found ? `\n${found} possible secret(s); remove and rotate, or mark the line synthetic.` : `secret scan: ${files.length} files, nothing found`);
  process.exit(found ? 1 : 0);
}
