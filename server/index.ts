import { fakeCheckoutProvider, MemoryPlanStore } from "./plans";
import { bflImageProvider, mockImageProvider } from "./image-creation";
import { readFile } from "node:fs/promises";
import { createServer as createHttpsServer } from "node:https";
import { resolve } from "node:path";
import express from "express";
import { createApp, scheduleExpiryWarnings } from "./app";
import { openInviteRegistry } from "./registry-storage";
import { MemoryBackgroundStore } from "./background-store";
import { ephemeralKeyRing } from "./background-crypto";
import { scheduleManifestCheck } from "./manifest-watch";
import { SqliteUsageRecords } from "./usage-records";
import { MemorySyncStore } from "./vault-sync";
import { MemoryBlobStore } from "./vault-sync-blobs";
import { MemorySecureStore } from "./secure-store";
import { ephemeralCustodyMaster } from "./custody";
import { ACCOUNT_PURGE_DEFAULT_DAYS } from "./account-purge";
const port = Number(process.env.PORT ?? "4173");
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("Invalid PORT");
let qualification: unknown;
try {
  qualification = JSON.parse(
    await readFile(
      process.env.PRIVATEAI_QUALIFICATION_FILE ?? ".local/qualification.json",
      "utf8",
    ),
  );
} catch {
  /* Missing or malformed evidence keeps live inference disabled. */
}
// The report's provider picks the key; the other provider's key is never read (manual switch).
const provider = (qualification as { provider?: unknown } | undefined)?.provider;
const privatemode = provider === "privatemode";
const apiKey = privatemode ? process.env.PRIVATEMODE_API_KEY : process.env.TINFOIL_API_KEY;
// The approved Privatemode manifest (scripts/privatemode-manifest.ts writes it); its SHA-256
// must be in the report's releaseDigests or the relay refuses to serve it.
let providerManifest: Uint8Array | undefined;
if (privatemode)
  providerManifest = await readFile(
    process.env.PRIVATEAI_PROVIDER_MANIFEST_FILE ?? ".local/privatemode-manifest.json",
  ).catch(() => undefined);
const dev = process.argv.includes("--dev");
// Local TLS on loopback only: the Privatemode SDK always calls its base URL over HTTPS.
const localTLS = process.env.PRIVATEAI_LOCAL_TLS === "1";
const origin =
  process.env.PRIVATEAI_ORIGIN ?? (localTLS ? `https://localhost:${port}` : `http://127.0.0.1:${port}`);
const loopback = ["127.0.0.1", "localhost"].includes(new URL(origin).hostname);
if (localTLS && !loopback) throw new Error("Local TLS is for a loopback origin only.");
const hosted = origin.startsWith("https:") && !loopback;
if (hosted && dev) throw new Error("Development middleware cannot be hosted.");
if (qualification !== undefined) scheduleExpiryWarnings(qualification, (line) => console.warn(line));
// The manifest check and the live manifest on the development server: off unless "1" (one attestation per 6 hours).
if (process.env.PRIVATEAI_LIVE_MANIFEST === "1" && privatemode && apiKey)
  scheduleManifestCheck(qualification, apiKey, providerManifest, (line) => console.warn(line), { serveLive: true });
