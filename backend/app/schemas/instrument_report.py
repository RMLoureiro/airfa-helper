from pydantic import BaseModel
from datetime import datetime
from app.models.enums import InstrumentReportType, InstrumentReportSeverity
from app.schemas.base import ReadSchema

class InstrumentReportBase(BaseModel):
    report_type: InstrumentReportType
    severity: InstrumentReportSeverity
    description: str

class InstrumentReportCreate(InstrumentReportBase):
    pass

class InstrumentReportRead(InstrumentReportBase, ReadSchema):
    id: int
    instrument_id: int
    user_id: int
    addressed: bool = False
    created_at: datetime
