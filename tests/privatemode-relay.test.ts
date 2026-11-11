// Offline rules of the Privatemode relay (spike): key injection, model allowlist,
// forwarded headers. A local fake upstream stands in for api.privatemode.ai.
import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, expect, it } from "vitest";
import express from "express";
import { privatemodeRelay } from "../server/providers/privatemode-relay";

const received: { path: string; headers: Record<string, unknown>; body: string }[] = [];
let upstream: Server, app: Server, base: string;

beforeAll(async () => {
  upstream = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      received.push({ path: req.url!, headers: req.headers, body });
      res.setHeader("content-type", "application/octet-stream");
      res.setHeader("privatemode-oae-response-header", "nonce");
      res.setHeader("set-cookie", "upstream=1");
      res.end("ciphertext-reply");
    });
  });
  await new Promise<void>((r) => upstream.listen(0, "127.0.0.1", r));
  const relay = express();
  relay.use(
    privatemodeRelay({
      apiKey: "real-key",
      allowedModels: ["glm-5.3-flash"],
      manifest: () => new TextEncoder().encode("{}"),
      wasm: () => new Uint8Array([0, 97, 115, 109]),
      upstream: `http://127.0.0.1:${(upstream.address() as { port: number }).port}`,
    }),
  );
  relay.use((_req, res) => res.status(404).end());
  app = relay.listen(0, "127.0.0.1");
  await new Promise((r) => app.once("listening", r));
  base = `http://127.0.0.1:${(app.address() as { port: number }).port}`;
});

afterAll(async () => {
  await new Promise((r) => app.close(r));
  await new Promise((r) => upstream.close(r));
});

const post = (path: string, headers: Record<string, string>) =>
  fetch(base + path, { method: "POST", headers, body: "opaque-bytes" });

it("replaces the placeholder with the real key and forwards only routing headers", async () => {
  received.length = 0;
  const reply = await post("/v1/chat/completions", {
    authorization: "Bearer relay-injects-the-key",
    "privatemode-target-model": "glm-5.3-flash",
    cookie: "session=secret",
    "x-privateai-csrf": "token",
  });
  expect(reply.status).toBe(200);
  expect(await reply.text()).toBe("ciphertext-reply");
  expect(reply.headers.get("privatemode-oae-response-header")).toBe("nonce");
  expect(reply.headers.get("set-cookie")).toBeNull();
  const [forwarded] = received;
  expect(forwarded.headers.authorization).toBe("Bearer real-key");
  expect(forwarded.headers.cookie).toBeUndefined();
  expect(forwarded.headers["x-privateai-csrf"]).toBeUndefined();
  expect(forwarded.body).toBe("opaque-bytes");
});

it("refuses a chat request for a model outside the allowlist without forwarding it", async () => {
  received.length = 0;
  for (const model of ["glm-5.3", ""]) {
    const reply = await post("/v1/chat/completions", {
      "privatemode-target-model": model,
    });
    expect(reply.status).toBe(403);
  }
  expect(received).toEqual([]);
});

it("forwards only Privatemode's three paths and serves the pinned assets", async () => {
  received.length = 0;
  expect((await post("/privatemode/v1/attest", {})).status).toBe(200);
  expect((await post("/privatemode/v1/secret", {})).status).toBe(200);
  expect((await post("/v1/models", {})).status).toBe(404);
  expect((await post("/privatemode/v1/other", {})).status).toBe(404);
  expect(received.map((r) => r.path)).toEqual([
    "/privatemode/v1/attest",
    "/privatemode/v1/secret",
  ]);
  const manifest = await fetch(`${base}/api/privatemode/manifest`);
  expect(manifest.headers.get("cache-control")).toBe("no-store");
  expect(await manifest.text()).toBe("{}");
});
