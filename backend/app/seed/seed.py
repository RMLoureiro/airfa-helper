from __future__ import annotations

import logging
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
from app.models.event_reinforcement import EventReinforcement
from app.models.instrument import Instrument
from app.models.instrument_report import InstrumentReport
from app.models.newsletter import Newsletter
from app.models.notification import Notification
from app.models.reinforcement import Reinforcement
from app.models.report import Report
from app.models.repertoire import Repertoire
from app.models.user import User


SEED_PASSWORD_SUPER_ADMIN = os.getenv("SEED_SUPER_ADMIN_PASSWORD", "admin123")
SEED_PASSWORD_ADMIN = os.getenv("SEED_ADMIN_PASSWORD", "admin123")
SEED_PASSWORD_REGULAR = os.getenv("SEED_REGULAR_PASSWORD", "admin123")

_logger = logging.getLogger(__name__)


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

    # ── Academic year 2024/2025 (fixed dates: Sep 2024 – Jul 2025) ──────────
    ay24_events = [
        Event(
            title="Ensaio de Setembro 2024",
            description="Início do ano letivo 2024/2025.",
            start_time=datetime(2024, 9, 14, 20, 0, tzinfo=timezone.utc),
            end_time=datetime(2024, 9, 14, 22, 0, tzinfo=timezone.utc),
            location="Sede da Banda",
            type=EventType.REHEARSAL,
        ),
        Event(
            title="Ensaio de Outubro 2024",
            description="Ensaio regular de outubro.",
            start_time=datetime(2024, 10, 12, 20, 0, tzinfo=timezone.utc),
            end_time=datetime(2024, 10, 12, 22, 0, tzinfo=timezone.utc),
            location="Sede da Banda",
            type=EventType.REHEARSAL,
        ),
        Event(
            title="Concerto de Outono 2024",
            description="Concerto de outono anual.",
            start_time=datetime(2024, 11, 9, 17, 0, tzinfo=timezone.utc),
            end_time=datetime(2024, 11, 9, 20, 0, tzinfo=timezone.utc),
            location="Auditório Municipal",
            type=EventType.CONCERT,
        ),
        Event(
            title="Ensaio de Novembro 2024",
            description="Preparação para o natal.",
            start_time=datetime(2024, 11, 23, 20, 0, tzinfo=timezone.utc),
            end_time=datetime(2024, 11, 23, 22, 0, tzinfo=timezone.utc),
            location="Sede da Banda",
            type=EventType.REHEARSAL,
        ),
        Event(
            title="Concerto de Natal 2024",
            description="Concerto especial de Natal.",
            start_time=datetime(2024, 12, 21, 17, 0, tzinfo=timezone.utc),
            end_time=datetime(2024, 12, 21, 20, 0, tzinfo=timezone.utc),
            location="Igreja Matriz",
            type=EventType.CONCERT,
        ),
        Event(
            title="Ensaio de Janeiro 2025",
            description="Primeiro ensaio de 2025.",
            start_time=datetime(2025, 1, 11, 20, 0, tzinfo=timezone.utc),
            end_time=datetime(2025, 1, 11, 22, 0, tzinfo=timezone.utc),
            location="Sede da Banda",
            type=EventType.REHEARSAL,
        ),
        Event(
            title="Ensaio de Fevereiro 2025",
            description="Preparação para o carnaval.",
            start_time=datetime(2025, 2, 8, 20, 0, tzinfo=timezone.utc),
            end_time=datetime(2025, 2, 8, 22, 0, tzinfo=timezone.utc),
            location="Sede da Banda",
            type=EventType.REHEARSAL,
        ),
        Event(
            title="Concerto de Carnaval 2025",
            description="Atuação no desfile de carnaval.",
            start_time=datetime(2025, 3, 1, 15, 0, tzinfo=timezone.utc),
            end_time=datetime(2025, 3, 1, 18, 0, tzinfo=timezone.utc),
            location="Praça Central",
            type=EventType.CONCERT,
        ),
        Event(
            title="Ensaio de Março 2025",
            description="Ensaio regular de março.",
            start_time=datetime(2025, 3, 22, 20, 0, tzinfo=timezone.utc),
            end_time=datetime(2025, 3, 22, 22, 0, tzinfo=timezone.utc),
            location="Sede da Banda",
            type=EventType.REHEARSAL,
        ),
        Event(
            title="Concerto da Páscoa 2025",
            description="Concerto especial de Páscoa.",
            start_time=datetime(2025, 4, 19, 17, 0, tzinfo=timezone.utc),
            end_time=datetime(2025, 4, 19, 20, 0, tzinfo=timezone.utc),
            location="Igreja Matriz",
            type=EventType.CONCERT,
        ),
        Event(
            title="Ensaio de Maio 2025",
            description="Preparação para o concerto de primavera.",
            start_time=datetime(2025, 5, 10, 20, 0, tzinfo=timezone.utc),
            end_time=datetime(2025, 5, 10, 22, 0, tzinfo=timezone.utc),
            location="Sede da Banda",
            type=EventType.REHEARSAL,
        ),
        Event(
            title="Concerto de Primavera 2025",
            description="Concerto anual de primavera.",
            start_time=datetime(2025, 6, 7, 17, 0, tzinfo=timezone.utc),
            end_time=datetime(2025, 6, 7, 20, 0, tzinfo=timezone.utc),
            location="Parque da Cidade",
            type=EventType.CONCERT,
        ),
        Event(
            title="Ensaio Final 2024/2025",
            description="Último ensaio do ano letivo.",
            start_time=datetime(2025, 7, 5, 20, 0, tzinfo=timezone.utc),
            end_time=datetime(2025, 7, 5, 22, 0, tzinfo=timezone.utc),
            location="Sede da Banda",
            type=EventType.REHEARSAL,
        ),
    ]

    # ── Academic year 2025/2026 (relative to now) ─────────────────────────────
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
    db.add_all(ay24_events)
    db.add_all(events)
    db.flush()
    return ay24_events + events


