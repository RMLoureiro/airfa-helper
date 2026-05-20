from fastapi import APIRouter, Depends, HTTPException

from sqlalchemy.orm import Session

from app.core.security import get_password_hash, verify_password
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
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="A password atual está incorreta")

    if len(payload.new_password) < 12:
        raise HTTPException(status_code=400, detail="A nova password deve ter pelo menos 12 caracteres")

    current_user.hashed_password = get_password_hash(payload.new_password)
    db.add(current_user)
    db.commit()
    return {"ok": True}


@router.get("/", response_model=list[UserRead])
def list_members(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SystemRole.ADMIN, SystemRole.SUPER_ADMIN)),
):
    return db.query(User).all()


@router.post("/", response_model=UserRead)
def create_member(
    payload: UserAdminCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SystemRole.ADMIN, SystemRole.SUPER_ADMIN)),
):
    data = payload.model_dump()
    raw_password = data.pop("password")
    new_user = User(**data, hashed_password=get_password_hash(raw_password))
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.put("/{member_id}", response_model=UserRead)
def update_member(
    member_id: int,
    payload: UserAdminUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SystemRole.ADMIN, SystemRole.SUPER_ADMIN)),
):
    member = db.query(User).filter(User.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    updates = payload.model_dump(exclude_unset=True)
    if "password" in updates:
        member.hashed_password = get_password_hash(updates.pop("password"))

    for key, value in updates.items():
        setattr(member, key, value)

    db.commit()
    db.refresh(member)
    return member


@router.delete("/{member_id}")
def delete_member(
    member_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SystemRole.ADMIN, SystemRole.SUPER_ADMIN)),
):
    member = db.query(User).filter(User.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    db.delete(member)
    db.commit()
    return {"detail": "Member deleted successfully"}
