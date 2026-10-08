import { expect, it } from "vitest";
import express from "express";
import { createServer } from "node:http";
import { InviteRegistry } from "../server/invite-registry";
import { createApp } from "../server/app";
import { checkTrialIsolation } from "../scripts/trial-isolation-check";

it("checks both identities and catches faulty isolation without executing research or exposing credentials", async () => {
  const registry = new InviteRegistry(":memory:");
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw Error("port");
  const origin = `http://127.0.0.1:${address.port}`;
  const identities = [0, 1].map((index) => {
    const invitation = registry.issue(Date.now() + 600000);
    return { ...invitation, password: `SYNTHETIC isolation password ${index}` };
  });
  for (const identity of identities)
    await registry.register(identity.id, identity.token, identity.password);
  let defect = "none",
    logoutCount = 0;
  const paths: string[] = [];
  const outer = express();
  outer.use((req, res, next) => {
    paths.push(req.method + " " + req.path);
    if (req.path === "/auth/logout") {
      logoutCount++;
      if (defect === "logout") {
        res.status(503).end();
        return;
      }
    }
    const json = res.json.bind(res);
    res.json = (payload) => {
      if (
        defect === "crossed" &&
        req.originalUrl === "/api/research/cancel" &&
        res.statusCode === 401
      )
        res.status(200);
      if (
        defect === "identity" &&
        req.path === "/api/status" &&
        payload.accountId === identities[1].id
      )
        return json({ ...payload, accountId: identities[0].id });
      if (defect === "enabled" && payload.accountId)
        return json({ ...payload, inference: { ready: true } });
      if (
        defect === "csrf" &&
        req.originalUrl === "/api/research/cancel" &&
        res.statusCode === 403
      )
        res.status(200);
      return json(payload);
    };
    next();
  });
  outer.use(createApp({ origin, invites: registry }));
  server.on("request", outer);
  const options = {
    origin,
    local: true,
    identities: identities as [
      (typeof identities)[number],
      (typeof identities)[number],
    ],
  };
  try {
    const passed = await checkTrialIsolation(options);
    expect(passed.result, JSON.stringify(passed)).toBe("PASSED");
    expect(passed.requests).toBe(16);
    expect(passed.checks).toHaveLength(6);
    expect(passed.logout).toEqual(["COMPLETED", "COMPLETED"]);
    defect = "crossed";
    const crossed = await checkTrialIsolation(options);
    expect(crossed.result).toBe("FAILED");
    expect(crossed.stage).toBe("CROSSED_SESSION_1");
    expect(crossed.logout).toEqual(["COMPLETED", "COMPLETED"]);
    defect = "identity";
    const confused = await checkTrialIsolation(options);
    expect(confused.result).toBe("FAILED");
    expect(confused.stage).toBe("IDENTITY_STATUS_2");
    expect(confused.logout).toEqual(["COMPLETED", "COMPLETED"]);
    defect = "enabled";
    const enabled = await checkTrialIsolation(options);
    expect(enabled.result).toBe("FAILED");
    expect(enabled.stage).toBe("IDENTITY_STATUS_1");
    expect(enabled.logout).toEqual(["COMPLETED", "NOT_NEEDED"]);
    defect = "csrf";
    const csrf = await checkTrialIsolation(options);
    expect(csrf.result).toBe("FAILED");
    expect(csrf.stage).toBe("CROSSED_CSRF_1");
    expect(csrf.logout).toEqual(["COMPLETED", "COMPLETED"]);
    defect = "logout";
    logoutCount = 0;
    const failedLogout = await checkTrialIsolation(options);
    expect(failedLogout.result).toBe("FAILED");
    expect(failedLogout.logout).toEqual(["FAILED", "FAILED"]);
    expect(logoutCount).toBe(2);
    expect(
      paths.every((path) =>
        /^(GET \/api\/status|POST \/auth\/(login|logout)|POST \/api\/research\/cancel)$/.test(
          path,
        ),
      ),
    ).toBe(true);
    const evidence = JSON.stringify({
      passed,
      crossed,
      confused,
      failedLogout,
    });
    for (const identity of identities)
      for (const secret of [
        identity.id,
        identity.token,
        identity.password,
        "privateai-access=",
        "privateai-session=",
      ])
        expect(evidence).not.toContain(secret);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    registry.close();
  }
});

it("rejects identical accounts and insecure or incomplete configuration before making requests", async () => {
  const identity = {
    id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
    password: "synthetic password",
  };
  for (const options of [
    {
      origin: "https://example.com",
      identities: [identity, identity] as [typeof identity, typeof identity],
    },
    {
      origin: "http://example.com",
      identities: [
        identity,
        { ...identity, id: "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb" },
      ] as [typeof identity, typeof identity],
    },
  ]) {
    const result = await checkTrialIsolation(options);
    expect(result.result).toBe("FAILED");
    expect(result.requests).toBe(0);
  }
});
