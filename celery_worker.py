"""
Celery Worker Entry Point.
"""

from app import create_app
from app.tasks import celery, init_celery

# Create Flask app
app = create_app()

# Initialize Celery with app
init_celery(app)

# Make celery available for worker command
# Run with: celery -A celery_worker:celery worker --loglevel=info
