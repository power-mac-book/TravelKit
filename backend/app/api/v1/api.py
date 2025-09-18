from fastapi import APIRouter
from app.api.v1.endpoints import destinations, interests, socialproof, auth, pages, files, analytics, groups, travelers
from app.api.v1 import notifications

api_router = APIRouter()

api_router.include_router(destinations.router, prefix="/destinations", tags=["destinations"])
api_router.include_router(interests.router, prefix="/interests", tags=["interests"])
api_router.include_router(socialproof.router, prefix="/socialproof", tags=["socialproof"])
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(travelers.router, prefix="/travelers", tags=["travelers"])
api_router.include_router(pages.router, prefix="/pages", tags=["pages"])
api_router.include_router(files.router, prefix="/files", tags=["files"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(groups.router, prefix="/groups", tags=["groups"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])