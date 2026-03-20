-- =====================================================
-- BeSQL Supabase Backend Schema
-- =====================================================
-- Complete relational database schema for Supabase
-- Includes: users, roles, privileges, submissions, and sample data tables
-- Run this in your Supabase SQL editor to set up the backend

-- =====================================================
-- ROLES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.roles (
  id INTEGER PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255)
);

-- Insert roles as needed

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.users (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- Insert users as needed

-- =====================================================
-- USER_ROLES TABLE (Many-to-Many)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id BIGINT NOT NULL,
  role_id INTEGER NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE
);

-- Insert user roles as needed

-- =====================================================
-- PRIVILEGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.privileges (
  id INTEGER PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255),
  code VARCHAR(50) NOT NULL UNIQUE
);

-- Insert privileges as needed

-- =====================================================
-- ROLE_PRIVILEGES TABLE (Many-to-Many)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.role_privileges (
  role_id INTEGER NOT NULL,
  privilege_id INTEGER NOT NULL,
  PRIMARY KEY (role_id, privilege_id),
  FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE,
  FOREIGN KEY (privilege_id) REFERENCES public.privileges(id) ON DELETE CASCADE
);

-- Insert role-privilege mappings as needed

-- =====================================================
-- SUBMISSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.submissions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  problem_id VARCHAR(50) NOT NULL,
  contest_id BIGINT,
  submitted_code TEXT NOT NULL,
  verdict VARCHAR(50) NOT NULL DEFAULT 'pending',
  error_message TEXT,
  runtime_ms INTEGER,
  memory_mb INTEGER,
  tests_passed INTEGER DEFAULT 0,
  total_tests INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0,
  submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  judged_at TIMESTAMPTZ,
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_submissions_user_problem ON public.submissions(user_id, problem_id);
CREATE INDEX IF NOT EXISTS idx_submissions_verdict ON public.submissions(verdict);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON public.submissions(submitted_at DESC);

-- =====================================================
-- PROBLEMS TABLE (Proper Problemset Storage)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.problems (
  id VARCHAR(50) PRIMARY KEY,
  code VARCHAR(50),
  title VARCHAR(255) NOT NULL,
  difficulty VARCHAR(20) NOT NULL DEFAULT 'Easy',
  points INTEGER NOT NULL DEFAULT 100,
  time_limit INTEGER,
  category VARCHAR(100) DEFAULT 'General',
  tags TEXT[] NOT NULL DEFAULT '{}',
  description TEXT NOT NULL,
  solution TEXT NOT NULL,
  sample_output JSONB,
  schema_hint JSONB,
  test_cases JSONB NOT NULL DEFAULT '[]'::jsonb,
  daily_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_problems_active ON public.problems(is_active);
CREATE INDEX IF NOT EXISTS idx_problems_difficulty ON public.problems(difficulty);
CREATE INDEX IF NOT EXISTS idx_problems_daily_date ON public.problems(daily_date);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'problems_code_format_chk'
      AND conrelid = 'public.problems'::regclass
  ) THEN
    ALTER TABLE public.problems
      ADD CONSTRAINT problems_code_format_chk
      CHECK (code IS NULL OR code ~ '^BSQ-[0-9]+$');
  END IF;
END $$;

