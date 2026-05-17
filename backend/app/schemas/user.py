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


class UserAdminCreate(BaseModel):
    email: EmailStr
    name: str
    password: str
    phone: str | None = None
    birth_date: date | None = None
    address: str | None = None
    join_year: int | None = None
    system_role: SystemRole
    musical_role: MusicalRole | None = None


class UserAdminUpdate(BaseModel):
    email: EmailStr | None = None
    name: str | None = None
    password: str | None = None
    phone: str | None = None
    birth_date: date | None = None
    address: str | None = None
    join_year: int | None = None
    system_role: SystemRole | None = None
    musical_role: MusicalRole | None = None


class UserSelfUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    birth_date: date | None = None
    address: str | None = None


class PasswordChangeRequest(BaseModel):
    new_password: str


class UserRead(UserBase, ReadSchema):
    id: int
