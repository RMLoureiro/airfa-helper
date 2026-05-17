from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.schemas.base import ReadSchema

class ReportBase(BaseModel):
    user_id: int
    type: str
    content: str

class ReportCreate(ReportBase):
    pass

class ReportRead(ReportBase, ReadSchema):
    id: int
    created_at: datetime
