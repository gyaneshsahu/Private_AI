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
import { PostgresUsageLedger } from "./usage-postgres";
import { productionAccountTarget } from "../shared/account-design";
import { productionOperations } from "./production-operations";
import {
  createSyntheticBillingWorkflow,
  type SyntheticBillingConfig,
} from "./billing-workflow";

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
  app.get("/auth", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.redirect(303, "/?account-lab=1");
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
  voice?: { maxSeconds: number; dailyMinutes: number };
  /** Image question limits; absent means image upload is off. */
  images?: { maxBytes: number; dailyImages: number };
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
          // Per-account prompt-cache salts stay stable across restarts (derived, not the secret itself).
          cacheSaltSecret: createHash("sha256").update(`cache-salt-key|${config.secret}`).digest("hex"),
        }
      : {}),
  });
  app.use(workspace);
  app.get("/auth", (_req, res) => res.redirect(303, "/account"));
  return {
    app,
    auth: account.auth,
    control,
    usage,
    operations,
    ready: operations.ready,
  };
}
