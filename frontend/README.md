# Frontend Structure

This folder contains all frontend assets and application code for BeSQL.

## Folders

- **css/** - Stylesheets (main: `style.css`)
- **js/** - JavaScript modules
  - `app.js` - Main application logic and state
  - `besql-sql-editor.js` - CodeMirror 6 SQL editor wrapper
  - **core/** - Core engine
    - `sql-engine.js` - In-browser SQL execution
    - `route-entry.js` - Routing helpers
  - **features/** - Feature modules
    - `auth.js` - Authentication and user management
    - `admin.js` - Admin panel
    - `contests.js` - Contest management
    - `scoreboards.js` - Leaderboards
  - **storage/** - Data persistence
    - `storage.js` - Cloud sync (Supabase)
    - `relational.js` - Relational DB sync
    - `rate-limiter.js` - Rate limiting
    - `index.js` - Storage entry point
- **data/** - Local data and problem definitions
- **pages/** - HTML page templates
- **docs/** - Documentation

## Files

- **index.html** - Main SPA entry point
- **style.css** - Global styles with responsive breakpoints

## Key Features

- **Responsive Design** - 16 breakpoints from 320px to 1920px+
- **CodeMirror 6 Integration** - Multi-dialect SQL editor
- **Dark/Light Theme** - Toggle theme support
- **Offline Support** - Local storage caching
- **Real-time Judge** - Test SQL submissions in-browser
- **Contest System** - Create, join, and participate in contests

## Getting Started

1. Open `index.html` in a modern browser
2. No build step required - uses ES modules
3. Check `.env.example` for optional Supabase configuration

## Customization

- Edit `css/style.css` for theming (CSS variables in `:root`)
- Modify `js/data/*.js` to add problems or adjust scoring
- Update `js/besql-sql-editor.js` for SQL dialect customization

