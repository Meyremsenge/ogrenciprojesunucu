"""
Video processing tasks for background operations.
"""

from celery import shared_task
from datetime import datetime


@shared_task(bind=True, max_retries=3)
def fetch_video_metadata_task(self, video_id: int):
    """
    Fetch and update video metadata from YouTube.
    
    Args:
        video_id: Database video ID
    """
    try:
        from app import create_app
        from app.extensions import db
        from app.models.content import Video
        from app.services.youtube_service import YouTubeService
        
        app = create_app()
        with app.app_context():
            video = Video.query.get(video_id)
            
            if not video:
                return {'success': False, 'error': 'Video not found'}
            
            youtube_service = YouTubeService()
            video_info, error = youtube_service.get_video_info(video.youtube_id)
            
            if error:
                return {'success': False, 'error': error}
            
            # Update video metadata
            video.duration_seconds = video_info.get('duration_seconds', 0)
            video.thumbnail_url = video_info.get('thumbnail_url', '')
            video.metadata = {
                'channel_id': video_info.get('channel_id'),
                'channel_title': video_info.get('channel_title'),
                'view_count': video_info.get('view_count'),
                'like_count': video_info.get('like_count'),
                'published_at': video_info.get('published_at'),
                'fetched_at': datetime.utcnow().isoformat()
            }
            
            db.session.commit()
            
            return {
                'success': True,
                'video_id': video_id,
                'youtube_id': video.youtube_id,
                'duration': video.duration_seconds
            }
            
    except Exception as e:
        self.retry(exc=e, countdown=60 * (2 ** self.request.retries))


@shared_task
def sync_all_video_metadata_task():
    """Sync metadata for all videos from YouTube."""
    from app import create_app
    from app.models.content import Video
    
    app = create_app()
    with app.app_context():
        videos = Video.query.filter(
            Video.is_active == True,
            Video.youtube_id.isnot(None)
        ).all()
        
        results = []
        for video in videos:
            task = fetch_video_metadata_task.delay(video.id)
            results.append({'video_id': video.id, 'task_id': task.id})
        
        return {
            'total_videos': len(videos),
            'tasks_queued': len(results),
            'results': results
        }


@shared_task
def update_video_view_counts_task():
    """Update view counts for all videos."""
    from app import create_app
    from app.extensions import db
    from app.models.content import Video, VideoProgress
    from sqlalchemy import func
    
    app = create_app()
    with app.app_context():
        # Get view counts from VideoProgress
        view_counts = db.session.query(
            VideoProgress.video_id,
            func.count(VideoProgress.id).label('view_count')
        ).group_by(VideoProgress.video_id).all()
        
        updated = 0
        for video_id, count in view_counts:
            video = Video.query.get(video_id)
            if video:
                video.view_count = count
                updated += 1
        
        db.session.commit()
        
        return {'updated_videos': updated}


@shared_task
def calculate_video_completion_stats_task(video_id: int):
    """Calculate completion statistics for a video."""
    from app import create_app
    from app.extensions import db
    from app.models.content import Video, VideoProgress
    from sqlalchemy import func
    
    app = create_app()
    with app.app_context():
        video = Video.query.get(video_id)
        
        if not video:
            return {'success': False, 'error': 'Video not found'}
        
        # Calculate stats
        stats = db.session.query(
            func.count(VideoProgress.id).label('total_views'),
            func.avg(VideoProgress.watch_percentage).label('avg_completion'),
            func.count(VideoProgress.id).filter(VideoProgress.is_completed == True).label('completed_count')
        ).filter(VideoProgress.video_id == video_id).first()
        
        return {
            'video_id': video_id,
            'total_views': stats.total_views or 0,
            'avg_completion_percentage': round(stats.avg_completion or 0, 2),
            'completed_count': stats.completed_count or 0
        }


@shared_task
def cleanup_incomplete_progress_task(days_old: int = 30):
    """Clean up old incomplete video progress entries."""
    from app import create_app
    from app.extensions import db
    from app.models.content import VideoProgress
    from datetime import timedelta
    
    app = create_app()
    with app.app_context():
        cutoff_date = datetime.utcnow() - timedelta(days=days_old)
        
        # Delete old incomplete progress entries
        deleted = VideoProgress.query.filter(
            VideoProgress.is_completed == False,
            VideoProgress.watch_percentage < 10,
            VideoProgress.last_watched_at < cutoff_date
        ).delete()
        
        db.session.commit()
        
        return {'deleted_entries': deleted}
