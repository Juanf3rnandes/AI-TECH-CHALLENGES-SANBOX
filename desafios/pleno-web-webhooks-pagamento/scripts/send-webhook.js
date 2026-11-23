// Envia um webhook assinado para o servidor local, como o PagFácil faria.
//
//   npm run webhook -- <tipo> <order_id> <amount_cents> [event_id]
//   npm run webhook -- payment.paid ord_1 15990
//   npm run webhook -- payment.paid ord_1 15990 evt_fixo   # reenvio do mesmo evento
import { sign, paymentEvent } from '../test/gateway.js';

const [type, orderId, amount, eventId] = process.argv.slice(2);
if (!type || !orderId || !amount) {
  console.error('uso: npm run webhook -- <tipo> <order_id> <amount_cents> [event_id]');
  process.exit(1);
}

const url = `http://localhost:${process.env.PORT ?? 3000}/webhooks/payments`;
const secret = process.env.WEBHOOK_SECRET ?? 'dev-secret';

const event = paymentEvent({ type, order_id: orderId, amount_cents: Number(amount) });
if (eventId) event.event_id = eventId;
const body = JSON.stringify(event);

const response = await fetch(url, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-pagfacil-signature': sign(body, secret) },
  body,
});

console.log(`-> ${body}`);
console.log(`<- ${response.status} ${await response.text()}`);
