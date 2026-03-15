"""
auth.py — /api/auth routes: register, login, /me.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, field_validator

from api.database import get_main_conn
from api.deps import get_current_user
from api.security import create_access_token, hash_password, verify_password

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────

class RegisterIn(BaseModel):
    username: str
    email: EmailStr
    password: str

    @field_validator("username")
    @classmethod
    def username_length(cls, v: str) -> str:
        if len(v) < 3 or len(v) > 32:
            raise ValueError("Username must be 3–32 characters")
        return v

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(body: RegisterIn, conn=Depends(get_main_conn)):
    """Create a new user account and return a JWT."""
    cur = conn.cursor()

    # Uniqueness check
    cur.execute("SELECT id FROM users WHERE username = %s OR email = %s", (body.username, body.email))
    if cur.fetchone():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username or email already taken")

    pw_hash = hash_password(body.password)
    cur.execute(
        "INSERT INTO users (username, email, password_hash) VALUES (%s, %s, %s) RETURNING id",
        (body.username, body.email, pw_hash),
    )
    new_id = cur.fetchone()["id"]
    token = create_access_token({"sub": str(new_id)})
    return TokenOut(access_token=token)


@router.post("/login", response_model=TokenOut)
def login(form: OAuth2PasswordRequestForm = Depends(), conn=Depends(get_main_conn)):
    """Authenticate with username + password and return a JWT."""
    cur = conn.cursor()
    cur.execute("SELECT id, password_hash FROM users WHERE username = %s", (form.username,))
    row = cur.fetchone()
    if row is None or not verify_password(form.password, row["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token({"sub": str(row["id"])})
    return TokenOut(access_token=token)


@router.get("/me")
def me(current_user: dict = Depends(get_current_user)):
    """Return the currently authenticated user's profile."""
    return current_user
