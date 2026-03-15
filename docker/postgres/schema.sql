-- =============================================================================
-- BeSQL PostgreSQL Schema  (v3.0.0 — Clean Architecture)
-- =============================================================================
-- Run via: psql -U besql_app -d besql -f schema.sql
-- =============================================================================

-- ── Extensions ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- LIKE / ILIKE trigram indexes
CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- gen_random_bytes() (fallback)

-- ── Users ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    username      TEXT        NOT NULL UNIQUE CHECK (length(username) >= 3 AND length(username) <= 32),
    email         TEXT        NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    role          TEXT        NOT NULL DEFAULT 'Contestant'
                              CHECK (role IN ('Contestant', 'Judge', 'CompanyHR', 'Admin')),
    score         INTEGER     NOT NULL DEFAULT 0 CHECK (score >= 0),
    solved        INTEGER     NOT NULL DEFAULT 0 CHECK (solved >= 0),
    streak        INTEGER     NOT NULL DEFAULT 0 CHECK (streak >= 0),
    last_solve_at TIMESTAMPTZ,
    avatar_url    TEXT,
    bio           TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_score  ON users (score  DESC);
CREATE INDEX IF NOT EXISTS idx_users_solved ON users (solved DESC);
CREATE INDEX IF NOT EXISTS idx_users_username_trgm ON users USING GIN (username gin_trgm_ops);

-- ── Refresh Tokens ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id         SERIAL      PRIMARY KEY,
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      TEXT        NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    is_revoked BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user  ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens (token);

-- ── Problems ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS problems (
    id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    title          TEXT        NOT NULL CHECK (length(title) >= 3),
    slug           TEXT        NOT NULL UNIQUE,
    description    TEXT        NOT NULL,
    difficulty     TEXT        NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    init_script    TEXT        NOT NULL,   -- DDL + seed SQL for sandbox schema
    golden_solution TEXT       NOT NULL,  -- Authoritative correct query
    tags           JSONB       NOT NULL DEFAULT '[]'::JSONB,
    accept_count   INTEGER     NOT NULL DEFAULT 0,
    submit_count   INTEGER     NOT NULL DEFAULT 0,
    is_published   BOOLEAN     NOT NULL DEFAULT FALSE,
    author_id      UUID        NOT NULL REFERENCES users(id),
    version        INTEGER     NOT NULL DEFAULT 1,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_problems_difficulty  ON problems (difficulty);
CREATE INDEX IF NOT EXISTS idx_problems_is_published ON problems (is_published);
CREATE INDEX IF NOT EXISTS idx_problems_tags        ON problems USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_problems_title_trgm  ON problems USING GIN (title gin_trgm_ops);

-- ── Problem Version History ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS problem_versions (
    id              SERIAL      PRIMARY KEY,
    problem_id      UUID        NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    version         INTEGER     NOT NULL,
    title           TEXT        NOT NULL,
    description     TEXT        NOT NULL,
    init_script     TEXT        NOT NULL,
    golden_solution TEXT        NOT NULL,
    changed_by_id   UUID        NOT NULL REFERENCES users(id),
    change_note     TEXT        NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (problem_id, version)
);

-- ── Contests ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contests (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    title       TEXT        NOT NULL,
    slug        TEXT        NOT NULL UNIQUE,
    description TEXT        NOT NULL DEFAULT '',
    status      TEXT        NOT NULL DEFAULT 'Draft'
                            CHECK (status IN ('Draft', 'Upcoming', 'Running', 'Ended')),
    start_time  TIMESTAMPTZ NOT NULL,
    end_time    TIMESTAMPTZ NOT NULL CHECK (end_time > start_time),
    created_by  UUID        NOT NULL REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contests_status     ON contests (status);
CREATE INDEX IF NOT EXISTS idx_contests_start_time ON contests (start_time);

-- ── Contest Problems (many-to-many) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contest_problems (
    contest_id UUID    NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    problem_id UUID    NOT NULL REFERENCES problems(id) ON DELETE RESTRICT,
    "order"    INTEGER NOT NULL DEFAULT 1,
    points     INTEGER NOT NULL DEFAULT 100 CHECK (points > 0),
    PRIMARY KEY (contest_id, problem_id)
);

-- ── Contest Participants ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contest_participants (
    contest_id    UUID        NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    user_id       UUID        NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    total_score   INTEGER     NOT NULL DEFAULT 0,
    rank          INTEGER     NOT NULL DEFAULT 0,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (contest_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_participants_score
    ON contest_participants (contest_id, total_score DESC);

-- ── Submissions ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS submissions (
    id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    problem_id       UUID        NOT NULL REFERENCES problems(id) ON DELETE RESTRICT,
    contest_id       UUID        REFERENCES contests(id) ON DELETE SET NULL,
    query_text       TEXT        NOT NULL,
    status           TEXT        NOT NULL DEFAULT 'Pending'
                                 CHECK (status IN (
                                   'Pending', 'Running', 'Accepted', 'WrongAnswer',
                                   'RuntimeError', 'TimeLimitExceeded',
                                   'CompileError', 'PlagiarismFlag'
                                 )),
    execution_time_ms DOUBLE PRECISION NOT NULL DEFAULT 0,
    query_cost        DOUBLE PRECISION NOT NULL DEFAULT 0,
    diff_output       JSONB,
    error_message     TEXT,
    is_flagged        BOOLEAN     NOT NULL DEFAULT FALSE,
    score             INTEGER     NOT NULL DEFAULT 0,
    submitted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submissions_user_problem
    ON submissions (user_id, problem_id, status);
CREATE INDEX IF NOT EXISTS idx_submissions_contest
    ON submissions (contest_id, status);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at
    ON submissions (submitted_at DESC);

-- ── Auto-update updated_at triggers ────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_problems_updated_at
    BEFORE UPDATE ON problems
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Update user score/solved on accepted submission ────────────────────────
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  first_ac BOOLEAN;
  pts      INTEGER;
BEGIN
  IF NEW.status = 'Accepted' AND OLD.status <> 'Accepted' THEN
    -- Check if this is the user's first Accepted on this problem
    SELECT NOT EXISTS (
      SELECT 1 FROM submissions
      WHERE user_id   = NEW.user_id
        AND problem_id = NEW.problem_id
        AND id        <> NEW.id
        AND status    = 'Accepted'
    ) INTO first_ac;

    IF first_ac THEN
      SELECT CASE difficulty
               WHEN 'Easy'   THEN 10
               WHEN 'Medium' THEN 25
               WHEN 'Hard'   THEN 50
               ELSE 10
             END
      INTO pts
      FROM problems WHERE id = NEW.problem_id;

      UPDATE users
      SET solved     = solved + 1,
          score      = score  + pts,
          updated_at = NOW()
      WHERE id = NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_update_user_stats
    AFTER UPDATE OF status ON submissions
    FOR EACH ROW EXECUTE FUNCTION update_user_stats();
