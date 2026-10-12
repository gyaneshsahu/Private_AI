import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { createServer } from "vite";
import { chromium } from "@playwright/test";
import { experimentGateway } from "./experiment-gateway";
import { validateExperiment, developmentCase } from "./experiment";
import { claimExperiment } from "./run-claim";
import { searchWeb } from "../server/research";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import publicCases from "./cases/research-transfer.json";
import evidenceCases from "./cases/research-evidence-transfer.json";
import reasoningCases from "./cases/research-reasoning-transfer.json";
const reasoning = process.argv[3] === "--reasoning";
const modelScreen = process.argv[3] === "--model-screen";
const authored = process.argv[3] === "--authored" || reasoning || modelScreen;
const cases = modelScreen
  ? reasoningCases.cases.map((c) => ({ ...c, query: "" }))
  : reasoning
    ? reasoningCases.cases.flatMap((c) => [
        { ...c, query: "" },
        { ...c, query: "" },
      ])
    : authored
      ? evidenceCases.cases.map((c) => ({ ...c, query: "" }))
      : publicCases;

// Requires newly prepared permits; consumed permits cannot be reused. Persist metadata only.
const runRoot = resolve(process.argv[2] ?? "");
if (!process.argv[2] || !runRoot.startsWith(resolve(".local") + "\\"))
  throw Error("Local batch directory required");
const key = process.env.TINFOIL_API_KEY,
  searchKey = process.env.BRAVE_SEARCH_API_KEY;
