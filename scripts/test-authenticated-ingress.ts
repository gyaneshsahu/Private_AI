import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { createHash, randomUUID, X509Certificate } from "node:crypto";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { ingressTLS } from "../tests/fixtures/ingress-tls";

if (process.env.PRIVATEAI_SYNTHETIC_INGRESS_TLS_DIR)
  throw Error("This runner creates its own synthetic certificates.");
const caddy = resolve(".local/ingress-caddy/caddy");
if (
  createHash("sha256")
    .update(await readFile(caddy))
    .digest("hex") !==
  "678ade3bfc088749c81a681adc603333ee0bb023b6a6cfe3c0f58bef8ff854e9"
)
  throw Error(
    "Prepare the pinned Caddy 2.11.7 Linux fixture from development-deployment.md.",
  );
const tls = await ingressTLS();
const container = `privateai-ingress-${randomUUID()}`;
const browser = process.argv.includes("--browser");
const render = process.argv.includes("--render");
const packaged = render || process.argv.includes("--package");
const workspace = packaged || browser || process.argv.includes("--workspace");
const database = `${container}-db`;
const host =
  process.platform === "win32"
    ? "--host=npipe:////./pipe/dockerDesktopLinuxEngine"
    : "--host=unix:///var/run/docker.sock";
const env = { ...process.env };
const packageFiles: string[] = [];
for (const key of [
  "DOCKER_HOST",
  "DOCKER_CONTEXT",
  "DOCKER_TLS",
  "DOCKER_TLS_VERIFY",
  "DOCKER_CERT_PATH",
])
  delete env[key];
