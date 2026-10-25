import { Pool } from "pg";
import { loadDeploymentConfig } from "./deployment-config";
import { prepareProductionRuntime } from "./production-runtime";
import { createRenderBridge } from "./render-bridge";
import { scheduleRequestPurge } from "./request-retention";
import {
  createDeploymentAttestationAudit,
  installAttestationAudit,
  type AttestationAuditState,
} from "./attestation-audit";

export async function startDeployment(render = false) {
  let bridge: ReturnType<typeof createRenderBridge> | undefined;
  let audit: AttestationAuditState | undefined;
  let stopPurge: (() => void) | undefined;

  let database: Pool | undefined;
  let runtime: Awaited<ReturnType<typeof prepareProductionRuntime>> | undefined;
  let stopping = false;
  async function stop(code: number) {
    if (stopping) return;
    stopping = true;
    const deadline = setTimeout(() => process.exit(1), 15_000);
    try {
      audit?.stop();
      stopPurge?.();
      if (bridge) {
        bridge.close();
        bridge.closeIdleConnections();
      }
      const result = await runtime?.stop(10_000);
      bridge?.closeAllConnections();
      await database?.end();
      clearTimeout(deadline);
      process.exit(result?.drained === false ? 1 : code);
    } catch {
      process.exit(1);
    }
  }
  for (const signal of ["SIGTERM", "SIGINT"] as const)
    process.once(signal, () => void stop(0));

  try {
    if (process.argv.length !== 3) throw Error("Explicit config required.");
    const config = await loadDeploymentConfig(process.argv[2]);
    if (stopping) throw Error("Stopping.");
    if (render !== !!config.renderBridge)
      throw Error("Explicit matching entrypoint required.");
    const publicPort = Number(process.env.PORT ?? "10000");
    if (
      render &&
      (!Number.isInteger(publicPort) ||
        publicPort < 1024 ||
        publicPort > 65535 ||
        publicPort === config.port)
    )
      throw Error("Invalid bridge port.");
    database = new Pool({
      connectionString: config.connectionString,
      max: 10,
      connectionTimeoutMillis: 3000,
      ssl: config.databaseCa
        ? { ca: config.databaseCa, rejectUnauthorized: true }
        : false,
    });
    // Idle connection errors must not crash the process or expose PostgreSQL details.
    database.on("error", () => {});
    runtime = await prepareProductionRuntime({
      database,
      secret: config.secret,
      social: config.social,
      allowedEmails: config.allowedEmails,
      assets: config.assets,
      tls: config.tls,
      ingress: {
        peerCertificateSha256: config.peerCertificateSha256,
        admission: render ? "shared" : "client-ip",
      },
      emailEnabled: false,
      deliverCode: async () => {
        throw Error("Email delivery disabled.");
      },
    });
    if (stopping) throw Error("Stopping.");
    if (config.attestationAudit) {
      // Block-only relay audit; the guard in server/attestation-audit.ts
      // consults this state and refuses to forward while it is not current.
      // The first audit does not delay listening: the guard already refuses
      // until a success exists, and start() never rejects.
      audit = createDeploymentAttestationAudit(config.attestationAudit);
      installAttestationAudit(audit);
      void audit.start();
    }
    await runtime.listen(config.port, config.host);
    if (config.renderBridge) {
      bridge = createRenderBridge({
        ...config.renderBridge,
        port: config.port,
      });
      bridge.on("error", () => void stop(1));
      runtime.server.on("error", () => void stop(1));
      await new Promise<void>((done, reject) => {
        bridge!.once("error", reject);
        bridge!.listen(publicPort, "0.0.0.0", done);
      });
    }
    process.stdout.write(
      "PrivateAI restricted deployment listening; email and inference disabled.\n",
    );
    // Privacy policy: request records are deleted after 90 days (server/request-retention.ts).
    stopPurge = scheduleRequestPurge(database, (line) =>
      process.stdout.write(line),
    );
  } catch {
    process.stderr.write("PrivateAI restricted deployment startup failed.\n");
    await stop(1);
  }
}
