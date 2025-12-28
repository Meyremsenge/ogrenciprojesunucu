"""
Celery configuration for optimized task processing.
Supports 10,000+ concurrent users with priority queues.

Production Best Practices:
- Priority queues (high, default, low)
- Rate limiting for external APIs
- Task time limits and retries
- Result backend with TTL
- Scheduled tasks (beat)
"""

import os
from datetime import timedelta
from celery.schedules import crontab


# =============================================================================
# BROKER & BACKEND
# =============================================================================
broker_url = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/1')
result_backend = os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/2')

# Broker transport options
broker_transport_options = {
    'visibility_timeout': 3600,  # 1 hour
    'fanout_prefix': True,
    'fanout_patterns': True,
    'socket_timeout': 30,
    'socket_connect_timeout': 30,
}

# Broker connection retry
broker_connection_retry_on_startup = True

# =============================================================================
# RESULT SETTINGS
# =============================================================================
result_expires = 3600  # Results expire after 1 hour
result_persistent = True
result_extended = True

# =============================================================================
# SERIALIZATION
# =============================================================================
task_serializer = 'json'
result_serializer = 'json'
accept_content = ['json']
timezone = 'Europe/Istanbul'
enable_utc = True

# =============================================================================
# TASK EXECUTION
# =============================================================================
task_acks_late = True  # Acknowledge tasks after they complete
task_reject_on_worker_lost = True  # Re-queue tasks if worker dies
task_time_limit = int(os.getenv('CELERY_TASK_TIME_LIMIT', 1800))  # 30 min hard
task_soft_time_limit = int(os.getenv('CELERY_TASK_SOFT_TIME_LIMIT', 1500))  # 25 min soft

# Retry settings
task_default_retry_delay = 60  # 1 minute
task_max_retries = 3

# =============================================================================
# WORKER SETTINGS
# =============================================================================
worker_prefetch_multiplier = int(os.getenv('CELERY_PREFETCH_MULTIPLIER', 4))
worker_max_tasks_per_child = int(os.getenv('CELERY_MAX_TASKS_PER_CHILD', 1000))
worker_concurrency = int(os.getenv('CELERY_CONCURRENCY', 4))
worker_disable_rate_limits = False

# =============================================================================
# TASK QUEUES (Priority based)
# =============================================================================
task_default_queue = 'default'
task_queues = {
    'high': {
        'exchange': 'high',
        'routing_key': 'high',
    },
    'default': {
        'exchange': 'default',
        'routing_key': 'default',
    },
    'low': {
        'exchange': 'low',
        'routing_key': 'low',
    },
}

# =============================================================================
# TASK ROUTING
# =============================================================================
task_routes = {
    # High priority - notifications and critical tasks
    'app.tasks.email_tasks.send_verification_email': {'queue': 'high'},
    'app.tasks.email_tasks.send_password_reset_email': {'queue': 'high'},
    'app.tasks.email_tasks.send_live_session_reminder': {'queue': 'high'},
    
    # Default priority - regular background tasks
    'app.tasks.video_tasks.*': {'queue': 'default'},
    'app.tasks.email_tasks.send_weekly_summary': {'queue': 'default'},
    
    # Low priority - reports and analytics
    'app.tasks.report_tasks.*': {'queue': 'low'},
    'app.tasks.cleanup_tasks.*': {'queue': 'low'},
}

# =============================================================================
# RATE LIMITING
# =============================================================================
task_annotations = {
    'app.tasks.email_tasks.send_email': {
        'rate_limit': '100/m'  # 100 emails per minute
    },
    'app.tasks.video_tasks.process_video_metadata': {
        'rate_limit': '30/m'  # 30 API calls per minute (YouTube quota)
    },
}

