-- datasets: one upload event
CREATE TABLE IF NOT EXISTS datasets(
  id BIGSERIAL PRIMARY KEY, 
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- positions: rows from uploaded CSVs
CREATE TABLE IF NOT EXISTS positions(
  id BIGSERIAL PRIMARY KEY,
  dataset_id BIGINT REFERENCES datasets(id) ON DELETE CASCADE,
  trade_id TEXT NOT NULL, 
  trade_date DATE, 
  portfolio TEXT, 
  isin TEXT,
  issuer TEXT NOT NULL, 
  asset_class TEXT NOT NULL,
  qty NUMERIC, 
  price NUMERIC, 
  notional NUMERIC NOT NULL, 
  currency TEXT NOT NULL,
  UNIQUE(dataset_id, trade_id)
);

CREATE INDEX IF NOT EXISTS idx_positions_ds ON positions(dataset_id);
CREATE INDEX IF NOT EXISTS idx_positions_issuer ON positions(dataset_id, issuer);
CREATE INDEX IF NOT EXISTS idx_positions_asset ON positions(dataset_id, asset_class);

-- rules: configurable checks
CREATE TABLE IF NOT EXISTS rules(
  id BIGSERIAL PRIMARY KEY, 
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('concentration','exposure','large-trade')),
  threshold NUMERIC NOT NULL, 
  asset_class TEXT, 
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- rule_runs: tracking each execution of a rule
CREATE TABLE IF NOT EXISTS rule_runs(
  id BIGSERIAL PRIMARY KEY, 
  rule_id BIGINT REFERENCES rules(id) ON DELETE CASCADE,
  dataset_id BIGINT REFERENCES datasets(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ, 
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('running','completed','failed'))
);

-- breaches: violations detected by rule runs
CREATE TABLE IF NOT EXISTS breaches(
  id BIGSERIAL PRIMARY KEY, 
  rule_run_id BIGINT REFERENCES rule_runs(id) ON DELETE CASCADE,
  dataset_id BIGINT REFERENCES datasets(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,  -- issuer | asset_class | trade
  entity_key TEXT NOT NULL,  -- e.g. 'Apex Bank' or 'Equity' or trade_id
  metric TEXT NOT NULL,  -- issuer_pct | exposure | notional
  value NUMERIC NOT NULL, 
  threshold NUMERIC NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low','medium','high')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in-progress','in_progress','resolved')),
  assignee TEXT, 
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), 
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_breaches_dataset ON breaches(dataset_id);
CREATE INDEX IF NOT EXISTS idx_breaches_status ON breaches(status);
CREATE INDEX IF NOT EXISTS idx_breaches_severity ON breaches(severity);

-- audit_log: who changed what, when (compliance)
CREATE TABLE IF NOT EXISTS audit_log(
  id BIGSERIAL PRIMARY KEY, 
  entity TEXT NOT NULL,  -- e.g. 'breach' or 'rule'
  entity_id BIGINT NOT NULL,
  action TEXT NOT NULL, -- 'update', 'assign', etc.
  actor TEXT NOT NULL, -- username or system
  at TIMESTAMPTZ NOT NULL DEFAULT now(),
  details JSONB -- old/new values
);