-- =====================================================
-- CONTESTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.contests (
  id VARCHAR(100) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  type VARCHAR(20) NOT NULL DEFAULT 'official',
  status VARCHAR(20) NOT NULL DEFAULT 'upcoming',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 120,
  problem_ids TEXT[] NOT NULL DEFAULT '{}',
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  max_participants INTEGER NOT NULL DEFAULT 500,
  announcement TEXT DEFAULT '',
  created_by VARCHAR(100),
  invitees TEXT[] NOT NULL DEFAULT '{}',
  participants TEXT[] NOT NULL DEFAULT '{}',
  password TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contests_status ON public.contests(status);
CREATE INDEX IF NOT EXISTS idx_contests_type ON public.contests(type);
CREATE INDEX IF NOT EXISTS idx_contests_start_time ON public.contests(start_time);

-- Insert submissions as needed

-- =====================================================
-- BESQL_KV TABLE (Key-Value Store - Optional)
-- =====================================================
-- Stores app state: problems, contests, analytics, etc. as JSON
-- Useful for flexible state that doesn't fit relational schema

CREATE TABLE IF NOT EXISTS public.besql_kv (
  k TEXT PRIMARY KEY,
  v JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_besql_kv_updated ON public.besql_kv(updated_at DESC);

-- =====================================================
-- RLS + GRANTS FOR FRONTEND ACCESS (required for anon key writes)
-- =====================================================
-- BeSQL stores app state through the browser using the anon key.
-- These grants/policies allow that key to read/write besql_kv safely.

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.besql_kv TO anon, authenticated;

ALTER TABLE public.besql_kv ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "besql_kv_read" ON public.besql_kv;
CREATE POLICY "besql_kv_read" ON public.besql_kv
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "besql_kv_insert" ON public.besql_kv;
CREATE POLICY "besql_kv_insert" ON public.besql_kv
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "besql_kv_update" ON public.besql_kv;
CREATE POLICY "besql_kv_update" ON public.besql_kv
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "besql_kv_delete" ON public.besql_kv;
CREATE POLICY "besql_kv_delete" ON public.besql_kv
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- =====================================================
-- KEY NAMING CONVENTIONS (for reference)
-- =====================================================
-- Format: prefix:id or prefix:namespace:id
-- Examples:
--   user:alice123              → User profile with username 'alice123'
--   problem:p1                 → Problem definition for BSQ-001
--   problem:p1:hiddentest:0    → Hidden test case for problem p1
--   contest:c1                 → Contest definition
--   submission:sub_12345       → Submission record
--   contest:c1:submission:u1   → User's submission for a contest
--   analytics:user:count       → Total user count
--   leaderboard:c1             → Leaderboard for contest c1

-- =====================================================
-- ADMIN USER SETUP (Run this to create initial admin)
-- =====================================================

-- Step 1: Insert platform roles
INSERT INTO public.roles (id, name, description)
VALUES
  (1, 'admin', 'Administrator with full access'),
  (2, 'contestant', 'Regular contestant role'),
  (3, 'master', 'Contest master role')
ON CONFLICT (id) DO NOTHING;

-- Step 2: Create Admin User
-- Password: admin123 (use your own hashed password)
INSERT INTO public.users (username, email, password_hash, full_name, is_active)
VALUES (
  'admin',
  'admin@besql.local',
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  'Admin User',
  TRUE
)
ON CONFLICT (username) DO NOTHING;

-- Step 3: Assign Admin Role to Admin User
INSERT INTO public.user_roles (user_id, role_id)
SELECT u.id, 1
FROM public.users u
WHERE u.username = 'admin'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Step 4: Insert All Privileges (Required before assigning to roles)
INSERT INTO public.privileges (id, name, description, code) VALUES
  (1, 'view_problems', 'Can view practice problems', 'PERM_VIEW_PROBLEMS'),
  (2, 'submit_solution', 'Can submit solutions', 'PERM_SUBMIT'),
  (3, 'view_submissions', 'Can view own submissions', 'PERM_VIEW_SUBMISSIONS'),
  (4, 'create_contest', 'Can create new contests', 'PERM_CREATE_CONTEST'),
  (5, 'manage_problems', 'Can manage problem definitions', 'PERM_MANAGE_PROBLEMS'),
  (6, 'view_analytics', 'Can view platform analytics', 'PERM_VIEW_ANALYTICS'),
  (7, 'manage_users', 'Can manage user accounts', 'PERM_MANAGE_USERS'),
  (8, 'view_leaderboard', 'Can view contest leaderboards', 'PERM_VIEW_LEADERBOARD')
ON CONFLICT (id) DO NOTHING;

-- Step 5: Assign All Privileges to Admin Role
INSERT INTO public.role_privileges (role_id, privilege_id)
SELECT 1, id FROM public.privileges
ON CONFLICT (role_id, privilege_id) DO NOTHING;

-- Step 6: Minimal privileges for contestant/master roles
INSERT INTO public.role_privileges (role_id, privilege_id)
SELECT 2, id
FROM public.privileges
WHERE code IN ('PERM_VIEW_PROBLEMS','PERM_SUBMIT','PERM_VIEW_SUBMISSIONS','PERM_VIEW_LEADERBOARD')
ON CONFLICT (role_id, privilege_id) DO NOTHING;

INSERT INTO public.role_privileges (role_id, privilege_id)
SELECT 3, id
FROM public.privileges
WHERE code IN ('PERM_VIEW_PROBLEMS','PERM_SUBMIT','PERM_VIEW_SUBMISSIONS','PERM_CREATE_CONTEST','PERM_VIEW_LEADERBOARD')
ON CONFLICT (role_id, privilege_id) DO NOTHING;

-- Step 7: Dummy users
INSERT INTO public.users (username, email, password_hash, full_name, is_active)
VALUES
  ('demo_user', 'demo@example.com', '2bb80d537b1da3e38bd30361aa855686bde0ba6f7f9f40c4f5e6e6b6f5f7f6c6', 'Demo User', TRUE),
  ('contest_master', 'master@besql.local', '2bb80d537b1da3e38bd30361aa855686bde0ba6f7f9f40c4f5e6e6b6f5f7f6c6', 'Contest Master', TRUE)
ON CONFLICT (username) DO NOTHING;

-- Step 8: Assign roles to dummy users
INSERT INTO public.user_roles (user_id, role_id)
SELECT u.id, 2 FROM public.users u WHERE u.username = 'demo_user'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role_id)
SELECT u.id, 3 FROM public.users u WHERE u.username = 'contest_master'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Step 9: Dummy submissions
INSERT INTO public.submissions (
  user_id, problem_id, contest_id, submitted_code, verdict,
  runtime_ms, memory_mb, tests_passed, total_tests, score, judged_at
)
SELECT
  u.id,
  'BSQ-001',
  NULL,
  'SELECT name, salary, level FROM employees WHERE salary > 85000 ORDER BY salary DESC;',
  'accepted',
  42,
  8,
  3,
  3,
  100,
  NOW()
FROM public.users u
WHERE u.username='demo_user'
AND NOT EXISTS (
  SELECT 1 FROM public.submissions s
  WHERE s.user_id=u.id AND s.problem_id='BSQ-001'
);

INSERT INTO public.submissions (
  user_id, problem_id, contest_id, submitted_code, verdict,
  error_message, runtime_ms, memory_mb, tests_passed, total_tests, score, judged_at
)
SELECT
  u.id,
  'BSQ-003',
  NULL,
  'SELECT * FROM employees;',
  'wrong_answer',
  'Expected JOIN with departments and location filter',
  55,
  9,
  1,
  3,
  0,
  NOW()
FROM public.users u
WHERE u.username='contest_master'
AND NOT EXISTS (
  SELECT 1 FROM public.submissions s
  WHERE s.user_id=u.id AND s.problem_id='BSQ-003'
);

INSERT INTO public.problems (
  id, code, title, difficulty, points, time_limit, category, tags,
  description, solution, sample_output, schema_hint, test_cases,
  daily_date, is_active, created_by
) VALUES
  (
    'p9','BSQ-009','Danger Zone Citizens','Easy',180,NULL,'Filtering',ARRAY['WHERE','ORDER BY'],
    'Find citizens in danger zones with stability rating below 2.0. Return: citizen_name, sector, stability_rating ordered by stability_rating ascending.',
    'SELECT citizen_name, sector, stability_rating FROM citizenmentalhealth WHERE stability_rating < 2.0 ORDER BY stability_rating ASC',
    '{"columns":["citizen_name","sector","stability_rating"],"rows":[["Ryn","Delta","0.8"],["Nova","Beta","1.5"],["Marcus","Beta","1.9"]]}'::jsonb,
    '{"table":"citizenmentalhealth","columns":[["citizen_id","INT"],["citizen_name","VARCHAR"],["sector","VARCHAR"],["stability_rating","FLOAT"],["last_checkup","DATE"]]}'::jsonb,
    '[{"id":"tc1","name":"Low stability only","desc":"All rows must be below 2.0","hint":"WHERE stability_rating < 2.0","hidden":true}]'::jsonb,
    NULL, TRUE, 'system'
  ),
  (
    'p10','BSQ-010','Double Agents','Medium',220,NULL,'Filtering',ARRAY['WHERE','ORDER BY'],
    'List Alpha clearance operatives tied to more than one organization. Return: operative_name, organizations_count ordered by organizations_count descending.',
    'SELECT operative_name, organizations_count FROM operativeprofiles WHERE clearance_level = ''Alpha'' AND organizations_count > 1 ORDER BY organizations_count DESC',
    '{"columns":["operative_name","organizations_count"],"rows":[["Zara","3"],["Ryn","2"]]}'::jsonb,
    '{"table":"operativeprofiles","columns":[["operative_id","INT"],["operative_name","VARCHAR"],["clearance_level","VARCHAR"],["organizations_count","INT"],["recruitment_date","DATE"]]}'::jsonb,
    '[{"id":"tc1","name":"Alpha multiorg only","desc":"Only Alpha with organizations_count > 1","hint":"WHERE clearance_level = ''Alpha'' AND organizations_count > 1","hidden":true}]'::jsonb,
    NULL, TRUE, 'system'
  ),
  (
    'p11','BSQ-011','Duplicate Records','Medium',240,NULL,'Aggregation',ARRAY['GROUP BY','HAVING','COUNT'],
    'Find duplicate agent/division entries. Return: agent_name, division_name, duplicate_count for groups appearing more than once.',
    'SELECT agent_name, division_name, COUNT(*) AS duplicate_count FROM agentrecords GROUP BY agent_name, division_name HAVING COUNT(*) > 1 ORDER BY duplicate_count DESC, agent_name ASC',
    '{"columns":["agent_name","division_name","duplicate_count"],"rows":[["Nova","Field","3"],["Zara","Recon","2"]]}'::jsonb,
    '{"table":"agentrecords","columns":[["record_id","INT"],["agent_name","VARCHAR"],["division_name","VARCHAR"],["entry_date","DATE"]]}'::jsonb,
    '[{"id":"tc1","name":"Duplicates only","desc":"Must return duplicated groups only","hint":"GROUP BY agent_name, division_name HAVING COUNT(*) > 1","hidden":true}]'::jsonb,
    NULL, TRUE, 'system'
  ),
  (
    'p12','BSQ-012','Echo Transactions','Medium',250,NULL,'Aggregation',ARRAY['SUM','GROUP BY','HAVING'],
    'Show accounts whose total credits exceed 400. Return: account_id, total_credits ordered by total_credits descending.',
    'SELECT account_id, SUM(credits) AS total_credits FROM creditledger GROUP BY account_id HAVING SUM(credits) > 400 ORDER BY total_credits DESC',
    '{"columns":["account_id","total_credits"],"rows":[["101","700"],["103","500"],["102","450"]]}'::jsonb,
    '{"table":"creditledger","columns":[["txn_id","INT"],["account_id","INT"],["credits","INT"],["txn_date","DATE"]]}'::jsonb,
    '[{"id":"tc1","name":"High value accounts","desc":"Only SUM(credits) > 400","hint":"HAVING SUM(credits) > 400","hidden":true}]'::jsonb,
    NULL, TRUE, 'system'
  ),
  (
    'p13','BSQ-013','Exchange Paradox','Hard',320,NULL,'Joins',ARRAY['JOIN','IN'],
    'Find agents who appeared as both giver and receiver in exchanges. Return: agent_name ordered alphabetically.',
    'SELECT a.agent_name FROM agents a WHERE a.agent_id IN (SELECT giver_id FROM exchanges) AND a.agent_id IN (SELECT receiver_id FROM exchanges) ORDER BY a.agent_name ASC',
    '{"columns":["agent_name"],"rows":[["Marcus"],["Nova"],["Zara"]]}'::jsonb,
    '{"table":"agents  ·  exchanges","columns":[["agent_id","INT"],["agent_name","VARCHAR"],["giver_id","INT"],["receiver_id","INT"],["year","INT"]]}'::jsonb,
    '[{"id":"tc1","name":"Bidirectional participants","desc":"Must include agents in both roles","hint":"IN giver list and IN receiver list","hidden":true}]'::jsonb,
    NULL, TRUE, 'system'
  ),
  (
    'p14','BSQ-014','Ghost Followers','Hard',330,NULL,'Joins',ARRAY['LEFT JOIN','NULL'],
    'Find citizens who follow someone but never posted. Return distinct citizen_id ordered ascending.',
    'SELECT DISTINCT f.citizen_id FROM follows f LEFT JOIN posts p ON f.citizen_id = p.citizen_id WHERE p.citizen_id IS NULL ORDER BY f.citizen_id ASC',
    '{"columns":["citizen_id"],"rows":[["1"],["4"],["5"]]}'::jsonb,
    '{"table":"follows  ·  posts","columns":[["citizen_id","INT"],["followed_citizen_id","INT"],["post_id","INT"],["content","VARCHAR"]]}'::jsonb,
    '[{"id":"tc1","name":"No-post followers","desc":"Followers with zero posts only","hint":"LEFT JOIN and IS NULL","hidden":true}]'::jsonb,
    NULL, TRUE, 'system'
  ),
  (
    'p15','BSQ-015','Leaderless Divisions','Medium',260,NULL,'Joins',ARRAY['LEFT JOIN','NULL','OR'],
    'Find divisions with missing/invalid chiefs. A division is leaderless if chief_id is NULL or does not exist in divisionagents.',
    'SELECT d.division_name FROM divisions d LEFT JOIN divisionagents a ON d.chief_id = a.agent_id WHERE d.chief_id IS NULL OR a.agent_id IS NULL ORDER BY d.division_name ASC',
    '{"columns":["division_name"],"rows":[["Intel"],["Tech"]]}'::jsonb,
    '{"table":"divisions  ·  divisionagents","columns":[["division_id","INT"],["division_name","VARCHAR"],["chief_id","INT"],["agent_id","INT"]]}'::jsonb,
    '[{"id":"tc1","name":"Leaderless only","desc":"Return Intel and Tech","hint":"LEFT JOIN + IS NULL","hidden":true}]'::jsonb,
    NULL, TRUE, 'system'
  ),
  (
    'p16','BSQ-016','Low-Energy Operatives','Easy',170,NULL,'Filtering',ARRAY['WHERE','ORDER BY'],
    'List operatives with energy level below 40. Return: operative_name, division, energy_level ordered ascending by energy.',
    'SELECT operative_name, division, energy_level FROM operativestatus WHERE energy_level < 40 ORDER BY energy_level ASC',
    '{"columns":["operative_name","division","energy_level"],"rows":[["Ryn","Tech","15"],["Marcus","Intel","32"]]}'::jsonb,
    '{"table":"operativestatus","columns":[["operative_id","INT"],["operative_name","VARCHAR"],["division","VARCHAR"],["energy_level","INT"],["last_mission_date","DATE"]]}'::jsonb,
    '[{"id":"tc1","name":"Energy threshold","desc":"All rows must be < 40","hint":"WHERE energy_level < 40","hidden":true}]'::jsonb,
    NULL, TRUE, 'system'
  ),
  (
    'p17','BSQ-017','Credit Multiplier','Easy',190,NULL,'Computed Columns',ARRAY['SELECT','ORDER BY'],
    'Compute effective_credits = base_value * multiplier. Return sender_name, receiver_name, effective_credits ordered descending.',
    'SELECT sender_name, receiver_name, base_value * multiplier AS effective_credits FROM credittransactions ORDER BY effective_credits DESC',
    '{"columns":["sender_name","receiver_name","effective_credits"],"rows":[["Ryn","Zara","900"],["Echo","Ryn","800"],["Vex","Nova","300"]]}'::jsonb,
    '{"table":"credittransactions","columns":[["transaction_id","INT"],["sender_name","VARCHAR"],["receiver_name","VARCHAR"],["base_value","INT"],["multiplier","INT"]]}'::jsonb,
    '[{"id":"tc1","name":"Computed field","desc":"Must compute base_value * multiplier","hint":"SELECT base_value * multiplier AS effective_credits","hidden":true}]'::jsonb,
    NULL, TRUE, 'system'
  )
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  title = EXCLUDED.title,
  difficulty = EXCLUDED.difficulty,
  points = EXCLUDED.points,
  time_limit = EXCLUDED.time_limit,
  category = EXCLUDED.category,
  tags = EXCLUDED.tags,
  description = EXCLUDED.description,
  solution = EXCLUDED.solution,
  sample_output = EXCLUDED.sample_output,
  schema_hint = EXCLUDED.schema_hint,
  test_cases = EXCLUDED.test_cases,
  daily_date = EXCLUDED.daily_date,
  is_active = EXCLUDED.is_active,
  created_by = EXCLUDED.created_by,
  updated_at = NOW();

-- Step 10: Frontend access policies for users table (demo/public app)
GRANT SELECT, INSERT, UPDATE ON TABLE public.users TO anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.user_roles TO anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.submissions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.problems TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.contests TO anon, authenticated;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read" ON public.users;
CREATE POLICY "users_read" ON public.users
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "users_insert" ON public.users;
CREATE POLICY "users_insert" ON public.users
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "users_update" ON public.users;
CREATE POLICY "users_update" ON public.users
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_roles_read" ON public.user_roles;
CREATE POLICY "user_roles_read" ON public.user_roles
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "user_roles_insert" ON public.user_roles;
CREATE POLICY "user_roles_insert" ON public.user_roles
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "submissions_read" ON public.submissions;
CREATE POLICY "submissions_read" ON public.submissions
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "submissions_insert" ON public.submissions;
CREATE POLICY "submissions_insert" ON public.submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

ALTER TABLE public.problems ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "problems_read" ON public.problems;
CREATE POLICY "problems_read" ON public.problems
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "problems_insert" ON public.problems;
CREATE POLICY "problems_insert" ON public.problems
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "problems_update" ON public.problems;
CREATE POLICY "problems_update" ON public.problems
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "problems_delete" ON public.problems;
CREATE POLICY "problems_delete" ON public.problems
  FOR DELETE
  TO anon, authenticated
  USING (true);

ALTER TABLE public.contests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contests_read" ON public.contests;
CREATE POLICY "contests_read" ON public.contests
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "contests_insert" ON public.contests;
CREATE POLICY "contests_insert" ON public.contests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "contests_update" ON public.contests;
CREATE POLICY "contests_update" ON public.contests
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "contests_delete" ON public.contests;
CREATE POLICY "contests_delete" ON public.contests
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- =====================================================
-- OPTIONAL: SAMPLE DATA FOR KV STORE
-- =====================================================
-- When your app starts, it will populate besql_kv with initial data
-- Uncomment the following to add sample data:

-- Insert a sample user account
-- INSERT INTO public.besql_kv (k, v) VALUES
-- (
--   'user:demo_user',
--   jsonb_build_object(
--     'username', 'demo_user',
--     'email', 'demo@example.com',
--     'passwordHash', 'abc123hashedpassword',
--     'created_at', NOW()::text,
--     'role', 'user',
--     'submissions', jsonb_build_array()
--   )
-- )
-- ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v, updated_at = NOW();

-- Insert a sample problem
-- INSERT INTO public.besql_kv (k, v) VALUES
-- (
--   'problem:p1',
--   jsonb_build_object(
--     'id', 'p1',
--     'title', 'Sample Problem',
--     'description', 'Test your SQL skills',
--     'difficulty', 'Easy',
--     'testcases', jsonb_build_array(),
--     'created_at', NOW()::text
--   )
-- )
-- ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v, updated_at = NOW();
