import { readFile, stat } from "node:fs/promises";
import { custodyMasterFromEnv } from "./custody";
import { isAbsolute } from "node:path";
import { z } from "zod";
import { parseSocialCredentials } from "./account-social";
import { attestationAuditDefaults } from "./attestation-audit-state";
import { parseKeyRing } from "./background-crypto";
import { PLAN_IDS, planFor, WEIGHT_VERSIONS } from "../shared/usage-config";

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
    // The owner, a test account and the alpha's 10 to 20 invitees (owner, 18 November).
    allowedEmails: z.array(z.email().max(254)).min(1).max(30).optional(),
    renderBridge: z
      .object({
        keyFile: path,
        certFile: path,
        caFile: path,
        servername: z.string().min(1).max(253),
        // The edge header that carries the visitor's address; set only after the live check
        // (docs/render-client-ip-20261125.md). Absent: sign-in limits share one bucket, as before.
        clientIpHeader: z.enum(["cf-connecting-ip", "true-client-ip"]).optional(),
      })
      .strict()
      .optional(),
    databaseUrlFile: path,
    // Production chat (step 4, 12 November): absent or disabled means no chat, as before.
    inference: z
      .object({
        enabled: z.boolean(),
        apiKeyFile: path,
        qualificationFile: path,
        stopFile: path,
        /** The approved Privatemode manifest; required exactly when the report names Privatemode. */
        manifestFile: path.optional(),
        /** Serve the attested live manifest when the report approves its digest (docs/manifest-rotation-20261114.md). Privatemode only. */
        liveManifest: z.boolean().optional(),
        /** Brave Search key: web search the user approves (owner decision R5). Absent means no search. */
        searchKeyFile: path.optional(),
        /** A text file shown to every user while it holds text (outage, announced provider switch). */
        noticeFile: path.optional(),
        /** Requests each signed-in account gets per period, renewed when a period ends (owner sets it). */
        allowance: z
          .object({
            requestLimit: z.number().int().min(1).max(10_000),
            days: z.number().int().min(1).max(31),
            /** Most allowance units in any rolling 24 hours; absent means only the period limit. */
            dailyLimit: z.number().int().min(1).max(10_000).optional(),
          })
          .strict()
          .optional(),
        /**
         * Voice input (dictation and live voice), its own switch, off unless enabled. It also needs
         * the report's `speech` model. Limits: seconds per chunk (each chunk is transcribed while
         * the user keeps talking), seconds per turn, and voice units (2 seconds each) per account
         * in any 24 hours (docs/voice-to-text-20261114.md).
         */
        voice: z
          .union([
            z
              .object({
                enabled: z.boolean(),
                chunkSeconds: z.number().int().min(10).max(30),
                maxTurnSeconds: z.number().int().min(30).max(300),
                dailyUnits: z.number().int().min(1).max(1000),
              })
              .strict(),
            // The 14 November shape is still read: 30-second chunks, the old recording length as
            // the turn maximum, the old daily minutes as units (30 per minute).
            z
              .object({
                enabled: z.boolean(),
                maxSeconds: z.number().int().min(10).max(300),
                dailyMinutes: z.number().int().min(1).max(120),
              })
              .strict()
              .transform((old) => ({
                enabled: old.enabled,
                chunkSeconds: 30,
                maxTurnSeconds: Math.max(30, old.maxSeconds),
                dailyUnits: Math.min(1000, old.dailyMinutes * 30),
              })),
          ])
          .optional(),
        /**
         * Image questions, their own switch, off unless enabled. They also need the report's
         * `vision` model. Limits: bytes of the JPEG the browser sends (the top of the range still
         * fits the Render bridge's 1 MB body limit), and image questions per account in any
         * 24 hours (docs/images-20261114.md).
         */
        images: z
          .object({
            enabled: z.boolean(),
            maxBytes: z.number().int().min(50_000).max(290_000),
            dailyImages: z.number().int().min(1).max(100),
          })
          .strict()
          .optional(),
        /**
         * Code execution on the user's device, its own switch, off unless enabled
         * (docs/code-execution-20261114.md). The server must know: it grants the follow-up credit.
         */
        code: z.object({ enabled: z.boolean() }).strict().optional(),
        /**
         * Image creation, its own switch, off unless enabled (docs/image-creation-20261117.md). Black
         * Forest Labs, EU endpoint; the key comes from its own secret file. `model` must be one the
         * price list (shared/usage-weights.json) prices; `dailyImages` per account a day.
         */
        imageCreation: z
          .object({
            enabled: z.boolean(),
            apiKeyFile: path,
            model: z.enum(["flux-2-klein", "flux-2-pro"]),
            dailyImages: z.number().int().min(1).max(50),
          })
          .strict()
          .optional(),
        /**
         * Usage metering, its own switch, off unless enabled (docs/usage-metering-20261115.md): weights
         * from shared/usage-weights.json, a usage record per request, the usage meter. `plan` (default
         * alpha) names a plan in shared/usage-plans.json whose quotas then replace `allowance` and the
         * daily limits of images, voice, deep research and background tasks written here.
         * `weightsVersion` (optional) pins a version of the weights file; absent, the newest version
         * whose date has passed charges (version 2 since 15 November: voice 1 unit per chunk).
         */
        metering: z
          .object({
            enabled: z.boolean(),
            plan: z.enum(PLAN_IDS as [string, ...string[]]).optional(),
            weightsVersion: z
              .number()
              .int()
              .refine((v) => WEIGHT_VERSIONS.includes(v), "Unknown weights version.")
              .optional(),
          })
          .strict()
          .optional(),
        /**
         * Deep research, its own switch, off unless enabled (docs/deep-research-20261114.md). It
         * also needs the search key. `cost`: allowance units one run uses. `dailyRuns` and
         * `dailySearches`: per account in any 24 hours; the search count includes ordinary
         * approved searches. `allowedEmails`: "premium only" without billing; when present, only
         * these accounts see and can use the feature.
         */
        research: z
          .object({
            enabled: z.boolean(),
            cost: z.number().int().min(2).max(20),
            dailyRuns: z.number().int().min(1).max(20),
            dailySearches: z.number().int().min(1).max(500),
            allowedEmails: z.array(z.email().max(254)).min(1).max(200).optional(),
          })
          .strict()
          .optional(),
        /**
         * Background tasks, the Auto mode of Scheduled, their own switch, off unless enabled
         * (docs/background-tasks-20261115.md). The server stores each task sealed under the key in
         * `keyFile` and runs it on schedule. `maxAutoTasks` per account; `runHourUtcWindow`: UTC
         * hours [from, to) in which runs may start (absent: any hour). The stop file stops them too.
         */
        /**
         * End-to-end encrypted vault sync, its own switch, off unless enabled
         * (docs/vault-sync-20261115.md). The server stores only ciphertext and wrapped keys.
         * `quotaMb` per account; `maxDevices` per account.
         */
        vaultSync: z
          .object({
            enabled: z.boolean(),
            quotaMb: z.number().int().min(10).max(2000),
            maxDevices: z.number().int().min(1).max(10),
            /**
             * Stage 3, project files as encrypted blobs; absent means files stay on their device.
             * `quotaMb` is the files' own quota per account (apart from the items' quota);
             * `maxFileMb` per file, at most the 25 MB of the design. With "s3" the bytes go to
             * S3-compatible object storage (Hetzner, EU); its keys come ONLY from the environment
             * (PRIVATEAI_BLOB_S3_ACCESS_KEY_ID, PRIVATEAI_BLOB_S3_SECRET_ACCESS_KEY), never this file.
             */
            blobs: z
              .object({
                store: z.enum(["postgres", "s3"]),
                quotaMb: z.number().int().min(10).max(10240).default(1024),
                maxFileMb: z.number().int().min(1).max(25).default(10),
                s3: z
                  .object({
                    endpoint: z.url({ protocol: /^https$/ }).max(200),
                    region: z.string().regex(/^[a-z0-9-]{2,32}$/),
                    bucket: z.string().regex(/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/),
                  })
                  .strict()
                  .optional(),
              })
              .strict()
              .refine((b) => (b.store === "s3") === !!b.s3, "s3 settings belong to store \"s3\" and are required for it.")
              .optional(),
          })
          .strict()
          .optional(),
        /**
         * Secure mode, its own switch, off unless enabled (docs/secure-store-20261116.md): saved
         * content is stored for the account under a key the server holds, wrapped under the master
         * key from the environment (PRIVATEAI_CUSTODY_KEY), never this file. `quotaMb` for items,
         * `filesQuotaMb` for project files, per account.
         */
        secureStore: z
          .object({
            enabled: z.boolean(),
            quotaMb: z.number().int().min(10).max(2000).default(200),
            filesQuotaMb: z.number().int().min(10).max(10240).default(1024),
          })
          .strict()
          .optional(),
        /**
         * Closed-account purge, its own switch, off unless enabled (docs/account-purge-20261116.md):
         * `graceDays` after a closure request the account and everything stored with it are deleted
         * (server/account-purge.ts). The retention period is the owner's decision; 7 is the table's minimum.
         */
        accountPurge: z
          .object({
            enabled: z.boolean(),
            graceDays: z.number().int().min(7).max(365).default(30),
          })
          .strict()
          .optional(),
        backgroundTasks: z
          .object({
            enabled: z.boolean(),
            maxAutoTasks: z.number().int().min(1).max(3),
            keyFile: path,
            runHourUtcWindow: z
              .object({ from: z.number().int().min(0).max(23), to: z.number().int().min(0).max(23) })
              .strict()
              .refine((w) => w.from !== w.to, "An empty window would stop every run.")
              .optional(),
          })
          .strict()
          .optional(),
      })
      .strict()
      .optional(),
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
        retryDelaysMinutes: z
          .array(z.number().int().min(1).max(60))
          .max(8)
          .optional(),
      })
      .strict()
      .refine(
        (audit) =>
          (audit.maxAgeMinutes ?? attestationAuditDefaults.maxAgeMinutes) >=
          (audit.intervalMinutes ?? attestationAuditDefaults.intervalMinutes),
        "Attestation audit maximum age must cover at least one interval.",
      )
      .refine(
        (audit) =>
          (audit.retryDelaysMinutes ?? attestationAuditDefaults.retryDelaysMinutes).every(
            (delay) =>
              delay <=
              (audit.intervalMinutes ?? attestationAuditDefaults.intervalMinutes),
          ),
        "Attestation audit retries must fit within one interval.",
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

type Quotas = {
  allowance?: { requestLimit: number; days: number; dailyLimit?: number };
  images?: { maxBytes: number; dailyImages: number };
  voice?: { chunkSeconds: number; maxTurnSeconds: number; dailyUnits: number };
  research?: { cost: number; dailyRuns: number; dailySearches: number; allowedEmails?: string[] };
  backgroundTasks?: { maxAutoTasks: number };
};
/** With metering on, the plan's quotas replace the allowance and the per-feature daily limits; a cap of 0 switches the feature off. */
export function withPlan<T extends Quotas>(
  inference: T,
  metering?: { enabled: boolean; plan?: string; weightsVersion?: number },
): T & { metering?: { plan: string; weightsVersion?: number } } {
  if (!metering?.enabled) return inference;
  const plan = planFor(metering.plan ?? "alpha");
  const c = plan.caps;
  const out: T & { metering?: { plan: string; weightsVersion?: number } } = {
    ...inference,
    metering: { plan: plan.id, ...(metering.weightsVersion !== undefined ? { weightsVersion: metering.weightsVersion } : {}) },
    allowance: { requestLimit: plan.units.period, days: plan.units.days, dailyLimit: plan.units.daily },
  };
  if (out.images) out.images = { ...out.images, dailyImages: c.imagesPerDay };
  // The plan names voice minutes; the voice budget counts 2-second units (30 per minute).
  if (out.voice) out.voice = { ...out.voice, dailyUnits: Math.min(1000, c.voiceMinutesPerDay * 30) };
  if (out.research) out.research = { ...out.research, dailyRuns: c.researchRunsPerDay, dailySearches: c.searchesPerDay };
  if (out.backgroundTasks) out.backgroundTasks = { ...out.backgroundTasks, maxAutoTasks: c.backgroundTasks };
  if (!c.imagesPerDay) delete out.images;
  if (!c.voiceMinutesPerDay) delete out.voice;
  if (!c.researchRunsPerDay) delete out.research;
  if (!c.backgroundTasks) delete out.backgroundTasks;
  return out;
}

/**
 * Vault sync Stage 3 settings in bytes. The object-storage keys are read from the environment only
 * (never the config file, which is strict and refuses them); a missing key stops the start.
 */
export function blobSettings(
  b: { store: "postgres" | "s3"; quotaMb: number; maxFileMb: number; s3?: { endpoint: string; region: string; bucket: string } },
  env: Record<string, string | undefined>,
) {
  const base = { quotaBytes: b.quotaMb * 1024 * 1024, maxFileBytes: b.maxFileMb * 1024 * 1024 };
  if (b.store !== "s3" || !b.s3) return base;
  const accessKeyId = env.PRIVATEAI_BLOB_S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.PRIVATEAI_BLOB_S3_SECRET_ACCESS_KEY?.trim();
  if (!accessKeyId || !secretAccessKey) throw Error("Object storage keys missing from the environment.");
  return { ...base, s3: { ...b.s3, accessKeyId, secretAccessKey } };
}

/** Secure mode settings in bytes. The master key comes from the environment only; a missing or malformed one stops the start. */
export function secureStoreSettings(s: { quotaMb: number; filesQuotaMb: number }, env: Record<string, string | undefined>) {
  return { quotaBytes: s.quotaMb * 1024 * 1024, filesQuotaBytes: s.filesQuotaMb * 1024 * 1024, master: custodyMasterFromEnv(env) };
}

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
            clientIpHeader: config.renderBridge.clientIpHeader,
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
      inference: config.inference?.enabled
        ? await (async (inference) => {
            const qualification = JSON.parse(
              (await boundedFile(inference.qualificationFile)).toString("utf8"),
            ) as { provider?: unknown } | undefined;
            const privatemode = qualification?.provider === "privatemode";
            // The manifest belongs to a Privatemode report only; the release audit to Tinfoil only.
            if (
              privatemode !== !!inference.manifestFile ||
              (privatemode && config.attestationAudit) ||
              (!privatemode && inference.liveManifest)
            )
              throw Error("Inference files do not match the report's provider.");
            return withPlan({
              apiKey: (await boundedFile(inference.apiKeyFile)).toString("utf8").trim(),
              qualification: qualification as unknown,
              stopFile: inference.stopFile,
              ...(inference.allowance ? { allowance: inference.allowance } : {}),
              ...(inference.noticeFile ? { noticeFile: inference.noticeFile } : {}),
              ...(inference.voice?.enabled
                ? {
                    voice: {
                      chunkSeconds: inference.voice.chunkSeconds,
                      maxTurnSeconds: inference.voice.maxTurnSeconds,
                      dailyUnits: inference.voice.dailyUnits,
                    },
                  }
                : {}),
              ...(inference.images?.enabled
                ? { images: { maxBytes: inference.images.maxBytes, dailyImages: inference.images.dailyImages } }
                : {}),
              ...(inference.code?.enabled ? { code: true } : {}),
              ...(inference.imageCreation?.enabled
                ? {
                    imageCreation: {
                      apiKey: (await boundedFile(inference.imageCreation.apiKeyFile)).toString("utf8").trim(),
                      model: inference.imageCreation.model,
                      dailyImages: inference.imageCreation.dailyImages,
                    },
                  }
                : {}),
              ...(inference.vaultSync?.enabled
                ? {
                    vaultSync: {
                      quotaBytes: inference.vaultSync.quotaMb * 1024 * 1024,
                      maxDevices: inference.vaultSync.maxDevices,
                      ...(inference.vaultSync.blobs ? { blobs: blobSettings(inference.vaultSync.blobs, process.env) } : {}),
                    },
                  }
                : {}),
              ...(inference.secureStore?.enabled ? { secureStore: secureStoreSettings(inference.secureStore, process.env) } : {}),
              ...(inference.accountPurge?.enabled ? { accountPurge: { graceDays: inference.accountPurge.graceDays } } : {}),
              // Background tasks need the Privatemode client in the server (the report's provider).
              ...(inference.backgroundTasks?.enabled
                ? await (async (bg) => {
                    if (!privatemode) throw Error("Background tasks need a Privatemode report.");
                    return {
                      backgroundTasks: {
                        maxAutoTasks: bg.maxAutoTasks,
                        keys: parseKeyRing((await boundedFile(bg.keyFile)).toString("utf8")),
                        ...(bg.runHourUtcWindow ? { runHourUtcWindow: bg.runHourUtcWindow } : {}),
                      },
                    };
                  })(inference.backgroundTasks)
                : {}),
              ...(inference.liveManifest ? { liveManifest: true } : {}),
              ...(inference.research?.enabled
                ? {
                    research: {
                      cost: inference.research.cost,
                      dailyRuns: inference.research.dailyRuns,
                      dailySearches: inference.research.dailySearches,
                      ...(inference.research.allowedEmails
                        ? { allowedEmails: inference.research.allowedEmails }
                        : {}),
                    },
                  }
                : {}),
              ...(inference.searchKeyFile
                ? { searchKey: (await boundedFile(inference.searchKeyFile)).toString("utf8").trim() }
                : {}),
              ...(inference.manifestFile
                ? { providerManifest: new Uint8Array(await boundedFile(inference.manifestFile)) }
                : {}),
            }, inference.metering);
          })(config.inference)
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
