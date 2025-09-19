"""
Advanced Analytics Service for TravelKit
Provides comprehensive business intelligence, conversion tracking, and revenue analytics
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import and_, desc, func, or_
from sqlalchemy.orm import Session

from app.models.models import Destination, Group, Interest, Traveler


class AdvancedAnalyticsService:
    """Advanced analytics service for business intelligence and performance tracking"""

    def __init__(self, db: Session):
        self.db = db
        self.logger = logging.getLogger(__name__)

    def get_conversion_funnel(
        self, 
        start_date: Optional[datetime] = None, 
        end_date: Optional[datetime] = None,
        destination_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Get detailed conversion funnel analysis"""
        try:
            if not start_date:
                start_date = datetime.now() - timedelta(days=30)
            if not end_date:
                end_date = datetime.now()

            # Base query filters
            filters = [
                Interest.created_at >= start_date,
                Interest.created_at <= end_date
            ]
            if destination_id:
                filters.append(Interest.destination_id == destination_id)

            # Stage 1: Interest Expression
            total_interests = self.db.query(Interest).filter(*filters).count()
            
            # Stage 2: Group Matched
            matched_interests = self.db.query(Interest).filter(
                *filters,
                Interest.status == 'matched'
            ).count()
            
            # Stage 3: Group Confirmed
            confirmed_groups = self.db.query(func.count(func.distinct(Group.id))).join(
                Interest, Group.id == Interest.group_id
            ).filter(
                *filters,
                Group.status == 'confirmed'
            ).scalar() or 0
            
            # Stage 4: Payment Completed  
            paid_groups = self.db.query(func.count(func.distinct(Group.id))).join(
                Interest, Group.id == Interest.group_id
            ).filter(
                *filters,
                Group.status == 'confirmed'  # Use confirmed for now
            ).scalar() or 0

            # Calculate conversion rates
            interest_to_match_rate = (matched_interests / total_interests * 100) if total_interests > 0 else 0
            match_to_confirm_rate = (confirmed_groups / matched_interests * 100) if matched_interests > 0 else 0
            confirm_to_payment_rate = (paid_groups / confirmed_groups * 100) if confirmed_groups > 0 else 0
            overall_conversion_rate = (paid_groups / total_interests * 100) if total_interests > 0 else 0

            return {
                'period': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat()
                },
                'funnel_stages': {
                    'interests_expressed': {
                        'count': total_interests,
                        'percentage': 100.0
                    },
                    'groups_matched': {
                        'count': matched_interests,
                        'percentage': round(interest_to_match_rate, 2),
                        'conversion_rate': round(interest_to_match_rate, 2)
                    },
                    'groups_confirmed': {
                        'count': confirmed_groups,
                        'percentage': round((confirmed_groups / total_interests * 100) if total_interests > 0 else 0, 2),
                        'conversion_rate': round(match_to_confirm_rate, 2)
                    },
                    'payments_completed': {
                        'count': paid_groups,
                        'percentage': round(overall_conversion_rate, 2),
                        'conversion_rate': round(confirm_to_payment_rate, 2)
                    }
                },
                'summary': {
                    'overall_conversion_rate': round(overall_conversion_rate, 2),
                    'drop_off_points': self._identify_drop_off_points({
                        'interests': total_interests,
                        'matched': matched_interests,
                        'confirmed': confirmed_groups,
                        'paid': paid_groups
                    })
                }
            }

        except Exception as e:
            self.logger.error(f"Error generating conversion funnel: {e}")
            return {}

    def get_revenue_analytics(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        group_by: str = 'month'
    ) -> Dict[str, Any]:
        """Get comprehensive revenue analytics"""
        try:
            if not start_date:
                start_date = datetime.now() - timedelta(days=90)
            if not end_date:
                end_date = datetime.now()

            # Get revenue data from paid groups
            revenue_query = self.db.query(
                Group.id,
                Group.destination_id,
                Group.current_size,
                Group.final_price_per_person,
                Group.created_at,
                Group.created_at,  # Use created_at as confirmed_at doesn't exist
                Destination.name.label('destination_name')
            ).join(
                Destination, Group.destination_id == Destination.id
            ).filter(
                Group.status == 'confirmed',  # Use confirmed instead of paid
                Group.created_at >= start_date,
                Group.created_at <= end_date
            ).all()

            # Calculate metrics
            total_revenue = sum(g.current_size * g.final_price_per_person for g in revenue_query)
            total_bookings = len(revenue_query)
            total_travelers = sum(g.current_size for g in revenue_query)
            
            avg_booking_value = total_revenue / total_bookings if total_bookings > 0 else 0
            avg_group_size = total_travelers / total_bookings if total_bookings > 0 else 0

            # Revenue by destination
            revenue_by_destination = {}
            for group in revenue_query:
                dest_name = group.destination_name
                revenue = group.current_size * group.final_price_per_person
                if dest_name not in revenue_by_destination:
                    revenue_by_destination[dest_name] = {
                        'revenue': 0,
                        'bookings': 0,
                        'travelers': 0
                    }
                revenue_by_destination[dest_name]['revenue'] += revenue
                revenue_by_destination[dest_name]['bookings'] += 1
                revenue_by_destination[dest_name]['travelers'] += group.current_size

            # Time series revenue
            time_series = self._generate_revenue_time_series(revenue_query, group_by)

            return {
                'period': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                    'group_by': group_by
                },
                'summary': {
                    'total_revenue': float(total_revenue),
                    'total_bookings': total_bookings,
                    'total_travelers': total_travelers,
                    'average_booking_value': round(avg_booking_value, 2),
                    'average_group_size': round(avg_group_size, 1),
                    'revenue_per_traveler': round(total_revenue / total_travelers, 2) if total_travelers > 0 else 0
                },
                'revenue_by_destination': revenue_by_destination,
                'time_series': time_series,
                'growth_metrics': self._calculate_revenue_growth(time_series)
            }

        except Exception as e:
            self.logger.error(f"Error generating revenue analytics: {e}")
            return {}

    def get_destination_performance(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 20
    ) -> Dict[str, Any]:
        """Get detailed destination performance metrics"""
        try:
            if not start_date:
                start_date = datetime.now() - timedelta(days=30)
            if not end_date:
                end_date = datetime.now()

            # Get destination metrics
            performance_query = self.db.query(
                Destination.id,
                Destination.name,
                Destination.country,
                func.count(Interest.id).label('total_interests'),
                func.count(func.distinct(Interest.user_email)).label('unique_users'),
                func.avg(Interest.num_people).label('avg_group_size'),
                func.count(Group.id).label('groups_formed'),
                func.sum(Group.current_size * Group.final_price_per_person).label('revenue_generated')
            ).outerjoin(
                Interest, Destination.id == Interest.destination_id
            ).outerjoin(
                Group, Interest.group_id == Group.id
            ).filter(
                or_(
                    Interest.created_at.is_(None),
                    and_(
                        Interest.created_at >= start_date,
                        Interest.created_at <= end_date
                    )
                ),
                or_(Group.status.is_(None), Group.status == 'confirmed')  # Only include confirmed groups for revenue
            ).group_by(
                Destination.id, Destination.name, Destination.country
            ).order_by(
                func.count(Interest.id).desc()
            ).limit(limit).all()

            destinations = []
            for dest in performance_query:
                # Calculate conversion rate
                interests_count = dest.total_interests or 0
                groups_count = dest.groups_formed or 0
                conversion_rate = (groups_count / interests_count * 100) if interests_count > 0 else 0
                
                # Calculate momentum
                momentum = self._calculate_destination_momentum(dest.id, start_date, end_date)
                
                destinations.append({
                    'destination_id': dest.id,
                    'name': dest.name,
                    'country': dest.country,
                    'metrics': {
                        'total_interests': interests_count,
                        'unique_users': dest.unique_users or 0,
                        'avg_group_size': round(float(dest.avg_group_size or 0), 1),
                        'groups_formed': groups_count,
                        'revenue_generated': float(dest.revenue_generated or 0),
                        'conversion_rate': round(conversion_rate, 2),
                        'momentum_score': round(momentum, 2)
                    },
                    'ranking': len(destinations) + 1
                })

            # Calculate category totals
            total_interests = sum(d['metrics']['total_interests'] for d in destinations)
            total_revenue = sum(d['metrics']['revenue_generated'] for d in destinations)
            total_groups = sum(d['metrics']['groups_formed'] for d in destinations)

            return {
                'period': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat()
                },
                'summary': {
                    'total_destinations': len(destinations),
                    'total_interests': total_interests,
                    'total_revenue': total_revenue,
                    'total_groups_formed': total_groups,
                    'average_conversion_rate': round(
                        sum(d['metrics']['conversion_rate'] for d in destinations) / len(destinations), 2
                    ) if destinations else 0
                },
                'destinations': destinations,
                'top_performers': {
                    'by_interest': destinations[:5],
                    'by_revenue': sorted(destinations, key=lambda x: x['metrics']['revenue_generated'], reverse=True)[:5],
                    'by_conversion': sorted(destinations, key=lambda x: x['metrics']['conversion_rate'], reverse=True)[:5]
                }
            }

        except Exception as e:
            self.logger.error(f"Error generating destination performance: {e}")
            return {}

    def get_user_behavior_analytics(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get user behavior and engagement analytics"""
        try:
            if not start_date:
                start_date = datetime.now() - timedelta(days=30)
            if not end_date:
                end_date = datetime.now()

            # User engagement metrics
            total_users = self.db.query(func.count(func.distinct(Interest.user_email))).filter(
                Interest.created_at >= start_date,
                Interest.created_at <= end_date
            ).scalar()

            # Repeat users (multiple interests)
            repeat_users = self.db.query(Interest.user_email).filter(
                Interest.created_at >= start_date,
                Interest.created_at <= end_date
            ).group_by(Interest.user_email).having(func.count(Interest.id) > 1).count()

            # User interest patterns
            interest_patterns = self.db.query(
                Interest.user_email,
                func.count(Interest.id).label('interest_count'),
                func.count(func.distinct(Interest.destination_id)).label('unique_destinations'),
                func.avg(Interest.num_people).label('avg_group_size'),
                func.min(Interest.created_at).label('first_interest'),
                func.max(Interest.created_at).label('last_interest')
            ).filter(
                Interest.created_at >= start_date,
                Interest.created_at <= end_date
            ).group_by(Interest.user_email).all()

            # Calculate user segments
            user_segments = {
                'single_interest': 0,
                'multiple_interests': 0,
                'destination_explorers': 0,  # Multiple destinations
                'group_organizers': 0,       # Large groups consistently
                'quick_converters': 0        # Fast to book
            }

            for pattern in interest_patterns:
                if pattern.interest_count == 1:
                    user_segments['single_interest'] += 1
                else:
                    user_segments['multiple_interests'] += 1
                
                if pattern.unique_destinations > 2:
                    user_segments['destination_explorers'] += 1
                
                if pattern.avg_group_size > 4:
                    user_segments['group_organizers'] += 1

            # Peak activity times
            hourly_activity = self.db.query(
                func.extract('hour', Interest.created_at).label('hour'),
                func.count(Interest.id).label('interest_count')
            ).filter(
                Interest.created_at >= start_date,
                Interest.created_at <= end_date
            ).group_by(func.extract('hour', Interest.created_at)).all()

            return {
                'period': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat()
                },
                'user_metrics': {
                    'total_users': total_users,
                    'repeat_users': repeat_users,
                    'repeat_rate': round((repeat_users / total_users * 100) if total_users > 0 else 0, 2),
                    'avg_interests_per_user': round(
                        sum(p.interest_count for p in interest_patterns) / len(interest_patterns), 2
                    ) if interest_patterns else 0
                },
                'user_segments': user_segments,
                'engagement_patterns': {
                    'peak_hours': [{'hour': int(h.hour), 'activity': h.interest_count} for h in hourly_activity],
                    'user_journey_insights': self._analyze_user_journeys(interest_patterns)
                }
            }

        except Exception as e:
            self.logger.error(f"Error generating user behavior analytics: {e}")
            return {}

    def _identify_drop_off_points(self, funnel_data: Dict[str, int]) -> List[Dict[str, Any]]:
        """Identify where users drop off in the conversion funnel"""
        drop_offs = []
        
        stages = [
            ('interests', 'matched', 'Interest to Match'),
            ('matched', 'confirmed', 'Match to Confirmation'),
            ('confirmed', 'paid', 'Confirmation to Payment')
        ]
        
        for from_stage, to_stage, label in stages:
            from_count = funnel_data.get(from_stage, 0)
            to_count = funnel_data.get(to_stage, 0)
            
            if from_count > 0:
                drop_off_rate = ((from_count - to_count) / from_count) * 100
                if drop_off_rate > 50:  # High drop-off threshold
                    drop_offs.append({
                        'stage': label,
                        'drop_off_rate': round(drop_off_rate, 2),
                        'users_lost': from_count - to_count,
                        'severity': 'high' if drop_off_rate > 70 else 'medium'
                    })
        
        return drop_offs

    def _generate_revenue_time_series(self, revenue_data: List, group_by: str) -> List[Dict[str, Any]]:
        """Generate time series data for revenue"""
        time_series = {}
        
        for group in revenue_data:
            if group.created_at:  # Use created_at since confirmed_at doesn't exist
                if group_by == 'day':
                    key = group.created_at.date().isoformat()
                elif group_by == 'week':
                    week_start = group.created_at - timedelta(days=group.created_at.weekday())
                    key = week_start.date().isoformat()
                else:  # month
                    key = f"{group.created_at.year}-{group.created_at.month:02d}"
                
                if key not in time_series:
                    time_series[key] = {'revenue': 0, 'bookings': 0, 'travelers': 0}
                
                time_series[key]['revenue'] += group.current_size * group.final_price_per_person
                time_series[key]['bookings'] += 1
                time_series[key]['travelers'] += group.current_size
        
        return [
            {'period': period, **metrics}
            for period, metrics in sorted(time_series.items())
        ]

    def _calculate_revenue_growth(self, time_series: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate revenue growth metrics"""
        if len(time_series) < 2:
            return {'growth_rate': 0, 'trend': 'insufficient_data'}
        
        recent_revenue = sum(period['revenue'] for period in time_series[-2:])
        previous_revenue = sum(period['revenue'] for period in time_series[-4:-2]) if len(time_series) >= 4 else 0
        
        if previous_revenue > 0:
            growth_rate = ((recent_revenue - previous_revenue) / previous_revenue) * 100
        else:
            growth_rate = 100 if recent_revenue > 0 else 0
        
        trend = 'growing' if growth_rate > 5 else 'declining' if growth_rate < -5 else 'stable'
        
        return {
            'growth_rate': round(growth_rate, 2),
            'trend': trend,
            'recent_revenue': recent_revenue,
            'previous_revenue': previous_revenue
        }

    def _calculate_destination_momentum(
        self, 
        destination_id: int, 
        start_date: datetime, 
        end_date: datetime
    ) -> float:
        """Calculate momentum score for a destination"""
        try:
            total_days = (end_date - start_date).days
            if total_days < 14:
                return 0.0
            
            mid_point = start_date + timedelta(days=total_days // 2)
            
            # Recent period activity
            recent_count = self.db.query(Interest).filter(
                Interest.destination_id == destination_id,
                Interest.created_at >= mid_point,
                Interest.created_at <= end_date
            ).count()
            
            # Earlier period activity
            earlier_count = self.db.query(Interest).filter(
                Interest.destination_id == destination_id,
                Interest.created_at >= start_date,
                Interest.created_at < mid_point
            ).count()
            
            if earlier_count == 0:
                return 1.0 if recent_count > 0 else 0.0
            
            return min((recent_count / earlier_count), 5.0)  # Cap at 5x growth
            
        except Exception as e:
            self.logger.error(f"Error calculating momentum for destination {destination_id}: {e}")
            return 0.0

    def _analyze_user_journeys(self, interest_patterns: List) -> Dict[str, Any]:
        """Analyze common user journey patterns"""
        if not interest_patterns:
            return {}
        
        # Calculate average time to second interest
        multi_interest_users = [p for p in interest_patterns if p.interest_count > 1]
        if multi_interest_users:
            avg_time_to_second = sum(
                (p.last_interest - p.first_interest).days for p in multi_interest_users
            ) / len(multi_interest_users)
        else:
            avg_time_to_second = 0
        
        return {
            'avg_time_to_second_interest_days': round(avg_time_to_second, 1),
            'multi_destination_rate': round(
                len([p for p in interest_patterns if p.unique_destinations > 1]) / len(interest_patterns) * 100, 2
            ),
            'avg_destinations_per_user': round(
                sum(p.unique_destinations for p in interest_patterns) / len(interest_patterns), 2
            )
        }