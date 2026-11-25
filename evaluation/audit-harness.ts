// Audit harness (16 November): every screen of CometRow locally, every feature on (or none), the
// AI's answers faked, no request leaving localhost, dist/ untouched. See evaluation/README.md.
//   npx tsx evaluation/audit-harness.ts [--config on|off] [--out <folder>] [--browsers chromium,firefox,webkit]
//     [--widths 375,768,1280] [--lang en,de] [--steps <name,...>] [--serve] [--axe]
//   --axe: an axe-core accessibility check on every screenshot, into index.json and axe-summary.json.
//     axe-core is not a dependency yet: npm install --no-save axe-core@4.11.0 first.
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
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { resolve } from "node:path";
import express from "express";
import { build } from "vite";
import react from "@vitejs/plugin-react";
import { chromium, firefox, webkit } from "@playwright/test";
import { createApp } from "../server/app";
import { fakeCheckoutProvider, MemoryPlanStore } from "../server/plans";
import { mockImageProvider } from "../server/image-creation";
import { mockImageEditor } from "../server/image-edit";
import { MemoryShareStore } from "../server/share-links";
import { MemoryAnalyticsStore } from "../server/analytics";
import { MemoryFeedbackStore } from "../server/feedback";
import { MemoryBackgroundStore } from "../server/background-store";
import { ephemeralKeyRing } from "../server/background-crypto";
import { SqliteUsageRecords } from "../server/usage-records";
import { MemorySyncStore } from "../server/vault-sync";
import { MemoryBlobStore } from "../server/vault-sync-blobs";
import { MemorySecureStore } from "../server/secure-store";
import { ephemeralCustodyMaster } from "../server/custody";
import { AUDIT_ACCOUNT, createResponder, fakeStatus, type AuditConfig, type FakeReply } from "./audit-fakes";

