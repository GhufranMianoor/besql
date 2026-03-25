# BeSQL File Structure

## Core
- `index.html`: Main app shell and shared UI layout.
- `css/style.css`: Global styling.

## Pages (Nav Entry URLs)
- `pages/home.html`
- `pages/contests.html`
- `pages/custom.html`
- `pages/practice.html`
- `pages/playground.html`
- `pages/scoreboards.html`
- `pages/submissions.html`
- `pages/profile.html`
- `pages/admin.html`

These page files are stable URL entry points for each navigation area and route into the main app using the `view` query parameter.

## JavaScript
- `js/app.js`: Main runtime and feature logic.
- `js/core/route-entry.js`: Entry-view parser used by page-based routing.
- `js/features/auth.js`: Authentication, sessions, and route-state restore.
- `js/features/contests.js`: Contest list/detail, tabs, and contest leaderboard logic.
- `js/features/admin.js`: Admin panel, problem editor, and contest creator tools.
- `js/features/scoreboards.js`: Standalone contest scoreboards view.
- `js/storage/`: Storage and synchronization layer.

## Data
- `data/db.js`: In-memory SQL dataset.
- `data/problems.js`: Problem defaults.

## SQL
- `sql/db-tables.sql`
- `sql/sample-database.sql`
- `sql/supabase-schema.sql`
