import { expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { request } from "undici";
import { createApp } from "../server/app";
import { InviteRegistry } from "../server/invite-registry";
it("enforces individual login, origin checks, session-bound grants, logout and revocation over HTTP", async () => {
  const registry = new InviteRegistry(":memory:");
  const config = { origin: "http://127.0.0.1", invites: registry };
  const running = await new Promise<Server>((resolve) => {
    const s = createServer();
    s.listen(0, "127.0.0.1", () => resolve(s));
  });
  const address = running.address();
  if (!address || typeof address === "string") throw Error("port");
  config.origin = `http://127.0.0.1:${address.port}`;
  const app = createApp(config);
  app.get("/held-response", (_req, res) => {
    res.type("text/plain");
    res.write("synthetic");
  });
  running.on("request", app);
  try {
    const root = config.origin;
    const alice = registry.issue(Date.now() + 60000),
      bob = registry.issue(Date.now() + 60000);
    const post = (path: string, body: string, cookie = "", origin = root) =>
      fetch(root + path, {
        method: "POST",
        redirect: "manual",
        headers: {
          Origin: origin,
          Cookie: cookie,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });
    expect((await fetch(root + "/api/status")).status).toBe(401);
    const externalNavigation = {
      "Sec-Fetch-Site": "cross-site",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Dest": "document",
    };
    const navigate = async (
      path: string,
      headers: Record<string, string> = externalNavigation,
    ) => {
      const response = await request(root + path, { method: "GET", headers });
      return {
        status: response.statusCode,
        headers: response.headers,
        text: await response.body.text(),
      };
    };
    const externalEntry = await navigate("/");
    expect(externalEntry.status).toBe(303);
    expect(externalEntry.headers.location).toBe("/auth");
    const externalSignIn = await navigate("/auth");
    expect(externalSignIn.status).toBe(200);
    expect(externalSignIn.text).toContain("Your conversation starts here.");
    expect(externalSignIn.headers["set-cookie"]).toBeUndefined();
    for (const path of ["/api/status", "/auth/password", "/assets/app.js"])
      expect((await navigate(path)).status).toBe(403);
    expect(
      (
        await navigate("/auth", {
          ...externalNavigation,
          "Sec-Fetch-Dest": "iframe",
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await navigate("/auth", {
          ...externalNavigation,
          Origin: "https://evil.example",
        })
      ).status,
    ).toBe(403);
    const data = (invite: typeof alice) =>
      new URLSearchParams({
        id: invite.id,
        token: invite.token,
        password: "synthetic login password",
      }).toString();
    expect(
      (await post("/auth/register", data(alice), "", "https://evil.example"))
        .status,
    ).toBe(403);
    expect(
      (
        await fetch(root + "/auth/register", {
          method: "POST",
          headers: {
            ...externalNavigation,
            Origin: root,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: data(alice),
        })
      ).status,
    ).toBe(403);
    const a = await post("/auth/register", data(alice));
    expect(a.status).toBe(303);
    const ac = a.headers.get("set-cookie")!.split(";")[0];
    expect(a.headers.get("set-cookie")).toContain("HttpOnly");
    expect(a.headers.get("set-cookie")).toContain("SameSite=Strict");
    expect((await post("/auth/register", data(alice))).status).toBe(401);
    const ast = await fetch(root + "/api/status", { headers: { Cookie: ac } });
    const as = await ast.json();
    expect(as.accountId).toBe(alice.id);
    expect(as.inference.ready).toBe(false);
    const apiCookie = ast.headers.get("set-cookie")!.split(";")[0];
    const b = await post("/auth/register", data(bob));
    const bc = b.headers.get("set-cookie")!.split(";")[0];
    const forged = await fetch(root + "/api/research/prepare", {
      method: "POST",
      headers: {
        Origin: root,
        Cookie: `${bc}; ${apiCookie}`,
        "Content-Type": "application/json",
        "X-PrivateAI-CSRF": as.csrf,
      },
      body: JSON.stringify({ kind: "page", value: "https://example.com/" }),
    });
    expect(forged.status).toBe(401);
    const freshLogin = await post(
      "/auth/login",
      new URLSearchParams({
        id: alice.id,
        password: "synthetic login password",
      }).toString(),
    );
    const freshCookie = freshLogin.headers.get("set-cookie")!.split(";")[0];
    const staleGrant = await fetch(root + "/api/research/prepare", {
      method: "POST",
      headers: {
        Origin: root,
        Cookie: `${freshCookie}; ${apiCookie}`,
        "Content-Type": "application/json",
        "X-PrivateAI-CSRF": as.csrf,
      },
      body: JSON.stringify({ kind: "page", value: "https://example.com/" }),
    });
    expect(staleGrant.status).toBe(401);
    const beforeLogout = await fetch(root + "/held-response", {
      headers: { Cookie: ac },
    });
    expect((await post("/auth/logout", "", ac)).status).toBe(204);
    await expect(beforeLogout.text()).rejects.toThrow();
    expect(
      (await fetch(root + "/api/status", { headers: { Cookie: ac } })).status,
    ).toBe(401);
    expect(
      (await fetch(root + "/api/status", { headers: { Cookie: freshCookie } }))
        .status,
    ).toBe(200);
    registry.revoke(alice.id);
    expect(
      (await fetch(root + "/api/status", { headers: { Cookie: ac } })).status,
    ).toBe(401);
    expect(
      (await fetch(root + "/api/status", { headers: { Cookie: bc } })).status,
    ).toBe(200);
    const held = await fetch(root + "/held-response", {
      headers: { Cookie: bc },
    });
    registry.revoke(bob.id);
    await expect(held.text()).rejects.toThrow();
    expect((await post("/auth/logout", "", bc)).status).toBe(204);
    expect(
      (await fetch(root + "/api/status", { headers: { Cookie: bc } })).status,
    ).toBe(401);
  } finally {
    running.closeAllConnections();
    await new Promise<void>((resolve) => running.close(() => resolve()));
    registry.close();
  }
});
