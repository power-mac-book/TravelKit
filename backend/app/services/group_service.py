"""
Group management service for TravelKit platform.
Handles group CRUD operations, pricing calculations, and status management.
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, asc
from datetime import datetime, timedelta
import logging

from app.models.models import Group, Interest, Destination, Traveler
from app.models.schemas import GroupCreate

logger = logging.getLogger(__name__)


class GroupService:
    """Service class for managing travel groups"""

    @staticmethod
    def get_groups(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        destination_id: Optional[int] = None,
        status: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None
    ) -> List[Group]:
        """Get groups with optional filtering"""
        query = db.query(Group)
        
        # Apply filters
        if destination_id:
            query = query.filter(Group.destination_id == destination_id)
        if status:
            query = query.filter(Group.status == status)
        if date_from:
            query = query.filter(Group.date_from >= date_from)
        if date_to:
            query = query.filter(Group.date_to <= date_to)
        
        return query.order_by(desc(Group.created_at)).offset(skip).limit(limit).all()

    @staticmethod
    def get_group_by_id(db: Session, group_id: int) -> Optional[Group]:
        """Get a specific group by ID"""
        return db.query(Group).filter(Group.id == group_id).first()

    @staticmethod
    def create_group(db: Session, group_data: GroupCreate) -> Group:
        """Create a new group"""
        # Calculate initial pricing
        final_price = GroupService._calculate_group_pricing(
            base_price=group_data.base_price,
            current_size=0,  # New group starts empty
            max_discount=0.25
        )
        
        # Create pricing calculation record
        price_calc = {
            "base_price": group_data.base_price,
            "current_size": 0,
            "discount_rate": 0.03,
            "max_discount": 0.25,
            "final_price": final_price,
            "calculated_at": datetime.utcnow().isoformat()
        }
        
        group = Group(
            destination_id=group_data.destination_id,
            name=group_data.name,
            date_from=group_data.date_from,
            date_to=group_data.date_to,
            min_size=group_data.min_size,
            max_size=group_data.max_size,
            base_price=group_data.base_price,
            final_price_per_person=final_price,
            price_calc=price_calc,
            admin_notes=group_data.admin_notes,
            current_size=0,
            status="forming"
        )
        
        db.add(group)
        db.commit()
        db.refresh(group)
        logger.info(f"Created new group: {group.name} (ID: {group.id})")
        return group

    @staticmethod
    def update_group(db: Session, group_id: int, update_data: dict) -> Optional[Group]:
        """Update an existing group"""
        group = db.query(Group).filter(Group.id == group_id).first()
        if not group:
            return None
        
        # Store original pricing for comparison
        original_price = group.final_price_per_person
        
        # Update fields
        for field, value in update_data.items():
            if hasattr(group, field):
                setattr(group, field, value)
        
        # Recalculate pricing if base_price changed or manual override
        if 'final_price_per_person' in update_data or 'base_price' in update_data:
            if 'final_price_per_person' not in update_data:
                # Auto-calculate if only base_price changed
                group.final_price_per_person = GroupService._calculate_group_pricing(
                    base_price=group.base_price,
                    current_size=group.current_size
                )
            
            # Update pricing calculation record
            group.price_calc = {
                "base_price": group.base_price,
                "current_size": group.current_size,
                "discount_rate": 0.03,
                "max_discount": 0.25,
                "final_price": group.final_price_per_person,
                "calculated_at": datetime.utcnow().isoformat(),
                "manual_override": 'final_price_per_person' in update_data,
                "previous_price": original_price
            }
        
        db.commit()
        db.refresh(group)
        logger.info(f"Updated group: {group.name} (ID: {group.id})")
        return group

    @staticmethod
    def delete_group(db: Session, group_id: int) -> bool:
        """Delete a group and unlink associated interests"""
        group = db.query(Group).filter(Group.id == group_id).first()
        if not group:
            return False
        
        # Unlink interests from this group
        db.query(Interest).filter(Interest.group_id == group_id).update(
            {"group_id": None, "status": "open"}
        )
        
        db.delete(group)
        db.commit()
        logger.info(f"Deleted group: {group.name} (ID: {group.id})")
        return True

    @staticmethod
    def confirm_group(db: Session, group_id: int) -> Optional[Group]:
        """Confirm a group and notify members"""
        group = db.query(Group).filter(Group.id == group_id).first()
        if not group:
            return None
        
        if group.current_size < group.min_size:
            logger.warning(f"Cannot confirm group {group.id}: insufficient members ({group.current_size}/{group.min_size})")
            return None
        
        group.status = "confirmed"
        db.commit()
        db.refresh(group)
        
        # TODO: Trigger notification to group members
        logger.info(f"Confirmed group: {group.name} (ID: {group.id}) with {group.current_size} members")
        return group

    @staticmethod
    def cancel_group(db: Session, group_id: int, reason: Optional[str] = None) -> Optional[Group]:
        """Cancel a group and notify members"""
        group = db.query(Group).filter(Group.id == group_id).first()
        if not group:
            return None
        
        # Update group status and notes
        group.status = "cancelled"
        if reason:
            group.admin_notes = f"{group.admin_notes or ''}\nCancellation reason: {reason}".strip()
        
        # Unlink interests and mark them as open again
        db.query(Interest).filter(Interest.group_id == group_id).update(
            {"group_id": None, "status": "open"}
        )
        
        # Reset current size
        group.current_size = 0
        
        db.commit()
        db.refresh(group)
        
        # TODO: Trigger cancellation notifications to members
        logger.info(f"Cancelled group: {group.name} (ID: {group.id})")
        return group

    @staticmethod
    def get_group_members(db: Session, group_id: int) -> List[Interest]:
        """Get all interests (members) in a group"""
        return db.query(Interest).filter(Interest.group_id == group_id).all()

    @staticmethod
    def add_interest_to_group(db: Session, group_id: int, interest_id: int) -> bool:
        """Manually add an interest to a group"""
        group = db.query(Group).filter(Group.id == group_id).first()
        interest = db.query(Interest).filter(Interest.id == interest_id).first()
        
        if not group or not interest:
            return False
        
        if group.current_size >= group.max_size:
            logger.warning(f"Cannot add interest {interest_id} to group {group_id}: group is full")
            return False
        
        # Update interest
        interest.group_id = group_id
        interest.status = "matched"
        
        # Update group size and pricing
        group.current_size += interest.num_people
        group.final_price_per_person = GroupService._calculate_group_pricing(
            base_price=group.base_price,
            current_size=group.current_size
        )
        
        # Mark group as full if at capacity
        if group.current_size >= group.max_size:
            group.status = "full"
        
        db.commit()
        logger.info(f"Added interest {interest_id} to group {group_id}")
        return True

    @staticmethod
    def remove_interest_from_group(db: Session, group_id: int, interest_id: int) -> bool:
        """Remove an interest from a group"""
        group = db.query(Group).filter(Group.id == group_id).first()
        interest = db.query(Interest).filter(Interest.id == interest_id).first()
        
        if not group or not interest or interest.group_id != group_id:
            return False
        
        # Update interest
        interest.group_id = None
        interest.status = "open"
        
        # Update group size and pricing
        group.current_size -= interest.num_people
        group.final_price_per_person = GroupService._calculate_group_pricing(
            base_price=group.base_price,
            current_size=group.current_size
        )
        
        # Update group status
        if group.status == "full" and group.current_size < group.max_size:
            group.status = "forming" if group.current_size < group.min_size else "confirmed"
        
        db.commit()
        logger.info(f"Removed interest {interest_id} from group {group_id}")
        return True

    @staticmethod
    def get_group_statistics(db: Session) -> Dict[str, Any]:
        """Get overall group statistics"""
        total_groups = db.query(Group).count()
        
        # Groups by status
        status_counts = {}
        for status in ["forming", "confirmed", "full", "cancelled"]:
            status_counts[status] = db.query(Group).filter(Group.status == status).count()
        
        # Recent activity
        week_ago = datetime.utcnow() - timedelta(days=7)
        recent_groups = db.query(Group).filter(Group.created_at >= week_ago).count()
        
        # Average group size
        avg_size_result = db.query(db.func.avg(Group.current_size)).filter(
            Group.current_size > 0
        ).scalar()
        avg_group_size = round(float(avg_size_result), 1) if avg_size_result else 0
        
        return {
            "total_groups": total_groups,
            "status_breakdown": status_counts,
            "recent_groups_7_days": recent_groups,
            "average_group_size": avg_group_size,
            "active_groups": status_counts.get("forming", 0) + status_counts.get("confirmed", 0)
        }

    @staticmethod
    def _calculate_group_pricing(
        base_price: float,
        current_size: int,
        discount_rate: float = 0.03,
        max_discount: float = 0.25
    ) -> float:
        """Calculate final price per person based on group size"""
        if current_size <= 1:
            return base_price
        
        # Apply discount based on group size
        discount = min(max_discount, discount_rate * (current_size - 1))
        final_price = base_price * (1 - discount)
        
        return round(final_price, 2)

    @staticmethod
    def bulk_update_pricing(db: Session, destination_id: Optional[int] = None) -> int:
        """Recalculate pricing for all groups (or specific destination)"""
        query = db.query(Group).filter(Group.status.in_(["forming", "confirmed"]))
        
        if destination_id:
            query = query.filter(Group.destination_id == destination_id)
        
        groups = query.all()
        updated_count = 0
        
        for group in groups:
            old_price = group.final_price_per_person
            new_price = GroupService._calculate_group_pricing(
                base_price=group.base_price,
                current_size=group.current_size
            )
            
            if abs(old_price - new_price) > 0.01:  # Only update if significant change
                group.final_price_per_person = new_price
                group.price_calc = {
                    "base_price": group.base_price,
                    "current_size": group.current_size,
                    "discount_rate": 0.03,
                    "max_discount": 0.25,
                    "final_price": new_price,
                    "calculated_at": datetime.utcnow().isoformat(),
                    "bulk_update": True,
                    "previous_price": old_price
                }
                updated_count += 1
        
        if updated_count > 0:
            db.commit()
            logger.info(f"Bulk updated pricing for {updated_count} groups")
        
        return updated_count