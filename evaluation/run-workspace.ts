import { workspaceBrowserDependencies } from "./browser-dependencies";
import { assertWorkspaceArm } from "./workspace-arm";
import { assertWorkspaceBudget } from "./workspace-budget";
import { startTemporaryReview } from "./temporary-review";
import { shouldStopWorkspaceBatch } from "./reply-failure";
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { createServer } from "vite";
import express from "express";
import { chromium } from "@playwright/test";
import { createApp } from "../server/app";
import { experimentGateway } from "./experiment-gateway";
import { experimentInferenceLimit, validateExperiment } from "./experiment";
import { claimExperiment } from "./run-claim";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { auditResearchAnswer } from "../src/research-audit";
import workspaceFixtures from "./cases/research-workspace.json";
import assistedFixtures from "./cases/research-assisted.json";
import toolFixtures from "./cases/research-tools.json";
import everydayFixtures from "./cases/everyday-transfer-20261019.json";
import { selectionModels, assertSelectionPolicy } from "./selection-policy";
import selectionFixtures from "./cases/model-selection-20261020.json";
const selection = process.argv.includes("--selection-study");
const selectionCells = Object.keys(selectionModels);
if (
  selection &&
  process.argv.some((a) =>
    [
      "--everyday",
      "--everyday-remaining",
      "--matched",
      "--assisted",
      "--optional-tools",
      "--candidate-only",
      "--structured",
      "--diagnostic",
      "--calculation-continuation",
      "--calculation-replay",
    ].includes(a),
  )
)
  throw Error("Selection study must use its own fixed normal configurations");
const everyday = process.argv.includes("--everyday");
const everydayRemaining = process.argv.includes("--everyday-remaining");
if (everydayRemaining && !everyday)
  throw Error("Remaining everyday coverage requires everyday mode");
if (
  everyday &&
  process.argv.some((a) =>
    [
      "--matched",
      "--assisted",
      "--optional-tools",
      "--candidate-only",
      "--structured",
      "--diagnostic",
      "--calculation-continuation",
      "--calculation-replay",
    ].includes(a),
  )
)
  throw Error("Everyday comparison uses ordinary answers only");
const matched = process.argv.includes("--matched");
const independentArms = process.argv.includes("--independent-arms");
const cells = [
  "deepseek-normal",
  "gptoss-normal",
  "deepseek-calculator",
  "gptoss-calculator",
];
const cellArm = (cell: string) =>
  cell.endsWith("-calculator")
    ? "candidate"
    : cell.endsWith("-normal")
      ? "baseline"
      : cell;
if (
  matched &&
  (!process.argv.includes("--optional-tools") ||
    !process.argv.includes("--calculation-replay") ||
    process.argv.includes("--candidate-only"))
)
  throw Error("Matched mode requires normal/calculator pairs and replay");
const continuation = process.argv.includes("--calculation-continuation");
if (continuation && (!process.argv.includes("--optional-tools") || matched))
  throw Error(
    "Continuation requires a separate optional-tools comparison, not the historical matched protocol",
  );
const optionalTools = process.argv.includes("--optional-tools");
const toolDiagnostic = process.argv.includes("--tool-diagnostic");
const candidateOnly = process.argv.includes("--candidate-only");
if (candidateOnly && !optionalTools)
  throw Error("Candidate-only mode requires optional-tools fixtures");
const comparisonCases = process.argv
  .find((arg) => arg.startsWith("--comparison-cases="))
  ?.slice("--comparison-cases=".length)
  .split(",");
if (
  comparisonCases &&
  (!optionalTools ||
    toolDiagnostic ||
    !comparisonCases.length ||
    new Set(comparisonCases).size !== comparisonCases.length ||
    comparisonCases.some((id) => !toolFixtures.some((f) => f.id === id)))
)
  throw Error("Invalid comparison fixture selection");
const diagnosticCase = process.argv
  .find((arg) => arg.startsWith("--diagnostic-case="))
  ?.slice("--diagnostic-case=".length);
if (
  diagnosticCase &&
  (!toolDiagnostic || !toolFixtures.some((f) => f.id === diagnosticCase))
)
  throw Error("Unknown diagnostic fixture");
