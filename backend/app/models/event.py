from sqlalchemy import Column, Integer, String, Enum, DateTime
from app.db.base import Base
from app.models.enums import EventType

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    location = Column(String, nullable=True)
    type = Column(Enum(EventType), nullable=False)
    facebook_link = Column(String, nullable=True)
    instagram_link = Column(String, nullable=True)
