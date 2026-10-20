import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("keeps the explicit Render Dockerfile aligned with the tested candidate stages", () => {
  const base = readFileSync("Dockerfile", "utf8").replaceAll("\r\n", "\n");
  const render = readFileSync("Dockerfile.render", "utf8").replaceAll(
    "\r\n",
    "\n",
  );
  expect(render).toBe(
    base.split("\nFROM node:24-bookworm-slim AS runtime\n")[0] +
      '\nCMD ["/etc/secrets/render-config.json"]\n',
  );
  expect(render).toContain(
    'ENTRYPOINT ["node", "--import", "tsx", "server/render-entry.ts"]',
  );
  const ignored = new Set(readFileSync(".dockerignore", "utf8").split(/\r?\n/));
  for (const name of [
    "auth-secret",
    "database-url",
    "database-ca.pem",
    "server.key",
    "server.pem",
    "client-ca.pem",
    "bridge.key",
    "bridge.pem",
    "google-social.json",
    "render-config.json",
  ])
    expect(ignored.has(name), name).toBe(true);
});
