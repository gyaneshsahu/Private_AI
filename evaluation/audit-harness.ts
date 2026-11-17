// Audit harness (16 November): every screen of CometRow locally, every feature on (or none), the
// AI's answers faked, no request leaving localhost, dist/ untouched. See evaluation/README.md.
//   npx tsx evaluation/audit-harness.ts [--config on|off] [--out <folder>] [--browsers chromium,firefox,webkit]
//     [--widths 375,768,1280] [--lang en,de] [--steps <name,...>] [--serve]
// 1. Builds the client into .local/audit-build/<config>/ with every VITE_ switch "1" (on) or none
//    (off), with src/inference.ts replaced by evaluation/audit-inference.ts and voice transcription
//    pointed at /__audit/transcribe (harness build only; the app's source is unchanged).
// 2. Composes the server in this process (createApp, like tests/secure-store-e2e-ui.test.ts) on a
//    free port with every development switch of server/index.ts on (on) or none (off), no keys,
//    no provider report. An `audit-account` cookie signs a synthetic account in (test-only, like
//    the `test-account` cookie of that test).
// 3. Tours every reachable screen (evaluation/audit-tour.ts) with the fakes of
//    evaluation/audit-fakes.ts and writes screenshots and index.json to --out.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { resolve } from "node:path";
import express from "express";
import { build } from "vite";
import react from "@vitejs/plugin-react";
import { chromium, firefox, webkit } from "@playwright/test";
import { createApp } from "../server/app";
import { mockImageProvider } from "../server/image-creation";
import { MemoryBackgroundStore } from "../server/background-store";
import { ephemeralKeyRing } from "../server/background-crypto";
import { SqliteUsageRecords } from "../server/usage-records";
import { MemorySyncStore } from "../server/vault-sync";
import { MemoryBlobStore } from "../server/vault-sync-blobs";
import { MemorySecureStore } from "../server/secure-store";
import { ephemeralCustodyMaster } from "../server/custody";
import { AUDIT_ACCOUNT, type AuditConfig } from "./audit-fakes";

/** Every build switch (grep import.meta.env.VITE_ in src). */
export const VITE_SWITCHES = [
  "VITE_GERMAN_UI", "VITE_READ_ALOUD", "VITE_PDF_EXPORT", "VITE_MEMORY", "VITE_CANVAS",
  "VITE_LIVE_VOICE", "VITE_PROJECTS", "VITE_SCHEDULED",
] as const;

export async function buildClient(config: AuditConfig): Promise<string> {
  const outDir = resolve(`.local/audit-build/${config}`);
  // Pyodide and OCR come from public/vendor (npm run assets, a local copy from node_modules).
  if (!existsSync("public/vendor/pyodide")) execFileSync(process.execPath, ["scripts/assets.mjs"], { stdio: "inherit" });
  for (const name of VITE_SWITCHES) {
    if (config === "on") process.env[name] = "1";
    else delete process.env[name];
  }
  const shim = await readFile("evaluation/audit-inference.ts", "utf8");
  await build({
    configFile: false,
    logLevel: "warn",
    plugins: [
      react(),
      {
        name: "audit-fakes",
        enforce: "pre",
        load(id) {
          if (id.replaceAll("\\", "/").endsWith("/src/inference.ts")) return shim;
        },
        transform(code, id) {
          if (!id.replaceAll("\\", "/").endsWith("/src/voice-input.ts")) return;
          return code.replace(
            "export async function transcribeRecording(",
            `export async function transcribeRecording(audio, _units, _status, signal) {
              const response = await fetch("/__audit/transcribe", { method: "POST", body: audio, signal });
              return (await response.json()).text;
            }
            export async function realTranscribeRecording(`,
          );
        },
      },
    ],
    // Same font rule as vite.config.ts (fonts stay files, so the CSP does not block KaTeX fonts).
    build: { outDir, emptyOutDir: true, sourcemap: false, chunkSizeWarningLimit: 100_000, assetsInlineLimit: (file) => (/\.(woff2?|ttf|otf|eot)$/i.test(file) ? false : undefined) },
    worker: { format: "es" },
  });
  return outDir;
}

