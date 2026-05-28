from datetime import date
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import get_password_hash
from app.main import app
from app.db.session import SessionLocal
from app.models.enums import NotificationType, RepertoireState, SystemRole
from app.models.newsletter import Newsletter
from app.models.notification import Notification
from app.models.repertoire import Repertoire
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


def _create_user(db, role: SystemRole, password: str = "testpassword123") -> User:
    identifier = uuid4().hex[:12]
    user = User(
        username=f"test-{identifier}",
        hashed_password=get_password_hash(password),
        name=f"Test User {identifier}",
        system_role=role,
        birth_date=date(1990, 1, 1),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _login(client: TestClient, username: str, password: str) -> str:
    response = client.post("/api/v1/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200
    return response.json()["access_token"]


def _cleanup_user(db, user_id: int) -> None:
    db.query(Notification).filter(Notification.user_id == user_id).delete(synchronize_session=False)
    db.query(Newsletter).filter(Newsletter.author_id == user_id).delete(synchronize_session=False)
    db.query(User).filter(User.id == user_id).delete(synchronize_session=False)
    db.commit()


def _cleanup_repertoire(db, repertoire_id: int) -> None:
    repertoire = db.query(Repertoire).filter(Repertoire.id == repertoire_id).first()
    if not repertoire:
        return

    if repertoire.folder_path:
        base_dir = Path(settings.REPERTOIRE_FILES_DIR)
        folder = base_dir / repertoire.folder_path
        if folder.exists() and folder.is_dir():
            for child in folder.iterdir():
                if child.is_file():
                    child.unlink(missing_ok=True)
            try:
                folder.rmdir()
            except OSError:
                pass

    db.delete(repertoire)
    db.commit()


@pytest.mark.integration
def test_auth_login_and_me_success(client: TestClient, db_session):
    user = _create_user(db_session, SystemRole.REGULAR, password="testpassword123")

    try:
        token = _login(client, user.username, "testpassword123")
        response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        payload = response.json()
        assert payload["username"] == user.username
        assert payload["system_role"] == "REGULAR"
    finally:
        _cleanup_user(db_session, user.id)


@pytest.mark.integration
def test_super_admin_member_create_and_update_success(client: TestClient, db_session):
    super_admin = _create_user(db_session, SystemRole.SUPER_ADMIN, password="superpassword123")

    created_member_id = None
    try:
        token = _login(client, super_admin.username, "superpassword123")
        headers = {"Authorization": f"Bearer {token}"}

        member_username = f"member-{uuid4().hex[:8]}"
        create_payload = {
            "username": member_username,
            "name": "Novo Membro",
            "password": "memberpassword123",
            "system_role": "REGULAR",
            "musical_role": "CLARINET_PLAYER",
            "phone": "910000000",
            "birth_date": "1995-02-10",
            "address": "Rua da Banda",
            "join_year": 2020,
        }

        create_response = client.post("/api/v1/members", json=create_payload, headers=headers)
        assert create_response.status_code == 200
        created = create_response.json()
        created_member_id = created["id"]
        assert created["username"] == member_username

        update_payload = {
            "name": "Membro Atualizado",
            "system_role": "ADMIN",
        }
        update_response = client.put(
            f"/api/v1/members/{created_member_id}",
            json=update_payload,
            headers=headers,
        )
        assert update_response.status_code == 200
        updated = update_response.json()
        assert updated["name"] == "Membro Atualizado"
        assert updated["system_role"] == "ADMIN"
    finally:
        if created_member_id is not None:
            _cleanup_user(db_session, created_member_id)
        _cleanup_user(db_session, super_admin.id)


@pytest.mark.integration
def test_admin_newsletter_create_and_list_success(client: TestClient, db_session):
    admin = _create_user(db_session, SystemRole.ADMIN, password="adminpassword123")

    created_newsletter_id = None
    try:
        token = _login(client, admin.username, "adminpassword123")
        headers = {"Authorization": f"Bearer {token}"}

        title = f"Publicacao {uuid4().hex[:8]}"
        create_response = client.post(
            "/api/v1/newsletter",
            json={"title": title, "content": "Conteúdo de teste"},
            headers=headers,
        )
        assert create_response.status_code == 200
        created = create_response.json()
        created_newsletter_id = created["id"]
        assert created["title"] == title
        assert created["author_id"] == admin.id

        list_response = client.get("/api/v1/newsletter", headers=headers)
        assert list_response.status_code == 200
        items = list_response.json()
        assert any(item["id"] == created_newsletter_id for item in items)

        notifications = (
            db_session.query(Notification)
            .filter(Notification.user_id == admin.id)
            .filter(Notification.type == NotificationType.NEWSLETTER)
            .all()
        )
        assert len(notifications) >= 1
    finally:
        if created_newsletter_id is not None:
            db_session.query(Newsletter).filter(Newsletter.id == created_newsletter_id).delete(synchronize_session=False)
            db_session.commit()
        _cleanup_user(db_session, admin.id)


@pytest.mark.integration
def test_admin_repertoire_create_upload_and_list_files_success(client: TestClient, db_session):
    admin = _create_user(db_session, SystemRole.ADMIN, password="adminpassword123")

    repertoire_id = None
    try:
        token = _login(client, admin.username, "adminpassword123")
        headers = {"Authorization": f"Bearer {token}"}

        create_payload = {
            "title": f"Obra {uuid4().hex[:8]}",
            "youtube_link": None,
            "folder_path": None,
            "state": RepertoireState.CURRENT.value,
        }

        create_response = client.post("/api/v1/repertoire", json=create_payload, headers=headers)
        assert create_response.status_code == 200
        repertoire = create_response.json()
        repertoire_id = repertoire["id"]

        files = [
            (
                "files",
                ("parte-clarinete.pdf", b"%PDF-1.4\n%test-pdf\n", "application/pdf"),
            )
        ]
        upload_response = client.post(
            f"/api/v1/repertoire/{repertoire_id}/files",
            headers=headers,
            files=files,
        )
        assert upload_response.status_code == 200

        list_response = client.get(f"/api/v1/repertoire/{repertoire_id}/files", headers=headers)
        assert list_response.status_code == 200
        listed = list_response.json()
        assert any(item["name"] == "parte-clarinete.pdf" for item in listed)
    finally:
        if repertoire_id is not None:
            _cleanup_repertoire(db_session, repertoire_id)
        _cleanup_user(db_session, admin.id)
