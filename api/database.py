"""
database.py — psycopg2 connection helpers for BeSQL.

Two separate databases are used:
  1. main DB  — users, problems, submissions (persistent state)
  2. sandbox DB — ephemeral SQL execution only (nothing is ever committed)
"""

from __future__ import annotations

import os
from typing import Generator

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

_MAIN_DSN    = os.getenv("DATABASE_URL")
_SANDBOX_DSN = os.getenv("SANDBOX_DATABASE_URL")

if not _MAIN_DSN or not _SANDBOX_DSN:
    import warnings
    warnings.warn(
        "DATABASE_URL or SANDBOX_DATABASE_URL is not set. "
        "Using localhost defaults — ensure these are set in production.",
        stacklevel=2,
    )
    _MAIN_DSN    = _MAIN_DSN    or "postgresql://besql_app:change_me_in_production@localhost:5432/besql"
    _SANDBOX_DSN = _SANDBOX_DSN or "postgresql://besql_sandbox:sandbox_password@localhost:5433/besql_sandbox"


def get_main_conn() -> Generator[psycopg2.extensions.connection, None, None]:
    """Yield a psycopg2 connection to the main DB; commit on success, rollback on error."""
    conn = psycopg2.connect(_MAIN_DSN, cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def get_sandbox_conn() -> psycopg2.extensions.connection:
    """
    Return an *autocommit-disabled* connection to the sandbox DB.

    The caller is responsible for wrapping statements in BEGIN…ROLLBACK so that
    any DDL/DML executed for a user query is always rolled back.
    """
    conn = psycopg2.connect(_SANDBOX_DSN)
    conn.autocommit = False
    return conn
