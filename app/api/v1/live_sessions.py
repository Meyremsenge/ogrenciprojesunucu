"""
Live Sessions API endpoints.
"""

from datetime import datetime
from flask import request
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.extensions import db
from app.models.live_session import LiveSession, SessionAttendance, SessionStatus
from app.models.course import Enrollment
from app.api.decorators import require_roles, teacher_required

ns = Namespace('live-sessions', description='Canlı ders işlemleri')

# Models for Swagger documentation
session_model = ns.model('LiveSession', {
    'title': fields.String(required=True, description='Ders başlığı'),
    'description': fields.String(description='Ders açıklaması'),
    'meeting_url': fields.String(required=True, description='Toplantı bağlantısı (Zoom, Meet, Teams vb.)'),
    'meeting_platform': fields.String(description='Platform (zoom, google_meet, teams, other)'),
    'scheduled_start': fields.DateTime(required=True, description='Başlangıç zamanı'),
    'scheduled_end': fields.DateTime(required=True, description='Bitiş zamanı'),
    'max_participants': fields.Integer(description='Maksimum katılımcı sayısı'),
    'course_id': fields.Integer(required=True, description='Kurs ID'),
    'topic_id': fields.Integer(description='Konu ID'),
})


@ns.route('/')
class LiveSessionList(Resource):
    """List and create live sessions."""
    
    @ns.doc('list_sessions')
    @jwt_required()
    def get(self):
        """List live sessions."""
        current_user_id = get_jwt_identity()
        
        # Query parameters
        course_id = request.args.get('course_id', type=int)
        status = request.args.get('status')
        upcoming = request.args.get('upcoming', 'false').lower() == 'true'
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        query = LiveSession.query.filter_by(is_active=True)
        
        if course_id:
            query = query.filter_by(course_id=course_id)
        
        if status:
            query = query.filter_by(status=status)
        
        if upcoming:
            query = query.filter(
                LiveSession.status == SessionStatus.SCHEDULED.value,
                LiveSession.scheduled_start > datetime.utcnow()
            )
        
        query = query.order_by(LiveSession.scheduled_start.asc())
        
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return {
            'success': True,
            'data': {
                'items': [s.to_dict() for s in pagination.items],
                'total': pagination.total,
                'page': page,
                'per_page': per_page,
                'total_pages': pagination.pages
            }
        }
    
    @ns.doc('create_session')
    @ns.expect(session_model)
    @jwt_required()
    @teacher_required
    def post(self):
        """Create a new live session."""
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # Parse dates
        try:
            scheduled_start = datetime.fromisoformat(data['scheduled_start'].replace('Z', '+00:00'))
            scheduled_end = datetime.fromisoformat(data['scheduled_end'].replace('Z', '+00:00'))
        except (ValueError, KeyError) as e:
            return {'success': False, 'error': {'message': 'Invalid date format'}}, 400
        
        if scheduled_end <= scheduled_start:
            return {'success': False, 'error': {'message': 'End time must be after start time'}}, 400
        
        session = LiveSession(
            title=data['title'],
            description=data.get('description'),
            meeting_url=data['meeting_url'],
            meeting_platform=data.get('meeting_platform', 'other'),
            scheduled_start=scheduled_start,
            scheduled_end=scheduled_end,
            max_participants=data.get('max_participants', 100),
            course_id=data['course_id'],
            topic_id=data.get('topic_id'),
            host_id=current_user_id
        )
        
        db.session.add(session)
        db.session.commit()
        
        return {
            'success': True,
            'message': 'Live session created successfully',
            'data': session.to_dict(include_meeting_url=True)
        }, 201


