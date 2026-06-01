from decimal import Decimal
from typing import Optional

from pydantic import BaseModel

from app.schemas.base import ReadSchema


class ReinforcementBase(BaseModel):
    name: str
    instrument: Optional[str] = None
    contact: Optional[str] = None
    usual_fee: Optional[Decimal] = None


class ReinforcementCreate(ReinforcementBase):
    pass


class ReinforcementUpdate(BaseModel):
    name: Optional[str] = None
    instrument: Optional[str] = None
    contact: Optional[str] = None
    usual_fee: Optional[Decimal] = None


class ReinforcementRead(ReinforcementBase, ReadSchema):
    id: int


class EventReinforcementCreate(BaseModel):
    reinforcement_id: int
    fee: Optional[Decimal] = None


class EventReinforcementUpdate(BaseModel):
    fee: Optional[Decimal] = None


class EventReinforcementRead(ReadSchema):
    id: int
    event_id: int
    reinforcement_id: int
    fee: Optional[Decimal] = None
    reinforcement: ReinforcementRead
