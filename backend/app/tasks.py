from typing import List
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
import numpy as np
from sklearn.cluster import AgglomerativeClustering
from app.core.database import SessionLocal
from app.models.models import Interest, Group, Destination, HomepageMessage
from app.worker import celery_app
import logging

logger = logging.getLogger(__name__)


@celery_app.task
def cluster_interests():
    """Cluster similar interests into groups"""
    db = SessionLocal()
    try:
        # Get destinations with open interests
        destinations_with_interests = db.query(Destination.id).join(Interest).filter(
            Interest.status == 'open'
        ).distinct().all()
        
        for (destination_id,) in destinations_with_interests:
            _cluster_destination_interests(db, destination_id)
            
        db.commit()
    except Exception as e:
        logger.error(f"Error clustering interests: {e}")
        db.rollback()
    finally:
        db.close()


def _cluster_destination_interests(db: Session, destination_id: int):
    """Cluster interests for a specific destination"""
    # Get open interests within sliding window (±7 days)
    now = datetime.utcnow()
    window_start = now - timedelta(days=7)
    window_end = now + timedelta(days=60)  # Look ahead 60 days
    
    interests = db.query(Interest).filter(
        Interest.destination_id == destination_id,
        Interest.status == 'open',
        Interest.date_from >= window_start,
        Interest.date_from <= window_end
    ).all()
    
    if len(interests) < 4:  # Minimum group size
        return
    
    # Stage 0: Rule-based clustering
    clusters = _rule_based_clustering(interests)
    
    # Stage 1: Optional ML clustering (if we have enough data)
    if len(interests) >= 10:
        clusters = _ml_clustering(interests, clusters)
    
    # Create groups for valid clusters
    destination = db.query(Destination).filter(Destination.id == destination_id).first()
    for cluster in clusters:
        if len(cluster) >= 4:  # Minimum viable group
            _create_group_from_cluster(db, destination, cluster)


def _rule_based_clustering(interests: List[Interest]) -> List[List[Interest]]:
    """Simple rule-based clustering by date overlap and group size"""
    clusters = []
    used_interests = set()
    
    for interest in interests:
        if interest.id in used_interests:
            continue
            
        # Find overlapping interests
        cluster = [interest]
        used_interests.add(interest.id)
        
        for other in interests:
            if other.id in used_interests:
                continue
                
            # Check date overlap
            if (interest.date_from <= other.date_to and 
                interest.date_to >= other.date_from):
                
                # Check similar group size (within 50% difference)
                size_ratio = max(interest.num_people, other.num_people) / min(interest.num_people, other.num_people)
                if size_ratio <= 1.5:
                    cluster.append(other)
                    used_interests.add(other.id)
        
        if len(cluster) >= 2:
            clusters.append(cluster)
    
    return clusters


