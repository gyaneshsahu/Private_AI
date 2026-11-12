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
  expect(ci).toContain("npm audit --omit=dev --audit-level=high");
});