@ns.route('/<int:session_id>')
class LiveSessionDetail(Resource):
    """Live session detail operations."""
    
    @ns.doc('get_session')
    @jwt_required()
    def get(self, session_id):
        """Get live session details."""
        current_user_id = get_jwt_identity()
        
        session = LiveSession.query.get_or_404(session_id)
        
        # Check if user is enrolled or is teacher/admin
        from app.models.user import User
        user = User.query.get(current_user_id)
        
        is_enrolled = Enrollment.query.filter_by(
            user_id=current_user_id,
            course_id=session.course_id,
            status='active'
        ).first() is not None
        
        is_host_or_admin = (
            session.host_id == current_user_id or 
            user.role.name in ['admin', 'super_admin', 'teacher']
        )
        
        # Include meeting URL only for enrolled students or host/admin
        include_url = is_enrolled or is_host_or_admin
        
        return {
            'success': True,
            'data': session.to_dict(include_meeting_url=include_url)
        }
    
    @ns.doc('update_session')
    @jwt_required()
    @teacher_required
    def put(self, session_id):
        """Update live session."""
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        session = LiveSession.query.get_or_404(session_id)
        
        # Only host or admin can update
        from app.models.user import User
        user = User.query.get(current_user_id)
        
        if session.host_id != current_user_id and user.role.name not in ['admin', 'super_admin']:
            return {'success': False, 'error': {'message': 'Permission denied'}}, 403
        
        # Update fields
        if 'title' in data:
            session.title = data['title']
        if 'description' in data:
            session.description = data['description']
        if 'meeting_url' in data:
            session.meeting_url = data['meeting_url']
        if 'meeting_platform' in data:
            session.meeting_platform = data['meeting_platform']
        if 'max_participants' in data:
            session.max_participants = data['max_participants']
        if 'recording_url' in data:
            session.recording_url = data['recording_url']
            session.recording_available = bool(data['recording_url'])
        
        if 'scheduled_start' in data:
            session.scheduled_start = datetime.fromisoformat(data['scheduled_start'].replace('Z', '+00:00'))
        if 'scheduled_end' in data:
            session.scheduled_end = datetime.fromisoformat(data['scheduled_end'].replace('Z', '+00:00'))
        
        db.session.commit()
        
        return {
            'success': True,
            'message': 'Session updated successfully',
            'data': session.to_dict(include_meeting_url=True)
        }
    
    @ns.doc('delete_session')
    @jwt_required()
    @teacher_required
    def delete(self, session_id):
        """Delete (soft) live session."""
        current_user_id = get_jwt_identity()
        
        session = LiveSession.query.get_or_404(session_id)
        
        from app.models.user import User
        user = User.query.get(current_user_id)
        
        if session.host_id != current_user_id and user.role.name not in ['admin', 'super_admin']:
            return {'success': False, 'error': {'message': 'Permission denied'}}, 403
        
        session.is_active = False
        db.session.commit()
        
        return {'success': True, 'message': 'Session deleted successfully'}


@ns.route('/<int:session_id>/start')
class StartSession(Resource):
    """Start live session."""
    
    @ns.doc('start_session')
    @jwt_required()
    @teacher_required
    def post(self, session_id):
        """Mark session as live."""
        current_user_id = get_jwt_identity()
        
        session = LiveSession.query.get_or_404(session_id)
        
        if session.host_id != current_user_id:
            return {'success': False, 'error': {'message': 'Only host can start session'}}, 403
        
        if session.status != SessionStatus.SCHEDULED.value:
            return {'success': False, 'error': {'message': 'Session cannot be started'}}, 400
        
        session.start_session()
        
        return {
            'success': True,
            'message': 'Session started',
            'data': session.to_dict(include_meeting_url=True)
        }


@ns.route('/<int:session_id>/end')
class EndSession(Resource):
    """End live session."""
    
    @ns.doc('end_session')
    @jwt_required()
    @teacher_required
    def post(self, session_id):
        """Mark session as completed."""
        current_user_id = get_jwt_identity()
        
        session = LiveSession.query.get_or_404(session_id)
        
        if session.host_id != current_user_id:
            return {'success': False, 'error': {'message': 'Only host can end session'}}, 403
        
        if session.status != SessionStatus.LIVE.value:
            return {'success': False, 'error': {'message': 'Session is not live'}}, 400
        
        session.end_session()
        
        return {
            'success': True,
            'message': 'Session ended',
            'data': session.to_dict()
        }


