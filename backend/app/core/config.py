import os
from pydantic import BaseSettings

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Airfa Helper API"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://airfa:airfa@db:5432/airfa")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "supersecret")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    ALGORITHM: str = "HS256"

settings = Settings()
