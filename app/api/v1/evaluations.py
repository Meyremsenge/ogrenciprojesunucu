"""
Evaluations API endpoints.
"""

from flask import request, g
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_current_user
from datetime import datetime

from app.extensions import db
from app.models.user import User, Role
from app.models.course import Course, Enrollment
from app.models.evaluation import Evaluation, StudentProgress
from app.api.decorators import teacher_required, admin_required

evaluations_ns = Namespace('evaluations', description='Evaluation and progress operations')

# Request/Response Models
evaluation_model = evaluations_ns.model('Evaluation', {
    'id': fields.Integer(description='Evaluation ID'),
    'student': fields.Raw(description='Student info'),
    'teacher': fields.Raw(description='Teacher info'),
    'course': fields.Raw(description='Course info'),
    'rating': fields.Integer(description='Rating (1-5)'),
    'feedback': fields.String(description='Feedback'),
    'strengths': fields.List(fields.String, description='Strengths'),
    'improvements': fields.List(fields.String, description='Areas for improvement'),
    'goals': fields.List(fields.String, description='Goals'),
    'evaluation_date': fields.String(description='Evaluation date'),
})

evaluation_create_model = evaluations_ns.model('EvaluationCreate', {
    'student_id': fields.Integer(required=True, description='Student ID'),
    'course_id': fields.Integer(description='Course ID'),
    'rating': fields.Integer(description='Rating (1-5)'),
    'feedback': fields.String(description='Overall feedback'),
    'strengths': fields.List(fields.String, description='List of strengths'),
    'improvements': fields.List(fields.String, description='Areas needing improvement'),
    'goals': fields.List(fields.String, description='Recommended goals'),
    'is_visible_to_student': fields.Boolean(description='Visible to student', default=True),
})

progress_model = evaluations_ns.model('StudentProgress', {
    'id': fields.Integer(description='Progress ID'),
    'user_id': fields.Integer(description='User ID'),
    'course_id': fields.Integer(description='Course ID'),
    'videos': fields.Raw(description='Video progress'),
    'questions': fields.Raw(description='Question progress'),
    'exams': fields.Raw(description='Exam progress'),
    'overall_progress_percent': fields.Float(description='Overall progress'),
    'total_points': fields.Integer(description='Total points'),
    'streak_days': fields.Integer(description='Learning streak'),
})


@evaluations_ns.route('')
class EvaluationList(Resource):
    """Evaluation list and creation."""
    
    @jwt_required()
    @teacher_required
    @evaluations_ns.doc('list_evaluations', security='Bearer')
    @evaluations_ns.param('student_id', 'Filter by student', type=int)
    @evaluations_ns.param('course_id', 'Filter by course', type=int)
    def get(self):
        """Get evaluations (Teacher+)."""
        current_user = g.current_user
        
        query = Evaluation.query
        
        # Teachers see only their evaluations, admins see all
        if not current_user.is_admin:
            query = query.filter_by(teacher_id=current_user.id)
        
        student_id = request.args.get('student_id', type=int)
        if student_id:
            query = query.filter_by(student_id=student_id)
        
        course_id = request.args.get('course_id', type=int)
        if course_id:
            query = query.filter_by(course_id=course_id)
        
        evaluations = query.order_by(Evaluation.created_at.desc()).all()
        
        return {
            'success': True,
            'data': [e.to_dict() for e in evaluations]
        }, 200
    
    @jwt_required()
    @teacher_required
    @evaluations_ns.expect(evaluation_create_model)
    @evaluations_ns.doc('create_evaluation', security='Bearer')
    def post(self):
        """Create a new evaluation (Teacher+)."""
        current_user = g.current_user
        data = request.get_json()
        
        student_id = data.get('student_id')
        student = User.query.get(student_id)
        
        if not student:
            return {
                'success': False,
                'error': {
                    'code': 'NOT_FOUND',
                    'message': 'Student not found'
                }
            }, 404
        
        if not student.is_student:
            return {
                'success': False,
                'error': {
                    'code': 'INVALID_USER',
                    'message': 'User is not a student'
                }
            }, 400
        
        # Validate rating
        rating = data.get('rating')
        if rating is not None and (rating < 1 or rating > 5):
            return {
                'success': False,
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Rating must be between 1 and 5'
                }
            }, 400
        
        # Get student's current performance data
        performance_data = get_student_performance(student_id, data.get('course_id'))
        
        evaluation = Evaluation(
            student_id=student_id,
            teacher_id=current_user.id,
            course_id=data.get('course_id'),
            rating=rating,
            feedback=data.get('feedback'),
            strengths=data.get('strengths', []),
            improvements=data.get('improvements', []),
            goals=data.get('goals', []),
            performance_data=performance_data,
            is_visible_to_student=data.get('is_visible_to_student', True),
            evaluation_date=datetime.utcnow()
        )
        
        db.session.add(evaluation)
        db.session.commit()
        
        return {
            'success': True,
            'message': 'Evaluation created successfully',
            'data': evaluation.to_dict()
        }, 201


