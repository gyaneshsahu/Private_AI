import express from "express";
import {
  createSyntheticAccountAuth,
  type SyntheticAccountConfig,
} from "./account-auth";
import { consumerControl } from "./consumer-control";
import { createApp } from "./app";
import { PostgresUsageLedger } from "./usage-postgres";

/** Test harness composition only. No production mount or inference key support. */
export function createSyntheticConsumerWorkspace(
  config: SyntheticAccountConfig & {
    searchKey?: string;
  },
) {
  const lab = createSyntheticAccountAuth({ ...config, workspaceEnabled: true });
  const control = consumerControl({
    database: config.database,
    secret: config.secret,
    auth: lab.auth,
  });
  const usage = new PostgresUsageLedger(config.database);
  const app = express();
  app.use(lab.router);
  app.get("/auth", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.redirect(303, "/?account-lab=1");
  });
  app.use(
    createApp({
      origin: config.origin,
      consumer: control,
      usage,
      searchKey: config.searchKey,
    }),
  );
  return { app, auth: lab.auth, control, usage };
}
