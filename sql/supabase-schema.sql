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
-- OPTIONAL: Row-Level Security Policies
-- =====================================================
-- If you want unauthenticated public access, enable this policy:
-- 
-- ALTER TABLE public.besql_kv ENABLE ROW LEVEL SECURITY;
-- 
-- CREATE POLICY "Public access" ON public.besql_kv
--   FOR SELECT, INSERT, UPDATE, DELETE
--   USING (true)
--   WITH CHECK (true);

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

-- Step 1: Insert Admin Role
INSERT INTO public.roles (id, name, description)
VALUES (1, 'admin', 'Administrator with full access')
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
