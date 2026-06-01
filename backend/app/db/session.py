from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,  # descarta conexões mortas automaticamente
    pool_recycle=1800,   # recicla conexões após 30 min
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
