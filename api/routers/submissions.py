"""
submissions.py — /api/submissions routes.

The critical route is POST /api/submissions which implements the
BEGIN … ROLLBACK sandbox strategy:

    1. Fetch the problem's init_script (DDL + seed data).
    2. Open a connection to the *sandbox* PostgreSQL database.
    3. Execute BEGIN.
    4. Execute the init_script to set up the temporary schema.
    5. Execute the user's query and capture the result set.
    6. Execute the golden_solution and capture its result set.
    7. Compare the two result sets (order-insensitive row match).
    8. Execute ROLLBACK — the sandbox database is never permanently changed.
    9. Persist the submission record in the *main* database.
   10. Return the verdict to the client.
"""

from __future__ import annotations

import time
from typing import Any

import psycopg2
import psycopg2.extras
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from api.database import get_main_conn, get_sandbox_conn
from api.deps import get_current_user

router = APIRouter()

# Maximum rows we'll return to the client in the console pane
_MAX_RESULT_ROWS = 200

# Hard limit on execution time (seconds) — enforced via statement_timeout
_STATEMENT_TIMEOUT_MS = 5000


# ── Schemas ────────────────────────────────────────────────────────────────

class SubmitIn(BaseModel):
    problem_slug: str
    query: str


class ExecuteIn(BaseModel):
    """Ad-hoc execution (not graded) — used by the Run button in the IDE."""
    problem_slug: str
    query: str


# ── Helpers ────────────────────────────────────────────────────────────────

def _rows_to_list(cursor: psycopg2.extensions.cursor) -> list[list[Any]]:
    """Convert cursor rows to a plain list-of-lists for JSON serialisation."""
    return [list(row) for row in cursor.fetchall()]


def _columns(cursor: psycopg2.extensions.cursor) -> list[str]:
    if cursor.description is None:
        return []
    return [desc.name for desc in cursor.description]


def _normalise(rows: list[list[Any]]) -> list[tuple]:
    """Sort rows for order-insensitive comparison."""
    return sorted(tuple(str(v) for v in row) for row in rows)


def _run_in_sandbox(init_script: str, user_query: str, golden_query: str) -> dict[str, Any]:
    """
    Core sandboxed execution.

    Opens a sandbox connection, wraps everything in BEGIN…ROLLBACK, and
    returns a dict with:
        user_columns, user_rows, golden_rows, error, execution_ms
    """
    conn = get_sandbox_conn()
    result: dict[str, Any] = {
        "user_columns": [],
        "user_rows": [],
        "golden_rows": [],
        "error": None,
        "execution_ms": 0,
    }

    try:
        cur = conn.cursor()

        # Hard statement timeout — prevents runaway queries
        cur.execute(f"SET statement_timeout = {_STATEMENT_TIMEOUT_MS}")

        # ── BEGIN ──────────────────────────────────────────────────────────
        conn.autocommit = False

        # ── Setup schema + seed data ───────────────────────────────────────
        cur.execute(init_script)

        # ── Execute user query ─────────────────────────────────────────────
        t0 = time.perf_counter()
        try:
            cur.execute(user_query)
            result["user_columns"] = _columns(cur)
            result["user_rows"] = _rows_to_list(cur)[:_MAX_RESULT_ROWS]
        except psycopg2.Error as exc:
            result["error"] = exc.pgerror or str(exc)
            result["user_columns"] = []
            result["user_rows"] = []
        finally:
            result["execution_ms"] = round((time.perf_counter() - t0) * 1000, 2)

        # ── Execute golden solution (for grading) ──────────────────────────
        if result["error"] is None:
            try:
                # Re-run the init script on a clean savepoint so golden query
                # sees the same data as the user query
                conn.rollback()
                cur.execute(f"SET statement_timeout = {_STATEMENT_TIMEOUT_MS}")
                cur.execute(init_script)
                cur.execute(golden_query)
                result["golden_rows"] = _rows_to_list(cur)
            except psycopg2.Error:
                # Golden solution failure is a platform bug, not user error
                result["golden_rows"] = []

    finally:
        # ── ROLLBACK — always, no matter what ─────────────────────────────
        try:
            conn.rollback()
        except Exception:
            pass
        conn.close()

    return result


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.post("/execute")
def execute_query(
    body: ExecuteIn,
    conn=Depends(get_main_conn),
    current_user: dict = Depends(get_current_user),
):
    """
    Run a query in the sandbox and return the result set.
    This does NOT record a submission — it is for the IDE's 'Run' button.
    """
    cur = conn.cursor()
    cur.execute(
        "SELECT init_script FROM problems WHERE slug = %s AND is_published = TRUE",
        (body.problem_slug,),
    )
    row = cur.fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Problem not found")

    result = _run_in_sandbox(row["init_script"], body.query, "SELECT 1")

    return {
        "columns": result["user_columns"],
        "rows": result["user_rows"],
        "execution_ms": result["execution_ms"],
        "error": result["error"],
    }


@router.post("", status_code=status.HTTP_201_CREATED)
def submit_solution(
    body: SubmitIn,
    conn=Depends(get_main_conn),
    current_user: dict = Depends(get_current_user),
):
    """
    Grade a submitted query against the golden solution.

    Uses BEGIN…ROLLBACK on the sandbox DB so the database state is never
    permanently altered by user-submitted SQL.
    """
    cur = conn.cursor()
    cur.execute(
        "SELECT id, init_script, golden_solution FROM problems WHERE slug = %s AND is_published = TRUE",
        (body.problem_slug,),
    )
    problem = cur.fetchone()
    if problem is None:
        raise HTTPException(status_code=404, detail="Problem not found")

    # ── Sandboxed execution ────────────────────────────────────────────────
    result = _run_in_sandbox(problem["init_script"], body.query, problem["golden_solution"])

    # ── Grade ──────────────────────────────────────────────────────────────
    if result["error"]:
        verdict = "RuntimeError"
    elif _normalise(result["user_rows"]) == _normalise(result["golden_rows"]):
        verdict = "Accepted"
    else:
        verdict = "WrongAnswer"

    # ── Persist submission ─────────────────────────────────────────────────
    cur.execute(
        """
        INSERT INTO submissions
            (user_id, problem_id, query_text, status, execution_time_ms, error_message)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING id
        """,
        (
            current_user["id"],
            problem["id"],
            body.query,
            verdict,
            result["execution_ms"],
            result["error"],
        ),
    )
    sub_id = cur.fetchone()["id"]

    # ── Update problem counters ────────────────────────────────────────────
    cur.execute(
        """
        UPDATE problems
        SET submit_count = submit_count + 1,
            accept_count = accept_count + %s
        WHERE id = %s
        """,
        (1 if verdict == "Accepted" else 0, problem["id"]),
    )

    return {
        "submission_id": str(sub_id),
        "verdict": verdict,
        "execution_ms": result["execution_ms"],
        "columns": result["user_columns"],
        "rows": result["user_rows"],
        "error": result["error"],
    }


@router.get("/history")
def submission_history(
    conn=Depends(get_main_conn),
    current_user: dict = Depends(get_current_user),
):
    """Return the last 50 submissions for the authenticated user."""
    cur = conn.cursor()
    cur.execute(
        """
        SELECT s.id, p.title AS problem_title, p.slug AS problem_slug,
               s.status, s.execution_time_ms, s.submitted_at
        FROM submissions s
        JOIN problems p ON p.id = s.problem_id
        WHERE s.user_id = %s
        ORDER BY s.submitted_at DESC
        LIMIT 50
        """,
        (current_user["id"],),
    )
    return [dict(r) for r in cur.fetchall()]
