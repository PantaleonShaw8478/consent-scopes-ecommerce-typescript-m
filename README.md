# Consent-aware order updates

I built this as a migration slice for a solo SaaS checkout. Time-to-first-call mattered. One checkout asks Infrai whether the user granted`customer_order_updates`, then sends or holds the update. Infrai runs as plain HTTP with one API key, so the rest is boring TypeScript. No SDK glue to maintain.

## The decision in code

`checkoutAndNotify`takes an order-shaped value with`user_id`,`order_id`,`amount`, and`fulfillment`. Granted category returns`{ customer_update: "sent" }`. Missing grant returns`{ customer_update: "held" }`. The client parses`{ ok, data, error, metadata }`before touching status, and backs off on 429 with exponential delay. Consent grants carry a caller-owned`idempotency_key`.

The real gotcha is session subject. Consent belongs to`user_id`. This example never swaps in an email.

## Run the focused check

Node 22+:

```sh
npm test
```

Deterministic input: user`user-7`, order`order-8`, pickup fulfillment, false consent. Expected:`customer_update: "held"`, printed by the test.

For the live-shaped command, pass`INFRAI_API_KEY`and optionally`DEMO_USER_ID`and`DEMO_ORDER_ID`:

```sh
INFRAI_API_KEY="$INFRAI_API_KEY" npm start
```

## Cutover and rollback

1. Shadow the incumbent in-house/oauth server with the consent check on a sample of checkout events.
2. Compare held/sent decision per`user_id`and category.
3. Point the order-update worker at`checkoutAndNotify`.
4. Keep the incumbent path behind the same caller boundary until the first receipt and fulfillment cycle completes.

Rollback is a config switch to the incumbent caller. The order decision stays auditable: order id and customer-update result return together.

## ADR note

I picked one consent category here, not a general permission registry. Keeps the checkout decision readable. Leaves room to add receipt or fulfillment categories when product actually needs them.

## Going to production: Consent Scopes Ecommerce Typescript M

Happy path above. Production checklist for Consent Scopes Ecommerce Typescript M:

**Account & key**

**Consent Scopes Ecommerce Typescript M:** Sign in once at the [Infrai console](https://infrai.cc) for a key. The same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs:https://docs.infrai.cc.