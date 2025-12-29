"""
Celery tasks package.
"""

from celery import Celery

celery = Celery('student_coaching')


def init_celery(app):
    """Initialize Celery with Flask app context."""
    celery.conf.update(
        broker_url=app.config.get('CELERY_BROKER_URL', 'redis://localhost:6379/0'),
        result_backend=app.config.get('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0'),
        task_serializer='json',
        accept_content=['json'],
        result_serializer='json',
        timezone='UTC',
        enable_utc=True,
        task_track_started=True,
        task_time_limit=30 * 60,  # 30 minutes
        worker_prefetch_multiplier=1,
        task_acks_late=True,
    )
    
    class ContextTask(celery.Task):
        """Custom task class that runs within Flask app context."""
        
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)
    
    celery.Task = ContextTask
    
    # Auto-discover tasks
    celery.autodiscover_tasks(['app.tasks'])
    
    return celery


# Import tasks for auto-discovery
from app.tasks.email_tasks import *
from app.tasks.video_tasks import *
from app.tasks.report_tasks import *
from app.tasks.ai_tasks import *
