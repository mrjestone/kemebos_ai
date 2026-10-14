"""Request bodies (Pydantic validates every field before our code runs)."""
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

Access = Literal["public", "student", "staff", "admin"]


class SignupIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    role: Literal["student", "staff"]
    password: str = Field(min_length=8, max_length=128)


class LoginIn(BaseModel):
    # A plain string on purpose: login only looks the account up. Strict email
    # validation belongs to sign-up (an admin created from ADMIN_EMAIL must still log in).
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=128)


class ApproveIn(BaseModel):
    role: Literal["student", "staff", "admin"]


class UserPatch(BaseModel):
    role: Literal["student", "staff", "admin"] | None = None
    status: Literal["approved", "suspended", "pending", "rejected"] | None = None  # pending/rejected let the admin UI "Undo"


class EntryIn(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    content: str = Field(min_length=1, max_length=50_000)
    access: Access


class DocPatch(BaseModel):
    access: Access | None = None
    title: str | None = Field(default=None, min_length=1, max_length=160)
    content: str | None = Field(default=None, min_length=1, max_length=50_000)


class HistoryItem(BaseModel):
    role: Literal["user", "assistant"]
    text: str = Field(max_length=4000)


class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    history: list[HistoryItem] = Field(default_factory=list, max_length=12)