if (toolDiagnostic && !optionalTools)
  throw Error("Tool diagnostic requires optional tools");
const assisted = process.argv.includes("--assisted");
const diagnostic = process.argv.includes("--diagnostic");
if (diagnostic && !assisted)
  throw Error("Diagnostic mode requires assisted fixtures");
const generalArithmetic = process.argv.includes("--general-arithmetic");
if (generalArithmetic && (!assisted || diagnostic))
  throw Error("Choose the separate assisted arithmetic batch");
const structured = process.argv.includes("--structured");
if (structured && (!assisted || diagnostic || generalArithmetic))
  throw Error("Choose separate structured assisted batch");
if (
  optionalTools &&
  (!assisted || diagnostic || generalArithmetic || structured)
)
  throw Error("Choose separate optional-tools batch");
const fixtures = selection
  ? selectionFixtures
  : everyday
    ? everydayFixtures
        .filter((f) => !everydayRemaining || Number(f.id.slice(-2)) >= 3)
        .map((f) => ({
          ...f,
          query: `authored ${f.id}`,
          sources: [
            {
              id: "synthetic-context",
              title: "Authored task context",
              text: "This is an authored synthetic task. All task facts are supplied in the user messages.",
              url: "https://example.com/synthetic-context",
              evidenceKind: "search-excerpt",
            },
          ],
        }))
    : optionalTools
      ? toolFixtures.filter((f) =>
          comparisonCases
            ? comparisonCases.includes(f.id)
            : toolDiagnostic
              ? f.id ===
                (process.argv.includes("--invoice-diagnostic")
                  ? "assisted-tool-08"
                  : (diagnosticCase ?? "assisted-tool-07"))
              : process.argv.includes("--multi-results")
                ? Number(f.id.slice(-2)) >= 5 && Number(f.id.slice(-2)) <= 7
                : Number(f.id.slice(-2)) <= 4 &&
                  (!process.argv.includes("--remaining-tools") ||
                    f.id !== "assisted-tool-01"),
        )
      : structured
        ? assistedFixtures.filter((f) => Number(f.id.slice(-2)) >= 6)
        : generalArithmetic
          ? assistedFixtures.filter(
              (f) =>
                Number(f.id.slice(-2)) >=
                (process.argv.includes("--normalized") ? 4 : 3),
            )
          : diagnostic
            ? assistedFixtures.filter((f) => f.id === "assisted-02")
            : assisted
              ? assistedFixtures
              : workspaceFixtures;
const fixturePath = selection
  ? "evaluation/cases/model-selection-20261020.json"
  : everyday
    ? "evaluation/cases/everyday-transfer-20261019.json"
    : optionalTools
      ? "evaluation/cases/research-tools.json"
      : assisted
        ? "evaluation/cases/research-assisted.json"
        : "evaluation/cases/research-workspace.json";
const root = resolve(process.argv[2] || "");
if (!process.argv[2] || !root.startsWith(resolve(".local") + "\\"))
  throw Error("Local run directory required");
try {
  await access(resolve(root, "results.json"));
  throw new Error("Results already exist; use a separate run directory.");
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}
const dry = process.argv.includes("--offline");
const bootstrapOnly = process.argv.includes("--bootstrap-only");
if (
  !dry &&
  !bootstrapOnly &&
  (!process.env.TINFOIL_API_KEY || !process.env.BRAVE_SEARCH_API_KEY)
)
  throw Error("Stored credentials required");
const hash = (x: unknown) =>
  createHash("sha256").update(JSON.stringify(x)).digest("hex");
