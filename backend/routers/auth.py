"""Sign up, sign in, sign out. New accounts start as `pending` until an admin approves."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response
from pymongo.errors import DuplicateKeyError

from ..deps import current_user, db, public_user
from ..schemas import LoginIn, SignupIn
from ..security import COOKIE, cookie_args, create_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Compared against when the email is unknown, so response time doesn't reveal
# whether an account exists.
_DUMMY_HASH = hash_password("not-a-real-password")


@router.post("/signup", status_code=201)
def signup(body: SignupIn, database=Depends(db)):
    try:
        database.users.insert_one({
            "name": body.name.strip(),
            "email": body.email.lower(),
            "passwordHash": hash_password(body.password),
            "role": body.role,  # the role they ask for; the admin confirms it
            "status": "pending",
            "createdAt": datetime.now(timezone.utc),
        })
    except DuplicateKeyError:
        raise HTTPException(409, {"code": "email_taken"})
    return {"status": "pending"}


@router.post("/login")
def login(body: LoginIn, response: Response, database=Depends(db)):
    user = database.users.find_one({"email": body.email.lower()})
    ok = verify_password(body.password, user["passwordHash"] if user else _DUMMY_HASH)
    if not user or not ok:
        raise HTTPException(401, {"code": "invalid"})
    if user["status"] == "pending":
        raise HTTPException(403, {"code": "pending"})
    if user["status"] != "approved":
        raise HTTPException(403, {"code": "blocked"})
    response.set_cookie(value=create_token(str(user["_id"])), **cookie_args())
    return {"user": public_user(user)}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(COOKIE, path="/")
    return {"ok": True}


@router.get("/me")
def me(user=Depends(current_user)):
    """Guests get {"user": null}; the page uses this on load to know who is signed in."""
    return {"user": public_user(user) if user else None}
