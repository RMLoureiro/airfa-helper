from sqlalchemy import Column, Integer, String, Enum, ForeignKey, DateTime, Boolean
from datetime import datetime
from app.db.base import Base
from app.models.enums import NotificationType

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    type = Column(Enum(NotificationType), nullable=False)
    content = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    read = Column(Boolean, default=False, nullable=False)
