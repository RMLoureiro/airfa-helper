"""Broadcast in-app notifications to all users."""

from sqlalchemy.orm import Session

from app.models.enums import NotificationType
from app.models.notification import Notification
from app.models.user import User


def broadcast_notification(db: Session, notification_type: NotificationType, content: str) -> None:
    """Create a notification with *content* for every user in the system."""
    users = db.query(User).filter(User.deleted_at.is_(None)).all()
    for user in users:
        db.add(
            Notification(
                user_id=user.id,
                type=notification_type,
                content=content,
                read=False,
            )
        )