def _seed_attendance(db: Session, events: list[Event], users: tuple[User, User, User, User]) -> None:
    super_admin, admin, regular, regular2 = users

    # events[0..12]  = academic year 2024/2025 (13 events: 8 rehearsals + 4 concerts + 1 special)
    # events[13..26] = academic year 2025/2026 (14 events: 10 past + 4 upcoming)

    # Attendance patterns for 2024/2025 (indices 0–12)
    patterns_ay24: list[tuple] = [
        # idx 0 – Ensaio de Setembro 2024
        (AttendanceStatus.PRESENT,  AttendanceStatus.PRESENT,   AttendanceStatus.PRESENT,   AttendanceStatus.ABSENT),
        # idx 1 – Ensaio de Outubro 2024
        (AttendanceStatus.PRESENT,  AttendanceStatus.TARDY,     AttendanceStatus.ABSENT,    AttendanceStatus.PRESENT),
        # idx 2 – Concerto de Outono 2024
        (AttendanceStatus.PRESENT,  AttendanceStatus.PRESENT,   AttendanceStatus.PRESENT,   AttendanceStatus.PRESENT),
        # idx 3 – Ensaio de Novembro 2024
        (AttendanceStatus.PRESENT,  AttendanceStatus.PRESENT,   AttendanceStatus.JUSTIFIED, AttendanceStatus.ABSENT),
        # idx 4 – Concerto de Natal 2024
        (AttendanceStatus.PRESENT,  AttendanceStatus.PRESENT,   AttendanceStatus.ABSENT,    AttendanceStatus.PRESENT),
        # idx 5 – Ensaio de Janeiro 2025
        (AttendanceStatus.TARDY,    AttendanceStatus.PRESENT,   AttendanceStatus.PRESENT,   AttendanceStatus.PRESENT),
        # idx 6 – Ensaio de Fevereiro 2025
        (AttendanceStatus.PRESENT,  AttendanceStatus.ABSENT,    AttendanceStatus.PRESENT,   AttendanceStatus.TARDY),
        # idx 7 – Concerto de Carnaval 2025
        (AttendanceStatus.PRESENT,  AttendanceStatus.PRESENT,   AttendanceStatus.TARDY,     AttendanceStatus.PRESENT),
        # idx 8 – Ensaio de Março 2025
        (AttendanceStatus.PRESENT,  AttendanceStatus.TARDY,     AttendanceStatus.ABSENT,    AttendanceStatus.PRESENT),
        # idx 9 – Concerto da Páscoa 2025
        (AttendanceStatus.PRESENT,  AttendanceStatus.PRESENT,   AttendanceStatus.JUSTIFIED, AttendanceStatus.ABSENT),
        # idx 10 – Ensaio de Maio 2025
        (AttendanceStatus.PRESENT,  AttendanceStatus.PRESENT,   AttendanceStatus.PRESENT,   AttendanceStatus.PRESENT),
        # idx 11 – Concerto de Primavera 2025
        (AttendanceStatus.PRESENT,  AttendanceStatus.PRESENT,   AttendanceStatus.ABSENT,    AttendanceStatus.PRESENT),
        # idx 12 – Ensaio Final 2024/2025
        (AttendanceStatus.ABSENT,   AttendanceStatus.PRESENT,   AttendanceStatus.PRESENT,   AttendanceStatus.JUSTIFIED),
    ]

    # Attendance patterns for 2025/2026 past events (indices 13–22, i.e. events[13..22])
    patterns_ay25: list[tuple] = [
        # idx 0 (ev 13) – Ensaio de Janeiro
        (AttendanceStatus.PRESENT,  AttendanceStatus.PRESENT,   AttendanceStatus.ABSENT,    AttendanceStatus.PRESENT),
        # idx 1 (ev 14) – Ensaio de Fevereiro
        (AttendanceStatus.PRESENT,  AttendanceStatus.TARDY,     AttendanceStatus.PRESENT,   AttendanceStatus.ABSENT),
        # idx 2 (ev 15) – Ensaio Especial de Fevereiro
        (AttendanceStatus.PRESENT,  AttendanceStatus.PRESENT,   AttendanceStatus.JUSTIFIED, AttendanceStatus.PRESENT),
        # idx 3 (ev 16) – Concerto de Carnaval
        (AttendanceStatus.PRESENT,  AttendanceStatus.PRESENT,   AttendanceStatus.PRESENT,   AttendanceStatus.ABSENT),
        # idx 4 (ev 17) – Ensaio de Março
        (AttendanceStatus.TARDY,    AttendanceStatus.PRESENT,   AttendanceStatus.ABSENT,    AttendanceStatus.JUSTIFIED),
        # idx 5 (ev 18) – Ensaio de Abril
        (AttendanceStatus.PRESENT,  AttendanceStatus.ABSENT,    AttendanceStatus.PRESENT,   AttendanceStatus.PRESENT),
        # idx 6 (ev 19) – Concerto da Páscoa
        (AttendanceStatus.PRESENT,  AttendanceStatus.PRESENT,   AttendanceStatus.TARDY,     AttendanceStatus.PRESENT),
        # idx 7 (ev 20) – Ensaio de Maio I
        (AttendanceStatus.PRESENT,  AttendanceStatus.TARDY,     AttendanceStatus.PRESENT,   AttendanceStatus.ABSENT),
        # idx 8 (ev 21) – Ensaio de Maio II
        (AttendanceStatus.PRESENT,  AttendanceStatus.PRESENT,   AttendanceStatus.JUSTIFIED, AttendanceStatus.PRESENT),
        # idx 9 (ev 22) – Concerto do Dia da Banda
        (AttendanceStatus.PRESENT,  AttendanceStatus.PRESENT,   AttendanceStatus.ABSENT,    AttendanceStatus.TARDY),
    ]

    records: list[EventAttendance] = []

    # 2024/2025 attendance
    for idx, (sa_s, ad_s, re_s, r2_s) in enumerate(patterns_ay24):
        ev = events[idx]
        records += [
            EventAttendance(event_id=ev.id, user_id=super_admin.id, status=sa_s),
            EventAttendance(event_id=ev.id, user_id=admin.id,       status=ad_s),
            EventAttendance(event_id=ev.id, user_id=regular.id,     status=re_s),
            EventAttendance(event_id=ev.id, user_id=regular2.id,    status=r2_s),
        ]

    # 2025/2026 attendance (past events only, indices 13..22)
    ay25_start = 13
    for idx, (sa_s, ad_s, re_s, r2_s) in enumerate(patterns_ay25):
        ev = events[ay25_start + idx]
        records += [
            EventAttendance(event_id=ev.id, user_id=super_admin.id, status=sa_s),
            EventAttendance(event_id=ev.id, user_id=admin.id,       status=ad_s),
            EventAttendance(event_id=ev.id, user_id=regular.id,     status=re_s),
            EventAttendance(event_id=ev.id, user_id=regular2.id,    status=r2_s),
        ]

    # Upcoming events (indices 23–26) — no attendance yet
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
        # super_admin
        Notification(user_id=super_admin.id, type=NotificationType.EVENT,      content=f"Evento agendado: {events[0].title}",               read=False),
        Notification(user_id=super_admin.id, type=NotificationType.EVENT,      content=f"Lembrete: {events[1].title} é amanhã.",             read=False),
        Notification(user_id=super_admin.id, type=NotificationType.NEWSLETTER, content=f"Nova publicação: {newsletters[0].title}",           read=False),
        Notification(user_id=super_admin.id, type=NotificationType.BIRTHDAY,   content="Hoje faz anos um membro da banda.",                  read=True),
        Notification(user_id=super_admin.id, type=NotificationType.REPORT,     content="Um novo relatório foi submetido.",                   read=True),
        # admin
        Notification(user_id=admin.id, type=NotificationType.NEWSLETTER, content=f"Nova publicação: {newsletters[0].title}",                read=False),
        Notification(user_id=admin.id, type=NotificationType.EVENT,      content=f"Evento agendado: {events[2].title}",                     read=False),
        Notification(user_id=admin.id, type=NotificationType.BIRTHDAY,   content="Hoje faz anos um membro da banda.",                       read=False),
        Notification(user_id=admin.id, type=NotificationType.REPORT,     content="Um novo relatório foi submetido.",                        read=True),
        # regular
        Notification(user_id=regular.id, type=NotificationType.BIRTHDAY, content="Hoje faz anos um membro da banda.",                       read=False),
        Notification(user_id=regular.id, type=NotificationType.EVENT,    content=f"Novo evento adicionado: {events[0].title}",              read=False),
        Notification(user_id=regular.id, type=NotificationType.EVENT,    content=f"Lembrete: {events[1].title} é amanhã.",                  read=True),
        Notification(user_id=regular.id, type=NotificationType.BIRTHDAY, content="Parabéns! Hoje é teu aniversário.",                       read=True),
        # regular2
        Notification(user_id=regular2.id, type=NotificationType.BIRTHDAY, content="Hoje faz anos um membro da banda.",                      read=False),
        Notification(user_id=regular2.id, type=NotificationType.EVENT,   content=f"Novo evento adicionado: {events[2].title}",              read=False),
        Notification(user_id=regular2.id, type=NotificationType.NEWSLETTER, content=f"Nova publicação: {newsletters[0].title}",             read=False),
        Notification(user_id=regular2.id, type=NotificationType.EVENT,   content=f"Lembrete: {events[0].title} é amanhã.",                  read=True),
    ]
    db.add_all(notifications)


