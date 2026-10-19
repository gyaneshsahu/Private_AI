import { it, expect } from "vitest";
import { Pool } from "pg";
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { X509Certificate } from "node:crypto";
import { request } from "node:https";
import { ingressTLS } from "./fixtures/ingress-tls";
import { applyAccountMigrations } from "../server/account-migrations";

it.runIf(!!process.env.PRIVATEAI_SYNTHETIC_INGRESS_TLS_DIR)(
  "runs the packaged restricted process through failure, recovery and restart",
  async () => {
    const tls = await ingressTLS();
    const database = new Pool({
      connectionString: process.env.PRIVATEAI_SYNTHETIC_PG,
    });
    const config = {
      mode: "restricted-deployment",
      email: "disabled",
      host: "127.0.0.1",
      port: 8443,
      assets: "/app/dist",
      secretFile: "/tmp/runtime-secret",
      databaseUrlFile: "/tmp/runtime-db",
      tlsKeyFile: "/fixtures/localhost.key",
      tlsCertFile: "/fixtures/localhost.pem",
      clientCaFile: "/fixtures/ca.pem",
      peerCertificateSha256: [
        new X509Certificate(tls.proxy.cert).fingerprint256
          .replaceAll(":", "")
          .toLowerCase(),
      ],
    };
    await writeFile("/tmp/runtime-config.json", JSON.stringify(config));
    await writeFile("/tmp/runtime-db", process.env.PRIVATEAI_SYNTHETIC_PG!);
    let child: ReturnType<typeof spawn> | undefined;
    let output = "";
    function start() {
      child = spawn(
        process.execPath,
        [
          "--import",
          "tsx",
          "server/deployment-entry.ts",
          "/tmp/runtime-config.json",
        ],
        { stdio: ["ignore", "pipe", "pipe"] },
      );
      child.stdout!.on("data", (data) => {
        output += data;
      });
      child.stderr!.on("data", (data) => {
        output += data;
      });
      const exit = new Promise<number | null>((done) =>
        child!.once("exit", done),
      );
      return exit;
    }
    function call(path: string, body?: unknown) {
      return new Promise<{ status: number; body: string }>((done, reject) => {
        const req = request(
          {
            hostname: "127.0.0.1",
            port: 8443,
            servername: "localhost",
            ca: tls.ca,
            ...tls.proxy,
            path,
            method: body ? "POST" : "GET",
            headers: {
              host: "app.cometrow.com",
              origin: "https://app.cometrow.com",
              "content-type": "application/json",
              "x-privateai-edge-client-ip": "203.0.113.8",
              "x-privateai-edge-proto": "https",
            },
          },
          (res) => {
            let data = "";
            res.on("data", (part) => {
              data += part;
            });
            res.on("end", () => done({ status: res.statusCode!, body: data }));
          },
        );
        req.on("error", reject);
        req.setTimeout(6000, () => req.destroy(Error("Request timed out")));
        req.end(body ? JSON.stringify(body) : undefined);
      });
    }
    async function ready() {
      for (let i = 0; i < 50; i++) {
        try {
          if ((await call("/readyz")).status === 200) return;
        } catch {}
        await new Promise((done) => setTimeout(done, 100));
      }
      throw Error("Package did not become ready");
    }
    try {
      // Missing secret and missing schema must exit, not listen or auto-migrate.
      expect(await start()).toBe(1);
      await writeFile(
        config.secretFile,
        "SYNTHETIC_PACKAGE_SECRET_CANARY_123456789",
      );
      await writeFile(
        "/tmp/runtime-config.json",
        JSON.stringify({ ...config, email: "enabled" }),
      );
      expect(await start()).toBe(1);
      await writeFile("/tmp/runtime-config.json", JSON.stringify(config));
      await writeFile(
        "/tmp/runtime-db",
        "postgresql://synthetic:synthetic@127.0.0.1:65432/missing",
      );
      expect(await start()).toBe(1);
      await writeFile("/tmp/runtime-db", process.env.PRIVATEAI_SYNTHETIC_PG!);
      expect(await start()).toBe(1);
      expect(
        (
          await database.query(
            "SELECT to_regclass('privateai_schema_migrations') AS name",
          )
        ).rows[0].name,
      ).toBeNull();
      await applyAccountMigrations(database);
      let exit = start();
      await ready();
      expect((await call("/account")).body).toContain("<html");
      expect(
        (
          await call("/api/auth/email-otp/send-verification-otp", {
            email: "package@example.test",
            type: "sign-in",
          })
        ).status,
      ).toBe(503);
      const lock = await database.connect();
      try {
        await lock.query("BEGIN");
        await lock.query(
          "LOCK TABLE privateai_schema_migrations IN ACCESS EXCLUSIVE MODE",
        );
        expect((await call("/readyz")).status).toBe(503);
        expect((await call("/healthz")).status).toBe(200);
      } finally {
        await lock.query("ROLLBACK");
        lock.release();
      }
      await ready();
      child!.kill("SIGTERM");
      expect(await exit).toBe(0);
      await expect(call("/healthz")).rejects.toThrow();
      exit = start();
      await ready();
      expect((await call("/account")).status).toBe(200);
      child!.kill("SIGINT");
      expect(await exit).toBe(0);
      expect(output).not.toContain("SYNTHETIC_PACKAGE_SECRET_CANARY");
      expect(output).not.toContain("package@example.test");
      expect(output).not.toContain("local-synthetic-only");
    } finally {
      if (child && child.exitCode === null) child.kill("SIGKILL");
      await database.end();
    }
  },
  30000,
);
