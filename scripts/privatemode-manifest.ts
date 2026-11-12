// The live Privatemode deployment manifest: prints its SHA-256 (the value a Privatemode
// qualification report approves in releaseDigests) and, with --write, saves the bytes for the
// relay to serve. With --check <report.json> it exits 1 when the live manifest is not one the
// report approves (a manifest rotation stops chat until the owner approves the new digest).
// Attestation only: no prompt, no tokens. Key from Windows Credential Manager, never printed:
//   Invoke-WithPrivateAiSecret -Name PRIVATEMODE_API_KEY -Action { npx tsx scripts/privatemode-manifest.ts --write .local/privatemode-manifest.json }
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { PrivatemodeAI } from "privatemode-ai";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const apiKey = process.env.PRIVATEMODE_API_KEY;
if (!apiKey) throw Error("Load PRIVATEMODE_API_KEY with scripts/WindowsSecrets.psm1");
const client = new PrivatemodeAI({ apiKey, enableWasmLogging: false });
await client.verify();
const manifest = client.manifestBytes!;
client.close();
const digest = createHash("sha256").update(manifest).digest("hex");
const kinds = Object.keys((JSON.parse(new TextDecoder().decode(manifest)) as { ReferenceValues?: object }).ReferenceValues ?? {});
console.log(`manifest sha256 ${digest} (${manifest.length} bytes; reference values: ${kinds.join(", ")})`);
const out = arg("write");
if (out) {
  await writeFile(out, manifest);
  console.log(`written to ${out}`);
}
const report = arg("check");
if (report) {
  const approved: string[] = JSON.parse(await readFile(report, "utf8")).releaseDigests ?? [];
  if (!approved.includes(digest)) {
    console.log("CHANGED: the live manifest is not approved by the report; chat refuses until the owner approves it.");
    process.exit(1);
  }
  console.log("unchanged: the report approves the live manifest.");
}
