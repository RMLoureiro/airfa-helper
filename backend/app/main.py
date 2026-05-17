from contextlib import asynccontextmanager

from fastapi import FastAPI
from apscheduler.schedulers.background import BackgroundScheduler

from app.api.v1.api import api_router
from app.core.config import settings
from app.services.birthday_notifications import send_daily_birthday_notifications

scheduler = BackgroundScheduler(timezone="Europe/Lisbon")


@asynccontextmanager
async def lifespan(app: FastAPI):
    send_daily_birthday_notifications()
    scheduler.add_job(
        send_daily_birthday_notifications,
        "cron",
        id="daily_birthday_notifications",
        hour=8,
        minute=0,
        replace_existing=True,
    )
    scheduler.start()
    try:
        yield
    finally:
        if scheduler.running:
            scheduler.shutdown(wait=False)


app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {"message": "API online"}


@app.get("/health")
def health():
    return {"status": "ok"}
