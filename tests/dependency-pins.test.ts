// A18: dependencies are pinned to exact versions and installed from a committed lockfile,
// so a build never picks up a newer package by itself; CI also checks signatures and audits.
import { existsSync, readFileSync } from "node:fs";
import { expect, it } from "vitest";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));

it("pins every dependency to an exact version", () => {
  const ranged = Object.entries({ ...pkg.dependencies, ...pkg.devDependencies } as Record<string, string>)
    .filter(([, version]) => !/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version))
    .map(([name, version]) => `${name}@${version}`);
  expect(ranged).toEqual([]);
});

it("installs from the committed lockfile and checks the supply chain in CI", () => {
  expect(existsSync("package-lock.json")).toBe(true);
  expect(JSON.parse(readFileSync("package-lock.json", "utf8")).lockfileVersion).toBe(3);
  const ci = readFileSync(".github/workflows/validate.yml", "utf8");
  expect(ci).toContain("npm ci");
  expect(ci).not.toMatch(/npm install(?!\s+-g)/);
  expect(ci).toContain("npm audit signatures");
  expect(ci).toContain("node scripts/audit-check.mjs");
  expect(readFileSync("scripts/audit-check.mjs", "utf8")).toContain('"audit", "--omit=dev", "--json"');
});

it("the audit allows only the listed advisories, each by exact ID, and fails on any other high or critical", async () => {
  const { ALLOWED, blockingAdvisories } = await import("../scripts/audit-check.mjs");
  expect(ALLOWED.map((a) => a.id)).toEqual(["GHSA-fc5q-39xc-vjpf"]);
  const advisory = (id: string, severity: string, name = "x") => ({ name, severity, title: "t", url: `https://github.com/advisories/${id}` });
  const report = (...via: ReturnType<typeof advisory>[]) => ({ vulnerabilities: { a: { severity: "high", via }, vite: { severity: "high", via: ["picomatch"] } } });
  expect(blockingAdvisories(report(advisory("GHSA-fc5q-39xc-vjpf", "high", "picomatch"))).blocking).toEqual([]);
  expect(blockingAdvisories(report(advisory("GHSA-aaaa-bbbb-cccc", "high"))).blocking).toHaveLength(1);
  expect(blockingAdvisories(report(advisory("GHSA-aaaa-bbbb-cccc", "critical"), advisory("GHSA-fc5q-39xc-vjpf", "high"))).blocking).toHaveLength(1);
  expect(blockingAdvisories(report(advisory("GHSA-aaaa-bbbb-cccc", "moderate"))).blocking).toEqual([]);
  // A look-alike ID is not the allowed one.
  expect(blockingAdvisories(report(advisory("GHSA-fc5q-39xc-vjpfX", "high"))).blocking).toHaveLength(1);
  expect(blockingAdvisories({ vulnerabilities: {} }).allowedSeen).toEqual([]);
});
