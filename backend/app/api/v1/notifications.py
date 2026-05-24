from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.deps.auth import get_current_user, get_db
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationRead

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.read == False)
        .count()
    )
    return {"count": count}


@router.get("", response_model=list[NotificationRead])
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Notification).filter(Notification.user_id == current_user.id).order_by(Notification.created_at.desc()).all()


@router.put("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == current_user.id)
        .first()
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Notificação não encontrada")

    notification.read = True
    db.commit()
    db.refresh(notification)
    return {"id": notification.id, "read": notification.read}


@router.put("/read-all")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.read == False,
    ).update({"read": True})
    db.commit()
    return {"ok": True}
