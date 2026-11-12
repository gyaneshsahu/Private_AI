// Paced probe: one fresh verify + tiny chat every GAP ms, sequential, N times.
import { PrivatemodeAI } from "privatemode-ai";
const apiKey = process.env.PRIVATEMODE_API_KEY!;
const GAP = Number(process.argv[2] ?? 2500), N = Number(process.argv[3] ?? 24);
const t0 = Date.now(); let ok = 0, fail = 0; const line: string[] = [];
for (let i = 0; i < N; i++) {
  const next = t0 + i * GAP; if (Date.now() < next) await new Promise((r) => setTimeout(r, next - Date.now()));
  const client = new PrivatemodeAI({ apiKey, enableWasmLogging: false });
  try { await client.verify(); await client.chat.completions.create({ model: "glm-5.3-flash", reasoning_effort: "low", max_tokens: 4, messages: [{ role: "user", content: "ok" }] } as never); ok++; line.push("."); }
  catch (e) { fail++; line.push(/429/.test(String((e as Error).message)) ? "4" : "X"); }
  finally { client.close(); }
}
console.log(`gap ${GAP} ms: ${ok} ok, ${fail} failed in ${Math.round((Date.now() - t0) / 1000)} s  ${line.join("")}`);
