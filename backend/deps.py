"""FastAPI dependencies: who is calling, and are they allowed?"""
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import Cookie, Depends, HTTPException
from pymongo.errors import PyMongoError

from .db import ensure_admin, ensure_indexes, get_db
from .security import COOKIE, read_token


def db():
    try:
        database = get_db()
        ensure_indexes(database)
        ensure_admin(database)
    except (PyMongoError, RuntimeError):
        # e.g. Atlas blocking this server's IP, or a bad MONGODB_URI: answer cleanly, not with a crash
        raise HTTPException(503, {"code": "db_unavailable"})
    return database


def current_user(token: str | None = Cookie(default=None, alias=COOKIE), database=Depends(db)):
    """The signed-in user, or None for guests. Re-checked in the database on every
    request, so suspending someone takes effect immediately."""
    if not token:
        return None
    user_id = read_token(token)
    if not user_id:
        return None
    try:
        user = database.users.find_one({"_id": ObjectId(user_id)})
    except InvalidId:
        return None
    if not user or user["status"] != "approved":
        return None
    return user


def require_admin(user=Depends(current_user)):
    if not user:
        raise HTTPException(401, "Sign in required")
    if user["role"] != "admin":
        raise HTTPException(403, "Admins only")
    return user


def public_user(user: dict) -> dict:
    return {
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "status": user["status"],
        "createdAt": user["createdAt"].isoformat(),
    }
