-- =============================================================
-- BeSQL — Supabase / PostgreSQL Database Schema
-- =============================================================
--
-- DATABASE RECOMMENDATION
-- -----------------------
-- We recommend **Supabase** (PostgreSQL) over MongoDB for BeSQL.
--
-- Reasons:
--  1. RELATIONAL DATA — Users, problems, contests, submissions
--     are highly relational. SQL joins, foreign keys, and
--     constraints are a natural fit.
--  2. ROW-LEVEL SECURITY (RLS) — Supabase's RLS policies let you
--     restrict data access per user without extra middleware.
--  3. REALTIME — Supabase's realtime subscriptions power live
--     scoreboards and contest timers with zero extra setup.
--  4. AUTH BUILT-IN — supabase.auth provides email/OAuth out of
--     the box, replacing the localStorage-based demo auth.
--  5. OPEN-SOURCE — self-hostable if the project scales.
--  6. FREE TIER — generous limits for a growing platform.
--
-- Schema version: 2.0.0
-- =============================================================

-- ── Extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- trigram indexes for LIKE search

-- =============================================================
-- USERS (extends Supabase auth.users)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    user_id    UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username   TEXT        NOT NULL UNIQUE CHECK (length(username) >= 3),
    role       TEXT        NOT NULL DEFAULT 'contestant' CHECK (role IN ('contestant', 'master', 'admin')),
    score      INTEGER     NOT NULL DEFAULT 0 CHECK (score >= 0),
    solved     INTEGER     NOT NULL DEFAULT 0 CHECK (solved >= 0),
    streak     INTEGER     NOT NULL DEFAULT 0 CHECK (streak >= 0),
    last_solve DATE,
    avatar_url TEXT,
    bio        TEXT,
    joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index: fast leaderboard queries
