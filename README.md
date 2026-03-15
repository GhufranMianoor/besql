# BeSQL — Enterprise-Grade SQL Online Judge

> An enterprise-grade SQL online judge for company hiring pipelines and competitive programming, inspired by [vJudge.net](https://vjudge.net) and [LeetCode](https://leetcode.com).

---

## ✨ Features

| Module | Highlights |
|---|---|
| **Authentication** | JWT + refresh-token rotation, BCrypt passwords, role-based access (Admin / Judge / CompanyHR / Contestant), rate-limited login |
| **SQL Execution Engine** | Transient "Shadow Schema" isolation per submission, EXPLAIN ANALYZE cost & timing, SELECT * detection, DML/DDL guard |
| **Result Set Diff Engine** | Order-independent row comparison, column-set check, floating-point tolerance, structured cell-level diff |
| **Problem Management** | Version-controlled problem statements, `.sql` init scripts for complex schemas, tag filtering |
| **Contest Mode** | Timed contests, real-time leaderboard via SignalR/WebSocket, per-problem scoring |
| **Frontend** | React 19 + TypeScript, Monaco Editor (VS Code engine) with SQL schema hinting, 3-pane judge layout |
| **Infrastructure** | PostgreSQL, Redis (leaderboard caching), RabbitMQ (submission queue), Docker Compose |

---

## 🏗️ Clean Architecture

```
backend/
├── BeSQL.Domain/           # Entities, Enums — pure C#, no dependencies
│   ├── Entities/
│   │   ├── User.cs
│   │   ├── Problem.cs
│   │   ├── Submission.cs
│   │   ├── Contest.cs
│   │   ├── ContestProblem.cs
│   │   ├── ContestParticipant.cs
│   │   ├── ProblemVersion.cs
│   │   └── RefreshToken.cs
│   └── Enums/
│       ├── UserRole.cs         (Contestant | Judge | CompanyHR | Admin)
│       ├── SubmissionStatus.cs
│       ├── ContestStatus.cs
│       └── Difficulty.cs
│
├── BeSQL.Application/      # Use cases (MediatR CQRS), interfaces, DTOs
│   ├── Common/
│   │   ├── Interfaces/
│   │   │   ├── IApplicationDbContext.cs
│   │   │   ├── ISqlExecutionService.cs   ← core judging contract
│   │   │   ├── IResultSetDiffEngine.cs
│   │   │   ├── ITokenService.cs
│   │   │   ├── IPasswordHasher.cs
│   │   │   └── ICurrentUserService.cs
│   │   └── Models/
│   │       ├── ResultSetDto.cs
│   │       ├── ExecutionResult.cs
│   │       └── DiffResult.cs
│   └── Features/
│       ├── Auth/Commands/       (Register, Login, RefreshToken)
│       ├── Problems/            (CreateProblem, GetProblems)
│       ├── Submissions/         (SubmitSolution)
│       └── Contests/            (CreateContest, GetLeaderboard)
│
├── BeSQL.Infrastructure/   # EF Core, services, identity
│   ├── Data/
│   │   ├── ApplicationDbContext.cs
│   │   └── Configurations/     (Fluent API EF configs)
│   ├── Services/
│   │   ├── SqlExecutionService.cs   ← Shadow-schema isolation
│   │   └── ResultSetDiffEngine.cs   ← Order-independent diff
│   └── Identity/
│       ├── TokenService.cs          ← JWT + refresh rotation
│       └── BcryptPasswordHasher.cs
│
└── BeSQL.WebAPI/           # ASP.NET Core 9 REST API
    ├── Controllers/
    │   ├── AuthController.cs
    │   ├── ProblemsController.cs
    │   ├── SubmissionsController.cs
    │   └── ContestsController.cs
    ├── Hubs/
    │   └── ContestHub.cs       ← SignalR real-time leaderboard
    ├── Middleware/
    │   ├── ExceptionMiddleware.cs
    │   └── CurrentUserService.cs
    └── Program.cs

frontend/
├── src/
│   ├── components/
│   │   ├── editor/
│   │   │   └── SqlEditor.tsx        ← Monaco Editor + schema hinting
│   │   ├── schema/
│   │   │   └── SchemaViewer.tsx     ← Collapsible table/column tree
│   │   ├── results/
│   │   │   └── ResultsPanel.tsx     ← Run results + judge diff view
│   │   └── layout/
│   │       └── Layout.tsx
│   ├── pages/
│   │   ├── ProblemSolver.tsx        ← 3-pane judge layout
│   │   ├── Home.tsx
│   │   ├── LeaderboardPage.tsx      ← Live SignalR updates
│   │   └── ContestPage.tsx
│   ├── services/
│   │   ├── api.ts                   ← Axios + JWT interceptor
│   │   └── besqlApi.ts
│   ├── store/
│   │   └── authStore.ts             ← Zustand auth state
│   └── types/
│       └── index.ts

docker/
└── postgres/
    ├── schema.sql      ← Full PostgreSQL DDL with indexes & triggers
    ├── init.sql
    └── sandbox_init.sql
```

---

## 🗃️ PostgreSQL Schema

The schema lives in [`docker/postgres/schema.sql`](docker/postgres/schema.sql).

### Tables

| Table | Purpose |
|---|---|
| `users` | Platform users with role, score, streak |
| `refresh_tokens` | Rotating JWT refresh tokens |
| `problems` | Problem definitions with init script and golden solution |
| `problem_versions` | Immutable snapshots for version-control of problems |
| `contests` | Timed SQL contests |
| `contest_problems` | Many-to-many: contest ↔ problems with ordering and point values |
| `contest_participants` | Leaderboard entries per contest |
| `submissions` | Every submission with status, timing, cost, and diff output |

### Key Design Decisions

- **JSONB `tags`** on problems enables `@>` operator tag filtering with a GIN index.
- **`pg_trgm`** indexes on `username` and `title` for fast fuzzy search.
- **`update_user_stats()` trigger** auto-increments `solved` and `score` on first-AC.
- **`problem_versions`** captures every edit so problem history is never lost.

---

## ⚙️ SQL Execution Engine

[`SqlExecutionService.cs`](backend/BeSQL.Infrastructure/Services/SqlExecutionService.cs)

### How it works

```
User submits query
       │
       ▼
  IsSafeSelectQuery()  ──reject DML/DDL──► RuntimeError
       │
       ▼
  CREATE SCHEMA sandbox_<uuid>
       │
       ▼
  SET search_path TO sandbox_<uuid>
       │
       ▼
  Run init_script (problem DDL + seed data)
       │
  ┌────┴──────────────────────────────────────────────────────────┐
  │  Execute golden solution   Execute user query + EXPLAIN ANALYZE│
  └────────────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
                         ResultSetDiffEngine.Compare()
                                   │
                         ┌─────────┴──────────┐
                         │  Accepted           │  WrongAnswer
                         └─────────────────────┘
                                   │
                                   ▼
                         DROP SCHEMA sandbox_<uuid> CASCADE
```

### Security layers

1. **`IsSafeSelectQuery()`** — rejects any query that isn't SELECT/WITH or that contains INSERT / UPDATE / DELETE / DROP / TRUNCATE / ALTER / CREATE / GRANT / REVOKE.
2. **Restricted PostgreSQL role** — `besql_sandbox` has no superuser privileges and cannot access the application database.
3. **Schema-level isolation** — every submission gets a unique UUID schema that is dropped unconditionally in the `finally` block.
4. **10-second command timeout** — kills runaway queries.

---

## 🔍 Result Set Diff Engine

[`ResultSetDiffEngine.cs`](backend/BeSQL.Infrastructure/Services/ResultSetDiffEngine.cs)

| Check | Detail |
|---|---|
| Column set | Missing / extra columns reported before row comparison |
| Row count | Mismatch short-circuits to `WrongAnswer` immediately |
| Order-independence | Both result sets are sorted by all columns before comparison |
| Cell comparison | Floating-point tolerance (1e-9 for `double`, 1e-6 for `float`) |
| SELECT * warning | Flagged in `DiffResult.Warnings` even on correct answer |

---

## 🖥️ Monaco SQL Editor

[`SqlEditor.tsx`](frontend/src/components/editor/SqlEditor.tsx)

- Uses `@monaco-editor/react` (VS Code engine).
- Registers a custom **`CompletionItemProvider`** that offers:
  - All SQL keywords and built-in functions with snippets.
  - **Schema-aware**: table names with column counts, `table.column` completions showing type info.
  - Column-only completions for quick access.
- Triggers re-registration automatically when the `schema` prop changes.
- Keybindings: `Ctrl+Enter` → Run, `Ctrl+Shift+Enter` → Submit, `Ctrl+Shift+F` → Format.

---

## 🚀 Getting Started

### Prerequisites

- Docker & Docker Compose
- Node 22+ (frontend dev)
- .NET 9 SDK (backend dev)

### Run with Docker Compose

```bash
# Set your JWT secret key
export JWT_SECRET_KEY="your-32-char-minimum-secret-key"

docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API (Swagger) | http://localhost:5000/swagger |
| RabbitMQ UI | http://localhost:15672 (besql / change_me_in_production) |

### Backend development

```bash
cd backend
dotnet restore
dotnet run --project BeSQL.WebAPI
```

### Frontend development

```bash
cd frontend
npm install
npm run dev   # http://localhost:5173
```

---

## 🔐 Roles

| Role | Permissions |
|---|---|
| `Contestant` | Solve problems, participate in contests |
| `Judge` | Review flagged submissions, manual override |
| `CompanyHR` | View analytics dashboards, export results |
| `Admin` | Full access: create problems/contests, manage users |

---

## 📡 Real-time Leaderboard

Connect to `/hubs/contest?access_token=<JWT>` and call:

```js
// Join contest group and receive immediate snapshot
hub.invoke('JoinContest', contestId)

// Receive updates on every AC submission
hub.on('LeaderboardUpdate', (leaderboard) => { /* ... */ })
```

The server broadcasts via `ContestHub.BroadcastLeaderboardAsync()` after each accepted submission.
