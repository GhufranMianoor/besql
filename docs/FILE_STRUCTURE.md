# BeSQL File Structure

## Frontend
- `index.html`: Main app shell and shared UI layout.
- `css/style.css`: Global styling.
- `data/db.js`: In-memory SQL dataset.
- `data/problems.js`: Default problem bank.

## Pages (Entry URLs)
- `pages/home.html`
- `pages/contests.html`
- `pages/custom.html`
- `pages/practice.html`
- `pages/playground.html`
- `pages/scoreboards.html`
- `pages/submissions.html`
- `pages/profile.html`
- `pages/admin.html`

These page files are standalone HTML entry points for each navigation area.

## JavaScript
- `js/app.js`: Main runtime and feature logic.
- `js/besql-sql-editor.js`: CodeMirror 6 SQL editor wrapper (multi-dialect support).
- `js/core/route-entry.js`: Entry-view parser used by page-based routing.
- `js/core/sql-engine.js`: In-browser SQL parser and executor.
- `js/features/auth.js`: Authentication, sessions, and route-state restore.
- `js/features/contests.js`: Contest list/detail, tabs, and contest leaderboard logic.
- `js/features/admin.js`: Admin panel, problem editor, and contest creator tools.
- `js/features/scoreboards.js`: Standalone contest scoreboards view.
- `js/storage/`: Storage and synchronization layer.

## Data
- `data/db.js`: In-memory SQL dataset.
- `data/problems.js`: Default problem bank.

## SQL
- `sql/db-tables.sql`
- `sql/sample-database.sql`
- `sql/supabase-schema.sql`
