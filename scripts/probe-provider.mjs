// Read-only synthetic-free attestation probe. No API credential or inference call.
// Success is partial evidence, never a provider qualification report.
import { fetch, EnvHttpProxyAgent } from "undici";

if (
  process.argv.length > 3 ||
  (process.argv[2] && process.argv[2] !== "--worker")
) {
  console.error(
    "Use no argument for router verification or --worker for the fixed public-inventory worker probe. No inference is available.",
  );
  process.exit(1);
}
const worker = process.argv[2] === "--worker";
const host = worker
  ? "gpt-oss-120b-inf12-0.tinfoil.containers.tinfoil.dev"
  : "inference.tinfoil.sh";
const repository = worker
  ? "tinfoilsh/confidential-gpt-oss-120b"
  : "tinfoilsh/confidential-model-router";
const origin = `https://${host}`;

const allowed = new Set([
  "inference.tinfoil.sh",
  "atc.tinfoil.sh",
  "github-proxy.tinfoil.sh",
  "kds-proxy.tinfoil.sh",
]);
const dispatcher = new EnvHttpProxyAgent();
const deadline = AbortSignal.timeout(45000);
const requests = [];
globalThis.fetch = async (input, init) => {
  const request = new Request(input, init);
  const url = new URL(request.url);
  // SDK uses POST for a read-only bundle lookup with public deployment names.
  const lookup =
    request.method === "POST" &&
    url.href === "https://atc.tinfoil.sh/attestation";
  const body = lookup ? await request.text() : undefined;
  if (
    lookup &&
    body !==
      JSON.stringify({
        enclaveUrl: origin,
        repo: repository,
      })
  )
    throw new Error("Unexpected attestation lookup payload.");
  if (
    (request.method !== "GET" && !lookup) ||
    url.protocol !== "https:" ||
    !allowed.has(url.hostname) ||
    url.username ||
    url.password ||
    url.port ||
    request.headers.has("authorization") ||
    request.headers.has("cookie")
  )
    throw new Error(
      "Probe blocked an unexpected destination, method or credential.",
    );
  const response = await fetch(request.url, {
    method: request.method,
    body,
    headers: request.headers,
    redirect: "error",
    dispatcher,
    signal: AbortSignal.any([deadline, request.signal]),
  });
  requests.push({
    host: url.hostname,
    path: url.pathname,
    status: response.status,
  });
  return response;
};

try {
  const { fetchAttestationBundle, Verifier } = await import("tinfoil");
  const bundle = await fetchAttestationBundle({
    enclaveURL: origin,
    configRepo: repository,
  });
  if (bundle.domain !== host) throw new Error("Unexpected bundle host.");
  const verifier = new Verifier({ configRepo: repository });
  await verifier.verifyBundle(bundle);
  const doc = verifier.getVerificationDocument();
  if (
    !doc?.securityVerified ||
    doc.enclaveHost !== bundle.domain ||
    doc.configRepo !== repository ||
    !doc.hpkePublicKey
  )
    throw new Error("Verification did not establish the requested identity.");
  console.log(
    JSON.stringify(
      {
        observedAt: new Date().toISOString(),
        target: worker ? "PUBLIC_INVENTORY_WORKER" : "ROUTER",
        result:
          "SDK attestation verification passed; qualification remains incomplete",
        host: doc.enclaveHost,
        repository: doc.configRepo,
        releaseDigest: doc.releaseDigest,
        requests,
        limits:
          "Latest release is not independently approved. No request-to-worker binding, independent GPU-policy review, browser streaming, freshness/revocation, retention or billing validation. Zero inference requests.",
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(
    JSON.stringify(
      {
        observedAt: new Date().toISOString(),
        result: "BLOCKED_OR_FAILED",
        error: error instanceof Error ? error.message : "Unknown probe failure",
        requests,
        qualification: "Not passed",
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
} finally {
  await dispatcher.destroy();
}
