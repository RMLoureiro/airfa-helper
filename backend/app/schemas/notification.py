from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.enums import NotificationType

class NotificationBase(BaseModel):
    user_id: Optional[int] = None
    type: NotificationType
    content: str
    read: bool = False

class NotificationCreate(NotificationBase):
    pass

class NotificationRead(NotificationBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True
