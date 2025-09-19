from fastapi import APIRouter
from app.api.v1.endpoints import destinations, interests, socialproof, auth, pages, files, analytics, groups, travelers
from app.api.v1 import notifications, clustering, group_confirmation, test, enhanced_socialproof, advanced_analytics

api_router = APIRouter()

api_router.include_router(destinations.router, prefix="/destinations", tags=["destinations"])
api_router.include_router(interests.router, prefix="/interests", tags=["interests"])
api_router.include_router(socialproof.router, prefix="/socialproof", tags=["socialproof"])
api_router.include_router(enhanced_socialproof.router, prefix="/enhanced-socialproof", tags=["enhanced-socialproof"])
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(travelers.router, prefix="/travelers", tags=["travelers"])
api_router.include_router(pages.router, prefix="/pages", tags=["pages"])
api_router.include_router(files.router, prefix="/files", tags=["files"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(advanced_analytics.router, prefix="/advanced-analytics", tags=["advanced-analytics"])
api_router.include_router(groups.router, prefix="/groups", tags=["groups"])
api_router.include_router(group_confirmation.router, prefix="/groups", tags=["group-confirmation"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(clustering.router, prefix="/clustering", tags=["clustering"])
api_router.include_router(test.router, prefix="/test", tags=["testing"])