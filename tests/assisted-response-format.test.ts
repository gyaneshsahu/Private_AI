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
