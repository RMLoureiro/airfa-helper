from sqlalchemy import Column, Integer, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from app.db.base import Base


class EventReinforcement(Base):
    __tablename__ = "event_reinforcements"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    reinforcement_id = Column(Integer, ForeignKey("reinforcements.id", ondelete="CASCADE"), nullable=False)
    fee = Column(Numeric(10, 2), nullable=True)

    event = relationship("Event")
    reinforcement = relationship("Reinforcement", back_populates="event_reinforcements")
