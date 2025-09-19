from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import logging

from app.core.database import get_db
from app.models.schemas import ClusteringResult, GroupSummary
from app.tasks import cluster_interests, optimize_existing_groups
from app.models.models import Group, Interest, Destination
from app.api.v1.endpoints.auth import get_current_admin_user

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/trigger", response_model=Dict[str, Any])
async def trigger_clustering(
    background_tasks: BackgroundTasks,
    destination_id: Optional[int] = None,
    force: bool = False,
    admin: dict = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Manually trigger interest clustering for all destinations or a specific destination
    """
    try:
        if destination_id:
            # Validate destination exists
            destination = db.query(Destination).filter(Destination.id == destination_id).first()
            if not destination:
                raise HTTPException(status_code=404, detail="Destination not found")
            
            # Trigger clustering for specific destination
            background_tasks.add_task(cluster_interests)
            
            return {
                "message": f"Clustering triggered for destination {destination.name}",
                "destination_id": destination_id,
                "triggered_by": admin.get("username", "admin")
            }
        else:
            # Trigger clustering for all destinations
            background_tasks.add_task(cluster_interests)
            
            return {
                "message": "Clustering triggered for all destinations",
                "triggered_by": admin.get("username", "admin")
            }
            
    except Exception as e:
        logger.error(f"Error triggering clustering: {e}")
        raise HTTPException(status_code=500, detail="Failed to trigger clustering")


@router.post("/optimize", response_model=Dict[str, Any])
async def trigger_group_optimization(
    background_tasks: BackgroundTasks,
    admin: dict = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Manually trigger group optimization (merging, member addition)
    """
    try:
        background_tasks.add_task(optimize_existing_groups)
        
        return {
            "message": "Group optimization triggered",
            "triggered_by": admin.get("username", "admin")
        }
        
    except Exception as e:
        logger.error(f"Error triggering group optimization: {e}")
        raise HTTPException(status_code=500, detail="Failed to trigger group optimization")


@router.get("/status", response_model=Dict[str, Any])
async def get_clustering_status(
    destination_id: Optional[int] = None,
    admin: dict = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get clustering status and statistics
    """
    try:
        # Base query for interests
        interests_query = db.query(Interest)
        groups_query = db.query(Group)
        
        if destination_id:
            interests_query = interests_query.filter(Interest.destination_id == destination_id)
            groups_query = groups_query.filter(Group.destination_id == destination_id)
        
        # Get statistics
        total_interests = interests_query.count()
        open_interests = interests_query.filter(Interest.status == 'open').count()
        matched_interests = interests_query.filter(Interest.status == 'matched').count()
        
        total_groups = groups_query.count()
        forming_groups = groups_query.filter(Group.status == 'forming').count()
        confirmed_groups = groups_query.filter(Group.status == 'confirmed').count()
        
        # Calculate clustering efficiency
        clustering_efficiency = (matched_interests / total_interests * 100) if total_interests > 0 else 0
        
        # Get recent groups
        recent_groups = groups_query.order_by(Group.created_at.desc()).limit(5).all()
        
        group_summaries = []
        for group in recent_groups:
            group_summaries.append({
                "id": group.id,
                "name": group.name,
                "destination_name": group.destination.name,
                "current_size": group.current_size,
                "status": group.status,
                "final_price": group.final_price_per_person,
                "savings": group.base_price - group.final_price_per_person,
                "created_at": group.created_at.isoformat()
            })
        
        return {
            "statistics": {
                "total_interests": total_interests,
                "open_interests": open_interests,
                "matched_interests": matched_interests,
                "total_groups": total_groups,
                "forming_groups": forming_groups,
                "confirmed_groups": confirmed_groups,
                "clustering_efficiency": round(clustering_efficiency, 2)
            },
            "recent_groups": group_summaries,
            "destination_id": destination_id
        }
        
    except Exception as e:
        logger.error(f"Error getting clustering status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get clustering status")


@router.get("/groups/{group_id}/details", response_model=Dict[str, Any])
async def get_group_details(
    group_id: int,
    admin: dict = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific group including member compatibility
    """
    try:
        group = db.query(Group).filter(Group.id == group_id).first()
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")
        
        # Get group members
        members = db.query(Interest).filter(Interest.group_id == group_id).all()
        
        # Calculate member compatibility matrix
        compatibility_matrix = {}
        for i, member1 in enumerate(members):
            for j, member2 in enumerate(members):
                if i != j:
                    # Import compatibility function
                    from app.tasks import _calculate_compatibility
                    compatibility_score = _calculate_compatibility(member1, member2)
                    key = f"{member1.id}-{member2.id}"
                    compatibility_matrix[key] = round(compatibility_score, 3)
        
        # Calculate average compatibility
        avg_compatibility = sum(compatibility_matrix.values()) / len(compatibility_matrix) if compatibility_matrix else 0
        
        member_details = []
        for member in members:
            member_details.append({
                "interest_id": member.id,
                "user_name": member.user_name,
                "user_email": member.user_email,
                "num_people": member.num_people,
                "date_from": member.date_from.isoformat(),
                "date_to": member.date_to.isoformat(),
                "budget_min": member.budget_min,
                "budget_max": member.budget_max,
                "special_requests": member.special_requests,
                "created_at": member.created_at.isoformat()
            })
        
        return {
            "group": {
                "id": group.id,
                "name": group.name,
                "destination_name": group.destination.name,
                "status": group.status,
                "current_size": group.current_size,
                "min_size": group.min_size,
                "max_size": group.max_size,
                "date_from": group.date_from.isoformat(),
                "date_to": group.date_to.isoformat(),
                "base_price": group.base_price,
                "final_price_per_person": group.final_price_per_person,
                "price_calc": group.price_calc,
                "admin_notes": group.admin_notes,
                "created_at": group.created_at.isoformat()
            },
            "members": member_details,
            "compatibility_analysis": {
                "average_compatibility": round(avg_compatibility, 3),
                "compatibility_matrix": compatibility_matrix,
                "group_quality": "High" if avg_compatibility > 0.8 else "Medium" if avg_compatibility > 0.6 else "Low"
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting group details: {e}")
        raise HTTPException(status_code=500, detail="Failed to get group details")


@router.put("/groups/{group_id}/optimize", response_model=Dict[str, Any])
async def optimize_specific_group(
    group_id: int,
    background_tasks: BackgroundTasks,
    admin: dict = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Optimize a specific group (try to add compatible members)
    """
    try:
        group = db.query(Group).filter(Group.id == group_id).first()
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")
        
        if group.status != 'forming':
            raise HTTPException(status_code=400, detail="Can only optimize forming groups")
        
        # Import and run optimization function
        from app.tasks import _optimize_group_membership
        
        original_size = group.current_size
        _optimize_group_membership(db, group)
        db.commit()
        
        new_size = group.current_size
        added_members = new_size - original_size
        
        return {
            "message": f"Group optimization completed",
            "group_id": group_id,
            "original_size": original_size,
            "new_size": new_size,
            "members_added": added_members,
            "optimized_by": admin.get("username", "admin")
        }
        
    except Exception as e:
        logger.error(f"Error optimizing group {group_id}: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to optimize group")


@router.get("/analytics", response_model=Dict[str, Any])
async def get_clustering_analytics(
    days: int = 30,
    admin: dict = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get clustering analytics for the specified time period
    """
    try:
        from datetime import datetime, timedelta
        
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Groups created in time period
        groups_created = db.query(Group).filter(Group.created_at >= start_date).count()
        
        # Interests matched in time period
        interests_matched = db.query(Interest).filter(
            Interest.status == 'matched',
            Interest.updated_at >= start_date
        ).count()
        
        # Calculate average group size
        avg_group_size_result = db.query(
            db.func.avg(Group.current_size)
        ).filter(Group.created_at >= start_date).scalar()
        
        avg_group_size = float(avg_group_size_result) if avg_group_size_result else 0
        
        # Calculate average savings per person
        avg_savings_result = db.query(
            db.func.avg(Group.base_price - Group.final_price_per_person)
        ).filter(Group.created_at >= start_date).scalar()
        
        avg_savings = float(avg_savings_result) if avg_savings_result else 0
        
        # Get top performing destinations
        from sqlalchemy import func
        top_destinations = db.query(
            Destination.name,
            func.count(Group.id).label('groups_count'),
            func.avg(Group.current_size).label('avg_size')
        ).join(Group).filter(
            Group.created_at >= start_date
        ).group_by(Destination.name).order_by(
            func.count(Group.id).desc()
        ).limit(5).all()
        
        destination_stats = []
        for dest in top_destinations:
            destination_stats.append({
                "destination": dest.name,
                "groups_formed": dest.groups_count,
                "average_group_size": round(float(dest.avg_size), 1)
            })
        
        return {
            "period_days": days,
            "start_date": start_date.isoformat(),
            "summary": {
                "groups_created": groups_created,
                "interests_matched": interests_matched,
                "average_group_size": round(avg_group_size, 1),
                "average_savings_per_person": round(avg_savings, 2),
                "clustering_success_rate": round((interests_matched / max(groups_created * 4, 1)) * 100, 1)
            },
            "top_destinations": destination_stats
        }
        
    except Exception as e:
        logger.error(f"Error getting clustering analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get clustering analytics")


# ===== TESTING ENDPOINTS =====

@router.post("/simulate")
async def simulate_clustering(
    request: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """Simulate clustering with specific parameters for testing"""
    try:
        destination_id = request.get('destination_id', 1)  # Default to first destination
        min_group_size = request.get('min_group_size', 4)
        max_group_size = request.get('max_group_size', 8)
        
        # Get open interests for destination
        interests = db.query(Interest).filter(
            Interest.destination_id == destination_id,
            Interest.status == 'open'
        ).all()
        
        if len(interests) < min_group_size:
            return {
                "message": f"Not enough interests ({len(interests)}) for minimum group size ({min_group_size})",
                "interests_found": len(interests),
                "groups_created": 0
            }
        
        # Simple grouping for testing - create one group
        group_interests = interests[:max_group_size]
        
        # Create group
        destination = db.query(Destination).filter(Destination.id == destination_id).first()
        if not destination:
            destination_name = f"Test Destination {destination_id}"
        else:
            destination_name = destination.name
        
        from datetime import datetime, timedelta
        import uuid
        
        group = Group(
            name=f"Test Group {destination_name} - {datetime.now().strftime('%Y%m%d-%H%M')}",
            destination_id=destination_id,
            status='forming',
            min_size=min_group_size,
            max_size=max_group_size,
            price_per_person=40000.0,
            confirmation_deadline=datetime.utcnow() + timedelta(days=3),
            created_at=datetime.utcnow(),
            auto_confirm_enabled=True,
            minimum_confirmation_rate=0.75
        )
        
        db.add(group)
        db.flush()
        
        # Add interests to group
        for interest in group_interests:
            interest.status = 'matched'
            interest.group_id = group.id
        
        db.commit()
        
        return {
            "message": f"Created test group with {len(group_interests)} members",
            "group_id": group.id,
            "group_name": group.name,
            "member_count": len(group_interests),
            "remaining_interests": len(interests) - len(group_interests)
        }
    
    except Exception as e:
        logger.error(f"Error simulating clustering: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
