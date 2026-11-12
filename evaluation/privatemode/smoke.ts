// One verified call to Privatemode (qualification step a). Key from Windows Credential
// Manager via scripts/WindowsSecrets.psm1; never printed. Synthetic prompt only.
import { PrivatemodeAI } from "privatemode-ai";

const apiKey = process.env.PRIVATEMODE_API_KEY;
if (!apiKey) throw Error("PRIVATEMODE_API_KEY not loaded");
const client = new PrivatemodeAI({ apiKey });
const started = performance.now();
const verified = await client.verify();
const verifyMs = Math.round(performance.now() - started);
const policies = Object.keys(verified.manifest.Policies ?? {});
const reply = await client.chat.completions.create({
  model: "gpt-oss-120b",
  reasoning_effort: "low",
  max_tokens: 32,
  messages: [{ role: "user", content: "Reply with the single word: ready" }],
});
console.log(
  JSON.stringify({
    verifyMs,
    manifestPolicies: policies.length,
    referenceValueKinds: Object.keys(verified.manifest.ReferenceValues ?? {}),
    model: reply.model,
    content: reply.choices[0]?.message?.content,
    usage: reply.usage,
    totalMs: Math.round(performance.now() - started),
  }),
);
client.close();
