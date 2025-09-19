"""
Payment Service for TravelKit

Handles payment processing, refunds, and payment intent management.
Currently implements a mock payment service that can be easily replaced with actual payment providers.
"""

from typing import Dict, Any, Optional
from datetime import datetime
import logging
import uuid

logger = logging.getLogger(__name__)


class PaymentService:
    """
    Payment service abstraction that can be implemented with various providers
    (Stripe, Razorpay, PayPal, etc.)
    
    For demo purposes, this is a mock implementation.
    In production, this would integrate with actual payment providers.
    """
    
    def __init__(self, provider: str = "stripe", api_key: Optional[str] = None):
        self.provider = provider
        self.api_key = api_key
        self.mock_mode = True  # Set to False for production
        
    def create_payment_intent(self, amount: float, currency: str = "USD", 
                             metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """Create a payment intent for the specified amount"""
        try:
            if self.mock_mode:
                # Mock payment intent creation
                payment_intent_id = f"pi_mock_{uuid.uuid4().hex[:12]}"
                
                return {
                    'id': payment_intent_id,
                    'amount': amount,
                    'currency': currency,
                    'status': 'requires_payment_method',
                    'client_secret': f"{payment_intent_id}_secret_{uuid.uuid4().hex[:8]}",
                    'metadata': metadata or {},
                    'created_at': datetime.utcnow().isoformat()
                }
            else:
                # Real payment provider integration would go here
                # Example for Stripe:
                # import stripe
                # stripe.api_key = self.api_key
                # intent = stripe.PaymentIntent.create(
                #     amount=int(amount * 100),  # Stripe uses cents
                #     currency=currency,
                #     metadata=metadata
                # )
                # return intent
                pass
                
        except Exception as e:
            logger.error(f"Error creating payment intent: {e}")
            raise
    
    def process_payment(self, payment_intent_id: str, amount: float, 
                       currency: str = "USD", metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """Process a payment for the given payment intent"""
        try:
            if self.mock_mode:
                # Mock payment processing
                transaction_id = f"txn_mock_{uuid.uuid4().hex[:12]}"
                
                # Simulate different payment outcomes
                import random
                success_rate = 0.95  # 95% success rate for demo
                
                if random.random() < success_rate:
                    return {
                        'status': 'succeeded',
                        'transaction_id': transaction_id,
                        'amount': amount,
                        'currency': currency,
                        'payment_intent_id': payment_intent_id,
                        'processed_at': datetime.utcnow().isoformat(),
                        'payment_method': 'card',
                        'provider_fee': round(amount * 0.029 + 0.30, 2),  # Typical payment processor fee
                        'net_amount': round(amount - (amount * 0.029 + 0.30), 2),
                        'metadata': metadata or {}
                    }
                else:
                    return {
                        'status': 'failed',
                        'transaction_id': transaction_id,
                        'payment_intent_id': payment_intent_id,
                        'failure_code': 'card_declined',
                        'failure_message': 'Your card was declined. Please try again with a different payment method.',
                        'processed_at': datetime.utcnow().isoformat()
                    }
            else:
                # Real payment processing would go here
                pass
                
        except Exception as e:
            logger.error(f"Error processing payment: {e}")
            return {
                'status': 'error',
                'error_message': str(e),
                'processed_at': datetime.utcnow().isoformat()
            }
    
    def process_refund(self, transaction_id: str, amount: float, 
                      reason: str = "Requested by customer") -> Dict[str, Any]:
        """Process a refund for the given transaction"""
        try:
            if self.mock_mode:
                # Mock refund processing
                refund_id = f"re_mock_{uuid.uuid4().hex[:12]}"
                
                return {
                    'status': 'succeeded',
                    'refund_id': refund_id,
                    'transaction_id': transaction_id,
                    'amount': amount,
                    'reason': reason,
                    'processed_at': datetime.utcnow().isoformat(),
                    'estimated_arrival': (datetime.utcnow().timestamp() + (3 * 24 * 60 * 60))  # 3 days
                }
            else:
                # Real refund processing would go here
                # Example for Stripe:
                # import stripe
                # refund = stripe.Refund.create(
                #     payment_intent=transaction_id,
                #     amount=int(amount * 100),
                #     reason=reason
                # )
                # return refund
                pass
                
        except Exception as e:
            logger.error(f"Error processing refund: {e}")
            return {
                'status': 'failed',
                'error_message': str(e),
                'processed_at': datetime.utcnow().isoformat()
            }
    
    def get_payment_status(self, payment_intent_id: str) -> Dict[str, Any]:
        """Get the current status of a payment intent"""
        try:
            if self.mock_mode:
                # Mock payment status retrieval
                return {
                    'id': payment_intent_id,
                    'status': 'succeeded',  # or 'processing', 'failed', etc.
                    'last_updated': datetime.utcnow().isoformat()
                }
            else:
                # Real payment status retrieval would go here
                pass
                
        except Exception as e:
            logger.error(f"Error getting payment status: {e}")
            raise
    
    def calculate_fees(self, amount: float) -> Dict[str, float]:
        """Calculate payment processing fees"""
        if self.provider == "stripe":
            # Stripe: 2.9% + $0.30 per transaction
            percentage_fee = amount * 0.029
            fixed_fee = 0.30
            total_fee = percentage_fee + fixed_fee
        elif self.provider == "razorpay":
            # Razorpay: ~2% for domestic cards
            percentage_fee = amount * 0.02
            fixed_fee = 0.0
            total_fee = percentage_fee + fixed_fee
        else:
            # Default generic fee structure
            percentage_fee = amount * 0.025
            fixed_fee = 0.25
            total_fee = percentage_fee + fixed_fee
        
        return {
            'percentage_fee': round(percentage_fee, 2),
            'fixed_fee': round(fixed_fee, 2),
            'total_fee': round(total_fee, 2),
            'net_amount': round(amount - total_fee, 2)
        }
    
    def create_checkout_session(self, items: list, success_url: str, 
                               cancel_url: str, metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """Create a checkout session for hosted payment flow"""
        try:
            if self.mock_mode:
                # Mock checkout session creation
                session_id = f"cs_mock_{uuid.uuid4().hex[:16]}"
                
                return {
                    'id': session_id,
                    'url': f"https://checkout.mock-payment.com/pay/{session_id}",
                    'success_url': success_url,
                    'cancel_url': cancel_url,
                    'items': items,
                    'total_amount': sum(item['amount'] for item in items),
                    'metadata': metadata or {},
                    'created_at': datetime.utcnow().isoformat()
                }
            else:
                # Real checkout session creation would go here
                # Example for Stripe:
                # import stripe
                # session = stripe.checkout.Session.create(
                #     payment_method_types=['card'],
                #     line_items=items,
                #     mode='payment',
                #     success_url=success_url,
                #     cancel_url=cancel_url,
                #     metadata=metadata
                # )
                # return session
                pass
                
        except Exception as e:
            logger.error(f"Error creating checkout session: {e}")
            raise
    
    def verify_webhook_signature(self, payload: str, signature: str, endpoint_secret: str) -> bool:
        """Verify webhook signature for security"""
        try:
            if self.mock_mode:
                # Mock signature verification (always returns True for demo)
                return True
            else:
                # Real signature verification would go here
                # Example for Stripe:
                # import stripe
                # try:
                #     event = stripe.Webhook.construct_event(
                #         payload, signature, endpoint_secret
                #     )
                #     return True
                # except ValueError:
                #     return False
                # except stripe.error.SignatureVerificationError:
                #     return False
                pass
                
        except Exception as e:
            logger.error(f"Error verifying webhook signature: {e}")
            return False


# Singleton instance for easy access
payment_service = PaymentService()


class PaymentError(Exception):
    """Custom exception for payment-related errors"""
    def __init__(self, message: str, error_code: str = None, details: Dict[str, Any] = None):
        super().__init__(message)
        self.error_code = error_code
        self.details = details or {}


class RefundError(Exception):
    """Custom exception for refund-related errors"""
    def __init__(self, message: str, error_code: str = None, details: Dict[str, Any] = None):
        super().__init__(message)
        self.error_code = error_code
        self.details = details or {}