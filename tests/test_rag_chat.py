import io
import json

from backend.rag.chunking import chunk_text

from .conftest import FakeLLM, make_user, sign_in, sse_events

PUBLIC = "Parents day is held on the last Saturday of each term at nine in the main hall."
STUDENT = "School fees are paid at the bank and the receipt is stamped by the bursar."
STAFF = "Staff request leave by submitting the leave form to the head teacher."


def add_entry(admin, title, content, access):
    r = admin.post("/api/admin/documents/entries", json={"title": title, "content": content, "access": access})
    assert r.status_code == 201, r.text
    return r.json()["document"]


def seed(admin):
    add_entry(admin, "Parents Day", PUBLIC, "public")
    add_entry(admin, "Fee Payment", STUDENT, "student")
    add_entry(admin, "Staff Leave", STAFF, "staff")
    admin.post("/api/auth/logout")


def ask(client, text, history=None):
    r = client.post("/api/chat", json={"message": text, "history": history or []})
    assert r.status_code == 200
    return sse_events(r)


def sources(events):
    return [s["title"] for s in next(d for e, d in events if e == "meta")["sources"]]


def test_chunking():
    assert chunk_text("") == [] and chunk_text("short text") == ["short text"]
    long = "\n\n".join(f"Paragraph {i}. " + "word " * 60 for i in range(12))
    chunks = chunk_text(long)
    assert len(chunks) > 2 and all(len(c) <= 1100 for c in chunks)
    assert "Paragraph 0" in chunks[0] and "Paragraph 11" in chunks[-1]


def test_guest_gets_public_only_and_private_text_never_leaves(admin):
    seed(admin)
    ev = ask(admin, "When is parents day?")
    assert sources(ev) == ["Parents Day"]
    assert "Hello from the model." == "".join(d["t"] for e, d in ev if e == "token")

    # Asking about fees as a guest: restricted. Nothing from the fee document may be
    # in the sources OR in the prompt that reaches the model.
    FakeLLM.calls.clear()
    ev = ask(admin, "How are school fees paid at the bank?")
    meta = next(d for e, d in ev if e == "meta")
    assert meta["denied"] == "login" and meta["sources"] == [] and "inspector" not in meta
    sent = json.dumps(FakeLLM.calls)
    assert "bursar" not in sent and "stamped" not in sent
    assert "restricted" in FakeLLM.calls[0]["system"] and "CONTEXT" not in FakeLLM.calls[0]["system"]


def test_student_sees_student_but_not_staff(client):
    admin_c = client
    sign_in(admin_c, "admin@school.org", "AdminPass123")
    seed(admin_c)
    make_user(client, email="amina@school.org", role="student")
    sign_in(client, "amina@school.org", "password123")

    found = sources(ask(client, "How are school fees paid at the bank?"))
    assert found[0] == "Fee Payment" and "Staff Leave" not in found  # best match first; nothing above the student level
    meta = next(d for e, d in ask(client, "How do staff request leave with the leave form?") if e == "meta")
    assert meta["denied"] == "role" and meta["sources"] == []


def test_staff_sees_staff_and_below(client):
    sign_in(client, "admin@school.org", "AdminPass123")
    seed(client)
    make_user(client, email="pat@school.org", role="staff")
    sign_in(client, "pat@school.org", "password123")
    assert sources(ask(client, "How do staff request leave with the leave form?"))[0] == "Staff Leave"
    assert sources(ask(client, "How are school fees paid at the bank?"))[0] == "Fee Payment"


def test_inspector_is_admin_only(admin):
    seed(admin)
    sign_in(admin, "admin@school.org", "AdminPass123")
    meta = next(d for e, d in ask(admin, "When is parents day?") if e == "meta")
    assert meta["inspector"]["method"] == "scan" and meta["inspector"]["retrieved"]
    done = next(d for e, d in ask(admin, "When is parents day?") if e == "done")
    assert done["provider"] == "fake/test"

    admin.post("/api/auth/logout")
    done = next(d for e, d in ask(admin, "When is parents day?") if e == "done")
    assert done["provider"] is None  # guests never learn which model/provider is used


