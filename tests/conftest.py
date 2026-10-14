"""Test setup: in-memory MongoDB, fake embeddings, fake chat model. No network, no cost."""
import hashlib
import math
import re

import mongomock
import pytest
from fastapi.testclient import TestClient

from backend import db as db_module
from backend.config import settings
from backend.llm import router as llm_router
from backend.main import app


def fake_vec(text: str) -> list[float]:
    """Bag-of-words hashed into 64 dims: similar words -> similar vectors."""
    v = [0.0] * 64
    for w in re.findall(r"[a-z']+", text.lower()):
        v[int(hashlib.md5(w.encode()).hexdigest(), 16) % 64] += 1.0
    n = math.sqrt(sum(x * x for x in v)) or 1.0
    return [x / n for x in v]


class FakeLLM:
    NAME, calls = "fake", []

    @staticmethod
    def available():
        return True

    @classmethod
    async def stream(cls, system, messages):
        cls.calls.append({"system": system, "messages": messages})
        for piece in ["Hello ", "from ", "the ", "model."]:
            yield "test", piece


@pytest.fixture()
def client(monkeypatch):
    database = mongomock.MongoClient()["test"]
    db_module.set_db(database)
    monkeypatch.setattr(settings, "admin_email", "admin@school.org")
    monkeypatch.setattr(settings, "admin_password", "AdminPass123")
    monkeypatch.setattr(settings, "jwt_secret", "test-secret-test-secret-test-secret!")
    monkeypatch.setattr(settings, "min_score", 0.2)
    monkeypatch.setattr(settings, "rel_margin", 1.0)
    monkeypatch.setattr(settings, "denied_margin", 0.0)
    monkeypatch.setattr("backend.rag.ingest.embed_documents", lambda texts: [fake_vec(t) for t in texts])
    monkeypatch.setattr("backend.rag.retrieve.embed_query", fake_vec)
    monkeypatch.setattr(llm_router, "providers", lambda: [FakeLLM])
    FakeLLM.calls.clear()
    with TestClient(app) as c:
        c.database = database
        yield c


def sign_in(client, email, password):
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return r


@pytest.fixture()
def admin(client):
    sign_in(client, "admin@school.org", "AdminPass123")
    return client


def make_user(client, email="amina@school.org", role="student", approve=True):
    """Sign up a user and (optionally) approve them as an admin, leaving `client` logged out."""
    client.post("/api/auth/signup", json={"name": "Amina Juma", "email": email, "role": role, "password": "password123"})
    if approve:
        sign_in(client, "admin@school.org", "AdminPass123")
        uid = next(u["id"] for u in client.get("/api/admin/users").json()["users"] if u["email"] == email)
        assert client.post(f"/api/admin/users/{uid}/approve", json={"role": role}).status_code == 200
        client.post("/api/auth/logout")
        return uid


def sse_events(response):
    """Parse an SSE body into [(event, data)]."""
    import json

    out = []
    for block in response.text.strip().split("\n\n"):
        lines = dict(line.split(": ", 1) for line in block.split("\n") if ": " in line)
        out.append((lines["event"], json.loads(lines["data"])))
    return out
