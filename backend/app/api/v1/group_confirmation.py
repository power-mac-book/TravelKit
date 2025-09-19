from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.group_formation_service import GroupFormationWorkflow
from app.models.models import GroupMemberConfirmation, Group, Interest
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

router = APIRouter()

class ConfirmationResponse(BaseModel):
    confirmed: bool
    decline_reason: Optional[str] = None

class GroupConfirmationData(BaseModel):
    id: int
    name: str
    destination_name: str
    start_date: str
    end_date: str
    confirmed_members: int
    total_members: int
    price_per_person: float
    confirmation_deadline: str
    deposit_amount: float
    itinerary_highlights: List[str]
    members: List[dict]

class ConfirmationStatus(BaseModel):
    id: int
    confirmed: Optional[bool]
    payment_status: str
    expires_at: str
    decline_reason: Optional[str] = None

class ConfirmationResult(BaseModel):
    group: GroupConfirmationData
    confirmation: ConfirmationStatus

@router.get("/{group_id}/confirm/{token}")
async def get_confirmation_details(
    group_id: int,
    token: str,
    db: Session = Depends(get_db)
):
    """Get group confirmation details for a specific confirmation token"""
    
    # Find the confirmation record
    confirmation = db.query(GroupMemberConfirmation).filter(
        GroupMemberConfirmation.group_id == group_id,
        GroupMemberConfirmation.confirmation_token == token
    ).first()
    
    if not confirmation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Confirmation not found"
        )
    
    # Check if confirmation has expired (unless already responded)
    if confirmation.confirmed is None and datetime.utcnow() > confirmation.expires_at:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Confirmation has expired"
        )
    
    # Get group details
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    # Get all confirmations for this group to show member status
    all_confirmations = db.query(GroupMemberConfirmation).filter(
        GroupMemberConfirmation.group_id == group_id
    ).all()
    
    # Build member list
    members = []
    confirmed_count = 0
    
    for conf in all_confirmations:
        interest = db.query(Interest).filter(Interest.id == conf.interest_id).first()
        if interest:
            status_text = 'pending'
            if conf.confirmed is True:
                status_text = 'confirmed'
                confirmed_count += 1
            elif conf.confirmed is False:
                status_text = 'declined'
            
            members.append({
                'name': interest.user_name,
                'status': status_text
            })
    
    # Prepare group data
    group_data = GroupConfirmationData(
        id=group.id,
        name=group.name,
        destination_name=group.destination.name,
        start_date=group.start_date.isoformat(),
        end_date=group.end_date.isoformat(),
        confirmed_members=confirmed_count,
        total_members=len(all_confirmations),
        price_per_person=float(group.price_per_person),
        confirmation_deadline=group.confirmation_deadline.isoformat(),
        deposit_amount=float(group.price_per_person * 0.3),  # 30% deposit
        itinerary_highlights=group.itinerary.get('highlights', []) if group.itinerary else [],
        members=members
    )
    
    # Prepare confirmation status
    confirmation_status = ConfirmationStatus(
        id=confirmation.id,
        confirmed=confirmation.confirmed,
        payment_status=confirmation.payment_status,
        expires_at=confirmation.expires_at.isoformat(),
        decline_reason=confirmation.decline_reason
    )
    
    return ConfirmationResult(
        group=group_data,
        confirmation=confirmation_status
    )


@router.post("/{group_id}/confirm/{token}")
async def process_confirmation(
    group_id: int,
    token: str,
    response: ConfirmationResponse,
    db: Session = Depends(get_db)
):
    """Process member confirmation or decline"""
    
    # Find the confirmation record
    confirmation = db.query(GroupMemberConfirmation).filter(
        GroupMemberConfirmation.group_id == group_id,
        GroupMemberConfirmation.confirmation_token == token
    ).first()
    
    if not confirmation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Confirmation not found"
        )
    
    # Check if already responded
    if confirmation.confirmed is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confirmation already processed"
        )
    
    # Check if expired
    if datetime.utcnow() > confirmation.expires_at:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Confirmation has expired"
        )
    
    try:
        workflow = GroupFormationWorkflow(db)
        
        if response.confirmed:
            # Confirm participation
            result = workflow.confirm_member_participation(
                confirmation_id=confirmation.id,
                confirmed=True
            )
            
            if result['payment_required']:
                # Return payment information
                return {
                    'status': 'confirmed',
                    'payment_required': True,
                    'payment_url': result['payment_url'],
                    'deposit_amount': result['deposit_amount']
                }
            else:
                # Confirmation complete
                return {
                    'status': 'confirmed',
                    'payment_required': False,
                    'message': 'Participation confirmed successfully'
                }
        else:
            # Decline participation
            result = workflow.confirm_member_participation(
                confirmation_id=confirmation.id,
                confirmed=False,
                decline_reason=response.decline_reason
            )
            
            return {
                'status': 'declined',
                'message': 'Participation declined'
            }
            
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process confirmation: {str(e)}"
        )


@router.get("/{group_id}/status")
async def get_group_formation_status(
    group_id: int,
    db: Session = Depends(get_db)
):
    """Get current group formation status (for admin use)"""
    
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    workflow = GroupFormationWorkflow(db)
    status = workflow._evaluate_group_status(group_id)
    
    return status


@router.post("/{group_id}/finalize")
async def force_finalize_group(
    group_id: int,
    db: Session = Depends(get_db)
):
    """Force finalize group formation (admin only)"""
    
    workflow = GroupFormationWorkflow(db)
    result = workflow.finalize_group_formation(group_id, force=True)
    
    return result