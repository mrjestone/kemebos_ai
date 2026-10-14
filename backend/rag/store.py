"""Access-filtered similarity search over the `chunks` collection.

Primary path: MongoDB Atlas Vector Search ($vectorSearch) with the access filter
applied INSIDE the search, so chunks a user may not read are never candidates.
Fallback path: if the Atlas index isn't ready, compare vectors in Python. The
corpus is small (hundreds of chunks), so this is fast enough and keeps the app working.
"""
from pymongo.database import Database

VECTOR_INDEX = "chunks_vector"


def vector_index_definition(dims: int) -> dict:
    """Paste this into Atlas > Search & Vector Search > chunks > JSON editor."""
    return {
        "fields": [
            {"type": "vector", "path": "embedding", "numDimensions": dims, "similarity": "cosine"},
            {"type": "filter", "path": "access"},
        ]
    }


def _cosine(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b))  # vectors are unit length


def cosine_from_atlas(score: float) -> float:
    """Atlas reports cosine similarity as (1 + cos) / 2. Convert back so thresholds and the
    admin inspector use one scale for both search paths."""
    return 2 * score - 1


def _hit(c: dict, score: float) -> dict:
    return {
        "chunkId": str(c["_id"]),
        "docId": str(c["docId"]),
        "title": c["title"],
        "text": c["text"],
        "access": c["access"],
        "score": round(float(score), 4),
    }


def _atlas(db: Database, vec: list[float], levels: list[str], k: int) -> list[dict]:
    pipeline = [
        {"$vectorSearch": {
            "index": VECTOR_INDEX, "path": "embedding", "queryVector": vec,
            "numCandidates": max(50, k * 10), "limit": k,
            "filter": {"access": {"$in": levels}},
        }},
        {"$project": {"docId": 1, "title": 1, "text": 1, "access": 1, "score": {"$meta": "vectorSearchScore"}}},
    ]
    return [_hit(c, cosine_from_atlas(c["score"])) for c in db.chunks.aggregate(pipeline)]


def _scan(db: Database, vec: list[float], levels: list[str], k: int) -> list[dict]:
    scored = [
        _hit(c, _cosine(vec, c["embedding"]))
        for c in db.chunks.find({"access": {"$in": levels}})
    ]
    return sorted(scored, key=lambda h: h["score"], reverse=True)[:k]


def search(db: Database, vec: list[float], levels: list[str], k: int) -> tuple[list[dict], str]:
    """Returns (hits, method) where method is "atlas" or "scan"."""
    if not levels:
        return [], "none"
    try:
        hits = _atlas(db, vec, levels, k)
        if hits:
            return hits, "atlas"
    except Exception:  # index missing/building, or a non-Atlas database
        pass
    return _scan(db, vec, levels, k), "scan"
