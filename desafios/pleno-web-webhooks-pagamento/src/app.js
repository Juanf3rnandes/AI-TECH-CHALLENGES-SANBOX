import Fastify from "fastify";
import { webhookRoutes } from "./routes.js";

export function buildApp({
  store,
  fulfillment,
  webhookSecret,
  logger = false,
}) {
  const app = Fastify({ logger });

  app.get("/orders/:id", async (request, reply) => {
    const order = await store.getOrder(request.params.id);
    if (!order) return reply.code(404).send({ error: "order_not_found" });
    return order;
  });

  app.register(webhookRoutes, { store, fulfillment, webhookSecret });

  return app;
}
