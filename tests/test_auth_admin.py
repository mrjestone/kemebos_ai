from .conftest import make_user, sign_in


def test_signup_pending_then_approved(client):
    r = client.post("/api/auth/signup", json={"name": "Amina Juma", "email": "Amina@School.org", "role": "student", "password": "password123"})
    assert r.status_code == 201 and r.json() == {"status": "pending"}

    r = client.post("/api/auth/login", json={"email": "amina@school.org", "password": "password123"})
    assert r.status_code == 403 and r.json()["detail"]["code"] == "pending"

    make_user(client, email="bob@school.org")
    sign_in(client, "bob@school.org", "password123")
    me = client.get("/api/auth/me").json()["user"]
    assert me["role"] == "student" and me["status"] == "approved"


def test_login_errors_and_duplicates(client):
    make_user(client)
    assert client.post("/api/auth/login", json={"email": "amina@school.org", "password": "wrong-pass"}).json()["detail"]["code"] == "invalid"
    assert client.post("/api/auth/login", json={"email": "nobody@school.org", "password": "whatever1"}).status_code == 401
    r = client.post("/api/auth/signup", json={"name": "Amina Again", "email": "amina@school.org", "role": "staff", "password": "password123"})
    assert r.status_code == 409 and r.json()["detail"]["code"] == "email_taken"


def test_signup_validation(client):
    assert client.post("/api/auth/signup", json={"name": "A", "email": "not-an-email", "role": "admin", "password": "short"}).status_code == 422


def test_password_is_hashed_and_cookie_is_httponly(client):
    make_user(client)
    stored = client.database.users.find_one({"email": "amina@school.org"})
    assert stored["passwordHash"].startswith("$2") and "password123" not in str(stored)
    r = client.post("/api/auth/login", json={"email": "amina@school.org", "password": "password123"})
    assert "httponly" in r.headers["set-cookie"].lower()


def test_guest_and_student_cannot_use_admin_api(client):
    assert client.get("/api/admin/users").status_code == 401
    make_user(client)
    sign_in(client, "amina@school.org", "password123")
    assert client.get("/api/admin/users").status_code == 403
    assert client.post("/api/admin/documents/entries", json={"title": "x", "content": "y", "access": "public"}).status_code == 403


def test_admin_manages_users(admin):
    uid = make_user(admin, email="pat@school.org", role="staff", approve=False) or None
    sign_in(admin, "admin@school.org", "AdminPass123")
    users = {u["email"]: u for u in admin.get("/api/admin/users").json()["users"]}
    uid = users["pat@school.org"]["id"]
    assert users["pat@school.org"]["status"] == "pending"

    assert admin.post(f"/api/admin/users/{uid}/approve", json={"role": "staff"}).json()["user"]["role"] == "staff"
    assert admin.patch(f"/api/admin/users/{uid}", json={"status": "suspended"}).json()["user"]["status"] == "suspended"

    # cannot change own account
    me = users["admin@school.org"]["id"]
    assert admin.patch(f"/api/admin/users/{me}", json={"status": "suspended"}).status_code == 400


def test_suspension_takes_effect_immediately(client):
    uid = make_user(client)
    sign_in(client, "amina@school.org", "password123")
    assert client.get("/api/auth/me").json()["user"]["email"] == "amina@school.org"
    # admin suspends her in the database; her existing cookie must stop working
    from bson import ObjectId
    client.database.users.update_one({"_id": ObjectId(uid)}, {"$set": {"status": "suspended"}})
    assert client.get("/api/auth/me").json()["user"] is None


def test_admin_reset_password(admin):
    uid = make_user(admin, email="reset@school.org", approve=True)
    sign_in(admin, "admin@school.org", "AdminPass123")
    temp = admin.post(f"/api/admin/users/{uid}/reset-password").json()["temporaryPassword"]
    admin.post("/api/auth/logout")
    assert admin.post("/api/auth/login", json={"email": "reset@school.org", "password": "password123"}).status_code == 401
    assert admin.post("/api/auth/login", json={"email": "reset@school.org", "password": temp}).status_code == 200


def test_health_and_warmup(client, monkeypatch):
    assert client.get("/api/health").json() == {"ok": True}
    monkeypatch.setattr("backend.main.embeddings.warm", lambda: None)
    monkeypatch.setattr("backend.main._last_warm", 0.0)
    assert client.get("/api/warmup").json() == {"warm": True}
    assert client.get("/api/warmup").json()["skipped"] is True  # throttled


def test_database_outage_returns_clean_503(client, monkeypatch):
    from pymongo.errors import ServerSelectionTimeoutError

    def down(_):
        raise ServerSelectionTimeoutError("SSL handshake failed")

    monkeypatch.setattr("backend.deps.ensure_indexes", down)
    r = client.post("/api/auth/login", json={"email": "a@b.org", "password": "x"})
    assert r.status_code == 503 and r.json()["detail"] == {"code": "db_unavailable"}

    monkeypatch.setattr("backend.main.get_db", lambda: (_ for _ in ()).throw(ServerSelectionTimeoutError("x")))
    r = client.get("/api/health/db")
    assert r.status_code == 503 and r.json() == {"ok": False, "error": "ServerSelectionTimeoutError"}
