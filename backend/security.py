"""Password hashing (bcrypt) and login tokens (JWT in an httpOnly cookie)."""
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from .config import settings

COOKIE = "kk_token"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except ValueError:
        return False


def temp_password() -> str:
    return secrets.token_urlsafe(9)


def create_token(user_id: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(days=settings.token_days)
    return jwt.encode({"sub": user_id, "exp": exp}, settings.jwt_secret, algorithm="HS256")


def read_token(token: str) -> str | None:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])["sub"]
    except jwt.PyJWTError:
        return None


def cookie_args() -> dict:
    return {
        "key": COOKIE,
        "httponly": True,  # not readable by page JavaScript
        "samesite": "lax",
        "secure": settings.production,
        "max_age": settings.token_days * 86400,
        "path": "/",
    }
