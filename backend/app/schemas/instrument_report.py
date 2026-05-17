from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.enums import InstrumentReportType, InstrumentReportSeverity

class InstrumentReportBase(BaseModel):
    instrument_id: int
    user_id: int
    report_type: InstrumentReportType
    severity: InstrumentReportSeverity
    description: str
    addressed: bool = False

class InstrumentReportCreate(InstrumentReportBase):
    pass

class InstrumentReportRead(InstrumentReportBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True
