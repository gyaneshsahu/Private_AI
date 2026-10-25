import { spawnSync } from "node:child_process";
import { mkdir, readFile, access } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";

const files = [
  "account-auth-postgres",
  "account-social-postgres",
  "account-migrations",
  "account-access",
  "account-privileges",
  "account-usage-http",
  "usage-postgres",
  "consumer-control",
  "security-notices",
  "production-account",
  "production-social",
  "production-workspace",
  "production-operations",
  "billing-events",
  "billing-reconciliation",
  "billing-workflow",
  "request-retention",
].map((name) => `tests/${name}.test.ts`);

async function main() {
  let url;
  try {
    url = new URL(process.env.PRIVATEAI_SYNTHETIC_PG ?? "");
  } catch {}
  if (
    !url ||
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    url.pathname !== "/privateai_synthetic" ||
    url.search ||
    url.hash
  )
    throw Error(
      "Set PRIVATEAI_SYNTHETIC_PG to the named loopback privateai_synthetic database. No tests were started.",
    );
  await access(resolve("dist/index.html"));
  const pool = new Pool({
    connectionString: url.href,
    connectionTimeoutMillis: 3000,
    query_timeout: 3000,
  });
  try {
    const result = await pool.query("SELECT current_database() AS name");
    if (result.rows[0]?.name !== "privateai_synthetic")
      throw Error("Unexpected synthetic database identity.");
  } catch {
    throw Error(
      "Synthetic PostgreSQL preflight failed. No tests were started; connection details are withheld.",
    );
  } finally {
    await pool.end();
  }
  await mkdir(".local/diagnostics", { recursive: true });
  const report = resolve(`.local/diagnostics/durable-${randomUUID()}.json`);
  const child = spawnSync(
    process.execPath,
    [
      "node_modules/vitest/vitest.mjs",
      "run",
      ...files,
      "--reporter=default",
      "--reporter=json",
      `--outputFile.json=${report}`,
    ],
    {
      env: {
        ...process.env,
        TINFOIL_API_KEY: "",
        BRAVE_SEARCH_API_KEY: "",
        STRIPE_SECRET_KEY: "",
      },
      stdio: "inherit",
      windowsHide: true,
      timeout: 600000,
    },
  );
  if (child.error || child.status !== 0)
    throw Error(
      "Durable integration tests failed or timed out. Preserve the diagnostic report; no retries were made.",
    );
  const results = JSON.parse(await readFile(report, "utf8"));
  if (
    !results.success ||
    results.numTotalTests <= 0 ||
    results.numPendingTests !== 0 ||
    results.numFailedTests !== 0 ||
    results.numPassedTests !== results.numTotalTests ||
    files.some(
      (file) =>
        !results.testResults.some((result) =>
          result.name.replaceAll("\\", "/").endsWith(file),
        ),
    )
  )
    throw Error(
      "Durable integration coverage is incomplete: missing, skipped or failed tests cannot pass this check.",
    );
  console.log(
    `Durable integration: ${results.numPassedTests} passed, zero skipped across ${files.length} required files. Synthetic fixtures only; no hosted/provider qualification.`,
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
