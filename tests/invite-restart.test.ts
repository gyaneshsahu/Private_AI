import { expect, it } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, unlink, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { InviteRegistry } from "../server/invite-registry";

it("retains credentials, revocation, quotas and pause across actual application process restarts while invalidating old sessions", async () => {
  const directory = await mkdtemp(
    join(tmpdir(), "privateai-restart-synthetic-"),
  );
  const file = join(directory, "invites.sqlite");
  const portProbe = createServer();
  await new Promise<void>((resolve) =>
    portProbe.listen(0, "127.0.0.1", resolve),
  );
  const address = portProbe.address();
  if (!address || typeof address === "string") throw Error("port");
  const port = address.port;
  await new Promise<void>((resolve) => portProbe.close(() => resolve()));
  const origin = `http://127.0.0.1:${port}`;
  const initialPassword = "SYNTHETIC initial process password";
  const replacement = "SYNTHETIC replacement process password";
  const registry = new InviteRegistry(file);
  const alice = registry.issue(Date.now() + 600000),
    bob = registry.issue(Date.now() + 600000);
  await registry.register(alice.id, alice.token, initialPassword);
  await registry.register(bob.id, bob.token, initialPassword);
  registry.close();
  let child: ChildProcess | undefined;
  const stop = async () => {
    if (!child || child.exitCode !== null || child.signalCode !== null) return;
    const running = child;
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        running.kill("SIGKILL");
        reject(Error("Synthetic server stop timeout"));
      }, 12000);
      running.once("exit", () => {
        clearTimeout(timeout);
        resolve();
      });
      running.kill("SIGTERM");
    });
    child = undefined;
  };
  const start = async () => {
    const env = {
      ...process.env,
      PORT: String(port),
      PRIVATEAI_ORIGIN: origin,
      PRIVATEAI_INVITES_FILE: file,
      PRIVATEAI_QUALIFICATION_FILE: join(
        directory,
        "absent-qualification.json",
      ),
    };
    for (const key of [
      "TINFOIL_API_KEY",
      "BRAVE_SEARCH_API_KEY",
      "PRIVATEAI_ACCESS_KEY",
    ])
      delete env[key as keyof typeof env];
    child = spawn(process.execPath, ["--import", "tsx", "server/index.ts"], {
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const running = child;
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(Error("Synthetic server startup timeout")),
        10000,
      );
      running.once("error", () => {
        clearTimeout(timeout);
        reject(Error("Synthetic server startup failed"));
      });
      running.once("exit", () => {
        clearTimeout(timeout);
        reject(Error("Synthetic server exited before ready"));
      });
      running.stdout!.on("data", (chunk) => {
        if (String(chunk).includes("listening on port")) {
          clearTimeout(timeout);
          resolve();
        }
      });
      running.stderr!.resume();
    });
  };
  const request = (
    path: string,
    cookie = "",
    fields?: Record<string, string>,
  ) =>
    fetch(origin + path, {
      method: fields ? "POST" : "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
      headers: {
        Cookie: cookie,
        ...(fields
          ? {
              Origin: origin,
              "Content-Type": "application/x-www-form-urlencoded",
            }
          : {}),
      },
      body: fields ? new URLSearchParams(fields).toString() : undefined,
    });
  const login = async (id: string, password: string, expected = 303) => {
    const response = await request("/auth/login", "", { id, password });
    expect(response.status).toBe(expected);
    await response.body?.cancel();
    return response.headers.get("set-cookie")?.split(";")[0] ?? "";
  };
  try {
    await start();
    const oldSession = await login(alice.id, initialPassword);
    const change = await request("/auth/password", oldSession, {
      password: initialPassword,
      replacement,
      confirmation: replacement,
    });
    expect(change.status).toBe(303);
    await change.body?.cancel();
    const beforeRestart = await login(alice.id, replacement);
    const bobSession = await login(bob.id, initialPassword);
    const operator = new InviteRegistry(file);
    operator.revoke(bob.id);
    for (let i = 0; i < 200; i++)
      expect(operator.allowRequest(alice.id)).toBe(true);
    operator.close();
    await stop();
    await start();
    for (const cookie of [oldSession, beforeRestart, bobSession]) {
      const denied = await request("/api/status", cookie);
      expect(denied.status).toBe(401);
      await denied.body?.cancel();
    }
    await login(alice.id, initialPassword, 401);
    await login(bob.id, initialPassword, 401);
    const fresh = await login(alice.id, replacement);
    const status = await request("/api/status", fresh);
    const payload = await status.json();
    expect(payload.accountId).toBe(alice.id);
    expect(payload.inference.ready).toBe(false);
    const limited = await request("/api/research/cancel", fresh, {
      id: "0".repeat(48),
    });
    expect(limited.status).toBe(429);
    await limited.body?.cancel();
    const pause = new InviteRegistry(file);
    pause.pause(true);
    pause.close();
    await stop();
    await start();
    await login(alice.id, replacement, 401);
    const paused = new InviteRegistry(file);
    expect(paused.paused).toBe(true);
    expect(paused.credentialVersion(alice.id)).toBe(1);
    paused.close();
  } finally {
    await stop();
    await unlink(file);
    await rmdir(directory);
  }
}, 30000);
