import fs from 'fs'; 
import path from 'path'; 
import { pool, pquery } from './db';

(async () => {
  const dir = path.resolve('migrations');

  await pquery(`CREATE TABLE IF NOT EXISTS _migrations(name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT now())`);

  for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.sql')).sort()) {
    const done = await pquery('SELECT 1 FROM _migrations WHERE name=$1', [f]);
    if (done.rowCount) continue;
    try {
      await pquery('BEGIN');
      await pquery(fs.readFileSync(path.join(dir, f), 'utf8'));
      await pquery('INSERT INTO _migrations (name) VALUES ($1)', [f]);
      await pquery('COMMIT');
      console.log('Applied', f);
    } catch (err) {
      await pquery('ROLLBACK');
      console.error('Failed migration', f, err);
      process.exit(1);
    }
  }
  
  await pool.end();
})();
