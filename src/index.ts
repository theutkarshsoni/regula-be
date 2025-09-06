import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { ensureIndices } from './search/setup';
import { startOutboxLoop } from './search/worker';
import { requireAuth } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';

import datasets from './routes/datasets';
import positions from './routes/positions';
import rules from './routes/rules';
import breaches from './routes/breaches';
import audits from './routes/audits';
import search from './routes/search';
import auth from './routes/auth';

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

const PUBLIC_PATHS = ['/health'];

app.use((req, res, next) => {
  if (req.method === 'OPTIONS') return next(); // allow preflight
  if (PUBLIC_PATHS.includes(req.path) || req.path.startsWith('/auth/')) {
    return next();
  }
  return requireAuth(req, res, next);
});

app.use('/datasets', datasets);
app.use('/positions', positions);
app.use('/rules', rules);
app.use('/breaches', breaches);
app.use('/audits', audits);
app.use('/search', search);
app.use('/auth', auth);

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use(errorHandler);

if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(process.env.PORT || 4000, () => console.log('API is up'));
}

export { app }; // required by vite-plugin-node
