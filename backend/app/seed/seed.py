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
    user = db.query(User).filter(User.username == payload["username"]).first()
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
            "email": os.getenv("SUPER_ADMIN_USERNAME", "superadmin"),
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
            "email": os.getenv("ADMIN_USERNAME", "admin"),
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
            "email": os.getenv("REGULAR_USERNAME", "membro"),
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
            "email": os.getenv("REGULAR2_USERNAME", "membro2"),
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
        # ── Past rehearsals ───────────────────────────────────────────
        Event(
            title="Ensaio de Janeiro",
            description="Primeiro ensaio do ano.",
            start_time=now - timedelta(days=138),
            end_time=now - timedelta(days=138) + timedelta(hours=2),
            location="Sede da Banda",
            type=EventType.REHEARSAL,
        ),
        Event(
            title="Ensaio de Fevereiro",
            description="Preparação para o carnaval.",
            start_time=now - timedelta(days=104),
            end_time=now - timedelta(days=104) + timedelta(hours=2),
            location="Sede da Banda",
            type=EventType.REHEARSAL,
        ),
        Event(
            title="Ensaio Especial de Fevereiro",
            description="Ensaio extra antes do desfile.",
            start_time=now - timedelta(days=97),
            end_time=now - timedelta(days=97) + timedelta(hours=2),
            location="Pavilhão Municipal",
            type=EventType.SPECIAL_REHEARSAL,
        ),
        Event(
            title="Concerto de Carnaval",
            description="Atuação no desfile de carnaval.",
            start_time=now - timedelta(days=90),
            end_time=now - timedelta(days=90) + timedelta(hours=3),
            location="Praça Central",
            type=EventType.CONCERT,
        ),
        Event(
            title="Ensaio de Março",
            description="Ensaio regular de março.",
            start_time=now - timedelta(days=73),
            end_time=now - timedelta(days=73) + timedelta(hours=2),
            location="Sede da Banda",
            type=EventType.REHEARSAL,
        ),
        Event(
            title="Ensaio de Abril",
            description="Preparação para o concerto da Páscoa.",
            start_time=now - timedelta(days=45),
            end_time=now - timedelta(days=45) + timedelta(hours=2),
            location="Sede da Banda",
            type=EventType.REHEARSAL,
        ),
        Event(
            title="Concerto da Páscoa",
            description="Concerto especial de Páscoa.",
            start_time=now - timedelta(days=38),
            end_time=now - timedelta(days=38) + timedelta(hours=3),
            location="Igreja Matriz",
            type=EventType.CONCERT,
        ),
        Event(
            title="Ensaio de Maio I",
            description="Ensaio da primeira semana de maio.",
            start_time=now - timedelta(days=18),
            end_time=now - timedelta(days=18) + timedelta(hours=2),
            location="Sede da Banda",
            type=EventType.REHEARSAL,
        ),
        Event(
            title="Ensaio de Maio II",
            description="Ensaio da segunda semana de maio.",
            start_time=now - timedelta(days=11),
            end_time=now - timedelta(days=11) + timedelta(hours=2),
            location="Sede da Banda",
            type=EventType.REHEARSAL,
        ),
        Event(
            title="Concerto do Dia da Banda",
            description="Celebração do aniversário da banda.",
            start_time=now - timedelta(days=4),
            end_time=now - timedelta(days=4) + timedelta(hours=3),
            location="Praça Central",
            type=EventType.CONCERT,
        ),
        # ── Upcoming ─────────────────────────────────────────────────
        Event(
            title="Ensaio Geral de Primavera",
            description="Preparação do concerto anual.",
            start_time=now + timedelta(days=2),
            end_time=now + timedelta(days=2) + timedelta(hours=2),
            location="Sede da Banda",
            type=EventType.REHEARSAL,
            facebook_link="https://facebook.com/airfa/evento1",
            instagram_link="https://instagram.com/airfa/evento1",
        ),
        Event(
            title="Concerto da Vila",
            description="Atuação na praça central.",
            start_time=now + timedelta(days=7),
            end_time=now + timedelta(days=7) + timedelta(hours=3),
            location="Praça Central",
            type=EventType.CONCERT,
            facebook_link="https://facebook.com/airfa/evento2",
            instagram_link="https://instagram.com/airfa/evento2",
        ),
        Event(
            title="Ensaio de Junho",
            description="Preparação para o verão.",
            start_time=now + timedelta(days=14),
            end_time=now + timedelta(days=14) + timedelta(hours=2),
            location="Sede da Banda",
            type=EventType.REHEARSAL,
        ),
        Event(
            title="Concerto de São João",
            description="Concerto das festas de São João.",
            start_time=now + timedelta(days=32),
            end_time=now + timedelta(days=32) + timedelta(hours=3),
            location="Parque da Cidade",
            type=EventType.CONCERT,
        ),
    ]
    db.add_all(events)
    db.flush()
    return events


