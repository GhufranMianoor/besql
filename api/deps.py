"""
deps.py — FastAPI dependency-injection helpers.
"""

from __future__ import annotations

from typing import Generator

import psycopg2.extras
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError

from api.database import get_main_conn
from api.security import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def db_conn(conn=Depends(get_main_conn)) -> Generator:
    """Provide a RealDictCursor connection to the main DB."""
    yield conn


def get_current_user(
    token: str = Depends(oauth2_scheme),
    conn=Depends(get_main_conn),
) -> dict:
    """
    Decode the Bearer JWT and return the matching users row as a dict.
    Raises HTTP 401 if the token is invalid or the user does not exist.
    """
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exc
    except JWTError:
        raise credentials_exc

    cur = conn.cursor()
    cur.execute("SELECT id, username, email, role, score, solved FROM users WHERE id = %s", (user_id,))
    user = cur.fetchone()
    if user is None:
        raise credentials_exc
    return dict(user)


def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") != "Admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user
