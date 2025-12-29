"""
Live Session model for live classes.

LiveSession and SessionAttendance are imported from app.modules.live_classes.models 
to avoid duplicate definitions.
"""

# Import models from modules/live_classes/models to avoid duplicate model definitions
# These are re-exported for backward compatibility
from app.modules.live_classes.models import (
    LiveSession,
    SessionAttendance,
    SessionStatus,
    SessionPlatform,
    RecurrenceType,
    AttendanceStatus,
)

# Re-export for backward compatibility
__all__ = [
    'LiveSession',
    'SessionAttendance', 
    'SessionStatus',
    'SessionPlatform',
    'RecurrenceType',
    'AttendanceStatus',
]
