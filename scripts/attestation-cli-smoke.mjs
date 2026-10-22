// In-image smoke test for the pinned supplier CLI: runs the real CLI inside the
// built Render candidate against the real enclave, with network, no API key and
// no inference. It passes only when the CLI exits 0 with no handshake error and
// its record carries a 64-hex release digest, a future freshness expiry and the
// verdict "ok" (scripts/attestation-cli-smoke-evaluate.mjs, unit-tested). The
// digest is reported, not compared with any pin: pinning is a policy decision.
// On a network with TLS interception the handshake fails and so does this.
//
//   docker build --target render-candidate -t privateai-render-candidate:local -f Dockerfile.render .
//   node scripts/attestation-cli-smoke.mjs [image]
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { evaluateSmoke } from "./attestation-cli-smoke-evaluate.mjs";

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
const outcome = evaluateSmoke({ stdout, stderr, exitCode: code });
const result = {
  kind: "ATTESTATION_CLI_IMAGE_SMOKE",
  image,
  enclave,
  repository,
  ...outcome,
};
console.log(JSON.stringify(result));
if (!outcome.ok) {
  console.error(
    `The pinned CLI did not complete a verified attestation from inside the image: ${outcome.reasons.join("; ")}.`,
  );
  process.exit(1);
}
