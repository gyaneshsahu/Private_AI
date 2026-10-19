import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
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
const workspace = browser || process.argv.includes("--workspace");
const database = `${container}-db`;
const host =
  process.platform === "win32"
    ? "--host=npipe:////./pipe/dockerDesktopLinuxEngine"
    : "--host=unix:///var/run/docker.sock";
const env = { ...process.env };
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
      "--user=1000:1000",
      "--read-only",
      "--cap-drop=ALL",
      "--security-opt=no-new-privileges",
      "--label=privateai.purpose=synthetic-ingress",
      "--tmpfs=/tmp:rw,noexec,nosuid,size=64m",
      "--tmpfs=/app/.local:rw,noexec,nosuid,uid=1000,gid=1000,mode=700,size=16m",
      "--tmpfs=/app/node_modules/.vite:rw,noexec,nosuid,uid=1000,gid=1000,mode=700,size=16m",
      "--tmpfs=/app/node_modules/.vite-temp:rw,noexec,nosuid,uid=1000,gid=1000,mode=700,size=16m",
      "--mount",
      `type=bind,source=${resolve("server/authenticated-ingress.ts")},target=/app/server/authenticated-ingress.ts,readonly`,
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
      "--env=PRIVATEAI_SYNTHETIC_CADDY=/usr/local/bin/caddy",
      "--env=XDG_DATA_HOME=/tmp/test-data",
      ...(browser
        ? ["--env=PRIVATEAI_SYNTHETIC_INGRESS_BROWSER=1", "--shm-size=256m"]
        : []),
      ...(workspace
        ? [
            "--mount",
            `type=bind,source=${resolve("server")},target=/app/server,readonly`,
            "--mount",
            `type=bind,source=${resolve("shared")},target=/app/shared,readonly`,
            "--mount",
            `type=bind,source=${resolve("tests")},target=/app/tests,readonly`,
            "--mount",
            `type=bind,source=${resolve("dist")},target=/app/dist,readonly`,
            "--env=PRIVATEAI_SYNTHETIC_PG=postgresql://privateai_synthetic:local-synthetic-only@127.0.0.1:5432/privateai_synthetic",
          ]
        : []),
      "--entrypoint=node",
      browser
        ? "privateai-ingress-browser-test:local"
        : workspace
          ? "privateai-account-ingress-test:local"
          : "privateai-evaluation:latest",
      "node_modules/vitest/vitest.mjs",
      "run",
      workspace
        ? "tests/ingress-workspace.test.ts"
        : "tests/authenticated-ingress.test.ts",
      "--maxWorkers=1",
    ],
    { env, stdio: "inherit", windowsHide: true, timeout: 90000 },
  );
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
    await tls.dispose();
  }
}
