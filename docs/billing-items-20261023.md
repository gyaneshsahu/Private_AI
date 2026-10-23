# Billing items for a consumer launch — gap review, 23 October 2026

Status: engineering review of what the billing path has and lacks before a consumer can pay. Nothing here activates live mode; the owner decides each open item. Facts are from the code on branch `codex/development-handoff` (`server/billing-*.ts`, `shared/billing.ts`, `src/AccountBilling.tsx`); legal items are marked `[OWNER + legal]`.

## What exists (test mode only, verified by unit and durable tests)

- One plan in code, `rehearsal-monthly`: 200 requests per 31 days; price and currency come from the configured plan list (USD, EUR or GBP, amount in minor units) and are checked against the provider's price object before checkout.
- Checkout and customer portal through the payment provider (Stripe) in test mode; webhook receipts stored with idempotent state; reconciliation from receipts to account allowances; entitlement grants an allowance that never starts before the previous one ends.
- The account page shows the plan name and the formatted price with the sentence "synthetic price only; not a launch offer", the real allowance and usage, and the checkout and portal buttons.
- The account export includes the customer binding and the operation states, never provider secrets.

## Gaps before a consumer may pay

| # | Item | What is missing | Owner decision |
| --- | --- | --- | --- |
| B1 | Price display | A consumer price must be shown as a total including VAT, in EUR, with the period and the included requests, on a plan page reachable before checkout; today the only display is on the signed-in account page with a synthetic-price caveat. | Price, currency EUR, VAT inclusion `[OWNER + legal]` |
| B2 | VAT and tax identity | No VAT id is held (`deployment/legal-identity.json`); whether the operator is VAT-registered, small-business exempt (§ 19 UStG) or must use the provider's tax handling decides the invoice text. | `[OWNER + legal]` |
| B3 | Invoices and receipts | The provider issues invoices; the app shows none and sends none. Consumers need a downloadable invoice or receipt; the provider's portal can serve it if enabled. | Enable portal invoices or build a list `[OWNER]` |
| B4 | Withdrawal right | No withdrawal notice or express-consent checkbox exists at checkout; digital services need the consumer's express consent to start before the withdrawal period ends. | Wording with legal advice `[OWNER + legal]`; then a checkout page change (engineering) |
| B5 | Terms acceptance | No terms are published and nothing records acceptance at checkout or sign-up. The terms draft is `docs/terms-draft-20261023.md`. | Review the draft `[OWNER + legal]`; then record acceptance (engineering) |
| B6 | Cancellation | The portal allows cancellation; German law requires a cancellation button ("Kündigungsschaltfläche") reachable without sign-in to the provider's portal for contracts concluded online. | Confirm requirement `[OWNER + legal]`; then a button on the account page (engineering) |
| B7 | Failed payment and grace | Receipts for `invoice.payment_failed` are stored; the user sees no notice and no grace period is defined. | Grace period length `[OWNER]`; then a notice (engineering) |
| B8 | Refunds and disputes | No refund path and no dispute handling beyond the provider's dashboard. | Policy `[OWNER]` |
| B9 | Live-mode activation | Live keys, webhook endpoint secret, provider DPA, the plan list with the real price id, and the production price check are all unset; the deployment review checklist must gain these items. | After B1 to B6 `[OWNER]` |
| B10 | Plan retention in the export and after closure | Billing records are kept for the account's life; accounting law may require longer retention of invoice data after closure, which the purge must respect. | Retention period `[OWNER + legal]` |

## Engineering steps that need no owner decision

None of the gaps can be closed in code before the decisions above; the engineering parts (checkout consent, cancellation button, invoice list, grace notice, acceptance record) are each small and will be scheduled once the wording is decided.
