import { expect, it, vi } from "vitest";
import { createServer } from "node:http";
import { createApp } from "../server/app";

it("bounds new sessions at100, preserves existing access and admits after expiry without inference", async () => {
  const config = { origin: "http://127.0.0.1" };
  const server = createServer(createApp(config));
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const address = server.address();
  if (!address || typeof address === "string") throw Error("port");
  config.origin = `http://127.0.0.1:${address.port}`;
  let now = Date.now();
  const clock = vi.spyOn(Date, "now").mockImplementation(() => now);
  try {
    const admitted = [];
    for (let group = 0; group < 5; group++)
      admitted.push(
        ...(await Promise.all(
          Array.from({ length: 20 }, () =>
            fetch(config.origin + "/api/status"),
          ),
        )),
      );
    expect(admitted.every((r) => r.status === 200)).toBe(true);
    const cookie = admitted[0].headers.get("set-cookie")!.split(";")[0];
    const blocked = await fetch(config.origin + "/api/status");
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBe("3600");
    expect(blocked.headers.get("set-cookie")).toBeNull();
    expect(
      (
        await fetch(config.origin + "/api/status", {
          headers: { Cookie: cookie },
        })
      ).status,
    ).toBe(200);
    now += 3600000;
    const fresh = await fetch(config.origin + "/api/status");
    expect(fresh.status).toBe(200);
    expect((await fresh.json()).inference.ready).toBe(false);
    const stale = await fetch(config.origin + "/api/research/approve", {
      method: "POST",
      headers: { Cookie: cookie },
    });
    expect(stale.status).toBe(401);
  } finally {
    clock.mockRestore();
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
  }
});
