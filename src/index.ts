import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import datasets from './routes/datasets';

const app = express();

app.use(cors()); 

app.use(express.json());

app.use(datasets);

app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(process.env.PORT || 4000, () => console.log('API is up'));