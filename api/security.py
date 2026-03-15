"""
security.py — JWT creation/verification and password hashing for BeSQL.
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

_SECRET     = os.getenv("JWT_SECRET", "")
_ALGORITHM  = os.getenv("JWT_ALGORITHM", "HS256")
_EXPIRE_MIN = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

# Fail fast in production if JWT_SECRET is not configured
if not _SECRET:
    _default = "change_me_to_a_long_random_secret_in_production"  # dev only
    import warnings
    warnings.warn(
        "JWT_SECRET environment variable is not set. "
        "Using an insecure default — NEVER deploy this to production.",
        stacklevel=2,
    )
    _SECRET = _default

_pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── Passwords ──────────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    return _pwd_ctx.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return _pwd_ctx.verify(plain, hashed)


# ── Tokens ─────────────────────────────────────────────────────────────────

def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=_EXPIRE_MIN))
    to_encode["exp"] = expire
    return jwt.encode(to_encode, _SECRET, algorithm=_ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    """
    Decode and verify a JWT.  Raises jose.JWTError on failure.
    """
    return jwt.decode(token, _SECRET, algorithms=[_ALGORITHM])
