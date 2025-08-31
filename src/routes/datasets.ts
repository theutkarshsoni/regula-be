import { Router } from 'express';
import { pquery } from '../db';

const router = Router();

/**
 * POST /datasets
 */

router.post('/', async (_req, res, next) => {
  try {
    const dts = await pquery('INSERT INTO datasets DEFAULT VALUES RETURNING id, created_at');
    console.log('Created dataset', dts.rows[0]);
    res.json(dts.rows[0]);
  } catch (e) {
    console.error('Failed to create dataset', e);
    next(e);
  }
});

export default router;