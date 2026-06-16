from pydantic import BaseModel, model_validator
from typing import Optional, Self
from datetime import date, datetime, timedelta
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

    @model_validator(mode='after')
    def check_start_before_end(self) -> Self:
        if self.start_time >= self.end_time:
            raise ValueError('O início do evento deve ser anterior ao fim.')
        return self

class EventCreate(EventBase):
    recurrence: Optional[str] = None           # "WEEKLY" or None
    recurrence_end_date: Optional[date] = None # inclusive last date

    @model_validator(mode='after')
    def check_recurrence_end_date(self) -> Self:
        if self.recurrence == 'WEEKLY' and self.recurrence_end_date is not None:
            min_end = self.start_time.date() + timedelta(weeks=1)
            if self.recurrence_end_date < min_end:
                raise ValueError(
                    'A data de fim das repetições deve ser pelo menos 1 semana após o início do evento.'
                )
        return self

class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    location: Optional[str] = None
    type: Optional[EventType] = None
    facebook_link: Optional[str] = None
    instagram_link: Optional[str] = None

    @model_validator(mode='after')
    def check_start_before_end(self) -> Self:
        if self.start_time is not None and self.end_time is not None:
            if self.start_time >= self.end_time:
                raise ValueError('O início do evento deve ser anterior ao fim.')
        return self

class EventRead(EventBase, ReadSchema):
    id: int
    recurrence: Optional[str] = None
    recurrence_end_date: Optional[date] = None
    recurrence_series_id: Optional[int] = None
    is_cancelled: bool = False
