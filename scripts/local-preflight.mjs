// Isolated browser verification only. Never reads an API key or sends inference.
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import { chromium } from "@playwright/test";
import { createServer as createViteServer } from "vite";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const executablePath =
  process.env.CHROMIUM_PATH ||
  (existsSync("/usr/bin/chromium")
    ? "/usr/bin/chromium"
    : undefined);
const nodeOK = Number(process.versions.node.split(".")[0]) === 24;
const browserOK = existsSync(executablePath ?? chromium.executablePath());
if (process.argv.includes("--check")) {
  console.log(
    JSON.stringify(
      {
        node24: nodeOK,
        browserInstalled: browserOK,
        action: browserOK
          ? "Run node scripts/local-preflight.mjs on your local computer."
          : "Install the test browser: npx playwright install chromium",
        networkRequests: 0,
        inferenceRequests: 0,
        providerQualification: "NOT_PASSED",
      },
      null,
      2,
    ),
  );
  process.exitCode = nodeOK && browserOK ? 0 : 1;
} else {
  if (!nodeOK || !browserOK)
    throw new Error(
      "Node 24 and the Playwright Chromium browser are required. Run with --check first.",
    );
  // Do not spend time modifying Cloud TLS trust. This command deliberately fails
  // in a proxy-configured environment; no proxy settings are removed or bypassed.
  if (
    [
      "HTTPS_PROXY",
      "HTTP_PROXY",
      "https_proxy",
      "http_proxy",
      "ALL_PROXY",
      "all_proxy",
    ].some((key) => process.env[key])
  )
    throw new Error(
      "Use a suitable local environment with normal browser TLS trust. Proxy-configured environments are not supported by this probe; do not unset their required proxy settings to bypass this check.",
    );
  const vite = await createViteServer({
    root,
    configFile: false,
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
    logLevel: "error",
  });
  const server = createServer((req, res) => {
    if (req.url === "/") {
      res.writeHead(200, {
        "Content-Type": "text/html",
        "Cache-Control": "no-store",
        "Content-Security-Policy":
          "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self' https://atc.tinfoil.sh; object-src 'none'; frame-ancestors 'none'",
      });
      res.end(
        "<!doctype html><title>PrivateAI isolated verification probe</title><p>Public router verification only. No inference or private data.</p>",
      );
    } else
      vite.middlewares(req, res, () => {
        res.writeHead(404);
        res.end();
      });
  });
  let browser;
  const evidence = {
    observedAt: new Date().toISOString(),
    kind: "LIVE_BROWSER_PREFLIGHT",
    result: "FAILED",
    stage: "START_LOCAL_SERVER",
    inferenceRequests: 0,
    requests: [],
    verification: null,
    limits:
      "No model request, downstream processing review, release approval, freshness/revocation qualification, quality or billing evidence.",
    providerQualification: "NOT_PASSED",
  };
  try {
    await new Promise((ok, fail) => {
      server.once("error", fail);
      server.listen(0, "127.0.0.1", ok);
    });
    const origin = `http://127.0.0.1:${server.address().port}`;
    evidence.stage = "LAUNCH_BROWSER";
    browser = await chromium.launch({ executablePath, headless: true });
    evidence.stage = "CONFIGURE_BROWSER";
    const context = await browser.newContext({
      ignoreHTTPSErrors: false,
      serviceWorkers: "block",
    });
    await context.route("**/*", async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const localModule =
        url.origin === origin &&
        req.method() === "GET" &&
        (url.pathname === "/" ||
          url.pathname.startsWith("/node_modules/") ||
          url.pathname.startsWith("/@"));
      const bundleLookup =
        url.href === "https://atc.tinfoil.sh/attestation" &&
        req.method() === "POST" &&
        req.postData() ===
          JSON.stringify({
            enclaveUrl: "https://inference.tinfoil.sh",
            repo: "tinfoilsh/confidential-model-router",
          });
      if (!localModule && !bundleLookup) {
        evidence.requests.push({
          host: url.hostname,
          path: url.pathname,
          outcome: "BLOCKED_BY_PROBE",
        });
        await route.abort();
      } else await route.continue();
    });
    const page = await context.newPage();
    page.on("response", (response) => {
      const url = new URL(response.url());
      if (url.origin !== origin)
        evidence.requests.push({
          host: url.hostname,
          path: url.pathname,
          status: response.status(),
        });
    });
    page.on("requestfailed", (req) =>
      evidence.requests.push({
        host: new URL(req.url()).hostname,
        outcome: req.failure()?.errorText || "NETWORK_FAILED",
      }),
    );
    evidence.stage = "LOAD_LOCAL_PAGE";
    await page.goto(origin);
    evidence.stage = "VERIFY_ROUTER";
    evidence.verification = await page.evaluate(async () => {
      return Promise.race([
        (async () => {
          const { fetchAttestationBundle, Verifier } =
            await import("/node_modules/tinfoil/dist/index.browser.js");
          const repository = "tinfoilsh/confidential-model-router";
          const bundle = await fetchAttestationBundle({
            enclaveURL: "https://inference.tinfoil.sh",
            configRepo: repository,
          });
          if (bundle.domain !== "inference.tinfoil.sh")
            throw new Error("Unexpected bundle host");
          const verifier = new Verifier({ configRepo: repository });
          await verifier.verifyBundle(bundle);
          const doc = verifier.getVerificationDocument();
          if (
            !doc?.securityVerified ||
            doc.enclaveHost !== bundle.domain ||
            doc.configRepo !== repository ||
            !doc.hpkePublicKey
          )
            throw new Error("Identity verification failed");
          return {
            securityVerified: true,
            host: doc.enclaveHost,
            repository: doc.configRepo,
            releaseDigest: doc.releaseDigest,
          };
        })(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Verification timed out")), 45000),
        ),
      ]);
    });
    evidence.result = "ROUTER_VERIFICATION_PASSED";
    evidence.stage = "COMPLETE";
  } catch (error) {
    // Do not print arbitrary provider errors or headers into durable artifacts.
    evidence.result =
      "FAILED: inspect network outcomes; do not weaken TLS or attestation";
    evidence.failureKind =
      error instanceof Error &&
      ["Error", "TypeError", "ReferenceError", "TimeoutError"].includes(error.name)
        ? error.name
        : "UNKNOWN_ERROR";
    process.exitCode = 1;
  } finally {
    await browser?.close();
    await vite.close();
    await new Promise((ok) => server.close(ok));
    const folder = resolve(root, ".local");
    await mkdir(folder, { recursive: true });
    const output = resolve(folder, `browser-preflight-${Date.now()}.json`);
    await writeFile(output, JSON.stringify(evidence, null, 2), {
      flag: "wx",
      mode: 0o600,
    });
    console.log(JSON.stringify(evidence, null, 2));
    console.log(`Evidence: ${output}`);
  }
}
