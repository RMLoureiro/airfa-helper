from datetime import date, datetime
from typing import List
from pydantic import BaseModel


class UpcomingBirthdayRead(BaseModel):
    id: int
    name: str
    birth_date: date | None = None
    days_until: int | None = None


class UpcomingEventRead(BaseModel):
    id: int
    title: str
    description: str | None = None
    start_time: datetime
    location: str | None = None
    type: str


class HomeFeedItemRead(BaseModel):
    id: int
    item_type: str
    title: str
    description: str | None = None
    published_at: datetime


class HomeResponse(BaseModel):
    name: str
    system_role: str
    musical_role: str | None = None
    upcoming_events: List[UpcomingEventRead]
    upcoming_birthdays: List[UpcomingBirthdayRead]
    recent_feed: List[HomeFeedItemRead]
