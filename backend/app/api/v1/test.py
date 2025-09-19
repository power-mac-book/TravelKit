from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Interest, Group, GroupMemberConfirmation, PaymentTransaction, GroupLifecycleEvent
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/clear-data")
async def clear_test_data(db: Session = Depends(get_db)):
    """Clear all test data for fresh testing"""
    try:
        # Delete in reverse dependency order
        
        # 1. Delete payment transactions
        payment_count = db.query(PaymentTransaction).delete()
        
        # 2. Delete group lifecycle events
        event_count = db.query(GroupLifecycleEvent).delete()
        
        # 3. Delete group member confirmations
        confirmation_count = db.query(GroupMemberConfirmation).delete()
        
        # 4. Reset interests to open status and remove group associations
        interests = db.query(Interest).filter(Interest.status != 'open').all()
        for interest in interests:
            interest.status = 'open'
            interest.group_id = None
        interest_count = len(interests)
        
        # 5. Delete all groups
        group_count = db.query(Group).delete()
        
        db.commit()
        
        return {
            "message": "Test data cleared successfully",
            "cleared": {
                "groups": group_count,
                "confirmations": confirmation_count,
                "payments": payment_count,
                "events": event_count,
                "interests_reset": interest_count
            }
        }
    
    except Exception as e:
        logger.error(f"Error clearing test data: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-sample-interests")
async def generate_sample_interests(db: Session = Depends(get_db)):
    """Generate sample interests for testing"""
    try:
        from datetime import datetime, timedelta
        
        # Sample test interests for Goa
        test_interests = [
            {
                'user_name': 'Alice Johnson',
                'user_email': 'alice@test.com',
                'destination_id': 1,
                'date_from': (datetime.now() + timedelta(days=45)).date(),
                'date_to': (datetime.now() + timedelta(days=50)).date(),
                'num_people': 2,
                'budget_min': 35000,
                'budget_max': 45000,
                'user_phone': '+91-9876543210'
            },
            {
                'user_name': 'Bob Smith',
                'user_email': 'bob@test.com',
                'destination_id': 1,
                'date_from': (datetime.now() + timedelta(days=46)).date(),
                'date_to': (datetime.now() + timedelta(days=51)).date(),
                'num_people': 2,
                'budget_min': 38000,
                'budget_max': 48000,
                'user_phone': '+91-9876543211'
            },
            {
                'user_name': 'Carol Davis',
                'user_email': 'carol@test.com',
                'destination_id': 1,
                'date_from': (datetime.now() + timedelta(days=44)).date(),
                'date_to': (datetime.now() + timedelta(days=49)).date(),
                'num_people': 3,
                'budget_min': 36000,
                'budget_max': 46000,
                'user_phone': '+91-9876543212'
            },
            {
                'user_name': 'David Wilson',
                'user_email': 'david@test.com',
                'destination_id': 1,
                'date_from': (datetime.now() + timedelta(days=47)).date(),
                'date_to': (datetime.now() + timedelta(days=52)).date(),
                'num_people': 2,
                'budget_min': 37000,
                'budget_max': 47000,
                'user_phone': '+91-9876543213'
            },
            {
                'user_name': 'Emma Brown',
                'user_email': 'emma@test.com',
                'destination_id': 1,
                'date_from': (datetime.now() + timedelta(days=45)).date(),
                'date_to': (datetime.now() + timedelta(days=50)).date(),
                'num_people': 1,
                'budget_min': 40000,
                'budget_max': 50000,
                'user_phone': '+91-9876543214'
            },
            {
                'user_name': 'Frank Miller',
                'user_email': 'frank@test.com',
                'destination_id': 1,
                'date_from': (datetime.now() + timedelta(days=46)).date(),
                'date_to': (datetime.now() + timedelta(days=51)).date(),
                'num_people': 4,
                'budget_min': 35000,
                'budget_max': 45000,
                'user_phone': '+91-9876543215'
            }
        ]
        
        created_interests = []
        for interest_data in test_interests:
            interest = Interest(**interest_data)
            db.add(interest)
            created_interests.append(interest_data['user_name'])
        
        db.commit()
        
        return {
            "message": f"Created {len(created_interests)} sample interests",
            "interests": created_interests
        }
    
    except Exception as e:
        logger.error(f"Error generating sample interests: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/trigger-clustering")
async def trigger_test_clustering():
    """Trigger clustering for testing without authentication"""
    try:
        from app.tasks import cluster_interests
        import asyncio
        
        # Run clustering task directly
        result = cluster_interests.delay()
        
        return {
            "message": "Clustering task triggered successfully",
            "task_id": str(result.id),
            "status": "submitted"
        }
    
    except Exception as e:
        logger.error(f"Error triggering clustering: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/check-groups")
async def check_test_groups(db: Session = Depends(get_db)):
    """Check created groups for testing"""
    try:
        from app.models.models import Group, Interest
        
        groups = db.query(Group).all()
        interests = db.query(Interest).all()
        
        group_data = []
        for group in groups:
            group_info = {
                "id": group.id,
                "name": group.name,
                "destination_id": group.destination_id,
                "status": group.status,
                "member_count": len(group.interests),
                "price_per_person": float(group.final_price_per_person) if group.final_price_per_person else None,
                "date_from": str(group.date_from),
                "date_to": str(group.date_to),
                "members": [
                    {
                        "name": interest.user_name,
                        "email": interest.user_email,
                        "num_people": interest.num_people
                    }
                    for interest in group.interests
                ]
            }
            group_data.append(group_info)
        
        return {
            "total_groups": len(groups),
            "total_interests": len(interests),
            "groups": group_data
        }
    
    except Exception as e:
        logger.error(f"Error checking groups: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/debug-interests")
async def debug_interests(db: Session = Depends(get_db)):
    """Debug interests to see their data for clustering"""
    try:
        from app.models.models import Interest
        from datetime import datetime, date
        
        interests = db.query(Interest).all()
        
        debug_data = []
        for interest in interests:
            # Calculate days from now properly
            today = date.today()
            days_from_now = None
            if interest.date_from:
                if isinstance(interest.date_from, datetime):
                    days_from_now = (interest.date_from.date() - today).days
                else:
                    days_from_now = (interest.date_from - today).days
            
            debug_info = {
                "id": interest.id,
                "name": interest.user_name,
                "destination_id": interest.destination_id,
                "date_from": str(interest.date_from),
                "date_to": str(interest.date_to),
                "num_people": interest.num_people,
                "budget_min": interest.budget_min,
                "budget_max": interest.budget_max,
                "days_from_now": days_from_now
            }
            debug_data.append(debug_info)
        
        return {
            "total_interests": len(interests),
            "interests": debug_data
        }
    
    except Exception as e:
        logger.error(f"Error debugging interests: {e}")
        raise HTTPException(status_code=500, detail=str(e))