from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date
from app.models.enums import SystemRole, MusicalRole
from app.schemas.base import ReadSchema

class UserBase(BaseModel):
    email: EmailStr
    name: str
    phone: Optional[str] = None
    birth_date: Optional[date] = None
    address: Optional[str] = None
    join_year: Optional[int] = None
    system_role: SystemRole
    musical_role: Optional[MusicalRole] = None

class UserCreate(UserBase):
    password: str


class UserSelfUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    birth_date: date | None = None
    address: str | None = None


class PasswordChangeRequest(BaseModel):
    new_password: str


class UserRead(UserBase, ReadSchema):
    id: int
