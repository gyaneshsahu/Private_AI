import { readFile, readdir } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const read = async (file: string) =>
  (await readFile(file, "utf8")).replace(/\r\n/g, "\n");

describe("deployment review checklist (launch plan 7.5) matches the repository", () => {
  it("names every PRD item and the review procedure", async () => {
    const doc = await read("docs/deployment-review-checklist-20261022.md");
    for (const item of [
      "| Secrets |",
      "| Headers |",
      "| Rate limits |",
      "| Logging |",
      "| Rollback |",
      "| Migrations |",
      "| Monitoring |",
      "| Incident contact |",
      "## Review procedure before any public deployment",
    ])
      expect(doc, item).toContain(item);
  });

  it("secrets: the example deployment config holds only secret file paths and no attestation-audit block", async () => {
    const example = JSON.parse(
      await read("deployment/render-config.example.json"),
    );
    const flat = JSON.stringify(example).toLowerCase();
    for (const forbidden of [
      '"secret":',
      '"password"',
      '"token"',
      '"apikey"',
      '"api_key"',
    ])
      expect(flat, forbidden).not.toContain(forbidden);
    for (const key of [
      "secretFile",
      "databaseUrlFile",
      "tlsKeyFile",
      "clientCaFile",
    ])
      expect(example[key], key).toMatch(/^\/etc\/secrets\//);
    expect(example).not.toHaveProperty("attestationAudit");
    for (const file of ["Dockerfile", "Dockerfile.render"]) {
      const text = await read(file);
      expect(text, file).not.toMatch(/COPY .*\.env/);
      expect(text, file).not.toMatch(/COPY .*secrets/);
    }
  });

  it("logging: no request logger dependency and console output only in the entry files", async () => {
    const pkg = JSON.parse(await read("package.json"));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const logger of ["morgan", "pino", "pino-http", "winston"])
      expect(deps, logger).not.toHaveProperty(logger);
    const offenders: string[] = [];
    for (const name of await readdir("server")) {
      if (!name.endsWith(".ts")) continue;
      if (["index.ts", "deployment-database-entry.ts"].includes(name)) continue;
      const text = await read(`server/${name}`);
      if (/console\.(log|error|warn|info)\(/.test(text)) offenders.push(name);
    }
    expect(offenders).toEqual([]);
  });

  it("migrations: the ordered list ends with the two additive 22 October migrations the runbook sequences", async () => {
    const list = await read("server/account-migrations.ts");
    expect(list).toContain(
      '"0013-usage-metrics.sql",\n  "0020-signin-delivery.sql",',
    );
    for (const file of ["0013-usage-metrics.sql", "0020-signin-delivery.sql"]) {
      const sql = await read(`server/migrations/${file}`);
      expect(sql, file).not.toMatch(
        /\b(DROP|ALTER TABLE .* DROP|TRUNCATE|DELETE FROM)\b/i,
      );
    }
    const runbook = await read("docs/invited-trial-runbook.md");
    expect(runbook).toContain("apply-pending");
    expect(runbook).toContain("pending: 2");
  });

  it("incident contact: the policy still carries placeholders and the candidate build gate is in place", async () => {
    const policy = await read("shared/privacy-policy.ts");
    expect(policy).toContain("not yet named");
    for (const file of ["Dockerfile", "Dockerfile.render"])
      expect(await read(file), file).toContain(
        "ARG PRIVACY_PLACEHOLDERS=forbid",
      );
  });
  it("hardening (7.8): the rate-limit table and the header script match the code", async () => {
    // The record lives outside the public repository; the check runs where it is present.
    const docPath = "docs/private/hardening-20261024.md";
    const { existsSync } = await import("node:fs");
    if (!existsSync(docPath)) return;
    const doc = await read(docPath);
    const auth = await read("server/account-auth.ts");
    const app = await read("server/app.ts");
    for (const [file, line] of [
      [auth, 'rateLimit: { enabled: true, storage: "database", window: 60, max: 60 }'],
      [auth, "rateLimit: { window: 60, max: 3 }"],
      [auth, "DELIVERIES_PER_ADDRESS_PER_HOUR = 5"],
      [app, "if (active >= 3)"],
      [await read("server/billing-entitlement.ts"), "requestLimit: 200"],
      [await read("server/deployment-config.ts"), ".max(10)"],
    ]) {
      expect(file, line).toContain(line);
      expect(doc, line).toContain(line);
    }
    const script = await read("scripts/check-headers.mjs");
    expect(script).not.toMatch(/method:/);
    for (const header of [
      '"cache-control": "no-store"',
      '"referrer-policy": "no-referrer"',
      '"x-content-type-options": "nosniff"',
      '"x-frame-options": "DENY"',
      '"permissions-policy": "camera=(self), microphone=(), geolocation=()"',
    ])
      expect(script, header).toContain(header);
  });
});
