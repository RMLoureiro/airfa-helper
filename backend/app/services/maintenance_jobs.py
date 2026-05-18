from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import extract, func, text

from app.db.session import SessionLocal
from app.models.enums import EventType
from app.models.event import Event
from app.models.newsletter import Newsletter
from app.models.user import User

BIRTHDAY_EVENT_LOCK_ID = 551_204_901
NEWSLETTER_CLEANUP_LOCK_ID = 551_204_902


def _next_birthday_date(birth_date: date, reference_date: date) -> date:
    candidate = birth_date.replace(year=reference_date.year)
    if candidate < reference_date:
        candidate = birth_date.replace(year=reference_date.year + 1)
    return candidate


def generate_upcoming_birthday_events(days_before: int = 7) -> None:
    today = date.today()
    target_date = today + timedelta(days=days_before)

    with SessionLocal.begin() as db:
        lock_acquired = db.execute(
            text(f"SELECT pg_try_advisory_xact_lock({BIRTHDAY_EVENT_LOCK_ID})")
        ).scalar_one()
        if not lock_acquired:
            return

        users = (
            db.query(User)
            .filter(User.birth_date.isnot(None))
            .filter(extract("month", User.birth_date) == target_date.month)
            .filter(extract("day", User.birth_date) == target_date.day)
            .all()
        )

        for user in users:
            assert user.birth_date is not None
            birthday_date = _next_birthday_date(user.birth_date, today)
            start_dt = datetime.combine(birthday_date, time(hour=9, minute=0))
            end_dt = start_dt + timedelta(hours=1)
            title = f"Aniversario: {user.name}"

            exists = (
                db.query(Event.id)
                .filter(Event.title == title)
                .filter(Event.type == EventType.OTHER)
                .filter(func.date(Event.start_time) == birthday_date)
                .first()
            )
            if exists:
                continue

            db.add(
                Event(
                    title=title,
                    description=(
                        f"Evento gerado automaticamente 7 dias antes do aniversario de {user.name}."
                    ),
                    start_time=start_dt,
                    end_time=end_dt,
                    location="Sede da Banda",
                    type=EventType.OTHER,
                )
            )


def cleanup_old_newsletter_items(retention_days: int = 14) -> None:
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)

    with SessionLocal.begin() as db:
        lock_acquired = db.execute(
            text(f"SELECT pg_try_advisory_xact_lock({NEWSLETTER_CLEANUP_LOCK_ID})")
        ).scalar_one()
        if not lock_acquired:
            return

        db.query(Newsletter).filter(Newsletter.created_at < cutoff).delete(synchronize_session=False)
