from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
import sys
import os
import subprocess
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.db.base import Base
import app.models  # noqa: F401 — registers all ORM models with Base.metadata
from app.core.config import settings

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
fileConfig(config.config_file_name)

target_metadata = Base.metadata

def get_url() -> str:
    database_url = os.environ.get("DATABASE_URL")
    if database_url:
        return database_url

    try:
        host = subprocess.check_output(
            ["sh", "-lc", "ip route | grep default | awk '{print $3; exit}'"],
            text=True,
        ).strip()
        if host:
            return f"postgresql://airfa:230422@{host}:5432/airfa"
    except Exception:
        pass

    return config.get_main_option("sqlalchemy.url")

def run_migrations_offline():
    url = get_url()
    context.configure(
        url=url, target_metadata=target_metadata, literal_binds=True, compare_type=True
    )
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    from sqlalchemy import create_engine
    connectable = create_engine(get_url(), poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata, compare_type=True
        )
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
