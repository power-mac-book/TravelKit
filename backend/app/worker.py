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
    beat_schedule={
        "cluster-interests": {
            "task": "app.tasks.cluster_interests",
            "schedule": 3600.0,  # Run every hour
        },
        "generate-social-proof": {
            "task": "app.tasks.generate_social_proof_messages",
            "schedule": 7200.0,  # Run every 2 hours
        },
        "update-analytics": {
            "task": "app.tasks.update_analytics",
            "schedule": 86400.0,  # Run daily
        },
    },
)