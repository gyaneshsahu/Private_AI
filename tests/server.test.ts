import { afterEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { createApp } from "../server/app";
const servers: Server[] = [];
afterEach(async () => {
  for (const s of servers.splice(0))
    await new Promise<void>((resolve) => s.close(() => resolve()));
});
async function setup() {
  // Host header is checked against this explicit evaluation origin.
  const config = { origin: "http://127.0.0.1" };
  const app = createApp(config);
  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  servers.push(server);
  const address = server.address();
  if (!address || typeof address === "string") throw new Error();
  const root = `http://127.0.0.1:${address.port}`;
  config.origin = root;
  const headers: Record<string, string> = {};
  const response = await fetch(root + "/api/status", { headers });
  const status = await response.json();
  headers.Cookie = response.headers.get("set-cookie")!.split(";")[0];
  headers["X-PrivateAI-CSRF"] = status.csrf;
  headers["Content-Type"] = "application/json";
  return { root, headers, status };
}
describe("actual HTTP boundaries (no live provider)", () => {
  it("reports disabled providers and blocks forwarding without qualification", async () => {
    const { root, headers, status } = await setup();
    expect(status.inference.ready).toBe(false);
    expect(status.search).toBe(false);
    const response = await fetch(root + "/api/inference/v1/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify({ messages: ["PRIVATE CANARY"] }),
    });
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("PRIVATE CANARY");
  });
  it("rejects cross-site requests and absent CSRF authorization", async () => {
    const { root, headers } = await setup();
    const r = await fetch(root + "/api/research/prepare", {
      method: "POST",
      headers: { ...headers, Origin: "https://attacker.example" },
      body: "{}",
    });
    expect(r.status).toBe(403);
    delete headers["X-PrivateAI-CSRF"];
    expect(
      (
        await fetch(root + "/api/research/prepare", {
          method: "POST",
          headers,
          body: "{}",
        })
      ).status,
    ).toBe(403);
  });
  it("rejects edited approved payloads, unavailable search and replay", async () => {
    const { root, headers } = await setup();
    const prepared = await (
      await fetch(root + "/api/research/prepare", {
        method: "POST",
        headers,
        body: JSON.stringify({ kind: "search", value: "public query" }),
      })
    ).json();
    expect(
      (
        await fetch(root + "/api/research/execute", {
          method: "POST",
          headers,
          body: JSON.stringify({ id: prepared.id, query: "private secret" }),
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await fetch(root + "/api/research/execute", {
          method: "POST",
          headers,
          body: JSON.stringify({ id: prepared.id }),
        })
      ).status,
    ).toBe(503);
    expect(
      (
        await fetch(root + "/api/research/execute", {
          method: "POST",
          headers,
          body: JSON.stringify({ id: prepared.id }),
        })
      ).status,
    ).toBe(400);
  });
  it("rejects loopback retrieval and returns no private diagnostics", async () => {
    const { root, headers } = await setup();
    const prepared = await (
      await fetch(root + "/api/research/prepare", {
        method: "POST",
        headers,
        body: JSON.stringify({
          kind: "page",
          value: "https://127.0.0.1/private-canary",
        }),
      })
    ).json();
    const response = await fetch(root + "/api/research/execute", {
      method: "POST",
      headers,
      body: JSON.stringify({ id: prepared.id }),
    });
    expect(response.status).toBe(400);
    expect(await response.text()).not.toContain("private-canary");
  });
});
