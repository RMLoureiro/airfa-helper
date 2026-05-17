from pydantic import BaseModel
from datetime import datetime
from app.schemas.base import ReadSchema

class NewsletterBase(BaseModel):
    title: str
    content: str

class NewsletterCreate(NewsletterBase):
    pass

class NewsletterRead(NewsletterBase, ReadSchema):
    id: int
    author_id: int
    author_name: str | None = None
    created_at: datetime
