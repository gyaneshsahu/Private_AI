import { afterEach, expect, it } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadDeploymentConfig } from "../server/deployment-config";
const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true });
});
it("loads social credentials only from an explicitly supplied server secret file and fails closed on invalid input", async () => {
  const root = await mkdtemp(join(tmpdir(), "privateai-social-config-"));
  roots.push(root);
  const file = async (name: string, content: string) => {
    const path = join(root, name);
    await writeFile(path, content);
    return path;
  };
  const config = {
    mode: "restricted-deployment",
    email: "disabled",
    host: "127.0.0.1",
    port: 8443,
    assets: root,
    secretFile: await file("secret", "synthetic-auth-secret-".repeat(3)),
    databaseUrlFile: await file(
      "db",
      "postgresql://synthetic:synthetic@localhost/test",
    ),
    tlsKeyFile: await file("tls-key", "synthetic"),
    tlsCertFile: await file("cert", "synthetic"),
    clientCaFile: await file("ca", "synthetic"),
    peerCertificateSha256: ["a".repeat(64)],
  };
  const configFile = await file("config", JSON.stringify(config));
  expect((await loadDeploymentConfig(configFile)).social).toBeUndefined();
  const credentials = {
    google: {
      clientId: "synthetic.apps.googleusercontent.com",
      clientSecret: "SYNTHETIC-not-a-real-secret",
    },
  };
  const socialCredentialsFile = await file(
    "social",
    JSON.stringify(credentials),
  );
  await writeFile(
    configFile,
    JSON.stringify({ ...config, socialCredentialsFile }),
  );
  expect((await loadDeploymentConfig(configFile)).social).toEqual(credentials);
  for (const invalid of [
    {},
    { ...credentials, unexpected: "SENSITIVE-CANARY" },
    { google: { clientId: "invalid", clientSecret: "SENSITIVE-CANARY" } },
  ]) {
    await writeFile(socialCredentialsFile, JSON.stringify(invalid));
    await expect(loadDeploymentConfig(configFile)).rejects.toThrow(
      /^Deployment configuration unavailable or invalid\.$/,
    );
  }
  await writeFile(
    configFile,
    JSON.stringify({ ...config, socialCredentialsFile: "relative.json" }),
  );
  await expect(loadDeploymentConfig(configFile)).rejects.toThrow(
    "Deployment configuration unavailable or invalid.",
  );
});
