from typing import List
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
import numpy as np
from sklearn.cluster import AgglomerativeClustering
from app.core.database import SessionLocal
from app.models.models import Interest, Group, Destination, HomepageMessage, GroupMemberConfirmation
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
        
        logger.info(f"Found {len(destinations_with_interests)} destinations with interests")
        
        for (destination_id,) in destinations_with_interests:
            logger.info(f"Processing destination {destination_id}")
            _cluster_destination_interests(db, destination_id)
            
        db.commit()
        logger.info("Clustering completed successfully")
    except Exception as e:
        logger.error(f"Error clustering interests: {e}")
        db.rollback()
        db.rollback()
    finally:
        db.close()


def _cluster_destination_interests(db: Session, destination_id: int):
    """Cluster interests for a specific destination"""
    # Get open interests within sliding window (±7 days)
    logger.info(f"Starting clustering for destination {destination_id}")
    
    now = datetime.utcnow()
    window_start = now - timedelta(days=7)
    window_end = now + timedelta(days=60)  # Look ahead 60 days
    
    interests = db.query(Interest).filter(
        Interest.destination_id == destination_id,
        Interest.status == 'open',
        Interest.date_from >= window_start,
        Interest.date_from <= window_end
    ).all()
    
    logger.info(f"Found {len(interests)} interests for destination {destination_id}")
    
    if len(interests) < 2:  # Minimum group size for testing
        logger.info(f"Not enough interests ({len(interests)}) for clustering")
        return
    
    # Stage 0: Rule-based clustering
    clusters = _rule_based_clustering(interests)
    logger.info(f"Rule-based clustering created {len(clusters)} clusters")
    
    # Stage 1: Optional ML clustering (if we have enough data)
    if len(interests) >= 10:
        clusters = _ml_clustering(interests, clusters)
        logger.info(f"ML clustering created {len(clusters)} clusters")
    
    # Create groups for valid clusters
    destination = db.query(Destination).filter(Destination.id == destination_id).first()
    groups_created = 0
    for cluster in clusters:
        if len(cluster) >= 2:  # Minimum viable group for testing
            _create_group_from_cluster(db, destination, cluster)
            groups_created += 1
            logger.info(f"Created group from cluster with {len(cluster)} interests")
    
    logger.info(f"Total groups created for destination {destination_id}: {groups_created}")


def _rule_based_clustering(interests: List[Interest]) -> List[List[Interest]]:
    """Enhanced rule-based clustering by date overlap, group size, and budget compatibility"""
    clusters = []
    used_interests = set()
    
    logger.info(f"Starting rule-based clustering with {len(interests)} interests")
    
    for interest in interests:
        if interest.id in used_interests:
            continue
            
        # Find compatible interests
        cluster = [interest]
        used_interests.add(interest.id)
        
        logger.info(f"Checking compatibility for {interest.user_name} ({interest.date_from} to {interest.date_to})")
        
        for other in interests:
            if other.id in used_interests:
                continue
                
            compatibility_score = _calculate_compatibility(interest, other)
            logger.info(f"  - vs {other.user_name}: compatibility score = {compatibility_score:.3f}")
            
            # Cluster if highly compatible (score > 0.7)
            if compatibility_score > 0.3:  # Lowered threshold for testing
                cluster.append(other)
                used_interests.add(other.id)
                logger.info(f"    Added to cluster (score {compatibility_score:.3f})")
        
        if len(cluster) >= 2:
            clusters.append(cluster)
            logger.info(f"Created cluster with {len(cluster)} interests")
        else:
            logger.info(f"Cluster too small ({len(cluster)}), discarding")
    
    logger.info(f"Rule-based clustering completed with {len(clusters)} clusters")
    return clusters


def _calculate_compatibility(interest1: Interest, interest2: Interest) -> float:
    """Calculate compatibility score between two interests (0-1)"""
    score = 0.0
    factors = 0
    
    # 1. Date overlap factor (40% weight)
    date_overlap = _calculate_date_overlap(interest1, interest2)
    if date_overlap > 0:
        score += 0.4 * date_overlap
    factors += 0.4
    
    # 2. Group size compatibility (25% weight)
    size_compatibility = _calculate_size_compatibility(interest1, interest2)
    score += 0.25 * size_compatibility
    factors += 0.25
    
    # 3. Budget compatibility (20% weight)
    budget_compatibility = _calculate_budget_compatibility(interest1, interest2)
    score += 0.2 * budget_compatibility
    factors += 0.2
    
    # 4. Lead time similarity (15% weight)
    lead_time_compatibility = _calculate_lead_time_compatibility(interest1, interest2)
    score += 0.15 * lead_time_compatibility
    factors += 0.15
    
    return score / factors if factors > 0 else 0.0


