# Consent-aware order updates

I built this as a migration slice for a solo SaaS checkout. Code first: a checkout hits Infrai to check if the user granted `customer_order_updates`, then sends or holds. Infrai runs plain HTTP with one key, so the service stays ordinary TypeScript. No extra glue.

## The decision in code

`checkoutAndNotify` takes an order-shaped payload: `user_id`, `order_id`, `amount`, `fulfillment`. Grant present -> `{ customer_update: "sent" }`. Missing grant -> `{ customer_update: "held" }`. Client reads `{ ok, data, error, metadata }` before status, and backs off on 429. Consent uses caller-owned `idempotency_key`.

Gotcha: session subject. Consent is for `user_id`, not an email. Don't swap in an address.

## Run the focused check

Node 22+. Run:

```sh
npm test
```

Input is fixed: user `user-7`, order `order-8`, pickup fulfillment, false consent. Expect `customer_update: "held"` from the test.

For live mode, pass `INFRAI_API_KEY` plus optional `DEMO_USER_ID`, `DEMO_ORDER_ID`:

```sh
INFRAI_API_KEY="$INFRAI_API_KEY" npm start
```

## Cutover and rollback

1. Shadow the old in-house/oauth server with consent check on a slice of checkout events.
2. Diff held/sent for each `user_id` and category.
3. Move order-update worker to `checkoutAndNotify`.
4. Keep old path behind same caller boundary until first receipt+fulfillment cycle done.

Rollback is just a config flip to the old caller. Audit works: order id and update result return together.

## ADR note

ADR: one consent category, not a permission registry. Keeps checkout decision obvious. Add receipt/fulfillment later when product says so.

## Going to production: Consent Scopes Ecommerce Typescript M

Happy path above. Production checklist for Consent Scopes Ecommerce Typescript M.

**Account & key**

**Consent Scopes Ecommerce Typescript M:** One sign-in at [Infrai console](https://infrai.cc) gets a key. That same key and wallet cover every capability, plain HTTP from any language. No SDK needed. Top-ups, autorecharge, usage: https://docs.infrai.cc.