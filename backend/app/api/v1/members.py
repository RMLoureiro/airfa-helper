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


@router.get("", response_model=list[UserRead])
def list_members(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SystemRole.ADMIN, SystemRole.SUPER_ADMIN)),
):
    return db.query(User).order_by(User.name.asc()).all()


@router.post("", response_model=UserRead)
def create_member(
    payload: UserAdminCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SystemRole.SUPER_ADMIN)),
):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Já existe um membro com esse email")

    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="A password deve ter pelo menos 8 caracteres")

    member = User(
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        name=payload.name,
        phone=payload.phone,
        birth_date=payload.birth_date,
        address=payload.address,
        join_year=payload.join_year,
        system_role=payload.system_role,
        musical_role=payload.musical_role,
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.put("/{member_id}", response_model=UserRead)
def update_member(
    member_id: int,
    payload: UserAdminUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SystemRole.SUPER_ADMIN)),
):
    member = db.query(User).filter(User.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Membro não encontrado")

    data = payload.model_dump(exclude_unset=True)

    if "email" in data and data["email"] != member.email:
        existing = db.query(User).filter(User.email == data["email"]).first()
        if existing:
            raise HTTPException(status_code=400, detail="Já existe um membro com esse email")

    if "password" in data:
        password = data.pop("password")
        if password:
            if len(password) < 8:
                raise HTTPException(status_code=400, detail="A password deve ter pelo menos 8 caracteres")
            member.hashed_password = get_password_hash(password)

    for field, value in data.items():
        setattr(member, field, value)

    db.add(member)
    db.commit()
    db.refresh(member)
    return member
