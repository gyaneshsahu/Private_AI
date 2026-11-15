// One command for a Privatemode manifest rotation (docs/manifest-rotation-20261114.md, "Routine
// for the next rotation"). Reads the live manifest through the attested SDK (the same code as
// the server's 6-hourly check), compares it with the report's releaseDigests and the approved
// manifest file, and, when it is new, writes: the new manifest (--write), a report draft with
// the new digest first and the old ones kept (<write>.report-draft.json, not loadable until you
// date it), and your checklist (<write>.checklist.md), and prints every changed field in plain
// language. It never writes the report you pass, never approves, never changes production.
// Attestation only: no prompt, no tokens. Key from Windows Credential Manager, never printed:
//   Invoke-WithPrivateAiSecret -Name PRIVATEMODE_API_KEY -Action { npx tsx scripts/privatemode-rotation.ts --report <signed report.json> --write .local/privatemode-manifest.new.json }
// Options: --approved <file> (the approved manifest; default .local/privatemode-manifest.json),
// --live-file <file> (offline: use these bytes instead of the live read; no key needed).
// Exit code: 0 nothing to do, 2 a new manifest was written for your review, 1 error.
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { manifestChanges, rotationDraft } from "../server/manifest-diff";
import { privatemodeLiveManifest } from "../server/manifest-watch";
import type { Qualification } from "../shared/contracts";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const reportFile = arg("report");
const out = arg("write");
const approvedFile = arg("approved") ?? ".local/privatemode-manifest.json";
if (!reportFile || !out) throw Error("Usage: --report <report.json> --write <new manifest file> [--approved <file>] [--live-file <file>]");
const base = out.replace(/\.json$/i, "");
const draftFile = `${base}.report-draft.json`;
const checklistFile = `${base}.checklist.md`;
// Never overwrite the report or the approved manifest.
const protectedPaths = [reportFile, approvedFile].map((p) => resolve(p));
if ([out, draftFile, checklistFile].some((p) => protectedPaths.includes(resolve(p))))
  throw Error("Refused: an output file would overwrite the report or the approved manifest.");

const report = JSON.parse(await readFile(reportFile, "utf8")) as Record<string, unknown>;
const approved = (Array.isArray(report.releaseDigests) ? report.releaseDigests : []).map(String);
const approvedBytes = await readFile(approvedFile).then((b) => new Uint8Array(b)).catch(() => undefined);
const liveFile = arg("live-file");
let live: Uint8Array;
if (liveFile) live = new Uint8Array(await readFile(liveFile));
else {
  const apiKey = process.env.PRIVATEMODE_API_KEY;
  if (!apiKey) throw Error("Load PRIVATEMODE_API_KEY with scripts/WindowsSecrets.psm1, or pass --live-file.");
  live = await privatemodeLiveManifest(report as unknown as Qualification, apiKey)();
}
const digest = sha256(live);
const fileDigest = approvedBytes && sha256(approvedBytes);
console.log(`live manifest sha256 ${digest} (${live.length} bytes${liveFile ? `, from ${liveFile}` : ", read through the attested SDK"})`);
console.log(`report approves: ${approved.join(", ") || "nothing"}`);
console.log(`approved manifest file ${approvedFile}: ${fileDigest ?? "missing"}`);

if (approved.includes(digest)) {
  if (fileDigest === digest) {
    console.log("Unchanged: the report approves the live manifest and the file is the live one. Nothing to do.");
    process.exit(0);
  }
  await writeFile(out, live);
  console.log(
    `The report approves the live manifest, but ${approvedFile} is another one. Written the live bytes to ${out}: upload them as privatemode-manifest.json, or switch on inference.liveManifest (docs/render-deploy-and-live-checks-20261113.md section 2.5).`,
  );
  process.exit(2);
}

const changes = approvedBytes ? manifestChanges(approvedBytes, live) : [];
const warnings = changes.filter((c) => c.warning);
const lines = approvedBytes
  ? changes.map((c, i) => `${i + 1}. [${c.kind}] ${c.warning ? "WARNING: " : ""}${c.text}`)
  : [`No approved manifest file at ${approvedFile}: the fields cannot be compared. Pass --approved <file>.`];
const today = new Date().toISOString().slice(0, 10);
await writeFile(out, live);
await writeFile(draftFile, `${JSON.stringify(rotationDraft(report, digest, today), null, 2)}\n`);
const checklist = [
  `# Privatemode manifest rotation, ${today}: your checklist`,
  "",
  `- Live manifest: \`${digest}\` (${live.length} bytes), saved as \`${out}\`.`,
  `- Approved until now: ${approved.map((d) => `\`${d}\``).join(", ") || "nothing"}. Compared with \`${approvedFile}\` (\`${fileDigest ?? "missing"}\`).`,
  `- ${warnings.length ? `**${warnings.length} WARNING${warnings.length === 1 ? "" : "S"}.** Do not approve until Privatemode or Edgeless explains each one in writing.` : "No warnings: nothing got looser and no service was added."}`,
  "",
  "## What changed",
  "",
  ...lines,
  "",
  "## Before you approve",
  "",
  "- [ ] Read every line above. Any WARNING: stop and ask Edgeless.",
  "- [ ] `docs.privatemode.ai/changelog` has a new entry that explains this as an upgrade, not a new service.",
  ...(changes.some((c) => c.kind === "recovery-key")
    ? ["- [ ] The recovery key changed: ask Edgeless to confirm the new key is theirs (approving before the answer is your call)."]
    : []),
  ...(changes.some((c) => c.kind === "snp" && /stricter/.test(c.text))
    ? ["- [ ] The hardware minimums got stricter: consider removing the old digest when you sign, so a return to the older, weaker deployment is not accepted."]
    : []),
  "",
  "## Sign and deploy",
  "",
  `- [ ] Open \`${draftFile}\`. The new digest is first, the old ones are kept. Set \`reviewedAt\` to now and \`validUntil\` to at most 7 days later (this is your approval; until then the file cannot load). Save it as your signed report.`,
  `- [ ] Upload the signed report as \`qualification-privatemode.json\`. Unless \`inference.liveManifest\` is on, also upload \`${out}\` as \`privatemode-manifest.json\` (exact bytes, do not open and re-save). Save only.`,
  "- [ ] Deploy the same commit. The log shows `CometRow manifest check: the live Privatemode manifest ... is approved and served.`, `/api/status` shows `\"ready\": true`, and one message works.",
  "",
].join("\n");
await writeFile(checklistFile, checklist);
console.log(`\nNEW manifest, not approved. ${warnings.length} warning(s).\n`);
console.log(lines.join("\n"));
console.log(`\nWritten: ${out} (manifest), ${draftFile} (report draft), ${checklistFile} (your checklist). Nothing was approved or deployed.`);
process.exit(2);
