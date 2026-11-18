import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import express from "express";
import {
  createSyntheticAccountAuth,
  type SyntheticAccountConfig,
  createProductionAccountCandidate,
  type ProductionAccountCandidateConfig,
} from "./account-auth";
import { consumerControl } from "./consumer-control";
import { createApp } from "./app";
import { bflImageProvider } from "./image-creation";
import { PostgresUsageLedger } from "./usage-postgres";
import { PostgresUsageRecords } from "./usage-records-postgres";
import { PostgresBackgroundStore } from "./background-store";
import { PostgresBlobStore, PostgresSecureStore, PostgresSyncStore, secureBlobStore } from "./vault-sync-postgres";
import { S3Objects } from "./vault-sync-blobs";
import { productionAccountTarget } from "../shared/account-design";
import { productionOperations } from "./production-operations";
import {
  createSyntheticBillingWorkflow,
  type SyntheticBillingConfig,
} from "./billing-workflow";

/** SS-14: the app sends an ended session to /auth?reason=expired; the sign-in page says why. Only this one value passes. */
const expiredReason = (reason: unknown, joiner: "?" | "&") => (reason === "expired" ? `${joiner}reason=expired` : "");

/** Test harness composition only. No production mount or inference key support. */
export function createSyntheticConsumerWorkspace(
  config: SyntheticAccountConfig & {
    searchKey?: string;
    billing?: SyntheticBillingConfig;
  },
) {
  const lab = createSyntheticAccountAuth({ ...config, workspaceEnabled: true });
  const control = consumerControl({
    database: config.database,
    secret: config.secret,
    auth: lab.auth,
  });
  const usage = new PostgresUsageLedger(config.database);
  const billing = config.billing
    ? createSyntheticBillingWorkflow({
        ...config.billing,
        database: config.database,
        origin: config.origin,
      })
    : undefined;
  const app = express();
  app.use(lab.router);
  app.get("/auth", (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.redirect(303, `/?account-lab=1${expiredReason(req.query.reason, "&")}`);
  });
  app.use(
    createApp({
      origin: config.origin,
      consumer: { ...control, billingRouter: billing?.router },
      usage,
      searchKey: config.searchKey,
    }),
  );
  return { app, auth: lab.auth, control, usage };
}

/** Inactive composition; no inference/search credentials, provider activation or migration. */
/** Chat in production: only with the owner's explicit deployment setting (deployment-config `inference`). */
export interface ProductionInferenceConfig {
  apiKey: string;
  qualification: unknown;
  /** While this file exists, chat is refused at once (operator stop switch). */
  stopFile: string;
  /** The approved Privatemode manifest, when the report names Privatemode. */
  providerManifest?: Uint8Array;
  /** Automatic allowance per signed-in account (owner-set); absent means none. */
  allowance?: { requestLimit: number; days: number; dailyLimit?: number };
  /** Brave Search key; absent means no web search. Goggles stay off in production. */
  searchKey?: string;
  /** Text file shown to every user as a notice while it is non-empty. */
  noticeFile?: string;
  /** Voice input limits; absent means voice input is off. */
  voice?: import("../shared/voice").VoiceLimits;
  /** Image question limits; absent means image upload is off. */
  images?: { maxBytes: number; dailyImages: number };
  /** Code execution on the user's device; absent means off. */
  code?: boolean;
  /** Image creation with Black Forest Labs (EU endpoint); absent means off. */
  imageCreation?: { apiKey: string; model: string; dailyImages: number };
  /** Deep research cost, caps and optional account list; absent means off. */
  research?: import("./research-admission").ResearchSettings;
  /** Usage metering with this plan and an optional pinned weights version (docs/usage-metering-20261115.md); absent means off. */
  metering?: { plan: string; weightsVersion?: number };
  /** End-to-end encrypted vault sync limits; absent means off. */
  vaultSync?: { quotaBytes: number; maxDevices: number; blobs?: import("./vault-sync").BlobSettings & { s3?: import("./vault-sync-blobs").S3Settings } };
  /** Secure mode limits and the master key from the environment (docs/secure-store-20261116.md); absent means off. */
  secureStore?: { quotaBytes: number; filesQuotaBytes: number; master: import("./custody").CustodyMaster };
  /** Closed accounts are deleted this many days after the request (docs/account-purge-20261116.md); absent means off. */
  accountPurge?: { graceDays: number };
  /** Background tasks (Auto mode of Scheduled); absent means off. */
  backgroundTasks?: {
    maxAutoTasks: number;
    keys: import("./background-crypto").BackgroundKeyRing;
    runHourUtcWindow?: import("./background-store").RunWindow;
  };
}

