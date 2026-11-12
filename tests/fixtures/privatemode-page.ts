// Browser page for the live Privatemode test: runs the real adapter as the app does, through the
// real app's admission (status for CSRF and cache salt, verify, then one streamed request).
import { inferenceClientFor } from "../../src/providers/inference-client";
import "../../src/providers/privatemode-client";
import { policyForTier, type AppStatus } from "../../shared/contracts";

declare global {
  interface Window {
    runPrivatemode(prompt: string): Promise<{ ok: boolean; text?: string; error?: string; status?: number }>;
  }
}

window.runPrivatemode = async (prompt) => {
  try {
    const status: AppStatus = await (await fetch("/api/status")).json();
    if (!status.inference.qualification) return { ok: false, error: status.inference.reason };
    const adapter = inferenceClientFor("privatemode");
    const policy = {
      ...policyForTier(status.inference.qualification, "fast", "primary"),
      csrf: status.csrf,
      cacheSalt: status.inference.cacheSalt,
    };
    const signal = new AbortController().signal;
    const destination = await adapter.verify(policy, signal, () => {});
    const transport = await destination.transport();
    const response = await transport.request("", {
      method: "POST",
      headers: { "X-PrivateAI-CSRF": status.csrf, "X-PrivateAI-Mode": "fast" },
      body: JSON.stringify({
        model: policy.model,
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: 256,
        stream: true,
        stream_options: { include_usage: true },
        ...adapter.modelOptions(policy),
        ...adapter.cacheOptions(policy),
      }),
      signal,
    });
    if (!response.ok) return { ok: false, status: response.status };
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
