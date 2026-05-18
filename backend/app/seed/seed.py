from __future__ import annotations

import os
from datetime import date, datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models.enums import (
    AttendanceStatus,
    EventType,
    InstrumentReportSeverity,
    InstrumentReportType,
    InstrumentState,
    InstrumentType,
    MusicalRole,
    NotificationType,
    RepertoireState,
    SystemRole,
)
from app.models.event import Event
from app.models.event_attendance import EventAttendance
from app.models.instrument import Instrument
from app.models.instrument_report import InstrumentReport
from app.models.newsletter import Newsletter
from app.models.notification import Notification
from app.models.report import Report
from app.models.repertoire import Repertoire
from app.models.user import User


SEED_PASSWORD_SUPER_ADMIN = os.getenv("SEED_SUPER_ADMIN_PASSWORD", "admin123")
SEED_PASSWORD_ADMIN = os.getenv("SEED_ADMIN_PASSWORD", "admin123")
SEED_PASSWORD_REGULAR = os.getenv("SEED_REGULAR_PASSWORD", "admin123")


def _upsert_user(db: Session, payload: dict) -> User:
    user = db.query(User).filter(User.email == payload["email"]).first()
    if not user:
        user = User(**payload)
        db.add(user)
        db.flush()
        return user

    for key, value in payload.items():
        setattr(user, key, value)
    db.add(user)
    db.flush()
    return user


def _seed_users(db: Session) -> tuple[User, User, User, User]:
    super_admin = _upsert_user(
        db,
        {
            "username": os.getenv("SUPER_ADMIN_USERNAME", "superadmin"),
            "hashed_password": get_password_hash(SEED_PASSWORD_SUPER_ADMIN),
            "name": os.getenv("SUPER_ADMIN_NAME", "Super Admin Airfa"),
            "phone": "910000001",
            "birth_date": date(1985, 5, 18),
            "address": "Rua Principal 1",
            "join_year": 2010,
            "system_role": SystemRole.SUPER_ADMIN,
            "musical_role": MusicalRole.TRUMPET_PLAYER,
        },
    )

    admin = _upsert_user(
        db,
        {
            "username": os.getenv("ADMIN_USERNAME", "admin"),
            "hashed_password": get_password_hash(SEED_PASSWORD_ADMIN),
            "name": "Admin Airfa",
            "phone": "910000002",
            "birth_date": date(1990, 9, 10),
            "address": "Rua Secundaria 2",
            "join_year": 2014,
            "system_role": SystemRole.ADMIN,
            "musical_role": MusicalRole.CLARINET_PLAYER,
        },
    )

    regular = _upsert_user(
        db,
        {
            "username": os.getenv("REGULAR_USERNAME", "membro"),
            "hashed_password": get_password_hash(SEED_PASSWORD_REGULAR),
            "name": "Membro Regular",
            "phone": "910000003",
            "birth_date": date(1998, 12, 2),
            "address": "Rua da Banda 3",
            "join_year": 2020,
            "system_role": SystemRole.REGULAR,
            "musical_role": MusicalRole.SAXOPHONE_PLAYER,
        },
    )

    regular2 = _upsert_user(
        db,
        {
            "username": os.getenv("REGULAR2_USERNAME", "membro2"),
            "hashed_password": get_password_hash(SEED_PASSWORD_REGULAR),
            "name": "Membro Regular 2",
            "phone": "910000004",
            "birth_date": date(1995, 7, 15),
            "address": "Rua Nova 4",
            "join_year": 2018,
            "system_role": SystemRole.REGULAR,
            "musical_role": MusicalRole.PERCUSSION_PLAYER,
        },
    )

    return super_admin, admin, regular, regular2


def _seed_events(db: Session) -> list[Event]:
    db.query(EventAttendance).delete(synchronize_session=False)
    db.query(Event).delete(synchronize_session=False)

    now = datetime.now(timezone.utc)
    events = [
        Event(
            title="Ensaio Geral de Primavera",
            description="Preparacao do concerto anual.",
            start_time=now + timedelta(days=2),
            end_time=now + timedelta(days=2, hours=2),
            location="Sede da Banda",
            type=EventType.REHEARSAL,
            facebook_link="https://facebook.com/airfa/evento1",
            instagram_link="https://instagram.com/airfa/evento1",
        ),
        Event(
            title="Concerto da Vila",
            description="Atuacao na praca central.",
            start_time=now + timedelta(days=7),
            end_time=now + timedelta(days=7, hours=3),
            location="Praca Central",
            type=EventType.CONCERT,
            facebook_link="https://facebook.com/airfa/evento2",
            instagram_link="https://instagram.com/airfa/evento2",
        ),
    ]
    db.add_all(events)
    db.flush()
    return events


def _seed_attendance(db: Session, events: list[Event], users: tuple[User, User, User, User]) -> None:
    super_admin, admin, regular, regular2 = users
    records = [
        EventAttendance(event_id=events[0].id, user_id=super_admin.id, status=AttendanceStatus.PRESENT),
        EventAttendance(event_id=events[0].id, user_id=admin.id, status=AttendanceStatus.TARDY),
        EventAttendance(event_id=events[0].id, user_id=regular.id, status=AttendanceStatus.JUSTIFIED),
        EventAttendance(event_id=events[0].id, user_id=regular2.id, status=AttendanceStatus.JUSTIFIED),
        EventAttendance(event_id=events[1].id, user_id=super_admin.id, status=AttendanceStatus.PRESENT),
        EventAttendance(event_id=events[1].id, user_id=admin.id, status=AttendanceStatus.PRESENT),
        EventAttendance(event_id=events[1].id, user_id=regular.id, status=AttendanceStatus.ABSENT),
        EventAttendance(event_id=events[1].id, user_id=regular2.id, status=AttendanceStatus.ABSENT),
    ]
    db.add_all(records)


