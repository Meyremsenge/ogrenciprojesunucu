"""
Videos API endpoints.
"""

from flask import request, g
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_current_user
from datetime import datetime

from app.extensions import db
from app.models.course import Topic, Enrollment
from app.models.content import Video, VideoProgress
from app.api.decorators import teacher_required

videos_ns = Namespace('videos', description='Video management operations')

# Request/Response Models
video_model = videos_ns.model('Video', {
    'id': fields.Integer(description='Video ID'),
    'topic_id': fields.Integer(description='Topic ID'),
    'title': fields.String(description='Video title'),
    'description': fields.String(description='Video description'),
    'youtube_video_id': fields.String(description='YouTube video ID'),
    'embed_url': fields.String(description='YouTube embed URL'),
    'thumbnail_url': fields.String(description='Thumbnail URL'),
    'duration_seconds': fields.Integer(description='Duration in seconds'),
    'duration_formatted': fields.String(description='Formatted duration'),
    'order_index': fields.Integer(description='Order index'),
    'is_published': fields.Boolean(description='Is published'),
    'is_free_preview': fields.Boolean(description='Is free preview'),
    'view_count': fields.Integer(description='View count'),
})

video_create_model = videos_ns.model('VideoCreate', {
    'title': fields.String(required=True, description='Video title'),
    'description': fields.String(description='Video description'),
    'youtube_video_id': fields.String(required=True, description='YouTube video ID (e.g., dQw4w9WgXcQ)'),
    'duration_seconds': fields.Integer(description='Duration in seconds'),
    'order_index': fields.Integer(description='Order index'),
    'is_free_preview': fields.Boolean(description='Is free preview', default=False),
})

progress_update_model = videos_ns.model('ProgressUpdate', {
    'watched_seconds': fields.Integer(required=True, description='Watched seconds'),
    'position': fields.Integer(description='Current playback position'),
})


def check_video_access(user, video):
    """Check if user has access to view a video."""
    if not video.is_published:
        # Only course teacher and admins can view unpublished videos
        if not user:
            return False
        if user.is_admin:
            return True
        if video.topic.course.teacher_id == user.id:
            return True
        return False
    
    # Free preview videos are accessible to all
    if video.is_free_preview:
        return True
    
    # Check enrollment
    if not user:
        return False
    
    # Teachers and admins can view all published videos
    if user.is_admin or video.topic.course.teacher_id == user.id:
        return True
    
    # Check student enrollment
    enrollment = Enrollment.query.filter_by(
        user_id=user.id,
        course_id=video.topic.course_id
    ).first()
    
    return enrollment is not None


@videos_ns.route('/topic/<int:topic_id>')
class TopicVideos(Resource):
    """Videos by topic."""
    
    @videos_ns.doc('list_topic_videos')
    def get(self, topic_id):
        """Get videos in a topic."""
        topic = Topic.query.get(topic_id)
        
        if not topic:
            return {
                'success': False,
                'error': {
                    'code': 'NOT_FOUND',
                    'message': 'Topic not found'
                }
            }, 404
        
        videos = topic.videos.filter_by(is_published=True).order_by(Video.order_index).all()
        
        return {
            'success': True,
            'data': [video.to_dict() for video in videos]
        }, 200
    
    @jwt_required()
    @videos_ns.expect(video_create_model)
    @videos_ns.doc('create_video', security='Bearer')
    def post(self, topic_id):
        """Add a video to topic."""
        current_user = get_current_user()
        topic = Topic.query.get(topic_id)
        
        if not topic:
            return {
                'success': False,
                'error': {
                    'code': 'NOT_FOUND',
                    'message': 'Topic not found'
                }
            }, 404
        
        # Check permission
        if topic.course.teacher_id != current_user.id and not current_user.is_admin:
            return {
                'success': False,
                'error': {
                    'code': 'FORBIDDEN',
                    'message': 'You can only add videos to your own courses'
                }
            }, 403
        
        data = request.get_json()
        
        youtube_video_id = data.get('youtube_video_id', '').strip()
        
        if not youtube_video_id:
            return {
                'success': False,
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'YouTube video ID is required'
                }
            }, 400
        
        # Get max order index
        max_order = db.session.query(db.func.max(Video.order_index)).filter(
            Video.topic_id == topic_id
        ).scalar() or 0
        
        video = Video(
            topic_id=topic_id,
            title=data.get('title', '').strip(),
            description=data.get('description', ''),
            youtube_video_id=youtube_video_id,
            youtube_url=f'https://www.youtube.com/watch?v={youtube_video_id}',
            thumbnail_url=f'https://img.youtube.com/vi/{youtube_video_id}/maxresdefault.jpg',
            duration_seconds=data.get('duration_seconds', 0),
            order_index=data.get('order_index', max_order + 1),
            is_free_preview=data.get('is_free_preview', False),
            is_published=True
        )
        
        db.session.add(video)
        
        # Update topic video count
        topic.total_videos = (topic.total_videos or 0) + 1
        
        db.session.commit()
        
        return {
            'success': True,
            'message': 'Video added successfully',
            'data': video.to_dict()
        }, 201


