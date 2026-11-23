import { buildApp } from './app.js';
import { createStore } from './store.js';
import { createFulfillmentClient } from './fulfillment.js';

const PORT = Number(process.env.PORT ?? 3000);
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? 'dev-secret';

const store = createStore([
  { id: 'ord_1', totalCents: 15990, status: 'pending' },
  { id: 'ord_2', totalCents: 4990, status: 'pending' },
  { id: 'ord_3', totalCents: 89900, status: 'pending' },
]);

const fulfillment = createFulfillmentClient();

const app = buildApp({ store, fulfillment, webhookSecret: WEBHOOK_SECRET, logger: true });

app.listen({ port: PORT }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
