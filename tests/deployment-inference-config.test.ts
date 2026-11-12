import { afterEach, expect, it } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadDeploymentConfig } from "../server/deployment-config";

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

it("loads production chat only when the inference section is present and enabled, and fails closed on bad input", async () => {
  const root = await mkdtemp(join(tmpdir(), "privateai-inference-config-"));
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
    databaseUrlFile: await file("db", "postgresql://synthetic:synthetic@localhost/test"),
    tlsKeyFile: await file("tls-key", "synthetic"),
    tlsCertFile: await file("cert", "synthetic"),
    clientCaFile: await file("ca", "synthetic"),
    peerCertificateSha256: ["a".repeat(64)],
  };
  const inference = {
    enabled: true,
    apiKeyFile: await file("api-key", "SYNTHETIC_KEY_NOT_REAL\n"),
    qualificationFile: await file("qualification.json", JSON.stringify({ provider: "tinfoil" })),
    stopFile: join(root, "chat-stopped"),
  };
  const configFile = await file("config", JSON.stringify(config));
  // Absent: as today, no chat.
  expect((await loadDeploymentConfig(configFile)).inference).toBeUndefined();
  // Present but disabled: no chat, and the key file is not read.
  await writeFile(configFile, JSON.stringify({ ...config, inference: { ...inference, enabled: false } }));
  expect((await loadDeploymentConfig(configFile)).inference).toBeUndefined();
  // Enabled: key trimmed, report parsed (validated later per request), stop file passed on.
  await writeFile(configFile, JSON.stringify({ ...config, inference }));
  expect((await loadDeploymentConfig(configFile)).inference).toEqual({
    apiKey: "SYNTHETIC_KEY_NOT_REAL",
    qualification: { provider: "tinfoil" },
    stopFile: inference.stopFile,
  });
  // Relative paths, unknown fields and an unreadable report refuse the whole configuration.
  for (const bad of [
    { ...inference, stopFile: "chat-stopped" },
    { ...inference, extra: true },
    { ...inference, qualificationFile: await file("broken.json", "{not json") },
  ]) {
    await writeFile(configFile, JSON.stringify({ ...config, inference: bad }));
    await expect(loadDeploymentConfig(configFile)).rejects.toThrow(
      "Deployment configuration unavailable or invalid.",
    );
  }
  // Privatemode: the approved manifest file is required, and only for a Privatemode report.
  const manifestFile = await file("manifest.json", '{"synthetic":"manifest"}');
  const privatemode = {
    ...inference,
    qualificationFile: await file("pm.json", JSON.stringify({ provider: "privatemode" })),
  };
  await writeFile(configFile, JSON.stringify({ ...config, inference: { ...privatemode, manifestFile } }));
  expect((await loadDeploymentConfig(configFile)).inference).toMatchObject({
    qualification: { provider: "privatemode" },
    providerManifest: new TextEncoder().encode('{"synthetic":"manifest"}'),
  });
  for (const bad of [
    { ...config, inference: privatemode }, // no manifest
    { ...config, inference: { ...inference, manifestFile } }, // manifest with a Tinfoil report
    {
      ...config,
      inference: { ...privatemode, manifestFile },
      attestationAudit: {
        enabled: true,
        origin: "https://inference.tinfoil.sh/",
        repository: "tinfoilsh/confidential-model-router",
        releaseDigests: ["a".repeat(64)],
      },
    }, // Tinfoil's release audit with a Privatemode report
  ]) {
    await writeFile(configFile, JSON.stringify(bad));
    await expect(loadDeploymentConfig(configFile)).rejects.toThrow("Deployment configuration unavailable or invalid.");
  }
});
