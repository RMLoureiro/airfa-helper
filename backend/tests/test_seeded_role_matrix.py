from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.seed.seed import seed_all


SUPER_ADMIN_EMAIL = os.getenv("SUPER_ADMIN_EMAIL", "superadmin@airfa.pt")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@airfa.pt")
REGULAR_EMAIL = os.getenv("REGULAR_EMAIL", "membro@airfa.pt")
SUPER_ADMIN_PASSWORD = os.getenv("SEED_SUPER_ADMIN_PASSWORD", "admin123")
ADMIN_PASSWORD = os.getenv("SEED_ADMIN_PASSWORD", "admin123")
REGULAR_PASSWORD = os.getenv("SEED_REGULAR_PASSWORD", "admin123")


@pytest.fixture(scope="module")
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="module", autouse=True)
def seeded_database() -> None:
    seed_all()


def _login(client: TestClient, email: str, password: str) -> str:
    response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200
    return response.json()["access_token"]


def _headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def super_admin_token(client: TestClient) -> str:
    return _login(client, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD)


@pytest.fixture(scope="module")
def admin_token(client: TestClient) -> str:
    return _login(client, ADMIN_EMAIL, ADMIN_PASSWORD)


@pytest.fixture(scope="module")
def regular_token(client: TestClient) -> str:
    return _login(client, REGULAR_EMAIL, REGULAR_PASSWORD)


def test_home_is_accessible_for_all_roles(
    client: TestClient,
    super_admin_token: str,
    admin_token: str,
    regular_token: str,
):
    for token in (super_admin_token, admin_token, regular_token):
        response = client.get("/api/v1/home", headers=_headers(token))
        assert response.status_code == 200
        payload = response.json()
        assert "upcoming_birthdays" in payload
        assert isinstance(payload["upcoming_birthdays"], list)


def test_members_permissions(client: TestClient, admin_token: str, regular_token: str):
    admin_response = client.get("/api/v1/members", headers=_headers(admin_token))
    assert admin_response.status_code == 200
    assert any(member["email"] == REGULAR_EMAIL for member in admin_response.json())

    regular_response = client.get("/api/v1/members", headers=_headers(regular_token))
    assert regular_response.status_code == 403


def test_events_permissions(client: TestClient, admin_token: str, regular_token: str, super_admin_token: str):
    create_payload = {
        "title": "Evento Role Matrix",
        "description": "Criado durante testes de permissões.",
        "start_time": "2030-01-10T20:00:00+00:00",
        "end_time": "2030-01-10T22:00:00+00:00",
        "location": "Auditório",
        "type": "CONCERT",
        "facebook_link": "https://facebook.com/airfa/role-matrix",
        "instagram_link": "https://instagram.com/airfa/role-matrix",
    }

    regular_create = client.post("/api/v1/events", json=create_payload, headers=_headers(regular_token))
    assert regular_create.status_code == 403

    admin_create = client.post("/api/v1/events", json=create_payload, headers=_headers(admin_token))
    assert admin_create.status_code == 200
    created_event_id = admin_create.json()["id"]

    admin_delete = client.delete(f"/api/v1/events/{created_event_id}", headers=_headers(admin_token))
    assert admin_delete.status_code == 403

    super_admin_delete = client.delete(
        f"/api/v1/events/{created_event_id}",
        headers=_headers(super_admin_token),
    )
    assert super_admin_delete.status_code == 200


def test_newsletter_permissions(client: TestClient, admin_token: str, regular_token: str):
    regular_create = client.post(
        "/api/v1/newsletter",
        json={"title": "Nao deve criar", "content": "Sem permissao"},
        headers=_headers(regular_token),
    )
    assert regular_create.status_code == 403

    admin_create = client.post(
        "/api/v1/newsletter",
        json={"title": "Nota interna", "content": "Publicacao criada por admin."},
        headers=_headers(admin_token),
    )
    assert admin_create.status_code == 200


def test_instruments_and_reports(client: TestClient, admin_token: str, regular_token: str):
    regular_instruments = client.get("/api/v1/instruments", headers=_headers(regular_token))
    assert regular_instruments.status_code == 200

    instrument_id = regular_instruments.json()[0]["id"]

    report_create = client.post(
        f"/api/v1/instruments/{instrument_id}/reports",
        json={
            "report_type": "FIX",
            "severity": "SMALL",
            "description": "Teste de report por utilizador regular.",
        },
        headers=_headers(regular_token),
    )
    assert report_create.status_code == 200

    reports_list = client.get("/api/v1/instruments/reports", headers=_headers(admin_token))
    assert reports_list.status_code == 200
    assert len(reports_list.json()) >= 1


def test_presences_analytics_permissions(client: TestClient, admin_token: str, regular_token: str):
    regular_analytics = client.get("/api/v1/presences/analytics/members", headers=_headers(regular_token))
    assert regular_analytics.status_code == 403

    admin_analytics = client.get("/api/v1/presences/analytics/members", headers=_headers(admin_token))
    assert admin_analytics.status_code == 200
    assert isinstance(admin_analytics.json(), list)


def test_repertoire_permissions(client: TestClient, admin_token: str, regular_token: str):
    regular_create = client.post(
        "/api/v1/repertoire",
        json={
            "title": "Obra regular",
            "youtube_link": None,
            "folder_path": None,
            "state": "CURRENT",
        },
        headers=_headers(regular_token),
    )
    assert regular_create.status_code == 403

    admin_create = client.post(
        "/api/v1/repertoire",
        json={
            "title": "Obra admin",
            "youtube_link": "https://youtube.com/watch?v=role-matrix",
            "folder_path": "obra-admin-role-matrix",
            "state": "CURRENT",
        },
        headers=_headers(admin_token),
    )
    assert admin_create.status_code == 200

    regular_list = client.get("/api/v1/repertoire", headers=_headers(regular_token))
    assert regular_list.status_code == 200
    assert any(item["title"] == "Obra admin" for item in regular_list.json())
