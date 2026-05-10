
# BeSQL — SQL Contest & Learning Platform
## Project Report

---

| | |
|---|---|
| **Student Name** | Muhammad Ghufran Shayan Khan Adeel Intikhab
| **Student ID** | 24K-0541 24K-0669 24K-0670
| **Program** | BS Computer Science — 2nd Year (Sophomore) |
| **Course** | Database Systems (CS2006) |
| **Institution** | FAST National University of Computer and Emerging Sciences, Karachi |
| **Submission Date** | May 2025 |
| **GitHub** | https://github.com/GhufranMianoor/besql |
| **Live Demo** | https://besql.vercel.app |

---

## Table of Contents

1. [Abstract](#1-abstract)
2. [Introduction](#2-introduction)
   - 2.1 [Background & Motivation](#21-background--motivation)
   - 2.2 [Problem Statement](#22-problem-statement)
   - 2.3 [Objectives](#23-objectives)
   - 2.4 [Scope](#24-scope)
3. [Literature Review / Related Work](#3-literature-review--related-work)
4. [System Design & Architecture](#4-system-design--architecture)
   - 4.1 [System Overview](#41-system-overview)
   - 4.2 [Layered Architecture](#42-layered-architecture)
   - 4.3 [Module Breakdown](#43-module-breakdown)
5. [Technology Stack](#5-technology-stack)
6. [Features & Functional Requirements](#6-features--functional-requirements)
   - 6.1 [Core Features (Implemented)](#61-core-features-implemented)
   - 6.2 [Non-Functional Requirements](#62-non-functional-requirements)
7. [Database Design](#7-database-design)
   - 7.1 [ER Model Overview](#71-er-model-overview)
   - 7.2 [Key Entities](#72-key-entities)
   - 7.3 [Security: Row-Level Security (RLS)](#73-security-row-level-security-rls)
8. [Implementation Details](#8-implementation-details)
   - 8.1 [Frontend Architecture](#81-frontend-architecture)
   - 8.2 [SQL Engine](#82-sql-engine)
   - 8.3 [Contest & Leaderboard System](#83-contest--leaderboard-system)
   - 8.4 [Security Model](#84-security-model)
9. [Testing & Validation](#9-testing--validation)
10. [Deployment](#10-deployment)
11. [Conclusion](#11-conclusion)
12. [References](#12-references)

---

BeSQL is a browser-based SQL competitive programming and learning platform designed for students and developers who wish to strengthen their SQL skills through structured challenges and timed contests. The platform is built as a **Single-Page Application (SPA)** that runs entirely in the browser using pure HTML5, CSS3, and JavaScript ES6+ modules. It incorporates a real-time SQL judge, a curated problem bank of 40+ challenges across multiple difficulty tiers, a leaderboard system, and deep cloud synchronization via Supabase.

This report documents the completed system: its architecture, technology stack, implemented features, database schema, and security model.

---

## 2. Introduction

### 2.1 Background & Motivation

Structured Query Language (SQL) remains one of the most in-demand skills in the technology industry. Despite its widespread use, most existing platforms for practising SQL — such as LeetCode, HackerRank, or SQLZoo — are either paywalled, lack competitive features, or are not aligned with the curricula used in Pakistani universities.

BeSQL was conceived to fill this gap: a platform purpose-built for SQL practice and competition, accessible entirely through a web browser without requiring any installation or backend infrastructure. Drawing from the developer's experience in the Database Systems course (CS2006) at FAST-NUCES Karachi, the platform is aligned with standard SQL topics taught in undergraduate CS programs.

### 2.2 Problem Statement

Students learning SQL face several challenges:

- **Lack of instant feedback** on query correctness in academic environments.
- **No competitive platform** that makes SQL practice engaging for Pakistani students.
- **Fragmented learning resources** — theory, exercises, and challenges are scattered across multiple platforms.
- **No unified multi-dialect support** (Oracle, MySQL, PostgreSQL, SQL Server) for students using different DBMS systems.

BeSQL addresses these problems by consolidating SQL practice, judging, contests, and leaderboards into a single, zero-install platform.

### 2.3 Objectives

1. Provide an interactive SQL editor with real-time query execution and result validation.
2. Host a curated problem bank of 40+ SQL challenges ranging from beginner to advanced.
3. Enable timed competitive contests with automated scoring and leaderboard tracking.
4. Support multiple SQL dialects: PostgreSQL, MySQL, Oracle SQL, SQL Server, and SQLite.
5. Implement a fully responsive UI supporting devices from 320px to 1920px+ screen width.

### 2.4 Scope

The current release (v1.0) covers the complete frontend implementation with a browser-based SQL engine. Backend services (REST API, authentication server, real-time sockets) are planned for v2.0 as outlined in the separate proposal document. The platform is intended primarily for undergraduate Computer Science students, though it is open source and publicly accessible.

---

## 3. Literature Review / Related Work

The following table presents a comparative analysis of existing SQL learning and practice platforms:

| Platform | SQL Dialects | Competitions | Free Access | Offline Support |
|---|---|---|---|---|
| LeetCode | MySQL, SQLite | Yes (premium) | Partial | No |
| HackerRank | MySQL, MS SQL | Yes | Yes (limited) | No |
| SQLZoo | Multiple | No | Yes | No |
| Mode Analytics | PostgreSQL | No | Partial | No |
| **BeSQL (this project)** | **5 dialects** | **Yes** | **Yes (full)** | **Yes** |

BeSQL differentiates itself through its fully offline-capable design, multi-dialect support, and purpose-built contest system. Unlike commercial platforms, it requires no sign-up for basic use and can be deployed as a static site.

---

## 4. System Design & Architecture

### 4.1 System Overview

BeSQL follows a layered client-side architecture where all core functionality is executed in the browser. An optional thin backend layer (Supabase PostgreSQL) provides persistent storage and authentication when enabled. The system is designed to be functional without any backend by relying on IndexedDB and LocalStorage for state persistence.

### 4.2 Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                      │
│   HTML5 pages: home, editor, problems, contests,            │
│   leaderboard, admin  ·  CSS3 responsive (16 breakpoints)   │
├─────────────────────────────────────────────────────────────┤
│                     APPLICATION LAYER                       │
│   JavaScript ES6+ Modules                                   │
│   ├── core/          SQL engine · client-side router        │
│   ├── features/      auth · contests · scoreboards · admin  │
│   └── storage/       Supabase client · rate limiting        │
├─────────────────────────────────────────────────────────────┤
│                      STORAGE LAYER                          │
│   Browser-native: LocalStorage · IndexedDB (offline)        │
│   Cloud (optional): Supabase PostgreSQL + RLS               │
├─────────────────────────────────────────────────────────────┤
│                   INFRASTRUCTURE LAYER                      │
│   Vercel static hosting  ·  GitHub (source control)         │
│   Supabase PostgreSQL (optional cloud backend)              │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Module Breakdown

| Module / File | Location | Responsibility |
|---|---|---|
| `app.js` | `frontend/js/` | Main app state, SPA routing logic, module pre-loading |
| `core/sql-engine.js` | `frontend/js/core/` | SQL parsing, execution logic (SQLite) |
| `core/route-entry.js` | `frontend/js/core/` | SPA route definition and component mounting |
| `features/auth.js` | `frontend/js/features/` | Supabase Auth, secure password resets (email+username) |
| `features/contests.js` | `frontend/js/features/` | Contest creation, joining, and timer logic |
| `features/scoreboards.js` | `frontend/js/features/` | Leaderboard calculation and rendering |
| `features/admin.js` | `frontend/js/features/` | Admin dashboard and problem management |
| `storage/storage.js` | `frontend/js/storage/` | Supabase sync, rate limiting, local cache |
| `data/problems.js` | `frontend/data/` | Default problem bank (40+ challenges) |
| `backend/sql/` | `backend/sql/` | PostgreSQL schemas and migration scripts |

---

### 5.1 Frontend Technologies

| Technology | Version | Purpose |
|---|---|---|
| HTML5 | 5 | Semantic page structure; **Single-Page Application (SPA)** |
| CSS3 | 3 | Responsive layout; 16 breakpoints (320px – 1920px+) |
| JavaScript | ES6+ | Application logic; pure ES modules (no transpiler) |
| CodeMirror | 6 | High-performance SQL editor with themes and auto-complete |
| Supabase JS SDK | Latest | PostgreSQL backend and authentication integration |

### 5.2 Backend Technologies

| Technology | Purpose |
|---|---|
| Supabase / PostgreSQL | Primary cloud database; Row-Level Security (RLS) enabled |
| PL/pgSQL | Database triggers, functions, and scoring logic |
| Vercel | Production hosting and automated deployment |

### 5.3 Language Distribution (Repository)

| Language | Percentage | Role |
|---|---|---|
| JavaScript | 49.7% | Application logic and SQL engine |
| HTML | 37.0% | Page structure and templating |
| CSS | 6.7% | Styling and responsive design |
| PL/pgSQL | 6.6% | Database schemas and stored procedures |

---

## 6. Features & Functional Requirements

### 6.1 Core Features (Implemented)

#### SQL Editor
- CodeMirror 6 integration with SQL syntax highlighting.
- Multi-dialect support: PostgreSQL, MySQL, Oracle SQL, SQL Server, SQLite.
- Query execution with immediate result display in tabular format.
- Expected output comparison for automatic correctness validation.

#### Problem Bank
- 40+ curated SQL problems across 5 difficulty tiers: Beginner, Easy, Medium, Hard, Expert.
- Problems organized by topic: SELECT, JOINs, subqueries, aggregations, window functions, DDL.
- Each problem includes description, schema, sample data, and expected output.
- DataVerse narrative theme for a gamified learning context.

#### Contest System
- Create and join timed SQL contests with configurable duration and problem sets.
- Visibility settings: public or private contests.
- Real-time countdown timer with automatic submission on timeout.
- Automated scoring based on correctness and submission time.

#### Leaderboard & Skill Rating
- Per-contest and global leaderboards with rank tracking.
- Skill rating system inspired by competitive programming (Elo-like).
- Historical performance visualization.

#### UI & Responsiveness
- Dark/Light theme toggle.
- 16 responsive breakpoints: 320px (ultra-small) to 1920px+ (wide desktop).
- Drawer sidebar for tablet view; stacked layout for mobile.
- Judge panel: 600px on desktop, 480px on laptop, full-width on mobile.

#### Offline & Storage
- LocalStorage caching for user preferences, session data, and progress.
- IndexedDB for larger offline data storage.
- Full Supabase cloud sync for authentication, submissions, and contests.
- **Security Hardening:** Password resets require both username and email verification.

### 6.2 Non-Functional Requirements

| Requirement | Target | Status |
|---|---|---|
| Performance | Page load < 2s on broadband | Met |
| Compatibility | All modern browsers (Chrome, Firefox, Edge, Safari) | Met |
| Responsiveness | 16 breakpoints from 320px to 1920px+ | Met |
| Accessibility | Keyboard navigable; ARIA labels on key components | Partial |
| Security | No sensitive data in LocalStorage; RLS on Supabase | Met |
| Scalability | Stateless frontend; Supabase scales independently | Met |

---

## 7. Database Design

### 7.1 ER Model Overview

The Supabase PostgreSQL backend uses a relational schema with Row-Level Security (RLS). The schema covers user accounts, problems, submissions, contests, contest participants, and leaderboard entries. PL/pgSQL is used for migrations and stored procedures (6.6% of the codebase).

### 7.2 Key Entities

| Entity | Key Attributes | Relationships |
|---|---|---|
| `users` | user_id (PK), username, email, skill_rating, created_at | 1-to-many with submissions, contest_participants |
| `problems` | problem_id (PK), title, difficulty, dialect, topic, expected_output | 1-to-many with submissions |
| `submissions` | submission_id (PK), user_id (FK), problem_id (FK), query, is_correct, submitted_at | Many-to-1 with users and problems |
| `contests` | contest_id (PK), title, start_time, end_time, created_by (FK) | 1-to-many with contest_participants |
| `contest_participants` | contest_id (FK), user_id (FK), score, rank, finished_at | Junction table for Contest–User M:N |
| `leaderboard` | entry_id (PK), user_id (FK), total_score, global_rank, updated_at | Materialized from submissions and contest scores |

### 7.3 Security: Row-Level Security (RLS)

- Users can only read and modify their own submissions.
- Contest creation is restricted to authenticated users.
- Leaderboard is publicly readable but write-protected.
- Environment secrets (`SUPABASE_URL`, `SUPABASE_KEY`, `JWT_SECRET`) are stored in `.env` (gitignored).

---

## 8. Implementation Details

### 8.1 Frontend Architecture

The frontend follows a **Single-Page Application (SPA)** pattern. Navigation is handled by a client-side router that dynamically mounts view components without page reloads. Each view (home, editor, problems, contests, leaderboard, admin) is managed by `core/route-entry.js`. Shared state is managed in `app.js`.

CSS is organized around a central `style.css` with CSS custom properties (variables) for theming. Switching between dark and light modes is achieved by toggling a `data-theme` attribute on the root element.

**Project structure:**

```
besql/
├── frontend/
│   ├── css/                 # Global and component stylesheets
│   ├── js/
│   │   ├── app.js           # App state & bootstrap
│   │   ├── core/            # SQL engine, SPA router
│   │   ├── features/        # auth, contests, scoreboards, admin
│   │   └── storage/         # Supabase sync, rate limiting
│   ├── data/                # Problem bank (40+ problems)
│   └── index.html           # SPA entry point
├── backend/
│   └── sql/                 # PostgreSQL schemas & migrations
├── docs/                    # DEPLOYMENT.md, SCHEMA.dbml
├── .env.example             # Environment variable template
└── README.md
```

### 8.2 SQL Engine

The core SQL engine (`js/core/sql-engine.js`) handles:

- **Query parsing and tokenization** via CodeMirror 6.
- **In-browser query execution** against pre-loaded problem datasets (SQLite via sql.js).
- **Result set comparison**: the engine normalizes column ordering and whitespace before comparing student output against expected results.
- **Global Shortcuts:** `Ctrl + Enter` (Windows/Linux) or `Cmd + Enter` (Mac) triggers code execution from any focused element.
- **Performance Optimization:** The SQL editor module is pre-loaded during application bootstrap to ensure zero-latency responsiveness.

### 8.3 Contest & Leaderboard System

The contest system (`features/contests.js`) implements:

- **Contest lifecycle**: draft → active → completed states.
- **Countdown timer** rendered in real time; auto-submit on expiry.
- **Per-problem scoring** with time-based bonus points for early submissions.

The leaderboard (`features/scoreboards.js`) aggregates submission scores across problems and computes global rankings. When Supabase is connected, rankings are persisted server-side; in offline mode, they are stored in LocalStorage.

### 8.4 Security Model

| Concern | Implementation |
|---|---|
| API key exposure | No keys embedded in frontend JS; secrets via `.env` (server-side only) |
| Data ownership | Supabase RLS policies enforce per-user data access at DB level |
| LocalStorage safety | Only non-sensitive data stored (theme preference, cached problem list) |
| Rate limiting | Implemented in `storage/storage.js` to prevent Supabase API abuse |
| Secret management | `.env` gitignored; `.env.example` provided as safe onboarding template |

---

## 9. Testing & Validation

### 9.1 Testing Approach

| Test Type | Method | Coverage |
|---|---|---|
| Unit Testing | Manual test cases for SQL engine parsing and result comparison | SQL Engine, Scoring Logic |
| Integration Testing | End-to-end flows: problem load → query execute → score update | Editor, Judge, Leaderboard |
| Responsive Testing | Chrome DevTools device emulation across all 16 breakpoints | All Pages |
| Cross-Browser Testing | Chrome, Firefox, Edge, Safari | All Pages |
| Security Testing | Manual LocalStorage audit; Supabase RLS policy verification | Storage, Auth |

### 9.2 Known Limitations

- **No automated test suite** (Jest/Vitest) yet — planned for v2.5.
- The SQL engine handles a subset of syntax; complex nested subqueries may not execute identically across all dialects.
- Offline contest synchronization requires manual re-sync after reconnection.

---

## 10. Deployment

### 10.1 Deployment Architecture

BeSQL is deployed as a static site on **Vercel**, accessible at `https://besql.vercel.app`. The pipeline:

1. Developer pushes to `main` branch on GitHub.
2. Vercel's GitHub integration detects the push and triggers a deployment.
3. No build step — Vercel serves static files directly.
4. Environment variables (Supabase keys) are configured in the Vercel project dashboard.

### 10.2 Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/GhufranMianoor/besql
cd besql

# 2. Configure environment (optional — needed for Supabase features)
cp .env.example .env
# Edit .env with your Supabase URL, Key, and JWT secret

# 3. Open in browser (no build step required)
open frontend/pages/home.html

# 4. For Supabase/module import compatibility, use a local server:
python -m http.server 8000
# Then visit http://localhost:8000/frontend/pages/home.html
```

---

## 11. Conclusion

BeSQL represents a meaningful contribution to SQL education and competitive programming, specifically tailored for students in undergraduate Computer Science programs. The platform successfully demonstrates that a fully functional, production-grade SQL learning environment can be built without a mandatory backend, using only modern browser APIs and JavaScript ES6+ modules.

The v1.0 release delivers on its core objectives:

- ✅ High-performance CodeMirror 6 editor with themes
- ✅ 40+ practice problems across five difficulty tiers
- ✅ Timed contest system with automated scoring
- ✅ Leaderboard and skill rating
- ✅ Fully responsive interface (16 breakpoints)
- ✅ Deep Supabase integration for cloud persistence

The Supabase integration provides a clear upgrade path to full cloud-backed persistence without requiring a complete architecture rewrite. The codebase is open source, well-structured, and documented — making it straightforward for contributors to extend.

This project was developed as part of the Database Systems course (CS2006) at FAST-NUCES Karachi.

---

## 12. References

1. Supabase. (2024). *Supabase Documentation*. https://supabase.com/docs
2. CodeMirror. (2024). *CodeMirror 6 Reference Manual*. https://codemirror.net/docs/
3. Vercel. (2024). *Vercel Deployment Documentation*. https://vercel.com/docs
4. Mozilla Developer Network. (2024). *JavaScript ES Modules*. https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
5. PostgreSQL Global Development Group. (2024). *PostgreSQL 16 Documentation*. https://www.postgresql.org/docs/
6. Elmasri, R. & Navathe, S. B. (2015). *Fundamentals of Database Systems* (7th ed.). Pearson.
7. Silberschatz, A., Korth, H. F., & Sudarshan, S. (2019). *Database System Concepts* (7th ed.). McGraw-Hill.
8. LeetCode. (2024). *Database Problems*. https://leetcode.com/problemset/database/
9. HackerRank. (2024). *SQL Challenges*. https://www.hackerrank.com/domains/sql
10. BeSQL GitHub Repository. (2025). https://github.com/GhufranMianoor/besql

---

*Department of Computer Science · FAST National University of Computer and Emerging Sciences · Karachi Campus · Spring 2025*
