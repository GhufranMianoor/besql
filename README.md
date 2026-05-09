# BeSQL

BeSQL is a browser-based SQL learning and contest platform with a lightweight in-browser SQL engine, a practice lab, contest workflows, and optional Supabase-backed sync.

## Quick Start

1. Create your local environment file:

```bash
cp .env.example .env
```

2. Generate the browser config from `.env`:

```bash
node frontend/scripts/generate-config.js
```

3. Start the Express backend (serves frontend and runtime config):

```bash
cd backend
npm install
npm run start
```

4. Open the app in a browser:

```bash
http://localhost:3000
```

Optional static-only mode (no backend):

```bash
open frontend/pages/home.html
```

No build step is required.

## Repository Layout

```text
besql/
├── frontend/              # Multipage browser app
│   ├── css/               # Global styles and responsive layout
│   ├── data/              # Default problems and seed data
│   ├── js/                # App logic, SQL engine, storage, features
│   └── pages/             # Standalone entry pages
├── backend/               # SQL schemas and backend stubs
├── docs/                  # Supporting documentation
├── .env                    # Local secrets and runtime config
├── .env.example           # Environment template
└── README.md              # Main project guide
```

## Frontend

The frontend is a pure HTML and ES module application. The main shell is `frontend/index.html`, while `frontend/pages/*.html` provide direct entry points for the dashboard, playground, contests, submissions, profile, and admin screens.

Key files:

- `frontend/js/app.js` - app state, routing, rendering, and practice lab logic
- `frontend/js/core/sql-engine.js` - in-browser SQL execution engine
- `frontend/js/storage/` - local persistence, rate limiting, and optional Supabase sync
- `frontend/css/style.css` - global responsive styling and layout
- `frontend/js/config.js` - generated browser config loaded from `.env`

## Backend

The backend now includes an Express server with dotenv support at `backend/src/server.js`. It serves the frontend and exposes runtime-safe config for the browser:

- `GET /health`
- `GET /api/config`
- `GET /js/config.js` (generated from `.env` at runtime)

SQL schemas remain in `backend/sql/`.

## Environment

The app expects local configuration through `.env`. Keep secrets out of version control.

When running through the backend, config is loaded from `.env` at runtime so there is no need to regenerate `frontend/js/config.js`.

## Documentation

- `docs/FILE_STRUCTURE.md`
- `docs/EDITOR_INTEGRATION.md`
- `docs/SECURITY.md`

## Features

- In-browser SQL editor and practice lab
- Real-time judge and contest workflows
- Leaderboards and submission history
- Responsive layout for desktop, tablet, and mobile
- Optional Supabase sync for cloud-backed storage

## Contributing

1. Create a feature branch.
2. Make your changes.
3. Run the app locally and verify the affected flow.
4. Open a pull request.

## License

See the repository license for details.
