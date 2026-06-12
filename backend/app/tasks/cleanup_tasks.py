import logging
from app.celery_app import celery_app

logger = logging.getLogger(__name__)

@celery_app.task(name="app.tasks.cleanup_tasks.cleanup_stale_data")
def cleanup_stale_data():
    # In a real environment, this might query the database and delete tokens/dedup entries,
    # or clear Redis keys. For now, we log the heartbeat operation.
    logger.info("Stale data cleanup task executed successfully.")
    return True
