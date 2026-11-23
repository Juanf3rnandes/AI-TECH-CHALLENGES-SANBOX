import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { createStore } from '../src/store.js';
import { createFulfillmentClient } from '../src/fulfillment.js';
import { sign, paymentEvent } from './gateway.js';

const SECRET = 'test-secret';

function setup({ fulfillmentOptions } = {}) {
  const store = createStore([
    { id: 'ord_1', totalCents: 15990, status: 'pending' },
    { id: 'ord_2', totalCents: 4990, status: 'pending' },
  ]);
  const fulfillment = createFulfillmentClient(fulfillmentOptions);
  const app = buildApp({ store, fulfillment, webhookSecret: SECRET });

  // Entrega como o PagFácil: aceita um objeto ou o corpo cru já serializado.
  const deliver = (eventOrRawBody, { signature } = {}) => {
    const body = typeof eventOrRawBody === 'string' ? eventOrRawBody : JSON.stringify(eventOrRawBody);
    const headers = { 'content-type': 'application/json' };
    const sig = signature === undefined ? sign(body, SECRET) : signature;
    if (sig !== null) headers['x-pagfacil-signature'] = sig;
    return app.inject({ method: 'POST', url: '/webhooks/payments', headers, payload: body });
  };

  const orderStatus = async (id) => (await store.getOrder(id)).status;

  return { app, store, fulfillment, deliver, orderStatus };
}

const isSuccess = (response) => response.statusCode >= 200 && response.statusCode < 300;

describe('autenticidade', () => {
  it('aceita um evento com assinatura válida e confirma o pagamento', async () => {
    const { deliver, fulfillment, orderStatus } = setup();

    const response = await deliver(paymentEvent({ order_id: 'ord_1', amount_cents: 15990 }));

    assert.ok(isSuccess(response), `esperava 2xx, recebeu ${response.statusCode}`);
    assert.equal(await orderStatus('ord_1'), 'paid');
    assert.deepEqual(fulfillment.dispatched, ['ord_1']);
  });

  it('rejeita assinatura inválida sem alterar nada', async () => {
    const { deliver, fulfillment, orderStatus } = setup();
    const event = paymentEvent();

    const response = await deliver(event, { signature: sign(JSON.stringify(event), 'outro-segredo') });

    assert.equal(response.statusCode, 401);
    assert.equal(await orderStatus('ord_1'), 'pending');
    assert.deepEqual(fulfillment.dispatched, []);
  });

  it('rejeita requisição sem assinatura', async () => {
    const { deliver, orderStatus } = setup();

    const response = await deliver(paymentEvent(), { signature: null });

    assert.equal(response.statusCode, 401);
    assert.equal(await orderStatus('ord_1'), 'pending');
  });

  it('valida a assinatura sobre os bytes exatamente como foram enviados', async () => {
    const { deliver, orderStatus } = setup();
    const rawBody = `{
      "amount_cents": 15990,
      "event_id" : "evt_formatado",
      "occurred_at": "2026-11-10T12:00:00Z",
      "order_id": "ord_1",
      "type": "payment.paid"
    }`;

    const response = await deliver(rawBody);

    assert.ok(isSuccess(response), `esperava 2xx, recebeu ${response.statusCode}`);
    assert.equal(await orderStatus('ord_1'), 'paid');
  });
});

describe('validação do payload', () => {
  it('rejeita evento assinado mas malformado', async () => {
    const { deliver, orderStatus } = setup();
    const { amount_cents, ...withoutAmount } = paymentEvent();

    const response = await deliver(withoutAmount);

    assert.equal(response.statusCode, 400);
    assert.equal(await orderStatus('ord_1'), 'pending');
  });

  it('rejeita tipo de evento desconhecido', async () => {
    const { deliver, orderStatus } = setup();

    const response = await deliver(paymentEvent({ type: 'payment.teleported' }));

    assert.equal(response.statusCode, 400);
    assert.equal(await orderStatus('ord_1'), 'pending');
  });
});

