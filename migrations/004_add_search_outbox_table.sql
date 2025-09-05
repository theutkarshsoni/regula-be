CREATE TABLE IF NOT EXISTS search_outbox (
  id BIGSERIAL PRIMARY KEY,
  target TEXT NOT NULL, -- 'breach' | 'audit'
  row_id BIGINT NOT NULL,
  op TEXT NOT NULL, -- 'upsert'
  payload JSONB NOT NULL, -- denormalized doc for ES
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_outbox_unprocessed ON search_outbox(processed_at) WHERE processed_at IS NULL;