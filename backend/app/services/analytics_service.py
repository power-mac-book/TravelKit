from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc, text, extract
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta

from app.models.models import Destination, Interest, Group, Traveler, AnalyticsMaterialized


class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db

    def get_dashboard_stats(self) -> Dict[str, Any]:
        """Get high-level dashboard statistics"""
        
        # Count totals
        total_destinations = self.db.query(Destination).filter(Destination.is_active == True).count()
        total_interests = self.db.query(Interest).count()
        total_groups = self.db.query(Group).count()
        total_users = self.db.query(Traveler).count()
        
        # Recent interests (last 7 days)
        week_ago = datetime.utcnow() - timedelta(days=7)
        recent_interests = self.db.query(Interest)\
            .filter(Interest.created_at >= week_ago)\
            .order_by(desc(Interest.created_at))\
            .limit(10)\
            .all()
        
        # Recent groups
        recent_groups = self.db.query(Group)\
            .filter(Group.created_at >= week_ago)\
            .order_by(desc(Group.created_at))\
            .limit(10)\
            .all()
        
        return {
            'total_destinations': total_destinations,
            'total_interests': total_interests,
            'total_groups': total_groups,
            'total_users': total_users,
            'recent_interests': [
                {
                    'id': interest.id,
                    'destination_name': interest.destination.name if interest.destination else 'Unknown',
                    'user_name': interest.user_name,
                    'created_at': interest.created_at,
                    'num_people': interest.num_people,
                    'status': interest.status
                }
                for interest in recent_interests
            ],
            'recent_groups': [
                {
                    'id': group.id,
                    'destination_name': group.destination.name if group.destination else 'Unknown',
                    'name': group.name,
                    'current_size': group.current_size,
                    'status': group.status,
                    'created_at': group.created_at
                }
                for group in recent_groups
            ]
        }

    def get_interest_trends(self, days: int = 30) -> Dict[str, Any]:
        """Get interest trends over time"""
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Daily interest counts
        daily_interests = self.db.query(
            func.date(Interest.created_at).label('date'),
            func.count(Interest.id).label('count')
        ).filter(
            Interest.created_at >= start_date
        ).group_by(
            func.date(Interest.created_at)
        ).order_by('date').all()
        
        # Interest by destination
        destination_interests = self.db.query(
            Destination.name,
            func.count(Interest.id).label('count')
        ).join(
            Interest, Destination.id == Interest.destination_id
        ).filter(
            Interest.created_at >= start_date
        ).group_by(
            Destination.name
        ).order_by(desc('count')).limit(10).all()
        
        # Interest by status
        status_breakdown = self.db.query(
            Interest.status,
            func.count(Interest.id).label('count')
        ).filter(
            Interest.created_at >= start_date
        ).group_by(Interest.status).all()
        
        return {
            'daily_trends': [
                {
                    'date': str(row.date),
                    'count': row.count
                }
                for row in daily_interests
            ],
            'top_destinations': [
                {
                    'destination': row.name,
                    'count': row.count
                }
                for row in destination_interests
            ],
            'status_breakdown': [
                {
                    'status': row.status,
                    'count': row.count
                }
                for row in status_breakdown
            ]
        }

    def get_conversion_funnel(self, days: int = 30) -> Dict[str, Any]:
        """Get conversion funnel analytics"""
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Step 1: Total interests
        total_interests = self.db.query(Interest).filter(
            Interest.created_at >= start_date
        ).count()
        
        # Step 2: Interests matched to groups
        matched_interests = self.db.query(Interest).filter(
            and_(
                Interest.created_at >= start_date,
                Interest.status == 'matched'
            )
        ).count()
        
        # Step 3: Confirmed group members
        confirmed_interests = self.db.query(Interest).filter(
            and_(
                Interest.created_at >= start_date,
                Interest.status == 'converted'
            )
        ).count()
        
        # Calculate conversion rates
        match_rate = (matched_interests / total_interests * 100) if total_interests > 0 else 0
        conversion_rate = (confirmed_interests / total_interests * 100) if total_interests > 0 else 0
        
        return {
            'total_interests': total_interests,
            'matched_interests': matched_interests,
            'confirmed_interests': confirmed_interests,
            'match_rate': round(match_rate, 2),
            'conversion_rate': round(conversion_rate, 2),
            'funnel_steps': [
                {'step': 'Interest Expressed', 'count': total_interests, 'rate': 100.0},
                {'step': 'Matched to Group', 'count': matched_interests, 'rate': round(match_rate, 2)},
                {'step': 'Converted to Booking', 'count': confirmed_interests, 'rate': round(conversion_rate, 2)}
            ]
        }

    def get_group_analytics(self, days: int = 30) -> Dict[str, Any]:
        """Get group formation and success analytics"""
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Group status breakdown
        group_status = self.db.query(
            Group.status,
            func.count(Group.id).label('count')
        ).filter(
            Group.created_at >= start_date
        ).group_by(Group.status).all()
        
        # Average group size
        avg_group_size = self.db.query(
            func.avg(Group.current_size)
        ).filter(
            and_(
                Group.created_at >= start_date,
                Group.current_size > 0
            )
        ).scalar() or 0
        
        # Group formation rate by destination
        group_by_destination = self.db.query(
            Destination.name,
            func.count(Group.id).label('group_count'),
            func.avg(Group.current_size).label('avg_size')
        ).join(
            Group, Destination.id == Group.destination_id
        ).filter(
            Group.created_at >= start_date
        ).group_by(
            Destination.name
        ).order_by(desc('group_count')).limit(10).all()
        
        return {
            'status_breakdown': [
                {
                    'status': row.status,
                    'count': row.count
                }
                for row in group_status
            ],
            'average_group_size': round(float(avg_group_size), 1),
            'groups_by_destination': [
                {
                    'destination': row.name,
                    'group_count': row.group_count,
                    'average_size': round(float(row.avg_size or 0), 1)
                }
                for row in group_by_destination
            ]
        }

    def get_revenue_analytics(self, days: int = 30) -> Dict[str, Any]:
        """Get revenue and pricing analytics"""
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Total potential revenue from confirmed groups
        revenue_data = self.db.query(
            func.sum(Group.final_price_per_person * Group.current_size).label('total_revenue'),
            func.avg(Group.final_price_per_person).label('avg_price'),
            func.count(Group.id).label('confirmed_groups')
        ).filter(
            and_(
                Group.created_at >= start_date,
                Group.status == 'confirmed'
            )
        ).first()
        
        # Revenue by destination
        revenue_by_destination = self.db.query(
            Destination.name,
            func.sum(Group.final_price_per_person * Group.current_size).label('revenue'),
            func.count(Group.id).label('groups')
        ).join(
            Group, Destination.id == Group.destination_id
        ).filter(
            and_(
                Group.created_at >= start_date,
                Group.status == 'confirmed'
            )
        ).group_by(
            Destination.name
        ).order_by(desc('revenue')).limit(10).all()
        
        return {
            'total_revenue': float(revenue_data.total_revenue or 0),
            'average_price': float(revenue_data.avg_price or 0),
            'confirmed_groups': revenue_data.confirmed_groups or 0,
            'revenue_by_destination': [
                {
                    'destination': row.name,
                    'revenue': float(row.revenue or 0),
                    'groups': row.groups
                }
                for row in revenue_by_destination
            ]
        }

    def get_geographic_distribution(self) -> Dict[str, Any]:
        """Get geographic distribution of interests and groups"""
        
        # Interest distribution by country
        country_interests = self.db.query(
            Destination.country,
            func.count(Interest.id).label('interest_count')
        ).join(
            Interest, Destination.id == Interest.destination_id
        ).group_by(
            Destination.country
        ).order_by(desc('interest_count')).all()
        
        # Group distribution by country
        country_groups = self.db.query(
            Destination.country,
            func.count(Group.id).label('group_count'),
            func.sum(Group.current_size).label('total_travelers')
        ).join(
            Group, Destination.id == Group.destination_id
        ).group_by(
            Destination.country
        ).order_by(desc('group_count')).all()
        
        return {
            'interests_by_country': [
                {
                    'country': row.country,
                    'interest_count': row.interest_count
                }
                for row in country_interests
            ],
            'groups_by_country': [
                {
                    'country': row.country,
                    'group_count': row.group_count,
                    'total_travelers': row.total_travelers or 0
                }
                for row in country_groups
            ]
        }