from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, desc, or_
from datetime import datetime, timedelta

from app.models.models import Interest, Destination, HomepageMessage
from app.models.schemas import HomepageMessage as HomepageMessageSchema


class SocialProofService:
    def __init__(self, db: Session):
        self.db = db

    def get_homepage_messages(self, limit: int = 5) -> List[HomepageMessage]:
        """Get active homepage messages for social proof"""
        now = datetime.utcnow()
        
        return self.db.query(HomepageMessage).filter(
            and_(
                HomepageMessage.is_active == True,
                or_(
                    HomepageMessage.start_date.is_(None),
                    HomepageMessage.start_date <= now
                ),
                or_(
                    HomepageMessage.end_date.is_(None),
                    HomepageMessage.end_date >= now
                )
            )
        ).order_by(desc(HomepageMessage.priority), desc(HomepageMessage.created_at)).limit(limit).all()

    def generate_social_proof_messages(self) -> Dict[str, Any]:
        """Generate social proof messages based on current interest patterns"""
        messages = []
        
        # Get destinations with recent interest activity
        destinations_with_interest = self.db.query(
            Destination.id,
            Destination.name,
            func.count(Interest.id).label('interest_count'),
            func.min(Interest.date_from).label('earliest_date')
        ).join(Interest).filter(
            Interest.created_at >= datetime.utcnow() - timedelta(days=7)
        ).group_by(Destination.id, Destination.name).having(
            func.count(Interest.id) >= 3  # At least 3 interests
        ).order_by(desc('interest_count')).limit(5).all()

        for dest in destinations_with_interest:
            # Create trending message
            message = {
                'destination_id': dest.id,
                'message_type': 'trending',
                'title': f"Trending Now: {dest.name}",
                'message': f"{dest.interest_count} people are planning trips to {dest.name}. Join for group pricing!",
                'cta_text': "Express Interest",
                'cta_link': f"/destinations/{dest.id}",
                'priority': min(dest.interest_count * 10, 100),  # Higher priority for more interest
                'is_active': True,
                'start_date': datetime.utcnow(),
                'end_date': datetime.utcnow() + timedelta(days=7)
            }
            messages.append(message)

        # Get destinations with interests for soon-departing trips
        urgent_destinations = self.db.query(
            Destination.id,
            Destination.name,
            func.count(Interest.id).label('interest_count'),
            func.min(Interest.date_from).label('earliest_date')
        ).join(Interest).filter(
            and_(
                Interest.date_from >= datetime.utcnow(),
                Interest.date_from <= datetime.utcnow() + timedelta(days=30),
                Interest.created_at >= datetime.utcnow() - timedelta(days=14)
            )
        ).group_by(Destination.id, Destination.name).having(
            func.count(Interest.id) >= 2
        ).order_by('earliest_date').limit(3).all()

        for dest in urgent_destinations:
            days_until = (dest.earliest_date - datetime.utcnow().date()).days
            message = {
                'destination_id': dest.id,
                'message_type': 'urgent',
                'title': f"Departing Soon: {dest.name}",
                'message': f"Trip to {dest.name} in {days_until} days - {dest.interest_count} spots filling up fast!",
                'cta_text': "Book Now",
                'cta_link': f"/destinations/{dest.id}",
                'priority': max(50 - days_until, 10),  # Higher priority for sooner dates
                'is_active': True,
                'start_date': datetime.utcnow(),
                'end_date': dest.earliest_date + timedelta(days=1)
            }
            messages.append(message)

        return {
            'generated_count': len(messages),
            'messages': messages,
            'generated_at': datetime.utcnow().isoformat()
        }

    def create_homepage_message(self, message_data: Dict[str, Any]) -> HomepageMessage:
        """Create a new homepage message"""
        db_message = HomepageMessage(**message_data)
        self.db.add(db_message)
        self.db.commit()
        self.db.refresh(db_message)
        return db_message

    def get_destination_social_proof(self, destination_id: int) -> Dict[str, Any]:
        """Get social proof data for a specific destination"""
        now = datetime.utcnow()
        last_30_days = now - timedelta(days=30)
        
        # Total interests in last 30 days
        total_interests = self.db.query(Interest).filter(
            and_(
                Interest.destination_id == destination_id,
                Interest.created_at >= last_30_days
            )
        ).count()

        # Interests for trips in next 30 days
        next_30_days = now + timedelta(days=30)
        upcoming_interests = self.db.query(Interest).filter(
            and_(
                Interest.destination_id == destination_id,
                Interest.date_from >= now,
                Interest.date_from <= next_30_days
            )
        ).count()

        # Recent user names (anonymized)
        recent_users = self.db.query(Interest.user_name).filter(
            and_(
                Interest.destination_id == destination_id,
                Interest.created_at >= last_30_days
            )
        ).order_by(desc(Interest.created_at)).limit(5).all()

        # Extract first names only for privacy
        recent_names = []
        for user in recent_users:
            if user.user_name:
                first_name = user.user_name.split()[0]
                if first_name not in recent_names:
                    recent_names.append(first_name)
                if len(recent_names) >= 3:
                    break

        # Generate social proof message
        social_proof_text = ""
        if total_interests > 0:
            if len(recent_names) == 1:
                social_proof_text = f"{recent_names[0]} is interested in this destination"
            elif len(recent_names) == 2:
                social_proof_text = f"{recent_names[0]} and {recent_names[1]} are interested"
            elif len(recent_names) >= 3:
                others_count = total_interests - len(recent_names)
                if others_count > 0:
                    social_proof_text = f"{', '.join(recent_names[:2])} and {others_count} others are interested"
                else:
                    social_proof_text = f"{', '.join(recent_names)} are interested"

        return {
            'destination_id': destination_id,
            'total_interested_last_30_days': total_interests,
            'next_30_day_count': upcoming_interests,
            'recent_names_sample': recent_names[:3],
            'social_proof_text': social_proof_text,
            'timestamp': now.isoformat()
        }

    def get_trending_destinations(self, limit: int = 5) -> List[Dict[str, Any]]:
        """Get destinations trending by interest activity"""
        last_7_days = datetime.utcnow() - timedelta(days=7)
        
        trending = self.db.query(
            Destination.id,
            Destination.name,
            Destination.slug,
            Destination.image_url,
            func.count(Interest.id).label('recent_interest_count')
        ).join(Interest).filter(
            Interest.created_at >= last_7_days
        ).group_by(
            Destination.id, Destination.name, Destination.slug, Destination.image_url
        ).order_by(desc('recent_interest_count')).limit(limit).all()

        result = []
        for dest in trending:
            social_proof = self.get_destination_social_proof(dest.id)
            result.append({
                'id': dest.id,
                'name': dest.name,
                'slug': dest.slug,
                'image_url': dest.image_url,
                'recent_interest_count': dest.recent_interest_count,
                'social_proof': social_proof
            })

        return result

    def get_real_time_activity(self, hours: int = 24) -> Dict[str, Any]:
        """Get real-time activity for social proof widgets"""
        try:
            since = datetime.utcnow() - timedelta(hours=hours)
            
            # Recent interests submitted
            recent_interests = self.db.query(
                Interest.user_name,
                Interest.created_at,
                Destination.name.label('destination_name'),
                Destination.id.label('destination_id')
            ).join(Destination).filter(
                Interest.created_at >= since
            ).order_by(desc(Interest.created_at)).limit(10).all()

            activity_feed = []
            for interest in recent_interests:
                try:
                    time_ago = self._get_time_ago(interest.created_at)
                    first_name = interest.user_name.split()[0] if interest.user_name else "Someone"
                    
                    activity_feed.append({
                        'user_name': first_name,
                        'destination_name': interest.destination_name,
                        'destination_id': interest.destination_id,
                        'time_ago': time_ago,
                        'action': 'expressed_interest',
                        'timestamp': interest.created_at.isoformat()
                    })
                except Exception as e:
                    # Skip problematic entries
                    continue

            # Get destinations with momentum (simplified)
            momentum_destinations = []
            try:
                momentum_destinations = self._get_momentum_destinations()
            except Exception as e:
                # If momentum calculation fails, continue without it
                pass

            return {
                'activity_feed': activity_feed,
                'momentum_destinations': momentum_destinations,
                'total_activity_count': len(activity_feed),
                'generated_at': datetime.utcnow().isoformat()
            }
        except Exception as e:
            # Return empty result on error
            return {
                'activity_feed': [],
                'momentum_destinations': [],
                'total_activity_count': 0,
                'generated_at': datetime.utcnow().isoformat()
            }

    def _get_momentum_destinations(self, limit: int = 3) -> List[Dict[str, Any]]:
        """Get destinations with increasing interest momentum"""
        now = datetime.utcnow()
        last_3_days = now - timedelta(days=3)
        last_7_days = now - timedelta(days=7)

        # Get interest counts for last 3 days vs previous 4 days
        destinations = self.db.query(Destination.id, Destination.name).all()
        momentum_data = []

        for dest in destinations:
            recent_count = self.db.query(Interest).filter(
                and_(
                    Interest.destination_id == dest.id,
                    Interest.created_at >= last_3_days
                )
            ).count()

            previous_count = self.db.query(Interest).filter(
                and_(
                    Interest.destination_id == dest.id,
                    Interest.created_at >= last_7_days,
                    Interest.created_at < last_3_days
                )
            ).count()

            if recent_count > 0:  # Only include destinations with recent activity
                momentum_score = recent_count - previous_count
                if momentum_score > 0:  # Only positive momentum
                    momentum_data.append({
                        'destination_id': dest.id,
                        'destination_name': dest.name,
                        'recent_count': recent_count,
                        'previous_count': previous_count,
                        'momentum_score': momentum_score
                    })

        # Sort by momentum score and return top destinations
        momentum_data.sort(key=lambda x: x['momentum_score'], reverse=True)
        return momentum_data[:limit]

    def _get_time_ago(self, timestamp: datetime) -> str:
        """Convert timestamp to human-readable time ago"""
        now = datetime.utcnow()
        diff = now - timestamp

        if diff.days > 0:
            return f"{diff.days} day{'s' if diff.days > 1 else ''} ago"
        elif diff.seconds >= 3600:
            hours = diff.seconds // 3600
            return f"{hours} hour{'s' if hours > 1 else ''} ago"
        elif diff.seconds >= 60:
            minutes = diff.seconds // 60
            return f"{minutes} minute{'s' if minutes > 1 else ''} ago"
        else:
            return "just now"

    def generate_smart_messages(self) -> List[Dict[str, Any]]:
        """Generate smart social proof messages using AI-like algorithms"""
        messages = []
        try:
            now = datetime.utcnow()

            # Algorithm 1: Scarcity messages for popular destinations
            try:
                popular_destinations = self.db.query(
                    Destination.id,
                    Destination.name,
                    func.count(Interest.id).label('interest_count')
                ).join(Interest).filter(
                    Interest.created_at >= now - timedelta(days=14)
                ).group_by(Destination.id, Destination.name).having(
                    func.count(Interest.id) >= 2  # Lowered threshold
                ).order_by(desc('interest_count')).limit(3).all()

                for dest in popular_destinations:
                    messages.append({
                        'type': 'scarcity',
                        'destination_id': dest.id,
                        'title': f"High Demand: {dest.name}",
                        'message': f"{dest.interest_count} travelers interested in {dest.name} recently",
                        'cta_text': "Join Group",
                        'priority': dest.interest_count * 10,
                        'urgency': 'medium'
                    })
            except Exception as e:
                pass  # Skip this algorithm if it fails

            # Algorithm 2: FOMO messages for soon-departing trips
            try:
                upcoming_trips = self.db.query(
                    Destination.id,
                    Destination.name,
                    func.min(Interest.date_from).label('earliest_date'),
                    func.count(Interest.id).label('interest_count')
                ).join(Interest).filter(
                    and_(
                        Interest.date_from >= now.date(),
                        Interest.date_from <= (now + timedelta(days=21)).date()
                    )
                ).group_by(Destination.id, Destination.name).having(
                    func.count(Interest.id) >= 1  # Lowered threshold
                ).order_by('earliest_date').limit(2).all()

                for trip in upcoming_trips:
                    try:
                        days_until = (trip.earliest_date - now.date()).days
                        messages.append({
                            'type': 'fomo',
                            'destination_id': trip.id,
                            'title': f"Departing in {days_until} days",
                            'message': f"{trip.name} group trip forming - {trip.interest_count} interested",
                            'cta_text': "Reserve Spot",
                            'priority': max(50 - days_until, 10),
                            'urgency': 'high' if days_until <= 7 else 'medium'
                        })
                    except Exception as e:
                        continue
            except Exception as e:
                pass  # Skip this algorithm if it fails

            # Algorithm 3: Social validation for recent activity
            try:
                recent_activity = self.get_real_time_activity(hours=6)
                if recent_activity['total_activity_count'] >= 1:  # Lowered threshold
                    messages.append({
                        'type': 'social_validation',
                        'title': "Live Activity",
                        'message': f"{recent_activity['total_activity_count']} people explored destinations recently",
                        'cta_text': "See What's Trending",
                        'priority': 30,
                        'urgency': 'low'
                    })
            except Exception as e:
                pass  # Skip this algorithm if it fails

            return sorted(messages, key=lambda x: x['priority'], reverse=True)
        except Exception as e:
            # Return empty list on any error
            return []

    async def get_active_homepage_messages(self, limit: int = 5) -> List[HomepageMessage]:
        """Get active homepage messages with async support"""
        return self.get_homepage_messages(limit=limit)

    async def create_homepage_message(self, message_data) -> HomepageMessage:
        """Create homepage message with async support"""  
        db_message = HomepageMessage(**message_data)
        self.db.add(db_message)
        self.db.commit()
        self.db.refresh(db_message)
        return db_message