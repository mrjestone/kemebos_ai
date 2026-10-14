import asyncio

import pytest

from backend.llm import gemini, health
from backend.llm.base import LLMError, first_item_deadline
from backend.config import settings


async def collect(agen):
    return [x async for x in agen]


def test_deadline_passes_items_and_times_out():
    async def fast():
        yield "a"
        yield "b"

    async def slow():
        await asyncio.sleep(1)
        yield "late"

    assert asyncio.run(collect(first_item_deadline(fast(), 1))) == ["a", "b"]
    with pytest.raises(LLMError):
        asyncio.run(collect(first_item_deadline(slow(), 0.05)))


def test_gemini_skips_a_failing_model_and_remembers_it(monkeypatch):
    health.reset()
    monkeypatch.setattr(settings, "gemini_chat_models", ["bad-model", "good-model"])
    calls = []

    async def fake_one(model, system, messages):
        calls.append(model)
        if model == "bad-model":
            raise LLMError("overloaded", 503)
        yield "ok"

    monkeypatch.setattr(gemini, "_stream_one", fake_one)

    async def run():
        return [x async for x in gemini.stream("sys", [{"role": "user", "text": "hi"}])]

    assert asyncio.run(run()) == [("good-model", "ok")]
    assert calls == ["bad-model", "good-model"]
    calls.clear()
    asyncio.run(run())
    assert calls == ["good-model"]  # the bad model is skipped while cooling down
    health.reset()


def test_gemini_does_not_skip_on_auth_errors(monkeypatch):
    health.reset()
    monkeypatch.setattr(settings, "gemini_chat_models", ["m1", "m2"])

    async def fake_one(model, system, messages):
        raise LLMError("bad key", 403)
        yield

    monkeypatch.setattr(gemini, "_stream_one", fake_one)
    with pytest.raises(LLMError):
        asyncio.run(collect(gemini.stream("sys", [])))
    health.reset()
