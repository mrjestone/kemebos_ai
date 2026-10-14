"""POST /api/chat: retrieve permitted context, then stream the model's answer (SSE)."""
import json
import time

from fastapi import APIRouter, Depends
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import StreamingResponse

from ..deps import current_user, db
from ..llm.base import LLMError
from ..llm.router import stream_answer
from ..rag.embeddings import EmbeddingError
from ..rag.prompt import build_messages, build_system
from ..rag.retrieve import retrieve
from ..schemas import ChatIn

router = APIRouter(prefix="/api/chat", tags=["chat"])


def sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def _source(h: dict) -> dict:
    return {"id": h["docId"], "title": h["title"], "access": h["access"], "score": h["score"]}


@router.post("")
async def chat(body: ChatIn, user=Depends(current_user), database=Depends(db)):
    role = user["role"] if user else "guest"
    history = [h.model_dump() for h in body.history]

    async def events():
        started = time.perf_counter()
        try:
            found = await run_in_threadpool(retrieve, database, body.message, history, role)
        except EmbeddingError:
            yield sse("error", {"code": "search_unavailable"})
            return
        except Exception:
            yield sse("error", {"code": "server_error"})
            return

        denied = ("login" if role == "guest" else "role") if found["denied"] else None
        sources = [_source(h) for h in found["hits"]] if role == "admin" and not denied else []  # only the admin inspector sees sources
        meta = {"sources": sources, "denied": denied or False}
        if role == "admin":  # the RAG inspector is admin-only, decided on the server
            meta["inspector"] = {
                "method": found["method"],
                "retrieved": [{**_source(h), "preview": h["text"][:160]} for h in found["all_hits"]],
                "blocked": {"title": found["blocked"]["title"], "access": found["blocked"]["access"],
                            "score": found["blocked"]["score"]} if found["blocked"] else None,
                "searchMs": round((time.perf_counter() - started) * 1000),
            }
        yield sse("meta", meta)

        system = build_system([] if denied else found["hits"], denied)
        messages = build_messages(history, body.message)
        provider = None
        try:
            async for kind, value in stream_answer(system, messages):
                if kind == "provider":
                    provider = value
                else:
                    yield sse("token", {"t": value})
        except LLMError:
            yield sse("error", {"code": "llm_unavailable"})
            return
        yield sse("done", {"provider": provider if role == "admin" else None,
                           "totalMs": round((time.perf_counter() - started) * 1000)})

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"},
    )