def _calculate_date_overlap(interest1: Interest, interest2: Interest) -> float:
    """Calculate date overlap ratio (0-1)"""
    # Convert dates to comparable format
    start1, end1 = interest1.date_from, interest1.date_to
    start2, end2 = interest2.date_from, interest2.date_to
    
    # Calculate overlap
    overlap_start = max(start1, start2)
    overlap_end = min(end1, end2)
    
    if overlap_start > overlap_end:
        return 0.0  # No overlap
    
    overlap_days = (overlap_end - overlap_start).days + 1
    total_days = max((end1 - start1).days + 1, (end2 - start2).days + 1)
    
    return min(overlap_days / total_days, 1.0)


def _calculate_size_compatibility(interest1: Interest, interest2: Interest) -> float:
    """Calculate group size compatibility (0-1)"""
    size1, size2 = interest1.num_people, interest2.num_people
    
    # Perfect match
    if size1 == size2:
        return 1.0
    
    # Calculate ratio (smaller/larger)
    ratio = min(size1, size2) / max(size1, size2)
    
    # Convert to compatibility score
    # 0.7+ ratio = high compatibility
    # 0.5-0.7 ratio = medium compatibility
    # <0.5 ratio = low compatibility
    if ratio >= 0.7:
        return 1.0
    elif ratio >= 0.5:
        return 0.7
    else:
        return 0.3


def _calculate_budget_compatibility(interest1: Interest, interest2: Interest) -> float:
    """Calculate budget compatibility (0-1)"""
    # If no budget info available, assume compatible
    if not (interest1.budget_max and interest2.budget_max):
        return 0.8  # Neutral compatibility
    
    budget1_min = interest1.budget_min or 0
    budget1_max = interest1.budget_max or float('inf')
    budget2_min = interest2.budget_min or 0
    budget2_max = interest2.budget_max or float('inf')
    
    # Check for overlap in budget ranges
    overlap_min = max(budget1_min, budget2_min)
    overlap_max = min(budget1_max, budget2_max)
    
    if overlap_min > overlap_max:
        return 0.0  # No budget overlap
    
    # Calculate overlap ratio
    range1 = budget1_max - budget1_min
    range2 = budget2_max - budget2_min
    overlap_range = overlap_max - overlap_min
    
    if range1 == 0 and range2 == 0:
        return 1.0  # Both have fixed budgets that match
    
    max_range = max(range1, range2)
    if max_range == 0:
        return 1.0
    
    return min(overlap_range / max_range, 1.0)


def _calculate_lead_time_compatibility(interest1: Interest, interest2: Interest) -> float:
    """Calculate lead time compatibility (0-1)"""
    from datetime import timezone
    now = datetime.now(timezone.utc)
    
    # Ensure dates are timezone-aware for comparison
    date1 = interest1.date_from
    date2 = interest2.date_from
    
    # Convert to datetime if they're just dates
    if hasattr(date1, 'date'):
        date1 = datetime.combine(date1, datetime.min.time()).replace(tzinfo=timezone.utc)
    else:
        date1 = datetime.combine(date1, datetime.min.time()).replace(tzinfo=timezone.utc)
    
    if hasattr(date2, 'date'):
        date2 = datetime.combine(date2, datetime.min.time()).replace(tzinfo=timezone.utc)
    else:
        date2 = datetime.combine(date2, datetime.min.time()).replace(tzinfo=timezone.utc)
    
    lead_time1 = (date1 - now).days
    lead_time2 = (date2 - now).days
    
    # Similar lead times are more compatible
    diff = abs(lead_time1 - lead_time2)
    
    if diff <= 7:
        return 1.0  # Within a week
    elif diff <= 14:
        return 0.8  # Within two weeks
    elif diff <= 30:
        return 0.6  # Within a month
    else:
        return 0.3  # Different planning horizons


