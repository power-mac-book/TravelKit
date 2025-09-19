from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "travelkit",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks"]
)

# Configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    result_expires=3600,
    worker_prefetch_multiplier=1,  # Better for ML tasks
    task_time_limit=600,  # 10 minutes timeout for clustering tasks
    task_soft_time_limit=480,  # 8 minutes soft timeout
    beat_schedule={
        "cluster-interests": {
            "task": "app.tasks.cluster_interests",
            "schedule": 3600.0,  # Run every hour
            "options": {
                "queue": "clustering",  # Dedicated queue for heavy tasks
                "priority": 5  # Medium priority
            }
        },
        "generate-social-proof": {
            "task": "app.tasks.generate_social_proof_messages",
            "schedule": 7200.0,  # Run every 2 hours
            "options": {
                "queue": "default",
                "priority": 3  # Lower priority
            }
        },
        "update-analytics": {
            "task": "app.tasks.update_analytics",
            "schedule": 86400.0,  # Run daily
            "options": {
                "queue": "analytics",
                "priority": 2  # Lowest priority
            }
        },
        "optimize-existing-groups": {
            "task": "app.tasks.optimize_existing_groups",
            "schedule": 14400.0,  # Run every 4 hours
            "options": {
                "queue": "clustering",
                "priority": 4
            }
        },
        "auto-confirm-groups": {
            "task": "app.tasks.auto_confirm_groups",
            "schedule": 1800.0,  # Run every 30 minutes
            "options": {
                "queue": "workflow",
                "priority": 6  # High priority for time-sensitive operations
            }
        },
        "cleanup-expired-confirmations": {
            "task": "app.tasks.cleanup_expired_confirmations", 
            "schedule": 3600.0,  # Run every hour
            "options": {
                "queue": "workflow",
                "priority": 4
            }
        },
    },
    task_routes={
        'app.tasks.cluster_interests': {'queue': 'clustering'},
        'app.tasks.send_group_formation_notification': {'queue': 'notifications'},
        'app.tasks.send_group_reminder_notification': {'queue': 'notifications'},
        'app.tasks.optimize_existing_groups': {'queue': 'clustering'},
        'app.tasks.check_group_confirmation_deadline': {'queue': 'workflow'},
        'app.tasks.finalize_group_formation': {'queue': 'workflow'},
        'app.tasks.process_payment_webhook': {'queue': 'payments'},
        'app.tasks.auto_confirm_groups': {'queue': 'workflow'},
        'app.tasks.cleanup_expired_confirmations': {'queue': 'workflow'},
    }
)