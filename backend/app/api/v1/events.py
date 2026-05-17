from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.deps.auth import get_db, get_current_user, require_roles
from app.models.enums import NotificationType, SystemRole
from app.models.event import Event
from app.models.notification import Notification
from app.models.user import User
from app.schemas.event import EventCreate, EventRead

router = APIRouter(prefix="/events", tags=["events"])


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


@router.post("", response_model=EventRead)
def create_event(
    payload: EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SystemRole.ADMIN, SystemRole.SUPER_ADMIN)),
):
    event = Event(**payload.model_dump())
    db.add(event)
    _notify_event_change(db, f"Novo evento: {payload.title}")
    db.commit()
    db.refresh(event)
    return event


@router.put("/{event_id}", response_model=EventRead)
def update_event(
    event_id: int,
    payload: EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SystemRole.ADMIN, SystemRole.SUPER_ADMIN)),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        return {"detail": "Evento não encontrado"}

    for field, value in payload.model_dump().items():
        setattr(event, field, value)

    _notify_event_change(db, f"Evento atualizado: {event.title}")
    db.commit()
    db.refresh(event)
    return event


@router.delete("/{event_id}")
def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SystemRole.SUPER_ADMIN)),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        return {"detail": "Evento não encontrado"}

    title = event.title
    db.delete(event)
    _notify_event_change(db, f"Evento removido: {title}")
    db.commit()
    return {"ok": True}
