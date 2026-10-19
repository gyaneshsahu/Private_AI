import type { Pool } from "pg";
import Stripe from "stripe";
import { z } from "zod";
import { billingEventApiVersion } from "./billing-events";

const id = (prefix: string) =>
  z.string().regex(new RegExp(`^${prefix}_[A-Za-z0-9_]+$`));
const reference = (prefix: string) =>
  z.union([id(prefix), z.object({ id: id(prefix) })]);
const referenceId = (value: string | { id: string }) =>
  typeof value === "string" ? value : value.id;
const invoiceSchema = z.object({
  id: id("in"),
  livemode: z.literal(false),
  customer: reference("cus"),
  status: z.string().nullable(),
  amount_remaining: z.number().int().nonnegative(),
  parent: z.object({
    type: z.literal("subscription_details"),
    subscription_details: z.object({ subscription: reference("sub") }),
  }),
});
const subscriptionSchema = z.object({
  id: id("sub"),
  livemode: z.literal(false),
  customer: reference("cus"),
  status: z.string(),
  pause_collection: z.unknown().nullable(),
  pending_update: z.unknown().nullable(),
  latest_invoice: invoiceSchema,
  items: z.object({
    has_more: z.literal(false),
    data: z
      .array(
        z.object({
          quantity: z.literal(1),
          current_period_start: z.number().int().nonnegative(),
          current_period_end: z.number().int().nonnegative(),
          price: z.object({ id: id("price"), livemode: z.literal(false) }),
        }),
      )
      .length(1),
  }),
});

/** Raw SDK reads are parsed here; injected fixtures cannot bypass validation. */
export interface BillingReader {
  subscription(id: string): Promise<unknown>;
  invoice(id: string): Promise<unknown>;
  checkout(id: string): Promise<unknown>;
}

/** Unmounted test-mode adapter. No provider writes, automatic retries or live key support. */
export function createTestBillingReader(
  key: string,
  httpClient?: ReturnType<typeof Stripe.createFetchHttpClient>,
): BillingReader {
  if (!/^sk_test_[A-Za-z0-9]+$/.test(key))
    throw Error("Explicit Stripe test key required.");
  const stripe = new Stripe(key, {
    apiVersion: billingEventApiVersion,
    maxNetworkRetries: 0,
    timeout: 4000,
    httpClient,
  });
  return {
    subscription: (subscriptionId) =>
      stripe.subscriptions.retrieve(subscriptionId, {
        expand: ["latest_invoice"],
      }),
    invoice: (invoiceId) => stripe.invoices.retrieve(invoiceId),
    checkout: (sessionId) => stripe.checkout.sessions.retrieve(sessionId),
  };
}

type Outcome =
  "active_observed" | "inactive_observed" | "review" | "unavailable";
