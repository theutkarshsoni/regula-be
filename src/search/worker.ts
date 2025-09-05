import { pquery } from '../db';
import { esclient, IDX_BREACHES, IDX_AUDIT } from './es';

export async function runOutboxOnce(limit = 500) {
  const outboxRes = await pquery(`SELECT * FROM search_outbox WHERE processed_at IS NULL ORDER BY id ASC LIMIT $1`, [limit]);
  for (const row of outboxRes.rows) {
    try {
      if (row.target === 'breach') {
        await esclient.index({ index: IDX_BREACHES, id: String(row.row_id), document: row.payload });
      } else if (row.target === 'audit') {
        await esclient.index({ index: IDX_AUDIT, id: String(row.row_id), document: row.payload });
      }
      await pquery(`UPDATE search_outbox SET processed_at = now() WHERE id = $1`, [row.id]);
    } catch (e) {
      console.error('Outbox error', row.id, e);
    }
  }
}

// simple loop will be replaced with cron/queue later
export async function startOutboxLoop() {
  setInterval(() => runOutboxOnce().catch(console.error), 3000);
}
