import { esclient, IDX_BREACHES, IDX_AUDIT } from './es';

export async function ensureIndices() {
  const existsB = await esclient.indices.exists({ index: IDX_BREACHES });
  if (!existsB) {
    await esclient.indices.create({
      index: IDX_BREACHES,
      settings: { number_of_shards: 1, number_of_replicas: 0 },
      mappings: {
        properties: {
          id: { type: 'long' },
          rule_run_id: { type: 'long' },
          dataset_id: { type: 'long' },
          entity_type: { type: 'keyword' },
          entity_key: { type: 'text', fields: { raw: { type: 'keyword' } } },
          metric: { type: 'keyword' },
          value: { type: 'double' },
          threshold: { type: 'double' },
          severity: { type: 'keyword' },
          status: { type: 'keyword' },
          assignee: { type: 'keyword' },
          notes: { type: 'text', analyzer: 'english' },
          created_at: { type: 'date' },
          updated_at: { type: 'date' }
        }
      }
    });
  }

  const existsA = await esclient.indices.exists({ index: IDX_AUDIT });
  if (!existsA) {
    await esclient.indices.create({
      index: IDX_AUDIT,
      settings: { number_of_shards: 1, number_of_replicas: 0 },
      mappings: {
        properties: {
          id: { type: 'long' },
          entity: { type: 'keyword' },
          entity_id: { type: 'long' },
          action: { type: 'keyword' },
          actor: { type: 'keyword' },
          at: { type: 'date' },
          details: { type: 'text', analyzer: 'english' }
        }
      }
    });
  }
}
