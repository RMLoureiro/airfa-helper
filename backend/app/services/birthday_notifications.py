from datetime import date

from sqlalchemy import extract, func, text

from app.db.session import SessionLocal
from app.models.enums import NotificationType
from app.models.notification import Notification
from app.models.user import User


ADVISORY_LOCK_ID = 784_512_993


def send_daily_birthday_notifications() -> None:
    today = date.today()
    with SessionLocal.begin() as db:
        lock_acquired = db.execute(text(f"SELECT pg_try_advisory_xact_lock({ADVISORY_LOCK_ID})")).scalar_one()
        if not lock_acquired:
            return

        birthday_members = (
            db.query(User)
            .filter(User.deleted_at.is_(None))
            .filter(User.birth_date.isnot(None))
            .filter(extract("month", User.birth_date) == today.month)
            .filter(extract("day", User.birth_date) == today.day)
            .all()
        )
        if not birthday_members:
            return

        users = db.query(User).filter(User.deleted_at.is_(None)).all()

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
