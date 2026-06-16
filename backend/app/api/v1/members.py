from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException

from sqlalchemy.orm import Session

from app.core.security import get_password_hash, verify_password
from app.deps.auth import get_current_user, get_db, require_roles
from app.models.enums import SystemRole
from app.models.event_attendance import EventAttendance
from app.models.instrument import Instrument
from app.models.instrument_report import InstrumentReport
from app.models.newsletter import Newsletter
from app.models.notification import Notification
from app.models.report import Report
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

    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="A nova password deve ter pelo menos 8 caracteres")

    current_user.hashed_password = get_password_hash(payload.new_password)
    db.add(current_user)
    db.commit()
    return {"ok": True}


@router.get("/", response_model=list[UserRead])
def list_members(
    status: Literal["active", "former", "all"] = "active",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SystemRole.ADMIN, SystemRole.SUPER_ADMIN)),
):
    query = db.query(User)
    if status == "active":
        query = query.filter(User.deleted_at.is_(None))
    elif status == "former":
        query = query.filter(User.deleted_at.isnot(None))
    return query.all()


@router.post("/", response_model=UserRead)
def create_member(
    payload: UserAdminCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SystemRole.ADMIN, SystemRole.SUPER_ADMIN)),
):
    # Only SUPER_ADMIN can create other SUPER_ADMIN accounts
    if current_user.system_role == SystemRole.ADMIN and payload.system_role == SystemRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Apenas SUPER_ADMIN pode criar contas SUPER_ADMIN")

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
    member = db.query(User).filter(User.id == member_id, User.deleted_at.is_(None)).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    # ADMIN cannot modify SUPER_ADMIN accounts or escalate privileges to SUPER_ADMIN
    if current_user.system_role == SystemRole.ADMIN:
        if member.system_role == SystemRole.SUPER_ADMIN:
            raise HTTPException(status_code=403, detail="Não tem permissão para modificar contas SUPER_ADMIN")
        if payload.system_role == SystemRole.SUPER_ADMIN:
            raise HTTPException(status_code=403, detail="Não tem permissão para atribuir o papel SUPER_ADMIN")

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
    current_user: User = Depends(require_roles(SystemRole.SUPER_ADMIN)),
):
    member = db.query(User).filter(User.id == member_id, User.deleted_at.is_(None)).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    if member.id == current_user.id:
        raise HTTPException(status_code=400, detail="Não pode eliminar a sua própria conta")

    # Soft delete: mark as a former member so the historical records
    # (attendances, reports, newsletters, etc.) remain intact while the user
    # is excluded from all active features.
    member.deleted_at = datetime.now(timezone.utc)

    # Instruments are shared band assets: keep them but unassign from the member.
    db.query(Instrument).filter(Instrument.user_id == member_id).update(
        {Instrument.user_id: None}, synchronize_session=False
    )

    db.commit()
    return {"detail": "Member deleted successfully"}


@router.post("/{member_id}/restore", response_model=UserRead)
def restore_member(
    member_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SystemRole.SUPER_ADMIN)),
):
    member = db.query(User).filter(User.id == member_id, User.deleted_at.isnot(None)).first()
    if not member:
        raise HTTPException(status_code=404, detail="Former member not found")

    member.deleted_at = None
    db.commit()
    db.refresh(member)
    return member


@router.delete("/{member_id}/permanent", status_code=204)
def hard_delete_member(
    member_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SystemRole.SUPER_ADMIN)),
):
    """Permanently delete a former member and all their historical records.

    Only members that were already soft-deleted can be permanently removed.
    This is irreversible.
    """
    member = db.query(User).filter(User.id == member_id, User.deleted_at.isnot(None)).first()
    if not member:
        raise HTTPException(status_code=404, detail="Former member not found")

    if member.id == current_user.id:
        raise HTTPException(status_code=400, detail="Não pode eliminar a sua própria conta")

    # Remove every record that references this user before deleting it,
    # otherwise the database raises a foreign key constraint error.
    db.query(EventAttendance).filter(EventAttendance.user_id == member_id).delete(synchronize_session=False)
    db.query(InstrumentReport).filter(InstrumentReport.user_id == member_id).delete(synchronize_session=False)
    db.query(Report).filter(Report.user_id == member_id).delete(synchronize_session=False)
    db.query(Newsletter).filter(Newsletter.author_id == member_id).delete(synchronize_session=False)
    db.query(Notification).filter(Notification.user_id == member_id).delete(synchronize_session=False)
    # Instruments are shared band assets: keep them but unassign from the member.
    db.query(Instrument).filter(Instrument.user_id == member_id).update(
        {Instrument.user_id: None}, synchronize_session=False
    )

    db.delete(member)
    db.commit()
