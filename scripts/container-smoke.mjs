import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
const name = `privateai-smoke-${randomUUID()}`;
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
  execFileSync("docker", ["--host=unix:///var/run/docker.sock", ...args], {
    env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
try {
  docker(
    "run",
    "--detach",
    "--rm",
    "--name",
    name,
    "--read-only",
    "--tmpfs",
    "/tmp",
    "--cap-drop=ALL",
    "--security-opt=no-new-privileges",
    "-e",
    "PRIVATEAI_ORIGIN=https://privateai.example",
    "-e",
    "PRIVATEAI_ACCESS_KEY=synthetic_test_access_key_only_0123456789",
    "privateai-evaluation",
  );
  docker(
    "exec",
    name,
    "node",
    "--input-type=module",
    "-e",
    String.raw`
    import { request } from 'node:http';
    import assert from 'node:assert/strict';
    async function get(path, auth = false) {
      return new Promise((resolve, reject) => {
        const headers = { Host: 'privateai.example', 'X-Forwarded-Proto': 'https' };
        if (auth) headers.Authorization = 'Basic ' + Buffer.from('evaluator:synthetic_test_access_key_only_0123456789').toString('base64');
        const req = request('http://127.0.0.1:4173' + path, { headers }, res => {
          let body = ''; res.on('data', chunk => body += chunk);
          res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
        }); req.on('error', reject); req.end();
      });
    }
    let ready = false;
    for (let i = 0; i < 50; i++) {
      try { ready = (await get('/healthz')).status === 200; } catch {}
      if (ready) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(ready);
    assert.equal((await get('/')).status, 401);
    assert.equal((await get('/api/status')).status, 401);
    const page = await get('/', true);
    assert.equal(page.status, 200);
    const asset = page.body.match(/src="([^"]+\.js)"/)[1];
    assert.equal((await get(asset)).status, 401);
    assert.equal((await get(asset, true)).status, 200);
    const status = await get('/api/status', true);
    assert.equal(status.status, 200);
    assert.equal(JSON.parse(status.body).inference.ready, false);
    assert.ok(status.headers['set-cookie'][0].includes('; Secure'));
    assert.equal((await get('/.local/compatibility.json', true)).status, 404);
    assert.equal((await get('/.env', true)).status, 404);
    console.log('Container smoke passed: protected app/assets/API, secure cookie, inference disabled, no private files served. No inference requests.');
  `,
  );
  console.log(
    "Container smoke passed (non-root, read-only filesystem). No inference requests.",
  );
  const invitations = JSON.parse(
    docker(
      "exec",
      "-e",
      "PRIVATEAI_INVITES_FILE=/tmp/synthetic-invitations.sqlite",
      name,
      "node",
      "--import",
      "tsx",
      "scripts/invites.ts",
      "list",
    ),
  );
  if (invitations.paused !== false || invitations.invitations.length !== 0)
    throw new Error("Unexpected synthetic registry");
  const snapshot = JSON.parse(
    docker(
      "exec",
      "-e",
      "PRIVATEAI_INVITES_FILE=/tmp/synthetic-invitations.sqlite",
      name,
      "node",
      "--import",
      "tsx",
      "scripts/invites.ts",
      "backup",
      "/tmp",
    ),
  );
  const recovered = JSON.parse(
    docker(
      "exec",
      "-e",
      `PRIVATEAI_INVITES_FILE=${snapshot.directory}/invites.sqlite`,
      name,
      "node",
      "--import",
      "tsx",
      "scripts/invites.ts",
      "stage-recovery",
      "/tmp",
    ),
  );
  if (
    recovered.kind !== "PAUSED_RECOVERY_COPY" ||
    !recovered.paused ||
    !recovered.operatorReconciliationRequired
  )
    throw new Error("Recovery did not remain paused");
  console.log(
    "Packaged invitation CLI initializes, backs up and stages a paused synthetic recovery as the non-root runtime user.",
  );
} catch {
  console.error(
    "Container smoke failed. Inspect the local build/runtime; no provider request was configured.",
  );
  process.exitCode = 1;
} finally {
  try {
    docker("rm", "--force", name);
  } catch {}
}
