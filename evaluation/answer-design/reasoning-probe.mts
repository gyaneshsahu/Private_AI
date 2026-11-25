// Does Privatemode return the model's reasoning text? One made-up question to each model, streamed;
// prints which fields the stream carries (never the key). Result in docs/activity-states-20261126.md.
//   Invoke-WithPrivateAiSecret -Name PRIVATEMODE_API_KEY -Action { npx tsx evaluation/answer-design/reasoning-probe.mts }
import { PrivatemodeAI } from "privatemode-ai";
const apiKey = process.env.PRIVATEMODE_API_KEY;
if (!apiKey) throw Error("PRIVATEMODE_API_KEY not loaded");
const client = new PrivatemodeAI({ apiKey, enableWasmLogging: false, openAIOptions: { maxRetries: 0 } });
await client.verify();
await client.refreshSecret();
for (const model of ["glm-5.3-flash", "glm-5.3"]) {
  const stream = await client.chat.completions.create({ model, max_tokens: 700, stream: true, stream_options: { include_usage: true }, messages: [{ role: "user", content: "A train leaves at 09:17 and arrives at 11:52. How long is the trip in minutes?" }] });
  const keys = new Map<string, number>();
  let reasoning = "";
  let content = "";
  let usage: unknown;
  for await (const chunk of stream) {
    const delta = (chunk.choices[0]?.delta ?? {}) as Record<string, unknown>;
    for (const [key, value] of Object.entries(delta)) if (value != null && value !== "") keys.set(key, (keys.get(key) ?? 0) + 1);
    for (const key of ["reasoning_content", "reasoning"]) if (typeof delta[key] === "string") reasoning += delta[key];
    if (typeof delta.content === "string") content += delta.content;
    if (chunk.usage) usage = chunk.usage;
  }
  console.log(JSON.stringify({ model, deltaKeys: Object.fromEntries(keys), reasoningCharacters: reasoning.length, reasoningStart: reasoning.slice(0, 160), contentStart: content.slice(0, 80), usage }));
}
