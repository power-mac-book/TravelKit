"""
Notification service for email and WhatsApp notifications
Integrates with SendGrid for email and Twilio for WhatsApp
"""

import os
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from jinja2 import Template
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, From, To, Subject, HtmlContent, PlainTextContent
from twilio.rest import Client
from sqlalchemy.orm import Session
from app.models.models import (
    NotificationTemplate, NotificationLog, NotificationPreference,
    Interest, Group, Destination, Traveler
)

logger = logging.getLogger(__name__)


class NotificationService:
    def __init__(self):
        self.sendgrid_client = None
        self.twilio_client = None
        self._init_sendgrid()
        self._init_twilio()
    
    def _init_sendgrid(self):
        """Initialize SendGrid client"""
        api_key = os.getenv("SENDGRID_API_KEY")
        if api_key:
            self.sendgrid_client = SendGridAPIClient(api_key=api_key)
            logger.info("SendGrid client initialized")
        else:
            logger.warning("SendGrid API key not found. Email notifications disabled.")
    
    def _init_twilio(self):
        """Initialize Twilio client"""
        account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        if account_sid and auth_token:
            self.twilio_client = Client(account_sid, auth_token)
            logger.info("Twilio client initialized")
        else:
            logger.warning("Twilio credentials not found. WhatsApp notifications disabled.")
    
    def send_notification(
        self, 
        db: Session,
        template_name: str,
        recipient_email: Optional[str] = None,
        recipient_phone: Optional[str] = None,
        template_data: Dict[str, Any] = None,
        notification_type: str = "both",  # email, whatsapp, both
        interest_id: Optional[int] = None,
        group_id: Optional[int] = None,
        user_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Send notification using specified template
        
        Args:
            db: Database session
            template_name: Name of the notification template
            recipient_email: Email address (if email notification)
            recipient_phone: Phone number (if WhatsApp notification)
            template_data: Data to populate template variables
            notification_type: Type of notification (email, whatsapp, both)
            interest_id: Related interest ID
            group_id: Related group ID
            user_id: Related user ID
        
        Returns:
            Dict with status and results
        """
        if template_data is None:
            template_data = {}
        
        # Get notification template
        template = db.query(NotificationTemplate).filter(
            NotificationTemplate.name == template_name,
            NotificationTemplate.is_active == True
        ).first()
        
        if not template:
            logger.error(f"Notification template '{template_name}' not found")
            return {"success": False, "error": "Template not found"}
        
        # Check user preferences
        if recipient_email:
            preferences = self._get_user_preferences(db, recipient_email)
            if not self._should_send_notification(preferences, template_name, notification_type):
                logger.info(f"Notification blocked by user preferences: {recipient_email}")
                return {"success": False, "error": "Blocked by user preferences"}
        
        results = {"email": None, "whatsapp": None}
        
        # Send email notification
        if notification_type in ["email", "both"] and recipient_email and template.email_template:
            email_result = self._send_email(db, template, recipient_email, template_data,
                                          interest_id, group_id, user_id)
            results["email"] = email_result
        
        # Send WhatsApp notification
        if notification_type in ["whatsapp", "both"] and recipient_phone and template.whatsapp_template:
            whatsapp_result = self._send_whatsapp(db, template, recipient_phone, template_data,
                                                interest_id, group_id, user_id)
            results["whatsapp"] = whatsapp_result
        
        return {"success": True, "results": results}
    
    def _send_email(
        self,
        db: Session,
        template: NotificationTemplate,
        recipient_email: str,
        template_data: Dict[str, Any],
        interest_id: Optional[int] = None,
        group_id: Optional[int] = None,
        user_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Send email notification"""
        try:
            # Render email content
            subject_template = Template(template.subject)
            content_template = Template(template.email_template)
            
            subject = subject_template.render(**template_data)
            html_content = content_template.render(**template_data)
            
            # Create notification log entry
            log_entry = NotificationLog(
                template_id=template.id,
                recipient_email=recipient_email,
                notification_type="email",
                status="pending",
                subject=subject,
                message_content=html_content,
                interest_id=interest_id,
                group_id=group_id,
                user_id=user_id
            )
            db.add(log_entry)
            db.commit()
            
            if not self.sendgrid_client:
                log_entry.status = "failed"
                log_entry.error_message = "SendGrid not configured"
                db.commit()
                return {"success": False, "error": "SendGrid not configured"}
            
            # Send email via SendGrid
            from_email = From(os.getenv("FROM_EMAIL", "noreply@travelkit.com"), "TravelKit")
            to_email = To(recipient_email)
            
            mail = Mail(
                from_email=from_email,
                to_emails=to_email,
                subject=Subject(subject),
                html_content=HtmlContent(html_content)
            )
            
            response = self.sendgrid_client.send(mail)
            
            # Update log entry
            log_entry.status = "sent"
            log_entry.external_id = response.headers.get("X-Message-Id")
            log_entry.sent_at = datetime.utcnow()
            db.commit()
            
            logger.info(f"Email sent to {recipient_email}: {subject}")
            return {"success": True, "message_id": log_entry.external_id}
            
        except Exception as e:
            logger.error(f"Failed to send email to {recipient_email}: {e}")
            if 'log_entry' in locals():
                log_entry.status = "failed"
                log_entry.error_message = str(e)
                db.commit()
            return {"success": False, "error": str(e)}
    
    def _send_whatsapp(
        self,
        db: Session,
        template: NotificationTemplate,
        recipient_phone: str,
        template_data: Dict[str, Any],
        interest_id: Optional[int] = None,
        group_id: Optional[int] = None,
        user_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Send WhatsApp notification"""
        try:
            # Render WhatsApp content
            content_template = Template(template.whatsapp_template)
            message_content = content_template.render(**template_data)
            
            # Create notification log entry
            log_entry = NotificationLog(
                template_id=template.id,
                recipient_phone=recipient_phone,
                notification_type="whatsapp",
                status="pending",
                subject=template.subject,
                message_content=message_content,
                interest_id=interest_id,
                group_id=group_id,
                user_id=user_id
            )
            db.add(log_entry)
            db.commit()
            
            if not self.twilio_client:
                log_entry.status = "failed"
                log_entry.error_message = "Twilio not configured"
                db.commit()
                return {"success": False, "error": "Twilio not configured"}
            
            # Send WhatsApp message via Twilio
            from_whatsapp = os.getenv("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")
            to_whatsapp = f"whatsapp:{recipient_phone}"
            
            message = self.twilio_client.messages.create(
                body=message_content,
                from_=from_whatsapp,
                to=to_whatsapp
            )
            
            # Update log entry
            log_entry.status = "sent"
            log_entry.external_id = message.sid
            log_entry.sent_at = datetime.utcnow()
            db.commit()
            
            logger.info(f"WhatsApp sent to {recipient_phone}: {template.subject}")
            return {"success": True, "message_id": message.sid}
            
        except Exception as e:
            logger.error(f"Failed to send WhatsApp to {recipient_phone}: {e}")
            if 'log_entry' in locals():
                log_entry.status = "failed"
                log_entry.error_message = str(e)
                db.commit()
            return {"success": False, "error": str(e)}
    
    def _get_user_preferences(self, db: Session, email: str) -> Optional[NotificationPreference]:
        """Get user notification preferences"""
        return db.query(NotificationPreference).filter(
            NotificationPreference.user_email == email
        ).first()
    
    def _should_send_notification(
        self, 
        preferences: Optional[NotificationPreference], 
        template_name: str, 
        notification_type: str
    ) -> bool:
        """Check if notification should be sent based on user preferences"""
        if not preferences:
            return True  # Default: allow notifications if no preferences set
        
        # Check global notification type preference
        if notification_type == "email" and not preferences.email_enabled:
            return False
        if notification_type == "whatsapp" and not preferences.whatsapp_enabled:
            return False
        
        # Check specific notification category preferences
        category_map = {
            "interest_confirmation": preferences.interest_confirmations,
            "group_match": preferences.group_matches,
            "pricing_update": preferences.pricing_updates,
            "marketing": preferences.marketing_messages,
            "follow_up": preferences.follow_up_sequences,
        }
        
        for category, enabled in category_map.items():
            if category in template_name and not enabled:
                return False
        
        return True
    
    def send_bulk_notification(
        self,
        db: Session,
        template_name: str,
        recipients: List[Dict[str, Any]],
        template_data: Dict[str, Any] = None,
        notification_type: str = "both"
    ) -> Dict[str, Any]:
        """
        Send bulk notifications to multiple recipients
        
        Args:
            db: Database session
            template_name: Name of the notification template
            recipients: List of recipient dictionaries with email/phone/data
            template_data: Common template data for all recipients
            notification_type: Type of notification (email, whatsapp, both)
        
        Returns:
            Dict with summary of results
        """
        if template_data is None:
            template_data = {}
        
        results = {"sent": 0, "failed": 0, "errors": []}
        
        for recipient in recipients:
            recipient_data = {**template_data, **recipient.get("data", {})}
            
            result = self.send_notification(
                db=db,
                template_name=template_name,
                recipient_email=recipient.get("email"),
                recipient_phone=recipient.get("phone"),
                template_data=recipient_data,
                notification_type=notification_type,
                interest_id=recipient.get("interest_id"),
                group_id=recipient.get("group_id"),
                user_id=recipient.get("user_id")
            )
            
            if result["success"]:
                results["sent"] += 1
            else:
                results["failed"] += 1
                results["errors"].append({
                    "recipient": recipient.get("email") or recipient.get("phone"),
                    "error": result.get("error")
                })
        
        return results

    def send_document_upload_notification(
        self,
        db: Session,
        traveler: Traveler,
        document_name: str,
        document_category: str,
        admin_name: str = "Admin"
    ) -> Dict[str, Any]:
        """Send notification when admin uploads a document for traveler"""
        
        template_data = {
            "traveler_name": traveler.name or traveler.email,
            "document_name": document_name,
            "document_category": document_category.replace("_", " ").title(),
            "admin_name": admin_name,
            "upload_date": datetime.utcnow().strftime("%B %d, %Y"),
            "dashboard_url": f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/traveler/documents"
        }
        
        return self.send_notification(
            db=db,
            template_name="document_upload",
            recipient_email=traveler.email,
            recipient_phone=traveler.phone,
            template_data=template_data,
            notification_type="both",
            user_id=traveler.id
        )
    
    def get_notification_status(self, db: Session, log_id: int) -> Optional[NotificationLog]:
        """Get notification status by log ID"""
        return db.query(NotificationLog).filter(NotificationLog.id == log_id).first()
    
    def update_delivery_status(
        self, 
        db: Session, 
        external_id: str, 
        status: str, 
        delivered_at: Optional[datetime] = None
    ):
        """Update notification delivery status (for webhooks)"""
        log_entry = db.query(NotificationLog).filter(
            NotificationLog.external_id == external_id
        ).first()
        
        if log_entry:
            log_entry.status = status
            if delivered_at:
                log_entry.delivered_at = delivered_at
            db.commit()
            logger.info(f"Updated notification {external_id} status to {status}")


# Global notification service instance
notification_service = NotificationService()