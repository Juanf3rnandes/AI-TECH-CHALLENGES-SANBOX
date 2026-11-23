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

  // await app.register(rawBody, {
  //   field: "rawBody", // attaches to request.rawBody
  //   global: false, // only enable on routes that specify it
  //   encoding: false, // false = returns a Buffer (raw bytes)
  //   runFirst: true, // ensures it runs before JSON parsing
  // });

  // TODO(desafio): implementar o processamento do webhook do PagFácil.
  app.register(webhookRoutes);

  return app;
}
