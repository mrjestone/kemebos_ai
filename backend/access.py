"""Access control: which document levels each role may read.

Levels are ordered public < student < staff < admin. A role can read its own
level and everything below it. Guests (not signed in) only see public content.
"""

LEVELS = ["public", "student", "staff", "admin"]
ROLES = ["guest", "student", "staff", "admin"]

_ALLOWED = {
    "guest": ["public"],
    "student": ["public", "student"],
    "staff": ["public", "student", "staff"],
    "admin": ["public", "student", "staff", "admin"],
}


def allowed_levels(role: str) -> list[str]:
    return list(_ALLOWED.get(role, _ALLOWED["guest"]))


def blocked_levels(role: str) -> list[str]:
    allowed = set(allowed_levels(role))
    return [lvl for lvl in LEVELS if lvl not in allowed]