def _seed_attendance(db: Session, events: list[Event], users: tuple[User, User, User, User]) -> None:
    super_admin, admin, regular, regular2 = users

    # Status patterns per user across past events (indices 0–9)
    # super_admin: mostly present
    # admin: mostly present, some tardy
    # regular: mix of present/absent/justified
    # regular2: mix of absent/present
    patterns: list[tuple[AttendanceStatus | None, AttendanceStatus | None, AttendanceStatus | None, AttendanceStatus | None]] = [
        # idx 0 – Ensaio de Janeiro
        (AttendanceStatus.PRESENT,  AttendanceStatus.PRESENT,   AttendanceStatus.ABSENT,    AttendanceStatus.PRESENT),
        # idx 1 – Ensaio de Fevereiro
        (AttendanceStatus.PRESENT,  AttendanceStatus.TARDY,     AttendanceStatus.PRESENT,   AttendanceStatus.ABSENT),
        # idx 2 – Ensaio Especial de Fevereiro
        (AttendanceStatus.PRESENT,  AttendanceStatus.PRESENT,   AttendanceStatus.JUSTIFIED, AttendanceStatus.PRESENT),
        # idx 3 – Concerto de Carnaval
        (AttendanceStatus.PRESENT,  AttendanceStatus.PRESENT,   AttendanceStatus.PRESENT,   AttendanceStatus.ABSENT),
        # idx 4 – Ensaio de Março
        (AttendanceStatus.TARDY,    AttendanceStatus.PRESENT,   AttendanceStatus.ABSENT,    AttendanceStatus.JUSTIFIED),
        # idx 5 – Ensaio de Abril
        (AttendanceStatus.PRESENT,  AttendanceStatus.ABSENT,    AttendanceStatus.PRESENT,   AttendanceStatus.PRESENT),
        # idx 6 – Concerto da Páscoa
        (AttendanceStatus.PRESENT,  AttendanceStatus.PRESENT,   AttendanceStatus.TARDY,     AttendanceStatus.PRESENT),
        # idx 7 – Ensaio de Maio I
        (AttendanceStatus.PRESENT,  AttendanceStatus.TARDY,     AttendanceStatus.PRESENT,   AttendanceStatus.ABSENT),
        # idx 8 – Ensaio de Maio II
        (AttendanceStatus.PRESENT,  AttendanceStatus.PRESENT,   AttendanceStatus.JUSTIFIED, AttendanceStatus.PRESENT),
        # idx 9 – Concerto do Dia da Banda
        (AttendanceStatus.PRESENT,  AttendanceStatus.PRESENT,   AttendanceStatus.ABSENT,    AttendanceStatus.TARDY),
    ]

    records: list[EventAttendance] = []
    for idx, (sa_s, ad_s, re_s, r2_s) in enumerate(patterns):
        ev = events[idx]
        records += [
            EventAttendance(event_id=ev.id, user_id=super_admin.id, status=sa_s),
            EventAttendance(event_id=ev.id, user_id=admin.id,       status=ad_s),
            EventAttendance(event_id=ev.id, user_id=regular.id,     status=re_s),
            EventAttendance(event_id=ev.id, user_id=regular2.id,    status=r2_s),
        ]

    # Upcoming events (indices 10–13) — no attendance yet
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
        print(f"- SUPER_ADMIN username: {users[0].username} / {SEED_PASSWORD_SUPER_ADMIN}", flush=True)
        print(f"- ADMIN username: {users[1].username} / {SEED_PASSWORD_ADMIN}", flush=True)
        print(f"- REGULAR username: {users[2].username} / {SEED_PASSWORD_REGULAR}", flush=True)
        print(f"- REGULAR2 username: {users[3].username} / {SEED_PASSWORD_REGULAR}", flush=True)
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_all()
