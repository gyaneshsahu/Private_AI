// Qualification step b, variant: the browser-side SDK holds only a dummy key and talks to
// our relay (apiBaseURL); the relay swaps in the real key and forwards opaque bytes to
// Privatemode, like our Tinfoil relay does. Records whether the relay ever sees plaintext.
import { createServer } from "node:https";
import { readFileSync } from "node:fs";
import { PrivatemodeAI } from "privatemode-ai";

const realKey = process.env.PRIVATEMODE_API_KEY!;
const DUMMY = "browser-holds-no-real-key";
const canary = "CANARY-PLAINTEXT-7319";
const seen: { path: string; auth: string; plaintextSeen: boolean }[] = [];
const relay = createServer({ key: readFileSync(process.env.RELAY_KEY!), cert: readFileSync(process.env.RELAY_CERT!) }, async (req, res) => {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const body = Buffer.concat(chunks);
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.headers))
    if (typeof v === "string" && !["host", "connection", "content-length"].includes(k)) headers[k] = v;
  seen.push({ path: req.url!, auth: headers.authorization === `Bearer ${DUMMY}` ? "dummy" : headers.authorization ? "other" : "none", plaintextSeen: body.includes(canary) });
  process.stdout.write(`SEEN ${JSON.stringify({ relayRequests: seen.length, paths: [...new Set(seen.map((s) => s.path.split("?")[0]))], auth: [...new Set(seen.map((s) => s.auth))], plaintextSeenByRelay: seen.some((s) => s.plaintextSeen) })}
`);
  if (headers.authorization === `Bearer ${DUMMY}`) headers.authorization = `Bearer ${realKey}`;
  const upstream = await fetch(`https://api.privatemode.ai${req.url}`, {
    method: req.method, headers, body: ["GET", "HEAD"].includes(req.method!) ? undefined : body,
  });
  const out: Record<string, string> = {};
  upstream.headers.forEach((v, k) => { if (!["content-encoding", "content-length", "transfer-encoding"].includes(k)) out[k] = v; });
  res.writeHead(upstream.status, out);
  res.end(Buffer.from(await upstream.arrayBuffer()));
});
if (process.argv.includes("--relay")) {
  // Relay process: normal TLS verification towards Privatemode; reports what it saw on exit.
  await new Promise<void>((r) => relay.listen(0, "127.0.0.1", r));
  process.stdout.write(`PORT ${(relay.address() as { port: number }).port}
`);
  process.on("SIGTERM", () => {
    process.stdout.write(`SEEN ${JSON.stringify({ relayRequests: seen.length, paths: [...new Set(seen.map((s) => s.path.split("?")[0]))], auth: [...new Set(seen.map((s) => s.auth))], plaintextSeenByRelay: seen.some((s) => s.plaintextSeen) })}
`);
    process.exit(0);
  });
  await new Promise(() => {});
}
// Client process: only the localhost hop skips certificate checks; the SDK still attests Privatemode.
const { spawn } = await import("node:child_process");
const child = spawn(process.execPath, ["--import", "tsx", process.argv[1], "--relay"], { env: { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: "1" } });
let relayOut = "";
const port = await new Promise<number>((resolve) => child.stdout.on("data", (d) => { relayOut += d; const m = /PORT (\d+)/.exec(relayOut); if (m) resolve(Number(m[1])); }));
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const client = new PrivatemodeAI({ apiKey: DUMMY, apiBaseURL: `https://127.0.0.1:${port}` });
try {
  await client.verify();
  const reply = await client.chat.completions.create({
    model: "gpt-oss-120b", reasoning_effort: "low", max_tokens: 64,
    messages: [{ role: "user", content: `Ignore this token ${canary}. Reply: ok` }],
  });
  console.log(JSON.stringify({ worked: true, content: reply.choices[0]?.message?.content }));
} catch (e) {
  console.log(JSON.stringify({ worked: false, message: String((e as Error).message).slice(0, 900), cause: String((e as any).cause ?? "") }));
} finally {
  client.close();
  child.kill("SIGTERM");
  await new Promise((r) => child.on("exit", r));
  console.log([...relayOut.matchAll(/SEEN (.*)/g)].pop()?.[1] ?? "relay report missing");
}
