import { createHmac, timingSafeEqual } from "node:crypto";

export async function webhookRoutes(fastify, { store, fulfillment, webhookSecret }) {
  const secret = webhookSecret ?? process.env.WEBHOOK_SECRET ?? "dev-secret";
  const dispatchedOrders = new Set();
  const orderTails = new Map();

  async function serializeOrder(orderId, operation) {
    const previous = orderTails.get(orderId) ?? Promise.resolve();
    let release;
    const current = new Promise((resolve) => { release = resolve; });
    orderTails.set(orderId, current);
    await previous;
    try {
      return await operation();
    } finally {
      release();
      if (orderTails.get(orderId) === current) orderTails.delete(orderId);
    }
  }

  fastify.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (request, body, done) => {
      request.rawBody = body;
      done(null, body);
    },
  );

  fastify.post("/webhooks/payments", async (request, reply) => {
    const signature = request.headers["x-pagfacil-signature"];
    const format = /^sha256=[0-9a-f]{64}$/;
    if (typeof signature !== "string" || !format.test(signature)) {
      return reply.code(401).send({ error: "invalid_signature" });
    }

    const expected = `sha256=${createHmac("sha256", secret).update(request.rawBody).digest("hex")}`;
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return reply.code(401).send({ error: "invalid_signature" });
    }

    let event;
    try {
      event = JSON.parse(request.rawBody.toString("utf8"));
    } catch {
      return reply.code(400).send({ error: "invalid_event" });
    }

    const validEvent = event && typeof event === "object" && !Array.isArray(event)
      && typeof event.event_id === "string" && event.event_id.length > 0
      && typeof event.order_id === "string" && event.order_id.length > 0
      && Number.isSafeInteger(event.amount_cents) && event.amount_cents >= 0
      && typeof event.occurred_at === "string" && Number.isFinite(Date.parse(event.occurred_at))
      && ["payment.paid", "payment.failed", "payment.refunded"].includes(event.type);
    if (!validEvent) return reply.code(400).send({ error: "invalid_event" });

    return serializeOrder(event.order_id, async () => {
      const order = await store.getOrder(event.order_id);
      // Sem retentativa, um pedido inexistente nunca passaria a existir.
      if (!order) return reply.code(200).send({ accepted: true, ignored: "order_not_found" });

      if (event.type === "payment.refunded") {
        if (order.status !== "refunded") await store.updateOrder(order.id, { status: "refunded" });
        return reply.code(200).send({ accepted: true });
      }

      if (event.type === "payment.failed") {
        if (order.status === "pending") await store.updateOrder(order.id, { status: "failed" });
        return reply.code(200).send({ accepted: true });
      }

      if (order.status === "refunded" || (order.status === "paid" && dispatchedOrders.has(order.id))) {
        return reply.code(200).send({ accepted: true, ignored: "stale_event" });
      }
      if (event.amount_cents !== order.totalCents) {
        if (order.status !== "payment_review") {
          await store.updateOrder(order.id, { status: "payment_review" });
        }
        return reply.code(200).send({ accepted: true, review: true });
      }

      await store.updateOrder(order.id, { status: "paid" });
      if (!dispatchedOrders.has(order.id)) {
        try {
          await fulfillment.release(order.id);
          dispatchedOrders.add(order.id);
        } catch {
          // O próximo envio do gateway tenta concluir o despacho.
          return reply.code(503).send({ error: "fulfillment_unavailable" });
        }
      }
      return reply.code(200).send({ accepted: true });
    });
  });
}
