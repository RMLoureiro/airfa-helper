from datetime import timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.deps.auth import get_db, get_current_user, require_roles
from app.models.enums import NotificationType, SystemRole
from app.models.event import Event
from app.models.notification import Notification
from app.models.user import User
from app.schemas.event import EventCreate, EventRead, EventUpdate

router = APIRouter(prefix="/events", tags=["events"])

_MAX_OCCURRENCES = 104  # at most 2 years of weekly events


def _notify_event_change(db: Session, content: str):
    users = db.query(User).all()
    for user in users:
        db.add(
            Notification(
                user_id=user.id,
                type=NotificationType.EVENT,
                content=content,
                read=False,
            )
        )


@router.get("", response_model=list[EventRead])
def list_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Event).order_by(Event.start_time.asc()).all()


@router.post("", response_model=list[EventRead])
def create_event(
    payload: EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SystemRole.ADMIN, SystemRole.SUPER_ADMIN)),
):
    base = payload.model_dump(exclude={"recurrence", "recurrence_end_date"})

    if payload.recurrence == "WEEKLY" and payload.recurrence_end_date:
        # Create first occurrence
        first = Event(**base, recurrence="WEEKLY",
                      recurrence_end_date=payload.recurrence_end_date)
        db.add(first)
        db.flush()  # get first.id without committing
        first.recurrence_series_id = first.id

        created = [first]
        current_start = payload.start_time
        current_end = payload.end_time
        count = 1

        while count < _MAX_OCCURRENCES:
            current_start = current_start + timedelta(weeks=1)
            current_end = current_end + timedelta(weeks=1)
            if current_start.date() > payload.recurrence_end_date:
                break
            occ = Event(
                **{k: v for k, v in base.items() if k not in ("start_time", "end_time")},
                start_time=current_start,
                end_time=current_end,
                recurrence="WEEKLY",
                recurrence_end_date=payload.recurrence_end_date,
                recurrence_series_id=first.id,
            )
            db.add(occ)
            created.append(occ)
            count += 1

        _notify_event_change(db, f"Ensaio recorrente criado: {payload.title}")
        db.commit()
        for e in created:
            db.refresh(e)
        return created

    # Non-recurring
    event = Event(**base)
    db.add(event)
    _notify_event_change(db, f"Novo evento: {payload.title}")
    db.commit()
    db.refresh(event)
    return [event]


@router.put("/{event_id}", response_model=list[EventRead])
def update_event(
    event_id: int,
    payload: EventUpdate,
    scope: Literal["single", "this_and_future"] = Query(default="single"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SystemRole.ADMIN, SystemRole.SUPER_ADMIN)),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Evento não encontrado")

    updates = payload.model_dump(exclude_unset=True)

    if scope == "this_and_future" and event.recurrence_series_id:
        # For time fields, preserve each event's date; only change hour/minute
        new_start = updates.get("start_time")
        new_end = updates.get("end_time")
        non_time = {k: v for k, v in updates.items() if k not in ("start_time", "end_time")}

        future = (
            db.query(Event)
            .filter(
                Event.recurrence_series_id == event.recurrence_series_id,
                Event.start_time >= event.start_time,
                Event.is_cancelled == False,
            )
            .all()
        )
        for ev in future:
            for field, value in non_time.items():
                setattr(ev, field, value)
            if new_start:
                setattr(ev, "start_time",
                        ev.start_time.replace(hour=new_start.hour, minute=new_start.minute,
                                              second=0, microsecond=0))
            if new_end:
                setattr(ev, "end_time",
                        ev.end_time.replace(hour=new_end.hour, minute=new_end.minute,
                                            second=0, microsecond=0))

        _notify_event_change(db, f"Ensaios atualizados: {event.title}")
        db.commit()
        for ev in future:
            db.refresh(ev)
        return future

    # Single update
    for field, value in updates.items():
        setattr(event, field, value)
    _notify_event_change(db, f"Evento atualizado: {event.title}")
    db.commit()
    db.refresh(event)
    return [event]


@router.delete("/{event_id}", status_code=204)
def delete_event(
    event_id: int,
    scope: Literal["single", "this_and_future"] = Query(default="single"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SystemRole.SUPER_ADMIN)),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Evento não encontrado")

    title = event.title

    if scope == "this_and_future" and event.recurrence_series_id:
        future = (
            db.query(Event)
            .filter(
                Event.recurrence_series_id == event.recurrence_series_id,
                Event.start_time >= event.start_time,
            )
            .all()
        )
        for ev in future:
            ev.is_cancelled = True
        _notify_event_change(db, f"Ensaios cancelados: {title}")
        db.commit()
        return

    # Single cancel
    event.is_cancelled = True
    _notify_event_change(db, f"Evento cancelado: {title}")
    db.commit()
