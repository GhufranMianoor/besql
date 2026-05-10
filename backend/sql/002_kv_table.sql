-- =============================================================
-- BeSQL  |  Migration 002  —  KV Store Table
-- Used by frontend/js/storage/storage.js for client-side state
-- =============================================================

CREATE TABLE IF NOT EXISTS besql_kv (
  k          TEXT        PRIMARY KEY,
  v          JSONB,
  uid        UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_besql_kv_updated ON besql_kv(updated_at DESC);

ALTER TABLE besql_kv ENABLE ROW LEVEL SECURITY;

-- Users can only read and write their own KV rows
CREATE POLICY kv_owner ON besql_kv
  USING  (uid = auth.uid())
  WITH CHECK (uid = auth.uid());