@evaluations_ns.route('/<int:evaluation_id>')
class EvaluationDetail(Resource):
    """Single evaluation operations."""
    
    @jwt_required()
    @evaluations_ns.doc('get_evaluation', security='Bearer')
    def get(self, evaluation_id):
        """Get evaluation details."""
        current_user = get_current_user()
        evaluation = Evaluation.query.get(evaluation_id)
        
        if not evaluation:
            return {
                'success': False,
                'error': {
                    'code': 'NOT_FOUND',
                    'message': 'Evaluation not found'
                }
            }, 404
        
        # Check permission
        is_student = evaluation.student_id == current_user.id
        is_teacher = evaluation.teacher_id == current_user.id
        
        if not is_student and not is_teacher and not current_user.is_admin:
            return {
                'success': False,
                'error': {
                    'code': 'FORBIDDEN',
                    'message': 'You do not have permission to view this evaluation'
                }
            }, 403
        
        # Hide from student if not visible
        if is_student and not evaluation.is_visible_to_student:
            return {
                'success': False,
                'error': {
                    'code': 'NOT_FOUND',
                    'message': 'Evaluation not found'
                }
            }, 404
        
        include_performance = is_teacher or current_user.is_admin
        
        return {
            'success': True,
            'data': evaluation.to_dict(include_performance=include_performance)
        }, 200
    
    @jwt_required()
    @teacher_required
    @evaluations_ns.expect(evaluation_create_model)
    @evaluations_ns.doc('update_evaluation', security='Bearer')
    def put(self, evaluation_id):
        """Update evaluation."""
        current_user = g.current_user
        evaluation = Evaluation.query.get(evaluation_id)
        
        if not evaluation:
            return {
                'success': False,
                'error': {
                    'code': 'NOT_FOUND',
                    'message': 'Evaluation not found'
                }
            }, 404
        
        if evaluation.teacher_id != current_user.id and not current_user.is_admin:
            return {
                'success': False,
                'error': {
                    'code': 'FORBIDDEN',
                    'message': 'You can only update your own evaluations'
                }
            }, 403
        
        data = request.get_json()
        
        if 'rating' in data:
            evaluation.rating = data['rating']
        if 'feedback' in data:
            evaluation.feedback = data['feedback']
        if 'strengths' in data:
            evaluation.strengths = data['strengths']
        if 'improvements' in data:
            evaluation.improvements = data['improvements']
        if 'goals' in data:
            evaluation.goals = data['goals']
        if 'is_visible_to_student' in data:
            evaluation.is_visible_to_student = data['is_visible_to_student']
        
        db.session.commit()
        
        return {
            'success': True,
            'message': 'Evaluation updated successfully',
            'data': evaluation.to_dict()
        }, 200
    
    @jwt_required()
    @teacher_required
    @evaluations_ns.doc('delete_evaluation', security='Bearer')
    def delete(self, evaluation_id):
        """Delete evaluation."""
        current_user = g.current_user
        evaluation = Evaluation.query.get(evaluation_id)
        
        if not evaluation:
            return {
                'success': False,
                'error': {
                    'code': 'NOT_FOUND',
                    'message': 'Evaluation not found'
                }
            }, 404
        
        if evaluation.teacher_id != current_user.id and not current_user.is_admin:
            return {
                'success': False,
                'error': {
                    'code': 'FORBIDDEN',
                    'message': 'You can only delete your own evaluations'
                }
            }, 403
        
        db.session.delete(evaluation)
        db.session.commit()
        
        return {
            'success': True,
            'message': 'Evaluation deleted successfully'
        }, 200


@evaluations_ns.route('/students/<int:student_id>/evaluations')
class StudentEvaluations(Resource):
    """Student's evaluations."""
    
    @jwt_required()
    @evaluations_ns.doc('get_student_evaluations', security='Bearer')
    def get(self, student_id):
        """Get evaluations for a student."""
        current_user = get_current_user()
        
        # Check permission
        if current_user.id != student_id and not current_user.is_teacher:
            return {
                'success': False,
                'error': {
                    'code': 'FORBIDDEN',
                    'message': 'You can only view your own evaluations'
                }
            }, 403
        
        query = Evaluation.query.filter_by(student_id=student_id)
        
        # Students see only visible evaluations
        if current_user.id == student_id:
            query = query.filter_by(is_visible_to_student=True)
        
        evaluations = query.order_by(Evaluation.evaluation_date.desc()).all()
        
        return {
            'success': True,
            'data': [e.to_dict() for e in evaluations]
        }, 200


