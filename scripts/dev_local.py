"""Run the full backend locally WITHOUT Atlas: an in-memory database seeded with the
sample knowledge (real Gemini embeddings). Data is lost when you stop it.

    .venv/bin/python -m scripts.dev_local        # http://127.0.0.1:8000  (docs: /api/docs)

Test accounts (password: Passw0rd!): admin@school.org, staff@school.org, student@school.org
"""
import json
from datetime import datetime, timezone
from pathlib import Path

import mongomock
import uvicorn

from backend import db as db_module
from backend.rag import ingest
from backend.security import hash_password

DATA = Path(__file__).resolve().parent.parent / "data" / "knowledge.json"
PASSWORD = "Passw0rd!"


def build() -> None:
    db = mongomock.MongoClient()["dev"]
    db_module.set_db(db)
    for name, email, role in (("Head Admin", "admin@school.org", "admin"), ("Pat Staff", "staff@school.org", "staff"),
                              ("Amina Juma", "student@school.org", "student")):
        db.users.insert_one({"name": name, "email": email, "passwordHash": hash_password(PASSWORD), "role": role,
                             "status": "approved", "createdAt": datetime.now(timezone.utc)})
    for name, email, role in (("Neema Joseph", "neema@school.org", "student"), ("Baraka Mushi", "baraka@school.org", "staff")):
        db.users.insert_one({"name": name, "email": email, "passwordHash": hash_password(PASSWORD), "role": role,
                             "status": "pending", "createdAt": datetime.now(timezone.utc)})
    print("Embedding sample knowledge (takes ~20 s)...")
    for e in json.loads(DATA.read_text(encoding="utf-8"))["entries"]:
        ingest.create_document(db, title=e["title"], content=e["content"], access=e["access"], kind="seed")
    print("Ready. Accounts: admin@ / staff@ / student@school.org, password", PASSWORD)


if __name__ == "__main__":
    build()
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, log_level="warning")
