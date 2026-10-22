import { expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../server/app";
import { InviteRegistry } from "../server/invite-registry";

const FIXED = {
  "permissions-policy": "camera=(self), microphone=(), geolocation=()",
  "cache-control": "no-store",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
};

async function listen(): Promise<{ server: Server; origin: string }> {
  const server = await new Promise<Server>((resolve) => {
    const s = createServer();
    s.listen(0, "127.0.0.1", () => resolve(s));
  });
  const address = server.address();
  if (!address || typeof address === "string") throw Error("port");
  return { server, origin: `http://127.0.0.1:${address.port}` };
}

function expectFixedHeaders(response: Response, label: string) {
  for (const [name, value] of Object.entries(FIXED))
    expect(response.headers.get(name), `${label} ${name}`).toBe(value);
  // The health route replaces the policy with a stricter one; every other
  // response carries the application policy. Either way one is present.
  expect(
    response.headers.get("content-security-policy"),
    `${label} csp`,
  ).toMatch(/default-src '(self|none)'/);
}

it("sends the fixed security headers on every response, allowing the camera for this origin only", async () => {
  // Same shape as the served development app: no invite gate, no credentials.
  const { server, origin } = await listen();
  server.on("request", createApp({ origin }));
  try {
    for (const path of ["/api/status", "/healthz", "/", "/missing"]) {
      const response = await fetch(origin + path, { redirect: "manual" });
      await response.body?.cancel();
      expectFixedHeaders(response, path);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

it("carries the fixed headers on responses refused by the access gates (launch plan 7.4)", async () => {
  // Invite gate: a request for the wrong host is refused before any session,
  // API or static handling; the refusal must still carry every header.
  const directory = mkdtempSync(join(tmpdir(), "privateai-headers-"));
  const { server, origin } = await listen();
  const registry = new InviteRegistry(join(directory, "invites.sqlite"));
  server.on("request", createApp({ origin, invites: registry }));
  try {
    const crossSite = await fetch(origin + "/api/status", {
      headers: { "sec-fetch-site": "cross-site" },
      redirect: "manual",
    });
    await crossSite.body?.cancel();
    expect(crossSite.status).toBe(403);
    expectFixedHeaders(crossSite, "invite gate cross-site");
    const unauthenticated = await fetch(origin + "/api/status", {
      redirect: "manual",
    });
    await unauthenticated.body?.cancel();
    expect(unauthenticated.status).toBe(401);
    expectFixedHeaders(unauthenticated, "invite gate no session");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    registry.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

it("carries the fixed headers on the hosted transport refusal", async () => {
  // Hosted shape: HTTPS origin with a deployment access key; a plain request
  // from the loopback host is refused by the transport check first.
  const { server, origin: local } = await listen();
  server.on(
    "request",
    createApp({
      origin: "https://app.example.test",
      accessKey: "k".repeat(40),
    }),
  );
  try {
    const refused = await fetch(local + "/api/status", { redirect: "manual" });
    await refused.body?.cancel();
    expect(refused.status).toBe(403);
    expectFixedHeaders(refused, "transport refusal");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
