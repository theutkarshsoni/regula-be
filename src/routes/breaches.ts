import { Router } from 'express';
import { pquery } from '../db';
import { paging } from '../utils/pagination';

const router = Router();

/**
 * GET /breaches?datasetId=1&status=open&severity=high&page=1&pageSize=20
 */

router.get('/', async (req, res, next) => {
  try {
    const datasetId = Number(req.query.datasetId);
    if (!datasetId) return res.status(400).json({ error: 'datasetId required' });

    const { limit, offset } = paging(req.query);
    const cond = ['dataset_id = $1'];
    const params: any[] = [datasetId];

    if (req.query.status) {
      params.push(req.query.status);
      cond.push(`status = $${params.length}`);
    }
    if (req.query.severity) {
      params.push(req.query.severity);
      cond.push(`severity = $${params.length}`);
    }

    const sql = `
      SELECT * FROM breaches
      WHERE ${cond.join(' AND ')}
      ORDER BY id DESC
      LIMIT $${params.length+1} OFFSET $${params.length+2}`;
    const cntSql = `SELECT COUNT(*) FROM breaches WHERE ${cond.join(' AND ')}`;

    const [rows, count] = await Promise.all([
      pquery(sql, [...params, limit, offset]),
      pquery(cntSql, params)
    ]);

    console.log('Fetched breaches, count:', Number(count.rows[0].count));
    res.json({ total: Number(count.rows[0].count), items: rows.rows });
  } catch (e) {
    console.error('Failed to get breaches', e);
    next(e);
  }
});

/**
 * PATCH /breaches/:id
 * body: { status?: string, assignee?: string, notes?: string }
 */

router.patch('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    const beforeRes = await pquery('SELECT * FROM breaches WHERE id=$1', [id]);
    if (!beforeRes.rows[0]) return res.status(404).json({ error: 'breach not found' });
    const before = beforeRes.rows[0];

    const { status, assignee, notes } = req.body;

    const afterRes = await pquery(`
      UPDATE breaches
      SET 
        status = COALESCE($2, status),
        assignee = COALESCE($3, assignee),
        notes = COALESCE($4, notes),
        updated_at = now()
      WHERE id = $1
      RETURNING *`,
      [id, status ?? null, assignee ?? null, notes ?? null]
    );
    const after = afterRes.rows[0];

    await pquery(
      `INSERT INTO audit_log (entity, entity_id, action, actor, details)
      VALUES ($1,$2,$3,$4,$5)`,
      ['breach', id, 'update', 'system', JSON.stringify({ before, after })]
    );

    console.log(`Breach ${id} updated`);
    res.json(after);
  } catch (e) {
    console.error('Failed to update breach', e);
    next(e);
  }
});

export default router;
