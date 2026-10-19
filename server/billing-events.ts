import express, { type ErrorRequestHandler } from "express";
import type { Pool } from "pg";
import Stripe from "stripe";
import { z } from "zod";

export const billingEventApiVersion = Stripe.API_VERSION;
const eventSchema = z.object({
  id: z.string().regex(/^evt_[A-Za-z0-9]{1,200}$/),
  object: z.literal("event"),
  type: z.string().max(100),
  created: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  api_version: z.literal(billingEventApiVersion),
  livemode: z.literal(false),
  account: z.undefined().optional(),
  context: z.undefined().optional(),
  data: z.object({
    object: z.object({
      id: z.string().regex(/^[A-Za-z]+_[A-Za-z0-9_]{1,200}$/),
    }),
  }),
});
const supported: Record<string, string> = {
  "checkout.session.completed": "cs_",
  "checkout.session.async_payment_succeeded": "cs_",
  "checkout.session.async_payment_failed": "cs_",
  "customer.subscription.created": "sub_",
  "customer.subscription.updated": "sub_",
  "customer.subscription.deleted": "sub_",
  "invoice.paid": "in_",
  "invoice.payment_failed": "in_",
  "invoice.payment_action_required": "in_",
  "charge.refunded": "ch_",
  "charge.dispute.created": "dp_",
  "charge.dispute.closed": "dp_",
};

/** Inactive receipt boundary only: no Stripe network client, checkout or access grant. */
export function createSyntheticBillingReceiver(config: {
  database: Pool;
  signingSecret: string;
}) {
  if (!/^whsec_[A-Za-z0-9]{32,}$/.test(config.signingSecret))
    throw Error("Explicit webhook signing secret required.");
  const router = express.Router();
  router.post(
    "/api/billing/webhook",
    express.raw({ type: "application/json", limit: "256kb", inflate: false }),
    async (req, res) => {
      res.setHeader("Cache-Control", "no-store");
      const signature = req.headers["stripe-signature"];
      let parsed: z.infer<typeof eventSchema>;
      try {
        if (
          !Buffer.isBuffer(req.body) ||
          typeof signature !== "string" ||
          signature.length > 4096
        )
          throw Error("Invalid delivery");
        const event = Stripe.webhooks.constructEvent(
          req.body,
          signature,
          config.signingSecret,
          300,
        );
        // SDK checks age; reject a signed timestamp implausibly ahead of our clock too.
        const timestamp = Number(/(?:^|,)t=(\d+)(?:,|$)/.exec(signature)?.[1]);
        if (
          !Number.isSafeInteger(timestamp) ||
          timestamp > Math.floor(Date.now() / 1000) + 60
        )
          throw Error("Invalid timestamp");
        parsed = eventSchema.parse(event);
      } catch {
        res.status(400).json({ error: "Webhook verification failed." });
        return;
      }
      const prefix = Object.hasOwn(supported, parsed.type)
        ? supported[parsed.type]
        : undefined;
      if (!prefix) {
        res.status(200).json({ received: true, state: "ignored" });
        return;
      }
      if (!parsed.data.object.id.startsWith(prefix)) {
        res.status(400).json({ error: "Unsupported event object." });
        return;
      }
      const client = await config.database.connect().catch(() => undefined);
      if (!client) {
        res.status(503).json({ error: "Receipt unavailable." });
        return;
      }
      try {
        await client.query("BEGIN");
        await client.query("SET LOCAL statement_timeout='5s'");
        await client.query("SET LOCAL lock_timeout='2s'");
        const gate = await client.query(
          "SELECT mode FROM account_recovery_control WHERE singleton=true FOR SHARE",
        );
        if (gate.rows[0]?.mode !== "normal") throw Error("Recovery quarantine");
        const values = [
          parsed.id,
          parsed.type,
          parsed.data.object.id,
          parsed.created,
          parsed.api_version,
        ];
        const inserted = await client.query(
          `INSERT INTO billing_event_inbox
        (event_id,event_type,object_id,event_created,api_version,live_mode)
        VALUES($1,$2,$3,$4,$5,false) ON CONFLICT(event_id) DO NOTHING RETURNING event_id`,
          values,
        );
        if (!inserted.rowCount) {
          const same = await client.query(
            `SELECT event_id FROM billing_event_inbox
          WHERE event_id=$1 AND event_type=$2 AND object_id=$3 AND event_created=$4 AND api_version=$5 AND live_mode=false`,
            values,
          );
          if (!same.rowCount) {
            await client.query("ROLLBACK");
            res
              .status(409)
              .json({ error: "Receipt identity conflict; review required." });
            return;
          }
        }
        await client.query("COMMIT");
        res
          .status(200)
          .json({
            received: true,
            state: inserted.rowCount ? "pending" : "duplicate",
          });
      } catch {
        await client.query("ROLLBACK").catch(() => undefined);
        res.status(503).json({ error: "Receipt unavailable." });
      } finally {
        client.release();
      }
    },
  );
  const bodyError: ErrorRequestHandler = (error, _req, res, _next) => {
    res.setHeader("Cache-Control", "no-store");
    res
      .status(error?.type === "entity.too.large" ? 413 : 400)
      .json({ error: "Invalid webhook body." });
  };
  router.use(bodyError);
  return router;
}

/** Review-only role SQL. Never grants auth access, allowance creation or receipt mutation. */
export function billingReceiverPrivilegePlan(
  schema: string,
  role: string,
): string[] {
  if (![schema, role].every((value) => /^[a-z][a-z0-9_]{0,62}$/.test(value)))
    throw Error("Simple PostgreSQL identifiers required.");
  return [
    `GRANT USAGE ON SCHEMA "${schema}" TO "${role}"`,
    `GRANT SELECT,INSERT ON "${schema}".billing_event_inbox TO "${role}"`,
    `GRANT SELECT ON "${schema}".account_recovery_control TO "${role}"`,
    `GRANT UPDATE ("updatedAt") ON "${schema}".account_recovery_control TO "${role}"`,
  ];
}
