import atexit
import fcntl
import logging
import os
import tempfile
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

_logger = logging.getLogger(__name__)

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.limiter import limiter
from app.services.birthday_notifications import send_daily_birthday_notifications
from app.services.maintenance_jobs import (
    cleanup_old_newsletter_items,
    generate_upcoming_birthday_events,
)

scheduler = BackgroundScheduler(timezone="Europe/Lisbon")

# Hold the lock fd for the process lifetime so it is not garbage-collected.
_scheduler_lock_fd = None


def _acquire_scheduler_lock() -> bool:
    """Try to become the single scheduler owner across uvicorn workers.

    With `uvicorn --workers N` the lifespan runs once per worker process, which
    would otherwise start N schedulers and fire every cron job N times. We take
    an advisory file lock so exactly one worker runs the background jobs.
    """
    global _scheduler_lock_fd
    lock_path = os.path.join(tempfile.gettempdir(), "airfa-scheduler.lock")
    fd = open(lock_path, "w")
    try:
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        fd.close()
        return False
    _scheduler_lock_fd = fd
    atexit.register(fd.close)
    return True


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data:; "
            "font-src 'self'; "
            "connect-src 'self';"
        )
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not _acquire_scheduler_lock():
        _logger.info("Scheduler already owned by another worker; skipping background jobs in this process.")
        yield
        return

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


_is_production = settings.ENVIRONMENT.lower() == "production"
app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan,
    # Disable interactive API docs / schema in production to avoid exposing the
    # full API surface publicly.
    docs_url=None if _is_production else "/docs",
    redoc_url=None if _is_production else "/redoc",
    openapi_url=None if _is_production else "/openapi.json",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
# Applies the limiter's default_limits to every route as a global safety net.
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(SecurityHeadersMiddleware)

allowed_origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {"message": "API online"}


@app.get("/health")
def health():
    return {"status": "ok"}
