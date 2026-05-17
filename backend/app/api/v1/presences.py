from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.deps.auth import get_current_user, get_db, require_roles
from app.models.enums import AttendanceStatus, EventType, SystemRole
from app.models.event import Event
from app.models.event_attendance import EventAttendance
from app.models.user import User

router = APIRouter(prefix="/presences", tags=["presences"])


@router.get("")
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
        missing_count = sum(1 for item in attendance if item.status in {AttendanceStatus.ABSENT, AttendanceStatus.JUSTIFIED})
        my_status = next((item.status.value for item in attendance if item.user_id == current_user.id), None)
        result.append(
            {
                "id": event.id,
                "title": event.title,
                "type": event.type.value,
                "start_time": event.start_time,
                "location": event.location,
                "present_count": present_count,
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
