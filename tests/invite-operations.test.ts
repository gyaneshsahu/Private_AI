import { expect, it } from "vitest";
import { createServer } from "node:http";
import { mkdtemp, unlink, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { InviteRegistry } from "../server/invite-registry";
import { createApp } from "../server/app";

it("persists pause, revocation and request counts across registry reopen without listing credentials", async () => {
  const dir = await mkdtemp(join(tmpdir(), "privateai-synthetic-invites-"));
  const path = join(dir, "registry.sqlite");
  let registry = new InviteRegistry(path);
  try {
    const first = registry.issue(Date.now() + 60000),
      second = registry.issue(Date.now() + 60000);
    await registry.register(
      first.id,
      first.token,
      "SYNTHETIC_PASSWORD_NOT_REAL",
    );
    for (let i = 0; i < 200; i++)
      expect(registry.allowRequest(first.id)).toBe(true);
    registry.revoke(second.id);
    registry.pause(true);
    registry.close();
    registry = new InviteRegistry(path);
    expect(registry.paused).toBe(true);
    expect(registry.active(first.id)).toBe(false);
    expect(await registry.login(first.id, "SYNTHETIC_PASSWORD_NOT_REAL")).toBe(
      false,
    );
    const listed = JSON.stringify(registry.list());
    expect(listed).toContain("registered");
    expect(listed).toContain("revoked");
    expect(listed).not.toContain(first.token);
    expect(listed).not.toContain(second.token);
    expect(listed).not.toContain("SYNTHETIC_PASSWORD_NOT_REAL");
    expect(registry.list()[0]).not.toHaveProperty("password");
    expect(registry.list()[0]).not.toHaveProperty("salt");
    registry.pause(false);
    expect(await registry.login(first.id, "SYNTHETIC_PASSWORD_NOT_REAL")).toBe(
      true,
    );
    expect(registry.allowRequest(first.id)).toBe(false);
    expect(registry.active(second.id)).toBe(false);
    expect(registry.revoke("unknown")).toBe(false);
  } finally {
    registry.close();
    await unlink(path);
    await rmdir(dir);
  }
});

it("enforces per-user HTTP limits and closes active responses on pause or expiry", async () => {
  let now = Date.now();
  const registry = new InviteRegistry(":memory:", () => now);
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw Error("port");
  const origin = `http://127.0.0.1:${address.port}`;
  const app = createApp({ origin, invites: registry });
  app.post("/synthetic-operation", (_req, res) => res.status(204).end());
  app.get("/synthetic-held", (_req, res) => {
    res.type("text/plain").write("synthetic");
  });
  server.on("request", app);
  try {
    const register = async () => {
      const invite = registry.issue(now + 60000);
      const response = await fetch(origin + "/auth/register", {
        method: "POST",
        redirect: "manual",
        headers: {
          Origin: origin,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          id: invite.id,
          token: invite.token,
          password: "synthetic operations password",
        }),
      });
      expect(response.status).toBe(303);
      return response.headers.get("set-cookie")!.split(";")[0];
    };
    const alice = await register(),
      bob = await register();
    const post = (cookie: string) =>
      fetch(origin + "/synthetic-operation", {
        method: "POST",
        headers: { Origin: origin, Cookie: cookie },
      });
    for (let i = 0; i < 200; i++) expect((await post(alice)).status).toBe(204);
    expect((await post(alice)).status).toBe(429);
    expect((await post(bob)).status).toBe(204);
    const held = await fetch(origin + "/synthetic-held", {
      headers: { Cookie: bob },
    });
    registry.pause(true);
    expect((await post(bob)).status).toBe(401);
    await expect(held.text()).rejects.toThrow();
    registry.pause(false);
    expect((await post(bob)).status).toBe(204);
    expect((await post(alice)).status).toBe(429);
    const expiring = await fetch(origin + "/synthetic-held", {
      headers: { Cookie: bob },
    });
    now += 60001;
    await expect(expiring.text()).rejects.toThrow();
    expect((await post(bob)).status).toBe(401);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    registry.close();
  }
});
