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
  execFileSync(
    "docker",
    [
      host,
      "run",
      "--rm",
      `--name=${container}`,
      "--pull=never",
      "--network=none",
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
      "--entrypoint=node",
      "privateai-evaluation:latest",
      "node_modules/vitest/vitest.mjs",
      "run",
      "tests/authenticated-ingress.test.ts",
      "--maxWorkers=1",
    ],
    { env, stdio: "inherit", windowsHide: true, timeout: 60000 },
  );
} finally {
  try {
    let label = "";
    try {
      label = execFileSync(
        "docker",
        [
          host,
          "inspect",
          "--format",
          '{{index .Config.Labels "privateai.purpose"}}',
          container,
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
        [host, "ps", "-aq", "--filter", `name=^${container}$`],
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
      execFileSync("docker", [host, "rm", "--force", container], {
        env,
        stdio: "ignore",
        windowsHide: true,
        timeout: 10000,
      });
  } finally {
    await tls.dispose();
  }
}
