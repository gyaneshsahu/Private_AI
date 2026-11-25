// Read-only check of which edge header carries the visitor's address on a Render deployment, and
// whether a visitor can set it (docs/render-client-ip-20261125.md). Two GETs to /edge-check, no
// credentials. Usage: node scripts/check-client-ip.mjs <origin>
const ADDRESS = "203.0.113.9"; // reserved for documentation; the bridge looks for exactly this value
const HEADERS = ["cf-connecting-ip", "true-client-ip"];
const origin = process.argv[2];
if (!origin || new URL(origin).origin !== origin) {
  console.error("Usage: node scripts/check-client-ip.mjs <origin>");
  process.exit(2);
}
const read = async (headers) => {
  const response = await fetch(origin + "/edge-check", { headers, redirect: "manual" });
  return response.ok ? await response.json() : (await response.body?.cancel(), undefined);
};
const plain = await read({});
if (!plain) {
  console.log("CLIENT IP CHECK: /edge-check did not answer. Is this build deployed?");
  process.exit(1);
}
let usable;
for (const name of HEADERS) {
  // A refused request also proves the edge does not pass a visitor's own header on.
  const forged = await read({ [name]: ADDRESS }).catch(() => undefined);
  const verdict = !plain[name].present
    ? "not sent by the edge"
    : forged?.[name].forgeable
      ? "FORGEABLE: a visitor can set it. Do not use"
      : "sent by the edge, and a visitor's own value did not get through";
  if (plain[name].present && !forged?.[name].forgeable) usable ??= name;
  console.log(`${name}\t${verdict}`);
}
console.log(
  usable
    ? `CLIENT IP CHECK PASSED: set "clientIpHeader": "${usable}" in renderBridge and redeploy.`
    : "CLIENT IP CHECK: no safe header. Leave clientIpHeader unset; sign-in limits stay shared.",
);
