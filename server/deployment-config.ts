import { readFile, stat } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { z } from "zod";
import { parseSocialCredentials } from "./account-social";
import { attestationAuditDefaults } from "./attestation-audit-state";

const path = z.string().refine(isAbsolute);
const schema = z
  .object({
    mode: z.literal("restricted-deployment"),
    email: z.literal("disabled"),
    host: z.enum(["127.0.0.1", "0.0.0.0"]),
    port: z.number().int().min(1024).max(65535),
    assets: path,
    secretFile: path,
    socialCredentialsFile: path.optional(),
    allowedEmails: z.array(z.email().max(254)).min(1).max(10).optional(),
    renderBridge: z
      .object({
        keyFile: path,
        certFile: path,
        caFile: path,
        servername: z.string().min(1).max(253),
      })
      .strict()
      .optional(),
    databaseUrlFile: path,
    databaseCaFile: path.optional(),
    tlsKeyFile: path,
    tlsCertFile: path,
    clientCaFile: path,
    peerCertificateSha256: z
      .array(z.string().regex(/^[a-f0-9]{64}$/))
      .min(1)
      .max(2),
    // Relay-side, block-only attestation audit (server/attestation-audit.ts).
    attestationAudit: z
      .object({
        enabled: z.boolean(),
        origin: z
          .string()
          .url()
          .refine((value) => {
            const u = new URL(value);
            return (
              u.protocol === "https:" &&
              !u.username &&
              !u.password &&
              u.port === "" &&
              u.pathname === "/" &&
              !u.search &&
              !u.hash
            );
          }),
        repository: z.string().regex(/^tinfoilsh\/[a-zA-Z0-9_-]+$/),
        releaseDigests: z
          .array(z.string().regex(/^[a-f0-9]{64}$/))
          .min(1)
          .max(4),
        binary: path.optional(),
        intervalMinutes: z.number().int().min(15).max(1440).optional(),
        maxAgeMinutes: z.number().int().min(15).max(10080).optional(),
        timeoutSeconds: z.number().int().min(5).max(300).optional(),
      })
      .strict()
      .refine(
        (audit) =>
          (audit.maxAgeMinutes ?? attestationAuditDefaults.maxAgeMinutes) >=
          (audit.intervalMinutes ?? attestationAuditDefaults.intervalMinutes),
        "Attestation audit maximum age must cover at least one interval.",
      )
      .optional(),
  })
  .strict()
  .refine(
    (config) => !config.socialCredentialsFile || !!config.allowedEmails,
    "Restricted social sign-in requires an identity allowlist.",
  )
  .refine(
    (config) =>
      !config.renderBridge ||
      (config.host === "127.0.0.1" && !!config.allowedEmails),
    "Render bridge requires loopback and restricted identities.",
  );

async function boundedFile(file: string) {
  if (!isAbsolute(file)) throw Error("Invalid file path.");
  const info = await stat(file);
  if (!info.isFile() || info.size < 1 || info.size > 65536)
    throw Error("Invalid file size.");
  const data = await readFile(file);
  if (data.length > 65536) throw Error("Invalid file size.");
  return data;
}

export async function loadDeploymentConfig(file: string) {
  try {
    const config = schema.parse(
      JSON.parse((await boundedFile(file)).toString("utf8")),
    );
    const secret = (await boundedFile(config.secretFile))
      .toString("utf8")
      .trim();
    const connectionString = (await boundedFile(config.databaseUrlFile))
      .toString("utf8")
      .trim();
    const databaseUrl = new URL(connectionString);
    if (
      secret.length < 32 ||
      !["postgres:", "postgresql:"].includes(databaseUrl.protocol) ||
      databaseUrl.search ||
      databaseUrl.hash ||
      !databaseUrl.username ||
      !databaseUrl.pathname.slice(1)
    )
      throw Error("Invalid database or authentication configuration.");
    if (
      !config.databaseCaFile &&
      !["127.0.0.1", "localhost", "[::1]"].includes(databaseUrl.hostname)
    )
      throw Error("Remote database requires explicit TLS trust.");
    return {
      ...config,
      secret,
      attestationAudit: config.attestationAudit
        ? { ...attestationAuditDefaults, ...config.attestationAudit }
        : undefined,
      renderBridge: config.renderBridge
        ? {
            key: await boundedFile(config.renderBridge.keyFile),
            cert: await boundedFile(config.renderBridge.certFile),
            ca: await boundedFile(config.renderBridge.caFile),
            servername: config.renderBridge.servername,
          }
        : undefined,
      social: config.socialCredentialsFile
        ? parseSocialCredentials(
            JSON.parse(
              (await boundedFile(config.socialCredentialsFile)).toString(
                "utf8",
              ),
            ),
          )
        : undefined,
      connectionString,
      databaseCa: config.databaseCaFile
        ? await boundedFile(config.databaseCaFile)
        : undefined,
      tls: {
        key: await boundedFile(config.tlsKeyFile),
        cert: await boundedFile(config.tlsCertFile),
        ca: await boundedFile(config.clientCaFile),
      },
    };
  } catch {
    throw Error("Deployment configuration unavailable or invalid.");
  }
}
