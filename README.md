# BeSQL

> An open-source SQL contest platform for learning, practicing, and competing in SQL — built entirely in the browser.

![License](https://img.shields.io/badge/license-MIT-green)
![Stack](https://img.shields.io/badge/stack-HTML%20%2F%20JS%20%2F%20Supabase-blue)

---

## What is BeSQL?

BeSQL is a browser-based platform where students and developers can:

- **Solve SQL problems** with an in-browser judge that validates queries in real time
- **Multi-dialect SQL Editor** — CodeMirror 6 powered editor with themes and support for Postgres, MySQL, SQLite, and more
- **Compete in contests** — timed challenges with live scoreboards
- **Create custom contests** — teachers can build private problem sets with passwords
- **Practice daily** — curated problems by difficulty (Easy → Expert)
- **Explore SQL freely** — a DDL/DML sandbox (Playground) with no setup required
- **Instant Response** — The SQL editor is pre-loaded during app bootstrap for zero-latency loading

No backend server needed. The entire application runs as static HTML/JS with [Supabase](https://supabase.com) handling auth, storage, and the database.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML, CSS, JavaScript (no framework, no build step) |
| Database | PostgreSQL via [Supabase](https://supabase.com) |
| Auth | Supabase Auth with **username + email** verification for secure password resets |
| SQL Engine | [sql.js](https://github.com/sql-js/sql.js) (in-browser SQLite for the judge) |
| Editor | [CodeMirror 6](https://codemirror.net/) with custom themes and multi-dialect support |
| Hosting | [Vercel](https://vercel.com) (static) |

---

## Project Structure

```
besql/
├── frontend/
│   ├── index.html              # Single-Page Application Entry
│   ├── css/style.css           # Complete design system
│   ├── js/
│   │   ├── app.js              # Core application logic
│   │   ├── config.js           # Supabase credentials (gitignored)
│   │   ├── core/               # SQL engine, routing, helpers
│   │   ├── features/           # Lazy-loaded modules (admin, scoreboards)
│   │   └── storage/            # Supabase sync + local cache
│   └── data/                   # Problem/DB schema definitions
├── backend/
│   └── sql/                    # Supabase migration files
│       ├── 001_drop_and_recreate.sql   # Full schema
│       ├── 002_kv_table.sql            # KV store
│       └── 003_helper_functions.sql    # Judge helpers
├── docs/
│   ├── DEPLOYMENT.md           # Setup & deployment guide
│   └── SCHEMA.dbml             # Visual schema (paste into dbdiagram.io)
├── .env.example                # Environment variable template
├── .gitignore
├── LICENSE                     # MIT
└── README.md                   # This file
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + Enter` | Run & Test SQL (Windows/Linux) |
| `Cmd + Enter` | Run & Test SQL (Mac) |

The execution shortcut works globally even if the editor is not in focus.

---

## Quick Start

### 1. Clone the repo
```bash
git clone https://github.com/GhufranMianoor/besql.git
cd besql
```

### 2. Set up Supabase
1. Create a [Supabase project](https://supabase.com/dashboard)
2. Run the 3 SQL migration files from `backend/sql/` in order in the SQL Editor
3. Copy your **Project URL** and **anon key** from Settings → API

### 3. Configure credentials
```bash
cp frontend/js/config.js.example frontend/js/config.js
# Edit config.js with your Supabase URL and anon key
```

Or create `frontend/js/config.js` manually:
```js
window.SUPABASE_URL = "https://your-project.supabase.co";
window.SUPABASE_ANON_KEY = "eyJ...your-key";
```

### 4. Open in browser
```bash
# Option A: Just open the file
open frontend/index.html

# Option B: Use a local server
npx serve frontend
```

The app works without Supabase too — it falls back to browser `localStorage` automatically.

---

## Database Schema

11 tables in a fully normalized PostgreSQL schema:

| Table | Purpose |
|-------|---------|
| `users` | Core accounts (UUID, email, username, role) |
| `user_profiles` | Points, rank, bio, avatar |
| `problems` | Problem bank with SQL schema + solution |
| `tags` | Tag vocabulary (10 pre-seeded) |
| `problem_tags` | Problems ↔ Tags (M:N) |
| `contests` | Contest metadata + lifecycle |
| `contest_problems` | Contests ↔ Problems (M:N, ordered) |
| `contest_participants` | Registrations + scores |
| `submissions` | Every SQL submission |
| `submission_test_results` | Per-test-case detail |
| `besql_kv` | Frontend state (used by storage.js) |

Full visual schema: open `docs/SCHEMA.dbml` in [dbdiagram.io](https://dbdiagram.io).

---

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the full guide covering:
- Supabase project setup
- Email confirmation via Resend
- Vercel deployment
- Troubleshooting

---

## License

[MIT](LICENSE) — free to use, modify, and distribute.
