from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class NewsletterBase(BaseModel):
    title: str
    content: str
    author_id: int

class NewsletterCreate(NewsletterBase):
    pass

class NewsletterRead(NewsletterBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True
