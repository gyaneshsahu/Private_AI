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
export function createProductionConsumerCandidate(
  config: ProductionAccountCandidateConfig,
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
  const workspace = createApp({
    origin: productionAccountTarget.origin,
    consumer: { ...control, mode: "production-candidate" },
    usage,
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
