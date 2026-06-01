from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.deps.auth import get_current_user, get_db, require_roles
from app.models.enums import AttendanceStatus, SystemRole
from app.models.event import Event
from app.models.user import User
from app.schemas.presence import (
    PresenceAnalyticsMemberRead,
    PresenceBulkMarkRequest,
    PresenceEventRead,
    PresenceMemberStatusRead,
)
from app.services import presence_service

router = APIRouter(prefix="/presences", tags=["presences"])


@router.get("", response_model=list[PresenceEventRead])
def list_presences(
    year_start: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return presence_service.list_presences_for_user(db, current_user, year_start=year_start)


@router.get("/academic_years")
def get_academic_years(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return presence_service.get_academic_years(db)


@router.get("/calendar")
def presences_calendar(
    year_start: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return presence_service.list_presences_for_user(db, current_user, year_start=year_start)


@router.get("/analytics/members", response_model=list[PresenceAnalyticsMemberRead])
def member_analytics(
    year_start: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SystemRole.ADMIN, SystemRole.SUPER_ADMIN)),
):
    return presence_service.get_member_analytics(db, year_start=year_start)


@router.get("/{event_id}/members", response_model=list[PresenceMemberStatusRead])
def list_event_members(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SystemRole.ADMIN, SystemRole.SUPER_ADMIN)),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    return presence_service.get_event_member_statuses(db, event_id)


@router.post("/{event_id}/mark")
def mark_presence(
    event_id: int,
    user_id: int,
    status: AttendanceStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SystemRole.ADMIN, SystemRole.SUPER_ADMIN)),
):
    attendance = presence_service.upsert_attendance(db, event_id, user_id, status)
    return {"id": attendance.id, "status": attendance.status.value}


@router.post("/{event_id}/bulk-mark")
def bulk_mark_presence(
    event_id: int,
    payload: PresenceBulkMarkRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SystemRole.ADMIN, SystemRole.SUPER_ADMIN)),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    updated = presence_service.bulk_upsert_attendance(db, event_id, payload.items)
    return {"updated": updated}


