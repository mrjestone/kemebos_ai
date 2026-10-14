"""Gemini chat, streamed with server-sent events.

Tries each configured model in order. A model that is overloaded or rate limited
is skipped for a short while (see health.py) so later questions don't wait on it.
"""
import json
from collections.abc import AsyncIterator

import httpx

from ..config import settings
from . import health
from .base import LLMError, first_item_deadline

BASE = "https://generativelanguage.googleapis.com/v1beta"
NAME = "gemini"
SKIPPABLE = {None, 404, 429, 500, 502, 503, 504}  # try the next model on these


def available() -> bool:
    return bool(settings.gemini_api_key) and "FAKE" not in settings.gemini_api_key


def _body(system: str, messages: list[dict], thinking: bool) -> dict:
    config = {"temperature": 0.3, "maxOutputTokens": 1024}
    if thinking and settings.gemini_thinking:
        config["thinkingConfig"] = {"thinkingLevel": settings.gemini_thinking}
    return {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [
            {"role": "user" if m["role"] == "user" else "model", "parts": [{"text": m["text"]}]}
            for m in messages
        ],
        "generationConfig": config,
    }


async def _stream_one(model: str, system: str, messages: list[dict]) -> AsyncIterator[str]:
    url = f"{BASE}/models/{model}:streamGenerateContent?alt=sse"
    timeout = httpx.Timeout(connect=8, read=15, write=10, pool=10)
    headers = {"x-goog-api-key": settings.gemini_api_key}
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            for thinking in (True, False):  # some models reject thinkingConfig: retry once without
                async with client.stream("POST", url, json=_body(system, messages, thinking), headers=headers) as r:
                    if r.status_code == 400 and thinking and settings.gemini_thinking:
                        await r.aread()
                        continue
                    if r.status_code != 200:
                        await r.aread()
                        raise LLMError(f"Gemini {model} returned {r.status_code}", r.status_code)
                    async for line in r.aiter_lines():
                        if not line.startswith("data:"):
                            continue
                        chunk = json.loads(line[5:].strip() or "{}")
                        for cand in chunk.get("candidates", []):
                            for part in cand.get("content", {}).get("parts", []):
                                if part.get("text") and not part.get("thought"):
                                    yield part["text"]
                    return
    except httpx.HTTPError as exc:
        raise LLMError(f"Gemini {model} unreachable: {exc.__class__.__name__}") from exc


def model_name() -> str:
    return settings.gemini_chat_models[0] if settings.gemini_chat_models else ""


async def stream(system: str, messages: list[dict]) -> AsyncIterator[tuple[str, str]]:
    """Yields (model, text) pieces."""
    last: LLMError | None = None
    for model in settings.gemini_chat_models:
        key = f"gemini/{model}"
        if health.is_down(key):
            continue
        started = False
        try:
            async for text in first_item_deadline(_stream_one(model, system, messages), settings.first_token_seconds):
                started = True
                yield model, text
            if started:
                return
            last = LLMError(f"Gemini {model} returned no text")
            health.mark_down(key)
        except LLMError as exc:
            if started or exc.status not in SKIPPABLE:
                raise
            health.mark_down(key)
            last = exc
    raise last or LLMError("No Gemini model is available")
