"""Admin: approve people, change roles, suspend, reset passwords."""
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException

from ..deps import db, public_user, require_admin
from ..schemas import ApproveIn, UserPatch
from ..security import hash_password, temp_password

router = APIRouter(prefix="/api/admin/users", tags=["admin: users"])


def _target(database, user_id: str, admin: dict) -> dict:
    try:
        user = database.users.find_one({"_id": ObjectId(user_id)})
    except InvalidId:
        user = None
    if not user:
        raise HTTPException(404, "User not found")
    if user["_id"] == admin["_id"]:
        raise HTTPException(400, "You can't change your own account here")
    return user


def _update(database, user: dict, changes: dict) -> dict:
    database.users.update_one({"_id": user["_id"]}, {"$set": changes})
    return public_user({**user, **changes})


@router.get("")
def list_users(_=Depends(require_admin), database=Depends(db)):
    users = database.users.find().sort("createdAt", -1)
    return {"users": [public_user(u) for u in users]}


@router.post("/{user_id}/approve")
def approve(user_id: str, body: ApproveIn, admin=Depends(require_admin), database=Depends(db)):
    user = _target(database, user_id, admin)
    return {"user": _update(database, user, {"status": "approved", "role": body.role})}


@router.post("/{user_id}/reject")
def reject(user_id: str, admin=Depends(require_admin), database=Depends(db)):
    user = _target(database, user_id, admin)
    return {"user": _update(database, user, {"status": "rejected"})}


@router.patch("/{user_id}")
def patch(user_id: str, body: UserPatch, admin=Depends(require_admin), database=Depends(db)):
    user = _target(database, user_id, admin)
    changes = body.model_dump(exclude_none=True)
    if not changes:
        raise HTTPException(400, "Nothing to change")
    return {"user": _update(database, user, changes)}


@router.post("/{user_id}/reset-password")
def reset_password(user_id: str, admin=Depends(require_admin), database=Depends(db)):
    """Sets a temporary password the admin hands to the user. Shown only once."""
    user = _target(database, user_id, admin)
    temp = temp_password()
    database.users.update_one({"_id": user["_id"]}, {"$set": {"passwordHash": hash_password(temp)}})
    return {"temporaryPassword": temp}


@router.delete("/{user_id}")
def remove(user_id: str, admin=Depends(require_admin), database=Depends(db)):
    user = _target(database, user_id, admin)
    database.users.delete_one({"_id": user["_id"]})
    return {"ok": True}
