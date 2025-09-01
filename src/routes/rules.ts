import { Router } from 'express';
import { pquery } from '../db';
import { paging } from '../utils/pagination';
import { RuleSchema } from '../utils/validation';
import { runConcentration, runExposure, runLargeTrade  } from '../utils/ruleExecution';

const router = Router();

/**
 * GET /rules?active=true|false&page=1&pageSize=20
 */
router.get('/', async (req, res, next) => {
  try {
    const { active } = req.query;

    let query = 'SELECT * FROM rules';
    const queryParams = [];

    if (active === 'true' || active === 'false') {
      query += ' WHERE active = $1';
      queryParams.push(active === 'true');
    }

    const { limit, offset } = paging(req.query);
    query += ` ORDER BY created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);

    const rules = await pquery(query, queryParams);
    console.log('Fetched rules, count:', rules.rows.length);
    res.json(rules.rows);
  } catch (e) {
    console.error('Failed to get rules', e);
    next(e);
  }
});


/**
 * POST /rules
 * body: { name: string, type: string, threshold: number, asset_class?: string }
 */

router.post('/', async (req, res, next) => {
  try {
    const parsed = RuleSchema.safeParse(req.body);
    if (!parsed.success) {
      console.warn('Validation failed for creating rule', parsed.error.issues );
      return res.status(400).json({ error: 'Invalid rule data', details: parsed.error.issues });
    }

    // Validate asset_class for exposure rules
    if (parsed.data.type === 'exposure' && !parsed.data.asset_class) {
      return res.status(400).json({ error: 'asset_class is required for exposure rules' });
    }

    const { name, type, threshold, asset_class } = parsed.data;

    const insertQuery = `
      INSERT INTO rules (name, type, threshold, asset_class)
      VALUES ($1, $2, $3, $4)
      RETURNING *`;
    const insertParams = [name, type, threshold, asset_class || null];

    const newRule = await pquery(insertQuery, insertParams);
    console.log('Created rule', newRule.rows[0]);
    res.status(201).json(newRule.rows[0]);
  } catch (e) {
    console.error('Failed to create rule', e);
    next(e);
  }
});

/**
 * PATCH /rules/:id
 * body: { name?: string, type?: string, threshold?: number, asset_class?: string, active?: boolean }
 */

router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log('body:', req.body);
    const parsed = RuleSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      console.warn('Validation failed for updating rule', parsed.error.issues);
      return res.status(400).json({ error: 'Invalid rule data', details: parsed.error.issues });
    }

    // Validate asset_class for exposure rules
    if (parsed.data.type === 'exposure' && !parsed.data.asset_class) {
      return res.status(400).json({ error: 'asset_class is required for exposure rules' });
    }

    const { name, type, threshold, asset_class, active } = parsed.data;

    const updateQuery = `
      UPDATE rules
      SET name = COALESCE($2, name), type = COALESCE($3, type), threshold = COALESCE($4, threshold), asset_class = COALESCE($5, asset_class), active = COALESCE($6, active)
      WHERE id = $1
      RETURNING *`;
    const updateParams = [id, name ?? null, type ?? null, threshold ?? null, asset_class ?? null, active ?? null];

    const updatedRule = await pquery(updateQuery, updateParams);
    if (updatedRule.rowCount === 0) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    console.log('Updated rule', updatedRule.rows[0]);
    res.json(updatedRule.rows[0]);
  } catch (e) {
    console.error('Failed to update rule', e);
    next(e);
  }
});

/**
 * POST /rules/:id/run
 * body: { datasetId: number }
 */

router.post('/:id/run', async (req, res, next) => {
  try {
    const ruleId = Number(req.params.id);
    const datasetId = Number(req.body.datasetId);
    if (!datasetId) return res.status(400).json({ error: 'datasetId required' });

    const ruleRes = await pquery('SELECT * FROM rules WHERE id = $1', [ruleId]);
    const rule = ruleRes.rows[0];
    if (!rule) return res.status(404).json({ error: 'rule not found' });
    if (!rule.active) return res.status(400).json({ error: 'rule is inactive' });

    let runId:number = 0;

    try {
      const runRes = await pquery(
        'INSERT INTO rule_runs (rule_id, dataset_id, status) VALUES ($1,$2,$3) RETURNING id',
        [ruleId, datasetId, 'running']
      );
      runId = runRes.rows[0].id;
      
      let created = 0;
      if (rule.type === 'concentration') {
        created = await runConcentration(datasetId, Number(rule.threshold), runId);
      } else if (rule.type === 'exposure') {
        if (!rule.asset_class) return res.status(400).json({ error: 'asset_class required for exposure rule' });
        created = await runExposure(datasetId, rule.asset_class, Number(rule.threshold), runId);
      } else if (rule.type === 'large-trade') {
        created = await runLargeTrade(datasetId, Number(rule.threshold), runId);
      }

      await pquery('UPDATE rule_runs SET status=$2, finished_at=now() WHERE id=$1', [runId, 'completed']);
      console.log(`Rule ${ruleId} run completed, created breaches: ${created}`);
      res.json({ ruleRunId: runId, createdBreaches: created });
    } catch (err) {
      if(runId) {
        await pquery('UPDATE rule_runs SET status=$2, finished_at=now() WHERE id=$1', [runId, 'failed']);
      }
      console.error('Error running rule:', err);
      next(err);
    }
  } catch (e) {
    console.error('Failed to run rule', e);
    next(e);
  }
});


export default router;
