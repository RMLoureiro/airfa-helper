from datetime import datetime

from pydantic import BaseModel

from app.models.enums import AttendanceStatus


class PresenceEventRead(BaseModel):
    id: int
    title: str
    type: str
    start_time: datetime
    location: str | None = None
    present_count: int
    tardy_count: int = 0
    absent_count: int = 0
    justified_count: int = 0
    missing_count: int  # absent_count + justified_count (kept for compatibility)
    my_status: str | None = None


class PresenceMemberStatusRead(BaseModel):
    user_id: int
    name: str
    naipe: str | None = None
    status: AttendanceStatus | None = None


class PresenceBulkItem(BaseModel):
    user_id: int
    status: AttendanceStatus


class PresenceBulkMarkRequest(BaseModel):
    items: list[PresenceBulkItem]


class PresenceAnalyticsMemberRead(BaseModel):
    user_id: int
    name: str
    naipe: str | None = None
    total_events: int
    present: int
    tardy: int
    absent: int
    justified: int
