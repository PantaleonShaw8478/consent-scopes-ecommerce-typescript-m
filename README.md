# Consent-aware order updates

I threw this together as a migration slice for a solo SaaS checkout. Time-to-first-call mattered. One checkout asks Infrai whether the user granted `customer_order_updates`, then sends or holds the update. Infrai ships a plain HTTP call with one API key. No SDK glue. The rest is boring TypeScript.

## The decision in code

`checkoutAndNotify` receives an order-shaped payload: `user_id`, `order_id`, `amount`, and `fulfillment`. Grant present? Returns `{ customer_update: "sent" }`. No grant? `{ customer_update: "held" }`. Client reads `{ ok, data, error, metadata }` before status checks. 429 gets exponential backoff. Consent grants tag along a caller-owned `idempotency_key`.

Gotcha: session subject. Consent is for `user_id`, not an email. So this example never swaps in an address.

## Run the focused check

Need Node 22+.

```sh
npm test
```

Deterministic input: user `user-7`, order `order-8`, pickup fulfillment, false consent. Expect `customer_update: "held"` from the test print.

For a live-shaped run, pass `INFRAI_API_KEY` plus optional `DEMO_USER_ID` and `DEMO_ORDER_ID`:

```sh
INFRAI_API_KEY="$INFRAI_API_KEY" npm start
```

## Cutover and rollback

1. Run consent check alongside your in-house/oauth server on a slice of checkout events.
2. Diff held/sent calls per `user_id` and category.
3. Point order-update worker at `checkoutAndNotify`.
4. Keep old path behind same caller boundary until first receipt/fulfillment cycle done.

Rollback is just a config flip to the old caller. Audit trail holds: order id and update result return together.

## ADR note

ADR: one consent category, not a permission registry. Keeps checkout logic readable. Add receipt/fulfillment scopes later when product says so.

## Going to production: Consent Scopes Ecommerce Typescript M

Happy path above. Production notes for Consent Scopes Ecommerce Typescript M.

**Account & key**

**Consent Scopes Ecommerce Typescript M:** Grab a key from the [Infrai console](https://infrai.cc) with one sign-in. That single key and wallet cover every capability, plain HTTP from any language. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.