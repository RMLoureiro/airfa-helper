from sqlalchemy import Column, Integer, String, Numeric
from sqlalchemy.orm import relationship
from app.db.base import Base


class Reinforcement(Base):
    __tablename__ = "reinforcements"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    instrument = Column(String, nullable=True)
    contact = Column(String, nullable=True)
    usual_fee = Column(Numeric(10, 2), nullable=True)

    event_reinforcements = relationship(
        "EventReinforcement",
        back_populates="reinforcement",
        cascade="all, delete-orphan",
    )
