import { expect, it } from "vitest";
import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { mkdtemp, rm, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { InviteRegistry } from "../server/invite-registry";
import { createApp } from "../server/app";

it("migrates existing registries and atomically rotates credentials without renewing access or quotas", async () => {
  const directory = await mkdtemp(join(tmpdir(), "privateai-password-"));
  const file = join(directory, "registry.sqlite");
  const legacy = new DatabaseSync(file);
  legacy.exec(
    "CREATE TABLE invites(id TEXT PRIMARY KEY,invite TEXT,expires INTEGER NOT NULL,revoked INTEGER NOT NULL DEFAULT 0,salt TEXT,password TEXT,window INTEGER NOT NULL DEFAULT 0,requests INTEGER NOT NULL DEFAULT 0)",
  );
  legacy.close();
  let now = 10000000;
  let registry = new InviteRegistry(file, () => now);
  try {
    const account = registry.issue(now + 100000);
    await registry.register(
      account.id,
      account.token,
      "synthetic old password",
    );
    for (let i = 0; i < 200; i++) registry.allowRequest(account.id);
    const before = registry.list();
    expect(
      await registry.changePassword(
        account.id,
        0,
        "wrong",
        "synthetic replacement",
      ),
    ).toBe(false);
    expect(
      await registry.changePassword(
        account.id,
        0,
        "synthetic old password",
        "short",
      ),
    ).toBe(false);
    expect(
      await registry.changePassword(
        account.id,
        0,
        "synthetic old password",
        "synthetic old password",
      ),
    ).toBe(false);
    const results = await Promise.all([
      registry.changePassword(
        account.id,
        0,
        "synthetic old password",
        "synthetic replacement",
      ),
      registry.changePassword(
        account.id,
        0,
        "synthetic old password",
        "synthetic replacement",
      ),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(registry.list()).toEqual(before);
    expect(registry.allowRequest(account.id)).toBe(false);
    registry.close();
    registry = new InviteRegistry(file, () => now);
    expect(registry.credentialVersion(account.id)).toBe(1);
    expect(await registry.login(account.id, "synthetic old password")).toBe(
      false,
    );
    expect(await registry.login(account.id, "synthetic replacement")).toBe(
      true,
    );
    expect(
      await registry.register(
        account.id,
        account.token,
        "synthetic old password",
      ),
    ).toBe(false);
    expect(
      await registry.changePassword(
        account.id,
        0,
        "synthetic replacement",
        "synthetic third password",
      ),
    ).toBe(false);
    registry.pause(true);
    expect(
      await registry.changePassword(
        account.id,
        1,
        "synthetic replacement",
        "synthetic third password",
      ),
    ).toBe(false);
    registry.pause(false);
    now += 100001;
    expect(
      await registry.changePassword(
        account.id,
        1,
        "synthetic replacement",
        "synthetic third password",
      ),
    ).toBe(false);
  } finally {
    registry.close();
    await rm(file);
    await rmdir(directory);
  }
});

it("requires current credentials and same-origin access, invalidates all old sessions and active replies, and isolates other accounts", async () => {
  const registry = new InviteRegistry(":memory:");
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw Error("port");
  const origin = `http://127.0.0.1:${address.port}`;
  const app = createApp({ origin, invites: registry });
  app.get("/held", (_req, res) => {
    res.write("synthetic");
  });
  server.on("request", app);
  const post = (
    path: string,
    body: Record<string, string>,
    cookie = "",
    source = origin,
  ) =>
    fetch(origin + path, {
      method: "POST",
      redirect: "manual",
      headers: {
        Origin: source,
        Cookie: cookie,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(body),
    });
  const status = async (cookie: string) =>
    (await fetch(origin + "/api/status", { headers: { Cookie: cookie } }))
      .status;
  try {
    const alice = registry.issue(Date.now() + 600000),
      bob = registry.issue(Date.now() + 600000);
    for (const account of [alice, bob])
      await registry.register(
        account.id,
        account.token,
        "synthetic old password",
      );
    const login = async (id: string, password = "synthetic old password") => {
      const response = await post("/auth/login", { id, password });
      expect(response.status).toBe(303);
      return response.headers.get("set-cookie")!.split(";")[0];
    };
    const a1 = await login(alice.id),
      a2 = await login(alice.id),
      b = await login(bob.id);
    const body = {
      password: "synthetic old password",
      replacement: "synthetic new password",
      confirmation: "synthetic new password",
      id: bob.id,
    };
    expect((await post("/auth/password", body)).status).toBe(401);
    expect(
      (await post("/auth/password", body, a1, "https://evil.example")).status,
    ).toBe(403);
    expect((await fetch(origin + "/auth/password")).status).toBe(401);
    for (const invalid of [
      { ...body, password: "wrong" },
      { ...body, confirmation: "mismatch" },
    ]) {
      const response = await post("/auth/password", invalid, a1);
      expect(response.status).toBe(401);
      const html = await response.text();
      expect(html).not.toContain(body.replacement);
      expect(html).not.toContain(body.password);
    }
    const held = await fetch(origin + "/held", { headers: { Cookie: a2 } });
    const response = await post("/auth/password", body, a1);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/auth");
    await expect(held.text()).rejects.toThrow();
    expect(await status(a1)).toBe(401);
    expect(await status(a2)).toBe(401);
    expect(await status(b)).toBe(200);
    expect(
      (await post("/auth/login", { id: alice.id, password: body.password }))
        .status,
    ).toBe(401);
    const fresh = await login(alice.id, body.replacement);
    expect(await status(fresh)).toBe(200);
    expect(registry.credentialVersion(bob.id)).toBe(0);
    expect((await post("/auth/password", body, a1)).status).toBe(401);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    registry.close();
  }
});
