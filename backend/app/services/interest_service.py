from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from datetime import datetime, timedelta

from app.models.models import Interest, Destination
from app.models.schemas import InterestCreate, Interest as InterestResponse


class InterestService:
    def __init__(self, db: Session):
        self.db = db

    def create_interest(self, interest: InterestCreate) -> Interest:
        """Create a new interest entry"""
        db_interest = Interest(
            destination_id=interest.destination_id,
            user_name=interest.user_name,
            user_email=interest.user_email,
            user_phone=interest.user_phone,
            num_people=interest.num_people,
            date_from=interest.date_from,
            date_to=interest.date_to,
            budget_min=interest.budget_min,
            budget_max=interest.budget_max,
            special_requests=interest.special_requests,
            client_uuid=interest.client_uuid,
            status="open"
        )
        
        self.db.add(db_interest)
        self.db.commit()
        self.db.refresh(db_interest)
        
        return db_interest

    def get_interests(
        self, 
        destination_id: Optional[int] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Interest]:
        """Get interests with optional filtering"""
        query = self.db.query(Interest)
        
        if destination_id:
            query = query.filter(Interest.destination_id == destination_id)
        
        if status:
            query = query.filter(Interest.status == status)
            
        return query.offset(skip).limit(limit).all()

    def get_interest_by_id(self, interest_id: int) -> Optional[Interest]:
        """Get a specific interest by ID"""
        return self.db.query(Interest).filter(Interest.id == interest_id).first()

    def update_interest_status(self, interest_id: int, status: str) -> Optional[Interest]:
        """Update interest status"""
        interest = self.get_interest_by_id(interest_id)
        if interest:
            interest.status = status
            interest.updated_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(interest)
        return interest

    def get_interest_counts_by_destination(self, destination_id: int, days: int = 30) -> dict:
        """Get interest counts for social proof"""
        since_date = datetime.utcnow() - timedelta(days=days)
        
        # Count total interests
        total_count = self.db.query(Interest).filter(
            and_(
                Interest.destination_id == destination_id,
                Interest.created_at >= since_date
            )
        ).count()
        
        # Count interests for next 30 days
        next_30_days = datetime.utcnow() + timedelta(days=30)
        upcoming_count = self.db.query(Interest).filter(
            and_(
                Interest.destination_id == destination_id,
                Interest.date_from <= next_30_days,
                Interest.date_to >= datetime.utcnow()
            )
        ).count()
        
        # Get recent interest names (first names only for privacy)
        recent_interests = self.db.query(Interest.user_name).filter(
            and_(
                Interest.destination_id == destination_id,
                Interest.created_at >= since_date
            )
        ).order_by(Interest.created_at.desc()).limit(5).all()
        
        recent_names = [name[0].split()[0] for name in recent_interests if name[0]]
        
        return {
            "total_interested_last_30_days": total_count,
            "next_30_day_count": upcoming_count,
            "recent_names_sample": recent_names[:3]  # Show max 3 names
        }

    def get_calendar_data(self, destination_id: int, year: int, month: int) -> dict:
        """Get interest counts by date for calendar view"""
        from calendar import monthrange
        
        # Get first and last day of the month
        first_day = datetime(year, month, 1)
        last_day_num = monthrange(year, month)[1]
        last_day = datetime(year, month, last_day_num, 23, 59, 59)
        
        # Query interests that overlap with any date in the month
        interests = self.db.query(Interest).filter(
            and_(
                Interest.destination_id == destination_id,
                or_(
                    and_(Interest.date_from <= last_day, Interest.date_to >= first_day),
                    and_(Interest.date_from >= first_day, Interest.date_from <= last_day)
                )
            )
        ).all()
        
        # Count interests by date
        date_counts = {}
        for day in range(1, last_day_num + 1):
            current_date = datetime(year, month, day)
            count = 0
            
            for interest in interests:
                # Check if current_date falls within interest date range
                if interest.date_from <= current_date.date() <= interest.date_to:
                    count += 1
            
            if count > 0:
                date_counts[f"{year}-{month:02d}-{day:02d}"] = count
        
        return date_counts

    def get_clusterable_interests(self, destination_id: int, window_days: int = 7) -> List[Interest]:
        """Get interests suitable for clustering into groups"""
        # Get interests from the last 30 days that are still pending
        since_date = datetime.utcnow() - timedelta(days=30)
        future_date = datetime.utcnow() + timedelta(days=90)  # Look 3 months ahead
        
        return self.db.query(Interest).filter(
            and_(
                Interest.destination_id == destination_id,
                Interest.status == "open",
                Interest.date_from >= datetime.utcnow(),  # Future dates only
                Interest.date_from <= future_date,
                Interest.created_at >= since_date
            )
        ).order_by(Interest.date_from).all()

    def get_interests_with_destination(
        self,
        status: Optional[str] = None,
        destination_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[dict]:
        """Get interests with destination details for admin"""
        query = self.db.query(
            Interest.id,
            Interest.destination_id,
            Interest.user_name,
            Interest.user_email,
            Interest.user_phone,
            Interest.num_people,
            Interest.date_from,
            Interest.date_to,
            Interest.budget_min,
            Interest.budget_max,
            Interest.special_requests,
            Interest.client_uuid,
            Interest.status,
            Interest.group_id,
            Interest.created_at,
            Interest.updated_at,
            Destination.name.label("destination_name"),
            Destination.slug.label("destination_slug"),
            Destination.country.label("destination_country")
        ).join(Destination, Interest.destination_id == Destination.id)
        
        if status:
            query = query.filter(Interest.status == status)
            
        if destination_id:
            query = query.filter(Interest.destination_id == destination_id)
            
        interests = query.order_by(Interest.created_at.desc()).offset(skip).limit(limit).all()
        
        # Convert to dictionaries that match InterestWithDestination schema
        result = []
        for interest in interests:
            result.append({
                "id": interest.id,
                "destination_id": interest.destination_id,
                "user_name": interest.user_name,
                "user_email": interest.user_email,
                "user_phone": interest.user_phone,
                "num_people": interest.num_people,
                "date_from": interest.date_from,
                "date_to": interest.date_to,
                "budget_min": interest.budget_min,
                "budget_max": interest.budget_max,
                "special_requests": interest.special_requests,
                "client_uuid": interest.client_uuid,
                "status": interest.status,
                "group_id": interest.group_id,
                "created_at": interest.created_at,
                "updated_at": interest.updated_at,
                "destination_name": interest.destination_name,
                "destination_slug": interest.destination_slug,
                "destination_country": interest.destination_country
            })
            
        return result

    def get_interest_statistics(self) -> dict:
        """Get interest statistics for admin dashboard"""
        total_interests = self.db.query(Interest).count()
        
        open_interests = self.db.query(Interest).filter(
            Interest.status == "open"
        ).count()
        
        matched_interests = self.db.query(Interest).filter(
            Interest.status == "matched"
        ).count()
        
        converted_interests = self.db.query(Interest).filter(
            Interest.status == "converted"
        ).count()
        
        # Interests in last 7 days
        last_7_days = datetime.utcnow() - timedelta(days=7)
        interests_last_7_days = self.db.query(Interest).filter(
            Interest.created_at >= last_7_days
        ).count()
        
        # Interests in last 30 days
        last_30_days = datetime.utcnow() - timedelta(days=30)
        interests_last_30_days = self.db.query(Interest).filter(
            Interest.created_at >= last_30_days
        ).count()
        
        # Top destinations by interest count
        top_destinations = self.db.query(
            Destination.name,
            Destination.id,
            func.count(Interest.id).label("interest_count")
        ).join(
            Interest, Interest.destination_id == Destination.id
        ).group_by(
            Destination.id, Destination.name
        ).order_by(
            func.count(Interest.id).desc()
        ).limit(5).all()
        
        top_destinations_list = [
            {
                "destination_name": dest.name,
                "destination_id": dest.id,
                "interest_count": dest.interest_count
            }
            for dest in top_destinations
        ]
        
        return {
            "total_interests": total_interests,
            "open_interests": open_interests,
            "matched_interests": matched_interests,
            "converted_interests": converted_interests,
            "interests_last_7_days": interests_last_7_days,
            "interests_last_30_days": interests_last_30_days,
            "top_destinations": top_destinations_list
        }