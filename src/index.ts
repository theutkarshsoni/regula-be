import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { ensureIndices } from './search/setup';
import { startOutboxLoop } from './search/worker';

import datasets from './routes/datasets';
import positions from './routes/positions';
import rules from './routes/rules';
import breaches from './routes/breaches';
import audits from './routes/audits';
import search from './routes/search';

const app = express();

app.use(cors()); 

app.use(express.json());

(async () => {
  try {
    if (process.env.ELASTIC_URL) {
      await ensureIndices();
      startOutboxLoop();
      console.log('Indices ensured & Outbox worker started');
    } else {
      console.log('ELASTIC_URL not set; search disabled');
    }
  } catch (e) {
    console.error('Search ops failed', e);
  }
})();

app.use('/datasets', datasets);
app.use('/positions', positions);
app.use('/rules', rules);
app.use('/breaches', breaches);
app.use('/audits', audits);
app.use('/search', search);

app.get('/health', (_req, res) => res.json({ ok: true }));

if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(process.env.PORT || 4000, () => console.log('API is up'));
}

export { app }; // required by vite-plugin-node
