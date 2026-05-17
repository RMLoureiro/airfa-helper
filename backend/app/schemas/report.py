from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ReportBase(BaseModel):
    user_id: int
    type: str
    content: str

class ReportCreate(ReportBase):
    pass

class ReportRead(ReportBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True