@videos_ns.route('/<int:video_id>')
class VideoDetail(Resource):
    """Single video operations."""
    
    @videos_ns.doc('get_video')
    def get(self, video_id):
        """Get video details."""
        video = Video.query.get(video_id)
        
        if not video:
            return {
                'success': False,
                'error': {
                    'code': 'NOT_FOUND',
                    'message': 'Video not found'
                }
            }, 404
        
        return {
            'success': True,
            'data': video.to_dict()
        }, 200
    
    @jwt_required()
    @videos_ns.expect(video_create_model)
    @videos_ns.doc('update_video', security='Bearer')
    def put(self, video_id):
        """Update video."""
        current_user = get_current_user()
        video = Video.query.get(video_id)
        
        if not video:
            return {
                'success': False,
                'error': {
                    'code': 'NOT_FOUND',
                    'message': 'Video not found'
                }
            }, 404
        
        # Check permission
        if video.topic.course.teacher_id != current_user.id and not current_user.is_admin:
            return {
                'success': False,
                'error': {
                    'code': 'FORBIDDEN',
                    'message': 'You can only update videos in your own courses'
                }
            }, 403
        
        data = request.get_json()
        
        if 'title' in data:
            video.title = data['title'].strip()
        if 'description' in data:
            video.description = data['description']
        if 'youtube_video_id' in data:
            youtube_id = data['youtube_video_id'].strip()
            video.youtube_video_id = youtube_id
            video.youtube_url = f'https://www.youtube.com/watch?v={youtube_id}'
            video.thumbnail_url = f'https://img.youtube.com/vi/{youtube_id}/maxresdefault.jpg'
        if 'duration_seconds' in data:
            video.duration_seconds = data['duration_seconds']
        if 'order_index' in data:
            video.order_index = data['order_index']
        if 'is_free_preview' in data:
            video.is_free_preview = data['is_free_preview']
        if 'is_published' in data:
            video.is_published = data['is_published']
        
        db.session.commit()
        
        return {
            'success': True,
            'message': 'Video updated successfully',
            'data': video.to_dict()
        }, 200
    
    @jwt_required()
    @videos_ns.doc('delete_video', security='Bearer')
    def delete(self, video_id):
        """Delete video."""
        current_user = get_current_user()
        video = Video.query.get(video_id)
        
        if not video:
            return {
                'success': False,
                'error': {
                    'code': 'NOT_FOUND',
                    'message': 'Video not found'
                }
            }, 404
        
        # Check permission
        if video.topic.course.teacher_id != current_user.id and not current_user.is_admin:
            return {
                'success': False,
                'error': {
                    'code': 'FORBIDDEN',
                    'message': 'You can only delete videos from your own courses'
                }
            }, 403
        
        topic = video.topic
        
        db.session.delete(video)
        
        # Update topic video count
        topic.total_videos = max(0, (topic.total_videos or 0) - 1)
        
        db.session.commit()
        
        return {
            'success': True,
            'message': 'Video deleted successfully'
        }, 200


