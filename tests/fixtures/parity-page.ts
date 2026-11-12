// Parity page (branch privatemode-parity): one chat turn through the real Privatemode
// adapter and our relay, parsed by the app's own stream code (completionEvents +
// consumeReply), so differences from Tinfoil come from the provider, not the harness.
import { inferenceClientFor, type VerifiedDestination } from "../../src/providers/inference-client";
import "../../src/providers/privatemode-client";
import { completionEvents } from "../../src/completion-events";
import { consumeReply } from "../../src/reply-stream";

type TurnInput = {
  releaseDigests: string[];
  model: string;
  effort?: "low" | "medium" | "high";
  messages: { role: string; content: string }[];
  maxTokens: number;
  abortAfterChars?: number;
};
declare global {
  interface Window {
    runTurn(input: TurnInput): Promise<Record<string, unknown>>;
  }
}

const destinations = new Map<string, VerifiedDestination>();
window.runTurn = async (input) => {
  const adapter = inferenceClientFor("privatemode");
  const policy = {
    provider: "privatemode" as const,
    origin: "https://api.privatemode.ai",
    repository: "edgelesssys/privatemode-public",
    releaseDigests: input.releaseDigests,
    model: input.model,
    ...(input.model.startsWith("gpt-oss") ? { gptOssReasoningEffort: input.effort } : { glmReasoningEffort: input.effort as "low" }),
  };
  const controller = new AbortController();
  const started = performance.now();
  let text = "";
  let ttftMs: number | undefined;
  try {
    let destination = destinations.get(input.model);
    if (!destination) {
      destination = await adapter.verify(policy, controller.signal, () => {});
      destinations.set(input.model, destination);
    }
    const transport = await destination.transport();
    const response = await transport.request("", {
      method: "POST",
      body: JSON.stringify({
        model: policy.model,
        messages: input.messages,
        max_completion_tokens: input.maxTokens,
        stream: true,
        stream_options: { include_usage: true },
        ...adapter.modelOptions(policy),
      }),
      signal: controller.signal,
    });
    const usage = await consumeReply(
      completionEvents(response, controller.signal),
      { inputPerMillion: 0, outputPerMillion: 0, currency: "USD" },
      controller.signal,
      (chunk) => {
        ttftMs ??= Math.round(performance.now() - started);
        text += chunk;
        if (input.abortAfterChars && text.length >= input.abortAfterChars) controller.abort();
      },
    );
    return { text, ttftMs, totalMs: Math.round(performance.now() - started), usage };
  } catch (error) {
    const e = error as Error & { code?: string };
    return {
      text,
      ttftMs,
      totalMs: Math.round(performance.now() - started),
      error: e.code ?? e.name ?? "Error",
      message: String(e.message).slice(0, 200),
    };
  }
};
