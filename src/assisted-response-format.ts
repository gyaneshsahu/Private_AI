import { textFor } from "./text/core";
import { chatErrorText } from "./text/chat-errors";
import { z } from "zod";
import { assistedResearchSchema } from "./assisted-research";

// Output direction includes canonical discriminator fields, not input preprocessors.
// Local evidence and arithmetic validation remains mandatory after constrained decoding.
export function assistedResponseFormat(policy: {
  assistedStructuredOutput?: boolean;
  assistedResearchContract?: boolean;
}) {
  if (!policy.assistedStructuredOutput) return {};
  if (!policy.assistedResearchContract)
    throw new Error(
      textFor(chatErrorText).structuredNeedsContract,
    );
  return {
    response_format: {
      type: "json_schema" as const,
      json_schema: {
        name: "privateai_assisted_v1",
        strict: true,
        schema: z.toJSONSchema(assistedResearchSchema, { io: "output" }),
      },
    },
  };
}
