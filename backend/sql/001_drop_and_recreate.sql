-- =============================================================
-- BeSQL  |  Migration 001  —  Drop & Recreate Full Schema
-- Target : Supabase (PostgreSQL 15+)
-- Run    : paste into Supabase SQL Editor → Run
-- =============================================================

-- ─── 0. Extensions ───────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- trigram search on problem titles

-- ─── 1. Drop existing objects (safe cascade) ─────────────────
DROP TABLE IF EXISTS
  submission_test_results,
  submissions,
  contest_participants,
  contest_problems,
  contests,
  problem_tags,
  tags,
  problems,
  user_profiles,
  users
  CASCADE;

DROP TYPE IF EXISTS
  submission_status,
  contest_status,
  difficulty_level,
  sql_dialect
  CASCADE;

DROP FUNCTION IF EXISTS update_updated_at() CASCADE;

-- ─── 2. Enum types ───────────────────────────────────────────
CREATE TYPE submission_status AS ENUM (
  'pending', 'accepted', 'wrong_answer',
  'runtime_error', 'time_limit_exceeded', 'compile_error'
);

CREATE TYPE contest_status AS ENUM (
  'draft', 'upcoming', 'active', 'ended', 'cancelled'
);

CREATE TYPE difficulty_level AS ENUM (
  'beginner', 'easy', 'medium', 'hard', 'expert'
);

CREATE TYPE sql_dialect AS ENUM (
  'postgresql', 'mysql', 'sqlite', 'mssql', 'oracle'
);

-- ─── 3. Trigger function — auto-update updated_at ────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ─── 4. Core tables ──────────────────────────────────────────

