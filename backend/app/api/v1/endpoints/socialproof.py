from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models import schemas
from app.services.socialproof_service import SocialProofService

router = APIRouter()


@router.get("/home", response_model=List[schemas.HomepageMessage])
async def get_homepage_messages(
    limit: int = 5,
    db: Session = Depends(get_db)
):
    """Get social proof messages for homepage"""
    service = SocialProofService(db)
    return await service.get_active_homepage_messages(limit=limit)


@router.post("/messages", response_model=schemas.HomepageMessage)
async def create_homepage_message(
    message: schemas.HomepageMessageBase,
    db: Session = Depends(get_db)
):
    """Create new homepage message (admin only)"""
    service = SocialProofService(db)
    return await service.create_homepage_message(message)


@router.get("/trending")
async def get_trending_destinations(
    limit: int = 5,
    db: Session = Depends(get_db)
):
    """Get trending destinations based on recent interest activity"""
    service = SocialProofService(db)
    return service.get_trending_destinations(limit=limit)


@router.get("/activity")
async def get_real_time_activity(
    hours: int = 24,
    db: Session = Depends(get_db)
):
    """Get real-time activity feed for social proof widgets"""
    service = SocialProofService(db)
    return service.get_real_time_activity(hours=hours)


@router.get("/destination/{destination_id}")
async def get_destination_social_proof(
    destination_id: int,
    db: Session = Depends(get_db)
):
    """Get social proof data for a specific destination"""
    service = SocialProofService(db)
    return service.get_destination_social_proof(destination_id)


@router.get("/smart-messages")
async def get_smart_messages(
    db: Session = Depends(get_db)
):
    """Get AI-generated smart social proof messages"""
    service = SocialProofService(db)
    return service.generate_smart_messages()


@router.post("/generate-messages")
async def generate_social_proof_messages(
    db: Session = Depends(get_db)
):
    """Generate and return social proof messages based on current data"""
    service = SocialProofService(db)
    return service.generate_social_proof_messages()