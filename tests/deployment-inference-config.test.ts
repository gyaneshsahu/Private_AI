import { afterEach, expect, it } from "vitest";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
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
  // Voice input has its own switch: absent or disabled means off; enabled passes the three limits on.
  const voice = { enabled: true, chunkSeconds: 30, maxTurnSeconds: 180, dailyUnits: 150 };
  await writeFile(configFile, JSON.stringify({ ...config, inference: { ...inference, voice: { ...voice, enabled: false } } }));
  expect((await loadDeploymentConfig(configFile)).inference).not.toHaveProperty("voice");
  await writeFile(configFile, JSON.stringify({ ...config, inference: { ...inference, voice } }));
  expect((await loadDeploymentConfig(configFile)).inference?.voice).toEqual({ chunkSeconds: 30, maxTurnSeconds: 180, dailyUnits: 150 });
  // The 14 November shape is still read, translated: 120 s turns in 30 s chunks, 10 minutes = 300 units.
  await writeFile(configFile, JSON.stringify({ ...config, inference: { ...inference, voice: { enabled: true, maxSeconds: 120, dailyMinutes: 10 } } }));
  expect((await loadDeploymentConfig(configFile)).inference?.voice).toEqual({ chunkSeconds: 30, maxTurnSeconds: 120, dailyUnits: 300 });
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
  // Deep research has its own switch too: absent or disabled means off; enabled passes its cost, caps and optional account list on.
  const research = { enabled: true, cost: 15, dailyRuns: 3, dailySearches: 24 };
  await writeFile(configFile, JSON.stringify({ ...config, inference: { ...inference, research: { ...research, enabled: false } } }));
  expect((await loadDeploymentConfig(configFile)).inference).not.toHaveProperty("research");
  await writeFile(configFile, JSON.stringify({ ...config, inference: { ...inference, research } }));
  expect((await loadDeploymentConfig(configFile)).inference?.research).toEqual({ cost: 15, dailyRuns: 3, dailySearches: 24 });
  await writeFile(configFile, JSON.stringify({ ...config, inference: { ...inference, research: { ...research, allowedEmails: ["premium@example.test"] } } }));
  expect((await loadDeploymentConfig(configFile)).inference?.research).toMatchObject({ allowedEmails: ["premium@example.test"] });
  // Usage metering has its own switch: off by default; on, the plan (default alpha) replaces the allowance and the daily limits.
  await writeFile(configFile, JSON.stringify({ ...config, inference: { ...inference, metering: { enabled: false } } }));
  expect((await loadDeploymentConfig(configFile)).inference).not.toHaveProperty("metering");
  await writeFile(
    configFile,
    JSON.stringify({ ...config, inference: { ...inference, allowance: { requestLimit: 999, days: 3 }, research: { ...research, dailyRuns: 9 }, metering: { enabled: true } } }),
  );
  expect((await loadDeploymentConfig(configFile)).inference).toMatchObject({
    metering: { plan: "alpha" },
    allowance: { requestLimit: 150, days: 7, dailyLimit: 40 },
    research: { cost: 15, dailyRuns: 3, dailySearches: 24 },
  });
  // Voice under the alpha plan: 2 minutes = 60 units while tokens are short (owner, 15 November).
  // A weights version can be pinned; absent, the newest in force charges (no field passed on).
  await writeFile(configFile, JSON.stringify({ ...config, inference: { ...inference, voice, metering: { enabled: true } } }));
  const metered = (await loadDeploymentConfig(configFile)).inference;
  expect(metered?.voice).toEqual({ chunkSeconds: 30, maxTurnSeconds: 180, dailyUnits: 60 });
  expect(metered?.metering).toEqual({ plan: "alpha" });
  await writeFile(configFile, JSON.stringify({ ...config, inference: { ...inference, metering: { enabled: true, weightsVersion: 1 } } }));
  expect((await loadDeploymentConfig(configFile)).inference?.metering).toEqual({ plan: "alpha", weightsVersion: 1 });
  // Off with a pin: nothing changes, as off always does.
  await writeFile(configFile, JSON.stringify({ ...config, inference: { ...inference, voice, metering: { enabled: false, weightsVersion: 1 } } }));
  const off = (await loadDeploymentConfig(configFile)).inference;
  expect(off).not.toHaveProperty("metering");
  expect(off?.voice).toEqual({ chunkSeconds: 30, maxTurnSeconds: 180, dailyUnits: 150 });
  // Relative paths, unknown fields, a bad allowance, bad voice limits and an unreadable report refuse the whole configuration.
  for (const bad of [
    { ...inference, metering: { enabled: true, plan: "gold" } },
    { ...inference, metering: true },
    { ...inference, metering: { enabled: true, weightsVersion: 99 } },
    { ...inference, metering: { enabled: true, weightsVersion: 1.5 } },
    { ...inference, research: { enabled: true } },
    // A run is two charges of 1 to 10 units: 21 cannot be split.
    { ...inference, research: { ...research, cost: 21 } },
    { ...inference, research: { ...research, cost: 1 } },
    { ...inference, research: { ...research, dailyRuns: 0 } },
    { ...inference, research: { ...research, allowedEmails: [] } },
    { ...inference, research: { ...research, pages: 50 } },
    { ...inference, images: { enabled: true } },
    // Above 290,000 bytes the encrypted body could pass the bridge's 1 MiB limit.
    { ...inference, images: { ...images, maxBytes: 290001 } },
    { ...inference, images: { ...images, dailyImages: 0 } },
    { ...inference, images: { ...images, model: "glm-5.3-flash" } },
    { ...inference, code: true },
    { ...inference, code: { enabled: true, rounds: 5 } },
    { ...inference, voice: { enabled: true } },
    { ...inference, voice: { ...voice, chunkSeconds: 60 } },
    { ...inference, voice: { ...voice, chunkSeconds: 5 } },
    { ...inference, voice: { ...voice, maxTurnSeconds: 600 } },
    { ...inference, voice: { ...voice, dailyUnits: 0 } },
    { ...inference, voice: { ...voice, maxSeconds: 120 } }, // old and new fields mixed
    { ...inference, voice: { enabled: true, maxSeconds: 3600, dailyMinutes: 10 } },
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
  // Background tasks: their own switch, off unless enabled; a Privatemode report and a valid key file.
  const keyFile = await file("background-keys", `k2:${Buffer.alloc(32, 2).toString("base64")}\nk1:${Buffer.alloc(32, 1).toString("base64")}\n`);
  const backgroundTasks = { enabled: true, maxAutoTasks: 3, keyFile };
  await writeFile(configFile, JSON.stringify({ ...config, inference: { ...privatemode, manifestFile, backgroundTasks: { ...backgroundTasks, enabled: false } } }));
  expect((await loadDeploymentConfig(configFile)).inference).not.toHaveProperty("backgroundTasks");
  await writeFile(configFile, JSON.stringify({ ...config, inference: { ...privatemode, manifestFile, backgroundTasks: { ...backgroundTasks, runHourUtcWindow: { from: 22, to: 6 } } } }));
  const loaded = (await loadDeploymentConfig(configFile)).inference?.backgroundTasks;
  expect(loaded).toMatchObject({ maxAutoTasks: 3, runHourUtcWindow: { from: 22, to: 6 } });
  expect(loaded?.keys.current).toBe("k2");
  expect([...(loaded?.keys.keys.keys() ?? [])]).toEqual(["k2", "k1"]);
  for (const bad of [
    { ...inference, backgroundTasks }, // a Tinfoil report: the server client is Privatemode only
    { ...privatemode, manifestFile, backgroundTasks: { ...backgroundTasks, maxAutoTasks: 4 } },
    { ...privatemode, manifestFile, backgroundTasks: { ...backgroundTasks, maxAutoTasks: 0 } },
    { ...privatemode, manifestFile, backgroundTasks: { ...backgroundTasks, keyFile: "keys" } },
    { ...privatemode, manifestFile, backgroundTasks: { ...backgroundTasks, keyFile: await file("short-key", "k1:c2hvcnQ=") } },
    { ...privatemode, manifestFile, backgroundTasks: { ...backgroundTasks, runHourUtcWindow: { from: 3, to: 3 } } },
    { ...privatemode, manifestFile, backgroundTasks: { ...backgroundTasks, extra: true } },
    { ...privatemode, manifestFile, backgroundTasks: { enabled: true, maxAutoTasks: 3 } },
  ]) {
    await writeFile(configFile, JSON.stringify({ ...config, inference: bad }));
    await expect(loadDeploymentConfig(configFile)).rejects.toThrow("Deployment configuration unavailable or invalid.");
  }
  // Vault sync: its own switch, off when absent or disabled; strict bounds.
  await writeFile(configFile, JSON.stringify({ ...config, inference }));
  expect((await loadDeploymentConfig(configFile)).inference).not.toHaveProperty("vaultSync");
  const vaultSync = { enabled: true, quotaMb: 200, maxDevices: 5 };
  await writeFile(configFile, JSON.stringify({ ...config, inference: { ...inference, vaultSync: { ...vaultSync, enabled: false } } }));
  expect((await loadDeploymentConfig(configFile)).inference).not.toHaveProperty("vaultSync");
  await writeFile(configFile, JSON.stringify({ ...config, inference: { ...inference, vaultSync } }));
  expect((await loadDeploymentConfig(configFile)).inference?.vaultSync).toEqual({ quotaBytes: 200 * 1024 * 1024, maxDevices: 5 });
  for (const bad of [
    { ...vaultSync, quotaMb: 9 },
    { ...vaultSync, quotaMb: 2001 },
    { ...vaultSync, maxDevices: 0 },
    { ...vaultSync, maxDevices: 11 },
    { ...vaultSync, quotaMb: 1.5 },
    { ...vaultSync, extra: true },
    { enabled: true, quotaMb: 200 },
  ]) {
    await writeFile(configFile, JSON.stringify({ ...config, inference: { ...inference, vaultSync: bad } }));
    await expect(loadDeploymentConfig(configFile)).rejects.toThrow("Deployment configuration unavailable or invalid.");
  }
  // Closed-account purge: its own switch, off when absent or disabled; 30 days by default; 7 to 365.
  const withPurge = (accountPurge: unknown) => writeFile(configFile, JSON.stringify({ ...config, inference: { ...inference, accountPurge } }));
  await writeFile(configFile, JSON.stringify({ ...config, inference }));
  expect((await loadDeploymentConfig(configFile)).inference).not.toHaveProperty("accountPurge");
  await withPurge({ enabled: false, graceDays: 30 });
  expect((await loadDeploymentConfig(configFile)).inference).not.toHaveProperty("accountPurge");
  await withPurge({ enabled: true });
  expect((await loadDeploymentConfig(configFile)).inference?.accountPurge).toEqual({ graceDays: 30 });
  await withPurge({ enabled: true, graceDays: 7 });
  expect((await loadDeploymentConfig(configFile)).inference?.accountPurge).toEqual({ graceDays: 7 });
  for (const bad of [{ enabled: true, graceDays: 6 }, { enabled: true, graceDays: 366 }, { enabled: true, graceDays: 7.5 }, { enabled: true, extra: 1 }, { graceDays: 30 }]) {
    await withPurge(bad);
    await expect(loadDeploymentConfig(configFile)).rejects.toThrow("Deployment configuration unavailable or invalid.");
  }
  // Secure mode: its own switch, off when absent or disabled; defaults 200 MB and 1024 MB; strict
  // bounds; the master key only from the environment (the strict schema refuses it in the file).
  const custodyBefore = process.env.PRIVATEAI_CUSTODY_KEY;
  try {
    const custodyKey = randomBytes(32).toString("base64");
    process.env.PRIVATEAI_CUSTODY_KEY = custodyKey;
    const withSecure = (secureStore: unknown) => writeFile(configFile, JSON.stringify({ ...config, inference: { ...inference, secureStore } }));
    await writeFile(configFile, JSON.stringify({ ...config, inference }));
    expect((await loadDeploymentConfig(configFile)).inference).not.toHaveProperty("secureStore");
    await withSecure({ enabled: false });
    expect((await loadDeploymentConfig(configFile)).inference).not.toHaveProperty("secureStore");
    await withSecure({ enabled: true });
    const secure = (await loadDeploymentConfig(configFile)).inference?.secureStore;
    expect(secure).toMatchObject({ quotaBytes: 200 * 1024 * 1024, filesQuotaBytes: 1024 * 1024 * 1024 });
    expect(secure?.master.key.toString("base64")).toBe(custodyKey);
    expect(secure?.master.id).toMatch(/^[0-9a-f]{16}$/);
    await withSecure({ enabled: true, quotaMb: 10, filesQuotaMb: 10240 });
    expect((await loadDeploymentConfig(configFile)).inference?.secureStore).toMatchObject({ quotaBytes: 10 * 1024 * 1024, filesQuotaBytes: 10240 * 1024 * 1024 });
    for (const bad of [
      { enabled: true, quotaMb: 9 },
      { enabled: true, quotaMb: 2001 },
      { enabled: true, quotaMb: 1.5 },
      { enabled: true, filesQuotaMb: 9 },
      { enabled: true, filesQuotaMb: 10241 },
      { enabled: true, masterKey: custodyKey },
      { enabled: true, extra: true },
      { quotaMb: 200 },
    ]) {
      await withSecure(bad);
      await expect(loadDeploymentConfig(configFile)).rejects.toThrow("Deployment configuration unavailable or invalid.");
    }
    // Switched on without a usable master key: the start stops.
    for (const key of [undefined, "", "c2hvcnQ=", randomBytes(32).toString("hex")]) {
      if (key === undefined) delete process.env.PRIVATEAI_CUSTODY_KEY;
      else process.env.PRIVATEAI_CUSTODY_KEY = key;
      await withSecure({ enabled: true });
      await expect(loadDeploymentConfig(configFile)).rejects.toThrow("Deployment configuration unavailable or invalid.");
      // Switched off, the key is not needed.
      await withSecure({ enabled: false });
      expect((await loadDeploymentConfig(configFile)).inference).not.toHaveProperty("secureStore");
    }
  } finally {
    if (custodyBefore === undefined) delete process.env.PRIVATEAI_CUSTODY_KEY;
    else process.env.PRIVATEAI_CUSTODY_KEY = custodyBefore;
  }
  // Stage 3, project files as blobs: absent means off; defaults 1024 MB and 10 MB; S3 keys only from the environment.
  const withBlobs = (blobs: unknown) => writeFile(configFile, JSON.stringify({ ...config, inference: { ...inference, vaultSync: { ...vaultSync, blobs } } }));
  await withBlobs({ store: "postgres" });
  expect((await loadDeploymentConfig(configFile)).inference?.vaultSync).toEqual({
    quotaBytes: 200 * 1024 * 1024,
    maxDevices: 5,
    blobs: { quotaBytes: 1024 * 1024 * 1024, maxFileBytes: 10 * 1024 * 1024 },
  });
  const s3 = { endpoint: "https://fsn1.your-objectstorage.com", region: "fsn1", bucket: "cometrow-files" };
  const keys = ["PRIVATEAI_BLOB_S3_ACCESS_KEY_ID", "PRIVATEAI_BLOB_S3_SECRET_ACCESS_KEY"] as const;
  const saved = keys.map((name) => process.env[name]);
  try {
    for (const name of keys) delete process.env[name];
    await withBlobs({ store: "s3", quotaMb: 2048, maxFileMb: 25, s3 });
    await expect(loadDeploymentConfig(configFile)).rejects.toThrow("Deployment configuration unavailable or invalid.");
    process.env.PRIVATEAI_BLOB_S3_ACCESS_KEY_ID = "SYNTHETIC-ACCESS-KEY";
    await expect(loadDeploymentConfig(configFile)).rejects.toThrow("Deployment configuration unavailable or invalid.");
    process.env.PRIVATEAI_BLOB_S3_SECRET_ACCESS_KEY = "synthetic-secret";
    expect((await loadDeploymentConfig(configFile)).inference?.vaultSync?.blobs).toEqual({
      quotaBytes: 2048 * 1024 * 1024,
      maxFileBytes: 25 * 1024 * 1024,
      s3: { ...s3, accessKeyId: "SYNTHETIC-ACCESS-KEY", secretAccessKey: "synthetic-secret" },
    });
  } finally {
    keys.forEach((name, i) => (saved[i] === undefined ? delete process.env[name] : (process.env[name] = saved[i])));
  }
  for (const bad of [
    { store: "disk" },
    { store: "s3" }, // s3 without its settings
    { store: "postgres", s3 }, // s3 settings with postgres
    { store: "postgres", quotaMb: 9 },
    { store: "postgres", maxFileMb: 26 },
    { store: "postgres", maxFileMb: 0 },
    { store: "s3", s3: { ...s3, endpoint: "http://fsn1.your-objectstorage.com" } },
    { store: "s3", s3: { ...s3, bucket: "Bad_Bucket" } },
    { store: "s3", s3: { ...s3, accessKeyId: "in-the-file", secretAccessKey: "in-the-file" } }, // keys never in the file
    { store: "postgres", extra: true },
  ]) {
    await withBlobs(bad);
    await expect(loadDeploymentConfig(configFile)).rejects.toThrow("Deployment configuration unavailable or invalid.");
  }
  // The live manifest has its own switch: absent or false means off; Privatemode only.
  // (The loop above left a refused file behind: start again from a valid one.)
  await writeFile(configFile, JSON.stringify({ ...config, inference: { ...privatemode, manifestFile } }));
  expect((await loadDeploymentConfig(configFile)).inference).not.toHaveProperty("liveManifest");
  await writeFile(configFile, JSON.stringify({ ...config, inference: { ...privatemode, manifestFile, liveManifest: false } }));
  expect((await loadDeploymentConfig(configFile)).inference).not.toHaveProperty("liveManifest");
  await writeFile(configFile, JSON.stringify({ ...config, inference: { ...privatemode, manifestFile, liveManifest: true } }));
  expect((await loadDeploymentConfig(configFile)).inference).toMatchObject({ liveManifest: true });
  for (const bad of [
    { ...config, inference: { ...inference, liveManifest: true } }, // live manifest with a Tinfoil report
    { ...config, inference: { ...privatemode, manifestFile, liveManifest: "yes" } },
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

// The owner's live test switches every feature on (docs/owner-live-test-setup-20261118.md): the example file must
// load exactly as written, with each secret path swapped for a synthetic file, so no key name or bound is wrong.
it("loads deployment/render-config.owner-test.example.json with everything on, image creation included", async () => {
  const root = await mkdtemp(join(tmpdir(), "privateai-owner-test-config-"));
  roots.push(root);
  const example = JSON.parse(await readFile(join(__dirname, "..", "deployment", "render-config.owner-test.example.json"), "utf8"));
  const contents: Record<string, string> = {
    "auth-secret": "synthetic-auth-secret-".repeat(3),
    "database-url": "postgresql://synthetic:synthetic@db.example.test/test",
    "qualification-privatemode.json": JSON.stringify({ provider: "privatemode" }),
    "google-social.json": JSON.stringify({ google: { clientId: "synthetic.apps.googleusercontent.com", clientSecret: "synthetic-secret" } }),
    "background-tasks.key": `k1:${Buffer.alloc(32, 1).toString("base64")}\n`,
    "image-api.key": "SYNTHETIC_IMAGE_KEY\n",
  };
  // Every /etc/secrets path becomes a file in the temporary folder; /app/dist becomes the folder.
  const swap = async (value: unknown): Promise<unknown> => {
    if (typeof value === "string" && value.startsWith("/etc/secrets/")) {
      const name = value.slice("/etc/secrets/".length);
      const path = join(root, name);
      await writeFile(path, contents[name] ?? "synthetic");
      return path;
    }
    if (value === "/app/dist") return root;
    if (typeof value === "string" && value.startsWith("/tmp/")) return join(root, value.slice(5));
    if (Array.isArray(value)) return Promise.all(value.map(swap));
    if (value && typeof value === "object")
      return Object.fromEntries(await Promise.all(Object.entries(value).map(async ([k, v]) => [k, await swap(v)])));
    return value;
  };
  const configFile = join(root, "render-config.json");
  await writeFile(configFile, JSON.stringify(await swap(example)));
  const before = process.env.PRIVATEAI_CUSTODY_KEY;
  process.env.PRIVATEAI_CUSTODY_KEY = Buffer.alloc(32, 7).toString("base64");
  try {
    const loaded = await loadDeploymentConfig(configFile);
    expect(loaded.social).toBeDefined();
    expect(loaded.inference).toMatchObject({
      apiKey: "synthetic",
      searchKey: "synthetic",
      // The owner's test runs on the premium plan (decision D6): 60 web searches a day.
      metering: { plan: "premium" },
      imageCreation: { apiKey: "SYNTHETIC_IMAGE_KEY", model: "flux-2-klein", dailyImages: 3 },
      code: true,
      research: { cost: 15 },
      voice: { chunkSeconds: 30 },
      images: { maxBytes: 280000 },
    });
    for (const key of ["secureStore", "vaultSync", "backgroundTasks", "providerManifest", "allowance"])
      expect(loaded.inference).toHaveProperty(key);
    // Image creation: disabled means off and the key file is not needed; an unpriced model refuses the file.
    const parsed = JSON.parse(await readFile(configFile, "utf8"));
    await writeFile(configFile, JSON.stringify({ ...parsed, inference: { ...parsed.inference, imageCreation: { ...parsed.inference.imageCreation, enabled: false } } }));
    expect((await loadDeploymentConfig(configFile)).inference).not.toHaveProperty("imageCreation");
    await writeFile(configFile, JSON.stringify({ ...parsed, inference: { ...parsed.inference, imageCreation: { ...parsed.inference.imageCreation, model: "dall-e" } } }));
    await expect(loadDeploymentConfig(configFile)).rejects.toThrow("Deployment configuration unavailable or invalid.");
    // The Render bridge's visitor-address header: absent by default, one of two names, nothing else.
    await writeFile(configFile, JSON.stringify(parsed));
    expect((await loadDeploymentConfig(configFile)).renderBridge?.clientIpHeader).toBeUndefined();
    await writeFile(configFile, JSON.stringify({ ...parsed, renderBridge: { ...parsed.renderBridge, clientIpHeader: "cf-connecting-ip" } }));
    expect((await loadDeploymentConfig(configFile)).renderBridge?.clientIpHeader).toBe("cf-connecting-ip");
    await writeFile(configFile, JSON.stringify({ ...parsed, renderBridge: { ...parsed.renderBridge, clientIpHeader: "x-forwarded-for" } }));
    await expect(loadDeploymentConfig(configFile)).rejects.toThrow("Deployment configuration unavailable or invalid.");
    // The allowlist holds up to 30 addresses (owner test plus 10 to 20 invitees); 31 refuse.
    const emails = (n: number) => Array.from({ length: n }, (_, i) => `person${i}@example.test`);
    await writeFile(configFile, JSON.stringify({ ...parsed, allowedEmails: emails(30) }));
    expect((await loadDeploymentConfig(configFile)).allowedEmails).toHaveLength(30);
    await writeFile(configFile, JSON.stringify({ ...parsed, allowedEmails: emails(31) }));
    await expect(loadDeploymentConfig(configFile)).rejects.toThrow("Deployment configuration unavailable or invalid.");
  } finally {
    if (before === undefined) delete process.env.PRIVATEAI_CUSTODY_KEY;
    else process.env.PRIVATEAI_CUSTODY_KEY = before;
  }
});
