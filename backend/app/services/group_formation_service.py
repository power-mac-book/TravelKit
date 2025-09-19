"""
Comprehensive Group Formation Workflow Service

Handles the complete lifecycle of group formation from clustering to confirmed booking:
1. Group Creation (from clustering)
2. Member Notification & Confirmation 
3. Payment Collection
4. Group Finalization
5. Trip Coordination
"""

from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
import logging

from app.models.models import Group, Interest, Destination, GroupMemberConfirmation, PaymentTransaction
from app.core.database import SessionLocal
from app.services.notification_service import NotificationService
from app.services.payment_service import PaymentService
from app.core.clustering_config import get_clustering_config

logger = logging.getLogger(__name__)


class GroupFormationWorkflow:
    """Manages the complete group formation and confirmation workflow"""
    
    def __init__(self, db: Session):
        self.db = db
        self.notification_service = NotificationService(db)
        self.payment_service = PaymentService()
        
    # ===== GROUP LIFECYCLE MANAGEMENT =====
    
    def initiate_group_formation(self, group_id: int) -> Dict[str, Any]:
        """Start the group formation process after clustering creates a group"""
        try:
            group = self.db.query(Group).filter(Group.id == group_id).first()
            if not group:
                raise ValueError(f"Group {group_id} not found")
            
            # Create member confirmation records
            self._create_member_confirmations(group)
            
            # Send initial group formation notifications
            self._send_group_formation_notifications(group)
            
            # Schedule follow-up workflows
            self._schedule_group_lifecycle_tasks(group)
            
            # Update group status
            group.status = 'pending_confirmation'
            group.confirmation_deadline = datetime.utcnow() + timedelta(
                days=get_clustering_config('notifications.confirmation_deadline_days')
            )
            
            self.db.commit()
            
            logger.info(f"Initiated group formation workflow for group {group_id}")
            
            return {
                'group_id': group_id,
                'status': 'formation_initiated',
                'confirmation_deadline': group.confirmation_deadline.isoformat(),
                'members_notified': group.current_size,
                'next_steps': ['member_confirmations', 'payment_collection']
            }
            
        except Exception as e:
            logger.error(f"Error initiating group formation for {group_id}: {e}")
            self.db.rollback()
            raise

    def process_member_confirmation(self, group_id: int, interest_id: int, 
                                   confirmed: bool, payment_intent_id: Optional[str] = None) -> Dict[str, Any]:
        """Process a member's confirmation or declination"""
        try:
            confirmation = self.db.query(GroupMemberConfirmation).filter(
                and_(
                    GroupMemberConfirmation.group_id == group_id,
                    GroupMemberConfirmation.interest_id == interest_id
                )
            ).first()
            
            if not confirmation:
                raise ValueError(f"Confirmation record not found for group {group_id}, interest {interest_id}")
            
            # Update confirmation status
            confirmation.confirmed = confirmed
            confirmation.confirmed_at = datetime.utcnow()
            confirmation.payment_intent_id = payment_intent_id
            
            # Update interest status
            interest = self.db.query(Interest).filter(Interest.id == interest_id).first()
            if confirmed:
                interest.status = 'confirmed'
                confirmation.status = 'confirmed'
                
                # Process payment if provided
                if payment_intent_id:
                    self._process_member_payment(confirmation, payment_intent_id)
                    
            else:
                interest.status = 'declined'
                confirmation.status = 'declined'
                
            self.db.commit()
            
            # Check if group should be finalized or modified
            group_status = self._evaluate_group_status(group_id)
            
            return {
                'confirmation_id': confirmation.id,
                'group_id': group_id,
                'interest_id': interest_id,
                'confirmed': confirmed,
                'group_status': group_status,
                'next_action': self._determine_next_action(group_id)
            }
            
        except Exception as e:
            logger.error(f"Error processing member confirmation: {e}")
            self.db.rollback()
            raise

    def finalize_group_formation(self, group_id: int, force: bool = False) -> Dict[str, Any]:
        """Finalize group formation and proceed to confirmed status"""
        try:
            group = self.db.query(Group).filter(Group.id == group_id).first()
            if not group:
                raise ValueError(f"Group {group_id} not found")
            
            confirmations = self.db.query(GroupMemberConfirmation).filter(
                GroupMemberConfirmation.group_id == group_id
            ).all()
            
            confirmed_count = sum(1 for c in confirmations if c.confirmed)
            declined_count = sum(1 for c in confirmations if c.confirmed == False)
            pending_count = sum(1 for c in confirmations if c.confirmed is None)
            
            # Check if group meets finalization criteria
            can_finalize = (
                confirmed_count >= group.min_size and
                (pending_count == 0 or force or datetime.utcnow() > group.confirmation_deadline)
            )
            
            if not can_finalize and not force:
                return {
                    'group_id': group_id,
                    'status': 'cannot_finalize',
                    'reason': 'Insufficient confirmations or pending members',
                    'confirmed_count': confirmed_count,
                    'required_count': group.min_size,
                    'pending_count': pending_count
                }
            
            # Update group with confirmed members only
            confirmed_members = [c for c in confirmations if c.confirmed]
            group.current_size = len(confirmed_members)
            
            if group.current_size >= group.min_size:
                group.status = 'confirmed'
                
                # Recalculate pricing with final member count
                self._recalculate_group_pricing(group)
                
                # Send confirmation notifications
                self._send_group_confirmation_notifications(group, confirmed_members)
                
                # Handle declined/non-responsive members
                self._handle_declined_members(group_id, confirmations)
                
                # Initialize trip coordination
                self._initialize_trip_coordination(group)
                
                result_status = 'finalized_confirmed'
                
            else:
                group.status = 'cancelled_insufficient_members'
                
                # Refund payments if any
                self._process_group_cancellation_refunds(group_id)
                
                # Send cancellation notifications
                self._send_group_cancellation_notifications(group, confirmations)
                
                result_status = 'finalized_cancelled'
            
            self.db.commit()
            
            logger.info(f"Finalized group {group_id}: {result_status}")
            
            return {
                'group_id': group_id,
                'status': result_status,
                'final_size': group.current_size,
                'confirmed_members': len(confirmed_members),
                'declined_members': declined_count,
                'group_status': group.status
            }
            
        except Exception as e:
            logger.error(f"Error finalizing group {group_id}: {e}")
            self.db.rollback()
            raise

    # ===== HELPER METHODS =====
    
    def _create_member_confirmations(self, group: Group):
        """Create confirmation records for all group members"""
        members = self.db.query(Interest).filter(Interest.group_id == group.id).all()
        
        for member in members:
            confirmation = GroupMemberConfirmation(
                group_id=group.id,
                interest_id=member.id,
                traveler_id=member.user_id,
                confirmation_token=self._generate_confirmation_token(),
                created_at=datetime.utcnow(),
                expires_at=datetime.utcnow() + timedelta(
                    days=get_clustering_config('notifications.confirmation_deadline_days')
                )
            )
            self.db.add(confirmation)
            
        self.db.flush()  # Ensure IDs are generated

    def _send_group_formation_notifications(self, group: Group):
        """Send notifications to all group members about group formation"""
        confirmations = self.db.query(GroupMemberConfirmation).filter(
            GroupMemberConfirmation.group_id == group.id
        ).all()
        
        for confirmation in confirmations:
            interest = self.db.query(Interest).filter(Interest.id == confirmation.interest_id).first()
            
            # Calculate member-specific details
            member_cost = group.final_price_per_person * interest.num_people
            savings = (group.base_price - group.final_price_per_person) * interest.num_people
            
            notification_data = {
                'group_name': group.name,
                'destination_name': group.destination.name,
                'travel_dates': f"{group.date_from.strftime('%B %d')} - {group.date_to.strftime('%B %d, %Y')}",
                'group_size': group.current_size,
                'member_cost': member_cost,
                'savings_amount': savings,
                'confirmation_deadline': group.confirmation_deadline.strftime('%B %d, %Y'),
                'confirmation_link': f"/groups/{group.id}/confirm/{confirmation.confirmation_token}",
                'user_name': interest.user_name,
                'user_email': interest.user_email
            }
            
            # Send email and SMS notifications
            self.notification_service.send_notification(
                template_name='group_formation',
                recipient_email=interest.user_email,
                recipient_phone=interest.user_phone,
                template_data=notification_data,
                notification_type='both'
            )

    def _evaluate_group_status(self, group_id: int) -> Dict[str, Any]:
        """Evaluate current group status based on confirmations"""
        confirmations = self.db.query(GroupMemberConfirmation).filter(
            GroupMemberConfirmation.group_id == group_id
        ).all()
        
        confirmed_count = sum(1 for c in confirmations if c.confirmed)
        declined_count = sum(1 for c in confirmations if c.confirmed == False)
        pending_count = sum(1 for c in confirmations if c.confirmed is None)
        
        group = self.db.query(Group).filter(Group.id == group_id).first()
        
        return {
            'total_members': len(confirmations),
            'confirmed_count': confirmed_count,
            'declined_count': declined_count,
            'pending_count': pending_count,
            'min_size_met': confirmed_count >= group.min_size,
            'deadline_passed': datetime.utcnow() > group.confirmation_deadline,
            'can_proceed': confirmed_count >= group.min_size and pending_count <= 2
        }

    def _determine_next_action(self, group_id: int) -> str:
        """Determine the next action needed for group formation"""
        status = self._evaluate_group_status(group_id)
        
        if status['deadline_passed']:
            if status['min_size_met']:
                return 'finalize_group'
            else:
                return 'cancel_group_insufficient_members'
        elif status['can_proceed']:
            return 'prepare_for_finalization'
        elif status['pending_count'] > 0:
            return 'wait_for_confirmations'
        else:
            return 'evaluate_group_viability'

    def _recalculate_group_pricing(self, group: Group):
        """Recalculate group pricing based on final member count"""
        # Import pricing calculation from clustering config
        pricing_config = get_clustering_config('pricing')
        
        # Apply tiered discount based on final size
        discount_rate = 0.0
        for tier in pricing_config['discount_tiers']:
            if group.current_size >= tier['min_size']:
                discount_rate = tier['discount']
        
        # Apply maximum discount limit
        discount_rate = min(discount_rate, pricing_config['max_discount'])
        
        # Calculate final pricing
        group.final_price_per_person = group.base_price * (1 - discount_rate)
        
        # Update pricing calculation details
        group.price_calc.update({
            'final_calculation': {
                'final_member_count': group.current_size,
                'applied_discount': discount_rate,
                'final_price': group.final_price_per_person,
                'recalculated_at': datetime.utcnow().isoformat()
            }
        })

    def _generate_confirmation_token(self) -> str:
        """Generate a unique confirmation token"""
        import secrets
        return secrets.token_urlsafe(32)

    def _process_member_payment(self, confirmation: GroupMemberConfirmation, payment_intent_id: str):
        """Process payment for a confirmed member"""
        try:
            # This would integrate with actual payment service (Stripe, etc.)
            payment_result = self.payment_service.process_payment(
                payment_intent_id=payment_intent_id,
                amount=confirmation.amount_due,
                currency='USD',
                metadata={
                    'group_id': confirmation.group_id,
                    'interest_id': confirmation.interest_id,
                    'confirmation_id': confirmation.id
                }
            )
            
            if payment_result['status'] == 'succeeded':
                confirmation.payment_status = 'paid'
                confirmation.payment_transaction_id = payment_result['transaction_id']
            else:
                confirmation.payment_status = 'failed'
                logger.error(f"Payment failed for confirmation {confirmation.id}: {payment_result}")
                
        except Exception as e:
            logger.error(f"Error processing payment for confirmation {confirmation.id}: {e}")
            confirmation.payment_status = 'error'

    def _schedule_group_lifecycle_tasks(self, group: Group):
        """Schedule automated tasks for group lifecycle management"""
        from app.tasks import (
            send_group_reminder_notification,
            check_group_confirmation_deadline,
            finalize_group_formation
        )
        
        # Schedule reminder notifications
        reminder_time = group.confirmation_deadline - timedelta(days=2)
        send_group_reminder_notification.apply_async(
            args=[group.id],
            eta=reminder_time
        )
        
        # Schedule deadline check
        deadline_check_time = group.confirmation_deadline + timedelta(hours=1)
        check_group_confirmation_deadline.apply_async(
            args=[group.id],
            eta=deadline_check_time
        )
        
        # Schedule automatic finalization if criteria met
        auto_finalize_time = group.confirmation_deadline + timedelta(hours=6)
        finalize_group_formation.apply_async(
            args=[group.id, False],  # force=False
            eta=auto_finalize_time
        )

    def _send_group_confirmation_notifications(self, group: Group, confirmed_members: List):
        """Send final confirmation notifications to confirmed members"""
        for confirmation in confirmed_members:
            interest = self.db.query(Interest).filter(Interest.id == confirmation.interest_id).first()
            
            notification_data = {
                'group_name': group.name,
                'destination_name': group.destination.name,
                'travel_dates': f"{group.date_from.strftime('%B %d')} - {group.date_to.strftime('%B %d, %Y')}",
                'final_group_size': group.current_size,
                'final_price': group.final_price_per_person,
                'user_name': interest.user_name,
                'trip_coordinator_contact': 'coordinator@travelkit.com',  # This would be dynamic
                'next_steps': 'You will receive detailed itinerary and coordinator contact within 24 hours.'
            }
            
            self.notification_service.send_notification(
                template_name='group_confirmed',
                recipient_email=interest.user_email,
                recipient_phone=interest.user_phone,
                template_data=notification_data,
                notification_type='both'
            )

    def _handle_declined_members(self, group_id: int, confirmations: List):
        """Handle members who declined or didn't respond"""
        declined_confirmations = [c for c in confirmations if c.confirmed == False or 
                                 (c.confirmed is None and datetime.utcnow() > c.expires_at)]
        
        for confirmation in declined_confirmations:
            interest = self.db.query(Interest).filter(Interest.id == confirmation.interest_id).first()
            
            # Reset interest to open status for future clustering
            interest.status = 'open'
            interest.group_id = None
            
            # Send appropriate notification
            if confirmation.confirmed == False:
                template_name = 'group_declined_confirmation'
            else:
                template_name = 'group_missed_deadline'
            
            self.notification_service.send_notification(
                template_name=template_name,
                recipient_email=interest.user_email,
                template_data={
                    'user_name': interest.user_name,
                    'group_name': self.db.query(Group).filter(Group.id == group_id).first().name,
                    'alternative_options_link': '/destinations'
                }
            )

    def _initialize_trip_coordination(self, group: Group):
        """Initialize trip coordination workflow for confirmed group"""
        # This would integrate with trip coordination systems
        coordination_data = {
            'group_id': group.id,
            'destination_id': group.destination_id,
            'travel_dates': {
                'start': group.date_from.isoformat(),
                'end': group.date_to.isoformat()
            },
            'group_size': group.current_size,
            'coordinator_assigned': False,
            'itinerary_created': False,
            'accommodations_booked': False
        }
        
        # This would trigger trip planning workflow
        logger.info(f"Trip coordination initialized for group {group.id}")
        
    def _send_group_cancellation_notifications(self, group: Group, confirmations: List):
        """Send cancellation notifications to all members"""
        for confirmation in confirmations:
            interest = self.db.query(Interest).filter(Interest.id == confirmation.interest_id).first()
            
            self.notification_service.send_notification(
                template_name='group_cancelled',
                recipient_email=interest.user_email,
                template_data={
                    'user_name': interest.user_name,
                    'group_name': group.name,
                    'destination_name': group.destination.name,
                    'cancellation_reason': 'Insufficient member confirmations',
                    'refund_info': 'Any payments will be refunded within 3-5 business days',
                    'alternative_options_link': '/destinations'
                }
            )

    def _process_group_cancellation_refunds(self, group_id: int):
        """Process refunds for cancelled group"""
        confirmations = self.db.query(GroupMemberConfirmation).filter(
            and_(
                GroupMemberConfirmation.group_id == group_id,
                GroupMemberConfirmation.payment_status == 'paid'
            )
        ).all()
        
        for confirmation in confirmations:
            try:
                refund_result = self.payment_service.process_refund(
                    transaction_id=confirmation.payment_transaction_id,
                    amount=confirmation.amount_due,
                    reason='Group cancelled due to insufficient confirmations'
                )
                
                if refund_result['status'] == 'succeeded':
                    confirmation.payment_status = 'refunded'
                    logger.info(f"Refunded payment for confirmation {confirmation.id}")
                else:
                    logger.error(f"Refund failed for confirmation {confirmation.id}: {refund_result}")
                    
            except Exception as e:
                logger.error(f"Error processing refund for confirmation {confirmation.id}: {e}")

    # ===== PUBLIC API METHODS =====
    
    def get_group_formation_status(self, group_id: int) -> Dict[str, Any]:
        """Get comprehensive status of group formation process"""
        group = self.db.query(Group).filter(Group.id == group_id).first()
        if not group:
            raise ValueError(f"Group {group_id} not found")
        
        confirmations = self.db.query(GroupMemberConfirmation).filter(
            GroupMemberConfirmation.group_id == group_id
        ).all()
        
        status = self._evaluate_group_status(group_id)
        
        return {
            'group': {
                'id': group.id,
                'name': group.name,
                'status': group.status,
                'destination': group.destination.name,
                'travel_dates': {
                    'from': group.date_from.isoformat(),
                    'to': group.date_to.isoformat()
                },
                'pricing': {
                    'base_price': group.base_price,
                    'final_price': group.final_price_per_person,
                    'savings': group.base_price - group.final_price_per_person
                },
                'confirmation_deadline': group.confirmation_deadline.isoformat() if group.confirmation_deadline else None
            },
            'formation_status': status,
            'confirmations': [
                {
                    'confirmation_id': c.id,
                    'interest_id': c.interest_id,
                    'confirmed': c.confirmed,
                    'confirmed_at': c.confirmed_at.isoformat() if c.confirmed_at else None,
                    'payment_status': c.payment_status
                }
                for c in confirmations
            ],
            'next_action': self._determine_next_action(group_id)
        }