def _seed_reinforcements(db: Session, events: list[Event]) -> None:
    db.query(EventReinforcement).delete(synchronize_session=False)
    db.query(Reinforcement).delete(synchronize_session=False)

    rui    = Reinforcement(name="Rui Ferreira",   instrument="Tuba",      contact="910111001", usual_fee=50.00)
    ana    = Reinforcement(name="Ana Moreira",    instrument="Flauta",    contact="910111002", usual_fee=45.00)
    carlos = Reinforcement(name="Carlos Neves",   instrument="Trombone",  contact="910111003", usual_fee=50.00)
    sofia  = Reinforcement(name="Sofia Lopes",    instrument="Clarinete", contact="910111004", usual_fee=40.00)
    bruno  = Reinforcement(name="Bruno Santos",   instrument="Percussão", contact="910111005", usual_fee=55.00)

    db.add_all([rui, ana, carlos, sofia, bruno])
    db.flush()

    # events[0..12] = 2024/2025 · events[13..26] = 2025/2026
    # Concerts: [2]=Outono24  [4]=Natal24  [7]=Carnaval25  [9]=Pascoa25  [11]=Primavera25
    #           [16]=Carnaval26  [19]=Pascoa26  [22]=DiaBanda26
    assignments = [
        # 2024/2025
        (events[2],  rui,    50.00),
        (events[2],  ana,    45.00),
        (events[4],  rui,    50.00),
        (events[4],  carlos, 50.00),
        (events[4],  bruno,  55.00),
        (events[7],  ana,    45.00),
        (events[7],  sofia,  40.00),
        (events[11], rui,    50.00),
        (events[11], ana,    45.00),
        (events[11], carlos, 50.00),
        # 2025/2026
        (events[16], carlos, 50.00),
        (events[16], bruno,  55.00),
        (events[19], rui,    50.00),
        (events[19], sofia,  40.00),
        (events[22], ana,    45.00),
        (events[22], bruno,  55.00),
    ]
    db.add_all([
        EventReinforcement(event_id=ev.id, reinforcement_id=rf.id, fee=fee)
        for ev, rf, fee in assignments
    ])


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


