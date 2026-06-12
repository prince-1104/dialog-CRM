from celery import Celery
from app.config import settings

celery_app = Celery(
    "dialog_crm",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    imports=[
        "app.tasks.webhook_tasks",
        "app.tasks.campaign_tasks",
        "app.tasks.cleanup_tasks"
    ],
    beat_schedule={
        "cleanup-stale-sessions-and-dedup-every-hour": {
            "task": "app.tasks.cleanup_tasks.cleanup_stale_data",
            "schedule": 3600.0, # hourly
        }
    }
)
