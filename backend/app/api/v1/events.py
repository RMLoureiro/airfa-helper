from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.deps.auth import get_db, get_current_user, require_roles
from app.models.enums import SystemRole
from app.models.event import Event
from app.models.user import User
from app.schemas.event import EventCreate, EventRead, EventUpdate
from app.services import event_service

router = APIRouter(prefix="/events", tags=["events"])


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
    return event_service.create_event(db, payload)


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
    return event_service.update_event(db, event, payload, scope)


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
    event_service.cancel_event(db, event, scope)