if (!key || (!authored && !searchKey)) throw Error("Stored keys required");
const outcomes: unknown[] = [];
const browser = await chromium.launch(browserLaunchOptions());
try {
  for (let index = 0; index < cases.length; index++) {
    const fixture = cases[index];
    const permit = validateExperiment(
      JSON.parse(await readFile(resolve(runRoot, `${index + 1}.json`), "utf8")),
    );
    if (
      permit.developmentCaseId !== fixture.id ||
      permit.scenario !== "robustness_case"
    )
      throw Error("Case binding mismatch");
    const claimed = await claimExperiment(
      resolve(".local/experiment-runs"),
      permit.approvalId,
    );
    await writeFile(
      resolve(claimed, "permit.json"),
      JSON.stringify(permit, null, 2),
      { flag: "wx" },
    );
    const record: Record<string, unknown> = {
      id: fixture.id,
      approvalId: permit.approvalId,
      requestedReasoning: permit.policy.gptOssReasoningEffort ?? "default",
      model: permit.policy.model,
      sourceCount: 0,
      searchAttempted: false,
      turns: [],
      qualification: "NOT_PASSED",
      providerContentPersisted: false,
    };
    outcomes.push(record);
    await writeFile(
      resolve(runRoot, "metadata.json"),
      JSON.stringify(outcomes, null, 2),
    );
    let server:
      | ReturnType<ReturnType<typeof experimentGateway>["app"]["listen"]>
      | undefined;
    let vite: Awaited<ReturnType<typeof createServer>> | undefined;
    const context = await browser.newContext({ serviceWorkers: "block" });
    try {
      record.searchAttempted = !authored;
      await writeFile(
        resolve(runRoot, "metadata.json"),
        JSON.stringify(outcomes, null, 2),
      );
      const start = Date.now();
      const sources = authored
        ? developmentCase(fixture.id, "robustness_case").sources
        : await searchWeb(fixture.query, searchKey!, undefined, "llm-context");
      record.searchMs = Date.now() - start;
      record.sourceCount = sources.length;
      if (!sources.length) {
        record.failure = "NO_EVIDENCE";
        break;
      }
      const csrf = randomBytes(32).toString("hex");
      const config = {
        origin: "http://127.0.0.1",
        csrf,
        permit,
        forward: (body: Uint8Array, k: string, signal: AbortSignal) =>
          fetch("https://inference.tinfoil.sh/v1/chat/completions", {
            method: "POST",
            redirect: "error",
            signal,
            body: Buffer.from(body),
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
              Accept: "text/event-stream",
              "Ehbp-Encapsulated-Key": k,
            },
          }),
      };
      const gateway = experimentGateway(config);
      record.attempts = gateway.attempts;
      vite = await createServer({
        root: resolve("."),
        configFile: false,
        cacheDir: resolve("node_modules/.vite-research-eval"),
        appType: "custom",
        logLevel: "error",
        optimizeDeps: { include: ["tinfoil", "ehbp"], noDiscovery: true },
        server: { middlewareMode: true, hmr: false },
      });
      gateway.app.get("/", (_req, res) =>
        res
          .type("html")
          .send(
            "<!doctype html><title>Public research evaluation only</title>",
          ),
      );
      gateway.app.use(vite.middlewares);
      server = gateway.app.listen(0, "127.0.0.1");
      await new Promise<void>((ok, fail) => {
        server!.once("listening", ok);
        server!.once("error", fail);
      });
      const addr = server.address();
      if (!addr || typeof addr === "string") throw Error("Listener");
      config.origin = `http://127.0.0.1:${addr.port}`;
      await context.route("**/*", (route) => {
        const req = route.request(),
          u = new URL(req.url());
        const local = u.origin === config.origin;
        const allowed =
          (local && req.method() === "GET") ||
          (local &&
            u.pathname === "/api/inference/v1/chat/completions" &&
            req.method() === "POST") ||
          (u.href === "https://atc.tinfoil.sh/attestation" &&
            req.method() === "POST" &&
            req.postData() ===
              JSON.stringify({
                enclaveUrl: permit.policy.origin,
                repo: permit.policy.repository,
              }));
        return allowed ? route.continue() : route.abort();
      });
      const page = await context.newPage();
      await page.goto(config.origin);
      await page.addScriptTag({
        type: "module",
        url: config.origin + "/evaluation/research-browser-entry.ts",
      });
      await page.waitForFunction(
        () => typeof (window as any).privateAiResearchRun === "function",
      );
      const replies = await page.evaluate(
        async ({ permit, csrf, sources }) =>
          (window as any).privateAiResearchRun(permit, csrf, sources),
        { permit, csrf, sources },
      );
      record.turns = replies.map(({ answer, ...meta }: any) => ({
        ...meta,
        answerCharacters: answer.length,
      }));
      if (authored) {
        // Only our authored fixtures and their synthetic answers may be reopened.
        await writeFile(
          resolve(claimed, "result.json"),
          JSON.stringify(
            {
              id: fixture.id,
              fixture,
              sources,
              replies,
              attempts: gateway.attempts,
              humanScores: null,
              qualification: "NOT_PASSED",
            },
            null,
            2,
          ),
          { flag: "wx" },
        );
      }
      // Answers are inspected in the active run only; no source bodies or answer files are saved.
      console.log(
        JSON.stringify({
          id: fixture.id,
          sourceCount: sources.length,
          searchMs: record.searchMs,
          replies,
        }),
      );
      if (replies.some((reply: any) => !reply.completed)) {
        record.failure = "INCOMPLETE_STOPPED";
        // A withheld answer is a case result, not a transport outage or a retry.
        // Continue independent authored cases only after terminal usage is known.
        if (
          !authored ||
          replies.some((reply: any) => !reply.completed && !reply.usage)
        )
          break;
      }
    } catch {
      record.failure = "RUN_FAILED_NO_RETRY";
      console.log(JSON.stringify({ id: fixture.id, failure: record.failure }));
      break;
    } finally {
      await writeFile(
        resolve(runRoot, "metadata.json"),
        JSON.stringify(outcomes, null, 2),
      );
      await context.close();
      await vite?.close();
      if (server) await new Promise<void>((r) => server!.close(() => r()));
    }
  }
} finally {
  await browser.close();
}
