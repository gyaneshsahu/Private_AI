import { expect, it } from "vitest";
import express from "express";
import { createServer } from "node:http";
import { createApp } from "../server/app";
import { InviteRegistry } from "../server/invite-registry";
import { checkTrialAccess } from "../scripts/trial-access-check";

it("rehearses individual access over HTTP and redacts evidence on success and failure", async () => {
  const registry = new InviteRegistry(":memory:");
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw Error("port");
  const origin = `http://127.0.0.1:${address.port}`;
  const invite = registry.issue(Date.now() + 60000);
  const password = "SYNTHETIC_SMOKE_PASSWORD";
  await registry.register(invite.id, invite.token, password);
  const paths: string[] = [];
  let forceEnabled = false;
  let failLogout = false;
  const outer = express();
  outer.use((req, res, next) => {
    paths.push(req.method + " " + req.path);
    if (
      failLogout &&
      req.path === "/auth/logout" &&
      req.headers.origin === origin
    ) {
      res.status(503).end();
      return;
    }
    if (forceEnabled && req.path === "/api/status") {
      const send = res.json.bind(res);
      res.json = (body) =>
        send(body.accountId ? { ...body, inference: { ready: true } } : body);
    }
    next();
  });
  outer.use(createApp({ origin, invites: registry }));
  server.on("request", outer);
  try {
    const options = { origin, id: invite.id, password, local: true };
    const passed = await checkTrialAccess(options);
    expect(passed.result).toBe("PASSED");
    expect(passed.transport).toBe("LOCAL_HTTP");
    expect(passed.checks).toHaveLength(6);
    expect(passed.requests).toBe(8);
    expect(passed.logout).toBe("COMPLETED");
    expect(
      paths.every((path) =>
        /^(GET (\/|\/auth|\/api\/status)|POST \/auth\/(login|logout))$/.test(
          path,
        ),
      ),
    ).toBe(true);
    expect(
      (await checkTrialAccess({ ...options, local: false })).requests,
    ).toBe(0);
    const rejected = await checkTrialAccess({
      ...options,
      password: "WRONG_SYNTHETIC_PASSWORD",
    });
    expect(rejected.result).toBe("FAILED");
    expect(rejected.stage).toBe("SIGN_IN");
    expect(rejected.logout).toBe("NOT_NEEDED");
    forceEnabled = true;
    const failed = await checkTrialAccess(options);
    expect(failed.result).toBe("FAILED");
    expect(failed.stage).toBe("AUTHENTICATED_STATUS");
    expect(failed.logout).toBe("COMPLETED");
    forceEnabled = false;
    failLogout = true;
    const start = paths.length;
    const logoutFailure = await checkTrialAccess(options);
    expect(logoutFailure.result).toBe("FAILED");
    expect(logoutFailure.stage).toBe("LOGOUT");
    expect(logoutFailure.logout).toBe("FAILED");
    // One denied cross-origin probe and one explicit logout; no retry.
    expect(
      paths.slice(start).filter((path) => path === "POST /auth/logout"),
    ).toHaveLength(2);
    const evidence = JSON.stringify({ passed, rejected, failed });
    for (const secret of [
      invite.id,
      invite.token,
      password,
      "privateai-access=",
    ])
      expect(evidence).not.toContain(secret);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    registry.close();
  }
});

it("rejects non-exact or insecure hosted origins before sending credentials", async () => {
  for (const origin of [
    "http://example.com",
    "https://example.com/path",
    "https://user:pass@example.com",
    "invalid",
  ]) {
    const evidence = await checkTrialAccess({
      origin,
      id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
      password: "synthetic password",
    });
    expect(evidence.result).toBe("FAILED");
    expect(evidence.requests).toBe(0);
  }
});
