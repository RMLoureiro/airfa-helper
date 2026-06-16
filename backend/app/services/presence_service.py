"""Business logic for attendance/presence tracking."""

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.enums import AttendanceStatus
from app.models.event import Event
from app.models.event_attendance import EventAttendance
from app.models.user import User
from app.schemas.presence import (
    PresenceAnalyticsMemberRead,
    PresenceBulkItem,
    PresenceEventRead,
    PresenceMemberStatusRead,
)


def _academic_year_bounds(year_start: int) -> tuple[datetime, datetime]:
    """Return (start, end) datetimes for an academic year (Sep 1 → Jul 31)."""
    start = datetime(year_start, 9, 1, 0, 0, 0, tzinfo=timezone.utc)
    end = datetime(year_start + 1, 7, 31, 23, 59, 59, tzinfo=timezone.utc)
    return start, end


def get_academic_years(db: Session) -> list[int]:
    """Return sorted list of academic year-start integers that have events."""
    rows = db.query(Event.start_time).all()
    years: set[int] = set()
    for (start_time,) in rows:
        dt = start_time if start_time.tzinfo else start_time.replace(tzinfo=timezone.utc)
        years.add(dt.year if dt.month >= 9 else dt.year - 1)
    return sorted(years)


def list_presences_for_user(
    db: Session, current_user: User, year_start: int | None = None
) -> list[dict]:
    """Return events with per-event attendance counts and the current user's status."""
    query = db.query(Event)
    if year_start is not None:
        start, end = _academic_year_bounds(year_start)
        query = query.filter(Event.start_time >= start, Event.start_time <= end)
    events = (
        query
        .outerjoin(EventAttendance, EventAttendance.event_id == Event.id)
        .group_by(Event.id)
        .order_by(Event.start_time.asc())
        .all()
    )

    result = []
    for event in events:
        attendance = db.query(EventAttendance).filter(EventAttendance.event_id == event.id).all()
        present_count = sum(1 for a in attendance if a.status == AttendanceStatus.PRESENT)
        tardy_count = sum(1 for a in attendance if a.status == AttendanceStatus.TARDY)
        absent_count = sum(1 for a in attendance if a.status == AttendanceStatus.ABSENT)
        justified_count = sum(1 for a in attendance if a.status == AttendanceStatus.JUSTIFIED)
        my_status = next(
            (a.status.value for a in attendance if a.user_id == current_user.id), None
        )
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
                "missing_count": absent_count + justified_count,
                "my_status": my_status,
            }
        )
    return result


def get_member_analytics(
    db: Session, year_start: int | None = None
) -> list[PresenceAnalyticsMemberRead]:
    """Return per-member attendance analytics, optionally filtered by academic year."""
    members = db.query(User).filter(User.deleted_at.is_(None)).order_by(User.name.asc()).all()
    result = []
    for member in members:
        records_query = db.query(EventAttendance).filter(EventAttendance.user_id == member.id)
        if year_start is not None:
            start, end = _academic_year_bounds(year_start)
            records_query = (
                records_query
                .join(Event, Event.id == EventAttendance.event_id)
                .filter(Event.start_time >= start, Event.start_time <= end)
            )
        records = records_query.all()
        result.append(
            PresenceAnalyticsMemberRead(
                user_id=member.id,
                name=member.name,
                naipe=member.musical_role.value if member.musical_role else None,
                total_events=len(records),
                present=sum(1 for r in records if r.status == AttendanceStatus.PRESENT),
                tardy=sum(1 for r in records if r.status == AttendanceStatus.TARDY),
                absent=sum(1 for r in records if r.status == AttendanceStatus.ABSENT),
                justified=sum(1 for r in records if r.status == AttendanceStatus.JUSTIFIED),
            )
        )
    return result


def get_event_member_statuses(db: Session, event_id: int) -> list[PresenceMemberStatusRead]:
    """Return every member's attendance status for a given event."""
    attendances = {
        a.user_id: a.status
        for a in db.query(EventAttendance).filter(EventAttendance.event_id == event_id).all()
    }
    members = db.query(User).filter(User.deleted_at.is_(None)).order_by(User.name.asc()).all()
    return [
        PresenceMemberStatusRead(
            user_id=member.id,
            name=member.name,
            naipe=member.musical_role.value if member.musical_role else None,
            status=attendances.get(member.id),
        )
        for member in members
    ]


def upsert_attendance(
    db: Session, event_id: int, user_id: int, status: AttendanceStatus
) -> EventAttendance:
    """Create or update the attendance record for one (event, user) pair."""
    attendance = (
        db.query(EventAttendance)
        .filter(EventAttendance.event_id == event_id, EventAttendance.user_id == user_id)
        .first()
    )
    if attendance:
        attendance.status = status
    else:
        attendance = EventAttendance(event_id=event_id, user_id=user_id, status=status)
        db.add(attendance)
    db.commit()
    db.refresh(attendance)
    return attendance


def bulk_upsert_attendance(
    db: Session, event_id: int, items: list[PresenceBulkItem]
) -> int:
    """Upsert multiple attendance records at once. Returns the count of processed rows."""
    for item in items:
        attendance = (
            db.query(EventAttendance)
            .filter(EventAttendance.event_id == event_id, EventAttendance.user_id == item.user_id)
            .first()
        )
        if attendance:
            attendance.status = item.status
        else:
            db.add(EventAttendance(event_id=event_id, user_id=item.user_id, status=item.status))
    db.commit()
    return len(items)
