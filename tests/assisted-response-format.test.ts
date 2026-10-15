import { expect, it } from "vitest";
import { assistedResponseFormat } from "../src/assisted-response-format";

it("leaves existing baseline and assisted permits unchanged unless explicitly enabled", () => {
  expect(assistedResponseFormat({})).toEqual({});
  expect(assistedResponseFormat({ assistedResearchContract: true })).toEqual(
    {},
  );
  expect(() =>
    assistedResponseFormat({ assistedStructuredOutput: true }),
  ).toThrow("Nothing was sent");
});
it("serializes the canonical schema with required evidence and no content or credentials", () => {
  const result = assistedResponseFormat({
    assistedStructuredOutput: true,
    assistedResearchContract: true,
  });
  expect(result.response_format?.type).toBe("json_schema");
  const schema = result.response_format!.json_schema.schema;
  expect(schema.additionalProperties).toBe(false);
  expect(schema.required).toEqual(["blocks"]);
  const serialized = JSON.stringify(schema);
  expect(serialized).toContain('"evidence"');
  expect(serialized).toContain('"calculation"');
  expect(serialized).toContain('"percentOf"');
  expect(serialized).not.toContain("preprocess");
  expect(serialized).not.toContain("apiKey");
  expect(JSON.parse(JSON.stringify(result))).toEqual(result);
});
it("excludes empty arithmetic and evidence-only calculator branches from constrained generation", () => {
  const schema = assistedResponseFormat({
    assistedStructuredOutput: true,
    assistedResearchContract: true,
  }).response_format!.json_schema.schema as any;
  const variants =
    schema.properties.blocks.items.oneOf ??
    schema.properties.blocks.items.anyOf;
  const arithmetic = variants.find(
    (v: any) => v.properties.kind.const === "arithmetic",
  ).properties.program;
  expect(arithmetic.properties.inputs.minItems).toBe(1);
  expect(arithmetic.properties.steps.minItems).toBe(1);
  expect(arithmetic.properties.results.minItems).toBe(1);
  expect(arithmetic.properties.results.maxItems).toBe(1);
  expect(arithmetic.properties.passages.maxItems).toBe(0);
  expect(arithmetic.properties.limitation.const).toBe("none");
  const calculator = variants.find(
    (v: any) => v.properties.kind.const === "calculator",
  ).properties.calculation;
  expect(
    (calculator.anyOf ?? calculator.oneOf).every(
      (v: any) => v.properties.kind.const === "calculation",
    ),
  ).toBe(true);
});
