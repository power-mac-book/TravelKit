from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models import schemas
from app.services.destination_service import DestinationService
from app.api.v1.endpoints.auth import get_current_admin_user

router = APIRouter()


@router.get("/", response_model=List[schemas.Destination])
async def get_destinations(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all destinations with interest summaries"""
    service = DestinationService(db)
    return await service.get_destinations_with_interest_summary(skip=skip, limit=limit)


@router.get("/{destination_id}", response_model=schemas.Destination)
async def get_destination(
    destination_id: int,
    db: Session = Depends(get_db)
):
    """Get single destination by ID"""
    service = DestinationService(db)
    destination = await service.get_destination_by_id(destination_id)
    if not destination:
        raise HTTPException(status_code=404, detail="Destination not found")
    return destination


@router.get("/{destination_id}/calendar", response_model=schemas.CalendarResponse)
async def get_destination_calendar(
    destination_id: int,
    month: str,  # Format: 2025-10
    db: Session = Depends(get_db)
):
    """Get calendar data for destination showing interest counts by date"""
    service = DestinationService(db)
    return await service.get_calendar_data(destination_id, month)


# Admin-only endpoints
@router.post("/", response_model=schemas.Destination)
async def create_destination(
    destination: schemas.DestinationCreate,
    db: Session = Depends(get_db),
    current_admin: schemas.User = Depends(get_current_admin_user)
):
    """Create new destination (admin only)"""
    try:
        service = DestinationService(db)
        return await service.create_destination(destination)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.put("/{destination_id}", response_model=schemas.Destination)
async def update_destination(
    destination_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: schemas.User = Depends(get_current_admin_user)
):
    """Update destination (admin only)"""
    import logging
    import json
    logger = logging.getLogger(__name__)
    
    try:
        # Get raw request body for debugging
        body = await request.body()
        body_str = body.decode('utf-8')
        logger.info(f"Raw request body for destination {destination_id}: {body_str}")
        
        # Parse the JSON manually to see what we're getting
        try:
            request_data = json.loads(body_str)
            logger.info(f"Parsed request data: {json.dumps(request_data, indent=2)}")
        except Exception as e:
            logger.error(f"Failed to parse request JSON: {e}")
        
        # Now try to validate it with Pydantic
        try:
            destination_update = schemas.DestinationUpdate(**request_data)
            logger.info(f"Successfully validated: {destination_update.dict()}")
        except Exception as e:
            logger.error(f"Pydantic validation failed: {e}")
            raise HTTPException(status_code=422, detail=f"Validation error: {str(e)}")
        
        service = DestinationService(db)
        destination = await service.update_destination(destination_id, destination_update)
        if not destination:
            raise HTTPException(status_code=404, detail="Destination not found")
        return destination
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/{destination_id}")
async def delete_destination(
    destination_id: int,
    db: Session = Depends(get_db),
    current_admin: schemas.User = Depends(get_current_admin_user)
):
    """Soft delete destination (admin only)"""
    service = DestinationService(db)
    success = await service.delete_destination(destination_id)
    if not success:
        raise HTTPException(status_code=404, detail="Destination not found")
    return {"message": "Destination deleted successfully"}


@router.get("/admin/all", response_model=List[schemas.Destination])
async def get_all_destinations_admin(
    skip: int = 0,
    limit: int = 100,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_admin: schemas.User = Depends(get_current_admin_user)
):
    """Get all destinations including inactive ones (admin only)"""
    service = DestinationService(db)
    return await service.get_all_destinations_admin(skip=skip, limit=limit, include_inactive=include_inactive)