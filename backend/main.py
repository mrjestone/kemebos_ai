"""FastAPI application. On Vercel it is exposed through api/index.py."""
import time

from fastapi import FastAPI
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse

from .db import get_db
from .rag import embeddings
from .routers import admin_docs, admin_users, auth, chat

app = FastAPI(
    title="Kaizerege & Kemebos AI Assistant API",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    redoc_url=None,
)

app.include_router(auth.router)
app.include_router(admin_users.router)
app.include_router(admin_docs.router)
app.include_router(chat.router)


@app.get("/api/health", tags=["system"])
def health():
    return {"ok": True}


@app.get("/api/health/db", tags=["system"])
def health_db():
    """Open this in a browser to test the database connection. Shows the error TYPE only (no secrets)."""
    try:
        get_db().command("ping")
        return {"ok": True}
    except Exception as exc:
        return JSONResponse({"ok": False, "error": exc.__class__.__name__}, status_code=503)


_last_warm = 0.0


@app.get("/api/warmup", tags=["system"])
async def warmup():
    """Called when the chat page opens. Opens the database connection and the HTTPS
    connection to Google now, so the first real question doesn't pay for them.
    Uses no model quota. Skipped if it ran in the last minute."""
    global _last_warm
    if time.monotonic() - _last_warm < 60:
        return {"warm": True, "skipped": True}

    def work():
        get_db().command("ping")
        embeddings.warm()

    try:
        await run_in_threadpool(work)
    except Exception:
        return {"warm": False}
    _last_warm = time.monotonic()
    return {"warm": True}
