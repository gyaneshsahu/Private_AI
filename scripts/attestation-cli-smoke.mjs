// In-image smoke test for the pinned supplier CLI: runs the real CLI inside the
// built Render candidate against the real enclave, with network, no API key and
// no inference, and checks only that the TLS handshake and attestation fetch
// reached the enclave and produced a verification record. It does NOT assert
// the record's verdict: on a network with TLS interception the key-binding step
// fails by design, and the release digest is not compared with any pin here.
//
//   docker build --target render-candidate -t privateai-render-candidate:local -f Dockerfile.render .
//   node scripts/attestation-cli-smoke.mjs [image]
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const image = process.argv[2] ?? "privateai-render-candidate:local";
const enclave = "inference.tinfoil.sh";
const repository = "tinfoilsh/confidential-model-router";
const env = { ...process.env };
for (const key of [
  "DOCKER_HOST",
  "DOCKER_CONTEXT",
  "DOCKER_TLS",
  "DOCKER_TLS_VERIFY",
  "DOCKER_CERT_PATH",
  "TINFOIL_API_KEY",
])
  delete env[key];
const host =
  process.platform === "win32"
    ? "--host=npipe:////./pipe/dockerDesktopLinuxEngine"
    : "--host=unix:///var/run/docker.sock";
const name = `privateai-attestation-smoke-${randomUUID()}`;
let stdout = "";
let stderr = "";
let code = 0;
try {
  stdout = execFileSync(
    "docker",
    [
      host,
      "run",
      "--rm",
      `--name=${name}`,
      "--read-only",
      "--tmpfs=/tmp:rw,noexec,nosuid,size=16m",
      "--cap-drop=ALL",
      "--security-opt=no-new-privileges",
      "--user=1000:1000",
      "--env=TINFOIL_NO_UPDATE_CHECK=1",
      "--env=HOME=/tmp",
      "--entrypoint=/usr/local/bin/tinfoil",
      image,
      "attestation",
      "verify",
      "-e",
      enclave,
      "-r",
      repository,
      "-j",
    ],
    {
      env,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 120_000,
    },
  );
} catch (error) {
  stdout = String(error.stdout ?? "");
  stderr = String(error.stderr ?? "");
  code = typeof error.status === "number" ? error.status : 1;
}
const handshakeFailed =
  /unknown authority|tls: failed|x509|no such host|connection refused|i\/o timeout|dial tcp/i.test(
    stderr,
  );
// The CLI prints its record with json.MarshalIndent, so it spans several
// lines; parse the whole output first and fall back to a single trailing line.
let record;
for (const candidate of [
  stdout.trim(),
  stdout.trim().split("\n").filter(Boolean).at(-1) ?? "",
]) {
  try {
    record = JSON.parse(candidate);
    break;
  } catch {
    record = undefined;
  }
}
const reached = !!record && typeof record === "object" && "digest" in record;
const result = {
  kind: "ATTESTATION_CLI_IMAGE_SMOKE",
  image,
  enclave,
  repository,
  exitCode: code,
  handshakeFailed,
  reachedEnclave: reached,
  digest: reached ? record.digest : undefined,
  freshnessExpiresAt: reached ? record.freshness_expires_at : undefined,
  verdict: reached ? record.status : undefined,
  // Only the CLI's own error line is surfaced; it carries no request content.
  error: reached
    ? record.error
    : (stderr.split("\n").find((line) => line.trim()) ?? ""),
};
console.log(JSON.stringify(result));
if (!reached || handshakeFailed) {
  console.error(
    "The pinned CLI could not complete a TLS handshake and attestation fetch from inside the image.",
  );
  process.exit(1);
}