def _ml_clustering(interests: List[Interest], initial_clusters: List[List[Interest]]) -> List[List[Interest]]:
    """Enhanced ML clustering using multiple algorithms and feature engineering"""
    try:
        from datetime import timezone
        
        # Prepare enhanced features
        features = []
        interest_metadata = []
        
        for interest in interests:
            # Core temporal features
            date_center = (interest.date_from + (interest.date_to - interest.date_from) / 2).toordinal()
            trip_duration = (interest.date_to - interest.date_from).days + 1
            
            # Convert date to datetime for lead time calculation
            if hasattr(interest.date_from, 'date'):
                date_start = datetime.combine(interest.date_from, datetime.min.time()).replace(tzinfo=timezone.utc)
            else:
                date_start = datetime.combine(interest.date_from, datetime.min.time()).replace(tzinfo=timezone.utc)
            
            now = datetime.now(timezone.utc)
            lead_time = (date_start - now).days
            
            # Seasonal features
            month = interest.date_from.month
            season = _get_season(month)
            
            # Budget features
            budget_center = (interest.budget_min or 0 + interest.budget_max or 0) / 2 if interest.budget_max else 0
            budget_range = (interest.budget_max or 0) - (interest.budget_min or 0) if interest.budget_max and interest.budget_min else 0
            
            # Group size features
            group_size = interest.num_people
            group_category = _categorize_group_size(group_size)
            
            feature_vector = [
                date_center,
                trip_duration,
                lead_time,
                budget_center / 1000 if budget_center > 0 else 0,  # Scale down budget
                budget_range / 1000 if budget_range > 0 else 0,
                group_size,
                season,  # 0-3 for seasons
                group_category,  # 0-2 for small/medium/large
                month  # Month of year
            ]
            
            features.append(feature_vector)
            interest_metadata.append({
                'interest': interest,
                'date_center': date_center,
                'lead_time': lead_time,
                'budget_center': budget_center
            })
        
        features_array = np.array(features)
        
        # Normalize features with robust scaling
        from sklearn.preprocessing import StandardScaler, RobustScaler
        scaler = RobustScaler()  # Less sensitive to outliers
        features_normalized = scaler.fit_transform(features_array)
        
        # Apply multiple clustering algorithms and choose best
        best_clusters = _apply_best_clustering_algorithm(features_normalized, interests, interest_metadata)
        
        # Post-process clusters for quality
        filtered_clusters = _filter_and_optimize_clusters(best_clusters, interest_metadata)
        
        return filtered_clusters
        
    except Exception as e:
        logger.warning(f"ML clustering failed, falling back to rule-based: {e}")
        return initial_clusters


def _get_season(month: int) -> int:
    """Convert month to season (0-3)"""
    if month in [12, 1, 2]:
        return 0  # Winter
    elif month in [3, 4, 5]:
        return 1  # Spring
    elif month in [6, 7, 8]:
        return 2  # Summer
    else:
        return 3  # Autumn


def _categorize_group_size(size: int) -> int:
    """Categorize group size (0-2)"""
    if size <= 2:
        return 0  # Small
    elif size <= 6:
        return 1  # Medium
    else:
        return 2  # Large