try {
  if (workspace) {
    execFileSync(
      "docker",
      [
        host,
        "run",
        "--detach",
        `--name=${database}`,
        "--pull=never",
        "--network=none",
        "--label=privateai.purpose=synthetic-ingress",
        "--tmpfs=/var/lib/postgresql/data:rw,nosuid,size=256m",
        "--env=POSTGRES_USER=privateai_synthetic",
        "--env=POSTGRES_PASSWORD=local-synthetic-only",
        "--env=POSTGRES_DB=privateai_synthetic",
        "postgres:17-bookworm",
      ],
      {
        env,
        stdio: ["ignore", "ignore", "inherit"],
        windowsHide: true,
        timeout: 15000,
      },
    );
    let ready = false;
    for (let index = 0; index < 40; index++) {
      try {
        execFileSync(
          "docker",
          [
            host,
            "exec",
            database,
            "pg_isready",
            "-U",
            "privateai_synthetic",
            "-d",
            "privateai_synthetic",
          ],
          { env, stdio: "ignore", windowsHide: true, timeout: 3000 },
        );
        ready = true;
        break;
      } catch {
        await new Promise((done) => setTimeout(done, 250));
      }
    }
    if (!ready)
      throw Error("Isolated synthetic database did not become ready.");
  }
  execFileSync(
    "docker",
    [
      host,
      "run",
      "--rm",
      `--name=${container}`,
      "--pull=never",
      workspace ? `--network=container:${database}` : "--network=none",
      ...(render
        ? ["--memory=512m", "--memory-swap=512m", "--pids-limit=128"]
        : []),
      "--user=1000:1000",
      "--read-only",
      "--cap-drop=ALL",
      "--security-opt=no-new-privileges",
      "--label=privateai.purpose=synthetic-ingress",
      "--tmpfs=/tmp:rw,noexec,nosuid,size=64m",
      "--tmpfs=/app/.local:rw,noexec,nosuid,uid=1000,gid=1000,mode=700,size=16m",
      "--tmpfs=/app/node_modules/.vite:rw,noexec,nosuid,uid=1000,gid=1000,mode=700,size=16m",
      "--tmpfs=/app/node_modules/.vite-temp:rw,noexec,nosuid,uid=1000,gid=1000,mode=700,size=16m",
      ...(packaged
        ? []
        : [
            "--mount",
            `type=bind,source=${resolve("server/authenticated-ingress.ts")},target=/app/server/authenticated-ingress.ts,readonly`,
          ]),
      "--mount",
      `type=bind,source=${resolve("tests/authenticated-ingress.test.ts")},target=/app/tests/authenticated-ingress.test.ts,readonly`,
      "--mount",
      `type=bind,source=${resolve("tests/fixtures/ingress-tls.ts")},target=/app/tests/fixtures/ingress-tls.ts,readonly`,
      "--mount",
      `type=bind,source=${resolve("vitest.config.ts")},target=/app/vitest.config.ts,readonly`,
      "--mount",
      `type=bind,source=${tls.directory},target=/fixtures,readonly`,
      "--mount",
      `type=bind,source=${caddy},target=/usr/local/bin/caddy,readonly`,
      "--env=PRIVATEAI_SYNTHETIC_INGRESS_TLS_DIR=/fixtures",
      ...(render ? ["--env=PRIVATEAI_SYNTHETIC_RENDER=1"] : []),
      "--env=PRIVATEAI_SYNTHETIC_CADDY=/usr/local/bin/caddy",
      "--env=XDG_DATA_HOME=/tmp/test-data",
      ...(browser
        ? ["--env=PRIVATEAI_SYNTHETIC_INGRESS_BROWSER=1", "--shm-size=256m"]
        : []),
      ...(workspace
        ? [
            ...(packaged
              ? []
              : [
                  "--mount",
                  `type=bind,source=${resolve("server")},target=/app/server,readonly`,
                  "--mount",
                  `type=bind,source=${resolve("shared")},target=/app/shared,readonly`,
                  // The workspace test imports evaluation helpers that the build image never copies.
                  "--mount",
                  `type=bind,source=${resolve("evaluation")},target=/app/evaluation,readonly`,
                  "--mount",
                  `type=bind,source=${resolve("dist")},target=/app/dist,readonly`,
                ]),
            "--mount",
            `type=bind,source=${resolve("tests")},target=/app/tests,readonly`,
            "--env=PRIVATEAI_SYNTHETIC_PG=postgresql://privateai_synthetic:local-synthetic-only@127.0.0.1:5432/privateai_synthetic",
          ]
        : []),
      "--entrypoint=node",
      render
        ? "privateai-render-candidate:local"
        : packaged
          ? "privateai-deployment-candidate:local"
          : browser
            ? "privateai-ingress-browser-test:local"
            : workspace
              ? "privateai-account-ingress-test:local"
              : "privateai-evaluation:latest",
      "node_modules/vitest/vitest.mjs",
      "run",
      render
        ? "tests/render-bridge.test.ts"
        : packaged
          ? "tests/deployment-package.test.ts"
          : workspace
            ? "tests/ingress-workspace.test.ts"
            : "tests/authenticated-ingress.test.ts",
      ...(render
        ? [
            "tests/deployment-package.test.ts",
            "tests/authenticated-ingress.test.ts",
          ]
        : []),
      "--maxWorkers=1",
    ],
    { env, stdio: "inherit", windowsHide: true, timeout: 90000 },
  );
  if (packaged && !render) {
    const docker = (args: string[], timeout = 15000) =>
      execFileSync("docker", [host, ...args], {
        env,
        encoding: "utf8",
        windowsHide: true,
        timeout,
        stdio: ["ignore", "pipe", "pipe"],
      }).trim();
    const writeFixture = async (name: string, value: string) => {
      const file = resolve(tls.directory, name);
      packageFiles.push(file);
      await writeFile(file, value);
    };
    await writeFixture(
      "auth-secret",
      "SYNTHETIC_CONTAINER_ONLY_SECRET_123456789",
    );
    await writeFixture(
      "database-url",
      "postgresql://privateai_synthetic:local-synthetic-only@127.0.0.1:5432/privateai_synthetic",
    );
    await writeFixture(
      "config.json",
      JSON.stringify({
        mode: "restricted-deployment",
        email: "disabled",
        host: "127.0.0.1",
        port: 8443,
        assets: "/app/dist",
        secretFile: "/fixtures/auth-secret",
        databaseUrlFile: "/fixtures/database-url",
        tlsKeyFile: "/fixtures/localhost.key",
        tlsCertFile: "/fixtures/localhost.pem",
        clientCaFile: "/fixtures/ca.pem",
        peerCertificateSha256: [
          new X509Certificate(tls.proxy.cert).fingerprint256
            .replaceAll(":", "")
            .toLowerCase(),
        ],
      }),
    );
    docker([
      "run",
      "-d",
      `--name=${container}`,
      "--pull=never",
      `--network=container:${database}`,
      "--label=privateai.purpose=synthetic-ingress",
      "--read-only",
      "--user=1000:1000",
      "--cap-drop=ALL",
      "--security-opt=no-new-privileges",
      "--memory=1g",
      "--pids-limit=128",
      "--log-driver=none",
      "--tmpfs=/tmp:rw,noexec,nosuid,size=64m",
      "--mount",
      `type=bind,source=${tls.directory},target=/fixtures,readonly`,
      "privateai-deployment-candidate:local",
      "/fixtures/config.json",
    ]);
    const probe = `const fs=require('node:fs');const https=require('node:https');const r=https.get({hostname:'127.0.0.1',port:8443,servername:'localhost',path:'/readyz',ca:fs.readFileSync('/fixtures/ca.pem'),key:fs.readFileSync('/fixtures/proxy.key'),cert:fs.readFileSync('/fixtures/proxy.pem'),headers:{host:'app.cometrow.com','x-privateai-edge-client-ip':'203.0.113.8','x-privateai-edge-proto':'https'}},s=>{s.resume();s.on('end',()=>process.stdout.write(String(s.statusCode)))});r.setTimeout(7000,()=>r.destroy());r.on('error',()=>process.exit(2));`;
    const status = () =>
      docker(["exec", container, "node", "-e", probe], 10000);
    const ready = async () => {
      for (let i = 0; i < 30; i++) {
        try {
          if (status() === "200") return;
        } catch {}
        await new Promise((done) => setTimeout(done, 100));
      }
      throw Error("Packaged container did not recover readiness.");
    };
    await ready();
    docker(["pause", database]);
    try {
      if (status() !== "503") throw Error("Database outage was not detected.");
    } finally {
      docker(["unpause", database]);
    }
    await ready();
    docker(["kill", "--signal=KILL", container]);
    if (
      docker(["inspect", "--format", "{{.State.ExitCode}}", container]) !==
      "137"
    )
      throw Error("Abrupt container failure was not recorded.");
    docker(["start", container]);
    await ready();
    docker(["stop", "--time=20", container], 25000);
    if (
      docker(["inspect", "--format", "{{.State.ExitCode}}", container]) !== "0"
    )
      throw Error("Graceful container stop failed.");
    console.log(
      "Packaged container: readiness outage/recovery, SIGKILL/137, restart and graceful stop/0 passed.",
    );
  }
} finally {
  try {
    for (const target of workspace ? [container, database] : [container]) {
      let label = "";
      try {
        label = execFileSync(
          "docker",
          [
            host,
            "inspect",
            "--format",
            '{{index .Config.Labels "privateai.purpose"}}',
            target,
          ],
          {
            env,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
            windowsHide: true,
            timeout: 5000,
          },
        ).trim();
      } catch {
        const remaining = execFileSync(
          "docker",
          [host, "ps", "-aq", "--filter", `name=^${target}$`],
          { env, encoding: "utf8", windowsHide: true, timeout: 5000 },
        ).trim();
        if (remaining)
          throw Error(
            "Could not verify the synthetic container identity for cleanup.",
          );
      }
      if (label && label !== "synthetic-ingress")
        throw Error("Unexpected synthetic container label; cleanup refused.");
      if (label === "synthetic-ingress")
        execFileSync("docker", [host, "rm", "--force", target], {
          env,
          stdio: "ignore",
          windowsHide: true,
          timeout: 10000,
        });
    }
  } finally {
    for (const file of packageFiles) await unlink(file);
    await tls.dispose();
  }
}