export async function startServer(config: AuditConfig, client: string): Promise<{ origin: string; server: Server }> {
  const server = createServer();
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  const address = server.address();
  if (!address || typeof address === "string") throw Error("No local port");
  // localhost, not 127.0.0.1: the account lab opens only on localhost (src/main.tsx).
  const origin = `http://localhost:${address.port}`;
  const on = config === "on";
  // The option blocks of server/index.ts, each as its PRIVATEAI_*=1 switch sets it (on) or absent (off).
  const app = createApp({
    origin,
    dev: on,
    healthConsentDraft: on,
    ...(on ? { providerDisclosureDraft: "privatemode" as const } : {}),
    ...(on ? { voice: { chunkSeconds: 30, maxTurnSeconds: 180, dailyUnits: 150 } } : {}),
    ...(on ? { images: { maxBytes: 280_000, dailyImages: 10 } } : {}),
    ...(on ? { code: true } : {}),
    ...(on ? { imageCreation: { provider: mockImageProvider(), dailyImages: 3 } } : {}),
    ...(on ? { research: { cost: 15, dailyRuns: 3, dailySearches: 24 } } : {}),
    ...(on ? { metering: { plan: "alpha", records: new SqliteUsageRecords(":memory:") } } : {}),
    ...(on
      ? {
          vaultSync: {
            quotaBytes: 200 * 1024 * 1024,
            maxDevices: 5,
            store: new MemorySyncStore(),
            blobs: { quotaBytes: 1024 * 1024 * 1024, maxFileBytes: 10 * 1024 * 1024, store: new MemoryBlobStore() },
          },
        }
      : {}),
    ...(on
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
    searchGoggles: on,
    ...(on
      ? { backgroundTasks: { maxAutoTasks: 3, store: new MemoryBackgroundStore(), keys: ephemeralKeyRing(), log: (line: string) => console.warn(line) } }
      : {}),
  });
  // As server/index.ts without --dev; sendFile with a root, since this worktree sits under a dot folder.
  app.use(express.static(client, { index: false }));
  app.get("/", (_req, res) => res.sendFile("index.html", { root: client }));
  server.on("request", (req, res) => {
    const account = /(?:^|;\s*)audit-account=([a-f0-9-]{36})/.exec(req.headers.cookie ?? "")?.[1];
    if (account)
      (res as unknown as { locals: object }).locals = { accountId: account, accessEpoch: "audit", signedInAt: Date.now(), accountEmail: "audit@example.test" };
    app(req, res);
  });
  return { origin, server };
}

const arg = (name: string, fallback: string) =>
  process.argv.includes(`--${name}`) ? process.argv[process.argv.indexOf(`--${name}`) + 1] : fallback;

if (process.argv[1]?.replaceAll("\\", "/").endsWith("evaluation/audit-harness.ts")) {
  const config = arg("config", "on") as AuditConfig;
  if (!["on", "off"].includes(config)) throw Error("--config must be on or off");
  console.log(`Building the ${config} client into .local/audit-build/${config} ...`);
  const client = await buildClient(config);
  const { origin, server } = await startServer(config, client);
  if (process.argv.includes("--serve")) {
    console.log(`
CometRow audit server (${config}) at ${origin}
  Chat is ready only with the fakes installed: from your own Playwright script
    import { installFakes } from "./evaluation/audit-fakes";
    const fakes = await installFakes(context, { origin: "${origin}", config: "${config}" });
  Signed in: await context.addCookies([{ name: "audit-account", value: "${AUDIT_ACCOUNT}", url: "${origin}" }]);
  Pick an answer: type audit:<name> in a message, or fakes.answer("<name>") before sending.
  Names: markdown code math table citations long slow error-429 error-500 error-503 dropped stop python image plain
  Account lab: ${origin}/?account-lab=1   (fake /api/account/* and /api/auth/* yourself, see evaluation/audit-tour.ts)
  In a plain browser chat shows "unavailable" (no fake status). Ctrl+C stops.`);
    await new Promise(() => {});
  }
  const { runTour } = await import("./audit-tour");
  const engines = { chromium, firefox, webkit };
  const out = resolve(arg("out", `.local/audit/${config}`));
  await mkdir(out, { recursive: true });
  let failures = 0;
  try {
    const result = await runTour({
      origin,
      config,
      out,
      browsers: arg("browsers", "chromium").split(",").map((b) => [b, engines[b as keyof typeof engines]] as const),
      widths: arg("widths", "375,768,1280").split(",").map(Number),
      langs: arg("lang", "en,de").split(",") as ("en" | "de")[],
      ...(process.argv.includes("--steps") ? { only: arg("steps", "").split(",") } : {}),
    });
    failures = result.hardFailures;
    await writeFile(`${out}/index.json`, JSON.stringify(result, null, 2));
    console.log(`written ${out}/index.json: ${result.entries.length} screenshots, ${result.failedSteps} failed steps, ${result.hardFailures} hard failures (non-local requests)`);
  } finally {
    server.close();
  }
  process.exit(failures ? 1 : 0);
}
