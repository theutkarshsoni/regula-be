import { Router } from 'express';
import { pquery } from '../db';

const router = Router();

/**
 * GET /audits?entity=breach&id=1
 */

router.get('/', async (req, res, next) => {
  try {
    const entity = req.query.entity as string;
    const id = Number(req.query.id);
    if (!entity || !id) return res.status(400).json({ error: 'entity and id required' });

    const rs = await pquery(
      'SELECT * FROM audit_log WHERE entity=$1 AND entity_id=$2 ORDER BY id DESC',
      [entity, id]
    );
    
    console.log(`Fetched audit logs for ${entity} ${id}, count:`, rs.rows.length);
    res.json(rs.rows);
  } catch (e) {
    console.error('Failed to get audit logs', e);
    next(e);
  }
});

export default router;
