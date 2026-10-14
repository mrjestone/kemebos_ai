"""Text -> vector with the Gemini embedding model (free tier)."""
import math
import time
from functools import lru_cache

import httpx

from ..config import settings

BASE = "https://generativelanguage.googleapis.com/v1beta"
BATCH = 50


class EmbeddingError(RuntimeError):
    pass


def _normalize(vec: list[float]) -> list[float]:
    # Reduced-size embeddings must be re-normalised for cosine similarity.
    norm = math.sqrt(sum(x * x for x in vec)) or 1.0
    return [x / norm for x in vec]


_client: httpx.Client | None = None


def _http() -> httpx.Client:
    """One shared client keeps the HTTPS connection open between requests (saves ~0.3 s each)."""
    global _client
    if _client is None:
        _client = httpx.Client(timeout=httpx.Timeout(20, connect=8))
    return _client


def _post(path: str, body: dict) -> dict:
    if not settings.gemini_api_key or "FAKE" in settings.gemini_api_key:
        raise EmbeddingError("GEMINI_API_KEY is not configured")
    for attempt in range(3):
        try:
            r = _http().post(f"{BASE}/{path}", json=body, headers={"x-goog-api-key": settings.gemini_api_key})
        except httpx.HTTPError as exc:  # timeout / connection reset: retry before giving up
            if attempt < 2:
                time.sleep(1.5)
                continue
            raise EmbeddingError(f"Embedding service unreachable: {exc.__class__.__name__}") from exc
        if r.status_code == 429 and attempt < 2:  # rate limited: wait and retry
            time.sleep(2 * (attempt + 1))
            continue
        if r.status_code != 200:
            raise EmbeddingError(f"Embedding failed ({r.status_code})")
        return r.json()
    raise EmbeddingError("Embedding rate limit reached")


def _item(text: str, task: str) -> dict:
    return {
        "model": f"models/{settings.gemini_embed_model}",
        "content": {"parts": [{"text": text}]},
        "taskType": task,
        "outputDimensionality": settings.embed_dims,
    }


def embed_documents(texts: list[str]) -> list[list[float]]:
    out: list[list[float]] = []
    for i in range(0, len(texts), BATCH):
        batch = texts[i : i + BATCH]
        data = _post(f"models/{settings.gemini_embed_model}:batchEmbedContents",
                     {"requests": [_item(t, "RETRIEVAL_DOCUMENT") for t in batch]})
        out.extend(_normalize(e["values"]) for e in data["embeddings"])
    return out


@lru_cache(maxsize=256)
def _embed_query_cached(text: str) -> tuple[float, ...]:
    data = _post(f"models/{settings.gemini_embed_model}:embedContent", _item(text, "RETRIEVAL_QUERY"))
    return tuple(_normalize(data["embedding"]["values"]))


def embed_query(text: str) -> list[float]:
    """Cached: the same question (e.g. a suggestion chip) never costs a second API call."""
    return list(_embed_query_cached(text.strip()))


def warm() -> None:
    """Open the HTTPS connection to Google (a metadata call: no generation or embedding quota)."""
    if settings.gemini_api_key and "FAKE" not in settings.gemini_api_key:
        _http().get(f"{BASE}/models/{settings.gemini_embed_model}", headers={"x-goog-api-key": settings.gemini_api_key})
