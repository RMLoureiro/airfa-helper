from pydantic import BaseModel, computed_field
from typing import Optional
from datetime import datetime
from app.models.enums import NotificationType
from app.schemas.base import ReadSchema

_TYPE_LABELS: dict[NotificationType, str] = {
    NotificationType.EVENT: "Evento",
    NotificationType.NEWSLETTER: "Newsletter",
    NotificationType.BIRTHDAY: "Aniversário",
    NotificationType.REPORT: "Relatório",
}

class NotificationBase(BaseModel):
    user_id: Optional[int] = None
    type: NotificationType
    content: str
    read: bool = False

class NotificationCreate(NotificationBase):
    pass

class NotificationRead(ReadSchema):
    id: int
    user_id: Optional[int] = None
    type: NotificationType
    content: str
    read: bool
    created_at: datetime

    @computed_field
    @property
    def title(self) -> str:
        return _TYPE_LABELS.get(self.type, self.type.value)

    @computed_field
    @property
    def message(self) -> str:
        return self.content

    @computed_field
    @property
    def is_read(self) -> bool:
        return self.read

    @computed_field
    @property
    def notification_type(self) -> str:
        return self.type.value
