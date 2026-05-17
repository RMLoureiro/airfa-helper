from pydantic import BaseModel
from typing import Optional
from app.models.enums import RepertoireState

class RepertoireBase(BaseModel):
    title: str
    youtube_link: Optional[str] = None
    folder_path: Optional[str] = None
    state: RepertoireState

class RepertoireCreate(RepertoireBase):
    pass

class RepertoireRead(RepertoireBase):
    id: int

    class Config:
        orm_mode = True