def _ml_clustering(interests: List[Interest], initial_clusters: List[List[Interest]]) -> List[List[Interest]]:
    """Enhanced clustering using ML"""
    try:
        # Prepare features
        features = []
        for interest in interests:
            # Convert dates to ordinal for clustering
            date_center = (interest.date_from + (interest.date_to - interest.date_from) / 2).toordinal()
            lead_time = (interest.date_from - datetime.utcnow()).days
            
            features.append([
                date_center,
                interest.num_people,
                lead_time,
                # Add budget if available
                interest.budget_max or 0
            ])
        
        features_array = np.array(features)
        
        # Normalize features
        from sklearn.preprocessing import StandardScaler
        scaler = StandardScaler()
        features_normalized = scaler.fit_transform(features_array)
        
        # Apply agglomerative clustering
        n_clusters = min(len(interests) // 4, 10)  # Reasonable number of clusters
        clustering = AgglomerativeClustering(n_clusters=n_clusters, linkage='ward')
        labels = clustering.fit_predict(features_normalized)
        
        # Group interests by cluster labels
        ml_clusters = {}
        for i, label in enumerate(labels):
            if label not in ml_clusters:
                ml_clusters[label] = []
            ml_clusters[label].append(interests[i])
        
        return list(ml_clusters.values())
        
    except Exception as e:
        logger.warning(f"ML clustering failed, falling back to rule-based: {e}")
        return initial_clusters


def _create_group_from_cluster(db: Session, destination: Destination, cluster: List[Interest]):
    """Create a group from a cluster of interests"""
    # Calculate group details
    date_from = min(interest.date_from for interest in cluster)
    date_to = max(interest.date_to for interest in cluster)
    total_people = sum(interest.num_people for interest in cluster)
    
    # Calculate pricing
    base_price = destination.base_price
    discount_rate = min(
        destination.max_discount,
        destination.discount_per_member * (len(cluster) - 1)
    )
    final_price = base_price * (1 - discount_rate)
    
    price_calc = {
        "base_price": base_price,
        "members_count": len(cluster),
        "discount_rate": discount_rate,
        "final_price_per_person": final_price,
        "calculation_date": datetime.utcnow().isoformat()
    }
    
    # Create group
    group_name = f"{destination.name} - {date_from.strftime('%b %d')}"
    group = Group(
        destination_id=destination.id,
        name=group_name,
        date_from=date_from,
        date_to=date_to,
        current_size=len(cluster),
        base_price=base_price,
        final_price_per_person=final_price,
        price_calc=price_calc,
        status="forming"
    )
    
    db.add(group)
    db.flush()  # Get the group ID
    
    # Update interests
    for interest in cluster:
        interest.status = 'matched'
        interest.group_id = group.id
    
    logger.info(f"Created group {group.id} with {len(cluster)} members for {destination.name}")


@celery_app.task
def generate_social_proof_messages():
    """Generate social proof messages for homepage"""
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        
        # Clear old messages
        db.query(HomepageMessage).filter(
            HomepageMessage.end_date < now
        ).delete()
        
        # Generate new messages for trending destinations
        destinations = db.query(Destination).filter(Destination.is_active == True).all()
        
        for destination in destinations:
            # Calculate trending score (interests in last 7 days vs previous 7 days)
            week_ago = now - timedelta(days=7)
            two_weeks_ago = now - timedelta(days=14)
            
            recent_count = db.query(Interest).filter(
                Interest.destination_id == destination.id,
                Interest.created_at >= week_ago,
                Interest.status == 'open'
            ).count()
            
            previous_count = db.query(Interest).filter(
                Interest.destination_id == destination.id,
                Interest.created_at >= two_weeks_ago,
                Interest.created_at < week_ago,
                Interest.status == 'open'
            ).count()
            
            if recent_count >= 5 and recent_count > previous_count * 1.5:
                # Trending destination
                message = HomepageMessage(
                    destination_id=destination.id,
                    message_type="trending",
                    title=f"🔥 {destination.name} is trending!",
                    message=f"{recent_count} people expressed interest in {destination.name} this week — join them to get group pricing!",
                    cta_text="Show Interest",
                    cta_link=f"/destinations/{destination.id}",
                    priority=1,
                    start_date=now,
                    end_date=now + timedelta(days=3)
                )
                db.add(message)
        
        db.commit()
    except Exception as e:
        logger.error(f"Error generating social proof messages: {e}")
        db.rollback()
    finally:
        db.close()


@celery_app.task
def update_analytics():
    """Update daily analytics aggregates"""
    db = SessionLocal()
    try:
        from app.models.models import AnalyticsMaterialized
        
        yesterday = datetime.utcnow().date() - timedelta(days=1)
        
        # Interest counts by destination
        destinations = db.query(Destination).filter(Destination.is_active == True).all()
        
        for destination in destinations:
            # Daily interest count
            count = db.query(Interest).filter(
                Interest.destination_id == destination.id,
                func.date(Interest.created_at) == yesterday
            ).count()
            
            # Store metric
            metric = AnalyticsMaterialized(
                date=datetime.combine(yesterday, datetime.min.time()),
                destination_id=destination.id,
                metric_name="daily_interests",
                metric_value=count
            )
            db.add(metric)
        
        db.commit()
    except Exception as e:
        logger.error(f"Error updating analytics: {e}")
        db.rollback()
    finally:
        db.close()


# ===== NOTIFICATION TASKS =====

@celery_app.task
def send_interest_confirmation(interest_id: int):
    """Send confirmation email/WhatsApp for new interest submission"""
    from app.services.notification_service import notification_service
    
    db = SessionLocal()
    try:
        interest = db.query(Interest).filter(Interest.id == interest_id).first()
        if not interest:
            logger.error(f"Interest {interest_id} not found")
            return
        
        destination = db.query(Destination).filter(Destination.id == interest.destination_id).first()
        if not destination:
            logger.error(f"Destination {interest.destination_id} not found")
            return
        
        # Prepare template data
        template_data = {
            "user_name": interest.user_name,
            "destination_name": destination.name,
            "destination_location": destination.location,
            "date_from": interest.date_from.strftime("%B %d, %Y"),
            "date_to": interest.date_to.strftime("%B %d, %Y"),
            "num_people": interest.num_people,
            "interest_id": interest.id
        }
        
        # Send notification
        result = notification_service.send_notification(
            db=db,
            template_name="interest_confirmation",
            recipient_email=interest.user_email,
            recipient_phone=interest.user_phone,
            template_data=template_data,
            notification_type="both",
            interest_id=interest.id
        )
        
        logger.info(f"Interest confirmation sent for interest {interest_id}: {result}")
        
    except Exception as e:
        logger.error(f"Error sending interest confirmation for {interest_id}: {e}")
    finally:
        db.close()


@celery_app.task
def send_group_match_notification(group_id: int):
    """Send notifications to all members when a group is formed"""
    from app.services.notification_service import notification_service
    
    db = SessionLocal()
    try:
        group = db.query(Group).filter(Group.id == group_id).first()
        if not group:
            logger.error(f"Group {group_id} not found")
            return
        
        destination = db.query(Destination).filter(Destination.id == group.destination_id).first()
        if not destination:
            logger.error(f"Destination {group.destination_id} not found")
            return
        
        # Get all group members
        members = db.query(Interest).filter(Interest.group_id == group_id).all()
        
        # Prepare common template data
        base_template_data = {
            "destination_name": destination.name,
            "destination_location": destination.location,
            "group_size": len(members),
            "price_per_person": group.price_per_person,
            "total_savings": (destination.base_price - group.price_per_person) * len(members),
            "group_id": group.id
        }
        
        # Send notification to each member
        for member in members:
            template_data = {
                **base_template_data,
                "user_name": member.user_name,
                "member_names": [m.user_name for m in members if m.id != member.id],
                "date_from": member.date_from.strftime("%B %d, %Y"),
                "date_to": member.date_to.strftime("%B %d, %Y"),
                "num_people": member.num_people
            }
            
            result = notification_service.send_notification(
                db=db,
                template_name="group_match",
                recipient_email=member.user_email,
                recipient_phone=member.user_phone,
                template_data=template_data,
                notification_type="both",
                interest_id=member.id,
                group_id=group.id
            )
            
            logger.info(f"Group match notification sent to {member.user_email}: {result}")
        
    except Exception as e:
        logger.error(f"Error sending group match notifications for group {group_id}: {e}")
    finally:
        db.close()


@celery_app.task
def send_pricing_update_notification(group_id: int, old_price: float, new_price: float):
    """Send notifications when group pricing changes"""
    from app.services.notification_service import notification_service
    
    db = SessionLocal()
    try:
        group = db.query(Group).filter(Group.id == group_id).first()
        if not group:
            logger.error(f"Group {group_id} not found")
            return
        
        destination = db.query(Destination).filter(Destination.id == group.destination_id).first()
        members = db.query(Interest).filter(Interest.group_id == group_id).all()
        
        price_change = new_price - old_price
        price_direction = "increased" if price_change > 0 else "decreased"
        
        base_template_data = {
            "destination_name": destination.name,
            "old_price": old_price,
            "new_price": new_price,
            "price_change": abs(price_change),
            "price_direction": price_direction,
            "group_size": len(members),
            "group_id": group.id
        }
        
        for member in members:
            template_data = {
                **base_template_data,
                "user_name": member.user_name
            }
            
            result = notification_service.send_notification(
                db=db,
                template_name="pricing_update",
                recipient_email=member.user_email,
                recipient_phone=member.user_phone,
                template_data=template_data,
                notification_type="both",
                interest_id=member.id,
                group_id=group.id
            )
            
            logger.info(f"Pricing update notification sent to {member.user_email}: {result}")
        
    except Exception as e:
        logger.error(f"Error sending pricing update notifications for group {group_id}: {e}")
    finally:
        db.close()


@celery_app.task
def send_follow_up_sequence():
    """Send follow-up messages to users who haven't been matched to groups"""
    from app.services.notification_service import notification_service
    from datetime import timedelta
    
    db = SessionLocal()
    try:
        # Find interests that are older than 48 hours and still open
        cutoff_time = datetime.utcnow() - timedelta(hours=48)
        
        unmatched_interests = db.query(Interest).filter(
            Interest.status == 'open',
            Interest.created_at <= cutoff_time,
            Interest.group_id.is_(None)
        ).all()
        
        for interest in unmatched_interests:
            destination = db.query(Destination).filter(Destination.id == interest.destination_id).first()
            if not destination:
                continue
            
            # Count other people interested in similar dates/destination
            similar_interests_count = db.query(Interest).filter(
                Interest.destination_id == interest.destination_id,
                Interest.id != interest.id,
                Interest.status == 'open',
                Interest.date_from <= interest.date_to,
                Interest.date_to >= interest.date_from
            ).count()
            
            template_data = {
                "user_name": interest.user_name,
                "destination_name": destination.name,
                "similar_interests_count": similar_interests_count,
                "date_from": interest.date_from.strftime("%B %d, %Y"),
                "date_to": interest.date_to.strftime("%B %d, %Y"),
                "interest_id": interest.id
            }
            
            result = notification_service.send_notification(
                db=db,
                template_name="follow_up",
                recipient_email=interest.user_email,
                recipient_phone=interest.user_phone,
                template_data=template_data,
                notification_type="both",
                interest_id=interest.id
            )
            
            logger.info(f"Follow-up notification sent to {interest.user_email}: {result}")
        
    except Exception as e:
        logger.error(f"Error sending follow-up sequence: {e}")
    finally:
        db.close()


@celery_app.task
def send_marketing_campaign(campaign_data: dict):
    """Send targeted marketing campaigns based on user behavior and preferences"""
    from app.services.notification_service import notification_service
    
    db = SessionLocal()
    try:
        template_name = campaign_data.get("template_name", "marketing")
        target_criteria = campaign_data.get("target_criteria", {})
        message_data = campaign_data.get("message_data", {})
        
        # Build query based on target criteria
        query = db.query(Interest)
        
        if target_criteria.get("destination_ids"):
            query = query.filter(Interest.destination_id.in_(target_criteria["destination_ids"]))
        
        if target_criteria.get("status"):
            query = query.filter(Interest.status == target_criteria["status"])
        
        if target_criteria.get("created_after"):
            query = query.filter(Interest.created_at >= target_criteria["created_after"])
        
        # Get unique recipients
        interests = query.all()
        recipients_sent = set()
        
        for interest in interests:
            if interest.user_email in recipients_sent:
                continue
            
            recipients_sent.add(interest.user_email)
            
            template_data = {
                **message_data,
                "user_name": interest.user_name,
                "interest_id": interest.id
            }
            
            result = notification_service.send_notification(
                db=db,
                template_name=template_name,
                recipient_email=interest.user_email,
                recipient_phone=interest.user_phone,
                template_data=template_data,
                notification_type="email",  # Marketing usually via email
                interest_id=interest.id
            )
            
            logger.info(f"Marketing campaign sent to {interest.user_email}: {result}")
        
        logger.info(f"Marketing campaign completed. Sent to {len(recipients_sent)} recipients")
        
    except Exception as e:
        logger.error(f"Error sending marketing campaign: {e}")
    finally:
        db.close()


@celery_app.task
def process_notification_webhooks(webhook_data: dict):
    """Process delivery status updates from email/SMS providers"""
    from app.services.notification_service import notification_service
    
    db = SessionLocal()
    try:
        provider = webhook_data.get("provider")  # "sendgrid" or "twilio"
        external_id = webhook_data.get("message_id")
        status = webhook_data.get("status")
        timestamp = webhook_data.get("timestamp")
        
        if provider and external_id and status:
            notification_service.update_delivery_status(
                db=db,
                external_id=external_id,
                status=status,
                delivered_at=timestamp
            )
            
            logger.info(f"Updated notification status: {external_id} -> {status}")
        
    except Exception as e:
        logger.error(f"Error processing webhook: {e}")
    finally:
        db.close()