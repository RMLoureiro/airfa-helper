from fastapi import APIRouter, Depends, HTTPException

from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.deps.auth import get_current_user, get_db, require_roles
from app.models.enums import SystemRole
from app.models.user import User
from app.schemas.user import (
    PasswordChangeRequest,
    UserAdminCreate,
    UserAdminUpdate,
    UserRead,
    UserSelfUpdate,
)

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


@router.get("/", response_model=list[UserRead])
def list_members(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([SystemRole.ADMIN, SystemRole.SUPER_ADMIN])),
):
    return db.query(User).all()


@router.post("/", response_model=UserRead)
def create_member(
    payload: UserAdminCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([SystemRole.ADMIN, SystemRole.SUPER_ADMIN])),
):
    new_user = User(**payload.dict())
    new_user.password = get_password_hash(payload.password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.put("/{member_id}", response_model=UserRead)
def update_member(
    member_id: int,
    payload: UserAdminUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([SystemRole.ADMIN, SystemRole.SUPER_ADMIN])),
):
    member = db.query(User).filter(User.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    for key, value in payload.dict(exclude_unset=True).items():
        setattr(member, key, value)

    db.commit()
    db.refresh(member)
    return member


@router.delete("/{member_id}")
def delete_member(
    member_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([SystemRole.ADMIN, SystemRole.SUPER_ADMIN])),
):
    member = db.query(User).filter(User.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    db.delete(member)
    db.commit()
    return {"detail": "Member deleted successfully"}
