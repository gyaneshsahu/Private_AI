// Qualification step b: does Privatemode accept a short-lived JWT that our own server
// signed? No API key is used here; synthetic one-word prompt. Expected outcome is
// recorded either way.
import { createHmac, randomBytes } from "node:crypto";
import { PrivatemodeAI } from "privatemode-ai";

const b64 = (v: object | Buffer) =>
  (Buffer.isBuffer(v) ? v : Buffer.from(JSON.stringify(v))).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const unsigned = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ iss: "https://app.cometrow.com", sub: "synthetic-user", aud: "privatemode", iat: now, exp: now + 600 })}`;
const jwt = `${unsigned}.${b64(createHmac("sha256", randomBytes(32)).update(unsigned).digest())}`;

const client = new PrivatemodeAI({ auth: () => ({ type: "jwt", value: jwt }) });
try {
  await client.verify();
  const reply = await client.chat.completions.create({
    model: "gpt-oss-120b",
    reasoning_effort: "low",
    max_tokens: 8,
    messages: [{ role: "user", content: "Reply: ok" }],
  });
  console.log(JSON.stringify({ accepted: true, content: reply.choices[0]?.message?.content }));
} catch (error) {
  const e = error as { status?: number; message?: string };
  console.log(JSON.stringify({ accepted: false, status: e.status, message: String(e.message).slice(0, 200) }));
} finally {
  client.close();
}