def _apply_best_clustering_algorithm(features: np.ndarray, interests: List[Interest], metadata: List[dict]) -> List[List[Interest]]:
    """Apply multiple clustering algorithms and select the best one"""
    from sklearn.cluster import AgglomerativeClustering, KMeans, DBSCAN
    from sklearn.metrics import silhouette_score
    
    n_interests = len(interests)
    algorithms = []
    
    # 1. Agglomerative Clustering (good for small datasets)
    for n_clusters in range(2, min(n_interests // 3, 8) + 1):
        try:
            agglom = AgglomerativeClustering(n_clusters=n_clusters, linkage='ward')
            labels = agglom.fit_predict(features)
            score = silhouette_score(features, labels) if len(set(labels)) > 1 else -1
            algorithms.append({
                'name': f'Agglomerative_{n_clusters}',
                'labels': labels,
                'score': score,
                'n_clusters': len(set(labels))
            })
        except:
            continue
    
    # 2. K-Means (good for spherical clusters)
    for n_clusters in range(2, min(n_interests // 3, 8) + 1):
        try:
            kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
            labels = kmeans.fit_predict(features)
            score = silhouette_score(features, labels) if len(set(labels)) > 1 else -1
            algorithms.append({
                'name': f'KMeans_{n_clusters}',
                'labels': labels,
                'score': score,
                'n_clusters': len(set(labels))
            })
        except:
            continue
    
    # 3. DBSCAN (good for irregular shapes)
    for eps in [0.3, 0.5, 0.8, 1.0]:
        try:
            dbscan = DBSCAN(eps=eps, min_samples=2)
            labels = dbscan.fit_predict(features)
            n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
            if n_clusters >= 1:
                score = silhouette_score(features, labels) if n_clusters > 1 else 0
                algorithms.append({
                    'name': f'DBSCAN_{eps}',
                    'labels': labels,
                    'score': score,
                    'n_clusters': n_clusters
                })
        except:
            continue
    
    # Select best algorithm
    if not algorithms:
        # Fallback to simple clustering
        return [interests]
    
    best_algorithm = max(algorithms, key=lambda x: x['score'])
    logger.info(f"Selected clustering algorithm: {best_algorithm['name']} with score: {best_algorithm['score']:.3f}")
    
    # Group interests by cluster labels
    clusters = {}
    for i, label in enumerate(best_algorithm['labels']):
        if label == -1:  # DBSCAN noise points
            continue
        if label not in clusters:
            clusters[label] = []
        clusters[label].append(interests[i])
    
    return list(clusters.values())


def _filter_and_optimize_clusters(clusters: List[List[Interest]], metadata: List[dict]) -> List[List[Interest]]:
    """Filter and optimize clusters for business rules"""
    optimized_clusters = []
    
    for cluster in clusters:
        # Skip clusters that are too small
        if len(cluster) < 2:
            continue
        
        # Check cluster quality
        quality_score = _calculate_cluster_quality(cluster)
        
        # Only keep high-quality clusters
        if quality_score >= 0.6:
            # Try to optimize cluster composition
            optimized_cluster = _optimize_cluster_composition(cluster)
            optimized_clusters.append(optimized_cluster)
    
    return optimized_clusters


def _calculate_cluster_quality(cluster: List[Interest]) -> float:
    """Calculate cluster quality score (0-1)"""
    if len(cluster) < 2:
        return 0.0
    
    total_compatibility = 0.0
    comparisons = 0
    
    # Calculate average pairwise compatibility
    for i, interest1 in enumerate(cluster):
        for j, interest2 in enumerate(cluster[i+1:], i+1):
            compatibility = _calculate_compatibility(interest1, interest2)
            total_compatibility += compatibility
            comparisons += 1
    
    return total_compatibility / comparisons if comparisons > 0 else 0.0


def _optimize_cluster_composition(cluster: List[Interest]) -> List[Interest]:
    """Optimize cluster by removing incompatible members"""
    if len(cluster) <= 4:
        return cluster  # Keep small clusters as-is
    
    # Calculate compatibility matrix
    compatibility_scores = {}
    for i, interest1 in enumerate(cluster):
        total_score = 0.0
        for j, interest2 in enumerate(cluster):
            if i != j:
                total_score += _calculate_compatibility(interest1, interest2)
        compatibility_scores[i] = total_score / (len(cluster) - 1)
    
    # Remove least compatible members if cluster is too large
    sorted_members = sorted(compatibility_scores.items(), key=lambda x: x[1], reverse=True)
    
    # Keep top members up to max group size (20)
    max_size = 20
    optimized_indices = [idx for idx, score in sorted_members[:max_size]]
    
    return [cluster[i] for i in optimized_indices]


def _create_group_from_cluster(db: Session, destination: Destination, cluster: List[Interest]):
    """Create a group from a cluster of interests with enhanced business logic"""
    try:
        # Calculate optimal group details
        date_from = min(interest.date_from for interest in cluster)
        date_to = max(interest.date_to for interest in cluster)
        total_people = sum(interest.num_people for interest in cluster)
        
        # Calculate pricing with tiered discounts
        pricing_details = _calculate_group_pricing(destination, cluster)
        
        # Generate appealing group name
        group_name = _generate_group_name(destination, date_from, len(cluster))
        
        # Create group with comprehensive data
        group = Group(
            destination_id=destination.id,
            name=group_name,
            date_from=date_from,
            date_to=date_to,
            min_size=max(4, len(cluster)),  # Minimum size based on current cluster
            max_size=min(20, len(cluster) * 2),  # Allow for growth
            current_size=len(cluster),
            base_price=destination.base_price,
            final_price_per_person=pricing_details['final_price'],
            price_calc=pricing_details['calculation'],
            status="forming",
            admin_notes=f"Auto-generated from {len(cluster)} interests via ML clustering"
        )
        
        db.add(group)
        db.flush()  # Get the group ID
        
        # Update interests with detailed tracking
        for interest in cluster:
            interest.status = 'matched'
            interest.group_id = group.id
            interest.updated_at = datetime.utcnow()
        
        # Schedule notification tasks
        _schedule_group_notifications(group.id, [i.id for i in cluster])
        
        logger.info(f"Created group {group.id} '{group_name}' with {len(cluster)} members for {destination.name}")
        logger.info(f"Group pricing: ${pricing_details['final_price']:.2f} per person (${pricing_details['savings']:.2f} savings)")
        
        return group
        
    except Exception as e:
        logger.error(f"Error creating group from cluster: {e}")
        db.rollback()
        raise


def _calculate_group_pricing(destination: Destination, cluster: List[Interest]) -> dict:
    """Calculate group pricing with advanced discount tiers"""
    base_price = destination.base_price
    members_count = len(cluster)
    
    # Tiered discount system
    discount_tiers = [
        (4, 0.05),   # 4-6 people: 5% discount
        (7, 0.10),   # 7-9 people: 10% discount  
        (10, 0.15),  # 10-12 people: 15% discount
        (13, 0.20),  # 13-15 people: 20% discount
        (16, 0.25),  # 16+ people: 25% discount (max)
    ]
    
    # Find applicable discount tier
    discount_rate = 0.0
    for min_size, tier_discount in discount_tiers:
        if members_count >= min_size:
            discount_rate = tier_discount
    
    # Apply maximum discount limit
    discount_rate = min(discount_rate, destination.max_discount)
    
    # Calculate final pricing
    discount_amount = base_price * discount_rate
    final_price = base_price - discount_amount
    total_savings = discount_amount * sum(interest.num_people for interest in cluster)
    
    # Budget compatibility check
    budget_stats = _analyze_cluster_budgets(cluster)
    
    calculation_details = {
        "base_price": base_price,
        "members_count": members_count,
        "total_travelers": sum(interest.num_people for interest in cluster),
        "discount_tier": f"{discount_rate:.1%}",
        "discount_amount": discount_amount,
        "final_price_per_person": final_price,
        "total_savings_group": total_savings,
        "budget_compatibility": budget_stats,
        "calculation_method": "tiered_discount",
        "calculation_date": datetime.utcnow().isoformat(),
        "pricing_factors": {
            "group_size_bonus": members_count >= 10,
            "budget_alignment": budget_stats['alignment_score'] > 0.7,
            "date_popularity": _is_peak_season(cluster[0].date_from)
        }
    }
    
    return {
        'final_price': final_price,
        'savings': discount_amount,
        'calculation': calculation_details
    }


def _analyze_cluster_budgets(cluster: List[Interest]) -> dict:
    """Analyze budget compatibility within cluster"""
    budgets = []
    for interest in cluster:
        if interest.budget_max:
            budget_center = (interest.budget_min or 0 + interest.budget_max) / 2
            budgets.append(budget_center)
    
    if not budgets:
        return {
            'has_budget_data': False,
            'alignment_score': 0.8,  # Neutral score
            'recommendation': 'No budget data available'
        }
    
    import statistics
    avg_budget = statistics.mean(budgets)
    budget_std = statistics.stdev(budgets) if len(budgets) > 1 else 0
    
    # Calculate alignment score (lower std deviation = higher alignment)
    alignment_score = max(0, 1 - (budget_std / avg_budget)) if avg_budget > 0 else 0
    
    return {
        'has_budget_data': True,
        'average_budget': avg_budget,
        'budget_variance': budget_std,
        'alignment_score': alignment_score,
        'recommendation': 'High budget alignment' if alignment_score > 0.7 else 'Mixed budget preferences'
    }


def _generate_group_name(destination: Destination, date_from: datetime, member_count: int) -> str:
    """Generate appealing group names"""
    month_name = date_from.strftime('%B')
    
    # Group size descriptors
    if member_count >= 15:
        size_desc = "Mega"
    elif member_count >= 10:
        size_desc = "Big"
    elif member_count >= 7:
        size_desc = "Social"
    else:
        size_desc = "Cozy"
    
    name_patterns = [
        f"{size_desc} {destination.name} Adventure - {month_name}",
        f"{destination.name} {size_desc} Group - {month_name} {date_from.year}",
        f"{month_name} {destination.name} Explorer Club",
        f"{destination.name} Travel Squad - {month_name}"
    ]
    
    # Select pattern based on destination characteristics
    pattern_index = hash(destination.name) % len(name_patterns)
    return name_patterns[pattern_index]


def _is_peak_season(date: datetime) -> bool:
    """Determine if date falls in peak travel season"""
    month = date.month
    
    # General peak seasons (varies by destination, this is simplified)
    peak_months = [6, 7, 8, 12, 1]  # Summer and winter holidays
    return month in peak_months


def _schedule_group_notifications(group_id: int, interest_ids: List[int]):
    """Schedule notification tasks for group formation"""
    try:
        # Schedule immediate notification
        send_group_formation_notification.delay(group_id, interest_ids)
        
        # Schedule follow-up reminder in 24 hours
        from datetime import timedelta
        follow_up_time = datetime.utcnow() + timedelta(hours=24)
        send_group_reminder_notification.apply_async(
            args=[group_id],
            eta=follow_up_time
        )
        
        logger.info(f"Scheduled notifications for group {group_id} with {len(interest_ids)} members")
        
    except Exception as e:
        logger.error(f"Error scheduling notifications for group {group_id}: {e}")


@celery_app.task
def send_group_formation_notification(group_id: int, interest_ids: List[int]):
    """Send notification when a group is formed"""
    db = SessionLocal()
    try:
        group = db.query(Group).filter(Group.id == group_id).first()
        if not group:
            logger.error(f"Group {group_id} not found for notification")
            return
        
        interests = db.query(Interest).filter(Interest.id.in_(interest_ids)).all()
        
        for interest in interests:
            try:
                # Create personalized message
                savings = group.base_price - group.final_price_per_person
                total_savings = savings * interest.num_people
                
                message_data = {
                    'group_name': group.name,
                    'destination_name': group.destination.name,
                    'travel_date': group.date_from.strftime('%B %d, %Y'),
                    'group_size': group.current_size,
                    'original_price': group.base_price,
                    'final_price': group.final_price_per_person,
                    'savings_per_person': savings,
                    'total_savings': total_savings,
                    'user_name': interest.user_name,
                    'user_email': interest.user_email
                }
                
                # Send email notification (implementation depends on email service)
                _send_email_notification('group_formation', message_data)
                
                logger.info(f"Sent group formation notification to {interest.user_email}")
                
            except Exception as e:
                logger.error(f"Error sending notification to {interest.user_email}: {e}")
                
    except Exception as e:
        logger.error(f"Error in group formation notification task: {e}")
    finally:
        db.close()


@celery_app.task
def send_group_reminder_notification(group_id: int):
    """Send reminder notification for group members"""
    db = SessionLocal()
    try:
        group = db.query(Group).filter(Group.id == group_id).first()
        if not group or group.status != 'forming':
            return
        
        # Send reminder about group confirmation deadline
        interests = db.query(Interest).filter(Interest.group_id == group_id).all()
        
        for interest in interests:
            message_data = {
                'group_name': group.name,
                'destination_name': group.destination.name,
                'user_name': interest.user_name,
                'user_email': interest.user_email,
                'confirmation_deadline': (datetime.utcnow() + timedelta(days=7)).strftime('%B %d, %Y')
            }
            
            _send_email_notification('group_reminder', message_data)
            
    except Exception as e:
        logger.error(f"Error in group reminder notification task: {e}")
    finally:
        db.close()


def _send_email_notification(template_type: str, data: dict):
    """Send email notification (placeholder for actual email service integration)"""
    # This would integrate with SendGrid, Mailgun, etc.
    # For now, just log the notification
    logger.info(f"Email notification [{template_type}] for {data.get('user_email', 'unknown')}: {data.get('group_name', 'group')}")
    
    # TODO: Implement actual email sending
    # Example:
    # if template_type == 'group_formation':
    #     send_group_formation_email(data)
    # elif template_type == 'group_reminder':
    #     send_group_reminder_email(data)


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
def optimize_existing_groups():
    """Optimize existing groups by potentially merging compatible groups or adding new members"""
    db = SessionLocal()
    try:
        # Find groups that could benefit from optimization
        forming_groups = db.query(Group).filter(
            Group.status == 'forming',
            Group.current_size < Group.max_size
        ).all()
        
        for group in forming_groups:
            try:
                # Try to add compatible open interests to existing groups
                _optimize_group_membership(db, group)
                
                # Check if small groups can be merged
                if group.current_size < 6:
                    _attempt_group_merge(db, group)
                    
            except Exception as e:
                logger.error(f"Error optimizing group {group.id}: {e}")
                continue
        
        db.commit()
        logger.info(f"Optimized {len(forming_groups)} forming groups")
        
    except Exception as e:
        logger.error(f"Error in group optimization: {e}")
        db.rollback()
    finally:
        db.close()


def _optimize_group_membership(db: Session, group: Group):
    """Try to add compatible open interests to an existing group"""
    # Find open interests for the same destination
    open_interests = db.query(Interest).filter(
        Interest.destination_id == group.destination_id,
        Interest.status == 'open',
        Interest.date_from >= group.date_from - timedelta(days=3),
        Interest.date_from <= group.date_to + timedelta(days=3)
    ).all()
    
    if not open_interests:
        return
    
    # Get existing group members for compatibility checking
    existing_members = db.query(Interest).filter(Interest.group_id == group.id).all()
    
    compatible_interests = []
    for interest in open_interests:
        # Check compatibility with existing members
        avg_compatibility = 0.0
        for member in existing_members:
            avg_compatibility += _calculate_compatibility(interest, member)
        
        avg_compatibility /= len(existing_members)
        
        # Add if highly compatible and group has space
        if avg_compatibility > 0.75 and group.current_size < group.max_size:
            compatible_interests.append(interest)
    
    # Add compatible interests to group
    if compatible_interests:
        for interest in compatible_interests:
            interest.status = 'matched'
            interest.group_id = group.id
            group.current_size += 1
            
            # Recalculate pricing with new member
            all_members = existing_members + [interest]
            pricing_details = _calculate_group_pricing(group.destination, all_members)
            group.final_price_per_person = pricing_details['final_price']
            group.price_calc = pricing_details['calculation']
        
        logger.info(f"Added {len(compatible_interests)} members to group {group.id}")
        
        # Notify new members
        _schedule_group_notifications(group.id, [i.id for i in compatible_interests])


def _attempt_group_merge(db: Session, group: Group):
    """Attempt to merge small groups with similar preferences"""
    # Find other small groups for the same destination
    candidate_groups = db.query(Group).filter(
        Group.destination_id == group.destination_id,
        Group.status == 'forming',
        Group.id != group.id,
        Group.current_size < 8,  # Only merge small groups
        Group.date_from >= group.date_from - timedelta(days=5),
        Group.date_from <= group.date_from + timedelta(days=5)
    ).all()
    
    for candidate in candidate_groups:
        # Check if merged group would be viable
        combined_size = group.current_size + candidate.current_size
        
        if combined_size <= 20:  # Don't exceed max size
            # Get members from both groups
            group1_members = db.query(Interest).filter(Interest.group_id == group.id).all()
            group2_members = db.query(Interest).filter(Interest.group_id == candidate.id).all()
            
            # Check overall compatibility
            compatibility_score = _calculate_group_merge_compatibility(group1_members, group2_members)
            
            if compatibility_score > 0.7:
                # Merge groups
                _merge_groups(db, group, candidate, group1_members, group2_members)
                logger.info(f"Merged groups {group.id} and {candidate.id}")
                break  # Only merge with one group at a time


def _calculate_group_merge_compatibility(group1_members: List[Interest], group2_members: List[Interest]) -> float:
    """Calculate compatibility score for merging two groups"""
    total_compatibility = 0.0
    comparisons = 0
    
    # Check compatibility between all members of both groups
    for member1 in group1_members:
        for member2 in group2_members:
            total_compatibility += _calculate_compatibility(member1, member2)
            comparisons += 1
    
    return total_compatibility / comparisons if comparisons > 0 else 0.0


def _merge_groups(db: Session, primary_group: Group, secondary_group: Group, 
                 primary_members: List[Interest], secondary_members: List[Interest]):
    """Merge two groups into one"""
    # Update secondary group members to point to primary group
    for member in secondary_members:
        member.group_id = primary_group.id
    
    # Update primary group details
    all_members = primary_members + secondary_members
    primary_group.current_size = len(all_members)
    
    # Recalculate dates (use widest range)
    primary_group.date_from = min(primary_group.date_from, secondary_group.date_from)
    primary_group.date_to = max(primary_group.date_to, secondary_group.date_to)
    
    # Recalculate pricing
    pricing_details = _calculate_group_pricing(primary_group.destination, all_members)
    primary_group.final_price_per_person = pricing_details['final_price']
    primary_group.price_calc = pricing_details['calculation']
    
    # Update group name to reflect larger size
    primary_group.name = _generate_group_name(
        primary_group.destination, 
        primary_group.date_from, 
        primary_group.current_size
    )
    
    # Archive secondary group
    secondary_group.status = 'merged'
    secondary_group.admin_notes = f"Merged into group {primary_group.id}"
    
    # Notify all members about the merge
    all_member_ids = [m.id for m in all_members]
    _schedule_group_notifications(primary_group.id, all_member_ids)
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


# ===== GROUP FORMATION WORKFLOW TASKS =====

@celery_app.task
def check_group_confirmation_deadline(group_id: int):
    """Check if group confirmation deadline has passed and take appropriate action"""
    db = SessionLocal()
    try:
        from app.services.group_formation_service import GroupFormationWorkflow
        
        workflow = GroupFormationWorkflow(db)
        group = db.query(Group).filter(Group.id == group_id).first()
        
        if not group or group.status not in ['pending_confirmation', 'forming']:
            logger.info(f"Skipping deadline check for group {group_id} - not in confirmation phase")
            return
        
        # Check if deadline has passed
        if datetime.utcnow() > group.confirmation_deadline:
            logger.info(f"Confirmation deadline passed for group {group_id}, evaluating status")
            
            # Evaluate group status and determine action
            status = workflow._evaluate_group_status(group_id)
            
            if status['min_size_met']:
                # Finalize group with current confirmations
                result = workflow.finalize_group_formation(group_id, force=True)
                logger.info(f"Auto-finalized group {group_id}: {result['status']}")
            else:
                # Cancel group due to insufficient confirmations
                from app.services.group_service import GroupService
                GroupService.cancel_group(
                    db, group_id, 
                    reason="Insufficient member confirmations by deadline"
                )
                logger.info(f"Auto-cancelled group {group_id} due to insufficient confirmations")
        
        db.commit()
        
    except Exception as e:
        logger.error(f"Error checking confirmation deadline for group {group_id}: {e}")
        db.rollback()
    finally:
        db.close()


@celery_app.task
def finalize_group_formation(group_id: int, force: bool = False):
    """Finalize group formation process"""
    db = SessionLocal()
    try:
        from app.services.group_formation_service import GroupFormationWorkflow
        
        workflow = GroupFormationWorkflow(db)
        result = workflow.finalize_group_formation(group_id, force)
        
        logger.info(f"Group finalization result for {group_id}: {result}")
        return result
        
    except Exception as e:
        logger.error(f"Error finalizing group formation for {group_id}: {e}")
        raise
    finally:
        db.close()


@celery_app.task
def process_payment_webhook(webhook_data: dict):
    """Process payment webhook notifications"""
    db = SessionLocal()
    try:
        from app.services.payment_service import payment_service
        
        # Verify webhook signature (in production)
        if not payment_service.mock_mode:
            signature = webhook_data.get('signature')
            payload = webhook_data.get('payload')
            if not payment_service.verify_webhook_signature(payload, signature, 'webhook_secret'):
                logger.error("Invalid webhook signature")
                return
        
        event_type = webhook_data.get('type')
        event_data = webhook_data.get('data', {})
        
        if event_type == 'payment_intent.succeeded':
            # Payment succeeded - update confirmation status
            payment_intent_id = event_data.get('id')
            
            confirmation = db.query(GroupMemberConfirmation).filter(
                GroupMemberConfirmation.payment_intent_id == payment_intent_id
            ).first()
            
            if confirmation:
                confirmation.payment_status = 'paid'
                confirmation.confirmed = True
                confirmation.confirmed_at = datetime.utcnow()
                
                # Check if group can be finalized
                group_id = confirmation.group_id
                from app.services.group_formation_service import GroupFormationWorkflow
                workflow = GroupFormationWorkflow(db)
                
                status = workflow._evaluate_group_status(group_id)
                if status['can_proceed']:
                    # Schedule group finalization
                    finalize_group_formation.delay(group_id)
                
                db.commit()
                logger.info(f"Payment confirmed for confirmation {confirmation.id}")
        
        elif event_type == 'payment_intent.payment_failed':
            # Payment failed - update status and notify user
            payment_intent_id = event_data.get('id')
            
            confirmation = db.query(GroupMemberConfirmation).filter(
                GroupMemberConfirmation.payment_intent_id == payment_intent_id
            ).first()
            
            if confirmation:
                confirmation.payment_status = 'failed'
                
                # Send payment failure notification
                interest = db.query(Interest).filter(Interest.id == confirmation.interest_id).first()
                from app.services.notification_service import NotificationService
                notification_service = NotificationService(db)
                
                notification_service.send_notification(
                    template_name='payment_failed',
                    recipient_email=interest.user_email,
                    template_data={
                        'user_name': interest.user_name,
                        'group_name': confirmation.group.name,
                        'retry_payment_link': f"/groups/{confirmation.group_id}/confirm/{confirmation.confirmation_token}"
                    }
                )
                
                db.commit()
                logger.info(f"Payment failed for confirmation {confirmation.id}")
        
    except Exception as e:
        logger.error(f"Error processing payment webhook: {e}")
        db.rollback()
    finally:
        db.close()


@celery_app.task
def auto_confirm_groups():
    """Automatically confirm groups that meet auto-confirmation criteria"""
    db = SessionLocal()
    try:
        # Find groups that are eligible for auto-confirmation
        eligible_groups = db.query(Group).filter(
            Group.status == 'pending_confirmation',
            Group.auto_confirm_enabled == True,
            Group.confirmation_deadline < datetime.utcnow() + timedelta(hours=1)  # Within 1 hour of deadline
        ).all()
        
        for group in eligible_groups:
            try:
                from app.services.group_formation_service import GroupFormationWorkflow
                workflow = GroupFormationWorkflow(db)
                
                status = workflow._evaluate_group_status(group.id)
                
                # Check if group meets auto-confirmation criteria
                confirmation_rate = status['confirmed_count'] / status['total_members'] if status['total_members'] > 0 else 0
                
                if (confirmation_rate >= group.minimum_confirmation_rate and 
                    status['confirmed_count'] >= group.min_size):
                    
                    # Auto-confirm the group
                    result = workflow.finalize_group_formation(group.id, force=False)
                    logger.info(f"Auto-confirmed group {group.id}: {result['status']}")
                    
            except Exception as e:
                logger.error(f"Error auto-confirming group {group.id}: {e}")
                continue
        
        db.commit()
        
    except Exception as e:
        logger.error(f"Error in auto-confirm groups task: {e}")
        db.rollback()
    finally:
        db.close()


@celery_app.task  
def cleanup_expired_confirmations():
    """Clean up expired confirmation records and reset associated interests"""
    db = SessionLocal()
    try:
        # Find expired confirmations that were never responded to
        expired_confirmations = db.query(GroupMemberConfirmation).filter(
            GroupMemberConfirmation.confirmed.is_(None),
            GroupMemberConfirmation.expires_at < datetime.utcnow(),
            GroupMemberConfirmation.status == 'pending'
        ).all()
        
        for confirmation in expired_confirmations:
            try:
                # Mark confirmation as expired
                confirmation.status = 'expired'
                
                # Reset associated interest to open status
                interest = db.query(Interest).filter(Interest.id == confirmation.interest_id).first()
                if interest:
                    interest.status = 'open'
                    interest.group_id = None
                
                # Check if group should be cancelled due to too many expired confirmations
                group = db.query(Group).filter(Group.id == confirmation.group_id).first()
                if group and group.status == 'pending_confirmation':
                    
                    active_confirmations = db.query(GroupMemberConfirmation).filter(
                        GroupMemberConfirmation.group_id == group.id,
                        GroupMemberConfirmation.status.in_(['confirmed', 'pending'])
                    ).count()
                    
                    if active_confirmations < group.min_size:
                        # Cancel group due to insufficient active confirmations
                        from app.services.group_service import GroupService
                        GroupService.cancel_group(
                            db, group.id,
                            reason="Too many expired confirmations - insufficient members remaining"
                        )
                        logger.info(f"Cancelled group {group.id} due to expired confirmations")
                
            except Exception as e:
                logger.error(f"Error cleaning up confirmation {confirmation.id}: {e}")
                continue
        
        db.commit()
        logger.info(f"Cleaned up {len(expired_confirmations)} expired confirmations")
        
    except Exception as e:
        logger.error(f"Error in cleanup expired confirmations task: {e}")
        db.rollback()
    finally:
        db.close()