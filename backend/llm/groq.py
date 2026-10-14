"""Groq chat (OpenAI-compatible API), streamed with server-sent events."""
import json
from collections.abc import AsyncIterator

import httpx

from ..config import settings
from . import health
from .base import LLMError, first_item_deadline

URL = "https://api.groq.com/openai/v1/chat/completions"
NAME = "groq"


def available() -> bool:
    return bool(settings.groq_api_key) and "FAKE" not in settings.groq_api_key


async def stream(system: str, messages: list[dict]) -> AsyncIterator[tuple[str, str]]:
    """Yields (model, text) pieces."""
    key = f"groq/{settings.groq_chat_model}"
    if health.is_down(key):
        raise LLMError("Groq is cooling down after a recent failure")
    try:
        async for text in first_item_deadline(_stream(system, messages), settings.first_token_seconds + 3):
            yield settings.groq_chat_model, text
    except LLMError:
        health.mark_down(key)
        raise


async def _stream(system: str, messages: list[dict]) -> AsyncIterator[str]:
    body = {
        "model": settings.groq_chat_model,
        "stream": True,
        "temperature": 0.3,
        "max_tokens": 1024,
        "messages": [{"role": "system", "content": system}]
        + [{"role": m["role"], "content": m["text"]} for m in messages],
    }
    timeout = httpx.Timeout(connect=10, read=15, write=10, pool=10)
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            async with client.stream("POST", URL, json=body, headers={"Authorization": f"Bearer {settings.groq_api_key}"}) as r:
                if r.status_code != 200:
                    await r.aread()
                    raise LLMError(f"Groq returned {r.status_code}", r.status_code)
                async for line in r.aiter_lines():
                    if not line.startswith("data:"):
                        continue
                    payload = line[5:].strip()
                    if payload == "[DONE]":
                        return
                    for choice in json.loads(payload).get("choices", []):
                        text = choice.get("delta", {}).get("content")
                        if text:
                            yield text
    except httpx.HTTPError as exc:
        raise LLMError(f"Groq unreachable: {exc.__class__.__name__}") from exc
