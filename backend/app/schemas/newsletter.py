from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.schemas.base import ReadSchema

class NewsletterBase(BaseModel):
    title: str
    content: str
    author_id: int

class NewsletterCreate(NewsletterBase):
    pass

class NewsletterRead(NewsletterBase, ReadSchema):
    id: int
    created_at: datetime
