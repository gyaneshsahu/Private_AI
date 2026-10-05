import { expect, it, vi } from "vitest";
import { createServer } from "node:http";
import { createApp } from "../server/app";
import { InviteRegistry } from "../server/invite-registry";

it("bounds concurrent sign-ins, releases failed checks and retains safe recovery forms", async () => {
  const registry = new InviteRegistry(":memory:");
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw Error("port");
  const origin = `http://127.0.0.1:${address.port}`;
  server.on("request", createApp({ origin, invites: registry }));
  const invite = registry.issue(Date.now() + 60000);
  const password = "SYNTHETIC_SECRET_NEVER_REFLECT";
  const body = new URLSearchParams({ id: invite.id, password }).toString();
  const post = (payload = body, path = "/auth/login") =>
    fetch(origin + path, {
      method: "POST",
      redirect: "manual",
      headers: {
        Origin: origin,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: payload,
    });
  const pending: Array<{
    resolve: (value: boolean) => void;
    reject: (reason: Error) => void;
  }> = [];
  const login = vi
    .spyOn(registry, "login")
    .mockImplementation(
      () =>
        new Promise<boolean>((resolve, reject) =>
          pending.push({ resolve, reject }),
        ),
    );
  try {
    const first = post();
    await vi.waitFor(() => expect(pending).toHaveLength(1));
    const second = post();
    await vi.waitFor(() => expect(pending).toHaveLength(2));
    const busy = await post();
    expect(busy.status).toBe(503);
    expect(busy.headers.get("retry-after")).toBe("5");
    expect(await busy.text()).toContain("Sign-in is busy");
    expect(login).toHaveBeenCalledTimes(2);
    const registration = await post(
      body + "&token=" + encodeURIComponent(invite.token),
      "/auth/register",
    );
    expect(registration.status).toBe(503);
    expect(await registration.text()).not.toContain(invite.token);
    pending[0].reject(new Error("PRIVATE_STORAGE_PATH " + password));
    pending[1].resolve(false);
    const failed = await first;
    const html = await failed.text();
    expect(failed.status).toBe(503);
    expect(html).toContain('action="/auth/login"');
    expect(html).not.toContain(password);
    expect(html).not.toContain("PRIVATE_STORAGE_PATH");
    expect(failed.headers.get("set-cookie")).toBeNull();
    expect((await second).status).toBe(401);
    login.mockRestore();
    expect(await registry.register(invite.id, invite.token, password)).toBe(
      true,
    );
    expect((await post()).status).toBe(303);
    const oversized = await post(body + "&extra=" + "x".repeat(3000));
    expect(oversized.status).toBe(413);
    const oversizedHtml = await oversized.text();
    expect(oversizedHtml).toContain('action="/auth/login"');
    expect(oversizedHtml).not.toContain(password);
    expect(oversized.headers.get("cache-control")).toBe("no-store");
    expect((await post()).status).toBe(303);
    let rateLimited = false;
    for (let attempt = 0; attempt < 31; attempt++) {
      const response = await post("x=" + "x".repeat(3000));
      if (response.status === 429) {
        expect(response.headers.get("retry-after")).toBe("60");
        expect(await response.text()).toContain("Too many sign-in attempts");
        rateLimited = true;
        break;
      }
      expect(response.status).toBe(413);
      await response.text();
    }
    expect(rateLimited).toBe(true);
  } finally {
    login.mockRestore();
    pending.forEach((check) => check.resolve(false));
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    registry.close();
  }
});
