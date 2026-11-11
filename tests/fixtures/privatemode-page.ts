// Browser page for the Privatemode spike test: runs the real adapter as the app would
// (verify, then one streamed request through the transport) and reports the outcome.
import { inferenceClientFor } from "../../src/providers/inference-client";
import "../../src/providers/privatemode-client";

declare global {
  interface Window {
    runPrivatemode(
      releaseDigests: string[],
      prompt: string,
    ): Promise<{ ok: boolean; text?: string; error?: string }>;
  }
}

window.runPrivatemode = async (releaseDigests, prompt) => {
  const adapter = inferenceClientFor("privatemode");
  const policy = {
    provider: "privatemode" as const,
    origin: "https://api.privatemode.ai",
    repository: "edgelesssys/privatemode-public",
    releaseDigests,
    model: "glm-5.3-flash",
    glmReasoningEffort: "low" as const,
  };
  try {
    const signal = new AbortController().signal;
    const destination = await adapter.verify(policy, signal, () => {});
    const transport = await destination.transport();
    const response = await transport.request("", {
      method: "POST",
      body: JSON.stringify({
        model: policy.model,
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: 64,
        stream: true,
        ...adapter.modelOptions(policy),
      }),
      signal,
    });
    const raw = await response.text();
    const text = raw
      .split("\n")
      .filter((l) => l.startsWith("data: ") && l !== "data: [DONE]")
      .map((l) => JSON.parse(l.slice(6)).choices?.[0]?.delta?.content ?? "")
      .join("");
    return { ok: true, text };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
};
