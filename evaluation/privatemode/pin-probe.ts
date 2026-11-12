// Qualification step c: can a pinned manifest refuse a different deployment? Pins a
// tampered copy of the live manifest and rejects any update from onManifestUpdate.
// Also prints the manifest's attestation-related keys (public data). Synthetic prompt.
import { PrivatemodeAI } from "privatemode-ai";

const apiKey = process.env.PRIVATEMODE_API_KEY!;
const probe = new PrivatemodeAI({ apiKey });
const live = (await probe.verify()).manifest as Record<string, any>;
probe.close();
const keys = (o: unknown, p = ""): string[] =>
  o && typeof o === "object" && !Array.isArray(o)
    ? Object.entries(o).flatMap(([k, v]) => [p + k, ...keys(v, p + k + ".")])
    : Array.isArray(o) && o[0] && typeof o[0] === "object" ? keys(o[0], p + "[0].") : [];
console.log("manifest keys:", [...new Set(keys(live.ReferenceValues).map((k) => k.replace(/\.\[0\]/g, "[]")))].join(", "));
console.log("policies:", Object.keys(live.Policies).length, "role values:", [...new Set(Object.values(live.Policies).map((p: any) => p.Role))].join(","));

const tampered = structuredClone(live);
tampered.ReferenceValues.snp[0].TrustedMeasurement = "00".repeat(48);
let updated = 0;
const pinned = new PrivatemodeAI({
  apiKey,
  manifestBytes: new TextEncoder().encode(JSON.stringify(tampered)),
  onManifestUpdate: () => {
    updated++;
    // App-level enforcement: release the client so nothing can be sent under the new manifest.
    if (process.argv.includes("--close")) pinned.close();
    throw Error("pinned manifest changed: refusing");
  },
});
for (const step of ["verify", "send"] as const) {
  try {
    if (step === "verify") await pinned.verify();
    else
      await pinned.chat.completions.create({
        model: "gpt-oss-120b",
        reasoning_effort: "low",
        max_tokens: 8,
        messages: [{ role: "user", content: "Reply: ok" }],
      });
    console.log(step, "SUCCEEDED (not refused)");
  } catch (e) {
    console.log(step, "refused:", String((e as Error).message).slice(0, 160));
  }
}
console.log("onManifestUpdate calls:", updated);
pinned.close();
