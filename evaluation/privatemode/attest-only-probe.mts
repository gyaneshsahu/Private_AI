// Verify-only probe (16 Nov): N fresh attestations GAP ms apart, no chat, so no tokens.
// Measures the request limit on attest calls after pay-as-you-go was switched on.
import { PrivatemodeAI } from "privatemode-ai";
const apiKey = process.env.PRIVATEMODE_API_KEY!;
const GAP = Number(process.argv[2] ?? 2000), N = Number(process.argv[3] ?? 12);
const t0 = Date.now(); let ok = 0, fail = 0; const line: string[] = [];
for (let i = 0; i < N; i++) {
  const next = t0 + i * GAP; if (Date.now() < next) await new Promise((r) => setTimeout(r, next - Date.now()));
  const client = new PrivatemodeAI({ apiKey, enableWasmLogging: false });
  const t = performance.now();
  try { await client.verify(); ok++; line.push(`.${Math.round(performance.now() - t)}`); }
  catch (e) { fail++; const m = String((e as Error).message).replace(/\s+/g, " "); line.push(/429/.test(m) ? " 429 " : ` X(${m.slice(0, 80)}) `); }
  finally { client.close(); }
}
console.log(`verify only, gap ${GAP} ms: ${ok} ok, ${fail} failed in ${Math.round((Date.now() - t0) / 1000)} s  ${line.join(" ")}`);
