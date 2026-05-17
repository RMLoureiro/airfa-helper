from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.enums import EventType

class EventBase(BaseModel):
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    location: Optional[str] = None
    type: EventType
    facebook_link: Optional[str] = None
    instagram_link: Optional[str] = None

class EventCreate(EventBase):
    pass

class EventRead(EventBase):
    id: int

    class Config:
        orm_mode = True