CREATE INDEX IF NOT EXISTS idx_profiles_score  ON public.profiles (score DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_solved ON public.profiles (solved DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================
-- PROBLEMS
-- =============================================================
CREATE TABLE IF NOT EXISTS public.problems (
    id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    code          TEXT        NOT NULL UNIQUE,            -- e.g. 'BSQ-001'
    title         TEXT        NOT NULL,
    description   TEXT        NOT NULL,
    difficulty    TEXT        NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard', 'Expert')),
    points        INTEGER     NOT NULL DEFAULT 100 CHECK (points > 0),
    tags          TEXT[]      NOT NULL DEFAULT '{}',
    solution      TEXT        NOT NULL,                   -- canonical correct SQL
    schema_hint   JSONB,                                  -- { table, columns: [[col,type]] }
    sample_output JSONB,                                  -- { columns, rows }
    time_limit    INTEGER     NOT NULL DEFAULT 300,       -- seconds
    daily_date    DATE,                                   -- set = featured as daily problem
    is_public     BOOLEAN     NOT NULL DEFAULT true,
    created_by    UUID        REFERENCES public.profiles(user_id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_problems_difficulty  ON public.problems (difficulty);
CREATE INDEX IF NOT EXISTS idx_problems_daily_date  ON public.problems (daily_date);
CREATE INDEX IF NOT EXISTS idx_problems_tags        ON public.problems USING GIN (tags);

CREATE TRIGGER trg_problems_updated_at
    BEFORE UPDATE ON public.problems
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================
-- PROBLEM TEST CASES
-- =============================================================
CREATE TABLE IF NOT EXISTS public.test_cases (
    id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
    problem_id  UUID    NOT NULL REFERENCES public.problems(id) ON DELETE CASCADE,
    name        TEXT    NOT NULL,
    description TEXT,
    sort_order  SMALLINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_test_cases_problem ON public.test_cases (problem_id);

-- =============================================================
-- CONTESTS
-- =============================================================
CREATE TABLE IF NOT EXISTS public.contests (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    title       TEXT        NOT NULL,
    description TEXT,
    status      TEXT        NOT NULL DEFAULT 'upcoming'
                            CHECK (status IN ('upcoming', 'live', 'ended', 'custom')),
    start_time  TIMESTAMPTZ NOT NULL,
    end_time    TIMESTAMPTZ NOT NULL CHECK (end_time > start_time),
    problem_ids UUID[]      NOT NULL DEFAULT '{}',
    is_public   BOOLEAN     NOT NULL DEFAULT true,
    invite_code TEXT        UNIQUE,                       -- NULL = public contest
    created_by  UUID        REFERENCES public.profiles(user_id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contests_status     ON public.contests (status);
CREATE INDEX IF NOT EXISTS idx_contests_start_time ON public.contests (start_time);

CREATE TRIGGER trg_contests_updated_at
    BEFORE UPDATE ON public.contests
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================
-- CONTEST ANNOUNCEMENTS
-- =============================================================
CREATE TABLE IF NOT EXISTS public.announcements (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    contest_id  UUID        NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
    message     TEXT        NOT NULL,
    posted_by   UUID        REFERENCES public.profiles(user_id) ON DELETE SET NULL,
    posted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_contest ON public.announcements (contest_id);

-- =============================================================
-- SUBMISSIONS
-- =============================================================
CREATE TABLE IF NOT EXISTS public.submissions (
    id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID        NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    problem_id   UUID        NOT NULL REFERENCES public.problems(id)  ON DELETE CASCADE,
    contest_id   UUID        REFERENCES public.contests(id) ON DELETE SET NULL,
    code         TEXT        NOT NULL,
    verdict      TEXT        NOT NULL CHECK (verdict IN ('AC', 'WA', 'TLE', 'CE')),
    tc_passed    SMALLINT    NOT NULL DEFAULT 0,
    tc_total     SMALLINT    NOT NULL DEFAULT 0,
    time_taken   INTEGER     NOT NULL DEFAULT 0,          -- seconds elapsed
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_subs_user       ON public.submissions (user_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_subs_problem    ON public.submissions (problem_id);
CREATE INDEX IF NOT EXISTS idx_subs_contest    ON public.submissions (contest_id) WHERE contest_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subs_verdict_ac ON public.submissions (user_id, problem_id) WHERE verdict = 'AC';

-- =============================================================
-- ROW-LEVEL SECURITY (RLS)
-- =============================================================

ALTER TABLE public.profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problems    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_cases  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- ── profiles ────────────────────────────────────────────────
-- Anyone can read public profiles
CREATE POLICY "profiles_read_all"  ON public.profiles FOR SELECT USING (true);
-- Only the profile owner can update their own row
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── problems ────────────────────────────────────────────────
CREATE POLICY "problems_read_public" ON public.problems FOR SELECT
    USING (is_public = true OR auth.uid() = created_by);

CREATE POLICY "problems_insert_master" ON public.problems FOR INSERT
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('master', 'admin'))
    );

CREATE POLICY "problems_update_master" ON public.problems FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('master', 'admin'))
    );

-- ── test_cases ───────────────────────────────────────────────
CREATE POLICY "test_cases_read_public" ON public.test_cases FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.problems p WHERE p.id = problem_id AND (p.is_public = true OR auth.uid() = p.created_by))
    );

-- ── contests ────────────────────────────────────────────────
CREATE POLICY "contests_read_public" ON public.contests FOR SELECT
    USING (is_public = true OR auth.uid() = created_by);

CREATE POLICY "contests_insert_master" ON public.contests FOR INSERT
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('master', 'admin'))
    );

-- ── announcements ───────────────────────────────────────────
CREATE POLICY "announcements_read_all" ON public.announcements FOR SELECT USING (true);

-- ── submissions ─────────────────────────────────────────────
-- Users can read their own; admins can read all
CREATE POLICY "submissions_read_own" ON public.submissions FOR SELECT
    USING (
        auth.uid() = user_id
        OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "submissions_insert_authenticated" ON public.submissions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- =============================================================
-- REALTIME (enable for live scoreboards)
-- =============================================================
-- Run in Supabase Dashboard → Table Editor → Realtime tab:
--   Enable realtime on: submissions, announcements, contests
--
-- Or via SQL:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.submissions;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.contests;

-- =============================================================
-- LEADERBOARD VIEW
-- =============================================================
CREATE OR REPLACE VIEW public.leaderboard AS
    SELECT
        p.user_id,
        p.username,
        p.role,
        p.score,
        p.solved,
        p.streak,
        RANK() OVER (ORDER BY p.score DESC, p.solved DESC) AS rank
    FROM public.profiles p
    WHERE p.role != 'admin'
    ORDER BY rank;

-- =============================================================
-- CONTEST SCOREBOARD VIEW
-- =============================================================
CREATE OR REPLACE VIEW public.contest_scores AS
    SELECT
        s.contest_id,
        s.user_id,
        p.username,
        COUNT(DISTINCT s.problem_id) FILTER (WHERE s.verdict = 'AC') AS problems_solved,
        SUM(pr.points)              FILTER (WHERE s.verdict = 'AC') AS total_points,
        MIN(s.submitted_at)                                          AS first_solve
    FROM public.submissions  s
    JOIN public.profiles     p  ON s.user_id   = p.user_id
    JOIN public.problems     pr ON s.problem_id = pr.id
    WHERE s.contest_id IS NOT NULL
    GROUP BY s.contest_id, s.user_id, p.username;

-- =============================================================
-- HELPER FUNCTIONS
-- =============================================================

-- Update streak when a new AC submission arrives
CREATE OR REPLACE FUNCTION public.update_streak()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    _today   DATE := CURRENT_DATE;
    _profile RECORD;
BEGIN
    IF NEW.verdict <> 'AC' THEN RETURN NEW; END IF;

    -- Avoid duplicate streak increment for the same problem on the same day
    IF EXISTS (
        SELECT 1 FROM public.submissions
        WHERE user_id = NEW.user_id
          AND problem_id = NEW.problem_id
          AND verdict = 'AC'
          AND id <> NEW.id
    ) THEN RETURN NEW; END IF;

    SELECT * INTO _profile FROM public.profiles WHERE user_id = NEW.user_id;

    IF _profile.last_solve = _today - 1 THEN
        -- Consecutive day
        UPDATE public.profiles SET streak = streak + 1, last_solve = _today WHERE user_id = NEW.user_id;
    ELSIF _profile.last_solve < _today - 1 OR _profile.last_solve IS NULL THEN
        -- Streak broken or first solve
        UPDATE public.profiles SET streak = 1, last_solve = _today WHERE user_id = NEW.user_id;
    END IF;
    -- Same-day solve: streak unchanged

    -- Increment solved count and score
    UPDATE public.profiles
    SET
        solved = solved + 1,
        score  = score + (SELECT points FROM public.problems WHERE id = NEW.problem_id)
    WHERE user_id = NEW.user_id;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_streak
    AFTER INSERT ON public.submissions
    FOR EACH ROW EXECUTE FUNCTION public.update_streak();
