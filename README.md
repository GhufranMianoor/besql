# BeSQL - SQL Contest Platform

A comprehensive SQL learning and competitive programming platform with multi-dialect support, real-time judge, and contest management.

## 📁 Project Structure

```
besql/
├── frontend/              # Frontend SPA (Single Page Application)
│   ├── index.html         # Main entry point
│   ├── css/               # Stylesheets
│   ├── js/                # Application logic
│   │   ├── app.js         # Main app state & routing
│   │   ├── besql-sql-editor.js  # CodeMirror 6 wrapper
│   │   ├── core/          # SQL engine & routing
│   │   ├── features/      # Auth, contests, admin, scoreboards
│   │   └── storage/       # Supabase sync & rate limiting
│   ├── data/              # Problem & contest definitions
│   ├── pages/             # HTML templates
│   └── README.md          # Frontend guide
│
├── backend/               # Backend structure & API configs
│   ├── sql/               # Database schemas & migrations
│   ├── README.md          # Backend guide
│   └── (API code goes here)
│
├── docs/                  # Documentation
│   ├── FILE_STRUCTURE.md  # Detailed file breakdown
│   ├── EDITOR_INTEGRATION.md  # CodeMirror guide
│   └── SECURITY.md        # Security best practices
│
├── .env                   # Environment variables (gitignored)
├── .env.example           # Template for .env
├── .gitignore             # Git ignore rules
└── README.md              # This file
```

## 🚀 Quick Start

### 1. Setup Environment Variables
```bash
cp .env.example .env
# Edit .env and add your API keys:
# - SUPABASE_URL & SUPABASE_KEY (optional, for cloud sync)
# - Other configuration as needed
```

### 2. Open Frontend
```bash
# Open the SPA in a browser:
open frontend/index.html
# Or navigate to: file:///path/to/besql/frontend/index.html
```

No build step required - the project uses native ES modules and runs directly in the browser.

## ✨ Features

- **Multi-Dialect SQL Editor** - MySQL, PostgreSQL, SQLite, MSSQL, MariaDB, PL/SQL, Cassandra
- **Real-Time SQL Judge** - Execute and test SQL queries instantly
- **Contest System** - Create, join, and compete in timed contests
- **Problem Bank** - 100+ curated SQL challenges
- **Leaderboards** - Track progress and rank against peers
- **Dark/Light Theme** - Responsive UI with 16 breakpoints
- **Offline Support** - Local storage caching
- **Supabase Integration** - Optional cloud sync

## 📚 Frontend (SPA)

Located in `frontend/`:
- **No build step required**
- Pure ES6+ modules
- Responsive design (320px to 1920px+)
- Dark theme with light mode toggle

### Development

Edit files in `frontend/`:
- `js/app.js` - Main application logic
- `css/style.css` - Global styles (edit CSS variables for theming)
- `js/features/*.js` - Feature modules
- `js/data/*.js` - Problem definitions

See `frontend/README.md` for detailed guides.

## 🔧 Backend (Optional)

Located in `backend/`:
- SQL schemas and migrations in `sql/`
- Placeholder for API routes and server code
- Environment configuration in `.env`

To build backend services (Node.js, Python, etc.):
1. Create API folder in `backend/`
2. Add server code and routes
3. Update `.env` with API endpoints
4. Update frontend API calls in `js/storage/storage.js`

See `backend/README.md` for structure guidelines.

## 🔐 Security & Configuration

### Environment Variables
Create `.env` with:
```env
SUPABASE_URL=your_url
SUPABASE_KEY=your_key
SUPABASE_SECRET=your_secret
JWT_SECRET=your_secret
API_SECRET=your_secret
# See .env.example for all options
```

**Important:** Never commit `.env` — it's in `.gitignore`. Share `.env.example` with your team.

### Security Best Practices
See `docs/SECURITY.md` for:
- API security
- User data protection
- Local storage safety
- Secure defaults

## 📖 Documentation

- `docs/FILE_STRUCTURE.md` - Detailed file breakdown
- `docs/EDITOR_INTEGRATION.md` - CodeMirror 6 integration guide
- `docs/SECURITY.md` - Security guidelines
- `frontend/README.md` - Frontend development guide
- `backend/README.md` - Backend structure guide

## 🛠️ Technologies

### Frontend
- **HTML5 / CSS3** - Semantic markup & responsive design
- **JavaScript ES6+** - Pure ES modules
- **CodeMirror 6** - SQL editor with syntax highlighting
- **Supabase** - Optional PostgreSQL backend

### Backend (Optional)
- Node.js / Express (recommended)
- PostgreSQL / Supabase
- JWT authentication
- Rate limiting

## 📱 Responsive Design

16 breakpoints optimized for all screen sizes:
- Desktop: 1920px+ (600px judge panel)
- Laptop: 1024px (480px judge panel)
- Tablet: 900px (drawer sidebar)
- Phone: ≤640px (full-width stacked)
- Ultra-small: ≤320px (minimal spacing)

## 🎯 Roadmap

- [ ] Backend API services
- [ ] Advanced analytics & progress tracking
- [ ] Community problem submissions
- [ ] Real-time multiplayer contests
- [ ] Mobile app (React Native)
- [ ] Certification system

## 📝 License

BeSQL is open source. See LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 💬 Support

For questions or issues:
- Open an issue on GitHub
- Check existing documentation in `docs/`
- Review code comments in source files

---

**Happy Learning! 🚀 Start solving SQL challenges now.**
