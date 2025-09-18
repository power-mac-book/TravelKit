from typing import List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models import schemas
from app.models.models import Traveler
from app.services.interest_service import InterestService
from app.api.v1.endpoints.auth import get_current_admin_user
from app.tasks import send_interest_confirmation

router = APIRouter()


@router.post("/", response_model=schemas.Interest)
def create_interest(
    interest: schemas.InterestCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Submit traveler interest for a destination"""
    service = InterestService(db)
    created_interest = service.create_interest(interest)
    
    # Queue interest confirmation notification
    background_tasks.add_task(send_interest_confirmation, created_interest.id)
    
    return created_interest


@router.get("/", response_model=List[schemas.Interest])
def get_interests(
    destination_id: int = None,
    status: str = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get interests with optional filtering"""
    service = InterestService(db)
    return service.get_interests(
        destination_id=destination_id,
        status=status,
        skip=skip,
        limit=limit
    )


@router.get("/{interest_id}", response_model=schemas.Interest)
def get_interest(
    interest_id: int,
    db: Session = Depends(get_db)
):
    """Get single interest by ID"""
    service = InterestService(db)
    interest = service.get_interest_by_id(interest_id)
    if not interest:
        raise HTTPException(status_code=404, detail="Interest not found")
    return interest


# Admin-only endpoints

@router.get("/admin/all", response_model=List[schemas.InterestWithDestination])
def get_all_interests_admin(
    status: str = None,
    destination_id: int = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_admin: Traveler = Depends(get_current_admin_user)
):
    """Get all interests with destination details (admin only)"""
    service = InterestService(db)
    return service.get_interests_with_destination(
        status=status,
        destination_id=destination_id,
        skip=skip,
        limit=limit
    )


@router.put("/admin/{interest_id}/status", response_model=schemas.Interest)
def update_interest_status_admin(
    interest_id: int,
    status_update: schemas.InterestStatusUpdate,
    db: Session = Depends(get_db),
    current_admin: Traveler = Depends(get_current_admin_user)
):
    """Update interest status (admin only)"""
    service = InterestService(db)
    interest = service.update_interest_status(interest_id, status_update.status)
    if not interest:
        raise HTTPException(status_code=404, detail="Interest not found")
    return interest


@router.get("/admin/stats", response_model=schemas.InterestStats)
def get_interest_stats_admin(
    db: Session = Depends(get_db),
    current_admin: Traveler = Depends(get_current_admin_user)
):
    """Get interest statistics (admin only)"""
    service = InterestService(db)
    return service.get_interest_statistics()