import { Router } from 'express';
import { pquery } from '../db';

const router = Router();

router.post('/datasets', async (_req, res, next) => {
  try {
    const pres = await pquery('INSERT INTO datasets DEFAULT VALUES RETURNING id, created_at');
    console.log('Created dataset', pres.rows[0]);
    res.json(pres.rows[0]);
  } catch (e) {
    console.error('Failed to create dataset', e);
    next(e);
  }
});

export default router;