describe('entrega duplicada', () => {
  it('reentrega do mesmo evento é aceita e não despacha de novo', async () => {
    const { deliver, fulfillment } = setup();
    const event = paymentEvent();

    const first = await deliver(event);
    const second = await deliver(event);

    assert.ok(isSuccess(first));
    assert.ok(isSuccess(second), 'reentrega deve ser confirmada para o gateway parar de reenviar');
    assert.deepEqual(fulfillment.dispatched, ['ord_1']);
  });

  it('entregas simultâneas do mesmo evento despacham uma única vez', async () => {
    const { deliver, fulfillment, orderStatus } = setup();
    const event = paymentEvent();

    await Promise.all([deliver(event), deliver(event), deliver(event)]);

    assert.equal(await orderStatus('ord_1'), 'paid');
    assert.deepEqual(fulfillment.dispatched, ['ord_1']);
  });
});

describe('ordem dos eventos', () => {
  it('falha de uma tentativa antiga não desfaz um pagamento confirmado', async () => {
    const { deliver, orderStatus } = setup();

    await deliver(paymentEvent({ type: 'payment.paid' }));
    await deliver(paymentEvent({ type: 'payment.failed' }));

    assert.equal(await orderStatus('ord_1'), 'paid');
  });

  it('pagamento aprovado depois de uma tentativa falha confirma o pedido', async () => {
    const { deliver, fulfillment, orderStatus } = setup();

    await deliver(paymentEvent({ type: 'payment.failed' }));
    assert.equal(await orderStatus('ord_1'), 'failed');

    await deliver(paymentEvent({ type: 'payment.paid' }));
    assert.equal(await orderStatus('ord_1'), 'paid');
    assert.deepEqual(fulfillment.dispatched, ['ord_1']);
  });

  it('estorno depois do pagamento marca o pedido como estornado', async () => {
    const { deliver, orderStatus } = setup();

    await deliver(paymentEvent({ type: 'payment.paid' }));
    await deliver(paymentEvent({ type: 'payment.refunded' }));

    assert.equal(await orderStatus('ord_1'), 'refunded');
  });

  it('pagamento que chega depois do estorno não reabre nem despacha o pedido', async () => {
    const { deliver, fulfillment, orderStatus } = setup();

    await deliver(paymentEvent({ type: 'payment.refunded' }));
    const late = await deliver(paymentEvent({ type: 'payment.paid' }));

    assert.ok(isSuccess(late), 'evento obsoleto deve ser confirmado para não gerar retentativas infinitas');
    assert.equal(await orderStatus('ord_1'), 'refunded');
    assert.deepEqual(fulfillment.dispatched, []);
  });
});

describe('regras de negócio', () => {
  it('valor divergente não confirma o pedido e o envia para revisão', async () => {
    const { deliver, fulfillment, orderStatus } = setup();

    const response = await deliver(paymentEvent({ order_id: 'ord_2', amount_cents: 100 }));

    assert.ok(isSuccess(response), 'reenviar o mesmo evento não corrige o valor; não force retentativas');
    assert.equal(await orderStatus('ord_2'), 'payment_review');
    assert.deepEqual(fulfillment.dispatched, []);
  });
});

describe('falhas da Expedição', () => {
  it('se a Expedição falhar, a retentativa do gateway conclui o despacho', async () => {
    const { deliver, fulfillment, orderStatus } = setup({ fulfillmentOptions: { failNextCalls: 1 } });
    const event = paymentEvent();

    const first = await deliver(event);
    assert.ok(!isSuccess(first), 'a falha precisa ser sinalizada para o gateway reenviar');

    const retry = await deliver(event);
    assert.ok(isSuccess(retry), `esperava 2xx na retentativa, recebeu ${retry.statusCode}`);
    assert.equal(await orderStatus('ord_1'), 'paid');
    assert.deepEqual(fulfillment.dispatched, ['ord_1']);
  });
});
