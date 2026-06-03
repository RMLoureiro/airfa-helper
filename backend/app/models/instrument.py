from sqlalchemy import Column, Integer, String, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.models.enums import InstrumentType, InstrumentState

class Instrument(Base):
    __tablename__ = "instruments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    type = Column(Enum(InstrumentType), nullable=False)
    make = Column(String, nullable=True)
    model = Column(String, nullable=True)
    serial_number = Column(String, nullable=True)
    state = Column(Enum(InstrumentState), nullable=False, default=InstrumentState.OK)

    user = relationship("User", back_populates="instruments")
    reports = relationship("InstrumentReport", back_populates="instrument")
