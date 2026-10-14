import asyncio
from collections.abc import AsyncIterator
from typing import TypeVar

T = TypeVar("T")


class LLMError(RuntimeError):
    """A provider failed (rate limit, outage, bad key). `status` is the HTTP code if known."""

    def __init__(self, message: str, status: int | None = None):
        super().__init__(message)
        self.status = status


async def first_item_deadline(stream: AsyncIterator[T], seconds: float) -> AsyncIterator[T]:
    """Pass items through, but give up if the FIRST item takes longer than `seconds`.
    A slow model is treated like a failed one so the next model can answer instead."""
    iterator = stream.__aiter__()
    try:
        first = await asyncio.wait_for(iterator.__anext__(), seconds)
    except StopAsyncIteration:
        return
    except asyncio.TimeoutError as exc:
        await iterator.aclose()
        raise LLMError("No response within the time limit", None) from exc
    yield first
    async for item in iterator:
        yield item
