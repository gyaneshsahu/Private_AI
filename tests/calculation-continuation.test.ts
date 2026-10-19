import { expect, it } from "vitest";
import type { ChatCompletionChunk } from "openai/resources/chat/completions";
import {
  prepareCalculationContinuation,
  consumeCalculationExplanation,
} from "../src/calculation-continuation";
import type { CalculatorTurn } from "../src/calculator-turn";
const turn: CalculatorTurn = {
  text: "",
  calculation: { value: "14.00", unit: "EUR", references: ["source-a"] },
  usage: { input: 10, output: 5, total: 15, estimatedUSD: 0.01 },
};
turn.toolCall = {
  id: "call-a",
  arguments: '{"synthetic":"validated upstream"}',
};
const pricing = {
  currency: "USD" as const,
  inputPerMillion: 1,
  outputPerMillion: 1,
};
function frame(content: string, finish: string | null = "stop") {
  return { choices: [{ index: 0, delta: { content }, finish_reason: finish }] };
}
const usage = {
  choices: [],
  usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 },
};
async function* events(values: unknown[]) {
  for (const value of values) yield value as ChatCompletionChunk;
}
it("binds the exact call and immutable result without mutating history", () => {
  const messages = [{ role: "user" as const, content: "Explain the charge" }];
  const request = prepareCalculationContinuation(turn, messages, 5000);
  expect(request.tool_choice).toBe("none");
  expect(request.messages[2]).toMatchObject({
    role: "tool",
    tool_call_id: "call-a",
  });
  expect(
    JSON.parse(request.messages[2].content as string).results[0].value,
  ).toBe("14.00");
  messages[0].content = "changed";
  expect(request.messages[0].content).toBe("Explain the charge");
  expect(request.messages[1]).toMatchObject({
    tool_calls: [{ function: { arguments: turn.toolCall!.arguments } }],
  });
});
it("refuses context overflow before requesting a continuation", () => {
  expect(() => prepareCalculationContinuation(turn, [], 10)).toThrow(
    "context budget",
  );
  expect(() =>
    prepareCalculationContinuation(
      { text: "ordinary answer", usage: turn.usage },
      [],
      5000,
    ),
  ).toThrow("validated calculation");
});
it("returns prose separately from computed results and accounts both calls", async () => {
  const result = await consumeCalculationExplanation(
    events([frame("The charge includes delivery."), usage]),
    pricing,
    new AbortController().signal,
    turn,
  );
  expect(result.explanation).toBe("The charge includes delivery.");
  expect(result.calculation).toEqual(turn);
  expect(result.usage).toMatchObject({ input: 30, output: 15, total: 45 });
  expect(result.usage.estimatedUSD).toBeCloseTo(0.01003);
  result.calculation.calculation!.value = "changed";
  expect(turn.calculation!.value).toBe("14.00");
});
it("withholds incomplete prose and preserves known combined usage", async () => {
  await expect(
    consumeCalculationExplanation(
      events([frame("partial", "length"), usage]),
      pricing,
      new AbortController().signal,
      turn,
    ),
  ).rejects.toMatchObject({ usage: { total: 45 } });
  await expect(
    consumeCalculationExplanation(
      events([frame("partial", null)]),
      pricing,
      new AbortController().signal,
      turn,
    ),
  ).rejects.toMatchObject({ usage: { total: 15 } });
});
it("rejects additional tool calls rather than starting a loop", async () => {
  const tool = {
    choices: [
      {
        index: 0,
        delta: {
          tool_calls: [
            {
              index: 0,
              id: "new",
              type: "function",
              function: { name: "calculate", arguments: "{}" },
            },
          ],
        },
        finish_reason: "tool_calls",
      },
    ],
  };
  await expect(
    consumeCalculationExplanation(
      events([tool, usage]),
      pricing,
      new AbortController().signal,
      turn,
    ),
  ).rejects.toThrow("incomplete");
});
it("cancellation cannot deliver a completed explanation", async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(
    consumeCalculationExplanation(
      events([frame("done"), usage]),
      pricing,
      controller.signal,
      turn,
    ),
  ).rejects.toThrow("incomplete");
});