def _seed_instruments(db: Session, users: tuple[User, User, User, User]) -> list[Instrument]:
    _, admin, regular, regular2 = users
    db.query(InstrumentReport).delete(synchronize_session=False)
    db.query(Instrument).delete(synchronize_session=False)

    instruments = [
        Instrument(
            user_id=regular.id,
            type=InstrumentType.ALTO_SAXOPHONE,
            make="Yamaha",
            model="YAS-280",
            state=InstrumentState.NEEDS_MAINTENANCE,
        ),
        Instrument(
            user_id=admin.id,
            type=InstrumentType.CLARINET,
            make="Buffet Crampon",
            model="E11",
            state=InstrumentState.OK,
        ),
        Instrument(
            user_id=None,
            type=InstrumentType.TRUMPET,
            make="Bach",
            model="TR300",
            state=InstrumentState.NEEDS_FIXING,
        ),
    ]
    db.add_all(instruments)
    db.flush()
    return instruments


def _seed_instrument_reports(db: Session, instruments: list[Instrument], users: tuple[User, User, User, User]) -> None:
    super_admin, _, regular, regular2 = users
    reports = [
        InstrumentReport(
            instrument_id=instruments[0].id,
            user_id=regular.id,
            report_type=InstrumentReportType.MAINTENANCE,
            severity=InstrumentReportSeverity.AVERAGE,
            description="Afinação instavel e necessidade de limpeza geral.",
            addressed=False,
        ),
        InstrumentReport(
            instrument_id=instruments[2].id,
            user_id=super_admin.id,
            report_type=InstrumentReportType.FIX,
            severity=InstrumentReportSeverity.BIG,
            description="Pistao preso, precisa reparacao urgente.",
            addressed=False,
        ),
    ]
    db.add_all(reports)


def _seed_newsletter(db: Session, users: tuple[User, User, User, User]) -> list[Newsletter]:
    _, admin, _, _ = users
    db.query(Newsletter).delete(synchronize_session=False)
    items = [
        Newsletter(
            title="Boletim Semanal",
            content="Resumo de ensaios, eventos e tarefas da semana.",
            author_id=admin.id,
        ),
        Newsletter(
            title="Agenda do Mes",
            content="Datas importantes, concertos e reunioes administrativas.",
            author_id=admin.id,
        ),
    ]
    db.add_all(items)
    db.flush()
    return items


def _seed_repertoire(db: Session) -> list[Repertoire]:
    db.query(Repertoire).delete(synchronize_session=False)
    items = [
        Repertoire(
            title="Abertura Festiva",
            youtube_link="https://youtube.com/watch?v=example1",
            folder_path="abertura-festiva",
            state=RepertoireState.CURRENT,
        ),
        Repertoire(
            title="Marcha da Vila",
            youtube_link="https://youtube.com/watch?v=example2",
            folder_path="marcha-da-vila",
            state=RepertoireState.FUTURE,
        ),
        Repertoire(
            title="Hino Antigo",
            youtube_link=None,
            folder_path="hino-antigo",
            state=RepertoireState.OLD,
        ),
    ]
    db.add_all(items)
    db.flush()
    return items


def _seed_notifications(db: Session, users: tuple[User, User, User, User], events: list[Event], newsletters: list[Newsletter]) -> None:
    super_admin, admin, regular, regular2 = users
    db.query(Notification).delete(synchronize_session=False)

    notifications = [
        Notification(
            user_id=super_admin.id,
            type=NotificationType.EVENT,
            content=f"Evento agendado: {events[0].title}",
            read=False,
        ),
        Notification(
            user_id=admin.id,
            type=NotificationType.NEWSLETTER,
            content=f"Nova publicação: {newsletters[0].title}",
            read=False,
        ),
        Notification(
            user_id=regular.id,
            type=NotificationType.BIRTHDAY,
            content="Hoje faz anos um membro da banda.",
            read=False,
        ),
        Notification(
            user_id=regular2.id,
            type=NotificationType.BIRTHDAY,
            content="Hoje faz anos um membro da banda.",
            read=False,
        ),
    ]
    db.add_all(notifications)


def _seed_reports(db: Session, users: tuple[User, User, User, User]) -> None:
    _, _, regular, regular2 = users
    db.query(Report).delete(synchronize_session=False)
    db.add(
        Report(
            user_id=regular.id,
            type="GENERAL",
            content="Sugestao de melhoria para distribuicao de partituras.",
        )
    )


def seed_all() -> None:
    db: Session = SessionLocal()
    try:
        print(f"Using database URL: {db.bind.url}", flush=True)

        users = _seed_users(db)
        events = _seed_events(db)
        _seed_attendance(db, events, users)
        instruments = _seed_instruments(db, users)
        _seed_instrument_reports(db, instruments, users)
        newsletters = _seed_newsletter(db, users)
        _seed_repertoire(db)
        _seed_notifications(db, users, events, newsletters)
        _seed_reports(db, users)

        db.commit()

        print("Seed completa aplicada com sucesso.", flush=True)
        print("Credenciais de teste:", flush=True)
        print(f"- SUPER_ADMIN: {users[0].email} / {SEED_PASSWORD_SUPER_ADMIN}", flush=True)
        print(f"- ADMIN: {users[1].email} / {SEED_PASSWORD_ADMIN}", flush=True)
        print(f"- REGULAR: {users[2].email} / {SEED_PASSWORD_REGULAR}", flush=True)
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_all()
