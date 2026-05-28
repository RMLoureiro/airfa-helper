from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token, get_password_hash
from app.main import app
from app.db.session import SessionLocal
from app.models.enums import EventType, InstrumentState, InstrumentType, SystemRole
from app.models.event import Event
from app.models.event_attendance import EventAttendance
from app.models.instrument import Instrument
from app.models.instrument_report import InstrumentReport
from app.models.notification import Notification
from app.models.user import User


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _auth_header(user: User) -> dict[str, str]:
    token = create_access_token(subject=user.username)
    return {"Authorization": f"Bearer {token}"}


def _create_user(db, role: SystemRole) -> User:
    identifier = uuid4().hex[:12]
    user = User(
        username=f"test-{identifier}",
        hashed_password=get_password_hash("test12345"),
        name=f"Test User {identifier}",
        system_role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _create_event(db) -> Event:
    now = datetime.now(timezone.utc)
    event = Event(
        title=f"Evento Teste {uuid4().hex[:8]}",
        description="evento para testes",
        start_time=now + timedelta(days=1),
        end_time=now + timedelta(days=1, hours=2),
        location="Auditório",
        type=EventType.REHEARSAL,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def _create_instrument(db) -> Instrument:
    instrument = Instrument(
        type=InstrumentType.CLARINET,
        make="Yamaha",
        model="YCL-255",
        state=InstrumentState.OK,
    )
    db.add(instrument)
    db.commit()
    db.refresh(instrument)
    return instrument


def _cleanup_user(db, user: User) -> None:
    db.query(Notification).filter(Notification.user_id == user.id).delete(synchronize_session=False)
    db.query(InstrumentReport).filter(InstrumentReport.user_id == user.id).delete(synchronize_session=False)
    db.query(EventAttendance).filter(EventAttendance.user_id == user.id).delete(synchronize_session=False)
    db.query(Instrument).filter(Instrument.user_id == user.id).update({"user_id": None}, synchronize_session=False)
    db.query(User).filter(User.id == user.id).delete(synchronize_session=False)
    db.commit()


@pytest.mark.integration
def test_delete_event_returns_403_for_regular_user(client: TestClient, db_session):
    regular_user = _create_user(db_session, SystemRole.REGULAR)
    event = _create_event(db_session)

    try:
        response = client.delete(f"/api/v1/events/{event.id}", headers=_auth_header(regular_user))
        assert response.status_code == 403
    finally:
        db_session.query(Event).filter(Event.id == event.id).delete(synchronize_session=False)
        _cleanup_user(db_session, regular_user)


@pytest.mark.integration
def test_update_missing_event_returns_404_for_admin(client: TestClient, db_session):
    admin_user = _create_user(db_session, SystemRole.ADMIN)

    payload = {
        "title": "Evento inexistente",
        "description": "teste",
        "start_time": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
        "end_time": (datetime.now(timezone.utc) + timedelta(days=2, hours=1)).isoformat(),
        "location": "Sala",
        "type": "REHEARSAL",
        "facebook_link": None,
        "instagram_link": None,
    }

    try:
        response = client.put("/api/v1/events/999999", json=payload, headers=_auth_header(admin_user))
        assert response.status_code == 404
    finally:
        _cleanup_user(db_session, admin_user)


@pytest.mark.integration
def test_assign_missing_instrument_returns_404_for_admin(client: TestClient, db_session):
    admin_user = _create_user(db_session, SystemRole.ADMIN)

    try:
        response = client.post(
            "/api/v1/instruments/999999/assign",
            params={"user_id": admin_user.id},
            headers=_auth_header(admin_user),
        )
        assert response.status_code == 404
    finally:
        _cleanup_user(db_session, admin_user)


@pytest.mark.integration
def test_assign_instrument_missing_member_returns_404_for_admin(client: TestClient, db_session):
    admin_user = _create_user(db_session, SystemRole.ADMIN)
    instrument = _create_instrument(db_session)

    try:
        response = client.post(
            f"/api/v1/instruments/{instrument.id}/assign",
            params={"user_id": 999999},
            headers=_auth_header(admin_user),
        )
        assert response.status_code == 404
    finally:
        db_session.query(Instrument).filter(Instrument.id == instrument.id).delete(synchronize_session=False)
        db_session.commit()
        _cleanup_user(db_session, admin_user)


@pytest.mark.integration
def test_create_report_missing_instrument_returns_404(client: TestClient, db_session):
    regular_user = _create_user(db_session, SystemRole.REGULAR)

    payload = {
        "report_type": "FIX",
        "severity": "SMALL",
        "description": "falta uma chave",
    }

    try:
        response = client.post(
            "/api/v1/instruments/999999/reports",
            json=payload,
            headers=_auth_header(regular_user),
        )
        assert response.status_code == 404
    finally:
        _cleanup_user(db_session, regular_user)


@pytest.mark.integration
def test_mark_missing_notification_returns_404(client: TestClient, db_session):
    regular_user = _create_user(db_session, SystemRole.REGULAR)

    try:
        response = client.put("/api/v1/notifications/999999/read", headers=_auth_header(regular_user))
        assert response.status_code == 404
    finally:
        _cleanup_user(db_session, regular_user)