const app = createApp({
  origin,
  // Plans with the test checkout (docs/plans-20261125.md) on the development server: off unless "1". No money moves.
  ...(process.env.PRIVATEAI_PLANS === "1" ? { plans: { store: new MemoryPlanStore(), provider: fakeCheckoutProvider() } } : {}),
  accessKey: process.env.PRIVATEAI_ACCESS_KEY,
  // Local review of the draft health-consent step only; the production composition never sets it.
  providerDisclosureDraft: (["tinfoil", "privatemode"] as const).find(
    (p) => p === process.env.PRIVATEAI_PROVIDER_DISCLOSURE_DRAFT,
  ),
  invites: process.env.PRIVATEAI_INVITES_FILE
    ? openInviteRegistry(process.env.PRIVATEAI_INVITES_FILE, hosted)
    : undefined,
  dev,
  qualification,
  apiKey,
  providerManifest,
  cacheSaltSecret: process.env.PRIVATEAI_CACHE_SALT_SECRET,
  searchKey: process.env.BRAVE_SEARCH_API_KEY,
  // Voice input on the development server: off unless "1" (it also needs `speech` in the report).
  ...(process.env.PRIVATEAI_VOICE === "1" ? { voice: { chunkSeconds: 30, maxTurnSeconds: 180, dailyUnits: 150 } } : {}),
  // Image questions on the development server: off unless "1" (they also need `vision` in the report).
  ...(process.env.PRIVATEAI_IMAGES === "1" ? { images: { maxBytes: 280_000, dailyImages: 10 } } : {}),
  // Image creation (docs/image-creation-20261117.md): off unless "1". With IMAGE_API_KEY the Black
  // Forest Labs adapter (EU endpoint, IMAGE_MODEL, default flux-2-klein); without a key only on the
  // development server, with the mock provider. IMAGE_DAILY: images per account a day (default 3).
  ...(process.env.PRIVATEAI_IMAGE_CREATION === "1" && (process.env.IMAGE_API_KEY || dev)
    ? {
        imageCreation: {
          provider: process.env.IMAGE_API_KEY
            ? bflImageProvider({ apiKey: process.env.IMAGE_API_KEY, model: process.env.IMAGE_MODEL ?? "flux-2-klein" })
            : mockImageProvider(),
          dailyImages: Number(process.env.IMAGE_DAILY ?? 3),
        },
      }
    : {}),
  // Code execution on the device, on the development server: off unless "1".
  ...(process.env.PRIVATEAI_CODE === "1" ? { code: true } : {}),
  // Deep research on the development server: off unless "1" (it also needs the search key).
  ...(process.env.PRIVATEAI_RESEARCH === "1" ? { research: { cost: 15, dailyRuns: 3, dailySearches: 24 } } : {}),
  // Usage metering on the development server: off unless "1". Records in memory, gone at restart.
  ...(process.env.PRIVATEAI_METERING === "1"
    ? { metering: { plan: "alpha", records: new SqliteUsageRecords(":memory:") } }
    : {}),
  // Vault sync on the development server: off unless "1". Memory store, gone at restart.
  ...(process.env.PRIVATEAI_VAULT_SYNC === "1"
    ? {
        vaultSync: {
          quotaBytes: 200 * 1024 * 1024,
          maxDevices: 5,
          store: new MemorySyncStore(),
          // Project files as encrypted blobs (Stage 3): their own switch, memory store.
          ...(process.env.PRIVATEAI_VAULT_SYNC_FILES === "1"
            ? { blobs: { quotaBytes: 1024 * 1024 * 1024, maxFileBytes: 10 * 1024 * 1024, store: new MemoryBlobStore() } }
            : {}),
        },
      }
    : {}),
  // Secure mode on the development server: off unless "1". Memory store and a random master key, so
  // everything stored is gone at restart (docs/secure-store-20261116.md).
  ...(process.env.PRIVATEAI_SECURE_STORE === "1"
    ? {
        secureStore: {
          quotaBytes: 200 * 1024 * 1024,
          filesQuotaBytes: 1024 * 1024 * 1024,
          master: ephemeralCustodyMaster(),
          store: new MemorySecureStore(),
          blobs: new MemoryBlobStore(),
        },
      }
    : {}),
  // Closed-account purge on the development server: off unless "1". Status and deletion text only;
  // the development server has no account database, so no purge job runs (docs/account-purge-20261116.md).
  ...(process.env.PRIVATEAI_ACCOUNT_PURGE === "1" ? { accountPurge: { graceDays: ACCOUNT_PURGE_DEFAULT_DAYS } } : {}),
  // Brave Goggle for German-rules searches (docs/german-rules-20261113.md); off unless "1".
  searchGoggles: process.env.PRIVATEAI_SEARCH_GOGGLES === "1",
  // Background tasks on the development server: off unless "1". Memory store and a random key, so
  // every task and result is gone at restart (docs/background-tasks-20261115.md).
  ...(process.env.PRIVATEAI_BACKGROUND_TASKS === "1"
    ? {
        backgroundTasks: {
          maxAutoTasks: 3,
          store: new MemoryBackgroundStore(),
          keys: ephemeralKeyRing(),
          log: (line: string) => console.warn(line),
        },
      }
    : {}),
});
if (dev) {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(resolve("dist"), { index: false }));
  app.get("/", (_req, res) => {
    res.sendFile(resolve("dist/index.html"));
  });
}
const tls = localTLS ? await (await import("./local-tls")).localTLS() : undefined;
const listener = tls ? createHttpsServer({ key: tls.key, cert: tls.cert }, app) : app;
const server = listener.listen(port, hosted ? "0.0.0.0" : "127.0.0.1", () => {
  console.log(
    `CometRow ${hosted ? "restricted hosted evaluation" : "loopback"} listening on port ${port} (${origin}). No request content logging enabled.`,
  );
});

// A rolling replacement invalidates in-memory sessions and research approvals.
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, () => {
    server.close(() => void (tls?.dispose() ?? Promise.resolve()).finally(() => process.exit(0)));
    setTimeout(() => process.exit(1), 10000).unref();
  });
}