export function createProductionConsumerCandidate(
  config: ProductionAccountCandidateConfig & {
    inference?: ProductionInferenceConfig;
  },
) {
  const account = createProductionAccountCandidate({
    ...config,
    workspaceEnabled: true,
  });
  const control = consumerControl({
    database: config.database,
    secret: config.secret,
    auth: account.auth,
  });
  const usage = new PostgresUsageLedger(config.database);
  const app = express();
  app.disable("x-powered-by");
  // Protect every route, including readiness, before database access or admission.
  if (account.ingress) app.use(account.ingress.middleware);
  const operations = productionOperations(config.database);
  app.use(operations.middleware);
  // This boundary also scopes getSession calls from workspace APIs to the current request.
  app.use(account.router);
  const inference = config.inference;
  const workspace = createApp({
    origin: productionAccountTarget.origin,
    consumer: { ...control, mode: "production-candidate" },
    usage,
    ...(inference
      ? {
          productionInference: true,
          apiKey: inference.apiKey,
          qualification: inference.qualification,
          inferenceStopped: () => existsSync(inference.stopFile),
          providerManifest: inference.providerManifest,
          ...(inference.allowance ? { autoAllowance: inference.allowance } : {}),
          ...(inference.searchKey ? { searchKey: inference.searchKey } : {}),
          ...(inference.noticeFile ? { noticeFile: inference.noticeFile } : {}),
          ...(inference.voice ? { voice: inference.voice } : {}),
          ...(inference.images ? { images: inference.images } : {}),
          ...(inference.code ? { code: true } : {}),
          ...(inference.imageCreation
            ? {
                imageCreation: {
                  provider: bflImageProvider({ apiKey: inference.imageCreation.apiKey, model: inference.imageCreation.model }),
                  dailyImages: inference.imageCreation.dailyImages,
                },
              }
            : {}),
          ...(inference.research ? { research: inference.research } : {}),
          ...(inference.metering
            ? { metering: { ...inference.metering, records: new PostgresUsageRecords(config.database) } }
            : {}),
          ...(inference.vaultSync
            ? {
                vaultSync: {
                  quotaBytes: inference.vaultSync.quotaBytes,
                  maxDevices: inference.vaultSync.maxDevices,
                  store: new PostgresSyncStore(config.database),
                  ...(inference.vaultSync.blobs
                    ? {
                        blobs: {
                          quotaBytes: inference.vaultSync.blobs.quotaBytes,
                          maxFileBytes: inference.vaultSync.blobs.maxFileBytes,
                          store: new PostgresBlobStore(
                            config.database,
                            inference.vaultSync.blobs.s3 ? new S3Objects(inference.vaultSync.blobs.s3) : undefined,
                          ),
                        },
                      }
                    : {}),
                },
              }
            : {}),
          ...(inference.secureStore
            ? { secureStore: { ...inference.secureStore, store: new PostgresSecureStore(config.database), blobs: secureBlobStore(config.database) } }
            : {}),
          // Shown in the status for the deletion text; the job itself runs in server/deployment-process.ts.
          ...(inference.accountPurge ? { accountPurge: inference.accountPurge } : {}),
          ...(inference.backgroundTasks
            ? {
                backgroundTasks: {
                  ...inference.backgroundTasks,
                  store: new PostgresBackgroundStore(config.database),
                  log: (line: string) => void process.stdout.write(`${line}\n`),
                },
              }
            : {}),
          // Per-account prompt-cache salts stay stable across restarts (derived, not the secret itself).
          cacheSaltSecret: createHash("sha256").update(`cache-salt-key|${config.secret}`).digest("hex"),
        }
      : {}),
  });
  app.use(workspace);
  app.get("/auth", (req, res) => res.redirect(303, `/account${expiredReason(req.query.reason, "?")}`));
  return {
    app,
    auth: account.auth,
    control,
    usage,
    operations,
    ready: operations.ready,
  };
}