-- 4.1  users
CREATE TABLE users (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT          NOT NULL UNIQUE,
  username      TEXT          NOT NULL UNIQUE
                              CHECK (length(username) BETWEEN 3 AND 30)
                              CHECK (username ~ '^[a-zA-Z0-9_]+$'),
  role          TEXT          NOT NULL DEFAULT 'user'
                              CHECK (role IN ('user', 'admin', 'moderator')),
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4.2  user_profiles  (1-to-1 extension, keeps users table lean)
CREATE TABLE user_profiles (
  user_id         UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name    TEXT,
  avatar_url      TEXT,
  bio             TEXT        CHECK (length(bio) <= 500),
  country         CHAR(2),
  points          INT         NOT NULL DEFAULT 0 CHECK (points >= 0),
  rank            INT,
  problems_solved INT         NOT NULL DEFAULT 0 CHECK (problems_solved >= 0),
  contests_joined INT         NOT NULL DEFAULT 0 CHECK (contests_joined >= 0),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4.3  problems
CREATE TABLE problems (
  id            UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT             NOT NULL UNIQUE,
  title         TEXT             NOT NULL,
  description   TEXT             NOT NULL,
  difficulty    difficulty_level NOT NULL DEFAULT 'easy',
  dialect       sql_dialect      NOT NULL DEFAULT 'postgresql',
  schema_setup  TEXT             NOT NULL,
  solution_sql  TEXT             NOT NULL,
  checker_sql   TEXT,
  time_limit_ms INT              NOT NULL DEFAULT 5000 CHECK (time_limit_ms > 0),
  max_score     INT              NOT NULL DEFAULT 100  CHECK (max_score > 0),
  is_published  BOOLEAN          NOT NULL DEFAULT FALSE,
  author_id     UUID             REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ      NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ      NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_problems_updated_at
  BEFORE UPDATE ON problems
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4.4  tags
CREATE TABLE tags (
  id        SERIAL  PRIMARY KEY,
  name      TEXT    NOT NULL UNIQUE,
  color_hex CHAR(7) DEFAULT '#6366f1'
);

-- 4.5  problem_tags  (M-to-M)
CREATE TABLE problem_tags (
  problem_id UUID REFERENCES problems(id) ON DELETE CASCADE,
  tag_id     INT  REFERENCES tags(id)     ON DELETE CASCADE,
  PRIMARY KEY (problem_id, tag_id)
);

-- 4.6  contests
CREATE TABLE contests (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT           NOT NULL,
  description      TEXT,
  status           contest_status NOT NULL DEFAULT 'draft',
  starts_at        TIMESTAMPTZ    NOT NULL,
  ends_at          TIMESTAMPTZ    NOT NULL,
  max_participants INT,
  is_public        BOOLEAN        NOT NULL DEFAULT TRUE,
  created_by       UUID           REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ    NOT NULL DEFAULT now(),
  CONSTRAINT chk_dates CHECK (ends_at > starts_at)
);

CREATE TRIGGER trg_contests_updated_at
  BEFORE UPDATE ON contests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4.7  contest_problems  (M-to-M with ordering)
CREATE TABLE contest_problems (
  contest_id UUID     REFERENCES contests(id) ON DELETE CASCADE,
  problem_id UUID     REFERENCES problems(id) ON DELETE CASCADE,
  position   SMALLINT NOT NULL DEFAULT 1,
  points     INT      NOT NULL DEFAULT 100,
  PRIMARY KEY (contest_id, problem_id)
);

-- 4.8  contest_participants
CREATE TABLE contest_participants (
  contest_id    UUID        REFERENCES contests(id) ON DELETE CASCADE,
  user_id       UUID        REFERENCES users(id)    ON DELETE CASCADE,
  score         INT         NOT NULL DEFAULT 0 CHECK (score >= 0),
  rank          INT,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (contest_id, user_id)
);

-- 4.9  submissions
CREATE TABLE submissions (
  id            UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID              NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  problem_id    UUID              NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  contest_id    UUID              REFERENCES contests(id)          ON DELETE SET NULL,
  submitted_sql TEXT              NOT NULL,
  status        submission_status NOT NULL DEFAULT 'pending',
  score         INT               NOT NULL DEFAULT 0 CHECK (score >= 0),
  exec_time_ms  INT               CHECK (exec_time_ms >= 0),
  error_message TEXT,
  submitted_at  TIMESTAMPTZ       NOT NULL DEFAULT now()
);

-- 4.10  submission_test_results
CREATE TABLE submission_test_results (
  id              BIGSERIAL PRIMARY KEY,
  submission_id   UUID      NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  test_case_no    SMALLINT  NOT NULL,
  passed          BOOLEAN   NOT NULL,
  expected_output TEXT,
  actual_output   TEXT,
  exec_time_ms    INT
);

-- ─── 5. Indexes ──────────────────────────────────────────────
CREATE INDEX idx_users_email         ON users(email);
CREATE INDEX idx_users_username      ON users(username);
CREATE INDEX idx_problems_slug       ON problems(slug);
CREATE INDEX idx_problems_difficulty ON problems(difficulty);
CREATE INDEX idx_problems_dialect    ON problems(dialect);
CREATE INDEX idx_problems_published  ON problems(is_published) WHERE is_published = TRUE;
CREATE INDEX idx_problems_title_trgm ON problems USING gin(title gin_trgm_ops);
CREATE INDEX idx_submissions_user    ON submissions(user_id);
CREATE INDEX idx_submissions_problem ON submissions(problem_id);
CREATE INDEX idx_submissions_contest ON submissions(contest_id);
CREATE INDEX idx_submissions_status  ON submissions(status);
CREATE INDEX idx_submissions_at      ON submissions(submitted_at DESC);
CREATE INDEX idx_cp_score            ON contest_participants(contest_id, score DESC);

-- ─── 6. Row Level Security ───────────────────────────────────
ALTER TABLE users                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE problems                ENABLE ROW LEVEL SECURITY;
ALTER TABLE contests                ENABLE ROW LEVEL SECURITY;
ALTER TABLE contest_participants    ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY users_update ON users FOR UPDATE TO authenticated
  USING (id = auth.uid());

CREATE POLICY profiles_select ON user_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY profiles_update ON user_profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY problems_select ON problems FOR SELECT TO authenticated
  USING (is_published = TRUE OR author_id = auth.uid());

CREATE POLICY contests_select ON contests FOR SELECT TO authenticated
  USING (is_public = TRUE OR created_by = auth.uid());

CREATE POLICY submissions_select ON submissions FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY submissions_insert ON submissions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY str_select ON submission_test_results FOR SELECT TO authenticated
  USING (
    submission_id IN (
      SELECT id FROM submissions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY cp_select ON contest_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY cp_insert ON contest_participants FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ─── 7. Seed: default tags ───────────────────────────────────
INSERT INTO tags (name, color_hex) VALUES
  ('SELECT',       '#3b82f6'),
  ('JOIN',         '#8b5cf6'),
  ('Aggregation',  '#f59e0b'),
  ('Subquery',     '#ec4899'),
  ('Window',       '#10b981'),
  ('CTE',          '#06b6d4'),
  ('DDL',          '#ef4444'),
  ('DML',          '#f97316'),
  ('Indexes',      '#84cc16'),
  ('Transactions', '#64748b')
ON CONFLICT (name) DO NOTHING;
