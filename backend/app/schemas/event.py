from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from app.models.enums import EventType
from app.schemas.base import ReadSchema

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
    recurrence: Optional[str] = None           # "WEEKLY" or None
    recurrence_end_date: Optional[date] = None # inclusive last date

class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    location: Optional[str] = None
    type: Optional[EventType] = None
    facebook_link: Optional[str] = None
    instagram_link: Optional[str] = None

class EventRead(EventBase, ReadSchema):
    id: int
    recurrence: Optional[str] = None
    recurrence_end_date: Optional[date] = None
    recurrence_series_id: Optional[int] = None
    is_cancelled: bool = False
