import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import datasets from './routes/datasets';
import positions from './routes/positions';

const app = express();

app.use(cors()); 

app.use(express.json());

app.use(datasets);
app.use(positions);

app.get('/health', (_req, res) => res.json({ ok: true }));

if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(process.env.PORT || 4000, () => console.log('API is up'));
}

export { app }; // required by vite-plugin-node
