"""
Enhanced Social Proof Analytics Service
Provides advanced analytics tracking, A/B testing, and personalized social proof
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_, or_
import json
import hashlib
import logging
from enum import Enum

from app.models.models import Interest, Destination, Group, Traveler
from app.core.database import get_db


class SocialProofVariant(Enum):
    """A/B testing variants for social proof messages"""
    URGENCY_FOCUSED = "urgency_focused"  # "Only 3 spots left!"
    SOCIAL_FOCUSED = "social_focused"    # "15 people interested this week"
    BENEFIT_FOCUSED = "benefit_focused"  # "Save ₹8,000 with group pricing"
    DEADLINE_FOCUSED = "deadline_focused" # "Booking closes in 2 days"
    MOMENTUM_FOCUSED = "momentum_focused" # "50% more interest than usual!"


class UserSegment(Enum):
    """User segments for personalized messaging"""
    FIRST_TIME_VISITOR = "first_time"
    RETURN_VISITOR = "return_visitor"
    HIGH_BUDGET = "high_budget"
    BUDGET_CONSCIOUS = "budget_conscious"
    FREQUENT_TRAVELER = "frequent_traveler"
    FAMILY_TRAVELER = "family_traveler"


class EnhancedSocialProofAnalytics:
    """Enhanced analytics for social proof optimization"""
    
    def __init__(self, db: Session):
        self.db = db
        self.logger = logging.getLogger(__name__)

    def get_trending_destinations(self, limit: int = 10, time_window_days: int = 7) -> List[Dict[str, Any]]:
        """Get trending destinations based on recent interest activity"""
        try:
            # Calculate trending score based on recent activity
            cutoff_date = datetime.now() - timedelta(days=time_window_days)
            
            trending_query = self.db.query(
                Destination.id,
                Destination.name,
                Destination.country,
                func.count(Interest.id).label('interest_count'),
                func.count(func.distinct(Interest.user_email)).label('unique_users'),
                func.avg(Interest.num_people).label('avg_group_size')
            ).join(
                Interest, Destination.id == Interest.destination_id
            ).filter(
                Interest.created_at >= cutoff_date,
                Interest.status == 'open'
            ).group_by(
                Destination.id, Destination.name, Destination.country
            ).order_by(
                func.count(Interest.id).desc()
            ).limit(limit).all()
            
            trending_destinations = []
            for dest in trending_query:
                # Calculate momentum (growth rate)
                momentum = self._calculate_destination_momentum(dest.id, time_window_days)
                
                trending_destinations.append({
                    'destination_id': dest.id,
                    'name': dest.name,
                    'country': dest.country,
                    'interest_count': dest.interest_count,
                    'unique_users': dest.unique_users,
                    'avg_group_size': float(dest.avg_group_size or 0),
                    'momentum_score': momentum,
                    'trending_rank': len(trending_destinations) + 1
                })
            
            return trending_destinations
            
        except Exception as e:
            self.logger.error(f"Error getting trending destinations: {e}")
            return []

    def get_personalized_social_proof(
        self, 
        destination_id: int, 
        variant: SocialProofVariant = SocialProofVariant.SOCIAL_FOCUSED,
        user_segment: UserSegment = UserSegment.FIRST_TIME_VISITOR
    ) -> Dict[str, Any]:
        """Get personalized social proof message for a destination"""
        try:
            metrics = self._get_destination_metrics(destination_id)
            
            # Get variant-specific message
            message_data = self._generate_variant_message(destination_id, variant, metrics)
            
            # Add personalization based on user segment
            personalized_message = self._personalize_for_segment(message_data, user_segment)
            
            return {
                'destination_id': destination_id,
                'variant': variant.value,
                'user_segment': user_segment.value,
                'message': personalized_message,
                'metrics': metrics,
                'generated_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Error generating social proof for destination {destination_id}: {e}")
            return self._get_fallback_message()

    def track_social_proof_interaction(
        self,
        user_id: Optional[str],
        session_id: str,
        destination_id: int,
        variant: SocialProofVariant,
        action: str,
        context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Track user interaction with social proof elements"""
        try:
            interaction_data = {
                'user_id': user_id,
                'session_id': session_id,
                'destination_id': destination_id,
                'variant': variant.value,
                'action': action,
                'context': context or {},
                'timestamp': datetime.now().isoformat()
            }
            
            # Here you would typically store this in a tracking database/service
            # For now, we'll just log it
            self.logger.info(f"Social proof interaction tracked: {interaction_data}")
            
            return {
                'tracked': True,
                'interaction_id': hashlib.md5(f"{session_id}_{destination_id}_{datetime.now().timestamp()}".encode()).hexdigest()
            }
            
        except Exception as e:
            self.logger.error(f"Error tracking social proof interaction: {e}")
            return {'tracked': False, 'error': str(e)}

    def _calculate_destination_momentum(self, destination_id: int, time_window_days: int) -> float:
        """Calculate momentum score for a destination"""
        try:
            now = datetime.now()
            recent_period = now - timedelta(days=time_window_days // 2)
            older_period = now - timedelta(days=time_window_days)
            
            # Count interests in recent vs older period
            recent_count = self.db.query(Interest).filter(
                Interest.destination_id == destination_id,
                Interest.created_at >= recent_period,
                Interest.status == 'open'
            ).count()
            
            older_count = self.db.query(Interest).filter(
                Interest.destination_id == destination_id,
                Interest.created_at >= older_period,
                Interest.created_at < recent_period,
                Interest.status == 'open'
            ).count()
            
            if older_count == 0:
                return 1.0 if recent_count > 0 else 0.0
            
            return min((recent_count / older_count), 3.0)  # Cap at 3x growth
            
        except Exception as e:
            self.logger.error(f"Error calculating momentum for destination {destination_id}: {e}")
            return 0.0

    def _generate_variant_message(self, destination_id: int, variant: SocialProofVariant, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Generate message based on A/B testing variant"""
        base_message = ""
        message_type = "social"
        
        if variant == SocialProofVariant.URGENCY_FOCUSED:
            available_spots = metrics.get('available_spots', 0)
            if available_spots > 0:
                base_message = f"Only {available_spots} spots left!"
                message_type = "urgency"
            else:
                interests_24h = metrics.get('interests_24h', 0)
                base_message = f"{interests_24h} people interested in last 24h!"
                
        elif variant == SocialProofVariant.SOCIAL_FOCUSED:
            unique_visitors = metrics.get('unique_visitors_today', 0)
            if unique_visitors > 0:
                base_message = f"{unique_visitors} people are planning this trip"
                message_type = "social"
            else:
                total_interested = metrics.get('total_interested', 0)
                base_message = f"{total_interested} travelers interested"
                
        elif variant == SocialProofVariant.MOMENTUM_FOCUSED:
            momentum = metrics.get('momentum', 0)
            if momentum > 1.5:
                base_message = f"🔥 {int((momentum - 1) * 100)}% more interest than usual!"
                message_type = "momentum"
            else:
                total_interested = metrics.get('total_interested', 0)
                base_message = f"Popular choice with {total_interested} interested"
        
        return {
            'text': base_message,
            'type': message_type,
            'confidence': min(metrics.get('total_interested', 0) / 10, 1.0)
        }

    def _personalize_for_segment(self, message_data: Dict[str, Any], segment: UserSegment) -> Dict[str, Any]:
        """Personalize message based on user segment"""
        if segment == UserSegment.RETURN_VISITOR:
            message_data['text'] = f"Welcome back! {message_data['text']}"
        elif segment == UserSegment.FREQUENT_TRAVELER:
            message_data['text'] = f"Perfect for you! {message_data['text']}"
        elif segment == UserSegment.BUDGET_CONSCIOUS:
            message_data['text'] = f"{message_data['text']} - Best group rates available!"
        
        return message_data

    def _get_destination_metrics(self, destination_id: int) -> Dict[str, Any]:
        """Get comprehensive metrics for a destination"""
        try:
            # Get basic interest counts
            total_interested = self.db.query(Interest).filter(
                Interest.destination_id == destination_id,
                Interest.status == 'open'
            ).count()
            
            # Get 24h activity
            last_24h = datetime.now() - timedelta(hours=24)
            interests_24h = self.db.query(Interest).filter(
                Interest.destination_id == destination_id,
                Interest.created_at >= last_24h,
                Interest.status == 'open'
            ).count()
            
            # Get unique visitors today
            today = datetime.now().date()
            unique_visitors_today = self.db.query(Interest.user_email).filter(
                Interest.destination_id == destination_id,
                func.date(Interest.created_at) == today,
                Interest.status == 'open'
            ).distinct().count()
            
            # Get available spots (from groups)
            available_spots = self.db.query(func.sum(Group.max_people - Group.current_people)).filter(
                Group.destination_id == destination_id,
                Group.status == 'open'
            ).scalar() or 0
            
            # Calculate momentum
            momentum = self._calculate_destination_momentum(destination_id, 7)
            
            return {
                'total_interested': total_interested,
                'interests_24h': interests_24h,
                'unique_visitors_today': unique_visitors_today,
                'available_spots': max(0, available_spots),
                'momentum': momentum
            }
            
        except Exception as e:
            self.logger.error(f"Error getting metrics for destination {destination_id}: {e}")
            return {
                'total_interested': 0,
                'interests_24h': 0,
                'unique_visitors_today': 0,
                'available_spots': 0,
                'momentum': 0.0
            }

    def _get_fallback_message(self) -> Dict[str, Any]:
        """Get fallback message when personalized generation fails"""
        return {
            'type': 'fallback',
            'message': '🌟 Discover amazing group travel experiences',
            'cta': 'Explore Destinations'
        }
    
    def track_social_proof_interaction(
        self,
        user_id: Optional[str],
        session_id: str,
        destination_id: int,
        variant: SocialProofVariant,
        action: str,  # viewed, clicked, converted
        context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Track user interactions with social proof elements"""
        
        tracking_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": user_id,
            "session_id": session_id,
            "destination_id": destination_id,
            "variant": variant.value,
            "action": action,
            "context": context or {}
        }
        
        # Store in analytics table or send to analytics service
        # For now, we'll return the tracking data for logging
        return tracking_data
    
    def get_personalized_variant(
        self,
        user_segment: UserSegment,
        destination_id: int,
        session_data: Dict[str, Any]
    ) -> SocialProofVariant:
        """Determine the best social proof variant for user segment"""
        
        # Get historical performance data
        performance_data = self._get_variant_performance(destination_id)
        
        # Segment-based preferences
        segment_preferences = {
            UserSegment.FIRST_TIME_VISITOR: SocialProofVariant.SOCIAL_FOCUSED,
            UserSegment.RETURN_VISITOR: SocialProofVariant.URGENCY_FOCUSED,
            UserSegment.HIGH_BUDGET: SocialProofVariant.BENEFIT_FOCUSED,
            UserSegment.BUDGET_CONSCIOUS: SocialProofVariant.BENEFIT_FOCUSED,
            UserSegment.FREQUENT_TRAVELER: SocialProofVariant.DEADLINE_FOCUSED,
            UserSegment.FAMILY_TRAVELER: SocialProofVariant.SOCIAL_FOCUSED
        }
        
        # Check if we have performance data to override defaults
        best_performing = self._get_best_performing_variant(performance_data)
        if best_performing and performance_data[best_performing]['confidence'] > 0.8:
            return SocialProofVariant(best_performing)
        
        return segment_preferences.get(user_segment, SocialProofVariant.SOCIAL_FOCUSED)
    
    def generate_personalized_message(
        self,
        destination_id: int,
        variant: SocialProofVariant,
        real_time_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate personalized social proof message based on variant and data"""
        
        destination = self.db.query(Destination).filter(
            Destination.id == destination_id
        ).first()
        
        if not destination:
            return self._get_fallback_message()
        
        # Get real-time metrics
        metrics = self._get_destination_metrics(destination_id)
        
        # Generate message based on variant
        if variant == SocialProofVariant.URGENCY_FOCUSED:
            return self._generate_urgency_message(destination, metrics)
        elif variant == SocialProofVariant.SOCIAL_FOCUSED:
            return self._generate_social_message(destination, metrics)
        elif variant == SocialProofVariant.BENEFIT_FOCUSED:
            return self._generate_benefit_message(destination, metrics)
        elif variant == SocialProofVariant.DEADLINE_FOCUSED:
            return self._generate_deadline_message(destination, metrics)
        
        return self._get_fallback_message()
    
    def get_behavioral_triggers(
        self,
        session_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Get behavioral triggers based on user session data"""
        
        triggers = []
        
        # Time-based triggers
        session_duration = session_data.get('duration_minutes', 0)
        if session_duration > 5:
            triggers.append({
                'type': 'session_duration',
                'trigger': 'extended_browsing',
                'message': 'Still exploring? Check out what others are booking!',
                'priority': 3
            })
        
        # Page view triggers
        destinations_viewed = session_data.get('destinations_viewed', [])
        if len(destinations_viewed) > 3:
            triggers.append({
                'type': 'multiple_destinations',
                'trigger': 'comparison_shopping',
                'message': 'Comparing options? See which destinations are trending!',
                'priority': 2
            })
        
        # Scroll behavior triggers
        if session_data.get('scroll_depth', 0) > 80:
            triggers.append({
                'type': 'high_engagement',
                'trigger': 'interested_user',
                'message': 'You seem interested! 15 others are looking at this too.',
                'priority': 1
            })
        
        return sorted(triggers, key=lambda x: x['priority'])
    
    def _get_destination_metrics(self, destination_id: int) -> Dict[str, Any]:
        """Get real-time metrics for a destination"""
        
        now = datetime.utcnow()
        last_24h = now - timedelta(hours=24)
        last_7d = now - timedelta(days=7)
        last_30d = now - timedelta(days=30)
        
        # Interest counts
        interests_24h = self.db.query(func.count(Interest.id)).filter(
            Interest.destination_id == destination_id,
            Interest.created_at >= last_24h
        ).scalar() or 0
        
        interests_7d = self.db.query(func.count(Interest.id)).filter(
            Interest.destination_id == destination_id,
            Interest.created_at >= last_7d
        ).scalar() or 0
        
        interests_30d = self.db.query(func.count(Interest.id)).filter(
            Interest.destination_id == destination_id,
            Interest.created_at >= last_30d
        ).scalar() or 0
        
        # Active groups
        active_groups = self.db.query(func.count(Group.id)).filter(
            Group.destination_id == destination_id,
            Group.status.in_(['forming', 'confirmed'])
        ).scalar() or 0
        
        # Available spots in groups
        available_spots = self._calculate_available_spots(destination_id)
        
        # Recent user names for social proof
        recent_users = self.db.query(Interest.user_name).filter(
            Interest.destination_id == destination_id,
            Interest.created_at >= last_7d
        ).limit(5).all()
        
        return {
            'interests_24h': interests_24h,
            'interests_7d': interests_7d,
            'interests_30d': interests_30d,
            'active_groups': active_groups,
            'available_spots': available_spots,
            'recent_users': [user[0] for user in recent_users if user[0]],
            'momentum': self._calculate_momentum(interests_24h, interests_7d)
        }
    
    def _generate_urgency_message(
        self, 
        destination: Destination, 
        metrics: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate urgency-focused message"""
        
        available_spots = metrics['available_spots']
        
        if available_spots <= 3:
            message = f"⚡ Only {available_spots} spots left for {destination.name}!"
            urgency = "high"
        elif available_spots <= 10:
            message = f"🔥 {available_spots} spots remaining for {destination.name}"
            urgency = "medium"
        else:
            message = f"🚀 {metrics['interests_24h']} people interested in {destination.name} today"
            urgency = "low"
        
        return {
            'type': 'urgency',
            'message': message,
            'destination_id': destination.id,
            'destination_name': destination.name,
            'urgency_level': urgency,
            'available_spots': available_spots,
            'cta': 'Book Now' if urgency == 'high' else 'Express Interest'
        }
    
    def _generate_social_message(
        self, 
        destination: Destination, 
        metrics: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate social-focused message"""
        
        recent_users = metrics['recent_users'][:3]  # Get first 3 names
        interests_7d = metrics['interests_7d']
        
        if recent_users:
            names_text = ", ".join(recent_users[:2])
            if len(recent_users) > 2:
                names_text += f" and {len(recent_users) - 2} others"
            
            message = f"👥 {names_text} recently showed interest in {destination.name}"
        else:
            message = f"📈 {interests_7d} travelers interested in {destination.name} this week"
        
        return {
            'type': 'social',
            'message': message,
            'destination_id': destination.id,
            'destination_name': destination.name,
            'recent_users': recent_users,
            'interest_count': interests_7d,
            'cta': 'Join Them'
        }
    
    def _generate_benefit_message(
        self, 
        destination: Destination, 
        metrics: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate benefit-focused message"""
        
        # Calculate potential savings (mock calculation)
        base_price = 50000  # Base price in INR
        group_discount = 0.15  # 15% group discount
        savings = int(base_price * group_discount)
        
        active_groups = metrics['active_groups']
        
        if active_groups > 0:
            message = f"💰 Save ₹{savings:,} with group pricing for {destination.name}"
        else:
            message = f"💸 Group discounts available for {destination.name} - Save up to ₹{savings:,}"
        
        return {
            'type': 'benefit',
            'message': message,
            'destination_id': destination.id,
            'destination_name': destination.name,
            'savings_amount': savings,
            'active_groups': active_groups,
            'cta': 'Save Money'
        }
    
    def _generate_deadline_message(
        self, 
        destination: Destination, 
        metrics: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate deadline-focused message"""
        
        # Mock deadline calculation - normally would come from group formation deadlines
        deadline_hours = 48  # 2 days
        
        active_groups = metrics['active_groups']
        
        if active_groups > 0:
            message = f"⏰ Group formation for {destination.name} closes in {deadline_hours} hours"
        else:
            message = f"🕒 Early bird pricing for {destination.name} ends soon"
        
        return {
            'type': 'deadline',
            'message': message,
            'destination_id': destination.id,
            'destination_name': destination.name,
            'deadline_hours': deadline_hours,
            'active_groups': active_groups,
            'cta': 'Book Before Deadline'
        }
    
    def _calculate_available_spots(self, destination_id: int) -> int:
        """Calculate available spots across all active groups"""
        
        # Get active groups for destination
        groups = self.db.query(Group).filter(
            Group.destination_id == destination_id,
            Group.status.in_(['forming', 'confirmed'])
        ).all()
        
        total_spots = 0
        for group in groups:
            # Assume max 12 people per group, calculate taken spots
            current_members = len(group.interests)
            available = max(0, 12 - current_members)
            total_spots += available
        
        return total_spots
    
    def _calculate_momentum(self, interests_24h: int, interests_7d: int) -> float:
        """Calculate interest momentum score"""
        
        if interests_7d == 0:
            return 0.0
        
        daily_average = interests_7d / 7
        if daily_average == 0:
            return 1.0 if interests_24h > 0 else 0.0
        
        return min(interests_24h / daily_average, 3.0)  # Cap at 3x
    
    def _get_fallback_message(self) -> Dict[str, Any]:
        """Get fallback message when data is insufficient"""
        
        return {
            'type': 'fallback',
            'message': '🌟 Discover amazing group travel experiences',
            'cta': 'Explore Destinations'
        }
    
    def _get_variant_performance(self, destination_id: int) -> Dict[str, Dict[str, float]]:
        """Get historical performance data for variants (mock implementation)"""
        
        # This would normally query an analytics database
        # Returning mock data for now
        return {
            'urgency_focused': {'conversion_rate': 0.15, 'confidence': 0.7},
            'social_focused': {'conversion_rate': 0.18, 'confidence': 0.8},
            'benefit_focused': {'conversion_rate': 0.12, 'confidence': 0.6},
            'deadline_focused': {'conversion_rate': 0.14, 'confidence': 0.5}
        }
    
    def _get_best_performing_variant(self, performance_data: Dict[str, Dict[str, float]]) -> Optional[str]:
        """Get the best performing variant based on conversion rate and confidence"""
        
        best_variant = None
        best_score = 0
        
        for variant, data in performance_data.items():
            # Weight conversion rate by confidence
            score = data['conversion_rate'] * data['confidence']
            if score > best_score:
                best_score = score
                best_variant = variant
        
        return best_variant