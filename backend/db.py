"""MongoDB connection (PyMongo). One client is reused across requests."""
from pymongo import ASCENDING, MongoClient
from pymongo.database import Database

from .config import settings

_client: MongoClient | None = None
_db: Database | None = None
_indexed = False


def get_db() -> Database:
    global _client, _db
    if _db is None:
        if not settings.mongodb_uri or "FAKE" in settings.mongodb_uri:
            raise RuntimeError("MONGODB_URI is not configured")
        # Short timeouts so a bad URI fails fast instead of hanging a request.
        _client = MongoClient(settings.mongodb_uri, serverSelectionTimeoutMS=8000, connectTimeoutMS=8000)
        _db = _client[settings.mongodb_db]
    return _db


def set_db(db: Database) -> None:
    """Swap the database (used by tests)."""
    global _db, _indexed
    _db, _indexed = db, False


def ensure_indexes(db: Database) -> None:
    """Idempotent; runs once per process."""
    global _indexed
    if _indexed:
        return
    db.users.create_index([("email", ASCENDING)], unique=True)
    db.chunks.create_index([("docId", ASCENDING)])
    db.chunks.create_index([("access", ASCENDING)])
    _indexed = True


def ensure_admin(db: Database) -> None:
    """Create the first admin from ADMIN_EMAIL / ADMIN_PASSWORD if missing.
    Never overwrites an existing account."""
    from datetime import datetime, timezone

    from .security import hash_password

    email = settings.admin_email.strip().lower()
    if not email or not settings.admin_password or "FAKE" in settings.admin_password:
        return
    if db.users.find_one({"email": email}):
        return
    db.users.insert_one({
        "name": "Administrator",
        "email": email,
        "passwordHash": hash_password(settings.admin_password),
        "role": "admin",
        "status": "approved",
        "createdAt": datetime.now(timezone.utc),
    })
