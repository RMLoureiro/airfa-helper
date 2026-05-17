from pydantic import BaseModel
from typing import Optional
from app.models.enums import RepertoireState
from app.schemas.base import ReadSchema


class RepertoireFileRead(BaseModel):
    name: str
    download_url: str

class RepertoireBase(BaseModel):
    title: str
    youtube_link: Optional[str] = None
    folder_path: Optional[str] = None
    state: RepertoireState

class RepertoireCreate(RepertoireBase):
    pass

class RepertoireRead(RepertoireBase, ReadSchema):
    id: int
    files: list[RepertoireFileRead] = []
