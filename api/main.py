"""
BeSQL API — main entry point.

Run locally:
    uvicorn api.main:app --reload --port 8000

Or via Docker:
    docker compose up api
"""

from __future__ import annotations

import os
import time
from contextlib import asynccontextmanager
from typing import Any

import psycopg2
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from api.routers import auth, problems, submissions, leaderboard  # noqa: E402  (after load_dotenv)

# ── Application factory ────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown hook — verify DB connectivity on start."""
    db_url = os.getenv("DATABASE_URL", "")
    if db_url:
        try:
            conn = psycopg2.connect(db_url)
            conn.close()
        except Exception as exc:  # pragma: no cover
            print(f"[WARNING] Could not connect to main DB on startup: {exc}")
    yield


app = FastAPI(
    title="BeSQL API",
    description=(
        "SQL-contest platform API. "
        "Submissions are executed inside a BEGIN…ROLLBACK transaction so the "
        "sandbox database is never permanently mutated."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ───────────────────────────────────────────────────────────────────
_raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:5500,http://127.0.0.1:5500")
origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────
app.include_router(auth.router,        prefix="/api/auth",        tags=["auth"])
app.include_router(problems.router,    prefix="/api/problems",    tags=["problems"])
app.include_router(submissions.router, prefix="/api/submissions", tags=["submissions"])
app.include_router(leaderboard.router, prefix="/api/leaderboard", tags=["leaderboard"])


# ── Health check ───────────────────────────────────────────────────────────
@app.get("/api/health", tags=["meta"])
def health() -> dict[str, Any]:
    return {"status": "ok", "timestamp": time.time()}


# ── Root redirect hint ─────────────────────────────────────────────────────
@app.get("/", include_in_schema=False)
def root():
    return {"message": "BeSQL API is running. Visit /docs for the interactive docs."}
