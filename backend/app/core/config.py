import logging
import os
import socket
import subprocess
from pydantic_settings import BaseSettings

_logger = logging.getLogger(__name__)


def _check_postgres(host: str, port: int = 5432, timeout: float = 0.5) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except (socket.timeout, ConnectionRefusedError, OSError):
        return False


def _default_database_url() -> str:
    configured = os.getenv("DATABASE_URL")
    if configured:
        return configured

    # Docker compose should always inject DATABASE_URL; this fallback targets local dev.
    database_host = os.getenv("DATABASE_HOST")
    if database_host:
        return f"postgresql://airfa:230422@{database_host}:5432/airfa"

    # Works with WSL2 mirrored networking (localhost shared with Windows)
    if _check_postgres("127.0.0.1"):
        return "postgresql://airfa:230422@127.0.0.1:5432/airfa"

    # Fallback: WSL2 NAT gateway (classic mode)
    try:
        wsl_gateway = subprocess.check_output(
            ["sh", "-lc", "ip route | grep default | awk '{print $3; exit}'"],
            text=True,
        ).strip()
        if wsl_gateway and _check_postgres(wsl_gateway):
            return f"postgresql://airfa:230422@{wsl_gateway}:5432/airfa"
    except Exception:
        pass

    return "postgresql://airfa:230422@localhost:5432/airfa"

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Airfa Helper API"
    DATABASE_URL: str = _default_database_url()
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "supersecret")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8
    ALGORITHM: str = "HS256"
    REPERTOIRE_FILES_DIR: str = os.getenv(
        "REPERTOIRE_FILES_DIR",
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "repertoire")),
    )

settings = Settings()

if settings.SECRET_KEY == "supersecret":
    _logger.warning(
        "SECRET_KEY está configurado com o valor inseguro 'supersecret'. "
        "Defina a variável de ambiente SECRET_KEY com um valor aleatório forte em produção."
    )