@videos_ns.route('/<int:video_id>/embed')
class VideoEmbed(Resource):
    """Get video embed URL (with access check)."""
    
    @jwt_required()
    @videos_ns.doc('get_video_embed', security='Bearer')
    def get(self, video_id):
        """Get YouTube embed URL for video."""
        current_user = get_current_user()
        video = Video.query.get(video_id)
        
        if not video:
            return {
                'success': False,
                'error': {
                    'code': 'NOT_FOUND',
                    'message': 'Video not found'
                }
            }, 404
        
        # Check access
        if not check_video_access(current_user, video):
            return {
                'success': False,
                'error': {
                    'code': 'ACCESS_DENIED',
                    'message': 'You do not have access to this video. Please enroll in the course.'
                }
            }, 403
        
        # Increment view count
        video.increment_view_count()
        db.session.commit()
        
        return {
            'success': True,
            'data': {
                'video_id': video.id,
                'youtube_video_id': video.youtube_video_id,
                'embed_url': video.embed_url,
                'title': video.title,
                'duration_seconds': video.duration_seconds
            }
        }, 200


@videos_ns.route('/<int:video_id>/progress')
class VideoProgressResource(Resource):
    """Video progress tracking."""
    
    @jwt_required()
    @videos_ns.doc('get_video_progress', security='Bearer')
    def get(self, video_id):
        """Get user's progress on a video."""
        current_user = get_current_user()
        
        progress = VideoProgress.query.filter_by(
            user_id=current_user.id,
            video_id=video_id
        ).first()
        
        if not progress:
            return {
                'success': True,
                'data': None
            }, 200
        
        return {
            'success': True,
            'data': {
                'video_id': video_id,
                'watched_seconds': progress.watched_seconds,
                'last_position': progress.last_position,
                'is_completed': progress.is_completed,
                'watch_count': progress.watch_count,
                'last_watched_at': progress.last_watched_at.isoformat() if progress.last_watched_at else None
            }
        }, 200
    
    @jwt_required()
    @videos_ns.expect(progress_update_model)
    @videos_ns.doc('update_video_progress', security='Bearer')
    def post(self, video_id):
        """Update video watching progress."""
        current_user = get_current_user()
        video = Video.query.get(video_id)
        
        if not video:
            return {
                'success': False,
                'error': {
                    'code': 'NOT_FOUND',
                    'message': 'Video not found'
                }
            }, 404
        
        # Check access
        if not check_video_access(current_user, video):
            return {
                'success': False,
                'error': {
                    'code': 'ACCESS_DENIED',
                    'message': 'You do not have access to this video'
                }
            }, 403
        
        data = request.get_json()
        watched_seconds = data.get('watched_seconds', 0)
        position = data.get('position')
        
        # Get or create progress record
        progress = VideoProgress.query.filter_by(
            user_id=current_user.id,
            video_id=video_id
        ).first()
        
        if not progress:
            progress = VideoProgress(
                user_id=current_user.id,
                video_id=video_id
            )
            db.session.add(progress)
        
        # Update progress
        was_completed = progress.is_completed
        progress.update_progress(watched_seconds, position)
        
        db.session.commit()
        
        # If video was just completed, update enrollment progress
        if not was_completed and progress.is_completed:
            enrollment = Enrollment.query.filter_by(
                user_id=current_user.id,
                course_id=video.topic.course_id
            ).first()
            
            if enrollment:
                enrollment.update_progress()
                enrollment.last_accessed_at = datetime.utcnow()
                db.session.commit()
        
        return {
            'success': True,
            'message': 'Progress updated',
            'data': {
                'video_id': video_id,
                'watched_seconds': progress.watched_seconds,
                'is_completed': progress.is_completed
            }
        }, 200
