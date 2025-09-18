"""
Notification API endpoints for managing notifications and templates
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc
from pydantic import BaseModel

from app.core.database import get_db
from app.models.models import (
    NotificationTemplate, NotificationLog, NotificationPreference,
    Interest, Group, Destination
)
from app.services.notification_service import notification_service
from app.tasks import (
    send_interest_confirmation, send_group_match_notification,
    send_pricing_update_notification, send_follow_up_sequence,
    send_marketing_campaign
)

router = APIRouter()


# ===== PYDANTIC MODELS =====

class NotificationSendRequest(BaseModel):
    template_name: str
    recipient_email: Optional[str] = None
    recipient_phone: Optional[str] = None
    template_data: Dict[str, Any] = {}
    notification_type: str = "both"  # email, whatsapp, both
    interest_id: Optional[int] = None
    group_id: Optional[int] = None
    user_id: Optional[int] = None


class BulkNotificationRequest(BaseModel):
    template_name: str
    recipients: List[Dict[str, Any]]
    template_data: Dict[str, Any] = {}
    notification_type: str = "both"


class MarketingCampaignRequest(BaseModel):
    template_name: str = "marketing"
    target_criteria: Dict[str, Any] = {}
    message_data: Dict[str, Any] = {}


class NotificationPreferenceUpdate(BaseModel):
    user_email: str
    user_phone: Optional[str] = None
    email_enabled: bool = True
    whatsapp_enabled: bool = True
    interest_confirmations: bool = True
    group_matches: bool = True
    pricing_updates: bool = True
    marketing_messages: bool = False
    follow_up_sequences: bool = True


class NotificationTemplateUpdate(BaseModel):
    subject: str
    email_template: Optional[str] = None
    whatsapp_template: Optional[str] = None
    is_active: bool = True
    template_variables: List[str] = []


class NotificationLogResponse(BaseModel):
    id: int
    template_name: Optional[str]
    recipient_email: Optional[str]
    recipient_phone: Optional[str]
    notification_type: str
    status: str
    subject: Optional[str]
    sent_at: Optional[datetime]
    delivered_at: Optional[datetime]
    error_message: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationStatsResponse(BaseModel):
    total_sent: int
    email_sent: int
    whatsapp_sent: int
    delivered: int
    failed: int
    pending: int
    delivery_rate: float
    recent_activity: List[NotificationLogResponse]


# ===== API ENDPOINTS =====

@router.post("/send")
async def send_notification(
    request: NotificationSendRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Send a single notification using specified template"""
    try:
        result = notification_service.send_notification(
            db=db,
            template_name=request.template_name,
            recipient_email=request.recipient_email,
            recipient_phone=request.recipient_phone,
            template_data=request.template_data,
            notification_type=request.notification_type,
            interest_id=request.interest_id,
            group_id=request.group_id,
            user_id=request.user_id
        )
        
        return {
            "success": True,
            "message": "Notification sent successfully",
            "result": result
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send notification: {str(e)}")


@router.post("/send/bulk")
async def send_bulk_notification(
    request: BulkNotificationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Send bulk notifications to multiple recipients"""
    try:
        result = notification_service.send_bulk_notification(
            db=db,
            template_name=request.template_name,
            recipients=request.recipients,
            template_data=request.template_data,
            notification_type=request.notification_type
        )
        
        return {
            "success": True,
            "message": "Bulk notifications processed",
            "results": result
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send bulk notifications: {str(e)}")


@router.post("/campaign/marketing")
async def send_marketing_campaign(
    request: MarketingCampaignRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Send targeted marketing campaign"""
    try:
        # Queue marketing campaign as background task
        campaign_data = {
            "template_name": request.template_name,
            "target_criteria": request.target_criteria,
            "message_data": request.message_data
        }
        
        background_tasks.add_task(send_marketing_campaign, campaign_data)
        
        return {
            "success": True,
            "message": "Marketing campaign queued for processing"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to queue marketing campaign: {str(e)}")


@router.post("/trigger/interest-confirmation/{interest_id}")
async def trigger_interest_confirmation(
    interest_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Trigger interest confirmation notification"""
    # Verify interest exists
    interest = db.query(Interest).filter(Interest.id == interest_id).first()
    if not interest:
        raise HTTPException(status_code=404, detail="Interest not found")
    
    # Queue notification task
    background_tasks.add_task(send_interest_confirmation, interest_id)
    
    return {
        "success": True,
        "message": f"Interest confirmation queued for interest {interest_id}"
    }


@router.post("/trigger/group-match/{group_id}")
async def trigger_group_match_notification(
    group_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Trigger group match notifications for all group members"""
    # Verify group exists
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Queue notification task
    background_tasks.add_task(send_group_match_notification, group_id)
    
    return {
        "success": True,
        "message": f"Group match notifications queued for group {group_id}"
    }


@router.post("/trigger/follow-up")
async def trigger_follow_up_sequence(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Trigger follow-up sequence for unmatched interests"""
    # Queue follow-up task
    background_tasks.add_task(send_follow_up_sequence)
    
    return {
        "success": True,
        "message": "Follow-up sequence queued for processing"
    }


@router.get("/logs", response_model=List[NotificationLogResponse])
async def get_notification_logs(
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    status: Optional[str] = Query(None),
    notification_type: Optional[str] = Query(None),
    template_name: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get notification logs with filtering"""
    query = db.query(NotificationLog)
    
    # Apply filters
    if status:
        query = query.filter(NotificationLog.status == status)
    if notification_type:
        query = query.filter(NotificationLog.notification_type == notification_type)
    if template_name:
        query = query.join(NotificationTemplate).filter(NotificationTemplate.name == template_name)
    
    # Order by most recent first
    query = query.order_by(desc(NotificationLog.created_at))
    
    # Apply pagination
    logs = query.offset(offset).limit(limit).all()
    
    # Convert to response format
    result = []
    for log in logs:
        result.append(NotificationLogResponse(
            id=log.id,
            template_name=log.template.name if log.template else None,
            recipient_email=log.recipient_email,
            recipient_phone=log.recipient_phone,
            notification_type=log.notification_type,
            status=log.status,
            subject=log.subject,
            sent_at=log.sent_at,
            delivered_at=log.delivered_at,
            error_message=log.error_message,
            created_at=log.created_at
        ))
    
    return result


@router.get("/stats", response_model=NotificationStatsResponse)
async def get_notification_stats(
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db)
):
    """Get notification statistics for the specified period"""
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    # Base query for the time period
    base_query = db.query(NotificationLog).filter(
        NotificationLog.created_at >= cutoff_date
    )
    
    # Calculate statistics
    total_sent = base_query.count()
    email_sent = base_query.filter(NotificationLog.notification_type.in_(["email", "both"])).count()
    whatsapp_sent = base_query.filter(NotificationLog.notification_type.in_(["whatsapp", "both"])).count()
    delivered = base_query.filter(NotificationLog.status == "delivered").count()
    failed = base_query.filter(NotificationLog.status == "failed").count()
    pending = base_query.filter(NotificationLog.status == "pending").count()
    
    delivery_rate = (delivered / total_sent * 100) if total_sent > 0 else 0
    
    # Get recent activity (last 10 notifications)
    recent_logs = base_query.order_by(desc(NotificationLog.created_at)).limit(10).all()
    recent_activity = [
        NotificationLogResponse(
            id=log.id,
            template_name=log.template.name if log.template else None,
            recipient_email=log.recipient_email,
            recipient_phone=log.recipient_phone,
            notification_type=log.notification_type,
            status=log.status,
            subject=log.subject,
            sent_at=log.sent_at,
            delivered_at=log.delivered_at,
            error_message=log.error_message,
            created_at=log.created_at
        )
        for log in recent_logs
    ]
    
    return NotificationStatsResponse(
        total_sent=total_sent,
        email_sent=email_sent,
        whatsapp_sent=whatsapp_sent,
        delivered=delivered,
        failed=failed,
        pending=pending,
        delivery_rate=round(delivery_rate, 2),
        recent_activity=recent_activity
    )


@router.get("/templates")
async def get_notification_templates(
    active_only: bool = Query(True),
    db: Session = Depends(get_db)
):
    """Get all notification templates"""
    query = db.query(NotificationTemplate)
    
    if active_only:
        query = query.filter(NotificationTemplate.is_active == True)
    
    templates = query.order_by(NotificationTemplate.name).all()
    
    return [
        {
            "id": template.id,
            "name": template.name,
            "subject": template.subject,
            "is_active": template.is_active,
            "template_variables": template.template_variables,
            "created_at": template.created_at,
            "updated_at": template.updated_at
        }
        for template in templates
    ]


@router.put("/templates/{template_id}")
async def update_notification_template(
    template_id: int,
    update_data: NotificationTemplateUpdate,
    db: Session = Depends(get_db)
):
    """Update notification template"""
    template = db.query(NotificationTemplate).filter(NotificationTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Update fields
    template.subject = update_data.subject
    if update_data.email_template:
        template.email_template = update_data.email_template
    if update_data.whatsapp_template:
        template.whatsapp_template = update_data.whatsapp_template
    template.is_active = update_data.is_active
    if update_data.template_variables:
        template.template_variables = update_data.template_variables
    template.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "success": True,
        "message": "Template updated successfully"
    }


@router.get("/preferences/{user_email}")
async def get_user_preferences(
    user_email: str,
    db: Session = Depends(get_db)
):
    """Get user notification preferences"""
    preferences = db.query(NotificationPreference).filter(
        NotificationPreference.user_email == user_email
    ).first()
    
    if not preferences:
        # Return default preferences
        return {
            "user_email": user_email,
            "email_enabled": True,
            "whatsapp_enabled": True,
            "interest_confirmations": True,
            "group_matches": True,
            "pricing_updates": True,
            "marketing_messages": False,
            "follow_up_sequences": True
        }
    
    return {
        "user_email": preferences.user_email,
        "user_phone": preferences.user_phone,
        "email_enabled": preferences.email_enabled,
        "whatsapp_enabled": preferences.whatsapp_enabled,
        "interest_confirmations": preferences.interest_confirmations,
        "group_matches": preferences.group_matches,
        "pricing_updates": preferences.pricing_updates,
        "marketing_messages": preferences.marketing_messages,
        "follow_up_sequences": preferences.follow_up_sequences
    }


@router.put("/preferences")
async def update_user_preferences(
    preferences_data: NotificationPreferenceUpdate,
    db: Session = Depends(get_db)
):
    """Update user notification preferences"""
    preferences = db.query(NotificationPreference).filter(
        NotificationPreference.user_email == preferences_data.user_email
    ).first()
    
    if not preferences:
        # Create new preferences
        preferences = NotificationPreference(
            user_email=preferences_data.user_email,
            user_phone=preferences_data.user_phone,
            email_enabled=preferences_data.email_enabled,
            whatsapp_enabled=preferences_data.whatsapp_enabled,
            interest_confirmations=preferences_data.interest_confirmations,
            group_matches=preferences_data.group_matches,
            pricing_updates=preferences_data.pricing_updates,
            marketing_messages=preferences_data.marketing_messages,
            follow_up_sequences=preferences_data.follow_up_sequences
        )
        db.add(preferences)
    else:
        # Update existing preferences
        preferences.user_phone = preferences_data.user_phone
        preferences.email_enabled = preferences_data.email_enabled
        preferences.whatsapp_enabled = preferences_data.whatsapp_enabled
        preferences.interest_confirmations = preferences_data.interest_confirmations
        preferences.group_matches = preferences_data.group_matches
        preferences.pricing_updates = preferences_data.pricing_updates
        preferences.marketing_messages = preferences_data.marketing_messages
        preferences.follow_up_sequences = preferences_data.follow_up_sequences
        preferences.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "success": True,
        "message": "Preferences updated successfully"
    }


@router.post("/webhook/sendgrid")
async def sendgrid_webhook(
    webhook_data: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """Handle SendGrid delivery status webhooks"""
    try:
        events = webhook_data.get("events", [])
        
        for event in events:
            message_id = event.get("sg_message_id")
            event_type = event.get("event")
            timestamp = datetime.fromtimestamp(event.get("timestamp", 0))
            
            if message_id and event_type:
                status_map = {
                    "delivered": "delivered",
                    "bounce": "failed",
                    "dropped": "failed",
                    "deferred": "pending"
                }
                
                status = status_map.get(event_type)
                if status:
                    notification_service.update_delivery_status(
                        db=db,
                        external_id=message_id,
                        status=status,
                        delivered_at=timestamp if status == "delivered" else None
                    )
        
        return {"success": True}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Webhook processing failed: {str(e)}")


@router.post("/webhook/twilio")
async def twilio_webhook(
    webhook_data: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """Handle Twilio delivery status webhooks"""
    try:
        message_sid = webhook_data.get("MessageSid")
        message_status = webhook_data.get("MessageStatus")
        
        if message_sid and message_status:
            status_map = {
                "delivered": "delivered",
                "failed": "failed",
                "undelivered": "failed",
                "sent": "sent"
            }
            
            status = status_map.get(message_status)
            if status:
                notification_service.update_delivery_status(
                    db=db,
                    external_id=message_sid,
                    status=status,
                    delivered_at=datetime.utcnow() if status == "delivered" else None
                )
        
        return {"success": True}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Webhook processing failed: {str(e)}")