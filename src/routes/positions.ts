import { Router } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse';
import { pquery, pool } from '../db';
import { paging } from '../utils/pagination';

const upload = multer();
const router = Router();

/**
 * POST /positions/upload?datasetId=1
 * Form-data: file=<csv>
 */

router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    const datasetId = parseInt(req.query.datasetId as string, 10);
    if (!datasetId) return res.status(400).json({ error: 'datasetId required' });
    if (!req.file) return res.status(400).json({ error: 'file required' });

    // Stream parse CSV
    const parser = parse({ columns: true, skip_empty_lines: true, trim: true });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const batch: any[] = [];
      const BATCH_SIZE = 500;

      const flush = async () => {
        if (!batch.length) return;
        
        const vals = batch.flatMap((r) => [
          datasetId, r.trade_id, r.trade_date, r.portfolio, r.isin, r.issuer,
          r.asset_class, Number(r.qty), Number(r.price), Number(r.notional), r.currency
        ]);

        const placeholders = batch.map((_, i) => {
          const offset = i * 11;
          const group = Array.from({ length: 11 }, (_, j) => `$${offset + j + 1}`).join(',');
          return `(${group})`;
        }).join(',');

        const sql = `
          INSERT INTO positions (dataset_id, trade_id, trade_date, portfolio, isin, issuer, asset_class, qty, price, notional, currency)
          VALUES ${placeholders}
          ON CONFLICT (dataset_id, trade_id) DO NOTHING`;
        
        await client.query(sql, vals);
        batch.length = 0;
      };

      parser.on('readable', () => {
        let rec;
        while ((rec = parser.read())) {
          if (!rec.trade_id || !rec.issuer || !rec.asset_class || !rec.notional || !rec.currency) {
            console.log('Skipping invalid record', rec);
            continue;
          }
          batch.push(rec);
          if (batch.length >= BATCH_SIZE) {
            // backpressure via async flush
            parser.pause();
            flush().then(() => parser.resume());
          }
        }
      });

      parser.on('end', async () => {
        await flush();
        await client.query('COMMIT');
        client.release();
        console.log('Uploaded positions for datasetId', datasetId);
        res.json({ ok: true });
      });

      parser.on('error', async (err) => {
        await client.query('ROLLBACK');
        client.release();
        console.error('CSV parse error', err);
        next(err);
      });

      parser.write(req.file.buffer);
      parser.end();
    } catch (e) {
      await client.query('ROLLBACK');
      client.release();
      console.error('Failed to add positions', e);
      throw e;
    }
  } catch (e) {
    console.error('Failed to upload positions', e);
    next(e);
  }
});

/**
 * GET /positions?datasetId=1&page=1&pageSize=20&issuer=...&asset_class=...
 */

router.get('/', async (req, res, next) => {
  try {
    const datasetId = parseInt(req.query.datasetId as string, 10);
    if (!datasetId) return res.status(400).json({ error: 'datasetId required' });

    const { limit, offset } = paging(req.query);
    const where = ['dataset_id = $1'];
    const params: any[] = [datasetId];

    const issuer = req.query.issuer as string | undefined;
    const asset = req.query.asset_class as string | undefined;

    if (issuer) { 
      params.push(issuer); 
      where.push(`issuer = $${params.length}`); 
    }
    if (asset)  { 
      params.push(asset);  
      where.push(`asset_class = $${params.length}`); 
    }

    const sql = `
      SELECT id, trade_id, trade_date, portfolio, isin, issuer, asset_class, qty, price, notional, currency
      FROM positions
      WHERE ${where.join(' AND ')}
      ORDER BY id DESC
      LIMIT $${params.length+1} 
      OFFSET $${params.length+2}`;

    const countSql = `SELECT COUNT(*) FROM positions WHERE ${where.join(' AND ')}`;

    const [rows, count] = await Promise.all([
      pquery(sql, [...params, limit, offset]),
      pquery(countSql, params)
    ]);

    res.json({ 
      total: Number(count.rows[0].count), 
      items: rows.rows 
    });
  } catch (e) {
    console.error('Failed to get positions', e);
    next(e);
  }
});

export default router;
