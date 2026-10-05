import { implementationIdentity } from "./implementation";
import { reviewResult } from "./review-result";
import { networkRoute, approvedLocalGet } from "./network-observation";
import type { Request as BrowserRequest } from "@playwright/test";
import {
  browserLaunchOptions,
  browserReady,
} from "../scripts/browser-runtime.mjs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { chromium } from "@playwright/test";
import { createServer } from "vite";
import {
  validateExperiment,
  expectedInvoice,
  experimentRequestLimit,
} from "./experiment";
import { experimentGateway } from "./experiment-gateway";
import { claimExperiment } from "./run-claim";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const customPermit = args.find((arg) => arg.startsWith("--permit="));
if (customPermit) args.splice(args.indexOf(customPermit), 1);
const permitFile = customPermit?.slice("--permit=".length);
if (
  (permitFile !== undefined && !/^[a-zA-Z0-9_-]+\.json$/.test(permitFile)) ||
  (args.length !== 1 &&
    !(args.length === 2 && args[1] === "--compatibility")) ||
  !["--check", "--run", "--diagnose"].includes(args[0])
) {
  console.error(
    "Use --check (offline), --diagnose (model requests blocked), or --run (approved synthetic experiment).",
  );
  process.exitCode = 1;
} else {
  await main(
    args[0] === "--run",
    args[0] === "--diagnose",
    args[1] === "--compatibility",
  ).catch(() => {
    console.error(
      "Experiment could not start/finish. Check the permit, browser setup and any local result file. No automatic retry. Never delete a consumed approval to rerun.",
    );
    process.exitCode = 1;
  });
}

