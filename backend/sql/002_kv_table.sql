-- =============================================================
-- BeSQL  |  Migration 002  —  KV Store Table
-- Used by frontend/js/storage/storage.js for client-side state
-- =============================================================

CREATE TABLE IF NOT EXISTS besql_kv (
  k          TEXT        PRIMARY KEY,
  v          JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_besql_kv_updated ON besql_kv(updated_at DESC);

-- Grant access to anon and authenticated roles
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE besql_kv TO anon, authenticated;

ALTER TABLE besql_kv ENABLE ROW LEVEL SECURITY;

-- Allow anyone (anon or authenticated) to read all KV rows
DROP POLICY IF EXISTS "besql_kv_read" ON besql_kv;
CREATE POLICY "besql_kv_read" ON besql_kv
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow anyone to insert KV rows
DROP POLICY IF EXISTS "besql_kv_insert" ON besql_kv;
CREATE POLICY "besql_kv_insert" ON besql_kv
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow anyone to update KV rows
DROP POLICY IF EXISTS "besql_kv_update" ON besql_kv;
CREATE POLICY "besql_kv_update" ON besql_kv
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Allow anyone to delete KV rows
DROP POLICY IF EXISTS "besql_kv_delete" ON besql_kv;
CREATE POLICY "besql_kv_delete" ON besql_kv
  FOR DELETE
  TO anon, authenticated
  USING (true);
