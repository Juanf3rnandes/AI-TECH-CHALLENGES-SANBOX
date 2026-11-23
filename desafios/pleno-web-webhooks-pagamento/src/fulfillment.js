// Cliente fake do serviço de Expedição.
//
// ATENÇÃO: o serviço NÃO é idempotente. Cada chamada bem-sucedida a
// release() gera um despacho físico — chamar duas vezes envia duas caixas.
// Ele também fica instável de vez em quando e responde com erro.

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function createFulfillmentClient({ latencyMs = 10, failNextCalls = 0 } = {}) {
  const dispatched = [];
  let failuresLeft = failNextCalls;

  return {
    // Pedidos efetivamente despachados (um item por despacho).
    dispatched,

    async release(orderId) {
      await delay(latencyMs);
      if (failuresLeft > 0) {
        failuresLeft -= 1;
        throw new Error('fulfillment service unavailable');
      }
      dispatched.push(orderId);
    },
  };
}
