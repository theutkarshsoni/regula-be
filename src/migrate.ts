import fs from 'fs'; 
import path from 'path'; 
import { pool, q } from './db';

(async () => {
  const dir = path.resolve('migrations');

  await q(`CREATE TABLE IF NOT EXISTS _migrations(name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT now())`);

  for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.sql')).sort()) {
    const done = await q('SELECT 1 FROM _migrations WHERE name=$1', [f]);
    if (done.rowCount) continue;
    try {
      await q('BEGIN');
      await q(fs.readFileSync(path.join(dir, f), 'utf8'));
      await q('INSERT INTO _migrations (name) VALUES ($1)', [f]);
      await q('COMMIT');
      console.log('Applied', f);
    } catch (err) {
      await q('ROLLBACK');
      console.error('Failed migration', f, err);
      process.exit(1);
    }
  }
  
  await pool.end();
})();
