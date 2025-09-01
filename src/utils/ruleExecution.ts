import { pool } from "../db";

export async function runConcentration(datasetId: number, thresholdPct: number, ruleRunId: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const res = await client.query(`
      WITH totals AS (
        SELECT issuer,
          SUM(notional) AS issuer_notional,
          SUM(SUM(notional)) OVER () AS total_notional
        FROM positions
        WHERE dataset_id = $1
        GROUP BY issuer
      )
      SELECT issuer,
        issuer_notional * 100.0 / NULLIF(total_notional, 0) AS pct
      FROM totals
      WHERE issuer_notional * 100.0 / NULLIF(total_notional, 0) > $2
    `, [datasetId, thresholdPct]);

    const insertSql = `
      INSERT INTO breaches
        (rule_run_id, dataset_id, entity_type, entity_key, metric, value, threshold, severity, status)
      VALUES
        ($1,$2,'issuer',$3,'issuer_pct',$4,$5,$6,'open')
    `;

    let count = 0;
    for (const row of res.rows as any[]) {
      const pct = Number(row.pct);
      const sev = pct > thresholdPct * 1.5 ? 'high' : pct > thresholdPct * 1.2 ? 'medium' : 'low';
      await client.query(insertSql, [ruleRunId, datasetId, row.issuer, pct, thresholdPct, sev]);
      count++;
    }

    await client.query('COMMIT');
    return count;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function runExposure(datasetId: number, assetClass: string, limitAbs: number, ruleRunId: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const res = await client.query(`
      SELECT asset_class, SUM(notional) AS exposure
      FROM positions
      WHERE dataset_id = $1 AND asset_class = $2
      GROUP BY asset_class
      HAVING SUM(notional) > $3
    `, [datasetId, assetClass, limitAbs]);

    const insertSql = `
      INSERT INTO breaches
        (rule_run_id, dataset_id, entity_type, entity_key, metric, value, threshold, severity, status)
      VALUES
        ($1,$2,'asset_class',$3,'exposure',$4,$5,$6,'open')
    `;

    let count = 0;
    for (const row of res.rows as any[]) {
      const exposure = Number(row.exposure);
      const sev = exposure > limitAbs * 1.2 ? 'high' : exposure > limitAbs * 1.05 ? 'medium' : 'low';
      await client.query(insertSql, [ruleRunId, datasetId, row.asset_class, exposure, limitAbs, sev]);
      count++;
    }

    await client.query('COMMIT');
    return count;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function runLargeTrade(datasetId: number, tradeLimit: number, ruleRunId: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const res = await client.query(`
      SELECT trade_id, notional
      FROM positions
      WHERE dataset_id = $1 AND notional > $2
    `, [datasetId, tradeLimit]);

    const insertSql = `
      INSERT INTO breaches
        (rule_run_id, dataset_id, entity_type, entity_key, metric, value, threshold, severity, status)
      VALUES
        ($1,$2,'trade',$3,'notional',$4,$5,$6,'open')
    `;

    let count = 0;
    for (const row of res.rows as any[]) {
      const v = Number(row.notional);
      const sev = v > tradeLimit * 1.2 ? 'high' : v > tradeLimit * 1.05 ? 'medium' : 'low';
      await client.query(insertSql, [ruleRunId, datasetId, row.trade_id, v, tradeLimit, sev]);
      count++;
    }

    await client.query('COMMIT');
    return count;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
