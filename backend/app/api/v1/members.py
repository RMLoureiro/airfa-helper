from fastapi import APIRouter, Depends, HTTPException

from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.deps.auth import get_current_user, get_db, require_roles
from app.models.enums import SystemRole
from app.models.user import User
from app.schemas.user import PasswordChangeRequest, UserRead, UserSelfUpdate

router = APIRouter(prefix="/members", tags=["members"])


@router.get("/me", response_model=UserRead)
def read_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserRead)
def update_me(
    payload: UserSelfUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.name is not None:
        current_user.name = payload.name
    if payload.phone is not None:
        current_user.phone = payload.phone
    if payload.birth_date is not None:
        current_user.birth_date = payload.birth_date
    if payload.address is not None:
        current_user.address = payload.address

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.put("/me/password")
def change_my_password(
    payload: PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="A password deve ter pelo menos 8 caracteres")

    current_user.hashed_password = get_password_hash(payload.new_password)
    db.add(current_user)
    db.commit()
    return {"ok": True}


@router.get("", response_model=list[UserRead])
def list_members(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SystemRole.ADMIN, SystemRole.SUPER_ADMIN)),
):
    return db.query(User).order_by(User.name.asc()).all()