@ns.route('/<int:session_id>/register')
class RegisterSession(Resource):
    """Register for live session."""
    
    @ns.doc('register_session')
    @jwt_required()
    def post(self, session_id):
        """Register for a live session."""
        current_user_id = get_jwt_identity()
        
        session = LiveSession.query.get_or_404(session_id)
        
        # Check enrollment
        enrollment = Enrollment.query.filter_by(
            user_id=current_user_id,
            course_id=session.course_id,
            status='active'
        ).first()
        
        if not enrollment:
            return {'success': False, 'error': {'message': 'You must be enrolled in the course'}}, 403
        
        # Check capacity
        if session.participant_count >= session.max_participants:
            return {'success': False, 'error': {'message': 'Session is full'}}, 400
        
        # Check if already registered
        existing = SessionAttendance.query.filter_by(
            session_id=session_id,
            user_id=current_user_id
        ).first()
        
        if existing:
            return {'success': False, 'error': {'message': 'Already registered'}}, 400
        
        attendance = SessionAttendance(
            session_id=session_id,
            user_id=current_user_id
        )
        
        db.session.add(attendance)
        db.session.commit()
        
        return {
            'success': True,
            'message': 'Registered successfully',
            'data': session.to_dict(include_meeting_url=True)
        }, 201


@ns.route('/<int:session_id>/join')
class JoinSession(Resource):
    """Join live session."""
    
    @ns.doc('join_session')
    @jwt_required()
    def post(self, session_id):
        """Mark user as joined and get meeting URL."""
        current_user_id = get_jwt_identity()
        
        session = LiveSession.query.get_or_404(session_id)
        
        # Get attendance record
        attendance = SessionAttendance.query.filter_by(
            session_id=session_id,
            user_id=current_user_id
        ).first()
        
        if not attendance:
            return {'success': False, 'error': {'message': 'Not registered for this session'}}, 403
        
        if session.status not in [SessionStatus.SCHEDULED.value, SessionStatus.LIVE.value]:
            return {'success': False, 'error': {'message': 'Session is not available'}}, 400
        
        attendance.mark_joined()
        
        return {
            'success': True,
            'message': 'Joined successfully',
            'data': {
                'meeting_url': session.meeting_url,
                'meeting_platform': session.meeting_platform,
                'session': session.to_dict(include_meeting_url=True)
            }
        }


@ns.route('/<int:session_id>/attendees')
class SessionAttendees(Resource):
    """Session attendees list."""
    
    @ns.doc('list_attendees')
    @jwt_required()
    @teacher_required
    def get(self, session_id):
        """Get list of registered attendees."""
        session = LiveSession.query.get_or_404(session_id)
        
        attendances = SessionAttendance.query.filter_by(session_id=session_id).all()
        
        return {
            'success': True,
            'data': {
                'session': session.to_dict(),
                'total_registered': len(attendances),
                'total_attended': len([a for a in attendances if a.attended]),
                'attendees': [a.to_dict() for a in attendances]
            }
        }


@ns.route('/my-sessions')
class MySessions(Resource):
    """User's registered sessions."""
    
    @ns.doc('my_sessions')
    @jwt_required()
    def get(self):
        """Get sessions user is registered for."""
        current_user_id = get_jwt_identity()
        
        upcoming = request.args.get('upcoming', 'true').lower() == 'true'
        
        query = db.session.query(LiveSession).join(
            SessionAttendance, LiveSession.id == SessionAttendance.session_id
        ).filter(
            SessionAttendance.user_id == current_user_id,
            LiveSession.is_active == True
        )
        
        if upcoming:
            query = query.filter(
                LiveSession.status.in_([SessionStatus.SCHEDULED.value, SessionStatus.LIVE.value])
            )
        
        sessions = query.order_by(LiveSession.scheduled_start.asc()).all()
        
        return {
            'success': True,
            'data': [s.to_dict(include_meeting_url=True) for s in sessions]
        }
