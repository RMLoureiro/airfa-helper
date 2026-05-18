from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler

from app.api.v1.api import api_router
from app.core.config import settings
from app.services.birthday_notifications import send_daily_birthday_notifications
from app.services.maintenance_jobs import (
    cleanup_old_newsletter_items,
    generate_upcoming_birthday_events,
)

scheduler = BackgroundScheduler(timezone="Europe/Lisbon")


@asynccontextmanager
async def lifespan(app: FastAPI):
    send_daily_birthday_notifications()
    generate_upcoming_birthday_events()
    cleanup_old_newsletter_items()

    scheduler.add_job(
        send_daily_birthday_notifications,
        "cron",
        id="daily_birthday_notifications",
        hour=8,
        minute=0,
        replace_existing=True,
    )
    scheduler.add_job(
        generate_upcoming_birthday_events,
        "cron",
        id="generate_upcoming_birthday_events",
        hour=0,
        minute=10,
        replace_existing=True,
    )
    scheduler.add_job(
        cleanup_old_newsletter_items,
        "cron",
        id="cleanup_old_newsletter_items",
        hour=0,
        minute=20,
        replace_existing=True,
    )
    scheduler.start()
    try:
        yield
    finally:
        if scheduler.running:
            scheduler.shutdown(wait=False)


app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)

allowed_origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {"message": "API online"}


@app.get("/health")
def health():
    return {"status": "ok"}
