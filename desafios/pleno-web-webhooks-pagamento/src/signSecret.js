import { createHmac } from "node:crypto";

// PAYLOAD DO WEBHOOK
// > {
// >   "event_id": "evt_8f2a1c",
// >   "type": "payment.paid",
// >   "order_id": "ord_1",
// >   "amount_cents": 15990,
// >   "occurred_at": "2026-11-10T12:00:00Z"
// > }

const resolveSecret = () => {
  return process.env.WEBHOOK_SECRET ?? "dev-secret";
};

const signWebhookSecret = (payload) => {
  data = JSON.stringify(payload);
  secret = resolveSecret();

  // const bytes = new TextEncoder().encode(string);
  //console.log(bytes);

  const signature = createHmac(data, secret);

  return signature;
};

export { signWebhookSecret };
