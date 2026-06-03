from pydantic import BaseModel
from typing import Optional
from app.models.enums import InstrumentType, InstrumentState
from app.schemas.base import ReadSchema

class InstrumentBase(BaseModel):
    type: InstrumentType
    make: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    state: InstrumentState
    user_id: Optional[int] = None

class InstrumentCreate(InstrumentBase):
    pass

class InstrumentUpdate(BaseModel):
    type: Optional[InstrumentType] = None
    make: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    state: Optional[InstrumentState] = None
    user_id: Optional[int] = None

class InstrumentRead(InstrumentBase, ReadSchema):
    id: int
