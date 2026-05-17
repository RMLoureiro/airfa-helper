from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date
from app.models.enums import SystemRole, MusicalRole

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

class UserRead(UserBase):
    id: int

    class Config:
        orm_mode = True
