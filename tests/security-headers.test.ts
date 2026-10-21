import { expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { createApp } from "../server/app";

it("sends the fixed security headers on every response, allowing the camera for this origin only", async () => {
  // Same shape as the served development app: no invite gate, no credentials.
  const config = { origin: "http://127.0.0.1" };
  const running = await new Promise<Server>((resolve) => {
    const s = createServer();
    s.listen(0, "127.0.0.1", () => resolve(s));
  });
  const address = running.address();
  if (!address || typeof address === "string") throw Error("port");
  config.origin = `http://127.0.0.1:${address.port}`;
  running.on("request", createApp(config));
  try {
    for (const path of ["/api/status", "/healthz", "/", "/missing"]) {
      const response = await fetch(config.origin + path, {
        redirect: "manual",
      });
      await response.body?.cancel();
      expect(response.headers.get("permissions-policy"), path).toBe(
        "camera=(self), microphone=(), geolocation=()",
      );
      expect(response.headers.get("cache-control"), path).toBe("no-store");
      expect(response.headers.get("referrer-policy"), path).toBe("no-referrer");
      expect(response.headers.get("x-content-type-options"), path).toBe(
        "nosniff",
      );
      expect(response.headers.get("x-frame-options"), path).toBe("DENY");
    }
  } finally {
    await new Promise((resolve) => running.close(resolve));
  }
});
