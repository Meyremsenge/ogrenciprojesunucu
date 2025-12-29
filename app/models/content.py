"""
Video and Document content models.

Video and Document are imported from app.modules.contents.models to avoid duplicate definitions.
VideoProgress is defined here as the canonical location.
"""

from datetime import datetime
from app.extensions import db

# Import Video and Document from modules/contents/models to avoid duplicate model definitions
# These are re-exported for backward compatibility
from app.modules.contents.models import Video, Document


class VideoProgress(db.Model):
    """Video progress tracking for students."""
    
    __tablename__ = 'video_progress'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    video_id = db.Column(db.Integer, db.ForeignKey('videos.id', ondelete='CASCADE'), nullable=False)
    
    # Progress tracking
    watched_seconds = db.Column(db.Integer, default=0)
    last_position = db.Column(db.Integer, default=0)  # Last playback position
    is_completed = db.Column(db.Boolean, default=False)
    
    # Watch count
    watch_count = db.Column(db.Integer, default=0)
    
    # Timestamps
    first_watched_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_watched_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
    
    # Relationships
    user = db.relationship('User', back_populates='video_progress')
    video = db.relationship('Video', back_populates='progress')
    
    # Unique constraint
    __table_args__ = (
        db.UniqueConstraint('user_id', 'video_id', name='unique_video_progress'),
    )
    
    def __repr__(self):
        return f'<VideoProgress User:{self.user_id} Video:{self.video_id}>'
    
    def update_progress(self, watched_seconds, position=None):
        """Update video watching progress."""
        self.watched_seconds = max(self.watched_seconds, watched_seconds)
        self.watch_count = (self.watch_count or 0) + 1
        
        if position is not None:
            self.last_position = position
        
        # Mark as completed if watched 90% or more
        if self.video and self.video.duration_seconds:
            completion_threshold = self.video.duration_seconds * 0.9
            if self.watched_seconds >= completion_threshold:
                self.mark_completed()
    
    def mark_completed(self):
        """Mark video as completed."""
        if not self.is_completed:
            self.is_completed = True
            self.completed_at = datetime.utcnow()
