import { Pool } from "pg";
import { loadDeploymentConfig } from "./deployment-config";
import { prepareProductionRuntime } from "./production-runtime";

let database: Pool | undefined;
let runtime: Awaited<ReturnType<typeof prepareProductionRuntime>> | undefined;
let stopping = false;
async function stop(code: number) {
  if (stopping) return;
  stopping = true;
  const deadline = setTimeout(() => process.exit(1), 15_000);
  try {
    const result = await runtime?.stop(10_000);
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
    ingress: { peerCertificateSha256: config.peerCertificateSha256 },
    deliverCode: async () => {
      throw Error("Email delivery disabled.");
    },
  });
  if (stopping) throw Error("Stopping.");
  await runtime.listen(config.port, config.host);
  process.stdout.write(
    "PrivateAI restricted deployment listening; email and inference disabled.\n",
  );
} catch {
  process.stderr.write("PrivateAI restricted deployment startup failed.\n");
  await stop(1);
}
