-- =============================================================
-- BeSQL  |  Migration 001  —  Drop & Recreate Full Schema
-- Aligned to frontend/js/app.js column names
-- Target : Supabase (PostgreSQL 15+)
-- Run    : paste into Supabase SQL Editor → Run
-- =============================================================

-- ─── 0. Extensions ───────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── 1. Drop existing objects (safe) ─────────────────────────
DROP TABLE IF EXISTS
  submissions,
  user_roles,
  contests,
  problems,
  users,
  besql_kv
  CASCADE;

-- ─── 2. Trigger function — auto-update updated_at ────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ─── 2.5 Key-Value Storage (besql_kv) ──────────────────────
-- Frontend expects: k (text PK), v (jsonb)
CREATE TABLE besql_kv (
  k TEXT PRIMARY KEY,
  v JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- ─── 3. Users ────────────────────────────────────────────────
-- Frontend expects: id, username, email, password_hash, full_name, is_active
CREATE TABLE users (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT          NOT NULL UNIQUE,
  email         TEXT          NOT NULL,
  password_hash TEXT          NOT NULL DEFAULT '',
  full_name     TEXT,
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── 4. User Roles ──────────────────────────────────────────
-- Frontend expects: user_id, role_id (1=admin, 2=contestant, 3=master)
CREATE TABLE user_roles (
  user_id   UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id   INT     NOT NULL DEFAULT 2,
  PRIMARY KEY (user_id, role_id)
);

-- ─── 5. Problems ─────────────────────────────────────────────
-- Frontend expects: id, code, title, difficulty, points, time_limit,
-- category, tags (jsonb), description, solution, sample_output (jsonb),
-- schema_hint (jsonb), test_cases (jsonb), daily_date, is_active,
-- created_by, created_at, updated_at
CREATE TABLE problems (
  id            TEXT          PRIMARY KEY,
  code          TEXT          NOT NULL DEFAULT '',
  title         TEXT          NOT NULL DEFAULT 'Untitled Problem',
  difficulty    TEXT          NOT NULL DEFAULT 'Easy',
  points        INT           NOT NULL DEFAULT 100,
  time_limit    INT,
  category      TEXT          NOT NULL DEFAULT 'General',
  tags          JSONB         NOT NULL DEFAULT '[]'::jsonb,
  description   TEXT          NOT NULL DEFAULT '',
  solution      TEXT          NOT NULL DEFAULT 'SELECT 1',
  sample_output JSONB,
  schema_hint   JSONB,
  test_cases    JSONB         NOT NULL DEFAULT '[]'::jsonb,
  daily_date    TEXT,
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  created_by    TEXT          NOT NULL DEFAULT 'system',
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_problems_updated_at
  BEFORE UPDATE ON problems FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── 6. Contests ─────────────────────────────────────────────
-- Frontend expects: id (text), title, description, type, status,
-- start_time, end_time, duration_minutes, problem_ids (jsonb),
-- is_public, max_participants, announcement, created_by,
-- invitees (jsonb), participants (jsonb), password
CREATE TABLE contests (
  id                TEXT        PRIMARY KEY,
  title             TEXT        NOT NULL DEFAULT 'Untitled Contest',
  description       TEXT        NOT NULL DEFAULT '',
  type              TEXT        NOT NULL DEFAULT 'official',
  status            TEXT        NOT NULL DEFAULT 'upcoming',
  start_time        TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_time          TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_minutes  INT         NOT NULL DEFAULT 120,
  problem_ids       JSONB       NOT NULL DEFAULT '[]'::jsonb,
  is_public         BOOLEAN     NOT NULL DEFAULT TRUE,
  max_participants  INT         NOT NULL DEFAULT 500,
  announcement      TEXT        NOT NULL DEFAULT '',
  created_by        TEXT        NOT NULL DEFAULT 'system',
  invitees          JSONB       NOT NULL DEFAULT '[]'::jsonb,
  participants      JSONB       NOT NULL DEFAULT '[]'::jsonb,
  password          TEXT        NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_contests_updated_at
  BEFORE UPDATE ON contests FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── 7. Submissions ──────────────────────────────────────────
-- Frontend expects: user_id, problem_id, contest_id, submitted_code,
-- verdict, error_message, runtime_ms, memory_mb, tests_passed,
-- total_tests, score, judged_at
CREATE TABLE submissions (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  problem_id      TEXT          NOT NULL,
  contest_id      TEXT,
  submitted_code  TEXT          NOT NULL DEFAULT '',
  verdict         TEXT          NOT NULL DEFAULT 'pending',
  error_message   TEXT,
  runtime_ms      NUMERIC       NOT NULL DEFAULT 0,
  memory_mb       NUMERIC,
  tests_passed    INT           NOT NULL DEFAULT 0,
  total_tests     INT           NOT NULL DEFAULT 0,
  score           INT           NOT NULL DEFAULT 0,
  judged_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ─── 8. Indexes ──────────────────────────────────────────────
CREATE INDEX idx_users_username       ON users(username);
CREATE INDEX idx_users_email          ON users(email);
CREATE INDEX idx_problems_active      ON problems(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_problems_created     ON problems(created_at);
CREATE INDEX idx_contests_start       ON contests(start_time DESC);
CREATE INDEX idx_submissions_user     ON submissions(user_id);
CREATE INDEX idx_submissions_problem  ON submissions(problem_id);
CREATE INDEX idx_submissions_contest  ON submissions(contest_id);

-- ─── 9. Row Level Security ───────────────────────────────────
-- Open RLS for anon + authenticated (app handles auth in-app)
ALTER TABLE besql_kv     ENABLE ROW LEVEL SECURITY;
ALTER TABLE users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE problems     ENABLE ROW LEVEL SECURITY;
ALTER TABLE contests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions  ENABLE ROW LEVEL SECURITY;

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE besql_kv       TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE users        TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE user_roles   TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE problems     TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE contests     TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE submissions  TO anon, authenticated;

-- Open policies (the app manages auth via KV-stored sessions)
CREATE POLICY "open_select" ON besql_kv     FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "open_insert" ON besql_kv     FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "open_update" ON besql_kv     FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "open_delete" ON besql_kv     FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY "open_select" ON users        FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "open_insert" ON users        FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "open_update" ON users        FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "open_delete" ON users        FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY "open_select" ON user_roles   FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "open_insert" ON user_roles   FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "open_update" ON user_roles   FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "open_delete" ON user_roles   FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY "open_select" ON problems     FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "open_insert" ON problems     FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "open_update" ON problems     FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "open_delete" ON problems     FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY "open_select" ON contests     FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "open_insert" ON contests     FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "open_update" ON contests     FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "open_delete" ON contests     FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY "open_select" ON submissions  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "open_insert" ON submissions  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "open_update" ON submissions  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "open_delete" ON submissions  FOR DELETE TO anon, authenticated USING (true);
