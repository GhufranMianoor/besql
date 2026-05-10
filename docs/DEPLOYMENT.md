# BeSQL Deployment Guide

## Prerequisites

- A [Supabase](https://supabase.com) project (free tier works)
- A [Resend](https://resend.com) account (for email confirmation)
- A [Vercel](https://vercel.com) account (for hosting, optional)

---

## 1. Supabase Setup

### 1a. Create a project
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Choose a name, set a strong database password, pick your region

### 1b. Run the schema migrations
In **SQL Editor**, run each file from `backend/sql/` in order:

| Order | File | Purpose |
|-------|------|---------|
| 1 | `001_drop_and_recreate.sql` | All tables, indexes, RLS, seed data |
| 2 | `002_kv_table.sql` | KV store for frontend state |
| 3 | `003_helper_functions.sql` | SQL judge helper functions |

### 1c. Get your API keys
Go to **Settings → API** and copy:
- **Project URL** → `SUPABASE_URL`
- **anon public** key → `SUPABASE_ANON_KEY`

### 1d. Update config.js
Edit `frontend/js/config.js`:
```js
window.SUPABASE_URL = "https://your-project.supabase.co";
window.SUPABASE_ANON_KEY = "eyJ...your-anon-key";
```

> ⚠️ `config.js` is in `.gitignore` — it will NOT be committed.

---

## 2. Email Confirmation (Resend)

### 2a. Get a Resend API key
1. Go to [resend.com](https://resend.com) → sign up
2. Dashboard → API Keys → Create → copy the key

### 2b. Configure SMTP in Supabase
1. Supabase → **Authentication → Settings → SMTP**
2. Enable **Custom SMTP** and fill in:

| Field | Value |
|-------|-------|
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | Your Resend API key |
| Sender email | `onboarding@resend.dev` |
| Sender name | `BeSQL` |

3. Save

### 2c. Verify email confirmation is ON
- Authentication → Settings → Email Auth
- **Confirm email** → ON
- Save

---

## 3. Deploy to Vercel

### Option A: Auto-deploy from GitHub
1. Push your repo to GitHub
2. Go to [vercel.com](https://vercel.com) → Import project
3. Select your repo
4. Set **Root Directory** to `frontend`
5. Deploy

### Option B: Local development
```bash
# Just open frontend/index.html in a browser
# Or use a local server:
npx serve frontend
```

---

## 4. Verify

- [ ] All 11 tables visible in Supabase Table Editor
- [ ] Sign up → confirmation email arrives
- [ ] Click confirm link → redirected back and logged in
- [ ] Data persists across sessions (check `besql_kv` table)

---

## Database Schema

| Table | Purpose |
|-------|---------|
| `users` | Core user accounts |
| `user_profiles` | Points, rank, bio, avatar |
| `problems` | Problem bank with schema + solution |
| `tags` | Tag vocabulary (pre-seeded with 10 tags) |
| `problem_tags` | Links problems ↔ tags |
| `contests` | Contest metadata |
| `contest_problems` | Links contests ↔ problems |
| `contest_participants` | Who joined which contest + score |
| `submissions` | Every SQL submission |
| `submission_test_results` | Per-test-case pass/fail detail |
| `besql_kv` | Frontend KV store (used by storage.js) |

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `relation besql_kv does not exist` | Run `002_kv_table.sql` in SQL Editor |
| Confirmation email not arriving | Check spam; verify SMTP settings saved correctly |
| Login works but data not saving | Check `besql_kv` RLS policy exists |
| `invalid api key` | Rotate and update `config.js` |