if (!dry && !bootstrapOnly) {
  const plan = JSON.parse(await readFile(resolve(root, "plan.json"), "utf8"));
  if (
    everyday &&
    JSON.stringify(plan.caseIds) !== JSON.stringify(fixtures.map((f) => f.id))
  )
    throw Error("Selected everyday cases differ from the frozen plan");
  if (
    selection &&
    JSON.stringify(plan.caseIds) !== JSON.stringify(fixtures.map((f) => f.id))
  )
    throw Error("Selection cases differ from frozen plan");
  if (independentArms !== (plan.stopPolicy === "independent-arms"))
    throw Error(
      "Independent-arm execution must match the frozen plan stop policy.",
    );
  for (const [file, expected] of Object.entries(plan.implementationHashes)) {
    const actual = createHash("sha256")
      .update(await readFile(String(file)))
      .digest("hex");
    if (actual !== expected)
      throw Error(
        "Frozen implementation changed; prepare a separate reviewed batch.",
      );
  }
  const fixtureHash = createHash("sha256")
    .update(await readFile(fixturePath))
    .digest("hex");
  if (fixtureHash !== plan.fixtureSHA256) throw Error("Frozen cases changed.");
}
let plannedRequests = 0;
let plannedReserve = 0;
let permitCeiling = Infinity;
const approvalIds = new Set<string>();
// Validate every selected permit before opening a browser or spending on any arm.
for (const fixture of fixtures)
  for (const cell of selection
    ? selectionCells
    : matched
      ? cells
      : diagnostic || toolDiagnostic || candidateOnly
        ? ["candidate"]
        : ["baseline", "candidate"]) {
    const arm = cellArm(cell);
    const permit = validateExperiment(
      JSON.parse(
        await readFile(resolve(root, `${fixture.id}-${cell}.json`), "utf8"),
      ),
    );
    permitCeiling = Math.min(
      permitCeiling,
      permit.approvedCapUSD,
      permit.providerCapUSD,
    );
    for (const id of [
      permit.approvalId,
      permit.continuationApproval?.approvalId,
    ].filter((id): id is string => !!id)) {
      if (approvalIds.has(id)) throw Error("Duplicate batch approval ID");
      approvalIds.add(id);
    }
    if (selection) assertSelectionPolicy(permit.policy, cell);
    plannedRequests += experimentInferenceLimit(permit);
    if (
      everyday &&
      (permit.policy.model !==
        (cell === "baseline" ? "gpt-oss-120b" : "deepseek-v4-1-flash") ||
        (cell === "baseline"
          ? permit.policy.gptOssReasoningEffort !== "high"
          : permit.policy.deepSeekThinking !== true ||
            permit.policy.deepSeekReasoningEffort !== "low") ||
        permit.policy.answerPolicyVariant !== "constraints-v4" ||
        permit.policy.maxInputCharacters !== 20000 ||
        permit.policy.maxOutputTokens !== 4096)
    )
      throw Error("Everyday model configuration differs from fixed comparison");
    plannedReserve +=
      (experimentInferenceLimit(permit) *
        (permit.policy.maxInputCharacters *
          4 *
          permit.policy.pricing.inputPerMillion +
          permit.policy.maxOutputTokens *
            permit.policy.pricing.outputPerMillion)) /
      1e6;
    if (
      matched &&
      (permit.policy.model !==
        (cell.startsWith("deepseek")
          ? "deepseek-v4-1-flash"
          : "gpt-oss-120b") ||
        (cell.startsWith("deepseek")
          ? permit.policy.deepSeekThinking !== true ||
            permit.policy.deepSeekReasoningEffort !== "low"
          : permit.policy.gptOssReasoningEffort !== "high"))
    )
      throw Error("Matched model configuration differs");
    assertWorkspaceArm(
      permit,
      fixture.id,
      arm,
      everyday || selection
        ? "normal"
        : optionalTools
          ? "optional"
          : assisted
            ? "assisted"
            : "scoped",
      process.argv.includes("--calculation-replay"),
      continuation,
    );
  }
if ((continuation || independentArms) && !dry && !bootstrapOnly) {
  const plan = JSON.parse(await readFile(resolve(root, "plan.json"), "utf8"));
  assertWorkspaceBudget(plan, plannedRequests, plannedReserve, permitCeiling);
}
const report: any = {
  mode: dry ? "OFFLINE_UI_ONLY" : "LIVE_PUBLIC_AND_AUTHORED",
  humanScores: null,
  results: [],
  qualification: "NOT_PASSED",
  stopPolicy: independentArms ? "independent-arms" : "global",
  publicContentPersisted: false,
};
const publicReviewNeeded =
  !selection && !dry && fixtures.some((f) => !f.sources.length);
