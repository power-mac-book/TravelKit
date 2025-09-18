from typing import Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.v1.endpoints.auth import get_current_admin_user
from app.services.analytics_service import AnalyticsService
from app.models.models import Traveler

router = APIRouter()


@router.get("/dashboard", response_model=Dict[str, Any])
def get_dashboard_analytics(
    current_admin: Traveler = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get dashboard analytics (admin only)"""
    service = AnalyticsService(db)
    return service.get_dashboard_stats()


@router.get("/interests", response_model=Dict[str, Any])
def get_interest_analytics(
    days: int = Query(30, description="Number of days to analyze"),
    current_admin: Traveler = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get interest trends and analytics (admin only)"""
    service = AnalyticsService(db)
    return service.get_interest_trends(days=days)


@router.get("/conversion", response_model=Dict[str, Any])
def get_conversion_analytics(
    days: int = Query(30, description="Number of days to analyze"),
    current_admin: Traveler = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get conversion funnel analytics (admin only)"""
    service = AnalyticsService(db)
    return service.get_conversion_funnel(days=days)


@router.get("/groups", response_model=Dict[str, Any])
def get_group_analytics(
    days: int = Query(30, description="Number of days to analyze"),
    current_admin: Traveler = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get group formation analytics (admin only)"""
    service = AnalyticsService(db)
    return service.get_group_analytics(days=days)


@router.get("/revenue", response_model=Dict[str, Any])
def get_revenue_analytics(
    days: int = Query(30, description="Number of days to analyze"),
    current_admin: Traveler = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get revenue analytics (admin only)"""
    service = AnalyticsService(db)
    return service.get_revenue_analytics(days=days)


@router.get("/geographic", response_model=Dict[str, Any])
def get_geographic_analytics(
    current_admin: Traveler = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get geographic distribution analytics (admin only)"""
    service = AnalyticsService(db)
    return service.get_geographic_distribution()
