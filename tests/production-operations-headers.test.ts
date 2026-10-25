import express from "express";
import type { Pool } from "pg";
import { afterAll, expect, it } from "vitest";
import { productionOperations } from "../server/production-operations";

// The probes are answered before the app's header middleware, so they must
// carry the fixed security headers themselves (live header check, 25 October).
const failingPool = {
  connect: (callback: (error: Error) => void) => callback(new Error("no db")),
} as unknown as Pool;
const app = express();
const operations = productionOperations(failingPool);
app.use(operations.middleware);
const server = app.listen(0, "127.0.0.1");
const listening = new Promise<void>((done) => server.once("listening", done));
afterAll(() => new Promise<void>((done) => server.close(() => done())));

it("healthz and readyz carry the fixed security headers and no cookie", async () => {
  await listening;
  const address = server.address();
  if (!address || typeof address === "string") throw Error("port");
  for (const [path, status] of [
    ["/healthz", 200],
    ["/readyz", 503],
  ] as const) {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`);
    expect(response.status, path).toBe(status);
    expect(response.headers.get("set-cookie")).toBeNull();
    for (const [name, value] of [
      ["cache-control", "no-store"],
      ["referrer-policy", "no-referrer"],
      ["x-content-type-options", "nosniff"],
      ["x-frame-options", "DENY"],
      ["permissions-policy", "camera=(self), microphone=(), geolocation=()"],
      ["content-security-policy", "default-src 'none'"],
    ])
      expect(response.headers.get(name), `${path} ${name}`).toBe(value);
  }
});
