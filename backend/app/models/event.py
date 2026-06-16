from sqlalchemy import Boolean, Column, Date, Integer, String, Enum, DateTime
from app.db.base import Base
from app.models.enums import EventType

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    # Naive wall-clock time (hora local de Portugal) — sem conversão de timezone
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    location = Column(String, nullable=True)
    type = Column(Enum(EventType), nullable=False)
    facebook_link = Column(String, nullable=True)
    instagram_link = Column(String, nullable=True)
    # Recurrence
    recurrence = Column(String, nullable=True)          # "WEEKLY" or None
    recurrence_end_date = Column(Date, nullable=True)   # last date to generate occurrences
    recurrence_series_id = Column(Integer, nullable=True)  # id of first event in series
    is_cancelled = Column(Boolean, nullable=False, default=False, server_default='false')