def seed_prod() -> None:
    """Production seed: only creates / updates the super admin account."""
    db: Session = SessionLocal()
    try:
        super_admin = _upsert_user(
            db,
            {
                "username": os.getenv("SUPER_ADMIN_USERNAME", "superadmin"),
                "email": os.getenv("SUPER_ADMIN_USERNAME", "superadmin"),
                "hashed_password": get_password_hash(SEED_PASSWORD_SUPER_ADMIN),
                "name": os.getenv("SUPER_ADMIN_NAME", "Super Admin Airfa"),
                "phone": "910000000",
                "birth_date": date(1985, 1, 1),
                "address": "",
                "join_year": 2000,
                "system_role": SystemRole.SUPER_ADMIN,
                "musical_role": MusicalRole.TRUMPET_PLAYER,
            },
        )
        db.commit()
        _logger.info("Super admin criado/atualizado: %s", super_admin.username)
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def seed_all() -> None:
    db: Session = SessionLocal()
    try:
        users = _seed_users(db)
        events = _seed_events(db)
        _seed_attendance(db, events, users)
        instruments = _seed_instruments(db, users)
        _seed_instrument_reports(db, instruments, users)
        newsletters = _seed_newsletter(db, users)
        _seed_repertoire(db)
        _seed_notifications(db, users, events, newsletters)
        _seed_reinforcements(db, events)
        _seed_reports(db, users)

        db.commit()

        _logger.info("Seed completa aplicada com sucesso.")
        _logger.info(
            "Utilizadores de seed criados: %s, %s, %s, %s. "
            "Use SEED_SUPER_ADMIN_PASSWORD / SEED_ADMIN_PASSWORD / SEED_REGULAR_PASSWORD "
            "para personalizar as passwords (por omissão: admin123).",
            users[0].username, users[1].username, users[2].username, users[3].username,
        )
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    if os.getenv("SEED_DEMO", "false").lower() == "true":
        seed_all()
    else:
        seed_prod()