/** Every build switch (grep import.meta.env.VITE_ in src). */
export const VITE_SWITCHES = [
  "VITE_GERMAN_UI", "VITE_READ_ALOUD", "VITE_PDF_EXPORT", "VITE_MEMORY", "VITE_CANVAS",
  "VITE_LIVE_VOICE", "VITE_PROJECTS", "VITE_SCHEDULED", "VITE_WHITEBOARD", "VITE_INSTALL_APP",
  "VITE_REPORT_CARD", "VITE_ANSWER_DESIGN",
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

export async function startServer(config: AuditConfig, client: string, fakesInServer = false, port = 0): Promise<{ origin: string; server: Server }> {
  const server = createServer();
  await new Promise<void>((ok) => server.listen(port, "127.0.0.1", ok));
  const address = server.address();
  if (!address || typeof address === "string") throw Error("No local port");
  // localhost, not 127.0.0.1: the account lab opens only on localhost (src/main.tsx).
  const origin = `http://localhost:${address.port}`;
  const on = config === "on";
  // The option blocks of server/index.ts, each as its PRIVATEAI_*=1 switch sets it (on) or absent (off).
  const app = createApp({
    origin,
    dev: on,
    ...(on ? { providerDisclosureDraft: "privatemode" as const } : {}),
    ...(on ? { voice: { chunkSeconds: 30, maxTurnSeconds: 180, dailyUnits: 150 } } : {}),
    ...(on ? { images: { maxBytes: 280_000, dailyImages: 10 } } : {}),
    ...(on ? { code: true } : {}),
    ...(on ? { imageCreation: { provider: mockImageProvider(), dailyImages: 3 } } : {}),
    ...(on ? { imageEditing: { editor: mockImageEditor(), uploads: true } } : {}),
    ...(on ? { shareLinks: { store: new MemoryShareStore() } } : {}),
    ...(on ? { feedback: { store: new MemoryFeedbackStore(), ownerEmails: ["audit@example.test"] } } : {}),
    // The audit account is the owner here, so the tour reaches the owner's dashboard.
    ...(on ? { analytics: { store: new MemoryAnalyticsStore(), ownerEmails: ["audit@example.test"], retentionDays: 90, start: false } } : {}),
    ...(on ? { research: { cost: 15, dailyRuns: 3, dailySearches: 24 } } : {}),
    ...(on ? { plans: { store: new MemoryPlanStore(), provider: fakeCheckoutProvider() } } : {}),
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
  app.get(["/", "/s/:id"], (_req, res) => res.sendFile("index.html", { root: client }));
  // --serve: the fake answers come from this server, so a plain browser (no test script) gets a full app.
  const responder = fakesInServer ? createResponder() : undefined;
  const send = (res: import("node:http").ServerResponse, f: FakeReply) => {
    res.writeHead(f.status, { "content-type": f.contentType ?? "application/json", "cache-control": "no-store", ...f.headers });
    res.end(f.body ?? JSON.stringify(f.json));
  };
  const readJson = async (req: import("node:http").IncomingMessage) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : undefined;
  };
  server.on("request", async (req, res) => {
    const path = new URL(req.url ?? "/", origin).pathname;
    if (responder) {
      // Sign in or out as the synthetic test account (the same one the tour uses).
      if (path === "/__audit/sign-in" || path === "/__audit/sign-out") {
        res.writeHead(303, { location: "/", "set-cookie": `audit-account=${path.endsWith("in") ? AUDIT_ACCOUNT : ""}; Path=/; SameSite=Strict${path.endsWith("out") ? "; Max-Age=0" : ""}` });
        return void res.end();
      }
      if (path === "/__audit/reply") return send(res, await responder.reply(await readJson(req)));
      if (path === "/__audit/transcribe") return send(res, { status: 200, json: { text: "Synthetic dictated text for the audit" } });
      if (path.startsWith("/api/research/")) return send(res, responder.research(path, await readJson(req)));
      if (path === "/api/status" && req.method === "GET")
        // Own property: wins over Express's response prototype, so the real status gets the fake "ready" parts.
        (res as unknown as { json: (body: Record<string, unknown>) => unknown }).json = function (this: express.Response, body: Record<string, unknown>) {
          return express.response.json.call(this, fakeStatus(body, config));
        };
    }
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
  const serve = process.argv.includes("--serve");
  const { origin, server } = await startServer(config, client, serve, Number(arg("port", "0")));
  if (serve) {
    console.log(`
CometRow audit server (${config}) at ${origin}
  A plain browser works: fake answers, fake search and transcription come from this server; no request leaves the machine.
  Sign in as the synthetic test account: ${origin}/__audit/sign-in   (sign out: ${origin}/__audit/sign-out)
  Pick an answer: type audit:<name> in a message.
  Names: markdown code math table citations long slow error-429 error-500 error-503 dropped stop python image plain chart limit
  Account lab: ${origin}/?account-lab=1
  Ctrl+C stops.`);
    await new Promise(() => {});
  }
  const { runTour } = await import("./audit-tour");
  const engines = { chromium, firefox, webkit };
  const out = resolve(arg("out", `.local/audit/${config}`));
  await mkdir(out, { recursive: true });
  // Only this run's screenshots in the folder: a "-FAILED" picture is then always a failure of this run.
  for (const file of await readdir(out)) if (file.endsWith(".png")) await rm(`${out}/${file}`);
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
      ...(process.argv.includes("--axe") ? { axe: (await import("node:module")).createRequire(import.meta.url).resolve("axe-core/axe.min.js") } : {}),
    });
    if (process.argv.includes("--axe")) {
      // One line per rule: where it fails (screen, width, language) and how many elements.
      const rules: Record<string, { impact: string | null; screens: string[]; nodes: number; example: string }> = {};
      for (const e of result.entries)
        for (const v of e.axe ?? []) {
          const r = (rules[v.id] ??= { impact: v.impact, screens: [], nodes: 0, example: v.targets[0] ?? "" });
          r.screens.push(`${e.screen} ${e.lang} ${e.width}`);
          r.nodes += v.nodes;
        }
      await writeFile(`${out}/axe-summary.json`, JSON.stringify(rules, null, 2));
      console.log(`axe: ${Object.keys(rules).length} rules with violations, written ${out}/axe-summary.json`);
    }
    failures = result.hardFailures;
    await writeFile(`${out}/index.json`, JSON.stringify(result, null, 2));
    console.log(`written ${out}/index.json: ${result.entries.length} screenshots, ${result.failedSteps} failed steps, ${result.hardFailures} hard failures (non-local requests)`);
    if (result.skippedSteps.length) console.log(`skipped on purpose:\n${result.skippedSteps.map((s) => `  - ${s.what} (${s.where})`).join("\n")}`);
  } finally {
    server.close();
  }
  process.exit(failures ? 1 : 0);
}
