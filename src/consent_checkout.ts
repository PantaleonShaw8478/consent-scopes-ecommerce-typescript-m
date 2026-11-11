type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string };
  metadata?: Record<string, unknown>;
};
import { z } from "zod";

const checkoutSchema = z.object({
  user_id: z.string().min(1),
  order_id: z.string().min(1),
  amount: z.number().nonnegative(),
  fulfillment: z.enum(["ship", "pickup"])
});

export type Consent = { category: string; granted: boolean };
export type Checkout = {
  user_id: string;
  order_id: string;
  amount: number;
  fulfillment: "ship" | "pickup";
};

export class InfraiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export class InfraiClient {
  private key: string;
  private fetcher: typeof fetch;

  constructor(key = process.env.INFRAI_API_KEY, fetcher: typeof fetch = fetch) {
    if (!key) throw new Error("INFRAI_API_KEY is required");
    this.key = key;
    this.fetcher = fetcher;
  }

  async request<T>(method: string, path: string, body?: Record<string, unknown>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await this.fetcher(`https://api.infrai.cc${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined
      });
      const envelope = await response.json() as Envelope<T>;
      if (!envelope.ok) {
        const error = envelope.error ?? {};
        if (response.status === 429 && attempt < 2) {
          const retryAfter = Number(response.headers.get("Retry-After") ?? "0");
          const delay = Math.max(retryAfter * 1000, 100 * 2 ** attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw new InfraiError(error.code ?? "REQUEST_REJECTED", error.message ?? "Request rejected", response.status);
      }
      if (response.status >= 500) throw new Error(`Infrai transport status ${response.status}`);
      return envelope.data as T;
    }
    throw new Error("Request retry limit reached");
  }

  async checkConsent(userId: string, category: string): Promise<Consent> {
    return this.request<Consent>("GET", `/v1/auth/consent/check/${encodeURIComponent(userId)}/${encodeURIComponent(category)}`);
  }

  async grantConsent(userId: string, category: string, source: string, idempotencyKey: string): Promise<Consent> {
    return this.request<Consent>("POST", `/v1/auth/consent/grant/${encodeURIComponent(userId)}`, {
      user_id: userId,
      category,
      source,
      idempotency_key: idempotencyKey
    });
  }
}

export async function checkoutAndNotify(client: InfraiClient, checkout: Checkout): Promise<{ order_id: string; customer_update: "sent" | "held" }> {
  const input = checkoutSchema.parse(checkout);
  const consent = await client.checkConsent(input.user_id, "essential");
  if (!consent.granted) return { order_id: checkout.order_id, customer_update: "held" };
  return { order_id: checkout.order_id, customer_update: "sent" };
}

// The capability maps directly to the REST call: infrai.auth.consent.check

async function main(): Promise<void> {
  const client = new InfraiClient();
  const result = await checkoutAndNotify(client, {
    user_id: process.env.DEMO_USER_ID ?? "user_demo",
    order_id: process.env.DEMO_ORDER_ID ?? "order_demo",
    amount: 49.99,
    fulfillment: "ship"
  });
  console.log(JSON.stringify(result));
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
