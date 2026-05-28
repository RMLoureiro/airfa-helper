"""Business logic for events: creation, update, and cancellation."""

from datetime import timedelta
from typing import Literal

from sqlalchemy.orm import Session

from app.models.enums import NotificationType
from app.models.event import Event
from app.schemas.event import EventCreate, EventUpdate
from app.services.notifications import broadcast_notification

# Safety cap: at most 2 years of weekly occurrences
_MAX_OCCURRENCES = 104


def create_event(db: Session, payload: EventCreate) -> list[Event]:
    """Persist a new event (or a full weekly recurrence series) and notify all users."""
    base = payload.model_dump(exclude={"recurrence", "recurrence_end_date"})

    if payload.recurrence == "WEEKLY" and payload.recurrence_end_date:
        return _create_recurring(db, payload, base)

    return _create_single(db, payload, base)


def _create_single(db: Session, payload: EventCreate, base: dict) -> list[Event]:
    event = Event(**base)
    db.add(event)
    broadcast_notification(db, NotificationType.EVENT, f"Novo evento: {payload.title}")
    db.commit()
    db.refresh(event)
    return [event]


def _create_recurring(db: Session, payload: EventCreate, base: dict) -> list[Event]:
    first = Event(**base, recurrence="WEEKLY", recurrence_end_date=payload.recurrence_end_date)
    db.add(first)
    db.flush()  # obtain first.id before commit
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
        occurrence = Event(
            **{k: v for k, v in base.items() if k not in ("start_time", "end_time")},
            start_time=current_start,
            end_time=current_end,
            recurrence="WEEKLY",
            recurrence_end_date=payload.recurrence_end_date,
            recurrence_series_id=first.id,
        )
        db.add(occurrence)
        created.append(occurrence)
        count += 1

    broadcast_notification(db, NotificationType.EVENT, f"Ensaio recorrente criado: {payload.title}")
    db.commit()
    for event in created:
        db.refresh(event)
    return created


def update_event(
    db: Session,
    event: Event,
    payload: EventUpdate,
    scope: Literal["single", "this_and_future"],
) -> list[Event]:
    """Apply *payload* updates to *event*, respecting the recurrence *scope*."""
    updates = payload.model_dump(exclude_unset=True)

    if scope == "this_and_future" and event.recurrence_series_id:
        return _update_this_and_future(db, event, updates)

    return _update_single(db, event, updates)


def _update_single(db: Session, event: Event, updates: dict) -> list[Event]:
    for field, value in updates.items():
        setattr(event, field, value)
    broadcast_notification(db, NotificationType.EVENT, f"Evento atualizado: {event.title}")
    db.commit()
    db.refresh(event)
    return [event]


def _update_this_and_future(db: Session, event: Event, updates: dict) -> list[Event]:
    new_start = updates.get("start_time")
    new_end = updates.get("end_time")
    non_time = {k: v for k, v in updates.items() if k not in ("start_time", "end_time")}

    future_events = (
        db.query(Event)
        .filter(
            Event.recurrence_series_id == event.recurrence_series_id,
            Event.start_time >= event.start_time,
            Event.is_cancelled == False,  # noqa: E712
        )
        .all()
    )

    for ev in future_events:
        for field, value in non_time.items():
            setattr(ev, field, value)
        if new_start:
            ev.start_time = ev.start_time.replace(
                hour=new_start.hour, minute=new_start.minute, second=0, microsecond=0
            )
        if new_end:
            ev.end_time = ev.end_time.replace(
                hour=new_end.hour, minute=new_end.minute, second=0, microsecond=0
            )

    broadcast_notification(db, NotificationType.EVENT, f"Ensaios atualizados: {event.title}")
    db.commit()
    for ev in future_events:
        db.refresh(ev)
    return future_events


def cancel_event(
    db: Session,
    event: Event,
    scope: Literal["single", "this_and_future"],
) -> None:
    """Mark *event* (and optionally all future occurrences) as cancelled."""
    title = event.title

    if scope == "this_and_future" and event.recurrence_series_id:
        future_events = (
            db.query(Event)
            .filter(
                Event.recurrence_series_id == event.recurrence_series_id,
                Event.start_time >= event.start_time,
            )
            .all()
        )
        for ev in future_events:
            ev.is_cancelled = True
        broadcast_notification(db, NotificationType.EVENT, f"Ensaios cancelados: {title}")
        db.commit()
        return

    event.is_cancelled = True
    broadcast_notification(db, NotificationType.EVENT, f"Evento cancelado: {title}")
    db.commit()
