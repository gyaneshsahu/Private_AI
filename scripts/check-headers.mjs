// Read-only header check for one origin (launch plan 7.8). GET only, no
// credentials, no redirects followed. Usage: node scripts/check-headers.mjs <origin>
const FIXED = {
  "cache-control": "no-store",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "permissions-policy": "camera=(self), microphone=(), geolocation=()",
};
const PATHS = ["/healthz", "/api/status", "/", "/missing"];
const origin = process.argv[2];
if (!origin || new URL(origin).origin !== origin) {
  console.error("Usage: node scripts/check-headers.mjs <origin>");
  process.exit(2);
}
const https = origin.startsWith("https://");
let failed = false;
for (const path of PATHS) {
  let response;
  try {
    response = await fetch(origin + path, { redirect: "manual" });
    await response.body?.cancel();
  } catch (error) {
    console.log(`${path}	UNREACHABLE	${error?.cause?.code ?? error?.message}`);
    failed = true;
    continue;
  }
  const problems = [];
  for (const [name, value] of Object.entries(FIXED))
    if (response.headers.get(name) !== value)
      problems.push(`${name}=${JSON.stringify(response.headers.get(name))}`);
  const csp = response.headers.get("content-security-policy") ?? "";
  if (!/default-src '(self|none)'/.test(csp))
    problems.push("content-security-policy");
  // The health probe answers before the transport gate that sets HSTS.
  if (https && path !== "/healthz" && !response.headers.get("strict-transport-security"))
    problems.push("strict-transport-security");
  if (problems.length) failed = true;
  console.log(
    `${path}\t${response.status}\t${problems.length ? "MISSING " + problems.join(",") : "ok"}`,
  );
}
console.log(failed ? "HEADER CHECK FAILED" : "HEADER CHECK PASSED");
process.exit(failed ? 1 : 0);
