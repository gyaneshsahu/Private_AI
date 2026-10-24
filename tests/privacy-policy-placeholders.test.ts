import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { placeholderGate } from "../scripts/policy-placeholders";
import {
  POLICY_PLACEHOLDERS,
  policyPlaceholders,
} from "../shared/privacy-policy";

describe("privacy policy placeholders gate the production candidate build", () => {
  it("finds every section that still carries an owner placeholder today", () => {
    // 24 October: the owner filled the identity file and decided 90 days of
    // request-record retention, so no section carries a placeholder.
    expect(policyPlaceholders()).toEqual([]);
    for (const phrase of POLICY_PLACEHOLDERS)
      expect(phrase).toBe(phrase.toLowerCase());
  });

  it("refuses the default (forbid) build while placeholders remain and names each one", () => {
    const remaining = [{ id: "contact", phrase: "not yet named" }];
    const gate = placeholderGate("forbid", remaining);
    expect(gate.exitCode).toBe(1);
    expect(gate.lines.join("\n")).toContain(
      'section "contact" still says "not yet named"',
    );
    expect(gate.lines.at(-1)).toContain("cannot be built");
    expect(placeholderGate("nonsense", remaining).exitCode).toBe(2);
    expect(placeholderGate("forbid").exitCode).toBe(0);
  });

  it("allows only an explicit rehearsal build, and says so", () => {
    const gate = placeholderGate("allow", [
      { id: "contact", phrase: "not yet named" },
    ]);
    expect(gate.exitCode).toBe(0);
    expect(gate.lines.at(-1)).toContain("not a deployment candidate");
  });

  it("is wired into the deployment-candidate stage of both Dockerfiles with forbid as the default", async () => {
    for (const file of ["Dockerfile", "Dockerfile.render"]) {
      const text = (await readFile(file, "utf8")).replace(/\r\n/g, "\n");
      const stage = text.slice(
        text.indexOf("FROM build AS deployment-candidate"),
      );
      expect(stage, file).toContain("ARG PRIVACY_PLACEHOLDERS=forbid");
      expect(stage, file).toContain(
        'RUN node --import tsx scripts/policy-placeholders.ts "$PRIVACY_PLACEHOLDERS"',
      );
      // The gate runs before the image is usable, not in a later stage that a
      // deployment could skip.
      expect(
        stage.indexOf("RUN node --import tsx scripts/policy-placeholders.ts"),
      ).toBeLessThan(stage.indexOf("ENTRYPOINT"));
    }
  });
});