# =============================================================================
# BEAT SCHEDULE (Periodic Tasks)
# =============================================================================
beat_schedule = {
    # =========================================================================
    # HOURLY TASKS
    # =========================================================================
    
    # Cleanup expired tokens
    'cleanup-expired-tokens': {
        'task': 'app.tasks.cleanup_tasks.cleanup_expired_tokens',
        'schedule': timedelta(hours=1),
        'options': {'queue': 'low'}
    },
    
    # Aggregate performance metrics
    'aggregate-performance-metrics': {
        'task': 'app.tasks.cleanup_tasks.aggregate_performance_metrics',
        'schedule': timedelta(hours=1),
        'options': {'queue': 'low'}
    },
    
    # =========================================================================
    # EVERY 15 MINUTES
    # =========================================================================
    
    # Send live session reminders
    'live-session-reminders': {
        'task': 'app.tasks.email_tasks.check_and_send_session_reminders',
        'schedule': timedelta(minutes=15),
        'options': {'queue': 'high'}
    },
    
    # =========================================================================
    # DAILY TASKS
    # =========================================================================
    
    # Daily log report (07:00)
    'daily-log-report': {
        'task': 'app.tasks.cleanup_tasks.generate_daily_log_report',
        'schedule': crontab(hour=7, minute=0),
        'options': {'queue': 'low'}
    },
    
    # AI Chat session anonymization - KVKK (02:00)
    'kvkk-anonymize-ai-sessions': {
        'task': 'app.tasks.cleanup_tasks.anonymize_old_ai_chat_sessions',
        'schedule': crontab(hour=2, minute=0),
        'kwargs': {'retention_days': 180},
        'options': {'queue': 'low'}
    },
    
    # Request logs cleanup (03:00)
    'cleanup-request-logs': {
        'task': 'app.tasks.cleanup_tasks.cleanup_old_request_logs',
        'schedule': crontab(hour=3, minute=0),
        'kwargs': {'retention_days': 30},
        'options': {'queue': 'low'}
    },
    
    # Daily analytics aggregation (03:30)
    'daily-analytics': {
        'task': 'app.tasks.report_tasks.aggregate_daily_analytics',
        'schedule': crontab(hour=3, minute=30),
        'options': {'queue': 'low'}
    },
    
    # Database cleanup (04:00)
    'database-cleanup': {
        'task': 'app.tasks.cleanup_tasks.cleanup_old_data',
        'schedule': crontab(hour=4, minute=0),
        'options': {'queue': 'low'}
    },
    
    # Daily AI usage report (06:00)
    'daily-ai-usage-report': {
        'task': 'app.tasks.cleanup_tasks.generate_ai_usage_report',
        'schedule': crontab(hour=6, minute=0),
        'kwargs': {'period': 'daily'},
        'options': {'queue': 'low'}
    },
    
    # =========================================================================
    # WEEKLY TASKS (Sunday)
    # =========================================================================
    
    # Weekly summary emails (Sunday 10:00)
    'weekly-summary-emails': {
        'task': 'app.tasks.email_tasks.send_all_weekly_summaries',
        'schedule': crontab(hour=10, minute=0, day_of_week=0),
        'options': {'queue': 'low'}
    },
    
    # Delete anonymized AI sessions (Sunday 03:00)
    'kvkk-delete-anonymized-sessions': {
        'task': 'app.tasks.cleanup_tasks.delete_anonymized_ai_sessions',
        'schedule': crontab(hour=3, minute=0, day_of_week=0),
        'kwargs': {'days_after_anonymization': 30},
        'options': {'queue': 'low'}
    },
    
    # Performance metrics cleanup (Sunday 04:00)
    'cleanup-performance-metrics': {
        'task': 'app.tasks.cleanup_tasks.cleanup_old_performance_metrics',
        'schedule': crontab(hour=4, minute=0, day_of_week=0),
        'kwargs': {'retention_days': 90},
        'options': {'queue': 'low'}
    },
    
    # Resolved errors cleanup (Sunday 04:30)
    'cleanup-resolved-errors': {
        'task': 'app.tasks.cleanup_tasks.cleanup_resolved_errors',
        'schedule': crontab(hour=4, minute=30, day_of_week=0),
        'kwargs': {'days_after_resolution': 60},
        'options': {'queue': 'low'}
    },
    
    # =========================================================================
    # MONTHLY TASKS (1st of month)
    # =========================================================================
    
    # Security events cleanup (1st 05:00)
    'cleanup-security-events': {
        'task': 'app.tasks.cleanup_tasks.cleanup_resolved_security_events',
        'schedule': crontab(hour=5, minute=0, day_of_month=1),
        'kwargs': {'days_after_resolution': 90},
        'options': {'queue': 'low'}
    },
    
    # AI usage logs cleanup (1st 04:00)
    'kvkk-cleanup-ai-logs': {
        'task': 'app.tasks.cleanup_tasks.cleanup_old_ai_usage_logs',
        'schedule': crontab(hour=4, minute=0, day_of_month=1),
        'kwargs': {'retention_days': 365},
        'options': {'queue': 'low'}
    },
    
    # Audit logs cleanup (1st 06:00)
    'cleanup-audit-logs': {
        'task': 'app.tasks.cleanup_tasks.cleanup_old_audit_logs',
        'schedule': crontab(hour=6, minute=0, day_of_month=1),
        'kwargs': {'retention_days': 365},
        'options': {'queue': 'low'}
    },
}

# =============================================================================
# ERROR HANDLING
# =============================================================================
task_always_eager = os.getenv('CELERY_ALWAYS_EAGER', 'false').lower() == 'true'

# =============================================================================
# LOGGING
# =============================================================================
worker_hijack_root_logger = False
worker_log_format = '[%(asctime)s: %(levelname)s/%(processName)s] %(message)s'
worker_task_log_format = '[%(asctime)s: %(levelname)s/%(processName)s][%(task_name)s(%(task_id)s)] %(message)s'
