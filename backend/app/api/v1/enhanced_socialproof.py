"""
Enhanced Social Proof API Endpoints
Provides advanced social proof with A/B testing and personalization
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Query, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.services.enhanced_socialproof_service import (
    EnhancedSocialProofAnalytics,
    SocialProofVariant,
    UserSegment
)

router = APIRouter()


@router.get("/trending")
async def get_trending_destinations(
    limit: int = Query(default=10, le=50),
    time_window: int = Query(default=7, description="Days to look back"),
    db: Session = Depends(get_db)
):
    """Get trending destinations based on recent interest activity"""
    
    analytics = EnhancedSocialProofAnalytics(db)
    
    trending_data = analytics.get_trending_destinations(
        limit=limit,
        time_window_days=time_window
    )
    
    return {
        "trending_destinations": trending_data,
        "time_window_days": time_window,
        "generated_at": datetime.now().isoformat()
    }


@router.get("/social-proof/{destination_id}")
async def get_destination_social_proof(
    destination_id: int,
    variant: Optional[str] = Query(default=None),
    user_segment: Optional[str] = Query(default=None),
    db: Session = Depends(get_db)
):
    """Get personalized social proof for a destination"""
    
    analytics = EnhancedSocialProofAnalytics(db)
    
    # Parse variant and user segment
    try:
        social_variant = SocialProofVariant(variant) if variant else SocialProofVariant.SOCIAL_FOCUSED
    except ValueError:
        social_variant = SocialProofVariant.SOCIAL_FOCUSED
    
    try:
        segment = UserSegment(user_segment) if user_segment else UserSegment.FIRST_TIME_VISITOR
    except ValueError:
        segment = UserSegment.FIRST_TIME_VISITOR
    
    social_proof_data = analytics.get_personalized_social_proof(
        destination_id=destination_id,
        variant=social_variant,
        user_segment=segment
    )
    
    return social_proof_data


class SocialProofInteraction(BaseModel):
    user_id: Optional[str] = None
    session_id: str
    destination_id: int
    variant: str
    action: str  # viewed, clicked, converted
    context: Dict[str, Any] = {}


class PersonalizationRequest(BaseModel):
    session_id: str
    user_id: Optional[str] = None
    destination_id: int
    user_segment: str
    session_data: Dict[str, Any] = {}


class BehavioralTriggerRequest(BaseModel):
    session_id: str
    session_data: Dict[str, Any]


@router.post("/track-interaction")
async def track_social_proof_interaction(
    interaction: SocialProofInteraction,
    db: Session = Depends(get_db)
):
    """Track user interactions with social proof elements for A/B testing"""
    
    analytics = EnhancedSocialProofAnalytics(db)
    
    try:
        variant = SocialProofVariant(interaction.variant)
    except ValueError:
        variant = SocialProofVariant.SOCIAL_FOCUSED
    
    tracking_data = analytics.track_social_proof_interaction(
        user_id=interaction.user_id,
        session_id=interaction.session_id,
        destination_id=interaction.destination_id,
        variant=variant,
        action=interaction.action,
        context=interaction.context
    )
    
    return {
        "status": "tracked",
        "tracking_id": f"{interaction.session_id}_{interaction.destination_id}_{interaction.action}",
        "data": tracking_data
    }


@router.post("/personalized-message")
async def get_personalized_social_proof(
    request: PersonalizationRequest,
    db: Session = Depends(get_db)
):
    """Get personalized social proof message based on user segment and behavior"""
    
    analytics = EnhancedSocialProofAnalytics(db)
    
    try:
        user_segment = UserSegment(request.user_segment)
    except ValueError:
        user_segment = UserSegment.FIRST_TIME_VISITOR
    
    # Get optimal variant for this user segment
    variant = analytics.get_personalized_variant(
        user_segment=user_segment,
        destination_id=request.destination_id,
        session_data=request.session_data
    )
    
    # Generate personalized message
    message_data = analytics.generate_personalized_message(
        destination_id=request.destination_id,
        variant=variant,
        real_time_data=request.session_data
    )
    
    return {
        "message": message_data,
        "variant": variant.value,
        "user_segment": user_segment.value,
        "session_id": request.session_id
    }


@router.post("/behavioral-triggers")
async def get_behavioral_triggers(
    request: BehavioralTriggerRequest,
    db: Session = Depends(get_db)
):
    """Get behavioral triggers based on user session data"""
    
    analytics = EnhancedSocialProofAnalytics(db)
    
    triggers = analytics.get_behavioral_triggers(request.session_data)
    
    return {
        "triggers": triggers,
        "session_id": request.session_id,
        "trigger_count": len(triggers)
    }


@router.get("/destinations/{destination_id}/real-time-metrics")
async def get_destination_real_time_metrics(
    destination_id: int,
    db: Session = Depends(get_db)
):
    """Get real-time metrics for a specific destination"""
    
    analytics = EnhancedSocialProofAnalytics(db)
    metrics = analytics._get_destination_metrics(destination_id)
    
    return {
        "destination_id": destination_id,
        "metrics": metrics,
        "generated_at": analytics.db.bind.execute("SELECT NOW()").scalar().isoformat()
    }


@router.get("/destinations/{destination_id}/social-proof-variants")
async def get_social_proof_variants(
    destination_id: int,
    user_segment: str = Query(default="first_time"),
    db: Session = Depends(get_db)
):
    """Get all social proof variants for a destination (for testing)"""
    
    analytics = EnhancedSocialProofAnalytics(db)
    
    try:
        segment = UserSegment(user_segment)
    except ValueError:
        segment = UserSegment.FIRST_TIME_VISITOR
    
    variants = {}
    real_time_data = {}
    
    for variant in SocialProofVariant:
        message = analytics.generate_personalized_message(
            destination_id=destination_id,
            variant=variant,
            real_time_data=real_time_data
        )
        variants[variant.value] = message
    
    # Get recommended variant for this segment
    recommended_variant = analytics.get_personalized_variant(
        user_segment=segment,
        destination_id=destination_id,
        session_data={}
    )
    
    return {
        "destination_id": destination_id,
        "user_segment": segment.value,
        "variants": variants,
        "recommended_variant": recommended_variant.value
    }


@router.get("/analytics/social-proof-performance")
async def get_social_proof_performance(
    destination_id: Optional[int] = Query(None),
    days: int = Query(30, description="Number of days to analyze"),
    db: Session = Depends(get_db)
):
    """Get social proof performance analytics"""
    
    analytics = EnhancedSocialProofAnalytics(db)
    
    # This would normally query analytics database
    # For now, return mock performance data
    performance_data = {
        "period_days": days,
        "total_impressions": 15420,
        "total_clicks": 2877,
        "total_conversions": 542,
        "overall_ctr": 0.186,
        "overall_conversion_rate": 0.188,
        "variant_performance": {
            "urgency_focused": {
                "impressions": 3855,
                "clicks": 694,
                "conversions": 125,
                "ctr": 0.180,
                "conversion_rate": 0.180
            },
            "social_focused": {
                "impressions": 3901,
                "clicks": 741,
                "conversions": 148,
                "ctr": 0.190,
                "conversion_rate": 0.200
            },
            "benefit_focused": {
                "impressions": 3832,
                "clicks": 689,
                "conversions": 132,
                "ctr": 0.180,
                "conversion_rate": 0.192
            },
            "deadline_focused": {
                "impressions": 3832,
                "clicks": 753,
                "conversions": 137,
                "ctr": 0.196,
                "conversion_rate": 0.182
            }
        },
        "best_performing_variant": "social_focused",
        "confidence_level": 0.85
    }
    
    if destination_id:
        performance_data["destination_id"] = destination_id
    
    return performance_data


@router.get("/user-segments/classification")
async def classify_user_segment(
    session_duration: int = Query(..., description="Session duration in minutes"),
    page_views: int = Query(..., description="Number of pages viewed"),
    previous_visits: int = Query(0, description="Number of previous visits"),
    budget_range: Optional[str] = Query(None, description="Budget range preference"),
    travel_frequency: Optional[str] = Query(None, description="Travel frequency"),
    group_size: int = Query(1, description="Typical group size")
):
    """Classify user into segment for personalized social proof"""
    
    # User segment classification logic
    if previous_visits == 0:
        segment = UserSegment.FIRST_TIME_VISITOR
    elif previous_visits > 0:
        segment = UserSegment.RETURN_VISITOR
    
    # Refine based on behavior patterns
    if budget_range in ["premium", "luxury"] or (budget_range and "high" in budget_range.lower()):
        segment = UserSegment.HIGH_BUDGET
    elif budget_range in ["budget", "economy"] or (budget_range and "low" in budget_range.lower()):
        segment = UserSegment.BUDGET_CONSCIOUS
    
    if travel_frequency in ["frequent", "regular"] or previous_visits > 5:
        segment = UserSegment.FREQUENT_TRAVELER
    
    if group_size >= 3:
        segment = UserSegment.FAMILY_TRAVELER
    
    return {
        "user_segment": segment.value,
        "classification_factors": {
            "session_duration": session_duration,
            "page_views": page_views,
            "previous_visits": previous_visits,
            "budget_range": budget_range,
            "travel_frequency": travel_frequency,
            "group_size": group_size
        },
        "recommended_messaging": {
            UserSegment.FIRST_TIME_VISITOR: "Welcome! See what others are booking",
            UserSegment.RETURN_VISITOR: "Welcome back! Check out trending destinations",
            UserSegment.HIGH_BUDGET: "Exclusive experiences with premium benefits",
            UserSegment.BUDGET_CONSCIOUS: "Great value deals and group savings",
            UserSegment.FREQUENT_TRAVELER: "New destinations and exclusive offers",
            UserSegment.FAMILY_TRAVELER: "Family-friendly group adventures"
        }.get(segment, "Discover amazing travel experiences")
    }