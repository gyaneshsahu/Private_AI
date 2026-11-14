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
  // The owner-set automatic allowance is passed on as given.
  await writeFile(configFile, JSON.stringify({ ...config, inference: { ...inference, allowance: { requestLimit: 100, days: 7 } } }));
  expect((await loadDeploymentConfig(configFile)).inference).toMatchObject({ allowance: { requestLimit: 100, days: 7 } });
  // The optional search key is read and trimmed like the API key; absent means no search.
  const searchKeyFile = await file("search-key", "SYNTHETIC_SEARCH_KEY\n");
  await writeFile(configFile, JSON.stringify({ ...config, inference: { ...inference, searchKeyFile } }));
  expect((await loadDeploymentConfig(configFile)).inference).toMatchObject({ searchKey: "SYNTHETIC_SEARCH_KEY" });
  // The notice file is passed on as a path (re-read while running), so it may not exist yet.
  const noticeFile = join(root, "notice.txt");
  await writeFile(configFile, JSON.stringify({ ...config, inference: { ...inference, noticeFile } }));
  expect((await loadDeploymentConfig(configFile)).inference).toMatchObject({ noticeFile });
  // Voice input has its own switch: absent or disabled means off; enabled passes the two limits on.
  const voice = { enabled: true, maxSeconds: 120, dailyMinutes: 10 };
  await writeFile(configFile, JSON.stringify({ ...config, inference: { ...inference, voice: { ...voice, enabled: false } } }));
  expect((await loadDeploymentConfig(configFile)).inference).not.toHaveProperty("voice");
  await writeFile(configFile, JSON.stringify({ ...config, inference: { ...inference, voice } }));
  expect((await loadDeploymentConfig(configFile)).inference).toMatchObject({ voice: { maxSeconds: 120, dailyMinutes: 10 } });
  // Image questions have their own switch too: absent or disabled means off; enabled passes the two limits on.
  const images = { enabled: true, maxBytes: 280000, dailyImages: 10 };
  await writeFile(configFile, JSON.stringify({ ...config, inference: { ...inference, images: { ...images, enabled: false } } }));
  expect((await loadDeploymentConfig(configFile)).inference).not.toHaveProperty("images");
  await writeFile(configFile, JSON.stringify({ ...config, inference: { ...inference, images } }));
  expect((await loadDeploymentConfig(configFile)).inference).toMatchObject({ images: { maxBytes: 280000, dailyImages: 10 } });
  // Relative paths, unknown fields, a bad allowance, bad voice limits and an unreadable report refuse the whole configuration.
  // Code execution has its own switch too: absent or disabled means off.
  expect((await loadDeploymentConfig(configFile)).inference).not.toHaveProperty("code");
  await writeFile(configFile, JSON.stringify({ ...config, inference: { ...inference, code: { enabled: false } } }));
  expect((await loadDeploymentConfig(configFile)).inference).not.toHaveProperty("code");
  await writeFile(configFile, JSON.stringify({ ...config, inference: { ...inference, code: { enabled: true } } }));
  expect((await loadDeploymentConfig(configFile)).inference).toMatchObject({ code: true });
  // Relative paths, unknown fields, a bad allowance, bad voice limits and an unreadable report refuse the whole configuration.
  for (const bad of [
    { ...inference, images: { enabled: true } },
    // Above 290,000 bytes the encrypted body could pass the bridge's 1 MiB limit.
    { ...inference, images: { ...images, maxBytes: 290001 } },
    { ...inference, images: { ...images, dailyImages: 0 } },
    { ...inference, images: { ...images, model: "glm-5.3-flash" } },
    { ...inference, code: true },
    { ...inference, code: { enabled: true, rounds: 5 } },
    { ...inference, voice: { enabled: true } },
    { ...inference, voice: { ...voice, maxSeconds: 3600 } },
    { ...inference, voice: { ...voice, dailyMinutes: 0 } },
    { ...inference, voice: { ...voice, model: "whisper-large-v3" } },
    { ...inference, stopFile: "chat-stopped" },
    { ...inference, extra: true },
    { ...inference, allowance: { requestLimit: 0, days: 7 } },
    { ...inference, allowance: { requestLimit: 100, days: 90 } },
    { ...inference, allowance: { requestLimit: 100 } },
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
