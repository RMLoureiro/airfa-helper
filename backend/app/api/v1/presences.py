from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.deps.auth import get_current_user, get_db, require_roles
from app.models.enums import AttendanceStatus, SystemRole
from app.models.event import Event
from app.models.event_attendance import EventAttendance
from app.models.user import User
from app.schemas.presence import (
    PresenceAnalyticsMemberRead,
    PresenceBulkMarkRequest,
    PresenceEventRead,
    PresenceMemberStatusRead,
)

router = APIRouter(prefix="/presences", tags=["presences"])


@router.get("", response_model=list[PresenceEventRead])
def list_presences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    events = (
        db.query(Event)
        .outerjoin(EventAttendance, EventAttendance.event_id == Event.id)
        .group_by(Event.id)
        .order_by(Event.start_time.asc())
        .all()
    )

    result = []
    for event in events:
        attendance = db.query(EventAttendance).filter(EventAttendance.event_id == event.id).all()
        present_count = sum(1 for item in attendance if item.status == AttendanceStatus.PRESENT)
        tardy_count = sum(1 for item in attendance if item.status == AttendanceStatus.TARDY)
        absent_count = sum(1 for item in attendance if item.status == AttendanceStatus.ABSENT)
        justified_count = sum(1 for item in attendance if item.status == AttendanceStatus.JUSTIFIED)
        missing_count = absent_count + justified_count
        my_status = next((item.status.value for item in attendance if item.user_id == current_user.id), None)
        result.append(
            {
                "id": event.id,
                "title": event.title,
                "type": event.type.value,
                "start_time": event.start_time,
                "location": event.location,
                "present_count": present_count,
                "tardy_count": tardy_count,
                "absent_count": absent_count,
                "justified_count": justified_count,
                "missing_count": missing_count,
                "my_status": my_status,
            }
        )
    return result


@router.get("/calendar")
def presences_calendar(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_presences(db=db, current_user=current_user)


@router.get("/analytics/members", response_model=list[PresenceAnalyticsMemberRead])
def member_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SystemRole.ADMIN, SystemRole.SUPER_ADMIN)),
):
    members = db.query(User).order_by(User.name.asc()).all()
    analytics: list[PresenceAnalyticsMemberRead] = []

    for member in members:
        records = db.query(EventAttendance).filter(EventAttendance.user_id == member.id).all()
        analytics.append(
            PresenceAnalyticsMemberRead(
                user_id=member.id,
                name=member.name,
                naipe=member.musical_role.value if member.musical_role else None,
                total_events=len(records),
                present=sum(1 for item in records if item.status == AttendanceStatus.PRESENT),
                tardy=sum(1 for item in records if item.status == AttendanceStatus.TARDY),
                absent=sum(1 for item in records if item.status == AttendanceStatus.ABSENT),
                justified=sum(1 for item in records if item.status == AttendanceStatus.JUSTIFIED),
            )
        )

    return analytics


@router.get("/{event_id}/members", response_model=list[PresenceMemberStatusRead])
def list_event_members(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SystemRole.ADMIN, SystemRole.SUPER_ADMIN)),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Evento não encontrado")

    attendances = {
        item.user_id: item.status
        for item in db.query(EventAttendance).filter(EventAttendance.event_id == event_id).all()
    }

    members = db.query(User).order_by(User.name.asc()).all()
    return [
        PresenceMemberStatusRead(
            user_id=member.id,
            name=member.name,
            naipe=member.musical_role.value if member.musical_role else None,
            status=attendances.get(member.id),
        )
        for member in members
    ]


@router.post("/{event_id}/mark")
def mark_presence(
    event_id: int,
    user_id: int,
    status: AttendanceStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SystemRole.ADMIN, SystemRole.SUPER_ADMIN)),
):
    attendance = db.query(EventAttendance).filter(EventAttendance.event_id == event_id, EventAttendance.user_id == user_id).first()
    if attendance:
        attendance.status = status
    else:
        attendance = EventAttendance(event_id=event_id, user_id=user_id, status=status)
        db.add(attendance)
    db.commit()
    db.refresh(attendance)
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

    updated = 0
    for item in payload.items:
        attendance = (
            db.query(EventAttendance)
            .filter(EventAttendance.event_id == event_id, EventAttendance.user_id == item.user_id)
            .first()
        )
        if attendance:
            attendance.status = item.status
        else:
            attendance = EventAttendance(event_id=event_id, user_id=item.user_id, status=item.status)
            db.add(attendance)
        updated += 1

    db.commit()
    return {"updated": updated}


