"""Try providers in LLM_ORDER; if one fails BEFORE producing text, use the next.

Once text has started streaming we can't switch models mid-answer, so a failure
after that point is reported to the user as an error.
"""
from collections.abc import AsyncIterator

from ..config import settings
from . import gemini, groq
from .base import LLMError

BY_NAME = {"gemini": gemini, "groq": groq}


def providers() -> list:
    return [BY_NAME[n] for n in settings.llm_order if n in BY_NAME]


async def stream_answer(system: str, messages: list[dict]) -> AsyncIterator[tuple[str, str]]:
    """Yields ("provider", "gemini/model") once, then ("token", text) pieces."""
    last_error: Exception | None = None
    for provider in providers():
        if not provider.available():
            continue
        started = False
        try:
            async for model, text in provider.stream(system, messages):
                if not started:
                    started = True
                    yield "provider", f"{provider.NAME}/{model}"
                yield "token", text
            if started:
                return
            last_error = LLMError(f"{provider.NAME} returned no text")
        except LLMError as exc:
            if started:
                raise
            last_error = exc
    raise LLMError(str(last_error) if last_error else "No language model is configured")
