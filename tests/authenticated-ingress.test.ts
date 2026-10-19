import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import express from "express";
import { Agent, createServer, request } from "node:https";
import {
  createServer as httpServer,
  request as httpRequest,
  type Server,
} from "node:http";
import { X509Certificate } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { ingressTLS } from "./fixtures/ingress-tls";
import { createMutualTlsIngress } from "../server/authenticated-ingress";

describe.runIf(
  process.env.PRIVATEAI_SYNTHETIC_INGRESS_TLS_DIR !== undefined ||
    process.env.PRIVATEAI_SYNTHETIC_INGRESS_TLS === "1",
)("isolated authenticated ingress", () => {
  let tls: Awaited<ReturnType<typeof ingressTLS>>;
  let secure: Server, plain: Server, unverified: Server;
  let connections = 0;
  const origin = "https://app.cometrow.com";
  const pin = (cert: Buffer) =>
    new X509Certificate(cert).fingerprint256.replaceAll(":", "").toLowerCase();
  beforeAll(async () => {
    tls = await ingressTLS();
    const pins = [pin(tls.proxy.cert)];
    const ingress = createMutualTlsIngress({
      origin,
      peerCertificateSha256: pins,
    });
    pins[0] = pin(tls.other.cert);
    const rotation = createMutualTlsIngress({
      origin,
      peerCertificateSha256: [pin(tls.proxy.cert), pin(tls.other.cert)],
    });
    const retired = createMutualTlsIngress({
      origin,
      peerCertificateSha256: [pin(tls.other.cert)],
    });
    const app = express()
      .use("/rotation", rotation.middleware, (req, res) =>
        res.json({ address: rotation.clientAddress(req) }),
      )
      .use("/retired", retired.middleware, (req, res) =>
        res.json({ address: retired.clientAddress(req) }),
      )
      .use(ingress.middleware)
      .get("/probe", (req, res) =>
        res.json({ address: ingress.clientAddress(req), headers: req.headers }),
      );
    secure = createServer(
      {
        ...tls.server,
        ca: tls.ca,
        requestCert: true,
        rejectUnauthorized: true,
      },
      app,
    );
    secure.on("secureConnection", () => connections++);
    plain = httpServer(app);
    unverified = createServer(
      { ...tls.server, requestCert: true, rejectUnauthorized: false },
      app,
    );
    for (const server of [secure, plain, unverified]) {
      server.listen(0, "127.0.0.1");
      await new Promise<void>((resolve) => server.once("listening", resolve));
    }
  }, 20000);
  afterAll(async () => {
    for (const server of [secure, plain, unverified])
      if (server)
        await new Promise<void>((resolve) => server.close(() => resolve()));
    await tls?.dispose();
  });
  function call(
    options: {
      address?: string;
      headers?: Record<string, string | string[]>;
      certificate?: "proxy" | "other" | "none";
      plaintext?: boolean;
      agent?: Agent;
      port?: number;
      path?: string;
      unverified?: boolean;
    } = {},
  ) {
    const listener = (
      options.unverified ? unverified : options.plaintext ? plain : secure
    ).address();
    const port =
      options.port ??
      (listener && typeof listener !== "string" ? listener.port : undefined);
    if (!port) throw Error("Missing listener");
    const certificate =
      options.certificate === "none" ? {} : tls[options.certificate ?? "proxy"];
    return new Promise<{ status: number; body: string }>((resolve, reject) => {
      const req = (options.plaintext ? httpRequest : request)(
        {
          hostname: "127.0.0.1",
          port,
          path: options.path ?? "/probe",
          method: "GET",
          agent: options.agent ?? false,
          servername: "localhost",
          timeout: 3000,
          ...certificate,
          ca: tls.ca,
          rejectUnauthorized: true,
          headers: {
            host: "app.cometrow.com",
            "x-privateai-edge-client-ip": options.address ?? "203.0.113.8",
            "x-privateai-edge-proto": "https",
            ...options.headers,
          },
        },
        (res) => {
          let body = "";
          res.setEncoding("utf8");
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => resolve({ status: res.statusCode!, body }));
          res.on("error", reject);
        },
      );
      req.on("timeout", () => req.destroy(Error("Synthetic request timeout")));
      req.on("error", reject);
      req.end();
    });
  }
  it("requires a verified pinned client certificate and ignores spoofed forwarded identities", async () => {
    const result = await call({
      headers: {
        "x-forwarded-for": "198.51.100.9",
        forwarded: "for=198.51.100.9",
        "x-privateai-client-ip": "198.51.100.9",
      },
    });
    expect(result.status).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.address).toBe("203.0.113.8");
    expect(body.headers["x-forwarded-for"]).toBeUndefined();
    expect(body.headers["x-privateai-client-ip"]).toBeUndefined();
    expect(body.headers["x-privateai-edge-client-ip"]).toBeUndefined();
  });
  it("rejects direct HTTP and an unpinned certificate from the same valid CA", async () => {
    expect((await call({ plaintext: true })).status).toBe(403);
    expect((await call({ certificate: "other" })).status).toBe(403);
    await expect(call({ certificate: "none" })).rejects.toThrow();
    expect((await call({ unverified: true })).status).toBe(403);
  });
  it("supports a two-certificate rotation window and rejects the retired pin", async () => {
    for (const certificate of ["proxy", "other"] as const)
      expect((await call({ path: "/rotation", certificate })).status).toBe(200);
    expect(
      (await call({ path: "/retired", certificate: "proxy" })).status,
    ).toBe(403);
    expect(
      (await call({ path: "/retired", certificate: "other" })).status,
    ).toBe(200);
  });
  it.each([
    "198.51.100.2, 198.51.100.3",
    "unknown",
    "127.0.0.1:80",
    "fe80::1%eth0",
    "",
  ])("rejects invalid client-address metadata %s", async (address) => {
    expect((await call({ address })).status).toBe(403);
  });
  const invalidHeaders: Array<Record<string, string | string[]>> = [
    { host: "other.example" },
    { "x-privateai-edge-proto": "http" },
    { "x-privateai-edge-proto": ["https", "https"] },
    { "x-privateai-edge-client-ip": ["203.0.113.8", "203.0.113.8"] },
  ];
  it.each(invalidHeaders)(
    "rejects inconsistent or duplicate edge headers %j",
    async (headers) => {
      expect((await call({ headers })).status).toBe(403);
    },
  );
  it("normalizes equivalent IPv6 and IPv4-mapped addresses", async () => {
    expect(
      JSON.parse((await call({ address: "::ffff:203.0.113.8" })).body).address,
    ).toBe("203.0.113.8");
    expect(
      JSON.parse((await call({ address: "2001:0db8:0:0:0:0:0:1" })).body)
        .address,
    ).toBe("2001:db8::1");
  });
  it("checks certificate validity per request rather than trusting a prior handshake forever", async () => {
    const agent = new Agent({ keepAlive: true });
    expect((await call({ agent })).status).toBe(200);
    const connected = connections;
    const clock = vi
      .spyOn(Date, "now")
      .mockReturnValue(
        Date.parse(new X509Certificate(tls.proxy.cert).validTo) + 1000,
      );
    try {
      expect((await call({ agent })).status).toBe(403);
      expect(connections).toBe(connected);
    } finally {
      clock.mockRestore();
      agent.destroy();
    }
  });
  it("rejects unsafe configuration", () => {
    for (const config of [
      {
        origin: "http://app.cometrow.com",
        peerCertificateSha256: ["a".repeat(64)],
      },
      { origin, peerCertificateSha256: [] },
      { origin, peerCertificateSha256: ["*ignore*"] },
      { origin, peerCertificateSha256: ["a".repeat(64), "a".repeat(64)] },
    ])
      expect(() => createMutualTlsIngress(config)).toThrow();
  });

  it.skipIf(!process.env.PRIVATEAI_SYNTHETIC_CADDY)(
    "real Caddy overwrites forged identity and uses verified mutual TLS without content logs",
    async () => {
      const executable = process.env.PRIVATEAI_SYNTHETIC_CADDY!;
      expect(
        execFileSync(executable, ["version"], { encoding: "utf8" }),
      ).toContain("v2.11.7");
      const address = secure.address();
      if (!address || typeof address === "string")
        throw Error("No upstream port");
      await mkdir(".local", { recursive: true });
      const config = ".local/ingress-caddy-test.conf";
      await writeFile(
        config,
        `{
    admin off
    auto_https off
    persist_config off
    log default {
      output discard
    }
    servers {
      protocols h1
    }
  }
  https://localhost:9443 {
    bind 127.0.0.1
    tls /fixtures/localhost.pem /fixtures/localhost.key
    reverse_proxy https://127.0.0.1:${address.port} {
      header_up Host app.cometrow.com
      header_up X-PrivateAI-Edge-Client-IP {remote_host}
      header_up X-PrivateAI-Edge-Proto {scheme}
      header_up -Forwarded
      header_up -X-Forwarded-For
      header_up -X-Forwarded-Host
      header_up -X-Forwarded-Proto
      header_up -X-Real-IP
      header_up -X-PrivateAI-Client-IP
      transport http {
        tls_server_name localhost
        tls_trust_pool file {
          pem_file /fixtures/ca.pem
        }
        tls_client_auth /fixtures/proxy.pem /fixtures/proxy.key
        versions 1.1
        keepalive off
        network_proxy none
        dial_timeout 2s
        tls_timeout 2s
        response_header_timeout 3s
      }
    }
  }
  `,
      );
      execFileSync(
        executable,
        ["validate", "--config", config, "--adapter", "caddyfile"],
        { stdio: "pipe", timeout: 5000 },
      );
      const caddyProcess = spawn(
        executable,
        ["run", "--config", config, "--adapter", "caddyfile"],
        { stdio: ["ignore", "pipe", "pipe"] },
      );
      let logs = "";
      caddyProcess.stdout.on("data", (data) => {
        logs = (logs + data).slice(-65536);
      });
      caddyProcess.stderr.on("data", (data) => {
        logs = (logs + data).slice(-65536);
      });
      const exited = new Promise<void>((resolve) =>
        caddyProcess.once("exit", () => resolve()),
      );
      try {
        let ready = false;
        for (let i = 0; i < 30; i++) {
          try {
            ready =
              (
                await call({
                  port: 9443,
                  certificate: "none",
                  headers: { host: "localhost:9443" },
                })
              ).status === 200;
          } catch {}
          if (ready) break;
          if (caddyProcess.exitCode !== null)
            throw Error("Caddy stopped before readiness");
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        expect(ready).toBe(true);
        const result = await call({
          port: 9443,
          certificate: "none",
          address: "198.51.100.9",
          headers: {
            host: "localhost:9443",
            "x-privateai-edge-proto": "http",
            "x-forwarded-for": "198.51.100.9",
            authorization: "Bearer SYNTHETIC_INGRESS_LOG_CANARY",
            cookie: "session=SYNTHETIC_INGRESS_LOG_CANARY",
          },
        });
        expect(result.status).toBe(200);
        expect(JSON.parse(result.body).address).toBe("127.0.0.1");
        expect(
          JSON.parse(result.body).headers["x-forwarded-for"],
        ).toBeUndefined();
        expect(logs).not.toContain("SYNTHETIC_INGRESS_LOG_CANARY");
        await new Promise<void>((resolve) => secure.close(() => resolve()));
        const outage = await call({
          port: 9443,
          certificate: "none",
          headers: {
            host: "localhost:9443",
            authorization: "Bearer SYNTHETIC_INGRESS_LOG_CANARY",
          },
        });
        expect(outage.status).toBe(502);
      } finally {
        caddyProcess.kill("SIGTERM");
        const timer = setTimeout(() => caddyProcess.kill("SIGKILL"), 2000);
        await exited;
        clearTimeout(timer);
        await unlink(config);
      }
      expect(logs).not.toContain("SYNTHETIC_INGRESS_LOG_CANARY");
    },
  );
});
