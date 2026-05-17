from datetime import date
from typing import List
from pydantic import BaseModel

class UpcomingBirthdayRead(BaseModel):
    id: int
    name: str
    birth_date: date | None = None
    days_until: int | None = None

class HomeResponse(BaseModel):
    name: str
    system_role: str
    musical_role: str | None = None
    upcoming_birthdays: List[UpcomingBirthdayRead]
