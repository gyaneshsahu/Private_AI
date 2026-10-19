import express from "express";
import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { z } from "zod";
import {
  billingPlanSchema,
  hostedBillingUrl,
  type BillingOverview,
  type BillingPlan,
} from "../shared/billing";
import type { BillingProvider } from "./billing-provider";

export interface SyntheticBillingConfig {
  provider: BillingProvider;
  plans: readonly BillingPlan[];
}
const customerSchema = z.object({
  id: z.string().regex(/^cus_[A-Za-z0-9]+$/),
  livemode: z.literal(false),
  deleted: z.undefined().optional(),
});
const checkoutSchema = z.object({
  id: z.string().regex(/^cs_test_[A-Za-z0-9]+$/),
  livemode: z.literal(false),
  mode: z.literal("subscription"),
  customer: z.string(),
  status: z.enum(["open", "complete", "expired"]),
  url: z.string().nullable(),
});
type Kind = "customer" | "checkout" | "portal";
type Operation = {
  id: string;
  state: "submitted" | "uncertain" | "ready" | "closed";
  object_id: string | null;
  price_id: string | null;
  customer_id: string | null;
};
class BillingHold extends Error {}
const currentReview = `SELECT 1 FROM (SELECT DISTINCT ON (event_id) customer_id,outcome
  FROM billing_assessment ORDER BY event_id,attempt DESC) latest
  WHERE customer_id=$1 AND outcome IN ('review','unavailable') LIMIT 1`;

async function deadline<T>(run: () => Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve().then(run),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new BillingHold(
                "Provider outcome uncertain; support review required.",
              ),
            ),
          4500,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/** No live mount. All browser mutations require the existing consumer session + CSRF boundary. */
