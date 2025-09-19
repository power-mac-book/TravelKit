from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timedelta
import redis
from app.models.models import Destination, Interest
from app.models import schemas
from app.core.config import settings

# Redis client for caching
redis_client = redis.from_url(settings.REDIS_URL)


class DestinationService:
    def __init__(self, db: Session):
        self.db = db

    async def get_destinations_with_interest_summary(self, skip: int = 0, limit: int = 100) -> List[schemas.Destination]:
        """Get destinations with interest summary data"""
        destinations = self.db.query(Destination).filter(
            Destination.is_active == True
        ).offset(skip).limit(limit).all()
        
        result = []
        for dest in destinations:
            dest_dict = dest.__dict__.copy()
            dest_dict['interest_summary'] = await self._get_interest_summary(dest.id)
            result.append(schemas.Destination(**dest_dict))
        
        return result

    async def get_destination_by_id(self, destination_id: int) -> Optional[schemas.Destination]:
        """Get single destination with interest summary"""
        destination = self.db.query(Destination).filter(
            Destination.id == destination_id,
            Destination.is_active == True
        ).first()
        
        if not destination:
            return None
            
        dest_dict = destination.__dict__.copy()
        dest_dict['interest_summary'] = await self._get_interest_summary(destination_id)
        return schemas.Destination(**dest_dict)

    async def _get_interest_summary(self, destination_id: int) -> schemas.InterestSummary:
        """Get interest summary for a destination"""
        now = datetime.utcnow()
        thirty_days_ago = now - timedelta(days=30)
        thirty_days_future = now + timedelta(days=30)
        
        # Count interests in last 30 days
        last_30_count = self.db.query(Interest).filter(
            Interest.destination_id == destination_id,
            Interest.created_at >= thirty_days_ago,
            Interest.status == 'open'
        ).count()
        
        # Count interests for next 30 days
        next_30_count = self.db.query(Interest).filter(
            Interest.destination_id == destination_id,
            Interest.date_from <= thirty_days_future,
            Interest.date_from >= now,
            Interest.status == 'open'
        ).count()
        
        # Get recent names sample
        recent_interests = self.db.query(Interest).filter(
            Interest.destination_id == destination_id,
            Interest.created_at >= thirty_days_ago,
            Interest.status == 'open'
        ).order_by(desc(Interest.created_at)).limit(4).all()
        
        if recent_interests:
            names = [interest.user_name.split()[0] for interest in recent_interests]  # First names only
            if len(names) == 1:
                names_sample = f"{names[0]} is interested"
            elif len(names) <= 3:
                names_sample = f"{', '.join(names[:-1])} and {names[-1]} are interested"
            else:
                names_sample = f"{names[0]} and {len(names)-1} others are interested"
        else:
            names_sample = "Be the first to show interest!"
        
        return schemas.InterestSummary(
            total_interested_last_30_days=last_30_count,
            next_30_day_count=next_30_count,
            recent_names_sample=names_sample
        )

    async def get_calendar_data(self, destination_id: int, month: str) -> schemas.CalendarResponse:
        """Get calendar data for a destination and month"""
        try:
            year, month_num = map(int, month.split('-'))
            start_date = datetime(year, month_num, 1)
            if month_num == 12:
                end_date = datetime(year + 1, 1, 1)
            else:
                end_date = datetime(year, month_num + 1, 1)
        except ValueError:
            raise ValueError("Invalid month format. Use YYYY-MM")
        
        # Try Redis cache first
        cache_key = f"calendar:{destination_id}:{month}"
        cached_data = redis_client.get(cache_key)
        
        if cached_data:
            import json
            data = json.loads(cached_data)
        else:
            # Query database
            calendar_data = []
            current_date = start_date
            
            while current_date < end_date:
                date_str = current_date.strftime('%Y-%m-%d')
                
                count = self.db.query(Interest).filter(
                    Interest.destination_id == destination_id,
                    Interest.date_from <= current_date,
                    Interest.date_to >= current_date,
                    Interest.status == 'open'
                ).count()
                
                calendar_data.append({
                    "date": date_str,
                    "count": count
                })
                
                current_date += timedelta(days=1)
            
            # Cache for 1 hour
            import json
            redis_client.setex(cache_key, 3600, json.dumps(calendar_data))
            data = calendar_data
        
        return schemas.CalendarResponse(
            month=month,
            data=[schemas.CalendarData(**item) for item in data]
        )

    async def create_destination(self, destination_data: schemas.DestinationCreate) -> schemas.Destination:
        """Create new destination"""
        destination = None
        try:
            destination = Destination(**destination_data.dict())
            self.db.add(destination)
            self.db.commit()
            self.db.refresh(destination)
            
            dest_dict = destination.__dict__.copy()
            dest_dict['interest_summary'] = await self._get_interest_summary(destination.id)
            return schemas.Destination(**dest_dict)
        except IntegrityError as e:
            self.db.rollback()
            # Get slug from either destination object or original data
            slug = destination.slug if destination else destination_data.slug
            if "ix_destinations_slug" in str(e):
                raise ValueError(f"A destination with slug '{slug}' already exists. Please use a different name or modify the slug.")
            else:
                raise ValueError(f"Database constraint violation: {str(e)}")
        except Exception as e:
            self.db.rollback()
            raise e

    async def update_destination(self, destination_id: int, destination_update: schemas.DestinationUpdate) -> Optional[schemas.Destination]:
        """Update destination"""
        destination = self.db.query(Destination).filter(Destination.id == destination_id).first()
        if not destination:
            return None
        
        update_data = destination_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(destination, field, value)
        
        self.db.commit()
        self.db.refresh(destination)
        
        dest_dict = destination.__dict__.copy()
        dest_dict['interest_summary'] = await self._get_interest_summary(destination.id)
        return schemas.Destination(**dest_dict)

    async def delete_destination(self, destination_id: int) -> bool:
        """Soft delete destination"""
        destination = self.db.query(Destination).filter(Destination.id == destination_id).first()
        if not destination:
            return False
        
        destination.is_active = False
        self.db.commit()
        return True

    async def get_all_destinations_admin(self, skip: int = 0, limit: int = 100, include_inactive: bool = False) -> List[schemas.Destination]:
        """Get all destinations for admin (including inactive if requested)"""
        query = self.db.query(Destination)
        
        if not include_inactive:
            query = query.filter(Destination.is_active == True)
        
        destinations = query.offset(skip).limit(limit).all()
        
        result = []
        for dest in destinations:
            dest_dict = dest.__dict__.copy()
            dest_dict['interest_summary'] = await self._get_interest_summary(dest.id)
            result.append(schemas.Destination(**dest_dict))
        
        return result