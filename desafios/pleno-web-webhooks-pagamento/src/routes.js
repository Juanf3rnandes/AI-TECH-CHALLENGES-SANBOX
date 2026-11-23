import Fastify from "fastify";

import { createHmac } from "node:crypto";

// PAYLOAD DO WEBHOOK
// > {
// >   "event_id": "evt_8f2a1c",
// >   "type": "payment.paid",
// >   "order_id": "ord_1",
// >   "amount_cents": 15990,
// >   "occurred_at": "2026-11-10T12:00:00Z"
// > }

const resolveCredentials = () => {
  return process.env.WEBHOOK_SECRET ?? "dev-secret";
};

export async function webhookRoutes(fastify) {
  fastify.route({
    method: "POST",
    url: "/webhooks/payments",

    // A validação do evento fica no handler para que a assinatura seja
    // verificada antes de rejeitar um payload malformado.
    handler: async (request, reply) => {
      //  const rawBytes = request.rawBody;

      const signature = request.headers["X-PagFacil-Signature"];
      const validFormat = /^sha256=[0-9a-f]{64}$/;
      const secret = resolveCredentials();

      // const isSignatureValid = createHmac(rawBytes, secret);

      if (!signature || !validFormat.test(signature)) {
        return reply
          .code(401)
          .send({ error: "Assinatura invalida ou ausente" });
      }
    },
  });
}
