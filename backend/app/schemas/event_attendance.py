from pydantic import BaseModel
from app.models.enums import AttendanceStatus
from app.schemas.base import ReadSchema

class EventAttendanceBase(BaseModel):
    event_id: int
    user_id: int
    status: AttendanceStatus

class EventAttendanceCreate(EventAttendanceBase):
    pass

class EventAttendanceRead(EventAttendanceBase, ReadSchema):
    id: int
