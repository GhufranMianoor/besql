# BeSQL

BeSQL is a browser-based SQL learning and contest platform with a lightweight in-browser SQL engine, a practice lab, contest workflows, and optional Supabase-backed sync.

## Quick Start

1. Open `frontend/pages/home.html` or `index.html` directly in your browser.
2. For cloud syncing, copy `.env.example` to `.env` and fill in your Supabase credentials, then configure `frontend/js/config.js` accordingly (or rely on the browser's local storage mode).

No backend server or build step is required! The entire application can be run purely as static files.

## Repository Layout

```text
besql/
├── frontend/              # Multipage browser app
│   ├── css/               # Global styles and responsive layout
│   ├── js/                # App logic, SQL engine, storage, features
│   └── pages/             # Standalone entry pages
├── backend/               # SQL schemas for database setup
├── .env.example           # Environment template for Supabase
└── README.md              # Main project guide
```

## Frontend Architecture

The frontend is a pure HTML and ES module application. The main shell is `index.html`, while `frontend/pages/*.html` provide direct entry points for the dashboard, playground, contests, submissions, profile, and admin screens.

Key files:
- `frontend/js/app.js` - App state, routing, rendering, and practice lab logic
- `frontend/js/core/sql-engine.js` - In-browser SQL execution engine using SQL.js
- `frontend/js/storage/` - Local persistence, rate limiting, and optional Supabase sync
- `frontend/css/style.css` - Global responsive styling and layout

## Backend & Database

To utilize cloud syncing, set up a Supabase project and execute the SQL schemas located in `backend/sql/` in your Supabase SQL Editor. 
- `supabase-schema.sql` handles all relational structure setups.
- `db-tables.sql` manages practice dataset table definitions.

## Features

- In-browser SQL editor and practice lab
- Real-time judge and contest workflows
- Leaderboards and submission history
- Responsive layout for desktop, tablet, and mobile
- Optional Supabase sync for cloud-backed storage

## License

See the repository license for details.
