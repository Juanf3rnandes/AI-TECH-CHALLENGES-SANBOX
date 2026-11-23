// Simula um banco de dados: toda operação é assíncrona (há latência entre
// ler e escrever) e devolve cópias, nunca referências ao estado interno.
//
// Você pode alterar e estender este arquivo livremente. Só trate-o como se
// fosse um banco de verdade: nada de acessar o estado interno por fora.

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const LATENCY_MS = 2;

export function createStore(seedOrders = []) {
  const orders = new Map(seedOrders.map((order) => [order.id, { ...order }]));

  return {
    async getOrder(id) {
      await delay(LATENCY_MS);
      const order = orders.get(id);
      return order ? { ...order } : null;
    },

    async updateOrder(id, patch) {
      await delay(LATENCY_MS);
      const order = orders.get(id);
      if (!order) throw new Error(`order ${id} not found`);
      Object.assign(order, patch, { updatedAt: new Date().toISOString() });
      return { ...order };
    },
  };
}
