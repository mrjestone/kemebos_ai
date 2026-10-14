"""Question -> relevant, permitted context.

Two searches per question:
  1. over levels the caller MAY read  -> context for the model
  2. over levels the caller may NOT read -> only to notice "this exists but is
     restricted" (its text never goes to the model or the browser)
"""
from ..access import allowed_levels, blocked_levels
from ..config import settings
from . import store
from .embeddings import embed_query


def build_query(message: str, history: list[dict]) -> str:
    """Short follow-ups ("and for boarders?") lack context, so add the previous question."""
    previous = [h["text"] for h in history if h["role"] == "user"]
    if previous and len(message) < 60:
        return f"{previous[-1]} {message}"
    return message


def retrieve(database, message: str, history: list[dict], role: str) -> dict:
    vec = embed_query(build_query(message, history))
    hits, method = store.search(database, vec, allowed_levels(role), settings.top_k)
    top = hits[0]["score"] if hits else 0.0
    relevant = [h for h in hits if h["score"] >= settings.min_score and h["score"] >= top - settings.rel_margin]

    blocked_hits, _ = store.search(database, vec, blocked_levels(role), 1)
    blocked = blocked_hits[0] if blocked_hits and blocked_hits[0]["score"] >= settings.min_score else None
    # Restricted only if the best restricted match clearly beats everything the caller can see.
    denied = bool(blocked) and blocked["score"] > top + settings.denied_margin

    return {"hits": relevant, "all_hits": hits, "blocked": blocked, "denied": denied, "method": method}
