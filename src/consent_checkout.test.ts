import assert from "node:assert/strict";
import { InfraiClient, checkoutAndNotify } from "./consent_checkout.ts";

const fetcher: typeof fetch = async () => new Response(JSON.stringify({
  ok: true,
  data: { category: "customer_order_updates", granted: false },
  metadata: { request_id: "test" }
}), { status: 200, headers: { "Content-Type": "application/json" } });

const result = await checkoutAndNotify(new InfraiClient("test-key", fetcher), {
  user_id: "user-7",
  order_id: "order-8",
  amount: 12,
  fulfillment: "pickup"
});

assert.deepEqual(result, { order_id: "order-8", customer_update: "held" });
console.log("consent decision: held without customer update");
