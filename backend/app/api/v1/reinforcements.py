from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.deps.auth import get_db, require_roles
from app.models.enums import SystemRole
from app.models.event import Event
from app.models.event_reinforcement import EventReinforcement
from app.models.reinforcement import Reinforcement
from app.schemas.reinforcement import (
    EventReinforcementCreate,
    EventReinforcementRead,
    EventReinforcementUpdate,
    ReinforcementCreate,
    ReinforcementRead,
    ReinforcementUpdate,
)

router = APIRouter(prefix="/reinforcements", tags=["reinforcements"])


# ── Reinforcement CRUD ────────────────────────────────────────────────────────

@router.get("", response_model=list[ReinforcementRead])
def list_reinforcements(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(SystemRole.SUPER_ADMIN)),
):
    return db.query(Reinforcement).order_by(Reinforcement.name).all()


@router.post("", response_model=ReinforcementRead, status_code=201)
def create_reinforcement(
    payload: ReinforcementCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(SystemRole.SUPER_ADMIN)),
):
    obj = Reinforcement(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/{reinforcement_id}", response_model=ReinforcementRead)
def update_reinforcement(
    reinforcement_id: int,
    payload: ReinforcementUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(SystemRole.SUPER_ADMIN)),
):
    obj = db.query(Reinforcement).filter(Reinforcement.id == reinforcement_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Reforço não encontrado")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{reinforcement_id}", status_code=204)
def delete_reinforcement(
    reinforcement_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(SystemRole.SUPER_ADMIN)),
):
    obj = db.query(Reinforcement).filter(Reinforcement.id == reinforcement_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Reforço não encontrado")
    db.delete(obj)
    db.commit()


# ── Event ↔ Reinforcement assignments ────────────────────────────────────────

@router.get("/events", response_model=list[EventReinforcementRead])
def list_all_event_reinforcements(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(SystemRole.SUPER_ADMIN)),
):
    """Return every event-reinforcement assignment in a single query."""
    return db.query(EventReinforcement).all()


@router.get("/events/{event_id}", response_model=list[EventReinforcementRead])
def list_event_reinforcements(
    event_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(SystemRole.SUPER_ADMIN)),
):
    return (
        db.query(EventReinforcement)
        .filter(EventReinforcement.event_id == event_id)
        .all()
    )


@router.post("/events/{event_id}", response_model=EventReinforcementRead, status_code=201)
def add_event_reinforcement(
    event_id: int,
    payload: EventReinforcementCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(SystemRole.SUPER_ADMIN)),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    existing = (
        db.query(EventReinforcement)
        .filter(
            EventReinforcement.event_id == event_id,
            EventReinforcement.reinforcement_id == payload.reinforcement_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Reforço já está associado a este evento")
    obj = EventReinforcement(event_id=event_id, **payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/events/{event_id}/entries/{entry_id}", response_model=EventReinforcementRead)
def update_event_reinforcement(
    event_id: int,
    entry_id: int,
    payload: EventReinforcementUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(SystemRole.SUPER_ADMIN)),
):
    obj = (
        db.query(EventReinforcement)
        .filter(EventReinforcement.id == entry_id, EventReinforcement.event_id == event_id)
        .first()
    )
    if not obj:
        raise HTTPException(status_code=404, detail="Entrada não encontrada")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/events/{event_id}/entries/{entry_id}", status_code=204)
def delete_event_reinforcement(
    event_id: int,
    entry_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(SystemRole.SUPER_ADMIN)),
):
    obj = (
        db.query(EventReinforcement)
        .filter(EventReinforcement.id == entry_id, EventReinforcement.event_id == event_id)
        .first()
    )
    if not obj:
        raise HTTPException(status_code=404, detail="Entrada não encontrada")
    db.delete(obj)
    db.commit()
