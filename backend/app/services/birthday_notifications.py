from datetime import date

from sqlalchemy import extract, func

from app.db.session import SessionLocal
from app.models.enums import NotificationType
from app.models.notification import Notification
from app.models.user import User


def send_daily_birthday_notifications() -> None:
    today = date.today()
    db = SessionLocal()
    try:
        birthday_members = (
            db.query(User)
            .filter(User.birth_date.isnot(None))
            .filter(extract("month", User.birth_date) == today.month)
            .filter(extract("day", User.birth_date) == today.day)
            .all()
        )
        if not birthday_members:
            return

        users = db.query(User).all()

        for birthday_member in birthday_members:
            content = f"Hoje é aniversário de {birthday_member.name}."
            for user in users:
                exists = (
                    db.query(Notification.id)
                    .filter(Notification.user_id == user.id)
                    .filter(Notification.type == NotificationType.BIRTHDAY)
                    .filter(Notification.content == content)
                    .filter(func.date(Notification.created_at) == today)
                    .first()
                )
                if exists:
                    continue

                db.add(
                    Notification(
                        user_id=user.id,
                        type=NotificationType.BIRTHDAY,
                        content=content,
                        read=False,
                    )
                )

        db.commit()
    finally:
        db.close()
