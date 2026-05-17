from pydantic import BaseModel
from typing import Optional
from app.models.enums import InstrumentType, InstrumentState
from app.schemas.base import ReadSchema

class InstrumentBase(BaseModel):
    type: InstrumentType
    make: Optional[str] = None
    model: Optional[str] = None
    state: InstrumentState
    user_id: Optional[int] = None

class InstrumentCreate(InstrumentBase):
    pass

class InstrumentRead(InstrumentBase, ReadSchema):
    id: int
