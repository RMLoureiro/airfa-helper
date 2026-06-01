from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.instruments import router as instruments_router
from app.api.v1.events import router as events_router
from app.api.v1.home import router as home_router
from app.api.v1.members import router as members_router
from app.api.v1.presences import router as presences_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.newsletter import router as newsletter_router
from app.api.v1.repertoire import router as repertoire_router
from app.api.v1.reinforcements import router as reinforcements_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(home_router)
api_router.include_router(members_router)
api_router.include_router(events_router)
api_router.include_router(newsletter_router)
api_router.include_router(notifications_router)
api_router.include_router(presences_router)
api_router.include_router(instruments_router)
api_router.include_router(repertoire_router)
api_router.include_router(reinforcements_router)