@evaluations_ns.route('/students/<int:student_id>/progress')
class StudentProgressEndpoint(Resource):
    """Student's progress."""
    
    @jwt_required()
    @evaluations_ns.doc('get_student_progress', security='Bearer')
    @evaluations_ns.param('course_id', 'Filter by course', type=int)
    def get(self, student_id):
        """Get student's learning progress."""
        current_user = get_current_user()
        
        # Check permission
        if current_user.id != student_id and not current_user.is_teacher:
            return {
                'success': False,
                'error': {
                    'code': 'FORBIDDEN',
                    'message': 'You can only view your own progress'
                }
            }, 403
        
        course_id = request.args.get('course_id', type=int)
        
        query = StudentProgress.query.filter_by(user_id=student_id)
        
        if course_id:
            query = query.filter_by(course_id=course_id)
        
        progress_records = query.all()
        
        return {
            'success': True,
            'data': [p.to_dict() for p in progress_records]
        }, 200


@evaluations_ns.route('/students/<int:student_id>/analytics')
class StudentAnalytics(Resource):
    """Student's analytics."""
    
    @jwt_required()
    @evaluations_ns.doc('get_student_analytics', security='Bearer')
    def get(self, student_id):
        """Get comprehensive student analytics."""
        current_user = get_current_user()
        
        # Check permission
        if current_user.id != student_id and not current_user.is_teacher:
            return {
                'success': False,
                'error': {
                    'code': 'FORBIDDEN',
                    'message': 'You can only view your own analytics'
                }
            }, 403
        
        student = User.query.get(student_id)
        if not student:
            return {
                'success': False,
                'error': {
                    'code': 'NOT_FOUND',
                    'message': 'Student not found'
                }
            }, 404
        
        analytics = get_student_performance(student_id)
        
        return {
            'success': True,
            'data': analytics
        }, 200


@evaluations_ns.route('/my-progress')
class MyProgress(Resource):
    """Current user's progress."""
    
    @jwt_required()
    @evaluations_ns.doc('get_my_progress', security='Bearer')
    def get(self):
        """Get current user's learning progress."""
        current_user = get_current_user()
        
        progress_records = StudentProgress.query.filter_by(
            user_id=current_user.id
        ).all()
        
        return {
            'success': True,
            'data': [p.to_dict() for p in progress_records]
        }, 200


@evaluations_ns.route('/my-evaluations')
class MyEvaluations(Resource):
    """Current user's evaluations."""
    
    @jwt_required()
    @evaluations_ns.doc('get_my_evaluations', security='Bearer')
    def get(self):
        """Get current user's evaluations."""
        current_user = get_current_user()
        
        evaluations = Evaluation.query.filter_by(
            student_id=current_user.id,
            is_visible_to_student=True
        ).order_by(Evaluation.evaluation_date.desc()).all()
        
        return {
            'success': True,
            'data': [e.to_dict() for e in evaluations]
        }, 200


def get_student_performance(student_id, course_id=None):
    """Get comprehensive student performance data."""
    from app.models.content import VideoProgress
    from app.models.question import QuestionAttempt
    from app.models.exam import ExamResult, ExamResultStatus
    
    # Get enrollments
    enrollments_query = Enrollment.query.filter_by(user_id=student_id)
    if course_id:
        enrollments_query = enrollments_query.filter_by(course_id=course_id)
    
    enrollments = enrollments_query.all()
    
    # Videos
    total_videos_watched = VideoProgress.query.filter_by(user_id=student_id).count()
    completed_videos = VideoProgress.query.filter_by(
        user_id=student_id,
        is_completed=True
    ).count()
    
    total_watch_time = db.session.query(
        db.func.sum(VideoProgress.watched_seconds)
    ).filter(VideoProgress.user_id == student_id).scalar() or 0
    
    # Questions
    total_attempts = QuestionAttempt.query.filter_by(user_id=student_id).count()
    correct_attempts = QuestionAttempt.query.filter_by(
        user_id=student_id,
        is_correct=True
    ).count()
    
    # Exams
    exam_results = ExamResult.query.filter_by(user_id=student_id).filter(
        ExamResult.status.in_([
            ExamResultStatus.SUBMITTED.value,
            ExamResultStatus.GRADED.value
        ])
    ).all()
    
    exams_taken = len(exam_results)
    exams_passed = sum(1 for r in exam_results if r.is_passed)
    
    if exam_results:
        avg_exam_score = sum(
            (r.score / r.max_score * 100) if r.max_score > 0 else 0
            for r in exam_results
        ) / len(exam_results)
    else:
        avg_exam_score = 0
    
    return {
        'enrollments': len(enrollments),
        'videos': {
            'watched': total_videos_watched,
            'completed': completed_videos,
            'total_watch_time_seconds': total_watch_time,
            'total_watch_time_hours': round(total_watch_time / 3600, 1)
        },
        'questions': {
            'total_attempts': total_attempts,
            'correct_attempts': correct_attempts,
            'success_rate': round((correct_attempts / total_attempts * 100) if total_attempts > 0 else 0, 1)
        },
        'exams': {
            'taken': exams_taken,
            'passed': exams_passed,
            'pass_rate': round((exams_passed / exams_taken * 100) if exams_taken > 0 else 0, 1),
            'average_score': round(avg_exam_score, 1)
        }
    }
