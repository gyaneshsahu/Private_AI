import Stripe from "stripe";
import { billingEventApiVersion } from "./billing-events";

export interface BillingProvider {
  price(id: string): Promise<unknown>;
  createCustomer(operationId: string): Promise<unknown>;
  createCheckout(input: {
    operationId: string;
    customerId: string;
    priceId: string;
    returnOrigin: string;
  }): Promise<unknown>;
  checkout(id: string): Promise<unknown>;
  createPortal(input: {
    operationId: string;
    customerId: string;
    returnOrigin: string;
  }): Promise<unknown>;
}

/** Inactive test-mode only. Tests supply an in-memory HTTP transport; no service is activated. */
export function createTestBillingProvider(
  key: string,
  portalConfiguration: string,
  httpClient?: ReturnType<typeof Stripe.createFetchHttpClient>,
): BillingProvider {
  if (
    !/^sk_test_[A-Za-z0-9]+$/.test(key) ||
    !/^bpc_[A-Za-z0-9]+$/.test(portalConfiguration)
  )
    throw Error(
      "Explicit test key and reviewed portal configuration required.",
    );
  const stripe = new Stripe(key, {
    apiVersion: billingEventApiVersion,
    maxNetworkRetries: 0,
    timeout: 4000,
    httpClient,
  });
  return {
    price: (id) => stripe.prices.retrieve(id),
    createCustomer: (operationId) =>
      stripe.customers.create(
        { metadata: { privateai_operation: operationId } },
        { idempotencyKey: operationId },
      ),
    createCheckout: ({ operationId, customerId, priceId, returnOrigin }) =>
      stripe.checkout.sessions.create(
        {
          mode: "subscription",
          customer: customerId,
          line_items: [{ price: priceId, quantity: 1 }],
          success_url: `${returnOrigin}/?billing=return`,
          cancel_url: `${returnOrigin}/?billing=cancel`,
          expires_at: Math.floor(Date.now() / 1000) + 1800,
        },
        { idempotencyKey: operationId },
      ),
    checkout: (id) => stripe.checkout.sessions.retrieve(id),
    createPortal: ({ operationId, customerId, returnOrigin }) =>
      stripe.billingPortal.sessions.create(
        {
          customer: customerId,
          return_url: `${returnOrigin}/?billing=return`,
          configuration: portalConfiguration,
        },
        { idempotencyKey: operationId },
      ),
  };
}