async function main(run: boolean, diagnose: boolean, compatibility: boolean) {
  let permit;
  try {
    permit = validateExperiment(
      JSON.parse(
        await readFile(
          resolve(
            root,
            permitFile
              ? `.local/${permitFile}`
              : compatibility
                ? ".local/compatibility.json"
                : ".local/experiment.json",
          ),
          "utf8",
        ),
      ),
    );
    if (compatibility !== (permit.scenario === "adapter_compatibility"))
      throw new Error("Wrong scenario");
  } catch {
    console.log(
      JSON.stringify({
        ready: false,
        missing: compatibility
          ? "A separately confirmed compatibility permit at .local/compatibility.json"
          : "A valid, reviewed experiment permit at .local/experiment.json",
        qualification: "NOT_PASSED",
        networkRequests: 0,
      }),
    );
    process.exitCode = 1;
    return;
  }
  const proxy = [
    "HTTPS_PROXY",
    "HTTP_PROXY",
    "https_proxy",
    "http_proxy",
    "ALL_PROXY",
    "all_proxy",
  ].some((key) => process.env[key]);
  const apiKey = process.env.TINFOIL_API_KEY;
  const prerequisites = {
    node24: process.versions.node.startsWith("24."),
    browser: await browserReady(),
    apiKeyPresent: !!apiKey,
    suitableLocalNetwork: !proxy,
  };
  if (!run && !diagnose) {
    console.log(
      JSON.stringify(
        {
          prerequisites,
          requestLimit: experimentRequestLimit(permit),
          approvalId: permit.approvalId,
          approvedCapUSD: permit.approvedCapUSD,
          note: "Permit fields record reviewed decisions; they do not independently prove spending limits or authorize a new charge.",
          networkRequests: 0,
        },
        null,
        2,
      ),
    );
    if (Object.values(prerequisites).some((value) => !value))
      process.exitCode = 1;
    return;
  }
  if (
    !prerequisites.node24 ||
    !prerequisites.browser ||
    !prerequisites.suitableLocalNetwork ||
    (!diagnose && !prerequisites.apiKeyPresent)
  )
    throw new Error("Missing prerequisites");
  const runs = resolve(root, ".local/experiment-runs");
  const runDir = diagnose
    ? resolve(root, `.local/diagnostic-${Date.now()}`)
    : await claimExperiment(runs, permit.approvalId);
  if (diagnose) await mkdir(runDir, { mode: 0o700 });
  await writeFile(
    resolve(runDir, "permit.json"),
    JSON.stringify(permit, null, 2),
    { flag: "wx", mode: 0o600 },
  );
  const csrf = randomBytes(32).toString("hex");
  const config = {
    origin: "http://127.0.0.1",
    csrf,
    permit,
    forward: (body: Uint8Array, key: string, signal: AbortSignal) => {
      if (diagnose) throw new Error("Diagnostic mode prohibits inference");
      return fetch("https://inference.tinfoil.sh/v1/chat/completions", {
        method: "POST",
        redirect: "error",
        signal,
        body: Buffer.from(body),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          "Ehbp-Encapsulated-Key": key,
        },
      });
    },
  };
  const { app, attempts } = experimentGateway(config);
  let vite: Awaited<ReturnType<typeof createServer>> | undefined;
  let server: ReturnType<typeof app.listen> | undefined;
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  const result: Record<string, unknown> = {
    observedAt: new Date().toISOString(),
    implementation: await implementationIdentity(root),
    status: "FAILED_OR_INTERRUPTED",
    kind: diagnose ? "NONBILLABLE_DIAGNOSTIC" : "SYNTHETIC_EXPERIMENT",
    qualification: "NOT_PASSED",
    scenario: permit.scenario,
    ...(compatibility ? { expectedReply: "4" } : { expectedInvoice }),
    attempts,
    charges:
      "Reconcile with provider billing; estimates do not include every possible fee.",
  };
  const network: Array<Record<string, unknown>> = [];
  let phase = "CLIENT_RUNNING";
  result.network = network;
  try {
    vite = await createServer({
      root,
      configFile: false,
      cacheDir: resolve(root, "node_modules/.vite-experiment"),
      appType: "custom",
      logLevel: "error",
      server: { middlewareMode: true, hmr: false },
      worker: { format: "es" },
    });
    app.get("/", (_req, res) =>
      res
        .type("html")
        .send(
          "<!doctype html><title>PrivateAI synthetic experiment</title><p>No private data. Not provider qualification.</p>",
        ),
    );
    app.use(vite.middlewares);
    server = await new Promise<ReturnType<typeof app.listen>>((ok, fail) => {
      const s = app.listen(0, "127.0.0.1", () => ok(s));
      s.once("error", fail);
    });
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("No loopback listener");
    config.origin = `http://127.0.0.1:${address.port}`;
    browser = await chromium.launch(browserLaunchOptions());
    const context = await browser.newContext({
      ignoreHTTPSErrors: false,
      serviceWorkers: "block",
    });
    const requestIds = new WeakMap<BrowserRequest, number>();
    let nextRequestId = 0;
    const networkStarted = performance.now();
    const observation = (request: BrowserRequest) => {
      if (!requestIds.has(request)) requestIds.set(request, ++nextRequestId);
      return {
        requestId: requestIds.get(request),
        elapsedMs: Math.round(performance.now() - networkStarted),
        phase,
        route: networkRoute(request.url(), config.origin),
      };
    };
    await context.route("**/*", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const local = url.origin === config.origin;
      const approvedGet = approvedLocalGet(
        request.url(),
        request.method(),
        config.origin,
      );
      const relay =
        local &&
        url.pathname === "/api/inference/v1/chat/completions" &&
        !url.search &&
        request.method() === "POST";
      const lookup =
        url.href === "https://atc.tinfoil.sh/attestation" &&
        request.method() === "POST" &&
        request.postData() ===
          JSON.stringify({
            enclaveUrl: permit.policy.origin,
            repo: permit.policy.repository,
          });
      if (approvedGet || (relay && !diagnose) || lookup) await route.continue();
      else {
        network.push({
          ...observation(request),
          outcome:
            relay && diagnose
              ? "INFERENCE_BLOCKED_BY_DIAGNOSTIC"
              : "BLOCKED_BY_POLICY",
          destination: local
            ? "LOCAL"
            : url.origin === "https://atc.tinfoil.sh"
              ? "ATTESTATION"
              : "OTHER",
        });
        await route.abort();
      }
    });
    const page = await context.newPage();
    const relayTerminals: Promise<void>[] = [];
    const finishRelay = new WeakMap<BrowserRequest, () => void>();
    page.on("request", (request) => {
      if (networkRoute(request.url(), config.origin) !== "INFERENCE_RELAY")
        return;
      relayTerminals.push(
        new Promise<void>((resolve) => finishRelay.set(request, resolve)),
      );
    });
    page.on("requestfailed", (request) => {
      finishRelay.get(request)?.();
      const url = new URL(request.url());
      const code = request.failure()?.errorText;
      network.push({
        ...observation(request),
        outcome: "REQUEST_FAILED",
        destination:
          url.origin === config.origin
            ? "LOCAL"
            : url.origin === "https://atc.tinfoil.sh"
              ? "ATTESTATION"
              : "OTHER",
        code: code && /^net::ERR_[A-Z_]+$/.test(code) ? code : "REDACTED",
      });
    });
    page.on("response", (response) => {
      const url = new URL(response.url());
      if (
        url.origin === "https://atc.tinfoil.sh" ||
        url.pathname === "/api/inference/v1/chat/completions" ||
        response.status() >= 400
      )
        network.push({
          ...observation(response.request()),
          outcome: "HTTP_RESPONSE",
          destination: url.origin === config.origin ? "LOCAL" : "ATTESTATION",
          status: response.status(),
        });
    });
    page.on("requestfinished", (request) => {
      finishRelay.get(request)?.();
      if (networkRoute(request.url(), config.origin) === "INFERENCE_RELAY")
        network.push({ ...observation(request), outcome: "REQUEST_FINISHED" });
    });
    await page.goto(config.origin);
    await page.addScriptTag({
      type: "module",
      url: `${config.origin}/evaluation/browser-entry.ts`,
    });
    await page.waitForFunction(() => "privateAiSyntheticRun" in window);
    result.client = await page.evaluate(
      async ({ permit, csrf }) => {
        const { privateAiSyntheticRun: runSynthetic } = window as unknown as {
          privateAiSyntheticRun: (
            input: unknown,
            csrf: string,
          ) => Promise<unknown>;
        };
        return Promise.race([
          runSynthetic(permit, csrf),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Experiment deadline")), 250000),
          ),
        ]);
      },
      { permit, csrf },
    );
    const client = result.client as { failure?: unknown };
    phase = "WAITING_FOR_RELAY_CLOSE";
    result.status = client.failure
      ? "FAILED_FOR_HUMAN_REVIEW"
      : "RETURNED_FOR_HUMAN_REVIEW";
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 2000);
      Promise.all(relayTerminals).then(() => {
        clearTimeout(timer);
        resolve();
      });
    });
  } finally {
    phase = "BROWSER_TEARDOWN";
    await browser?.close();
    await vite?.close();
    if (server) await new Promise<void>((ok) => server!.close(() => ok()));
    if (result.client) {
      try {
        const summary = reviewResult(result, permit);
        result.summary = summary;
        if (
          diagnose &&
          summary.outcome === "DIAGNOSTIC_REACHED_INFERENCE_BOUNDARY"
        ) {
          result.status = summary.outcome;
        } else if (
          (result.client as { failure?: unknown }).failure ||
          summary.outcome === "INCOMPLETE_REVIEW_REQUIRED"
        )
          process.exitCode = 1;
        console.log(JSON.stringify(summary, null, 2));
      } catch {
        result.status = "INVALID_EVIDENCE_REVIEW_REQUIRED";
        process.exitCode = 1;
      }
    }
    await writeFile(
      resolve(runDir, "result.json"),
      JSON.stringify(result, null, 2),
      { flag: "wx", mode: 0o600 },
    );
    console.log(
      `Result: ${resolve(runDir, "result.json")}. Provider qualification remains NOT_PASSED.`,
    );
  }
}
