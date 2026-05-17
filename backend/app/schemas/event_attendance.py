from pydantic import BaseModel
from app.models.enums import AttendanceStatus

class EventAttendanceBase(BaseModel):
    event_id: int
    user_id: int
    status: AttendanceStatus

class EventAttendanceCreate(EventAttendanceBase):
    pass

class EventAttendanceRead(EventAttendanceBase):
    id: int

    class Config:
        orm_mode = True
