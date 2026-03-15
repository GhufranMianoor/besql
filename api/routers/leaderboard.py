"""
leaderboard.py — /api/leaderboard route.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from api.database import get_main_conn

router = APIRouter()


@router.get("")
def get_leaderboard(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    conn=Depends(get_main_conn),
):
    """Return the global ranklist ordered by score (then solved count, then username)."""
    cur = conn.cursor()
    offset = (page - 1) * per_page

    cur.execute(
        """
        SELECT username, score, solved, streak,
               RANK() OVER (ORDER BY score DESC, solved DESC, username ASC) AS rank
        FROM users
        ORDER BY score DESC, solved DESC, username ASC
        LIMIT %s OFFSET %s
        """,
        (per_page, offset),
    )
    rows = [dict(r) for r in cur.fetchall()]

    cur.execute("SELECT COUNT(*) AS cnt FROM users")
    total = cur.fetchone()["cnt"]

    return {"total": total, "page": page, "per_page": per_page, "users": rows}
