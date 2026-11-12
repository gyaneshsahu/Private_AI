// Burst probe (12 Nov): one fresh client per request, as the app does, 3 in parallel.
import { PrivatemodeAI } from "privatemode-ai";
const apiKey = process.env.PRIVATEMODE_API_KEY!;
const started = Date.now();
const one = async (i: number) => {
  const t = performance.now();
  const client = new PrivatemodeAI({ apiKey, enableWasmLogging: false });
  try {
    await client.verify();
    const r = await client.chat.completions.create({ model: "glm-5.3-flash", reasoning_effort: "low", max_tokens: 8, messages: [{ role: "user", content: "Say ok" }] } as never);
    return `${i} ok ${Math.round(performance.now() - t)}ms ${(r as { usage?: { total_tokens?: number } }).usage?.total_tokens ?? "?"}tok`;
  } catch (e) {
    const m = String((e as Error).message).replace(/\s+/g, " ");
    const code = /status code:? ?(\d{3})/i.exec(m)?.[1] ?? /\b(4\d\d|5\d\d)\b/.exec(m)?.[1] ?? "?";
    return `${i} FAIL code ${code} at ${Math.round((Date.now() - started) / 1000)}s: ${m.slice(m.indexOf("status"), m.indexOf("status") + 90)}`;
  } finally {
    client.close();
  }
};
for (let i = 0; i < 30; i += 3) console.log((await Promise.all([one(i), one(i + 1), one(i + 2)])).join(" | "));
