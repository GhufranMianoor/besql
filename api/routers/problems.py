"""
problems.py — /api/problems routes.
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from api.database import get_main_conn
from api.deps import get_current_user, require_admin

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────

class ProblemCreateIn(BaseModel):
    title: str
    slug: str
    description: str
    difficulty: str          # Easy | Medium | Hard
    init_script: str         # DDL + seed SQL run in sandbox before user query
    golden_solution: str     # Authoritative correct query
    tags: list[str] = []
    schema_diagram: Optional[str] = None  # Optional ASCII/Markdown schema description


# ── List problems ──────────────────────────────────────────────────────────

@router.get("")
def list_problems(
    difficulty: Optional[str] = Query(None, pattern="^(Easy|Medium|Hard)$"),
    tag: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    conn=Depends(get_main_conn),
):
    """Return a paginated list of published problems."""
    cur = conn.cursor()
    filters = ["is_published = TRUE"]
    params: list = []

    if difficulty:
        filters.append("difficulty = %s")
        params.append(difficulty)
    if tag:
        filters.append("tags @> %s::jsonb")
        params.append(f'["{tag}"]')

    where = " AND ".join(filters)
    offset = (page - 1) * per_page

    cur.execute(
        f"""
        SELECT id, title, slug, difficulty, tags, accept_count, submit_count,
               ROUND(
                 CASE WHEN submit_count = 0 THEN 0
                      ELSE accept_count::numeric / submit_count * 100
                 END, 1
               ) AS acceptance_rate
        FROM problems
        WHERE {where}
        ORDER BY created_at DESC
        LIMIT %s OFFSET %s
        """,
        params + [per_page, offset],
    )
    rows = [dict(r) for r in cur.fetchall()]

    cur.execute(f"SELECT COUNT(*) AS cnt FROM problems WHERE {where}", params)
    total = cur.fetchone()["cnt"]

    return {"total": total, "page": page, "per_page": per_page, "problems": rows}


# ── Get single problem ─────────────────────────────────────────────────────

@router.get("/{slug}")
def get_problem(slug: str, conn=Depends(get_main_conn)):
    """Return a single problem by slug (published only)."""
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, title, slug, description, difficulty, tags,
               accept_count, submit_count, schema_diagram
        FROM problems
        WHERE slug = %s AND is_published = TRUE
        """,
        (slug,),
    )
    row = cur.fetchone()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found")
    return dict(row)


# ── Create problem (admin only) ────────────────────────────────────────────

@router.post("", status_code=status.HTTP_201_CREATED)
def create_problem(
    body: ProblemCreateIn,
    conn=Depends(get_main_conn),
    admin=Depends(require_admin),
):
    """Create a new problem. Admin role required."""
    if body.difficulty not in ("Easy", "Medium", "Hard"):
        raise HTTPException(status_code=400, detail="difficulty must be Easy, Medium, or Hard")

    import json
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO problems
            (title, slug, description, difficulty, init_script, golden_solution,
             tags, schema_diagram, is_published, author_id)
        VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb, %s, FALSE, %s)
        RETURNING id, slug
        """,
        (
            body.title, body.slug, body.description, body.difficulty,
            body.init_script, body.golden_solution,
            json.dumps(body.tags), body.schema_diagram,
            admin["id"],
        ),
    )
    row = cur.fetchone()
    return {"id": row["id"], "slug": row["slug"], "message": "Problem created (unpublished)"}
