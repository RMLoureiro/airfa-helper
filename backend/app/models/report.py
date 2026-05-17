from sqlalchemy import Column, Integer, String, Enum, ForeignKey, DateTime
from datetime import datetime
from app.db.base import Base

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String, nullable=False)  # INSTRUMENT, GENERAL, etc.
    content = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
