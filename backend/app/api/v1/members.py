from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.deps.auth import get_current_user, get_db, require_roles
from app.models.enums import SystemRole
from app.models.user import User
from app.schemas.user import UserRead

router = APIRouter(prefix="/members", tags=["members"])


@router.get("/me", response_model=UserRead)
def read_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("", response_model=list[UserRead])
def list_members(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SystemRole.ADMIN, SystemRole.SUPER_ADMIN)),
):
    return db.query(User).order_by(User.name.asc()).all()
