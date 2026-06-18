import logging
import os
import socket
from pydantic_settings import BaseSettings, SettingsConfigDict

_logger = logging.getLogger(__name__)


def _check_postgres(host: str, port: int = 5432, timeout: float = 0.5) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except (socket.timeout, ConnectionRefusedError, OSError):
        return False


def _get_wsl_gateway() -> str | None:
    """Read the default gateway from /proc/net/route without spawning a subprocess."""
    try:
        with open("/proc/net/route") as f:
            for line in f.readlines()[1:]:  # skip header
                fields = line.strip().split()
                if len(fields) >= 3 and fields[1] == "00000000":  # default route
                    hex_gw = fields[2]
                    # Little-endian hex → dotted decimal
                    gateway = ".".join(
                        str(int(hex_gw[i : i + 2], 16))
                        for i in reversed(range(0, 8, 2))
                    )
                    return gateway
    except Exception:
        pass
    return None


def _default_database_url() -> str:
    configured = os.getenv("DATABASE_URL")
    if configured:
        return configured

    # Docker compose should always inject DATABASE_URL; this fallback targets local dev only.
    # Credentials must be provided via DATABASE_URL or the explicit env vars below.
    db_user = os.getenv("DB_USER", "airfa")
    db_pass = os.getenv("DB_PASS", "")
    db_name = os.getenv("DB_NAME", "airfa")

    database_host = os.getenv("DATABASE_HOST")
    if database_host:
        return f"postgresql://{db_user}:{db_pass}@{database_host}:5432/{db_name}"

    # Works with WSL2 mirrored networking (localhost shared with Windows)
    if _check_postgres("127.0.0.1"):
        return f"postgresql://{db_user}:{db_pass}@127.0.0.1:5432/{db_name}"

    # Fallback: WSL2 NAT gateway (classic mode) — pure Python, no subprocess
    wsl_gateway = _get_wsl_gateway()
    if wsl_gateway and _check_postgres(wsl_gateway):
        return f"postgresql://{db_user}:{db_pass}@{wsl_gateway}:5432/{db_name}"

    return f"postgresql://{db_user}:{db_pass}@localhost:5432/{db_name}"

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Airfa Helper API"
    # "production" disables interactive API docs and gates the background scheduler.
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
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