export function createSyntheticBillingWorkflow(
  config: SyntheticBillingConfig & { database: Pool; origin: string },
) {
  const origin = new URL(config.origin);
  if (origin.hostname !== "localhost" || origin.origin !== config.origin)
    throw Error(
      "Billing rehearsal requires the isolated localhost account workspace.",
    );
  const plans = config.plans.map((p) => billingPlanSchema.parse(p));
  if (
    !plans.length ||
    new Set(plans.map((p) => p.id)).size !== plans.length ||
    new Set(plans.map((p) => p.priceId)).size !== plans.length
  )
    throw Error("Unique explicit rehearsal plans required.");

  async function locked<T>(
    accountId: string,
    sessionId: string,
    work: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await config.database.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL statement_timeout='5s'");
      await client.query("SET LOCAL lock_timeout='2s'");
      const gate = await client.query(
        "SELECT mode FROM account_recovery_control WHERE singleton=true FOR SHARE",
      );
      if (gate.rows[0]?.mode !== "normal")
        throw new BillingHold("Billing is paused for recovery verification.");
      const session = await client.query(
        `SELECT s.id FROM session s JOIN "user" u ON u.id=s."userId"
        WHERE s.id=$1 AND u.id=$2 AND u."emailVerified"=true AND s."expiresAt">clock_timestamp()
        AND NOT EXISTS(SELECT 1 FROM account_closure c WHERE c."userId"=u.id) FOR UPDATE OF s,u`,
        [sessionId, accountId],
      );
      if (!session.rowCount)
        throw new BillingHold("Sign in again before continuing billing.");
      const result = await work(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
  async function binding(accountId: string, sessionId: string) {
    return locked(
      accountId,
      sessionId,
      async (client) =>
        (
          await client.query(
            "SELECT customer_id FROM billing_customer_binding WHERE account_id=$1",
            [accountId],
          )
        ).rows[0]?.customer_id as string | undefined,
    );
  }
  async function prepare(
    accountId: string,
    sessionId: string,
    kind: Kind,
    priceId?: string,
    customerId?: string,
  ) {
    return locked(accountId, sessionId, async (client) => {
      const existing = (
        await client.query(
          "SELECT * FROM billing_operation WHERE account_id=$1 AND kind=$2 AND state<>'closed' FOR UPDATE",
          [accountId, kind],
        )
      ).rows[0] as Operation | undefined;
      if (existing) {
        if (existing.state !== "ready")
          throw new BillingHold(
            "A prior billing request is pending or uncertain. No duplicate was sent; support review is required.",
          );
        if (
          existing.price_id !== (priceId ?? null) ||
          existing.customer_id !== (customerId ?? null)
        )
          throw new BillingHold(
            "Finish or expire the existing checkout before selecting another plan.",
          );
        return { operation: existing, fresh: false };
      }
      const operation = (
        await client.query(
          `INSERT INTO billing_operation(id,account_id,kind,state,price_id,customer_id)
        VALUES($1,$2,$3,'submitted',$4,$5) RETURNING *`,
          [randomUUID(), accountId, kind, priceId ?? null, customerId ?? null],
        )
      ).rows[0] as Operation;
      return { operation, fresh: true };
    });
  }
  async function uncertain(operationId: string) {
    // No raw provider exception/response. If DB is unavailable, durable 'submitted' still blocks repeats.
    await config.database
      .query(
        "UPDATE billing_operation SET state='uncertain',updated_at=clock_timestamp() WHERE id=$1 AND state='submitted'",
        [operationId],
      )
      .catch(() => undefined);
  }
  async function ensureCustomer(
    accountId: string,
    sessionId: string,
  ): Promise<string> {
    const known = await binding(accountId, sessionId);
    if (known) return known;
    const { operation, fresh } = await prepare(
      accountId,
      sessionId,
      "customer",
    );
    if (!fresh) throw new BillingHold("Customer association needs review.");
    try {
      const customer = customerSchema.parse(
        await deadline(() => config.provider.createCustomer(operation.id)),
      );
      await locked(accountId, sessionId, async (client) => {
        await client.query(
          "INSERT INTO billing_customer_binding(customer_id,account_id) VALUES($1,$2)",
          [customer.id, accountId],
        );
        await client.query(
          "UPDATE billing_operation SET state='ready',object_id=$2,updated_at=clock_timestamp() WHERE id=$1",
          [operation.id, customer.id],
        );
      });
      return customer.id;
    } catch {
      await uncertain(operation.id);
      throw new BillingHold(
        "Customer creation is unconfirmed. No repeat was sent; support review is required.",
      );
    }
  }
  async function checkout(
    accountId: string,
    sessionId: string,
    planId: string,
  ) {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) throw new BillingHold("Choose an available rehearsal plan.");
    await locked(accountId, sessionId, async () => undefined);
    const price = z
      .object({
        id: z.literal(plan.priceId),
        livemode: z.literal(false),
        active: z.literal(true),
        type: z.literal("recurring"),
        unit_amount: z.literal(plan.amountMinor),
        currency: z.literal(plan.currency.toLowerCase()),
        recurring: z.object({
          interval: z.literal(plan.interval),
          interval_count: z.literal(1),
          usage_type: z.literal("licensed"),
        }),
        billing_scheme: z.literal("per_unit"),
      })
      .safeParse(await deadline(() => config.provider.price(plan.priceId)));
    if (!price.success)
      throw new BillingHold(
        "The provider price does not match this plan. No checkout was created.",
      );
    const customerId = await ensureCustomer(accountId, sessionId);
    const holds = await config.database.query(currentReview, [customerId]);
    if (holds.rowCount)
      throw new BillingHold(
        "Prior billing evidence needs review before another checkout.",
      );
    const { operation, fresh } = await prepare(
      accountId,
      sessionId,
      "checkout",
      plan.priceId,
      customerId,
    );
    try {
      const raw = fresh
        ? await deadline(() =>
            config.provider.createCheckout({
              operationId: operation.id,
              customerId,
              priceId: plan.priceId,
              returnOrigin: config.origin,
            }),
          )
        : await deadline(() => config.provider.checkout(operation.object_id!));
      const session = checkoutSchema.parse(raw);
      if (
        session.customer !== customerId ||
        (!fresh && session.id !== operation.object_id)
      )
        throw Error("Provider identity mismatch");
      const url =
        session.status === "open"
          ? hostedBillingUrl(session.url, "checkout")
          : undefined;
      await locked(accountId, sessionId, async (client) => {
        const updated = await client.query(
          "UPDATE billing_operation SET state=$2,object_id=$3,updated_at=clock_timestamp() WHERE id=$1 AND state IN ('submitted','ready') RETURNING id",
          [
            operation.id,
            session.status === "expired" ? "closed" : "ready",
            session.id,
          ],
        );
        if (!updated.rowCount)
          throw new BillingHold(
            "Checkout state changed; refresh before continuing.",
          );
      });
      return url
        ? { url }
        : {
            message:
              session.status === "expired"
                ? "The checkout expired. You may start a new one."
                : "Checkout returned. Payment and access still require independent verification; no access was granted.",
          };
    } catch {
      if (fresh) await uncertain(operation.id);
      throw new BillingHold(
        "Checkout outcome is unconfirmed. No duplicate was sent; refresh status or contact support.",
      );
    }
  }
  async function portal(accountId: string, sessionId: string) {
    const customerId = await binding(accountId, sessionId);
    if (!customerId)
      throw new BillingHold(
        "No billing customer is associated with this account.",
      );
    const { operation, fresh } = await prepare(
      accountId,
      sessionId,
      "portal",
      undefined,
      customerId,
    );
    if (!fresh) throw new BillingHold("Billing management needs review.");
    try {
      const result = z
        .object({
          id: z.string().regex(/^bps_[A-Za-z0-9]+$/),
          customer: z.string(),
          livemode: z.literal(false),
          url: z.string(),
        })
        .parse(
          await deadline(() =>
            config.provider.createPortal({
              operationId: operation.id,
              customerId,
              returnOrigin: config.origin,
            }),
          ),
        );
      if (result.customer !== customerId)
        throw Error("Provider identity mismatch");
      const url = hostedBillingUrl(result.url, "portal");
      await locked(accountId, sessionId, async (client) => {
        await client.query(
          "UPDATE billing_operation SET state='closed',object_id=$2,updated_at=clock_timestamp() WHERE id=$1",
          [operation.id, result.id],
        );
      });
      return { url };
    } catch {
      await uncertain(operation.id);
      throw new BillingHold(
        "Billing management is unconfirmed. No repeat was sent; support review is required.",
      );
    }
  }
  async function overview(
    accountId: string,
    sessionId: string,
  ): Promise<BillingOverview> {
    return locked(accountId, sessionId, async (client) => {
      const operations = (
        await client.query(
          "SELECT DISTINCT ON (kind) kind,state FROM billing_operation WHERE account_id=$1 ORDER BY kind,created_at DESC,id DESC",
          [accountId],
        )
      ).rows;
      const state = (kind: Kind) =>
        operations.find((o) => o.kind === kind)?.state ?? "not_started";
      const bound = (
        await client.query(
          "SELECT customer_id FROM billing_customer_binding WHERE account_id=$1",
          [accountId],
        )
      ).rows[0];
      const reviews = bound
        ? await client.query(currentReview, [bound.customer_id])
        : undefined;
      return {
        mode: "synthetic-rehearsal",
        plans: plans.map(({ priceId: _, ...p }) => p),
        customerBound: !!bound,
        checkout: state("checkout"),
        customer: state("customer"),
        portal: state("portal"),
        reviewRequired: !!reviews?.rowCount,
        accessGranted: false,
      };
    });
  }
  const router = express.Router();
  router.get("/api/billing/overview", async (_req, res) => {
    try {
      res.json(await overview(res.locals.accountId, res.locals.session));
    } catch {
      res.status(503).json({
        error:
          "Billing status unavailable. No payment or access status can be confirmed.",
      });
    }
  });
  for (const kind of ["checkout", "portal"] as const)
    router.post(`/api/billing/${kind}`, async (req, res) => {
      try {
        if (kind === "checkout") {
          const body = z
            .object({ planId: z.string() })
            .strict()
            .parse(req.body);
          res.json(
            await checkout(
              res.locals.accountId,
              res.locals.session,
              body.planId,
            ),
          );
        } else {
          z.object({}).strict().parse(req.body);
          res.json(await portal(res.locals.accountId, res.locals.session));
        }
      } catch (error) {
        res.status(error instanceof z.ZodError ? 400 : 409).json({
          error:
            error instanceof BillingHold
              ? error.message
              : "Billing could not be confirmed. No automatic retry was made.",
        });
      }
    });
  return { router, overview, checkout, portal };
}

/** Review-only SQL for a separate billing pool; never applied by the app. */
export function billingWorkflowPrivilegePlan(
  schema: string,
  role: string,
): string[] {
  if (![schema, role].every((v) => /^[a-z][a-z0-9_]{0,62}$/.test(v)))
    throw Error("Simple PostgreSQL identifiers required.");
  const grant = (permission: string, table: string) =>
    `GRANT ${permission} ON "${schema}".${table} TO "${role}"`;
  return [
    `GRANT USAGE ON SCHEMA "${schema}" TO "${role}"`,
    grant('SELECT (id,"userId","expiresAt")', "session"),
    grant('UPDATE ("expiresAt")', "session"),
    grant('SELECT (id,"emailVerified")', '"user"'),
    grant('UPDATE ("updatedAt")', '"user"'),
    grant("SELECT", "account_closure"),
    grant("SELECT", "account_recovery_control"),
    grant('UPDATE ("updatedAt")', "account_recovery_control"),
    grant("SELECT,INSERT", "billing_customer_binding"),
    grant("SELECT,INSERT", "billing_operation"),
    grant("UPDATE (state,object_id,updated_at)", "billing_operation"),
    grant(
      "SELECT (event_id,attempt,customer_id,outcome)",
      "billing_assessment",
    ),
  ];
}
