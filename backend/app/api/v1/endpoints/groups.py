"""
Group management API endpoints for TravelKit platform.
Provides CRUD operations for travel groups with admin authentication.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.api.v1.endpoints.auth import get_current_admin_user
from app.models.models import Traveler
from app.models.schemas import Group, GroupCreate
from app.services.group_service import GroupService

router = APIRouter()


@router.get("/", response_model=List[Group])
async def get_groups(
    skip: int = Query(0, ge=0, description="Number of groups to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of groups to return"),
    destination_id: Optional[int] = Query(None, description="Filter by destination"),
    status: Optional[str] = Query(None, description="Filter by status"),
    date_from: Optional[datetime] = Query(None, description="Filter groups starting from this date"),
    date_to: Optional[datetime] = Query(None, description="Filter groups ending before this date"),
    db: Session = Depends(get_db),
    current_admin: Traveler = Depends(get_current_admin_user)
):
    """
    Get groups with optional filtering.
    Requires admin authentication.
    """
    return GroupService.get_groups(
        db=db,
        skip=skip,
        limit=limit,
        destination_id=destination_id,
        status=status,
        date_from=date_from,
        date_to=date_to
    )


@router.get("/statistics")
async def get_group_statistics(
    db: Session = Depends(get_db),
    current_admin: Traveler = Depends(get_current_admin_user)
):
    """
    Get overall group statistics for admin dashboard.
    Requires admin authentication.
    """
    return GroupService.get_group_statistics(db)


@router.get("/{group_id}", response_model=Group)
async def get_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_admin: Traveler = Depends(get_current_admin_user)
):
    """
    Get a specific group by ID.
    Requires admin authentication.
    """
    group = GroupService.get_group_by_id(db, group_id)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    return group


@router.post("/", response_model=Group, status_code=status.HTTP_201_CREATED)
async def create_group(
    group_data: GroupCreate,
    db: Session = Depends(get_db),
    current_admin: Traveler = Depends(get_current_admin_user)
):
    """
    Create a new group.
    Requires admin authentication.
    """
    try:
        return GroupService.create_group(db, group_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create group: {str(e)}"
        )


@router.put("/{group_id}", response_model=Group)
async def update_group(
    group_id: int,
    update_data: dict,
    db: Session = Depends(get_db),
    current_admin: Traveler = Depends(get_current_admin_user)
):
    """
    Update an existing group.
    Allows manual pricing overrides and status changes.
    Requires admin authentication.
    """
    group = GroupService.update_group(db, group_id, update_data)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    return group


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_admin: Traveler = Depends(get_current_admin_user)
):
    """
    Delete a group and unlink associated interests.
    Requires admin authentication.
    """
    success = GroupService.delete_group(db, group_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )


@router.post("/{group_id}/confirm", response_model=Group)
async def confirm_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_admin: Traveler = Depends(get_current_admin_user)
):
    """
    Confirm a group (change status to confirmed).
    Requires minimum group size to be met.
    Requires admin authentication.
    """
    group = GroupService.confirm_group(db, group_id)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot confirm group: not found or insufficient members"
        )
    return group


@router.post("/{group_id}/cancel", response_model=Group)
async def cancel_group(
    group_id: int,
    reason: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: Traveler = Depends(get_current_admin_user)
):
    """
    Cancel a group and unlink members.
    Optionally provide a cancellation reason.
    Requires admin authentication.
    """
    group = GroupService.cancel_group(db, group_id, reason)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    return group


@router.get("/{group_id}/members")
async def get_group_members(
    group_id: int,
    db: Session = Depends(get_db),
    current_admin: Traveler = Depends(get_current_admin_user)
):
    """
    Get all members (interests) in a group.
    Requires admin authentication.
    """
    # First check if group exists
    group = GroupService.get_group_by_id(db, group_id)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    members = GroupService.get_group_members(db, group_id)
    return {
        "group_id": group_id,
        "group_name": group.name,
        "total_members": len(members),
        "members": members
    }


@router.post("/{group_id}/members/{interest_id}")
async def add_member_to_group(
    group_id: int,
    interest_id: int,
    db: Session = Depends(get_db),
    current_admin: Traveler = Depends(get_current_admin_user)
):
    """
    Manually add an interest to a group.
    Requires admin authentication.
    """
    success = GroupService.add_interest_to_group(db, group_id, interest_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add member: group/interest not found or group is full"
        )
    return {"message": "Member added to group successfully"}


@router.delete("/{group_id}/members/{interest_id}")
async def remove_member_from_group(
    group_id: int,
    interest_id: int,
    db: Session = Depends(get_db),
    current_admin: Traveler = Depends(get_current_admin_user)
):
    """
    Remove an interest from a group.
    Requires admin authentication.
    """
    success = GroupService.remove_interest_from_group(db, group_id, interest_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove member: group/interest not found or not in group"
        )
    return {"message": "Member removed from group successfully"}


@router.post("/pricing/recalculate")
async def bulk_recalculate_pricing(
    destination_id: Optional[int] = Query(None, description="Recalculate for specific destination only"),
    db: Session = Depends(get_db),
    current_admin: Traveler = Depends(get_current_admin_user)
):
    """
    Bulk recalculate pricing for all active groups.
    Optionally filter by destination.
    Requires admin authentication.
    """
    updated_count = GroupService.bulk_update_pricing(db, destination_id)
    return {
        "message": f"Pricing recalculated for {updated_count} groups",
        "updated_count": updated_count
    }
