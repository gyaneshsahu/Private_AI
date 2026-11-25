// Plans and checkout (docs/plans-20261125.md), the server side with the in-memory store and the
// fake provider: the switch, the catalogue, a paid plan only after the provider says "paid", only
// for the account that started the checkout and only once, a cancelled checkout, back to Free,
// no checkout without a provider, and that the production composition never builds the fake.
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { afterEach, expect, it } from "vitest";
import { createApp } from "../server/app";
import { fakeCheckoutProvider, MemoryPlanStore, type PlanSettings } from "../server/plans";
import { PLANS } from "../shared/plans";

const servers: { close(): void }[] = [];
afterEach(() => servers.splice(0).forEach((s) => s.close()));

async function start(plans?: PlanSettings) {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw Error("port");
  const origin = `http://127.0.0.1:${address.port}`;
  server.on("request", createApp({ origin, dev: true, ...(plans ? { plans } : {}) }));
  servers.push(server);
  const first = await fetch(`${origin}/api/status`);
  const cookie = first.headers.get("set-cookie")!.split(";")[0];
  const status = (await first.json()) as { csrf: string; plans?: true };
  const call = (method: string, path: string, body?: unknown) =>
    fetch(origin + path, {
      method,
      redirect: "manual",
      headers: { cookie, "x-privateai-csrf": status.csrf, ...(body === undefined ? {} : { "content-type": "application/json" }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  return { origin, status, call };
}

it("the catalogue is Free, Plus and Pro, each larger than the one before", () => {
  expect(PLANS.map((p) => p.id)).toEqual(["free", "plus", "pro"]);
  expect(PLANS[0].monthlyMinor).toBe(0);
  for (let i = 1; i < PLANS.length; i++) {
    expect(PLANS[i].monthlyMinor).toBeGreaterThan(PLANS[i - 1].monthlyMinor);
    for (const key of Object.keys(PLANS[i].limits) as (keyof (typeof PLANS)[number]["limits"])[])
      expect(PLANS[i].limits[key], `${PLANS[i].id} ${key}`).toBeGreaterThanOrEqual(PLANS[i - 1].limits[key]);
  }
});

it("the switch: off by default; on, an account starts on Free", async () => {
  const off = await start();
  expect(off.status.plans).toBeUndefined();
  expect((await off.call("GET", "/api/plans")).status).toBe(404);
  expect((await off.call("POST", "/api/plans/checkout", { plan: "plus" })).status).toBe(404);
  const on = await start({ store: new MemoryPlanStore(), provider: fakeCheckoutProvider() });
  expect(on.status.plans).toBe(true);
  expect(await (await on.call("GET", "/api/plans")).json()).toEqual({ current: "free", checkout: true });
});

it("a paid plan counts only after the provider says paid, and one checkout counts once", async () => {
  const s = await start({ store: new MemoryPlanStore(), provider: fakeCheckoutProvider() });
  const made = await s.call("POST", "/api/plans/checkout", { plan: "plus" });
  expect(made.status).toBe(201);
  const { url } = (await made.json()) as { url: string };
  const checkout = url.split("/").pop()!;
  // The test page says what is bought and that no money moves.
  const page = await (await s.call("GET", url)).text();
  expect(page).toContain("Plus");
  expect(page).toContain("No money moves");
  // Not paid yet: confirming changes nothing.
  expect(await (await s.call("POST", "/api/plans/confirm", { checkout })).json()).toEqual({ state: "open", current: "free", checkout: true });
  const paid = await s.call("GET", `${url}/pay`);
  expect(paid.status).toBe(303);
  expect(paid.headers.get("location")).toBe(`${s.origin}/?plan-checkout=${checkout}`);
  expect(await (await s.call("POST", "/api/plans/confirm", { checkout })).json()).toEqual({ state: "paid", current: "plus", checkout: true });
  // Back to Free, then the same paid checkout again: it does not buy the plan a second time.
  expect(await (await s.call("POST", "/api/plans/change", { plan: "free" })).json()).toEqual({ current: "free", checkout: true });
  expect(await (await s.call("POST", "/api/plans/confirm", { checkout })).json()).toEqual({ state: "paid", current: "free", checkout: true });
});

it("a cancelled checkout changes nothing, and cannot be paid afterwards", async () => {
  const s = await start({ store: new MemoryPlanStore(), provider: fakeCheckoutProvider() });
  const { url } = (await (await s.call("POST", "/api/plans/checkout", { plan: "pro" })).json()) as { url: string };
  const checkout = url.split("/").pop()!;
  await s.call("GET", `${url}/cancel`);
  await s.call("GET", `${url}/pay`);
  expect(await (await s.call("POST", "/api/plans/confirm", { checkout })).json()).toEqual({ state: "cancelled", current: "free", checkout: true });
});

it("another account's checkout, an unknown one and a wrong request are refused", async () => {
  const provider = fakeCheckoutProvider();
  const s = await start({ store: new MemoryPlanStore(), provider });
  const other = await provider.start({ accountId: "someone-else", plan: "pro", monthlyMinor: 20000, currency: "EUR", returnUrl: `${s.origin}/` });
  await s.call("GET", `${other.url}/pay`);
  expect((await s.call("POST", "/api/plans/confirm", { checkout: other.id })).status).toBe(404);
  expect((await s.call("POST", "/api/plans/confirm", { checkout: "00000000-0000-4000-8000-000000000000" })).status).toBe(404);
  expect((await s.call("POST", "/api/plans/confirm", { checkout: "../x" })).status).toBe(400);
  expect((await s.call("POST", "/api/plans/checkout", { plan: "free" })).status).toBe(400);
  expect((await s.call("POST", "/api/plans/checkout", { plan: "plus", price: 1 })).status).toBe(400);
  expect((await s.call("POST", "/api/plans/change", { plan: "pro" })).status).toBe(400);
  expect(await (await s.call("GET", "/api/plans")).json()).toEqual({ current: "free", checkout: true });
});

it("without a provider the plans are shown and no paid plan can be started", async () => {
  const s = await start({ store: new MemoryPlanStore() });
  expect(await (await s.call("GET", "/api/plans")).json()).toEqual({ current: "free", checkout: false });
  expect((await s.call("POST", "/api/plans/checkout", { plan: "plus" })).status).toBe(409);
  expect((await s.call("POST", "/api/plans/confirm", { checkout: "abcdefgh" })).status).toBe(404);
});

it("the production composition builds no plans and no fake checkout", () => {
  for (const file of ["server/consumer-workspace.ts", "server/production-runtime.ts", "server/render-entry.ts", "server/deployment-config.ts"]) {
    const text = readFileSync(file, "utf8");
    expect(text, file).not.toContain("fakeCheckoutProvider");
    expect(text, file).not.toContain("./plans");
  }
});