def test_changing_access_hides_it_immediately_without_reembedding(admin):
    doc = add_entry(admin, "Parents Day", PUBLIC, "public")
    admin.post("/api/auth/logout")
    assert sources(ask(admin, "When is parents day?")) == ["Parents Day"]

    sign_in(admin, "admin@school.org", "AdminPass123")
    assert admin.patch(f"/api/admin/documents/{doc['id']}", json={"access": "staff"}).status_code == 200
    admin.post("/api/auth/logout")
    meta = next(d for e, d in ask(admin, "When is parents day?") if e == "meta")
    assert meta["sources"] == [] and meta["denied"] == "login"


def test_history_is_forwarded_and_limited(admin):
    seed(admin)
    history = [{"role": "user", "text": f"q{i}"} for i in range(8)]
    ask(admin, "When is parents day?", history)
    assert len(FakeLLM.calls[-1]["messages"]) == 7  # last 6 + the new question


def test_upload_json_txt_and_rejections(admin):
    entries = [{"title": "Hours", "content": "Lessons run from half past seven to four.", "access": "public"},
               {"title": "Budget", "content": "Budget requests go to the bursar.", "access": "staff"}]
    files = [("files", ("kb.json", json.dumps(entries).encode(), "application/json")),
             ("files", ("notes.txt", b"Uniform is a white shirt and navy shorts.", "text/plain")),
             ("files", ("virus.exe", b"MZ", "application/octet-stream")),
             ("files", ("bad.json", b"{not json", "application/json"))]
    r = admin.post("/api/admin/documents", files=files, data={"access": "student"})
    assert r.status_code == 201
    body = r.json()
    assert [d["title"] for d in body["documents"]] == ["Hours", "Budget", "Notes"]
    assert {d["access"] for d in body["documents"]} == {"public", "staff", "student"}
    assert all(d["status"] == "ready" and d["chunks"] >= 1 for d in body["documents"])
    assert sorted(e["file"] for e in body["errors"]) == ["bad.json", "virus.exe"]

    only_bad = admin.post("/api/admin/documents", files=[files[2]])
    assert only_bad.status_code == 422


def test_delete_removes_chunks_and_edit_reindexes(admin):
    doc = add_entry(admin, "Parents Day", PUBLIC, "public")
    assert admin.database.chunks.count_documents({}) == 1
    r = admin.patch(f"/api/admin/documents/{doc['id']}", json={"content": "Parents day moved to the first Friday of term."})
    assert r.status_code == 200 and "first Friday" in admin.database.chunks.find_one()["text"]
    assert admin.delete(f"/api/admin/documents/{doc['id']}").status_code == 200
    assert admin.database.chunks.count_documents({}) == 0 and admin.database.documents.count_documents({}) == 0


def test_llm_failure_is_reported_as_an_error_event(admin, monkeypatch):
    seed(admin)

    class Broken(FakeLLM):
        @staticmethod
        async def stream(system, messages):
            from backend.llm.base import LLMError
            raise LLMError("boom", 429)
            yield  # pragma: no cover

    monkeypatch.setattr("backend.llm.router.providers", lambda: [Broken])
    ev = ask(admin, "When is parents day?")
    assert ev[-1] == ("error", {"code": "llm_unavailable"})


def test_fallback_to_second_provider(admin, monkeypatch):
    seed(admin)

    class Broken(FakeLLM):
        NAME = "broken"

        @staticmethod
        async def stream(system, messages):
            from backend.llm.base import LLMError
            raise LLMError("rate limited", 429)
            yield  # pragma: no cover

    monkeypatch.setattr("backend.llm.router.providers", lambda: [Broken, FakeLLM])
    sign_in(admin, "admin@school.org", "AdminPass123")
    ev = ask(admin, "When is parents day?")
    assert "".join(d["t"] for e, d in ev if e == "token") == "Hello from the model."
    assert next(d for e, d in ev if e == "done")["provider"] == "fake/test"
