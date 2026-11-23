// Simula o lado do PagFácil: monta eventos e assina o corpo como o gateway faz.
import crypto from 'node:crypto';

export function sign(rawBody, secret) {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
}

let sequence = 0;

export function paymentEvent(overrides = {}) {
  sequence += 1;
  return {
    event_id: `evt_${Date.now()}_${sequence}`,
    type: 'payment.paid',
    order_id: 'ord_1',
    amount_cents: 15990,
    occurred_at: new Date().toISOString(),
    ...overrides,
  };
}
