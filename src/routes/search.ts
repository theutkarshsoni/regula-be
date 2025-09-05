import { Router } from 'express';
import { esclient, IDX_BREACHES, IDX_AUDIT } from '../search/es';

const router = Router();

/**
 * GET /search/breaches?text=&severity=&status=&datasetId=&from=&to=
 */

router.get('/search/breaches', async (req, res, next) => {
  try {
    const { text, severity, status, datasetId, from, to, page = '1', pageSize = '20' } = req.query as any;
    
    const must: any[] = [];
    const filter: any[] = [];
    if (text) must.push({ multi_match: { query: text, fields: ['notes^2', 'entity_key', 'assignee'], fuzziness: "AUTO" } });
    if (severity) filter.push({ term: { severity } });
    if (status) filter.push({ term: { status } });
    if (datasetId) filter.push({ term: { dataset_id: Number(datasetId) } });
    if (from || to) filter.push({ range: { created_at: { gte: from, lte: to } } });

    const fromIdx = (Number(page) - 1) * Number(pageSize);
    const searchBRes = await esclient.search({
      index: IDX_BREACHES,
      from: fromIdx,
      size: Number(pageSize),
      query: { bool: { must: must.length ? must : [{ match_all: {} }], filter } },
      sort: [{ created_at: { order: 'desc' } }]
    });

    res.json({
      total: searchBRes.hits.total,
      items: searchBRes.hits.hits.map(hit => ({ id: hit._id, score: hit._score, ...(typeof hit._source === 'object' && hit._source !== null ? hit._source : {}) }))
    });
  } catch (e) { 
    console.error('Error searching breaches:', e);
    next(e); 
  }
});

/**
 * GET /search/audit?text=&entity=breach&id=&from=&to=
 */

router.get('/search/audit', async (req, res, next) => {
  try {
    const { text, entity, id, from, to, page = '1', pageSize = '20' } = req.query as any;
    
    const must: any[] = [];
    const filter: any[] = [];
    if (text) must.push({ match: { details: text } });
    if (entity) filter.push({ term: { entity } });
    if (id) filter.push({ term: { entity_id: Number(id) } });
    if (from || to) filter.push({ range: { at: { gte: from, lte: to } } });

    const fromIdx = (Number(page) - 1) * Number(pageSize);
    const searchARes = await esclient.search({
      index: IDX_AUDIT,
      from: fromIdx,
      size: Number(pageSize),
      query: { bool: { must: must.length ? must : [{ match_all: {} }], filter } },
      sort: [{ at: { order: 'desc' } }]
    });

    res.json({
      total: searchARes.hits.total,
      items: searchARes.hits.hits.map(hit => ({ id: hit._id, score: hit._score, ...(typeof hit._source === 'object' && hit._source !== null ? hit._source : {}) }))
    });
  } catch (e) { 
    console.error('Error searching audit logs:', e);
    next(e); 
  }
});

export default router;
