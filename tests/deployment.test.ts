import { afterEach, expect, it } from "vitest";
import { request, type Server } from "node:http";
// Native fetch overrides Host; HTTP requests model the trusted TLS edge explicitly.
async function fetch(
  url: string,
  options: {
    headers?: Record<string, string>;
    method?: string;
    body?: string;
  } = {},
) {
  return new Promise<Response>((resolve, reject) => {
    const req = request(
      url,
      { method: options.method, headers: options.headers },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const headers = new Headers();
          for (const [key, value] of Object.entries(res.headers))
            if (value !== undefined)
              headers.set(key, Array.isArray(value) ? value.join(", ") : value);
          resolve(
            new Response(Buffer.concat(chunks), {
              status: res.statusCode,
              headers,
            }),
          );
        });
      },
    );
    req.on("error", reject);
    req.end(options.body);
  });
}
import { createApp } from "../server/app";
import { InviteRegistry } from "../server/invite-registry";
const servers: Server[] = [];
const key = "synthetic_test_access_key_only_0123456789";
const origin = "https://privateai.example";
const authorized = {
  Host: "privateai.example",
  "X-Forwarded-Proto": "https",
  Authorization: `Basic ${Buffer.from(`evaluator:${key}`).toString("base64")}`,
};
afterEach(async () => {
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
async function start(invites?: InviteRegistry) {
  const app = createApp({ origin, accessKey: key, invites });
  app.get("/", (_req, res) => res.send("restricted app fixture"));
  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  servers.push(server);
  const address = server.address();
  if (!address || typeof address === "string") throw new Error();
  return `http://127.0.0.1:${address.port}`;
}
it("sets secure hosted invite cookies and cannot bypass individual access with the shared key", async () => {
  const registry = new InviteRegistry(":memory:");
  try {
    const root = await start(registry);
    expect(
      (await fetch(root + "/api/status", { headers: authorized })).status,
    ).toBe(401);
    const invite = registry.issue(Date.now() + 60000);
    const response = await fetch(root + "/auth/register", {
      method: "POST",
      headers: {
        ...authorized,
        Origin: origin,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        id: invite.id,
        token: invite.token,
        password: "synthetic hosted password",
      }).toString(),
    });
    expect(response.status).toBe(303);
    expect(response.headers.get("set-cookie")).toContain("Secure");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("SameSite=Strict");
  } finally {
    registry.close();
  }
});
it("refuses public startup without HTTPS, exact origin and strong access configuration", () => {
  for (const value of [
    "http://privateai.example",
    "https://privateai.example/",
    "https://privateai.example/path",
  ]) {
    expect(() => createApp({ origin: value, accessKey: key })).toThrow();
  }
  expect(() => createApp({ origin })).toThrow();
  expect(() => createApp({ origin, accessKey: "short" })).toThrow();
});
it("protects app and API, rejects wrong credentials and untrusted transport, and exposes only liveness", async () => {
  const root = await start();
  const health = await fetch(root + "/healthz");
  expect(await health.text()).toBe("ok");
  expect(health.headers.get("set-cookie")).toBeNull();
  for (const path of [
    "/",
    "/api/status",
    "/api/inference/v1/chat/completions",
  ]) {
    const response = await fetch(root + path, {
      headers: { Host: "privateai.example", "X-Forwarded-Proto": "https" },
    });
    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(await response.text()).not.toContain(key);
  }
  for (const headers of [
    {
      ...authorized,
      Authorization:
        "Basic " + Buffer.from("evaluator:wrong").toString("base64"),
    },
    { ...authorized, Authorization: "Basic !!!" },
  ])
    expect((await fetch(root + "/", { headers })).status).toBe(401);
  expect(
    (
      await fetch(root + "/", {
        headers: { ...authorized, "X-Forwarded-Proto": "http" },
      })
    ).status,
  ).toBe(403);
  expect(
    (
      await fetch(root + "/", {
        headers: { ...authorized, Host: "attacker.example" },
      })
    ).status,
  ).toBe(403);
  expect((await fetch(root + "/", { headers: authorized })).status).toBe(200);
});
it("retains secure sessions, CSRF, fail-closed inference and restart invalidation", async () => {
  const root = await start();
  const response = await fetch(root + "/api/status", { headers: authorized });
  const cookie = response.headers.get("set-cookie")!;
  expect(cookie).toContain("; Secure");
  expect(cookie).toContain("HttpOnly");
  const status = await response.json();
  expect(status.inference.ready).toBe(false);
  const headers = {
    ...authorized,
    Cookie: cookie.split(";")[0],
    "Content-Type": "application/json",
  };
  expect(
    (
      await fetch(root + "/api/research/prepare", {
        method: "POST",
        headers,
        body: "{}",
      })
    ).status,
  ).toBe(403);
  expect(
    (
      await fetch(root + "/api/inference/v1/chat/completions", {
        method: "POST",
        headers: { ...headers, "X-PrivateAI-CSRF": status.csrf },
        body: "{}",
      })
    ).status,
  ).toBe(503);
  const replacement = await start();
  expect(
    (
      await fetch(replacement + "/api/research/prepare", {
        method: "POST",
        headers: { ...headers, "X-PrivateAI-CSRF": status.csrf },
        body: "{}",
      })
    ).status,
  ).toBe(401);
});
