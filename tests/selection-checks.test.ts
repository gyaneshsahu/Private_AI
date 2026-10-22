import { readFile, readdir } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { checks, validateQualification } from "../shared/contracts";
import { developmentCase } from "../evaluation/experiment";
import {
  citationForm,
  placeholdersCopiedExactly,
} from "../evaluation/selection-checks";
import added from "../evaluation/cases/model-selection-checks-20261022.json";

describe("placeholder copying check (selection-08)", () => {
  const expected = ["{{IBAN-1}}", "{{EMAIL-1}}", "{{PHONE-1}}"];
  it("passes a reply that copies every stand-in exactly", () => {
    const reply =
      "Please return the deposit to my account {{IBAN-1}}. Questions can go to {{EMAIL-1}} or {{PHONE-1}}.";
    expect(placeholdersCopiedExactly(reply, expected)).toEqual({
      ok: true,
      missing: [],
      altered: [],
    });
  });
  it("fails on a missing, bracketed, single-braced, lower-cased or renumbered stand-in", () => {
    for (const [reply, problem] of [
      ["Return it to {{IBAN-1}} and write to {{EMAIL-1}}.", "missing"],
      [
        "Return it to [IBAN-1], write to {{EMAIL-1}} or {{PHONE-1}}.",
        "altered",
      ],
      [
        "Return it to {IBAN-1}, write to {{EMAIL-1}} or {{PHONE-1}}.",
        "altered",
      ],
      [
        "Return it to {{iban-1}}, write to {{EMAIL-1}} or {{PHONE-1}}.",
        "altered",
      ],
      [
        "Return it to {{IBAN-1}} or {{IBAN-2}}, write to {{EMAIL-1}} or {{PHONE-1}}.",
        "altered",
      ],
      ["Return it to IBAN-1, write to {{EMAIL-1}} or {{PHONE-1}}.", "altered"],
    ] as const) {
      const result = placeholdersCopiedExactly(reply, expected);
      expect(result.ok, reply).toBe(false);
      expect(result[problem].length, reply).toBeGreaterThan(0);
    }
  });
});

describe("citation delimiter check (selection-09)", () => {
  it("distinguishes square, fullwidth, mixed and absent citations", () => {
    expect(citationForm("Delivery on 3 November [note-7283fc55].")).toBe(
      "square",
    );
    expect(citationForm("Delivery on 3 November 【note-7283fc55】.")).toBe(
      "fullwidth",
    );
    expect(
      citationForm("Delivery [note-7283fc55]; payment 【note-7283fc55】."),
    ).toBe("mixed");
    expect(citationForm("Delivery on 3 November.")).toBe("none");
  });
});

describe("the two 22 October cases join the screen as robustness cases", () => {
  it("are loadable through the experiment case lookup and keep the selection shape", () => {
    for (const fixture of added) {
      const found = developmentCase(fixture.id, "robustness_case");
      expect(found.id).toBe(fixture.id);
      expect(found.turns).toHaveLength(2);
      expect(fixture.synthetic).toBe(true);
      expect(fixture.humanScores).toBeNull();
      expect(fixture.mandatoryFacts).toEqual(fixture.expected);
    }
    expect(added[0].turns[0]).toContain("{{IBAN-1}}");
    expect(added[1].sources[0].id).toBe("note-7283fc55");
    expect(added[1].expected[0]).toContain("【note-7283fc55】");
  });
});

describe("candidate qualification report draft (launch plan 8.5)", () => {
  const path =
    "evaluation/qualification-drafts/gemma4-31b-primary-gpt-oss-120b-fallback-20261022.json";
  it("names the candidates, every check as candidate, and cannot be loaded as a report", async () => {
    const draft = JSON.parse(await readFile(path, "utf8"));
    expect(draft.status).toContain("NOT_SELECTED");
    expect(draft.model).toBe("gemma4-31b");
    expect(draft.fallbackModel).toBe("gpt-oss-120b");
    for (const check of checks) {
      expect(draft.review[check].status, check).toBe("candidate");
      expect(
        draft.review[check].evidenceRequired.length,
        check,
      ).toBeGreaterThan(0);
    }
    expect(draft.approvedSpendUSD).toBeNull();
    expect(() => validateQualification(draft)).toThrow();
  });
  it("is referenced by no configuration, entry point or example config", async () => {
    const files = [
      "server/index.ts",
      "server/deployment-config.ts",
      "server/deployment-entry.ts",
      "server/render-entry.ts",
      ...(await readdir("deployment")).map((name) => `deployment/${name}`),
    ];
    for (const file of files) {
      const text = await readFile(file, "utf8").catch(() => "");
      expect(text, file).not.toContain("qualification-drafts");
    }
  });
});
