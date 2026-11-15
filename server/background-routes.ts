// HTTP routes for background tasks, exactly as in the shared contract (.local/scheduled-contract.md
// and docs/background-tasks-20261115.md, section 7). Mounted only while the switch is on, behind
// the app's origin, session and CSRF checks; every route needs a signed-in account.
import express from "express";
import { z } from "zod";
import { BACKGROUND_LIMITS, type BackgroundTasks } from "./background-tasks";

const id = z.uuid();

export function backgroundRoutes(
  tasks: BackgroundTasks,
  maxAutoTasks: number,
  accountOf: (res: express.Response) => string | undefined,
) {
  const router = express.Router();
  // An attached document is up to 30,000 characters; 8 bytes per character covers UTF-8 and JSON escapes.
  const json = express.json({ limit: BACKGROUND_LIMITS.attachmentCharacters * 8 + 16_384 });
  const handle =
    (work: (req: express.Request, res: express.Response, account: string) => Promise<void>): express.RequestHandler =>
    async (req, res) => {
      const account = accountOf(res);
      if (!account) return void res.status(401).json({ error: "Sign in to use background tasks." });
      try {
        await work(req, res, account);
      } catch {
        if (!res.headersSent)
          res.status(503).json({ error: "Background tasks are unavailable right now. Nothing was changed." });
      }
    };
  const reply = (res: express.Response, outcome: { status: number; error: string } | object) =>
    "status" in outcome && "error" in outcome
      ? void res.status(outcome.status as number).json({ error: outcome.error })
      : void res.json(outcome);
  const base = "/api/background-tasks";
  router.get(
    base,
    handle(async (_req, res, account) => {
      res.json({
        tasks: await tasks.list(account),
        limits: { maxAutoTasks, minIntervalHours: BACKGROUND_LIMITS.minIntervalHours },
      });
    }),
  );
  router.get(
    `${base}/results`,
    handle(async (_req, res, account) => void res.json({ results: await tasks.results(account) })),
  );
  router.post(
    `${base}/results/:id/ack`,
    handle(async (req, res, account) => {
      if (id.safeParse(req.params.id).success) await tasks.ack(account, String(req.params.id));
      res.status(204).end();
    }),
  );
  router.post(base, json, handle(async (req, res, account) => reply(res, await tasks.create(account, req.body))));
  router.patch(
    `${base}/:id`,
    json,
    handle(async (req, res, account) => {
      if (!id.safeParse(req.params.id).success) return void res.status(404).json({ error: "This background task does not exist." });
      reply(res, await tasks.patch(account, String(req.params.id), req.body));
    }),
  );
  router.delete(
    `${base}/:id`,
    handle(async (req, res, account) => {
      if (id.safeParse(req.params.id).success) await tasks.remove(account, String(req.params.id));
      res.status(204).end();
    }),
  );
  return router;
}
