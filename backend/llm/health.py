"""Remember which models just failed, so the next question doesn't wait on them again."""
import time

COOLDOWN = 45  # seconds
_down: dict[str, float] = {}


def is_down(key: str) -> bool:
    return _down.get(key, 0) > time.monotonic()


def mark_down(key: str, seconds: float = COOLDOWN) -> None:
    _down[key] = time.monotonic() + seconds


def reset() -> None:
    _down.clear()
