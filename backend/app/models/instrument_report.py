from sqlalchemy import Column, Integer, String, Enum, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base import Base
from app.models.enums import InstrumentReportType, InstrumentReportSeverity

class InstrumentReport(Base):
    __tablename__ = "instrument_reports"

    id = Column(Integer, primary_key=True, index=True)
    instrument_id = Column(Integer, ForeignKey("instruments.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    report_type = Column(Enum(InstrumentReportType), nullable=False)
    severity = Column(Enum(InstrumentReportSeverity), nullable=False)
    description = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    addressed = Column(Boolean, default=False, nullable=False)

    instrument = relationship("Instrument", back_populates="reports")
    user = relationship("User")
