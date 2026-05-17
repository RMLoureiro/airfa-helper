from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.deps.auth import get_db, get_current_user, require_roles
from app.models.enums import SystemRole
from app.models.event import Event
from app.models.user import User
from app.schemas.event import EventCreate, EventRead

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=list[EventRead])
def list_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Event).order_by(Event.start_time.asc()).all()


@router.post("", response_model=EventRead)
def create_event(
    payload: EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SystemRole.ADMIN, SystemRole.SUPER_ADMIN)),
):
    event = Event(**payload.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event
