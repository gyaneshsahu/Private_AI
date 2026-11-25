// Plans and checkout (docs/plans-20261125.md): which plan an account is on, and a checkout that
// knows nothing about any payment company. A provider starts a checkout and later says what became
// of it; a plan changes only after the provider says "paid", for the account that started it.
// There is no real payment code here: the only provider is the fake one below, for the development
// server and the test harness.
import { randomUUID } from "node:crypto";
import express, { Router, type RequestHandler, type Response } from "express";
import { changeRequest, checkoutRequest, confirmRequest, planOf, type PaidPlanId, type PlanId, type PlansView } from "../shared/plans";

export interface CheckoutResult {
  accountId: string;
  plan: PaidPlanId;
  state: "open" | "paid" | "cancelled";
}
/** What a payment company has to offer. Nothing in the app depends on which one it is. */
export interface CheckoutProvider {
  name: string;
  /** Starts a checkout. The user is sent to `url`; afterwards the provider sends them to `returnUrl` with `?plan-checkout=<id>`. */
  start(input: { accountId: string; plan: PaidPlanId; monthlyMinor: number; currency: "EUR"; returnUrl: string }): Promise<{ id: string; url: string }>;
  /** What became of a checkout this provider started; undefined when it does not know the id. */
  result(id: string): Promise<CheckoutResult | undefined>;
  /** Routes of its own: the fake one's test page; a real provider would take its webhook here. */
  router?: RequestHandler;
}

export interface PlanStore {
  get(accountId: string): Promise<PlanId>;
  /** `checkout`: the paid checkout this plan comes from; one checkout sets a plan once. */
  set(accountId: string, plan: PlanId, checkout?: string): Promise<void>;
  used(checkout: string): Promise<boolean>;
}
/** shortcut: in memory, lost on restart; the table (migration 0030 is reserved) comes with the first real provider. */
export class MemoryPlanStore implements PlanStore {
  private plans = new Map<string, PlanId>();
  private checkouts = new Set<string>();
  async get(accountId: string) {
    return this.plans.get(accountId) ?? "free";
  }
  async set(accountId: string, plan: PlanId, checkout?: string) {
    this.plans.set(accountId, plan);
    if (checkout) this.checkouts.add(checkout);
  }
  async used(checkout: string) {
    return this.checkouts.has(checkout);
  }
}

/**
 * The fake provider: a test page with "Pay" and "Cancel" that moves no money. Never for production:
 * anyone could give themselves a paid plan. Only server/index.ts (development) and the harness build it.
 */
export function fakeCheckoutProvider(): CheckoutProvider {
  const sessions = new Map<string, CheckoutResult & { returnUrl: string; monthlyMinor: number }>();
  const router = Router();
  const page = (id: string, s: { plan: string; monthlyMinor: number }) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Test checkout</title>
<style>body{font:16px/1.5 system-ui,sans-serif;max-width:420px;margin:12vh auto;padding:0 20px}a{display:inline-block;margin:8px 8px 0 0;padding:12px 18px;border-radius:999px;border:1px solid #888;color:inherit;text-decoration:none}a.pay{background:#1f4fd8;border-color:#1f4fd8;color:#fff}</style></head>
<body><h1>Test checkout</h1><p>This page stands in for a payment company. No money moves and no card is asked for.</p>
<p><strong>${s.plan === "pro" ? "Pro" : "Plus"}</strong>, EUR ${(s.monthlyMinor / 100).toFixed(2)} a month</p>
<a class="pay" href="/plans/test-checkout/${id}/pay">Pay (test)</a><a href="/plans/test-checkout/${id}/cancel">Cancel</a></body></html>`;
  router.get("/plans/test-checkout/:id", (req, res) => {
    const s = sessions.get(req.params.id);
    if (!s) return void res.status(404).type("text/plain").send("Unknown checkout.");
    res.setHeader("Cache-Control", "no-store");
    res.type("html").send(page(req.params.id, s));
  });
  router.get("/plans/test-checkout/:id/:step", (req, res) => {
    const s = sessions.get(req.params.id);
    if (!s || !["pay", "cancel"].includes(req.params.step)) return void res.status(404).type("text/plain").send("Unknown checkout.");
    if (s.state === "open") s.state = req.params.step === "pay" ? "paid" : "cancelled";
    res.redirect(303, `${s.returnUrl}?plan-checkout=${req.params.id}`);
  });
  return {
    name: "fake",
    async start({ accountId, plan, monthlyMinor, returnUrl }) {
      const id = randomUUID();
      sessions.set(id, { accountId, plan, state: "open", returnUrl, monthlyMinor });
      return { id, url: `/plans/test-checkout/${id}` };
    },
    async result(id) {
      const s = sessions.get(id);
      return s && { accountId: s.accountId, plan: s.plan, state: s.state };
    },
    router,
  };
}

export interface PlanSettings {
  store: PlanStore;
  /** Absent: the plans are shown, and no paid plan can be chosen. */
  provider?: CheckoutProvider;
}

export function planRoutes(o: { settings: PlanSettings; origin: string; account(res: Response): string | undefined }) {
  const { store, provider } = o.settings;
  const router = Router();
  const json = express.json({ limit: "1kb" });
  const who = (res: Response) => {
    res.setHeader("Cache-Control", "no-store");
    const id = o.account(res);
    if (!id) res.status(401).json({ error: "signin" });
    return id;
  };
  const view = async (accountId: string): Promise<PlansView> => ({ current: await store.get(accountId), checkout: !!provider });
  if (provider?.router) router.use(provider.router);
  router.get("/api/plans", async (_req, res) => {
    const id = who(res);
    if (id) res.json(await view(id));
  });
  router.post("/api/plans/checkout", json, async (req, res) => {
    const id = who(res);
    if (!id) return;
    const parsed = checkoutRequest.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ error: "invalid" });
    if (!provider) return void res.status(409).json({ error: "closed" });
    const plan = planOf(parsed.data.plan);
    try {
      const started = await provider.start({ accountId: id, plan: parsed.data.plan, monthlyMinor: plan.monthlyMinor, currency: plan.currency, returnUrl: `${o.origin}/` });
      res.status(201).json({ url: started.url });
    } catch {
      res.status(503).json({ error: "unavailable" });
    }
  });
  // The page calls this when the user comes back. The provider's word decides, never the page's.
  router.post("/api/plans/confirm", json, async (req, res) => {
    const id = who(res);
    if (!id) return;
    const parsed = confirmRequest.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ error: "invalid" });
    try {
      const result = await provider?.result(parsed.data.checkout);
      // Someone else's checkout looks exactly like an unknown one.
      if (!result || result.accountId !== id) return void res.status(404).json({ error: "unknown" });
      if (result.state === "paid" && !(await store.used(parsed.data.checkout))) await store.set(id, result.plan, parsed.data.checkout);
      res.json({ state: result.state, ...(await view(id)) });
    } catch {
      res.status(503).json({ error: "unavailable" });
    }
  });
  router.post("/api/plans/change", json, async (req, res) => {
    const id = who(res);
    if (!id) return;
    if (!changeRequest.safeParse(req.body).success) return void res.status(400).json({ error: "invalid" });
    await store.set(id, "free");
    res.json(await view(id));
  });
  return router;
}