if (publicReviewNeeded && !process.argv.includes("--human-review"))
  throw Error(
    "Live public answers require --human-review and an available reviewer before requests start.",
  );
const review = publicReviewNeeded ? await startTemporaryReview() : undefined;
if (review) {
  console.log(
    JSON.stringify({
      temporaryReviewURL: review.url,
      action:
        "Reviewer must open this page and choose ready before any request. No content is saved.",
    }),
  );
  try {
    await review.waitUntilReady();
  } catch (error) {
    await review.close();
    throw error;
  }
}
const browser = await chromium
  .launch(browserLaunchOptions())
  .catch(async (error) => {
    await review?.close();
    throw error;
  });
let stop = false;
try {
  for (const [caseIndex, fixture] of fixtures.entries()) {
    if (stop) break;
    let pairedSources: any[] | undefined;
    for (const cell of selection
      ? [
          ...selectionCells.slice(caseIndex % 3),
          ...selectionCells.slice(0, caseIndex % 3),
        ]
      : matched
        ? [...cells.slice(caseIndex), ...cells.slice(0, caseIndex)]
        : diagnostic || toolDiagnostic || candidateOnly
          ? ["candidate"]
          : (assisted || everyday) && caseIndex % 2
            ? ["candidate", "baseline"]
            : ["baseline", "candidate"]) {
      const arm = cellArm(cell);
      const permit = validateExperiment(
        JSON.parse(
          await readFile(resolve(root, `${fixture.id}-${cell}.json`), "utf8"),
        ),
      );
      assertWorkspaceArm(
        permit,
        fixture.id,
        arm,
        everyday || selection
          ? "normal"
          : optionalTools
            ? "optional"
            : assisted
              ? "assisted"
              : "scoped",
        process.argv.includes("--calculation-replay"),
        continuation,
      );
      const claimed =
        dry || bootstrapOnly
          ? undefined
          : await claimExperiment(".local/experiment-runs", permit.approvalId);
      if (!dry && permit.continuationApproval)
        await claimExperiment(
          ".local/experiment-runs",
          permit.continuationApproval.approvalId,
        );
      const record: any = {
        id: fixture.id,
        cell,
        configuration: permit.policy,
        arm,
        public: !fixture.sources.length,
        replies: [],
        humanScores: null,
      };
      report.results.push(record);
      const config = {
        origin: "http://127.0.0.1",
        csrf: randomBytes(32).toString("hex"),
        permit,
        forward: (body: Uint8Array, k: string, signal: AbortSignal) =>
          bootstrapOnly
            ? Promise.reject(Error("Bootstrap cannot forward inference"))
            : fetch("https://inference.tinfoil.sh/v1/chat/completions", {
                method: "POST",
                redirect: "error",
                signal,
                body: Buffer.from(body),
                headers: {
                  Authorization: `Bearer ${process.env.TINFOIL_API_KEY}`,
                  "Content-Type": "application/json",
                  Accept: "text/event-stream",
                  "Ehbp-Encapsulated-Key": k,
                },
              }),
      };
      const gateway = experimentGateway(config);
      const outer = express();
      outer.use((_req, res, next) => {
        res.set({
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
          "Content-Security-Policy":
            "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://atc.tinfoil.sh; worker-src 'self' blob:; object-src 'none'",
        });
        next();
      });
      outer.use((req, res, next) =>
        req.path === "/api/inference/v1/chat/completions"
          ? gateway.app(req, res, next)
          : next(),
      );
      const server = outer.listen(0, "127.0.0.1");
      await new Promise<void>((ok) => server.once("listening", ok));
      const addr = server.address();
      if (!addr || typeof addr === "string") throw Error("Listener");
      config.origin = `http://127.0.0.1:${addr.port}`;
      const vite = await createServer({
        root: resolve("."),
        configFile: false,
        appType: "custom",
        logLevel: "silent",
        cacheDir: resolve("node_modules/.vite-workspace-eval"),
        plugins: [
          {
            name: "isolated-evaluation-inference",
            enforce: "pre",
            resolveId(id, importer) {
              if (
                id === "./inference" &&
                importer?.replaceAll("\\", "/").endsWith("/src/App.tsx")
              )
                return resolve(
                  dry
                    ? "evaluation/workspace-offline-inference.ts"
                    : "evaluation/workspace-inference.ts",
                );
            },
          },
        ],
        esbuild: { jsx: "automatic" },
        optimizeDeps: {
          include: workspaceBrowserDependencies,
          noDiscovery: true,
        },
        server: { middlewareMode: true, hmr: false },
      });
      const app = createApp({
        origin: config.origin,
        searchKey:
          dry || bootstrapOnly
            ? "synthetic-key"
            : process.env.BRAVE_SEARCH_API_KEY,
        searchMode: "llm-context",
      });
      outer.use((req, res, next) =>
        req.path.startsWith("/api/") ? app(req, res, next) : next(),
      );
      outer.get("/", async (_req, res) =>
        res
          .type("html")
          .send(
            await vite.transformIndexHtml(
              "/",
              '<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><title>PrivateAI isolated workspace evaluation</title><div id="root"></div><script type="module" src="/evaluation/workspace-entry.tsx"></script></html>',
            ),
          ),
      );
      outer.use(vite.middlewares);
      const context = await browser.newContext({ serviceWorkers: "block" });
      const page = await context.newPage();
      let sources: any[] = [];
      const reviewTurns: Array<{ question: string; answer: string }> = [];
      let networkViolation = 0;
      let consoleMessages = 0;
      let phase = "start";
      const pageErrors: string[] = [];
      page.on("console", (msg) => {
        consoleMessages++;
        if (dry || bootstrapOnly) console.log(msg.text());
      });
      page.on("pageerror", (error) => {
        pageErrors.push(error.name);
        if (dry) console.log(error.message);
      });
      page.on("dialog", (d) => d.accept());
      await page.addInitScript((p) => {
        (window as any).__workspaceEvaluation = { permit: p, results: [] };
      }, permit);
      await context.route("**/*", async (route) => {
        const req = route.request(),
          url = new URL(req.url());
        if (url.origin !== config.origin) {
          if (
            !dry &&
            url.href === "https://atc.tinfoil.sh/attestation" &&
            req.method() === "POST" &&
            req.postData() ===
              JSON.stringify({
                enclaveUrl: permit.policy.origin,
                repo: permit.policy.repository,
              })
          )
            return route.continue();
          networkViolation++;
          return route.abort();
        }
        if (url.pathname === "/api/status") {
          const response = await route.fetch();
          const data = await response.json();
          record.productionGateClosed = !data.inference.ready;
          config.csrf = data.csrf;
          return route.fulfill({
            response,
            json: {
              ...data,
              inference: { ready: true, qualification: permit.policy },
            },
          });
        }
        if (url.pathname === "/api/research/execute") {
          const started = Date.now();
          if (fixture.sources.length || pairedSources || dry) {
            sources = fixture.sources.length
              ? fixture.sources.map((s) => ({
                  ...s,
                  retrievedAt: "2026-10-15T00:00:00.000Z",
                }))
              : (pairedSources ?? [
                  {
                    id: "dry-source",
                    title: "Synthetic source",
                    text: "Synthetic public placeholder.",
                    url: "https://example.com/synthetic",
                    evidenceKind: "search-excerpt",
                    retrievedAt: "2026-10-15T00:00:00.000Z",
                  },
                ]);
            record.retrievalKind =
              fixture.sources.length || dry
                ? "AUTHORED_FIXTURE"
                : "SAME_EVIDENCE_IN_MEMORY_REPLAY";
            return route.fulfill({
              json: { sources },
              headers: { "cache-control": "no-store" },
            });
          }
          const response = await route.fetch();
          const data = await response.json();
          sources = data.sources ?? [];
          pairedSources = sources;
          record.retrievalMs = Date.now() - started;
          record.retrievalKind = "LIVE_BRAVE_LLM_CONTEXT";
          record.noStore = response.headers()["cache-control"] === "no-store";
          return route.fulfill({ response, json: data });
        }
        if (dry && url.pathname === "/api/inference/v1/chat/completions")
          return route.abort();
        return route.continue();
      });
      try {
        await page.goto(config.origin, { waitUntil: "domcontentloaded" });
        const tab = (name: string) =>
          page
            .getByRole("navigation", { name: "Workspace" })
            .getByRole("button", { name, exact: false });
        if (!selection || fixture.sources.length) {
          await tab("Research").click();
          await page.getByLabel("Exact search query").fill(fixture.query);
          await page.getByRole("button", { name: "Review disclosure" }).click();
          await page
            .getByRole("button", { name: "Approve and retrieve" })
            .click();
          await page
            .getByRole("status")
            .filter({ hasText: "Search results added" })
            .waitFor({ timeout: 30000 });
          record.sourceCount = sources.length;
          record.sourceHash = hash(sources);
          record.evidenceCharacters = sources.reduce(
            (n, s) => n + s.text.length,
            0,
          );
          record.providerDates = sources.filter((s) => !!s.providerDate).length;
          await tab("Context").click();
          await page.locator("details summary").first().click();
          await page
            .getByRole("button", { name: "Inspect source" })
            .first()
            .click();
          const dialog = page.getByRole("dialog");
          record.sourceOpen =
            (await dialog.locator("pre").textContent()) === sources[0].text;
          await page.keyboard.press("Tab");
          record.sourceLinkKeyboardReachable = await dialog
            .locator("a")
            .evaluate((a) => a === document.activeElement);
          record.sourceLinkSafe =
            (await dialog.locator("a").getAttribute("referrerpolicy")) ===
            "no-referrer";
          await page.keyboard.press("Escape");
        }
        if (bootstrapOnly) {
          record.bootstrapReady = true;
          stop = true;
          break;
        }
        phase = "conversation";
        await tab("Conversation").click();
        {
          for (let t = 0; t < fixture.turns.length; t++) {
            phase = `reply-${t + 1}`;
            await page.getByLabel("Message PrivateAI").fill(fixture.turns[t]);
            await page
              .getByRole("button", { name: "Send ↑", exact: true })
              .click();
            await page.waitForFunction(
              (n) => (window as any).__workspaceEvaluation.results.length > n,
              t,
              { timeout: 110000 },
            );
            await page
              .locator(".progress")
              .waitFor({ state: "hidden", timeout: 10000 });
            const result = await page.evaluate(
              (n) => (window as any).__workspaceEvaluation.results[n],
              t,
            );
            reviewTurns.push({
              question: fixture.turns[t],
              answer: result.answer,
            });
            const humanReview =
              review && !selection && !fixture.sources.length
                ? {
                    status: "HUMAN_REVIEW",
                    ...(await review.assess({
                      caseId: fixture.id,
                      arm,
                      completed: result.completed,
                      turns: reviewTurns,
                      sources,
                    })),
                  }
                : undefined;
            const audit = auditResearchAnswer(result.answer, sources);
            record.replies.push({
              ...result,
              deliveredDOMText:
                selection || fixture.sources.length
                  ? await page
                      .locator("article.message.assistant")
                      .last()
                      .innerText()
                  : undefined,
              humanReview,
              answer:
                selection || fixture.sources.length ? result.answer : undefined,
              answerCharacters: result.answer.length,
              answerSHA256: hash(result.answer),
              evidenceAudit: audit,
            });
            if (!result.completed) {
              stop = shouldStopWorkspaceBatch(
                result,
                independentArms ? "independent-arms" : "global",
                gateway.attempts.length > 0 &&
                  gateway.attempts.every(
                    (a) =>
                      a.upstreamStatus === 200 &&
                      a.protocolHeaderValid &&
                      a.syntheticPlaintextMarkerAbsent,
                  ),
              );
              record.conversationStopped = true;
              break;
            }
          }
          const citation = page.locator("button.citation").first();
          if (await citation.count()) {
            await citation.click();
            record.answerCitationOpensSource = await page
              .getByRole("dialog")
              .isVisible();
            await page.keyboard.press("Escape");
          }
        }
        if (dry) {
          const copies = page.getByRole("button", {
            name: "Copy answer",
            exact: true,
          });
          await page.evaluate(`Object.defineProperty(navigator, "clipboard", {
            configurable: true,
            value: { writeText: async (text) => { window.syntheticCopiedAnswer = text; } }
          })`);
          const complete = copies.filter({ visible: true }).first();
          await complete.click();
          record.explicitCopyWorks = await page.evaluate(
            () =>
              typeof (window as unknown as { syntheticCopiedAnswer?: string })
                .syntheticCopiedAnswer === "string",
          );
          if (!record.explicitCopyWorks)
            throw Error("Explicit synthetic answer copy failed");
        }
        phase = "storage";
        await tab("Context").click();
        const remove = page.getByRole("button", {
          name: "Remove",
          exact: true,
        });
        while (await remove.count()) await remove.first().click();
        if (!selection || fixture.sources.length) {
          await tab("Saved").click();
          await page
            .getByLabel("Vault passphrase")
            .fill("synthetic evaluation vault passphrase");
          await page
            .getByRole("button", { name: "Create or unlock vault" })
            .click();
          record.saveBlocked = await page
            .getByRole("button", { name: "Save encrypted snapshot" })
            .isDisabled();
        }
        record.storage = await page.evaluate(async () => {
          const names = await indexedDB.databases();
          let records = 0;
          for (const { name } of names) {
            if (!name) continue;
            const db = await new Promise<IDBDatabase>((ok, fail) => {
              const r = indexedDB.open(name);
              r.onsuccess = () => ok(r.result);
              r.onerror = () => fail();
            });
            if (db.objectStoreNames.contains("conversations"))
              records += await new Promise<number>((ok) => {
                const r = db
                  .transaction("conversations")
                  .objectStore("conversations")
                  .count();
                r.onsuccess = () => ok(r.result);
              });
            db.close();
          }
          return {
            conversationRecords: records,
            localStorageKeys: localStorage.length,
            sessionStorageKeys: sessionStorage.length,
            cacheEntries: (await caches.keys()).length,
            serviceWorkers: (await navigator.serviceWorker.getRegistrations())
              .length,
          };
        });
        await page.reload();
        await tab("Context").click();
        record.clearedOnReload = await page
          .getByText("Your context is empty.", { exact: false })
          .isVisible();
      } catch (error) {
        record.failure = "UI_OR_TRANSPORT_CHECK_FAILED";
        record.failurePhase = phase;
        record.failureType = error instanceof Error ? error.name : "Unknown";
        // Synthetic fixture diagnostics only; never persist live public page content.
        if ((everyday || selection) && error instanceof Error) {
          record.failureSummary = error.message
            .split("\n")[0]
            .replace(/https?:\/\/\S+/g, "[URL]");
          record.visibleStatus = await page
            .locator('[role="status"], [role="alert"]')
            .allTextContents()
            .catch(() => []);
        }
        if (dry) console.log(String(error));
        stop = true;
      } finally {
        if (
          networkViolation ||
          pageErrors.length ||
          (record.storage &&
            Object.values(record.storage).some((value) => value !== 0)) ||
          record.saveBlocked === false ||
          record.clearedOnReload === false
        ) {
          stop = true;
          record.batchStoppedForIntegrity = true;
        }
        record.pageErrors = pageErrors;
        record.networkViolation = networkViolation;
        record.consoleMessageCount = consoleMessages;
        record.attempts = gateway.attempts;
        await context.close();
        await vite.close();
        await new Promise<void>((ok) => server.close(() => ok()));
        if (claimed)
          await writeFile(
            resolve(claimed, "metadata.json"),
            JSON.stringify(record, null, 2),
            { flag: "wx" },
          );
        await writeFile(
          resolve(root, "results.json"),
          JSON.stringify(report, null, 2),
        );
      }
      console.log(
        JSON.stringify({
          id: fixture.id,
          arm,
          replies: record.replies.length,
          failure: record.failure,
          saveBlocked: record.saveBlocked,
        }),
      );
      if (stop) break;
    }
  }
} finally {
  await browser.close();
  await review?.close();
}
