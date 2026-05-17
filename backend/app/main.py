from fastapi import FastAPI
from apscheduler.schedulers.background import BackgroundScheduler

from app.api.v1.api import api_router
from app.core.config import settings
from app.services.birthday_notifications import send_daily_birthday_notifications

app = FastAPI(title=settings.PROJECT_NAME)
app.include_router(api_router, prefix=settings.API_V1_STR)

scheduler = BackgroundScheduler(timezone="Europe/Lisbon")


@app.on_event("startup")
def startup_event():
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


@app.on_event("shutdown")
def shutdown_event():
    if scheduler.running:
        scheduler.shutdown(wait=False)


@app.get("/")
def root():
    return {"message": "API online"}


@app.get("/health")
def health():
    return {"status": "ok"}