interface Assessment {
  outcome: Outcome;
  reason: string;
  subscriptionId?: string;
  customerId?: string;
  priceId?: string;
  periodEnd?: number;
}
async function bounded<T>(operation: () => Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve().then(operation),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(Error("Read deadline")), 4500);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/** One receipt per explicit call. Assessments are never consumed as access grants. */
export async function reconcileBillingReceipt(config: {
  database: Pool;
  reader: BillingReader;
  eventId: string;
  knownPriceIds: readonly string[];
}): Promise<Assessment | { outcome: "not_pending" }> {
  id("evt").parse(config.eventId);
  config.knownPriceIds.forEach((value) => id("price").parse(value));
  const client = await config.database.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL statement_timeout='5s'");
    await client.query("SET LOCAL lock_timeout='2s'");
    await client.query("SET LOCAL idle_in_transaction_session_timeout='15s'");
    // Low-volume candidate serializes observation across replicas, including provider reads.
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext(current_schema()), 73512)",
    );
    const gate = await client.query(
      "SELECT mode FROM account_recovery_control WHERE singleton=true FOR SHARE",
    );
    if (gate.rows[0]?.mode !== "normal") throw Error("Recovery quarantine");
    const receipt = (
      await client.query(
        "SELECT event_type,object_id FROM billing_event_inbox WHERE event_id=$1 AND state='pending' AND live_mode=false FOR UPDATE",
        [config.eventId],
      )
    ).rows[0] as { event_type: string; object_id: string } | undefined;
    if (!receipt) {
      await client.query("COMMIT");
      return { outcome: "not_pending" };
    }

    let assessment: Assessment;
    try {
      assessment = await inspect(receipt, config.reader, config.knownPriceIds);
      if (assessment.customerId) {
        const binding = await client.query(
          `SELECT b.account_id FROM billing_customer_binding b
          JOIN "user" u ON u.id=b.account_id WHERE b.customer_id=$1
          AND NOT EXISTS(SELECT 1 FROM account_closure c WHERE c."userId"=b.account_id) FOR SHARE OF b,u`,
          [assessment.customerId],
        );
        if (!binding.rowCount)
          assessment = {
            ...assessment,
            outcome: "review",
            reason: "unbound_or_closed_account",
          };
      }
    } catch (error) {
      assessment =
        error instanceof z.ZodError
          ? { outcome: "review", reason: "unsupported_provider_shape" }
          : { outcome: "unavailable", reason: "provider_read_unconfirmed" };
    }
    await client.query(
      `INSERT INTO billing_assessment(event_id,outcome,reason,subscription_id,customer_id,price_id,period_end,attempt)
      SELECT $1,$2,$3,$4,$5,$6,$7,COALESCE(MAX(attempt),0)+1 FROM billing_assessment WHERE event_id=$1`,
      [
        config.eventId,
        assessment.outcome,
        assessment.reason,
        assessment.subscriptionId ?? null,
        assessment.customerId ?? null,
        assessment.priceId ?? null,
        assessment.periodEnd ?? null,
      ],
    );
    const state =
      assessment.outcome === "unavailable"
        ? "pending"
        : assessment.outcome === "review"
          ? "blocked"
          : "reconciled";
    await client.query(
      "UPDATE billing_event_inbox SET state=$2 WHERE event_id=$1",
      [config.eventId, state],
    );
    await client.query("COMMIT");
    return assessment;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function inspect(
  receipt: { event_type: string; object_id: string },
  reader: BillingReader,
  prices: readonly string[],
): Promise<Assessment> {
  let subscriptionId: string;
  let eventCustomer: string | undefined;
  if (receipt.event_type.startsWith("customer.subscription."))
    subscriptionId = id("sub").parse(receipt.object_id);
  else if (receipt.event_type.startsWith("invoice.")) {
    const invoice = invoiceSchema.parse(
      await bounded(() => reader.invoice(receipt.object_id)),
    );
    if (invoice.id !== receipt.object_id)
      return { outcome: "review", reason: "object_identity_mismatch" };
    eventCustomer = referenceId(invoice.customer);
    subscriptionId = referenceId(
      invoice.parent.subscription_details.subscription,
    );
  } else if (receipt.event_type.startsWith("checkout.session.")) {
    const session = z
      .object({
        id: id("cs"),
        livemode: z.literal(false),
        mode: z.literal("subscription"),
        customer: reference("cus"),
        subscription: reference("sub"),
      })
      .parse(await bounded(() => reader.checkout(receipt.object_id)));
    if (session.id !== receipt.object_id)
      return { outcome: "review", reason: "object_identity_mismatch" };
    eventCustomer = referenceId(session.customer);
    subscriptionId = referenceId(session.subscription);
  } else
    return { outcome: "review", reason: "refund_or_dispute_requires_policy" };

  const raw = await bounded(() => reader.subscription(subscriptionId));
  const identity = z
    .object({
      id: id("sub"),
      customer: reference("cus"),
      livemode: z.literal(false),
      status: z.string(),
    })
    .parse(raw);
  const customerId = referenceId(identity.customer);
  if (
    identity.id !== subscriptionId ||
    (eventCustomer && eventCustomer !== customerId)
  )
    return { outcome: "review", reason: "object_identity_mismatch" };
  const base = { subscriptionId, customerId };
  if (
    ["canceled", "unpaid", "incomplete_expired", "paused"].includes(
      identity.status,
    )
  )
    return { ...base, outcome: "inactive_observed", reason: identity.status };
  if (identity.status !== "active")
    return { ...base, outcome: "review", reason: "subscription_not_active" };
  const subscription = subscriptionSchema.parse(raw);
  const invoice = subscription.latest_invoice;
  const item = subscription.items.data[0];
  if (
    subscription.pause_collection !== null ||
    subscription.pending_update !== null
  )
    return {
      ...base,
      outcome: "review",
      reason: "pending_or_paused_collection",
    };
  if (
    referenceId(invoice.customer) !== customerId ||
    referenceId(invoice.parent.subscription_details.subscription) !==
      subscriptionId
  )
    return { ...base, outcome: "review", reason: "invoice_identity_mismatch" };
  const details = {
    ...base,
    priceId: item.price.id,
    periodEnd: item.current_period_end,
  };
  if (!prices.includes(item.price.id))
    return { ...details, outcome: "review", reason: "unknown_price" };
  const now = Math.floor(Date.now() / 1000);
  if (
    item.current_period_start > now ||
    item.current_period_end <= now ||
    item.current_period_start >= item.current_period_end
  )
    return { ...details, outcome: "review", reason: "period_not_current" };
  if (invoice.status !== "paid" || invoice.amount_remaining !== 0)
    return {
      ...details,
      outcome: "review",
      reason: "latest_invoice_not_settled",
    };
  return {
    ...details,
    outcome: "active_observed",
    reason: "test_subscription_observed_no_access_grant",
  };
}

export function billingReconcilerPrivilegePlan(
  schema: string,
  role: string,
): string[] {
  if (![schema, role].every((value) => /^[a-z][a-z0-9_]{0,62}$/.test(value)))
    throw Error("Simple PostgreSQL identifiers required.");
  const grant = (permission: string, table: string) =>
    `GRANT ${permission} ON "${schema}".${table} TO "${role}"`;
  return [
    `GRANT USAGE ON SCHEMA "${schema}" TO "${role}"`,
    grant("SELECT", "billing_event_inbox"),
    grant("UPDATE (state)", "billing_event_inbox"),
    grant("SELECT,INSERT", "billing_assessment"),
    grant("SELECT", "billing_customer_binding"),
    grant("UPDATE (created_at)", "billing_customer_binding"),
    grant("SELECT (id)", '"user"'),
    grant('UPDATE ("updatedAt")', '"user"'),
    grant("SELECT", "account_closure"),
    grant("SELECT", "account_recovery_control"),
    grant('UPDATE ("updatedAt")', "account_recovery_control"),
  ];
}
