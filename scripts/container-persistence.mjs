import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
const volume = "privateai-synthetic-" + randomUUID();
const env = { ...process.env };
for (const key of [
  "DOCKER_HOST",
  "DOCKER_CONTEXT",
  "DOCKER_TLS",
  "DOCKER_TLS_VERIFY",
  "DOCKER_CERT_PATH",
])
  delete env[key];
const docker = (...args) =>
  execFileSync(
    "docker",
    [
      process.platform === "win32"
        ? "--host=npipe:////./pipe/dockerDesktopLinuxEngine"
        : "--host=unix:///var/run/docker.sock",
      ...args,
    ],
    { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
const image = "privateai-evaluation";
try {
  docker("volume", "create", volume);
  docker(
    "run",
    "--rm",
    "--network=none",
    "--user=0",
    "--mount",
    `type=volume,source=${volume},target=/registry`,
    "--entrypoint",
    "node",
    image,
    "--input-type=module",
    "-e",
    "import{chownSync,chmodSync}from'node:fs';chownSync('/registry',1000,1000);chmodSync('/registry',0o700)",
  );
  const run = (code) =>
    docker(
      "run",
      "--rm",
      "--network=none",
      "--read-only",
      "--tmpfs",
      "/tmp",
      "--cap-drop=ALL",
      "--security-opt=no-new-privileges",
      "--mount",
      `type=volume,source=${volume},target=/registry`,
      "--entrypoint",
      "node",
      image,
      "--import",
      "tsx",
      "--input-type=module",
      "-e",
      code,
    );
  const base =
    "import assert from 'node:assert/strict';import{InviteRegistry}from'./server/invite-registry.ts';import{readFileSync,writeFileSync}from'node:fs';assert.equal(process.getuid(),1000);const r=new InviteRegistry('/registry/invites.sqlite');";
  run(
    base +
      "const a=r.issue(Date.now()+3600000),b=r.issue(Date.now()+3600000);assert.equal(await r.register(a.id,a.token,'synthetic-initial-password'),true);assert.equal(await r.register(b.id,b.token,'synthetic-other-password'),true);assert.equal(await r.changePassword(a.id,0,'synthetic-initial-password','synthetic-replaced-password'),true);r.revoke(b.id);assert.equal(r.allowRequest(a.id),true);r.pause(true);writeFileSync('/registry/ids.json',JSON.stringify([a.id,b.id]));r.close();",
  );
  run(
    base +
      "const[a,b]=JSON.parse(readFileSync('/registry/ids.json','utf8'));assert.equal(r.paused,true);assert.equal(r.active(a),false);r.pause(false);assert.equal(await r.login(a,'synthetic-replaced-password'),true);assert.equal(await r.login(a,'synthetic-initial-password'),false);assert.equal(await r.login(b,'synthetic-other-password'),false);assert.equal(r.credentialVersion(a),1);r.pause(true);r.close();",
  );
  run(
    "import assert from'node:assert/strict';import{openInviteRegistry}from'./server/registry-storage.ts';const r=openInviteRegistry('/registry/invites.sqlite',true);assert.equal(r.paused,true);assert.equal(r.list().length,2);r.close();",
  );
  const evidence = {
    imageId: docker("image", "inspect", image, "--format", "{{.Id}}").trim(),
    threeSeparateNonRootContainers: "PASSED",
    network: "none",
    namedVolume: "synthetic-only",
    passwordChangeRevocationPausePersisted: true,
    hostedRegistryStartupGuard: true,
    actualHostedTLS: false,
  };
  console.log(JSON.stringify(evidence));
} catch {
  console.error(
    "Synthetic container persistence rehearsal failed; no service keys configured.",
  );
  process.exitCode = 1;
} finally {
  docker("volume", "rm", volume);
}
